import React, { useState, useRef, useEffect, useMemo } from 'react';
import { UnderlyingStock, Exchange } from '../types/market';
import {
  getUnderlyingsForExchange,
  getCashStocksForExchange,
  getAvailableSectorsForExchange
} from '../data/universeManager';
import { Search, ChevronDown, Star, Clock, X, Layers, Building2, AlertCircle } from 'lucide-react';

interface StockSelectorDropdownProps {
  selectedStock: UnderlyingStock;
  onSelectStock: (symbol: string) => void;
  exchange?: Exchange;
}

export const StockSelectorDropdown: React.FC<StockSelectorDropdownProps> = ({
  selectedStock,
  onSelectStock,
  exchange = 'NSE'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  // In BSE mode, user can view BSE Option underlyings or all BSE Cash equities
  const [bseUniverseTab, setBseUniverseTab] = useState<'OPTIONS' | 'CASH'>('OPTIONS');
  const [cashWarning, setCashWarning] = useState<string | null>(null);

  // Favorites & Recents persisted per exchange
  const favKey = `${exchange.toLowerCase()}_favorite_stocks`;
  const recentKey = `${exchange.toLowerCase()}_recent_stocks`;

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(favKey);
      return stored
        ? JSON.parse(stored)
        : ['RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'INFY', 'SBIN', 'ADANIENT'];
    } catch {
      return ['RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'INFY', 'SBIN', 'ADANIENT'];
    }
  });

  const [recents, setRecents] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(recentKey);
      return stored
        ? JSON.parse(stored)
        : ['RELIANCE', 'ADANIENT', 'TCS', 'SBIN', 'HDFCBANK'];
    } catch {
      return ['RELIANCE', 'ADANIENT', 'TCS', 'SBIN', 'HDFCBANK'];
    }
  });

  // Re-load favorites/recents when exchange changes
  useEffect(() => {
    try {
      const storedFav = localStorage.getItem(favKey);
      if (storedFav) setFavorites(JSON.parse(storedFav));
      const storedRec = localStorage.getItem(recentKey);
      if (storedRec) setRecents(JSON.parse(storedRec));
    } catch {
      // ignore
    }
    setBseUniverseTab('OPTIONS');
    setCashWarning(null);
  }, [exchange, favKey, recentKey]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const optionUnderlyings = useMemo(() => getUnderlyingsForExchange(exchange), [exchange]);
  const cashStocks = useMemo(() => getCashStocksForExchange(exchange), [exchange]);
  const availableSectors = useMemo(() => ['ALL', ...getAvailableSectorsForExchange(exchange)], [exchange]);

  // Filter stocks according to search query, sector, and universe tab
  const filteredStocks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    // If BSE Cash tab selected, filter from broader cash stocks
    if (exchange === 'BSE' && bseUniverseTab === 'CASH') {
      return cashStocks.filter(stock => {
        if (!q) return true;
        return (
          stock.symbol.toLowerCase().includes(q) ||
          stock.name.toLowerCase().includes(q)
        );
      });
    }

    // Default: Option Underlyings (NSE F&O or BSE Options)
    return optionUnderlyings.filter(stock => {
      // Sector filter
      if (selectedSector === 'FAVORITES') {
        if (!favorites.includes(stock.symbol)) return false;
      } else if (selectedSector === 'RECENTS') {
        if (!recents.includes(stock.symbol)) return false;
      } else if (selectedSector !== 'ALL' && stock.sector !== selectedSector) {
        return false;
      }

      // Query filter
      if (!q) return true;
      return (
        stock.symbol.toLowerCase().includes(q) ||
        stock.name.toLowerCase().includes(q) ||
        stock.sector.toLowerCase().includes(q)
      );
    });
  }, [exchange, bseUniverseTab, optionUnderlyings, cashStocks, searchQuery, selectedSector, favorites, recents]);

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setCashWarning(null);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Keep selected index in bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, selectedSector, bseUniverseTab]);

  // Toggle favorite
  const toggleFavorite = (e: React.MouseEvent, sym: string) => {
    e.stopPropagation();
    let updated: string[];
    if (favorites.includes(sym)) {
      updated = favorites.filter(s => s !== sym);
    } else {
      updated = [...favorites, sym];
    }
    setFavorites(updated);
    try {
      localStorage.setItem(favKey, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Select stock and record in recents
  const handleSelect = (sym: string) => {
    // Check if the stock has active option contracts in this exchange
    const isOptionable = optionUnderlyings.some(u => u.symbol.toUpperCase() === sym.toUpperCase());

    if (!isOptionable && exchange === 'BSE') {
      setCashWarning(`"${sym}" is listed in BSE Cash only (no BSE option contracts). Select a stock from the BSE F&O universe (e.g. RELIANCE, TCS, SBIN) for Ratio Spread strategies.`);
      return;
    }

    onSelectStock(sym);
    setIsOpen(false);

    // Update recents
    const updated = [sym, ...recents.filter(s => s !== sym)].slice(0, 8);
    setRecents(updated);
    try {
      localStorage.setItem(recentKey, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredStocks.length - 1));
      scrollActiveIntoView(selectedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
      scrollActiveIntoView(selectedIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredStocks[selectedIndex]) {
        handleSelect(filteredStocks[selectedIndex].symbol);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const scrollActiveIntoView = (index: number) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-stock-item]');
    if (items[index]) {
      items[index].scrollIntoView({ block: 'nearest' });
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef} onKeyDown={handleKeyDown}>
      {/* Header Dropdown Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800/90 text-neutral-100 border border-neutral-700/80 hover:border-emerald-500/80 rounded-lg shadow-sm transition-all focus:outline-none focus:ring-1 focus:ring-emerald-500"
      >
        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
          EQUITY
        </span>
        <span className="text-sm font-bold text-neutral-100 tracking-tight flex items-center gap-1.5">
          <span>{selectedStock.symbol}</span>
          <span className="text-[10px] bg-neutral-800 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold">
            {exchange}
          </span>
          <span className="text-xs text-neutral-400 font-normal hidden md:inline">
            ({selectedStock.name.split(' ')[0]})
          </span>
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isOpen ? 'rotate-180 text-emerald-400' : ''}`} />
      </button>

      {/* Search & Dynamic Universe Dropdown Modal */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-[340px] sm:w-[480px] md:w-[540px] max-h-[580px] bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col backdrop-blur-md">
          {/* Exchange Universe Distinction Header (Section 5: Two BSE Universes) */}
          {exchange === 'BSE' && (
            <div className="flex items-center justify-between px-3 py-2 bg-neutral-950 border-b border-neutral-800 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBseUniverseTab('OPTIONS');
                    setCashWarning(null);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                    bseUniverseTab === 'OPTIONS'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-neutral-850 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>BSE Option Underlyings ({optionUnderlyings.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBseUniverseTab('CASH');
                    setCashWarning(null);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                    bseUniverseTab === 'CASH'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-neutral-850 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>BSE Cash Universe ({cashStocks.length}+)</span>
                </button>
              </div>
              <span className="text-[10px] text-neutral-500 font-mono hidden sm:inline">
                {bseUniverseTab === 'OPTIONS' ? 'Ratio Spread Valid' : 'Cash Stocks'}
              </span>
            </div>
          )}

          {/* Search Header */}
          <div className="p-3 border-b border-neutral-800 bg-neutral-950 flex items-center gap-2.5">
            <Search className="w-4 h-4 text-emerald-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={`Search ${exchange} stock / symbol (e.g. RELIANCE, TCS, INFY, SBIN)...`}
              className="w-full bg-transparent text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-0.5 text-neutral-400 hover:text-neutral-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Warning Banner if user clicks cash stock without options */}
          {cashWarning && (
            <div className="px-3 py-2 bg-amber-950/70 border-b border-amber-800/80 flex items-start gap-2 text-xs text-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{cashWarning}</span>
              </div>
              <button
                type="button"
                onClick={() => setCashWarning(null)}
                className="text-amber-400 hover:text-amber-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Quick Filter Chips (for Option Underlyings) */}
          {bseUniverseTab === 'OPTIONS' && (
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-neutral-800/80 bg-neutral-950/70 overflow-x-auto text-[11px] scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedSector('ALL')}
                className={`px-2 py-0.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                  selectedSector === 'ALL'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                All {exchange} Option Stocks ({optionUnderlyings.length})
              </button>

              <button
                type="button"
                onClick={() => setSelectedSector('FAVORITES')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                  selectedSector === 'FAVORITES'
                    ? 'bg-amber-600 text-white font-bold'
                    : 'bg-neutral-800 text-amber-300 hover:bg-neutral-700'
                }`}
              >
                <Star className="w-3 h-3 fill-current" />
                <span>Favorites ({favorites.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSector('RECENTS')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                  selectedSector === 'RECENTS'
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'bg-neutral-800 text-cyan-300 hover:bg-neutral-700'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Recent</span>
              </button>

              {availableSectors.filter(s => s !== 'ALL').map(sec => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setSelectedSector(sec)}
                  className={`px-2 py-0.5 rounded-md whitespace-nowrap transition-colors ${
                    selectedSector === sec
                      ? 'bg-neutral-700 text-white font-semibold'
                      : 'bg-neutral-800/70 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {sec}
                </button>
              ))}
            </div>
          )}

          {/* Stocks Scrollable List */}
          <div ref={listRef} className="overflow-y-auto max-h-[380px] divide-y divide-neutral-800/60 p-1">
            {filteredStocks.length === 0 ? (
              <div className="py-12 text-center text-neutral-500 text-xs">
                No {exchange} equities match &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredStocks.map((stockItem, idx) => {
                const isSelected = stockItem.symbol === selectedStock.symbol;
                const isHighlighted = idx === selectedIndex;
                const isFav = favorites.includes(stockItem.symbol);
                const hasOpts = (stockItem as UnderlyingStock).expiries !== undefined || (stockItem as { hasOptions?: boolean }).hasOptions;

                return (
                  <div
                    key={stockItem.symbol}
                    data-stock-item
                    onClick={() => handleSelect(stockItem.symbol)}
                    className={`w-full px-3 py-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                      isHighlighted
                        ? 'bg-neutral-800 text-neutral-100 ring-1 ring-emerald-500/50'
                        : isSelected
                        ? 'bg-emerald-950/40 text-emerald-300'
                        : 'text-neutral-300 hover:bg-neutral-850'
                    }`}
                  >
                    {/* Left: Star + Symbol + Name */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={e => toggleFavorite(e, stockItem.symbol)}
                        className={`p-1 rounded hover:bg-neutral-700 transition-colors ${
                          isFav ? 'text-amber-400' : 'text-neutral-600 hover:text-neutral-400'
                        }`}
                        title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-neutral-100 font-mono tracking-tight">
                            {stockItem.symbol}
                          </span>
                          {isSelected && (
                            <span className="text-[9px] bg-emerald-900/80 text-emerald-300 px-1 py-0.2 rounded font-bold">
                              ACTIVE
                            </span>
                          )}
                          {hasOpts ? (
                            <span className="text-[9px] bg-neutral-800 text-emerald-400 px-1 py-0.2 rounded font-bold font-mono">
                              {exchange} F&O
                            </span>
                          ) : (
                            <span className="text-[9px] bg-neutral-850 text-neutral-400 px-1 py-0.2 rounded font-mono">
                              Cash
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-neutral-400 truncate block">
                          {stockItem.name} {(stockItem as UnderlyingStock).sector ? `· ${(stockItem as UnderlyingStock).sector}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Right: Spot + Lot Size + Strike Step */}
                    <div className="text-right font-mono shrink-0 ml-3">
                      {'spotPrice' in stockItem && (
                        <div className="text-xs font-bold text-neutral-200">
                          ₹{stockItem.spotPrice.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                        </div>
                      )}
                      <div className="text-[10px] text-neutral-400 flex items-center justify-end gap-1.5">
                        <span>Lot: <strong className="text-neutral-300">{stockItem.lotSize}</strong></span>
                        {'strikeStep' in stockItem && (
                          <>
                            <span className="text-neutral-600">·</span>
                            <span>Step: <strong className="text-emerald-400">₹{(stockItem as UnderlyingStock).strikeStep}</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Info & Keyboard Navigation Tips */}
          <div className="px-3 py-2 border-t border-neutral-800 bg-neutral-950 text-[10px] text-neutral-500 flex items-center justify-between font-mono">
            <span>
              ↑ / ↓ Navigate · ↵ Select · Esc Close
            </span>
            <span>
              {exchange} Option Underlyings: <strong className="text-emerald-400 font-bold">{optionUnderlyings.length}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
