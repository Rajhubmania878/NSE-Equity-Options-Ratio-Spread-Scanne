import React from 'react';
import { MarketFeedMetrics, UnderlyingStock, StockMarketSummary, Exchange } from '../types/market';
import { Wifi, ShieldCheck, Clock } from 'lucide-react';

interface StatusBarProps {
  metrics: MarketFeedMetrics;
  stock: UnderlyingStock;
  currentSpot: number;
  summary: StockMarketSummary;
  expiry: string;
  stk: string | number;
  exchange?: Exchange;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  metrics,
  stock,
  currentSpot,
  summary,
  expiry,
  stk,
  exchange = 'NSE'
}) => {
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
  };

  const isLive = metrics.status === 'LIVE';
  const effectiveStk = stk === 'AUTO' ? stock.strikeStep : stk;
  const derivSeg = exchange === 'BSE' ? 'BFO' : 'NFO';
  const cashSeg = exchange === 'BSE' ? 'BSE_CM' : 'NSE_CM';

  return (
    <div className="bg-neutral-900/90 border-b border-neutral-800 text-xs font-mono select-none">
      {/* Top Ticker: Stock, CASH, FUT, BASIS, ATM, STK, EXP, DTE, STRADDLE, LIVE */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 px-5 py-2">
        {/* Left: Financial Matrix Tickers */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Symbol & Exchange */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-neutral-100 text-sm font-sans tracking-tight">{stock.symbol}</span>
            <span className="text-[10px] bg-neutral-800 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold border border-neutral-700">
              {exchange}
            </span>
            <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800 font-bold">
              {derivSeg} ACTIVE
            </span>
          </div>

          <span className="text-neutral-700">|</span>

          {/* CASH / SPOT */}
          <div className="flex items-baseline gap-1" title={`${cashSeg} Cash Spot Price`}>
            <span className="text-neutral-500 text-[11px]">{cashSeg}:</span>
            <span className="text-neutral-100 font-bold">
              ₹{summary.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* FUT */}
          <div className="flex items-baseline gap-1">
            <span className="text-neutral-500 text-[11px]">FUT:</span>
            <span className="text-neutral-200 font-bold">
              ₹{summary.future.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* BASIS */}
          <div className="flex items-baseline gap-1">
            <span className="text-neutral-500 text-[11px]">BASIS:</span>
            <span className={`font-semibold ${summary.basis >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {summary.basis >= 0 ? '+' : ''}₹{summary.basis.toFixed(2)}
            </span>
          </div>

          {/* ATM */}
          <div className="flex items-baseline gap-1">
            <span className="text-neutral-500 text-[11px]">ATM:</span>
            <span className="text-cyan-300 font-bold">
              ₹{summary.atm}
            </span>
          </div>

          {/* STK */}
          <div className="flex items-baseline gap-1">
            <span className="text-neutral-500 text-[11px]">STK:</span>
            <span className="text-emerald-400 font-bold">
              ₹{effectiveStk}
            </span>
          </div>

          {/* EXP */}
          <div className="flex items-baseline gap-1">
            <span className="text-neutral-500 text-[11px]">EXP:</span>
            <span className="text-neutral-200 font-bold">
              {expiry.toUpperCase()}
            </span>
          </div>

          {/* DTE */}
          <div className="flex items-baseline gap-1">
            <span className="text-neutral-500 text-[11px]">DTE:</span>
            <span className="text-neutral-200 font-bold">
              {summary.dte}d
            </span>
          </div>

          {/* STRADDLE */}
          <div className="flex items-baseline gap-1" title="ATM Call LTP + ATM Put LTP">
            <span className="text-neutral-500 text-[11px]">ATM STRADDLE:</span>
            <span className="text-amber-300 font-bold">
              ₹{summary.atmStraddle.toFixed(2)}
            </span>
            <span className="text-[10px] text-neutral-500">
              ({summary.atmStraddlePct.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Right: Institutional Feed & Connection Status */}
        <div className="flex items-center gap-3 text-neutral-400 text-[11px]">
          {/* Connection status tag */}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                isLive ? 'bg-emerald-400 shadow-sm shadow-emerald-500' : 'bg-amber-400'
              }`}
            />
            <span className={`font-bold ${isLive ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isLive ? '● LIVE' : '● STALE'}
            </span>
          </div>

          <span className="text-neutral-700 hidden sm:inline">/</span>

          {/* Source mode */}
          <div className="hidden sm:flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-neutral-500" />
            <span>{metrics.angelConnected ? 'Angel One SmartAPI' : 'High-Fi Stream'}</span>
          </div>

          <span className="text-neutral-700 hidden md:inline">/</span>

          {/* Latency & Age */}
          <div className="hidden lg:flex items-center gap-2">
            <span className="flex items-center gap-1">
              <Wifi className="w-3 h-3 text-neutral-500" />
              <span>{metrics.latencyMs}ms</span>
            </span>
            <span>·</span>
            <span>{metrics.dataAgeMs}ms age</span>
          </div>

          <span className="text-neutral-700 hidden xl:inline">/</span>

          {/* Last Tick Time */}
          <div className="hidden xl:flex items-center gap-1">
            <Clock className="w-3 h-3 text-neutral-500" />
            <span>{formatTime(metrics.lastTickTime)} IST</span>
          </div>
        </div>
      </div>
    </div>
  );
};
