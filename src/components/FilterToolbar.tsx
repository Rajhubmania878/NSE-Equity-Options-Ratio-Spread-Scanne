import React from 'react';
import { ScannerFilterConfig, SortField, SortDirection } from '../types/market';
import { ArrowUpDown, Filter, Search, RotateCcw } from 'lucide-react';

interface FilterToolbarProps {
  filter: ScannerFilterConfig;
  onChangeFilter: (f: ScannerFilterConfig) => void;
  sortField: SortField;
  onChangeSortField: (field: SortField) => void;
  sortDirection: SortDirection;
  onToggleSortDirection: () => void;
  totalCount: number;
  filteredCount: number;
}

export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  filter,
  onChangeFilter,
  sortField,
  onChangeSortField,
  sortDirection,
  onToggleSortDirection,
  totalCount,
  filteredCount
}) => {
  const resetFilters = () => {
    onChangeFilter({
      netType: 'ALL',
      minOi: 0,
      minVolume: 0,
      maxSpreadPct: 10,
      minMaxProfit: 0,
      minDelta: -1,
      maxDelta: 1,
      searchQuery: ''
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-neutral-950/80 border-b border-neutral-800 text-xs">
      {/* Left: Quick Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-lg border border-neutral-800">
          <button
            onClick={() => onChangeFilter({ ...filter, netType: 'ALL' })}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              filter.netType === 'ALL'
                ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            All Spreads
          </button>
          <button
            onClick={() => onChangeFilter({ ...filter, netType: 'CREDIT_ONLY' })}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              filter.netType === 'CREDIT_ONLY'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Net Credit Only
          </button>
          <button
            onClick={() => onChangeFilter({ ...filter, netType: 'DEBIT_ONLY' })}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              filter.netType === 'DEBIT_ONLY'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Net Debit Only
          </button>
        </div>

        {/* Max Spread % Liquidity Filter */}
        <div className="flex items-center gap-1.5 text-neutral-400">
          <span className="text-[11px] text-neutral-500">Max Spread:</span>
          <select
            value={filter.maxSpreadPct}
            onChange={e => onChangeFilter({ ...filter, maxSpreadPct: Number(e.target.value) })}
            className="px-2 py-1 bg-neutral-900 border border-neutral-800 rounded font-mono text-[11px] text-neutral-300 focus:outline-none"
          >
            <option value={2}>&lt; 2% (Tightest)</option>
            <option value={4}>&lt; 4% (Good)</option>
            <option value={10}>&lt; 10% (Normal)</option>
            <option value={50}>Any Spread</option>
          </select>
        </div>

        {/* Min OI Filter */}
        <div className="flex items-center gap-1.5 text-neutral-400">
          <span className="text-[11px] text-neutral-500">Min OI:</span>
          <select
            value={filter.minOi}
            onChange={e => onChangeFilter({ ...filter, minOi: Number(e.target.value) })}
            className="px-2 py-1 bg-neutral-900 border border-neutral-800 rounded font-mono text-[11px] text-neutral-300 focus:outline-none"
          >
            <option value={0}>All OI</option>
            <option value={10000}>&gt; 10k</option>
            <option value={50000}>&gt; 50k</option>
            <option value={100000}>&gt; 100k</option>
          </select>
        </div>

        {/* Reset button */}
        {(filter.netType !== 'ALL' || filter.minOi > 0 || filter.maxSpreadPct < 10) && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors"
            title="Reset filters"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Right: Sort & Count */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-neutral-500 font-mono">
          Showing <strong className="text-neutral-300">{filteredCount}</strong> of {totalCount} structures
        </span>

        {/* Sort Field & Direction */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-neutral-500">Sort:</span>
          <select
            value={sortField}
            onChange={e => onChangeSortField(e.target.value as SortField)}
            className="px-2 py-1 bg-neutral-900 border border-neutral-800 rounded font-mono text-[11px] text-neutral-300 focus:outline-none"
          >
            <option value="netEntry">Net Entry (Credit first)</option>
            <option value="maxProfit">Max Profit</option>
            <option value="spreadCost">Lowest Bid-Ask Spread %</option>
            <option value="combinedOi">Highest Open Interest</option>
            <option value="combinedVolume">Highest Volume</option>
            <option value="netTheta">Highest Theta Decay</option>
            <option value="buyStrike">Buy Strike</option>
          </select>

          <button
            onClick={onToggleSortDirection}
            className="p-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
            title={`Direction: ${sortDirection}`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
