import { OptionType } from '../types/market';

/**
 * High-Precision Black-Scholes Pricing & Greeks Engine for NSE Equity Derivatives
 * Uses RBI 91-day T-Bill risk-free rate proxy (~6.80% p.a.).
 */

const RISK_FREE_RATE = 0.068; // 6.8% p.a.

/**
 * Standard Normal Cumulative Distribution Function N(x)
 * Accurate Abramowitz & Stegun polynomial approximation (error < 7.5e-8).
 */
export function cdfNormal(x: number): number {
  const p = 0.2316419;
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;

  const k = 1 / (1 + p * Math.abs(x));
  const poly = ((((b5 * k + b4) * k + b3) * k + b2) * k + b1) * k;
  const phi = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
  const result = 1 - phi * poly;

  return x >= 0 ? result : 1 - result;
}

/**
 * Standard Normal Probability Density Function N'(x)
 */
export function pdfNormal(x: number): number {
  return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
}

export interface GreeksResult {
  price: number;
  delta: number;
  gamma: number;
  theta: number; // ₹ per day per share
  vega: number;  // ₹ per 1% change in IV per share
}

/**
 * Calculate Black-Scholes option theoretical price and Greeks
 * @param S Current Spot Price
 * @param K Strike Price
 * @param T Time to expiration in years (e.g. days / 365)
 * @param r Risk-free interest rate (annualized)
 * @param sigma Implied Volatility (decimal e.g. 0.25 for 25%)
 * @param type 'CE' | 'PE'
 */
export function calculateBlackScholes(
  S: number,
  K: number,
  T: number,
  sigma: number,
  type: OptionType,
  r: number = RISK_FREE_RATE
): GreeksResult {
  // Edge-case guards
  if (T <= 0.0001) {
    const intrinsic = type === 'CE' ? Math.max(0, S - K) : Math.max(0, K - S);
    return {
      price: intrinsic,
      delta: type === 'CE' ? (S >= K ? 1 : 0) : (S <= K ? -1 : 0),
      gamma: 0,
      theta: 0,
      vega: 0
    };
  }

  sigma = Math.max(0.01, sigma);
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const nd1 = cdfNormal(d1);
  const nd2 = cdfNormal(d2);
  const nPrimeD1 = pdfNormal(d1);
  const expNegRT = Math.exp(-r * T);

  let price = 0;
  let delta = 0;
  let theta = 0;

  // Gamma and Vega are identical for Calls and Puts
  const gamma = nPrimeD1 / (S * sigma * sqrtT);
  const vega = (S * sqrtT * nPrimeD1) / 100; // per 1% IV

  if (type === 'CE') {
    price = S * nd1 - K * expNegRT * nd2;
    delta = nd1;
    // Daily Theta (divide by 365)
    theta = (-(S * nPrimeD1 * sigma) / (2 * sqrtT) - r * K * expNegRT * nd2) / 365;
  } else {
    const nNegD1 = cdfNormal(-d1);
    const nNegD2 = cdfNormal(-d2);
    price = K * expNegRT * nNegD2 - S * nNegD1;
    delta = nd1 - 1; // negative for puts
    theta = (-(S * nPrimeD1 * sigma) / (2 * sqrtT) + r * K * expNegRT * nNegD2) / 365;
  }

  return {
    price: Math.max(0.05, Math.round(price * 100) / 100),
    delta: Math.round(delta * 1000) / 1000,
    gamma: Math.round(gamma * 10000) / 10000,
    theta: Math.round(theta * 100) / 100,
    vega: Math.round(vega * 100) / 100
  };
}

/**
 * Newton-Raphson Implied Volatility (IV) Solver
 * Calculates IV from market price (Mid or LTP).
 */
export function calculateImpliedVolatility(
  marketPrice: number,
  S: number,
  K: number,
  T: number,
  type: OptionType,
  r: number = RISK_FREE_RATE
): number {
  if (marketPrice <= 0 || T <= 0.0001) return 0.20; // fallback 20%

  // Intrinsic value lower bound check
  const intrinsic = type === 'CE' ? Math.max(0, S - K) : Math.max(0, K - S);
  if (marketPrice < intrinsic) {
    return 0.15;
  }

  let sigma = 0.25; // initial guess 25%
  const maxIterations = 50;
  const tolerance = 1e-4;

  for (let i = 0; i < maxIterations; i++) {
    const greeks = calculateBlackScholes(S, K, T, sigma, type, r);
    const diff = greeks.price - marketPrice;

    if (Math.abs(diff) < tolerance) {
      return Math.round(sigma * 1000) / 1000;
    }

    // Vega derivative: note vega is divided by 100 in our Greeks, so multiply by 100 here for dPrice/dSigma
    const v = greeks.vega * 100;
    if (v < 1e-6) {
      break;
    }

    sigma -= diff / v;
    if (sigma <= 0.01) sigma = 0.01;
    if (sigma >= 3.0) sigma = 3.0;
  }

  // Fallback bisection if Newton did not converge
  let low = 0.01;
  let high = 3.0;
  for (let i = 0; i < 30; i++) {
    const mid = (low + high) / 2;
    const price = calculateBlackScholes(S, K, T, mid, type, r).price;
    if (Math.abs(price - marketPrice) < 0.05) {
      return Math.round(mid * 1000) / 1000;
    }
    if (price < marketPrice) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return Math.round(sigma * 1000) / 1000;
}
