import React, { useState, useMemo } from 'react';
import {
  UnderlyingStock,
  OptionType,
  DirectionMode,
  ReferenceStrikeMode,
  SavedPreset
} from '../types/market';
import { RotateCcw, Bookmark, Check, Columns, Sliders, Plus } from 'lucide-react';

interface StrategyControlBarProps {
  stock: UnderlyingStock;
  optionType: OptionType;
  onChangeOptionType: (type: OptionType) => void;
  direction: DirectionMode;
  onChangeDirection: (dir: DirectionMode) => void;
  ratioLong: number;
  ratioShort: number;
  onChangeRatio: (long: number, short: number) => void;
  gap: number;
  onChangeGap: (gap: number) => void;
  cnt: number;
  onChangeCnt: (cnt: number) => void;
  stk: string | number;
  onChangeStk: (stk: string | number) => void;
  minStrike: number | 'ALL';
  onChangeMinStrike: (min: number | 'ALL') => void;
  maxStrike: number | 'ALL';
  onChangeMaxStrike: (max: number | 'ALL') => void;
  allStrikes: number[];
  referenceMode: ReferenceStrikeMode;
  onChangeReferenceMode: (mode: ReferenceStrikeMode) => void;
  atmStrike: number;
  density: 'compact' | 'comfortable';
  onChangeDensity: (density: 'compact' | 'comfortable') => void;
  showAdvancedData: boolean;
  onToggleAdvancedData: () => void;
  onReset: () => void;
  onSavePreset: () => void;
  savedPresets: SavedPreset[];
  onLoadPreset: (preset: SavedPreset) => void;
}

