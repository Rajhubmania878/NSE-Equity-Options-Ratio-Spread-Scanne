import React, { useState } from 'react';
import {
  UnderlyingStock,
  OptionType,
  GapMode,
  DirectionMode,
  ReferenceStrikeMode
} from '../types/market';
import { StockSelectorDropdown } from './StockSelectorDropdown';
import { ArrowRightLeft } from 'lucide-react';

interface ControlsPanelProps {
  selectedStock: UnderlyingStock;
  onSelectStock: (symbol: string) => void;
  selectedExpiry: string;
  onSelectExpiry: (expiry: string) => void;
  optionType: OptionType;
  onChangeOptionType: (type: OptionType) => void;
  direction: DirectionMode;
  onChangeDirection: (dir: DirectionMode) => void;
  ratioLong: number;
  ratioShort: number;
  onChangeRatio: (long: number, short: number) => void;
  gapMode: GapMode;
  onChangeGapMode: (mode: GapMode) => void;
  gapSteps: number;
  onChangeGapSteps: (steps: number) => void;
  targetPriceGap: number;
  onChangeTargetPriceGap: (gap: number) => void;
  strikeRange: number;
  onChangeStrikeRange: (range: number) => void;
  referenceMode: ReferenceStrikeMode;
  onChangeReferenceMode: (mode: ReferenceStrikeMode) => void;
  atmStrike: number;
  pricingMode: 'EXECUTABLE' | 'MID' | 'CONSERVATIVE';
  onChangePricingMode: (mode: 'EXECUTABLE' | 'MID' | 'CONSERVATIVE') => void;
  availableStrikesCount: { below: number; above: number };
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  selectedStock,
  onSelectStock,
  selectedExpiry,
  onSelectExpiry,
  optionType,
  onChangeOptionType,
  direction,
  onChangeDirection,
  ratioLong,
  ratioShort,
  onChangeRatio,
  gapMode,
  onChangeGapMode,
  gapSteps,
  onChangeGapSteps,
  targetPriceGap,
  onChangeTargetPriceGap,
  strikeRange,
  onChangeStrikeRange,
  pricingMode,
  onChangePricingMode,
  availableStrikesCount
}) => {
  const [customRatioOpen, setCustomRatioOpen] = useState(false);
  const [customLong, setCustomLong] = useState(String(ratioLong));
  const [customShort, setCustomShort] = useState(String(ratioShort));

  const ratioPresets = [
    { long: 1, short: 1, label: '1:1' },
    { long: 1, short: 2, label: '1:2' },
    { long: 1, short: 3, label: '1:3' },
    { long: 1, short: 4, label: '1:4' },
    { long: 2, short: 3, label: '2:3' },
    { long: 2, short: 5, label: '2:5' },
    { long: 3, short: 5, label: '3:5' }
  ];

  // Quick tickers
  const popularTickers = ['RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'INFY', 'SBIN', 'ADANIENT', 'MARUTI', 'LT'];

  return (
    <div className="bg-neutral-900/90 border-b border-neutral-800 p-4 space-y-3.5">
      {/* Top Row: Quick Stock Bar & Stock Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Prominent Searchable Stock Selector */}
        <div className="flex items-center gap-3">
          <StockSelectorDropdown
            selectedStock={selectedStock}
            onSelectStock={onSelectStock}
          />
        </div>

        {/* Quick Tickers */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-neutral-400">
          <span className="text-[11px] text-neutral-500">Quick:</span>
          {popularTickers.map(ticker => (
            <button
              key={ticker}
              onClick={() => onSelectStock(ticker)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                ticker === selectedStock.symbol
                  ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800'
                  : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              {ticker}
            </button>
          ))}
        </div>

        {/* Expiry Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400">Expiry:</span>
          <select
            value={selectedExpiry}
            onChange={e => onSelectExpiry(e.target.value)}
            className="px-2.5 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-xs font-mono text-neutral-200 focus:outline-none focus:border-neutral-500"
          >
            {selectedStock.expiries.map(exp => (
              <option key={exp} value={exp}>
                {exp}
              </option>
            ))}
          </select>
        </div>

        {/* Pricing View Mode */}
        <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs">
          <span className="text-[10px] text-neutral-500 px-1.5">Price Mode:</span>
          <button
            onClick={() => onChangePricingMode('EXECUTABLE')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              pricingMode === 'EXECUTABLE'
                ? 'bg-neutral-800 text-emerald-400 font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Executable entry: BUY at Ask, SELL at Bid"
          >
            Executable (Ask/Bid)
          </button>
          <button
            onClick={() => onChangePricingMode('MID')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              pricingMode === 'MID'
                ? 'bg-neutral-800 text-neutral-100 font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Mid-market entry: (Bid + Ask) / 2"
          >
            Mid Price
          </button>
          <button
            onClick={() => onChangePricingMode('CONSERVATIVE')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              pricingMode === 'CONSERVATIVE'
                ? 'bg-neutral-800 text-neutral-100 font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Conservative exit / liquidation value"
          >
            Conservative Exit
          </button>
        </div>
      </div>

      {/* Main Parameters Row: CE/PE, Ratio, Gap Mode, Strike Steps, Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 pt-2 border-t border-neutral-800/60 text-xs">
        {/* 1. Option Type & Direction */}
        <div className="flex items-center gap-2">
          {/* CE / PE Segmented Buttons */}
          <div className="flex items-center bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            <button
              onClick={() => onChangeOptionType('CE')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                optionType === 'CE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              CALL (CE)
            </button>
            <button
              onClick={() => onChangeOptionType('PE')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                optionType === 'PE'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              PUT (PE)
            </button>
          </div>

          {/* Direction Toggle */}
          <button
            onClick={() => onChangeDirection(direction === 'NORMAL' ? 'REVERSE' : 'NORMAL')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors ${
              direction === 'NORMAL'
                ? 'bg-neutral-800 border-neutral-700 text-neutral-200'
                : 'bg-amber-950/40 border-amber-800 text-amber-300'
            }`}
            title={
              optionType === 'CE'
                ? direction === 'NORMAL'
                  ? 'Standard Call Ratio: Long Lower Strike, Short Higher Strike'
                  : 'Reverse Call Ratio: Short Lower Strike, Long Higher Strike'
                : direction === 'NORMAL'
                ? 'Standard Put Ratio: Long Higher Strike, Short Lower Strike'
                : 'Reverse Put Ratio: Short Higher Strike, Long Lower Strike'
            }
          >
            <ArrowRightLeft className="w-3 h-3 text-neutral-400" />
            <span>{direction === 'NORMAL' ? 'Standard Spread' : 'Reverse Spread'}</span>
          </button>
        </div>

        {/* 2. Custom Ratio Controller */}
        <div className="flex items-center gap-1.5">
          <span className="text-neutral-400 shrink-0">Ratio:</span>
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            {ratioPresets.map(p => (
              <button
                key={p.label}
                onClick={() => {
                  onChangeRatio(p.long, p.short);
                  setCustomRatioOpen(false);
                }}
                className={`px-2 py-1 rounded font-mono text-[11px] transition-colors ${
                  ratioLong === p.long && ratioShort === p.short && !customRatioOpen
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                {p.label}
              </button>
            ))}

            <button
              onClick={() => setCustomRatioOpen(!customRatioOpen)}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                customRatioOpen
                  ? 'bg-neutral-700 text-neutral-100'
                  : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Custom
            </button>
          </div>

          {customRatioOpen && (
            <div className="flex items-center gap-1 font-mono">
              <input
                type="number"
                min="1"
                max="20"
                value={customLong}
                onChange={e => {
                  setCustomLong(e.target.value);
                  const l = parseInt(e.target.value, 10);
                  const s = parseInt(customShort, 10);
                  if (l > 0 && s > 0) onChangeRatio(l, s);
                }}
                className="w-10 px-1 py-0.5 bg-neutral-950 border border-neutral-700 rounded text-center text-xs text-neutral-100"
              />
              <span className="text-neutral-500">:</span>
              <input
                type="number"
                min="1"
                max="20"
                value={customShort}
                onChange={e => {
                  setCustomShort(e.target.value);
                  const l = parseInt(customLong, 10);
                  const s = parseInt(e.target.value, 10);
                  if (l > 0 && s > 0) onChangeRatio(l, s);
                }}
                className="w-10 px-1 py-0.5 bg-neutral-950 border border-neutral-700 rounded text-center text-xs text-neutral-100"
              />
            </div>
          )}
        </div>

        {/* 3. Gap Controls (Exchange Strikes vs Rupee Target) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 text-[11px]">
            <button
              onClick={() => onChangeGapMode('STRIKE_STEPS')}
              className={`px-2 py-1 rounded transition-colors ${
                gapMode === 'STRIKE_STEPS'
                  ? 'bg-neutral-800 text-neutral-100 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Exchange strike steps (source of truth)"
            >
              Strike Steps
            </button>
            <button
              onClick={() => onChangeGapMode('PRICE_GAP')}
              className={`px-2 py-1 rounded transition-colors ${
                gapMode === 'PRICE_GAP'
                  ? 'bg-neutral-800 text-neutral-100 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Approximate rupee gap mapped to exchange strike"
            >
              ₹ Gap Mode
            </button>
          </div>

          {gapMode === 'STRIKE_STEPS' ? (
            <div className="flex items-center gap-1 font-mono">
              {[1, 2, 3, 4, 5].map(step => (
                <button
                  key={step}
                  onClick={() => onChangeGapSteps(step)}
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs transition-colors ${
                    gapSteps === step
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                  title={`Gap of ${step} strike ${step === 1 ? 'step' : 'steps'} in listed exchange grid`}
                >
                  {step}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1 font-mono">
              {[20, 50, 100, 200].map(gap => (
                <button
                  key={gap}
                  onClick={() => onChangeTargetPriceGap(gap)}
                  className={`px-1.5 py-1 rounded text-[11px] transition-colors ${
                    targetPriceGap === gap
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  ₹{gap}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 4. Strike Range (±5, ±10, ±15, ±20) */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400">Range:</span>
            <div className="flex items-center gap-1 font-mono">
              {[5, 10, 15, 20].map(r => (
                <button
                  key={r}
                  onClick={() => onChangeStrikeRange(r)}
                  className={`px-1.5 py-1 rounded text-[11px] transition-colors ${
                    strikeRange === r
                      ? 'bg-neutral-700 text-neutral-100 font-bold'
                      : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  ±{r}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-neutral-500 font-mono text-right">
            <span>Avail: {availableStrikesCount.below}↓ / {availableStrikesCount.above}↑</span>
          </div>
        </div>
      </div>
    </div>
  );
};
