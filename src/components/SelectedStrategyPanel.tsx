import React from 'react';
import { RatioStrategyRow } from '../types/market';
import { evaluateStrategyPayoff } from '../engine/payoffEngine';
import { PayoffChart } from './PayoffChart';
import { X, ShieldAlert, TrendingUp, TrendingDown, Layers, ArrowRight } from 'lucide-react';

interface SelectedStrategyPanelProps {
  strategy: RatioStrategyRow | null;
  onClose: () => void;
  currentSpot: number;
}

export const SelectedStrategyPanel: React.FC<SelectedStrategyPanelProps> = ({
  strategy,
  onClose,
  currentSpot
}) => {
  if (!strategy) return null;

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

  const isDebit = netEntry > 0;
  const isCredit = netEntry < 0;

  const formatCurrency = (val: number | null) => {
    if (val === null || val === undefined) return '—';
    return `₹${Math.abs(val).toFixed(2)}`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-t-2 border-slate-900 dark:border-slate-100 shadow-2xl p-4 font-sans transition-colors text-xs">
      <div className="max-w-[1920px] mx-auto space-y-4">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 font-mono tracking-tight">
              SELECTED STRATEGY: {strategy.underlying} {strategy.ratioStr} {strategy.optionType === 'CE' ? 'CALL' : 'PUT'} RATIO SPREAD
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
              Expiry: {strategy.expiry}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
              Lot: {strategy.lotSize}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Two-Column Grid: Primary Metrics vs Legs & Secondary Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* COLUMN 1: LEVEL 1 PRIMARY METRICS (High Visual Priority) */}
          <div className="lg:col-span-5 space-y-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              PRIMARY RISK & RETURN PROFILE
            </span>

            <div className="grid grid-cols-2 gap-3">
              {/* NET ENTRY */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-800 font-mono">
                <span className="text-[10px] uppercase text-slate-500 font-bold block">NET ENTRY</span>
                <div className={`text-base font-extrabold mt-0.5 ${
                  isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'
                }`}>
                  {formatCurrency(netEntry)} {isCredit ? 'Credit' : 'Debit'}
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  ₹{(Math.abs(netEntry) * strategy.lotSize).toLocaleString('en-IN')} / lot
                </span>
              </div>

              {/* CURRENT MTM */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-800 font-mono">
                <span className="text-[10px] uppercase text-slate-500 font-bold block">CURRENT MTM</span>
                <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
                  ₹0.00
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  At Spot ₹{currentSpot.toLocaleString('en-IN')}
                </span>
              </div>

              {/* MAX PROFIT */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-800 font-mono">
                <span className="text-[10px] uppercase text-emerald-600 dark:text-emerald-400 font-bold block">MAX PROFIT</span>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatCurrency(payoffResult.maxProfitPerShare)} / sh
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  ₹{payoffResult.maxProfitPerLot.toLocaleString('en-IN')} / lot
                </span>
              </div>

              {/* MAX LOSS */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-800 font-mono">
                <span className="text-[10px] uppercase text-rose-600 dark:text-rose-400 font-bold block">MAX LOSS</span>
                <div className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                  {payoffResult.isUnlimitedLoss || payoffResult.maxLossPerShare === 'Unlimited' ? 'Unlimited' : `${formatCurrency(payoffResult.maxLossPerShare)} / sh`}
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {payoffResult.isUnlimitedLoss ? 'Beyond Sell Strike' : `₹${payoffResult.maxLossPerLot.toLocaleString('en-IN')} / lot`}
                </span>
              </div>
            </div>

            {/* BREAKEVEN(S) */}
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800 font-mono flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase">BREAKEVEN(S):</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 text-xs">
                {payoffResult.breakevens.length > 0
                  ? payoffResult.breakevens.map(b => `₹${b.toLocaleString('en-IN')}`).join(' · ')
                  : 'N/A'}
              </span>
            </div>
          </div>

          {/* COLUMN 2: CONTRACT LEGS & SECONDARY METRICS (GREEKS, IV, OI) */}
          <div className="lg:col-span-7 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              CONTRACT LEGS & SECONDARY MARKET DATA
            </span>

            {/* Legs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
              {/* Long Leg */}
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded border border-emerald-500/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-600 text-white rounded">
                    BUY ({strategy.longQty}x)
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    {strategy.longQty * strategy.lotSize} shares
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  ₹{strategy.buyStrike} {strategy.optionType}
                </div>
                <div className="text-slate-500 text-[11px]">
                  Ask Execution Price: <strong className="text-emerald-600 dark:text-emerald-400">₹{strategy.buyAsk?.toFixed(2) || '—'}</strong>
                </div>
              </div>

              {/* Short Leg */}
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded border border-rose-500/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-600 text-white rounded">
                    SELL ({strategy.shortQty}x)
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    {strategy.shortQty * strategy.lotSize} shares
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  ₹{strategy.sellStrike} {strategy.optionType}
                </div>
                <div className="text-slate-500 text-[11px]">
                  Bid Execution Price: <strong className="text-rose-600 dark:text-rose-400">₹{strategy.sellBid?.toFixed(2) || '—'}</strong>
                </div>
              </div>
            </div>

            {/* Secondary Greeks & Liquidity Data Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
              <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800">
                <span className="text-[9px] text-slate-500 block uppercase">BUY IV / SELL IV</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {strategy.buyIv ? `${strategy.buyIv.toFixed(1)}%` : '—'} / {strategy.sellIv ? `${strategy.sellIv.toFixed(1)}%` : '—'}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800">
                <span className="text-[9px] text-slate-500 block uppercase font-mono">COMBINED OI</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {((strategy.combinedOi ?? 0) / 1000).toFixed(1)}k
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800">
                <span className="text-[9px] text-slate-500 block uppercase font-mono">COMBINED VOLUME</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {((strategy.combinedVolume ?? 0) / 1000).toFixed(1)}k
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800">
                <span className="text-[9px] text-slate-500 block uppercase font-mono">GAP MULTIPLE</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  ₹{strategy.actualGap} ({strategy.gapSteps} steps)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* PAYOFF CHART AT BOTTOM */}
        <div className="pt-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
            EXPIRY PAYOFF DIAGRAM & SCENARIOS
          </span>
          <PayoffChart
            payoffResult={payoffResult}
            buyStrike={strategy.buyStrike}
            sellStrike={strategy.sellStrike}
            lotSize={strategy.lotSize}
          />
        </div>
      </div>
    </div>
  );
};