export const StrategyControlBar: React.FC<StrategyControlBarProps> = ({
  stock,
  optionType,
  onChangeOptionType,
  direction,
  onChangeDirection,
  ratioLong,
  ratioShort,
  onChangeRatio,
  gap,
  onChangeGap,
  cnt,
  onChangeCnt,
  stk,
  onChangeStk,
  minStrike,
  onChangeMinStrike,
  maxStrike,
  onChangeMaxStrike,
  allStrikes,
  referenceMode,
  onChangeReferenceMode,
  atmStrike,
  density,
  onChangeDensity,
  showAdvancedData,
  onToggleAdvancedData,
  onReset,
  onSavePreset,
  savedPresets,
  onLoadPreset
}) => {
  const [customRatioOpen, setCustomRatioOpen] = useState(false);
  const [customLong, setCustomLong] = useState(String(ratioLong));
  const [customShort, setCustomShort] = useState(String(ratioShort));
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const ratioOptions = [
    { long: 1, short: 1, label: '1:1' },
    { long: 1, short: 2, label: '1:2' },
    { long: 1, short: 3, label: '1:3' },
    { long: 2, short: 5, label: '2:5' },
    { long: 3, short: 5, label: '3:5' },
    { long: 1, short: 4, label: '1:4' },
    { long: 1, short: 5, label: '1:5' },
    { long: 1, short: 7, label: '1:7' }
  ];

  // Exchange strike step & suggested gaps
  const actualStep = stock.strikeStep;
  const effectiveStkStep = stk === 'AUTO' ? actualStep : Number(stk);

  const suggestedGaps = useMemo(() => {
    const list = [actualStep, actualStep * 2, actualStep * 3, actualStep * 4, actualStep * 5, actualStep * 10];
    const standard = [10, 20, 25, 40, 50, 75, 100, 150, 200, 250, 500];
    return Array.from(new Set([...list, ...standard])).sort((a, b) => a - b);
  }, [actualStep]);

  // Target gaps line preview
  const generatedGaps = useMemo(() => {
    const list: number[] = [];
    for (let i = 1; i <= Math.min(10, cnt); i++) {
      list.push(gap * i);
    }
    return list;
  }, [gap, cnt]);

  const isGapValid = useMemo(() => {
    return generatedGaps.every(g => g % effectiveStkStep === 0);
  }, [generatedGaps, effectiveStkStep]);

  const handleApplyCustomRatio = () => {
    const l = parseInt(customLong, 10);
    const s = parseInt(customShort, 10);
    if (!isNaN(l) && !isNaN(s) && l > 0 && s > 0) {
      onChangeRatio(l, s);
      setCustomRatioOpen(false);
    }
  };

  const handleSaveClick = () => {
    onSavePreset();
    setToastMsg('Preset Saved');
    setTimeout(() => setToastMsg(null), 2000);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-3.5 space-y-3 font-sans transition-colors">
      {/* 1. RATIO QUICK SELECTOR & PRESETS */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Ratio Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1">
            RATIO:
          </span>
          {ratioOptions.map(r => {
            const isActive = ratioLong === r.long && ratioShort === r.short;
            return (
              <button
                key={r.label}
                onClick={() => onChangeRatio(r.long, r.short)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                    : 'bg-slate-200/70 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {r.label}
              </button>
            );
          })}

          {/* Custom Ratio Trigger */}
          <div className="relative">
            <button
              onClick={() => setCustomRatioOpen(!customRatioOpen)}
              className="px-2 py-1 rounded-md text-xs font-mono bg-slate-200/70 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Custom
            </button>

            {customRatioOpen && (
              <div className="absolute top-8 left-0 z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-md p-3 flex items-center gap-2">
                <input
                  type="number"
                  value={customLong}
                  onChange={e => setCustomLong(e.target.value)}
                  className="w-12 px-2 py-1 border border-slate-300 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs text-center"
                  placeholder="Long"
                  min="1"
                />
                <span className="font-bold font-mono text-slate-500">:</span>
                <input
                  type="number"
                  value={customShort}
                  onChange={e => setCustomShort(e.target.value)}
                  className="w-12 px-2 py-1 border border-slate-300 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs text-center"
                  placeholder="Short"
                  min="1"
                />
                <button
                  onClick={handleApplyCustomRatio}
                  className="px-2.5 py-1 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded font-semibold text-xs"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Presets & Actions */}
        <div className="flex items-center gap-2">
          {savedPresets.length > 0 && (
            <select
              onChange={e => {
                const found = savedPresets.find(p => p.id === e.target.value);
                if (found) onLoadPreset(found);
              }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono rounded-md px-2 py-1 appearance-none cursor-pointer"
            >
              <option value="">Load Saved Preset...</option>
              {savedPresets.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={onReset}
            title="Reset strategy controls to defaults"
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>

          <button
            onClick={handleSaveClick}
            title="Save current configuration"
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
          >
            <Bookmark className="w-3.5 h-3.5" />
            {toastMsg ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>

      {/* 2. DEDICATED CONTROL BAR (Terminal Style) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-2 text-xs">
        {/* TYPE CE / PE Segmented Toggle */}
        <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">TYPE</label>
          <div className="flex items-center bg-slate-200/80 dark:bg-slate-900 p-0.5 rounded-md border border-slate-300 dark:border-slate-800 h-8">
            <button
              onClick={() => onChangeOptionType('CE')}
              className={`flex-1 h-full rounded font-bold font-mono text-xs transition-colors ${
                optionType === 'CE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              CE
            </button>
            <button
              onClick={() => onChangeOptionType('PE')}
              className={`flex-1 h-full rounded font-bold font-mono text-xs transition-colors ${
                optionType === 'PE'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              PE
            </button>
          </div>
        </div>

        {/* GAP Dropdown */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">GAP</label>
          <select
            value={gap}
            onChange={e => onChangeGap(Number(e.target.value))}
            className="h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs font-bold rounded-md px-2 focus:ring-1 focus:ring-emerald-500"
          >
            {suggestedGaps.map(g => (
              <option key={g} value={g}>
                ₹{g}
              </option>
            ))}
          </select>
        </div>

        {/* CNT (Count of Gap Multiples) */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">CNT</label>
          <select
            value={cnt}
            onChange={e => onChangeCnt(Number(e.target.value))}
            className="h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs font-bold rounded-md px-2 focus:ring-1 focus:ring-emerald-500"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* STK (Strike Step) */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">STK</label>
          <select
            value={stk}
            onChange={e => onChangeStk(e.target.value === 'AUTO' ? 'AUTO' : Number(e.target.value))}
            className="h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs font-bold rounded-md px-2 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="AUTO">AUTO (₹{actualStep})</option>
            {[10, 20, 25, 50, 100, 250, 500].map(s => (
              <option key={s} value={s}>
                ₹{s}
              </option>
            ))}
          </select>
        </div>

        {/* REF (Reference Strike Mode) */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">REF</label>
          <select
            value={referenceMode}
            onChange={e => onChangeReferenceMode(e.target.value as ReferenceStrikeMode)}
            className="h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs font-bold rounded-md px-2 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ATM">ATM (₹{atmStrike})</option>
            <option value="ATM_PLUS_1">ATM + 1</option>
            <option value="ATM_MINUS_1">ATM - 1</option>
            <option value="ATM_PLUS_2">ATM + 2</option>
            <option value="ATM_MINUS_2">ATM - 2</option>
          </select>
        </div>

        {/* MIN Strike */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">MIN STRIKE</label>
          <select
            value={minStrike}
            onChange={e => onChangeMinStrike(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs rounded-md px-2 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">ALL</option>
            {allStrikes.slice(0, Math.floor(allStrikes.length / 2)).map(s => (
              <option key={s} value={s}>
                ₹{s}
              </option>
            ))}
          </select>
        </div>

        {/* MAX Strike */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">MAX STRIKE</label>
          <select
            value={maxStrike}
            onChange={e => onChangeMaxStrike(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs rounded-md px-2 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">ALL</option>
            {allStrikes.slice(Math.floor(allStrikes.length / 2)).map(s => (
              <option key={s} value={s}>
                ₹{s}
              </option>
            ))}
          </select>
        </div>

        {/* MODE (Normal / Inverted) */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">MODE</label>
          <select
            value={direction}
            onChange={e => onChangeDirection(e.target.value as DirectionMode)}
            className="h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs font-semibold rounded-md px-2 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="NORMAL">NORMAL</option>
            <option value="INVERTED">INVERTED</option>
          </select>
        </div>

        {/* DENSITY Control */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">DENSITY</label>
          <select
            value={density}
            onChange={e => onChangeDensity(e.target.value as 'compact' | 'comfortable')}
            className="h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs font-semibold rounded-md px-2 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="compact">Compact</option>
            <option value="comfortable">Comfortable</option>
          </select>
        </div>

        {/* ADVANCED DATA Toggle */}
        <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">GREEKS & DATA</label>
          <button
            onClick={onToggleAdvancedData}
            className={`h-8 px-2 rounded-md border text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
              showAdvancedData
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 font-bold'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>{showAdvancedData ? 'Data: ON' : 'Show Advanced'}</span>
          </button>
        </div>
      </div>

      {/* 3. GENERATED GAP PREVIEW LINE */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-600 dark:text-slate-400">Generated gaps:</span>
          <span className="text-slate-900 dark:text-slate-100 font-bold">
            {generatedGaps.join(' · ')}
          </span>
        </div>

        <span className="text-slate-300 dark:text-slate-700">|</span>

        <div>
          <span>Exchange step: </span>
          <span className="text-slate-800 dark:text-slate-200 font-semibold">₹{actualStep}</span>
        </div>

        <span className="text-slate-300 dark:text-slate-700">|</span>

        <div>
          <span>Reference: </span>
          <span className="text-amber-600 dark:text-amber-400 font-semibold">₹{atmStrike}</span>
        </div>

        <span className="text-slate-300 dark:text-slate-700">|</span>

        <div className="flex items-center gap-1">
          <span>Status: </span>
          {isGapValid ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
              <Check className="w-3 h-3 inline" /> Valid
            </span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400 font-bold">
              Adjusted to Exchange Step
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
