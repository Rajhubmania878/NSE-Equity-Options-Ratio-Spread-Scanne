import React from 'react';
import { RatioStrategyRow } from '../types/market';
import { PayoffChart } from './PayoffChart';
import { evaluateStrategyPayoff } from '../engine/payoffEngine';
import { X, TrendingUp, TrendingDown, ShieldAlert, ArrowRight, Activity, Percent } from 'lucide-react';

interface StrategyDetailDrawerProps {
  strategy: RatioStrategyRow | null;
  onClose: () => void;
  currentSpot: number;
}

export const StrategyDetailDrawer: React.FC<StrategyDetailDrawerProps> = ({
  strategy,
  onClose,
  currentSpot
}) => {
  if (!strategy) return null;

  // Convert legs for payoff engine
  const legConfigs = strategy.legs.map(leg => ({
    side: leg.side,
    optionType: leg.optionType,
    strike: leg.strike,
    quantity: leg.quantity,
    price: leg.executionPrice || 0
  }));

  const netEntry = strategy.executableNetEntry || 0;
  const payoffResult = evaluateStrategyPayoff(
    legConfigs,
    netEntry,
    currentSpot,
    strategy.lotSize
  );

  const isCredit = netEntry < 0;
  const isDebit = netEntry > 0;

  // Expiry spot scenarios
  const spotScenarios = [
    { label: '-5.0%', spot: Math.round(currentSpot * 0.95) },
    { label: '-2.5%', spot: Math.round(currentSpot * 0.975) },
    { label: 'Current Spot', spot: Math.round(currentSpot) },
    { label: 'Buy Strike', spot: strategy.buyStrike },
    { label: 'Sell Strike (Peak)', spot: strategy.sellStrike },
    { label: '+2.5%', spot: Math.round(currentSpot * 1.025) },
    { label: '+5.0%', spot: Math.round(currentSpot * 1.05) },
    { label: '+10.0%', spot: Math.round(currentSpot * 1.10) }
  ];

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[580px] lg:w-[680px] bg-neutral-950 border-l border-neutral-800 shadow-2xl z-50 overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 sticky top-0 bg-neutral-950/95 backdrop-blur z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-neutral-100 text-base">
              {strategy.underlying} {strategy.ratioStr} {strategy.optionType === 'CE' ? 'CALL' : 'PUT'} RATIO SPREAD
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-neutral-800 text-neutral-300">
              {strategy.expiry}
            </span>
          </div>
          <span className="text-xs text-neutral-400">
            Lot Size: <strong className="text-neutral-200">{strategy.lotSize}</strong> shares · Actual Gap: ₹{strategy.actualGap} ({strategy.gapSteps} steps)
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 space-y-6 flex-1 text-xs">
        {/* Strategy Legs Card */}
        <div className="bg-neutral-900/90 rounded-lg border border-neutral-800 p-4 space-y-3">
          <span className="text-neutral-400 font-semibold uppercase tracking-wider text-[11px] block">
            Contract Legs & Execution Pricing
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* BUY Leg */}
            <div className="bg-neutral-950 p-3 rounded border border-emerald-900/60 font-mono space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-300 font-bold rounded text-[10px] border border-emerald-800">
                  BUY LEG (+{strategy.longQty}x)
                </span>
                <span className="text-neutral-400 text-[11px]">
                  {strategy.longQty * strategy.lotSize} shares
                </span>
              </div>
              <div className="text-sm font-bold text-neutral-100">
                {strategy.buyStrike} {strategy.optionType}
              </div>
              <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                <span>Ask (Buy): <strong className="text-emerald-400">₹{strategy.buyAsk?.toFixed(2) || '—'}</strong></span>
                <span>Bid: ₹{strategy.buyBid?.toFixed(2) || '—'}</span>
              </div>
              <div className="text-[10px] text-neutral-500">
                Spread: ₹{strategy.buySpread?.toFixed(2)} ({strategy.buySpreadPct}%) · IV: {strategy.buyIv}%
              </div>
            </div>

            {/* SELL Leg */}
            <div className="bg-neutral-950 p-3 rounded border border-rose-900/60 font-mono space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="px-1.5 py-0.5 bg-rose-950 text-rose-300 font-bold rounded text-[10px] border border-rose-800">
                  SELL LEG (-{strategy.shortQty}x)
                </span>
                <span className="text-neutral-400 text-[11px]">
                  {strategy.shortQty * strategy.lotSize} shares
                </span>
              </div>
              <div className="text-sm font-bold text-neutral-100">
                {strategy.sellStrike} {strategy.optionType}
              </div>
              <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                <span>Bid (Sell): <strong className="text-rose-400">₹{strategy.sellBid?.toFixed(2) || '—'}</strong></span>
                <span>Ask: ₹{strategy.sellAsk?.toFixed(2) || '—'}</span>
              </div>
              <div className="text-[10px] text-neutral-500">
                Spread: ₹{strategy.sellSpread?.toFixed(2)} ({strategy.sellSpreadPct}%) · IV: {strategy.sellIv}%
              </div>
            </div>
          </div>

          {/* Pricing Analysis Bar */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-800 font-mono text-[11px]">
            <div>
              <span className="text-neutral-500 block">Executable Entry</span>
              <span
                className={`font-bold text-sm ${
                  isCredit ? 'text-emerald-400' : isDebit ? 'text-amber-400' : 'text-neutral-200'
                }`}
              >
                {isCredit ? '+' : isDebit ? '-' : ''}₹{Math.abs(netEntry).toFixed(2)}/sh
              </span>
              <span className="text-neutral-500 block text-[10px]">
                {isCredit ? 'Net Credit' : 'Net Debit'}
              </span>
            </div>

            <div>
              <span className="text-neutral-500 block">Total Lot Cost</span>
              <span className="font-bold text-sm text-neutral-200">
                {isCredit ? '+' : isDebit ? '-' : ''}₹{Math.abs((strategy.executableTotalEntry || 0)).toLocaleString()}
              </span>
              <span className="text-neutral-500 block text-[10px]">Per {strategy.lotSize} shares</span>
            </div>

            <div>
              <span className="text-neutral-500 block">Mid-Market Entry</span>
              <span className="font-bold text-sm text-neutral-300">
                ₹{strategy.midNetEntry?.toFixed(2) || '—'}
              </span>
              <span className="text-neutral-500 block text-[10px]">
                Slippage: ₹{strategy.slippageCost?.toFixed(2) || '0.00'}
              </span>
            </div>
          </div>
        </div>

        {/* Payoff Curve Visualizer */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-neutral-400 font-semibold uppercase tracking-wider text-[11px]">
              Interactive Expiry Payoff Curve
            </span>
            <span className="text-neutral-500 text-[11px]">
              Spot: ₹{currentSpot.toLocaleString()}
            </span>
          </div>

          <PayoffChart
            payoffResult={payoffResult}
            buyStrike={strategy.buyStrike}
            sellStrike={strategy.sellStrike}
            lotSize={strategy.lotSize}
          />
        </div>

        {/* Net Strategy Greeks Card */}
        <div className="bg-neutral-900/90 rounded-lg border border-neutral-800 p-4 space-y-3 font-mono">
          <span className="text-neutral-400 font-semibold uppercase tracking-wider text-[11px] block">
            Net Strategy Greeks & Risk Profile
          </span>

          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="bg-neutral-950 p-2 rounded border border-neutral-800">
              <span className="text-neutral-500 block text-[10px]">Net Delta</span>
              <span className={`text-sm font-bold ${(strategy.netDelta || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {strategy.netDelta?.toFixed(3) || '—'}
              </span>
              <span className="text-[9px] text-neutral-500 block">
                {((strategy.netDelta || 0) * strategy.lotSize).toFixed(1)} Δ / lot
              </span>
            </div>

            <div className="bg-neutral-950 p-2 rounded border border-neutral-800">
              <span className="text-neutral-500 block text-[10px]">Net Gamma</span>
              <span className="text-sm font-bold text-neutral-200">
                {strategy.netGamma?.toFixed(4) || '—'}
              </span>
              <span className="text-[9px] text-neutral-500 block">Acceleration</span>
            </div>

            <div className="bg-neutral-950 p-2 rounded border border-neutral-800">
              <span className="text-neutral-500 block text-[10px]">Net Theta / Day</span>
              <span className="text-sm font-bold text-emerald-400">
                +₹{strategy.lotTheta?.toFixed(0) || '—'}
              </span>
              <span className="text-[9px] text-neutral-500 block">Decay income</span>
            </div>

            <div className="bg-neutral-950 p-2 rounded border border-neutral-800">
              <span className="text-neutral-500 block text-[10px]">Net Vega / 1%</span>
              <span className="text-sm font-bold text-neutral-300">
                ₹{((strategy.netVega || 0) * strategy.lotSize).toFixed(0)}
              </span>
              <span className="text-[9px] text-neutral-500 block">IV sensitivity</span>
            </div>
          </div>

          {strategy.isUnlimitedLoss && (
            <div className="flex items-start gap-2 p-2.5 bg-rose-950/40 border border-rose-900/60 rounded text-rose-300 text-[11px] leading-relaxed">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>
                <strong>Unlimited Risk Alert:</strong> Because short option quantity ({strategy.shortQty}x) exceeds long option quantity ({strategy.longQty}x), the net slope as price breaks past the short strike is negative. Max loss is mathematically unbounded!
              </span>
            </div>
          )}
        </div>

        {/* Expiry Scenario Table */}
        <div className="bg-neutral-900/90 rounded-lg border border-neutral-800 overflow-hidden font-mono">
          <div className="px-4 py-2.5 bg-neutral-800/80 border-b border-neutral-800 flex items-center justify-between">
            <span className="text-neutral-300 font-semibold text-[11px]">
              Expiry P&L Scenarios by Underlying Spot
            </span>
            <span className="text-neutral-500 text-[10px]">
              Based on executable net entry of {formatPrice(netEntry)}
            </span>
          </div>

          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-neutral-900/50 text-neutral-400 border-b border-neutral-800 text-[10px]">
                <th className="py-2 px-3">Spot Scenario</th>
                <th className="py-2 px-3 text-right">Spot Price</th>
                <th className="py-2 px-3 text-right">P&L / Share</th>
                <th className="py-2 px-3 text-right">Total P&L / Lot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 text-[11px]">
              {spotScenarios.map((sc, i) => {
                // Find point in payoff result
                const pt = payoffResult.points.find(p => Math.abs(p.spotPrice - sc.spot) < 15) || {
                  spotPrice: sc.spot,
                  pnlPerShare: calculatePnl(sc.spot, strategy),
                  pnlPerLot: calculatePnl(sc.spot, strategy) * strategy.lotSize
                };

                const isPos = pt.pnlPerShare >= 0;

                return (
                  <tr key={i} className="hover:bg-neutral-800/50">
                    <td className="py-2 px-3 text-neutral-300 font-medium">
                      {sc.label}
                    </td>
                    <td className="py-2 px-3 text-right text-neutral-200">
                      ₹{sc.spot.toLocaleString()}
                    </td>
                    <td className={`py-2 px-3 text-right font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPos ? '+' : ''}₹{pt.pnlPerShare.toFixed(2)}
                    </td>
                    <td className={`py-2 px-3 text-right font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPos ? '+' : ''}₹{Math.round(pt.pnlPerLot).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function formatPrice(p: number): string {
  if (p < 0) return `-₹${Math.abs(p).toFixed(2)}`;
  return `+₹${p.toFixed(2)}`;
}

function calculatePnl(spot: number, strategy: RatioStrategyRow): number {
  let gross = 0;
  for (const leg of strategy.legs) {
    const intrinsic = leg.optionType === 'CE' ? Math.max(0, spot - leg.strike) : Math.max(0, leg.strike - spot);
    if (leg.side === 'BUY') gross += leg.quantity * intrinsic;
    else gross -= leg.quantity * intrinsic;
  }
  return gross - (strategy.executableNetEntry || 0);
}
