import { OptionType, LegSide, StrategyPayoffResult, PayoffPoint } from '../types/market';

export interface LegConfig {
  side: LegSide;
  optionType: OptionType;
  strike: number;
  quantity: number; // e.g. 1, 2, 3
  price: number; // Ask for BUY, Bid for SELL
}

/**
 * Calculates Intrinsic value for an individual option leg at spot price S.
 */
export function getLegIntrinsic(S: number, strike: number, optionType: OptionType): number {
  if (optionType === 'CE') {
    return Math.max(0, S - strike);
  } else {
    return Math.max(0, strike - S);
  }
}

/**
 * Calculates net strategy payoff per share at any spot price S on expiry date.
 * Net Entry = Sum(BuyQty * BuyPrice) - Sum(SellQty * SellPrice).
 * Positive Net Entry is Net Debit (paid); Negative Net Entry is Net Credit (received).
 */
export function calculateStrategyPayoffAtSpot(
  S: number,
  legs: LegConfig[],
  netEntryPerShare: number
): number {
  let grossExpiryValue = 0;

  for (const leg of legs) {
    const intrinsic = getLegIntrinsic(S, leg.strike, leg.optionType);
    if (leg.side === 'BUY') {
      grossExpiryValue += leg.quantity * intrinsic;
    } else {
      grossExpiryValue -= leg.quantity * intrinsic;
    }
  }

  // Net P&L = Gross Value on Expiry - Net Debit Paid (or + Net Credit Received)
  return grossExpiryValue - netEntryPerShare;
}

/**
 * Computes asymptotic slopes to rigorously detect Unlimited Loss
 */
export function getAsymptoticSlopes(legs: LegConfig[]): { slopeUp: number; slopeDown: number } {
  let slopeUp = 0;
  let slopeDown = 0;

  for (const leg of legs) {
    const mult = leg.side === 'BUY' ? leg.quantity : -leg.quantity;
    if (leg.optionType === 'CE') {
      slopeUp += mult;
    } else {
      slopeDown += -mult; // As S -> 0, Put intrinsic (K - S) slope is -1
    }
  }

  return { slopeUp, slopeDown };
}

/**
 * Comprehensive Multi-Leg Strategy Payoff & Breakeven Engine.
 * Evaluates max profit, max loss (with strict 'Unlimited' detection), and exact breakevens.
 */
