import React from 'react';
import { StockMarketSummary, MarketFeedMetrics, Exchange } from '../types/market';
import { Activity, Clock } from 'lucide-react';

interface MarketSnapshotStripProps {
  symbol: string;
  exchange: Exchange;
  summary: StockMarketSummary;
  metrics: MarketFeedMetrics;
  onRefreshLive?: () => void;
}

export const MarketSnapshotStrip: React.FC<MarketSnapshotStripProps> = ({
  symbol,
  exchange,
  summary,
  metrics,
  onRefreshLive
}) => {
  const isLive = metrics.status === 'LIVE';

  const formatCurrency = (val: number) => {
    return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatSigned = (val: number) => {
    const prefix = val >= 0 ? '+₹' : '-₹';
    return `${prefix}${Math.abs(val).toFixed(2)}`;
  };

  const timeString = new Date(metrics.lastTickTime || Date.now()).toLocaleTimeString('en-IN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className="bg-slate-100/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 px-4 py-2 font-sans transition-colors">
      <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-y-2 gap-x-6 text-xs">
        {/* Left: Security Symbol Badge */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-tight font-mono">
            {symbol}
          </span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-mono">
            {exchange}
          </span>
        </div>

        {/* Center: Market Snapshot Metrics Strip */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 divide-x divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
          {/* CASH */}
          <div className="flex items-baseline gap-1.5 pl-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">CASH</span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {formatCurrency(summary.cash)}
            </span>
          </div>

          {/* FUTURE */}
          <div className="flex items-baseline gap-1.5 pl-4 sm:pl-6">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">FUTURE</span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {formatCurrency(summary.future)}
            </span>
          </div>

          {/* BASIS */}
          <div className="flex items-baseline gap-1.5 pl-4 sm:pl-6">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">BASIS</span>
            <span className={`font-mono font-bold tabular-nums ${summary.basis >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatSigned(summary.basis)}
            </span>
          </div>

          {/* ATM */}
          <div className="flex items-baseline gap-1.5 pl-4 sm:pl-6">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">ATM</span>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              ₹{summary.atm.toLocaleString('en-IN')}
            </span>
          </div>

          {/* STRADDLE */}
          <div className="flex items-baseline gap-1.5 pl-4 sm:pl-6">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">STRADDLE</span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              ₹{(summary.atmStraddle || 0).toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">({summary.atmStraddlePct || 0}%)</span>
          </div>

          {/* DTE */}
          <div className="flex items-baseline gap-1.5 pl-4 sm:pl-6">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">DTE</span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {summary.dte}d
            </span>
          </div>
        </div>

        {/* Right: Live Feed Indicator */}
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <button
            onClick={onRefreshLive}
            title="Click to refresh market quotes"
            className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse' : 'bg-amber-500'}`} />
            <span className={`font-bold ${isLive ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {isLive ? 'LIVE' : 'SIMULATED'}
            </span>
            <span className="text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400 inline" />
              {timeString}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