export function evaluateStrategyPayoff(
  legs: LegConfig[],
  netEntryPerShare: number,
  currentSpot: number,
  lotSize: number
): StrategyPayoffResult {
  // Collect all critical evaluation points: 0, strikes, spot, plus bounds
  const strikes = legs.map(l => l.strike).sort((a, b) => a - b);
  const minStrike = strikes[0] || currentSpot;
  const maxStrike = strikes[strikes.length - 1] || currentSpot;

  const criticalPoints = new Set<number>();
  criticalPoints.add(0);
  criticalPoints.add(Math.round(currentSpot * 100) / 100);
  for (const k of strikes) {
    criticalPoints.add(k);
  }

  // Add boundary points
  const lowerBound = Math.max(0, Math.min(minStrike * 0.7, currentSpot * 0.7));
  const upperBound = Math.max(maxStrike * 1.35, currentSpot * 1.35);
  criticalPoints.add(Math.round(lowerBound * 100) / 100);
  criticalPoints.add(Math.round(upperBound * 100) / 100);

  const { slopeUp, slopeDown } = getAsymptoticSlopes(legs);

  // Check if loss is mathematically unbounded
  // For calls, if slopeUp < 0 as S -> inf, payoff drops to -inf!
  const isUnlimitedLoss = slopeUp < -1e-6;

  // Find max profit across critical vertices
  const sortedCriticals = Array.from(criticalPoints).sort((a, b) => a - b);
  let maxProfitPerShare = -Infinity;
  let maxProfitAtSpot = currentSpot;

  for (const s of sortedCriticals) {
    const pnl = calculateStrategyPayoffAtSpot(s, legs, netEntryPerShare);
    if (pnl > maxProfitPerShare) {
      maxProfitPerShare = pnl;
      maxProfitAtSpot = s;
    }
  }

  // Also check intermediate peaks
  for (let i = 0; i < sortedCriticals.length - 1; i++) {
    const mid = (sortedCriticals[i] + sortedCriticals[i + 1]) / 2;
    const pnl = calculateStrategyPayoffAtSpot(mid, legs, netEntryPerShare);
    if (pnl > maxProfitPerShare) {
      maxProfitPerShare = pnl;
      maxProfitAtSpot = mid;
    }
  }

  // Max Loss calculation
  let maxLossPerShare: number | 'Unlimited';
  let maxLossPerLot: number | 'Unlimited';

  if (isUnlimitedLoss) {
    maxLossPerShare = 'Unlimited';
    maxLossPerLot = 'Unlimited';
  } else {
    let minPnl = Infinity;
    // For put ratio spreads or bounded spreads, find worst P&L across criticals
    for (const s of sortedCriticals) {
      const pnl = calculateStrategyPayoffAtSpot(s, legs, netEntryPerShare);
      if (pnl < minPnl) {
        minPnl = pnl;
      }
    }
    // Check at S = 0 for puts
    const pnlAtZero = calculateStrategyPayoffAtSpot(0, legs, netEntryPerShare);
    if (pnlAtZero < minPnl) minPnl = pnlAtZero;

    // Check at upperBound
    const pnlAtUpper = calculateStrategyPayoffAtSpot(upperBound, legs, netEntryPerShare);
    if (pnlAtUpper < minPnl) minPnl = pnlAtUpper;

    maxLossPerShare = Math.round(minPnl * 100) / 100;
    maxLossPerLot = Math.round(minPnl * lotSize * 100) / 100;
  }

  // Breakeven Zero-Crossing Search (Piecewise linear interpolation)
  const breakevens: number[] = [];
  const testPoints: number[] = [];

  const rangeMin = Math.max(0, Math.min(currentSpot * 0.5, minStrike * 0.7));
  const rangeMax = Math.max(currentSpot * 1.5, maxStrike * 1.4);
  const steps = 120;
  const stepSize = (rangeMax - rangeMin) / steps;

  for (let i = 0; i <= steps; i++) {
    testPoints.push(rangeMin + i * stepSize);
  }
  // Ensure all strikes and 0 are test points
  for (const k of strikes) {
    testPoints.push(k);
  }
  testPoints.sort((a, b) => a - b);

  for (let i = 0; i < testPoints.length - 1; i++) {
    const s1 = testPoints[i];
    const s2 = testPoints[i + 1];
    if (Math.abs(s2 - s1) < 1e-4) continue;

    const y1 = calculateStrategyPayoffAtSpot(s1, legs, netEntryPerShare);
    const y2 = calculateStrategyPayoffAtSpot(s2, legs, netEntryPerShare);

    // Exact zero at vertex
    if (Math.abs(y1) < 1e-4) {
      const rounded = Math.round(s1 * 100) / 100;
      if (!breakevens.includes(rounded)) breakevens.push(rounded);
      continue;
    }

    // Sign change indicates root
    if ((y1 > 0 && y2 < 0) || (y1 < 0 && y2 > 0)) {
      // Linear interpolation root: x = s1 - y1 * (s2 - s1) / (y2 - y1)
      const root = s1 - (y1 * (s2 - s1)) / (y2 - y1);
      const roundedRoot = Math.round(root * 100) / 100;
      if (!breakevens.some(be => Math.abs(be - roundedRoot) < 0.5)) {
        breakevens.push(roundedRoot);
      }
    }
  }

  // Sort breakevens
  breakevens.sort((a, b) => a - b);

  // Compute distance from spot in %
  const breakevenDistPcts = breakevens.map(be => {
    return Math.round(((be - currentSpot) / currentSpot) * 1000) / 10;
  });

  // Generate 80 smooth curve points for Payoff Chart
  const chartMin = Math.max(0, Math.min(currentSpot * 0.75, minStrike * 0.85));
  const chartMax = Math.max(currentSpot * 1.25, maxStrike * 1.25);
  const chartStep = (chartMax - chartMin) / 80;
  const points: PayoffPoint[] = [];

  for (let i = 0; i <= 80; i++) {
    const sp = chartMin + i * chartStep;
    const pnlShare = calculateStrategyPayoffAtSpot(sp, legs, netEntryPerShare);
    points.push({
      spotPrice: Math.round(sp * 10) / 10,
      pnlPerShare: Math.round(pnlShare * 100) / 100,
      pnlPerLot: Math.round(pnlShare * lotSize * 100) / 100
    });
  }

  return {
    points,
    maxProfitPerShare: Math.round(maxProfitPerShare * 100) / 100,
    maxProfitPerLot: Math.round(maxProfitPerShare * lotSize * 100) / 100,
    maxProfitAtSpot: Math.round(maxProfitAtSpot * 100) / 100,
    maxLossPerShare,
    maxLossPerLot,
    isUnlimitedLoss,
    breakevens,
    breakevenDistPcts,
    currentSpot
  };
}
