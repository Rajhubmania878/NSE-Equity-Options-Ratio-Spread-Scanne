import React, { useState } from 'react';
import {
  Maximize2,
  Minimize2,
  Eye,
  Settings,
  ChevronDown,
  User,
  Shield,
  LogOut,
  Sliders
} from 'lucide-react';
import { MarketFeedMetrics, UnderlyingStock, Exchange } from '../types/market';
import { UserProfile } from '../types/auth';
import { StockSelectorDropdown } from './StockSelectorDropdown';

export type MainTabType = 'MATRIX' | 'SCANNER' | 'OPTION_CHAIN' | 'ALL_RATIOS';

interface HeaderBarProps {
  activeTab: MainTabType;
  setActiveTab: (tab: MainTabType) => void;
  metrics: MarketFeedMetrics;
  exchange: Exchange;
  onSelectExchange: (exchange: Exchange) => void;
  onOpenAngelModal: () => void;
  onOpenTestModal: () => void;
  onToggleStreaming: () => void;
  isStreaming: boolean;
  selectedStock: UnderlyingStock;
  onSelectStock: (symbol: string) => void;
  selectedExpiry: string;
  onSelectExpiry: (exp: string) => void;
  ratioLong: number;
  ratioShort: number;
  onSelectRatio: (long: number, short: number) => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  currentUser?: UserProfile | null;
  onOpenSettings?: () => void;
  onOpenAdmin?: () => void;
  onLogout?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  activeTab,
  setActiveTab,
  metrics,
  exchange,
  onSelectExchange,
  onOpenAngelModal,
  selectedStock,
  onSelectStock,
  selectedExpiry,
  onSelectExpiry,
  isFocusMode = false,
  onToggleFocusMode,
  isFullscreen = false,
  onToggleFullscreen,
  currentUser,
  onOpenSettings,
  onOpenAdmin,
  onLogout
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const isAngelConnected = metrics.angelConnected;

  const tabs: { id: MainTabType; label: string }[] = [
    { id: 'MATRIX', label: `${exchange} Ratio Matrix` },
    { id: 'ALL_RATIOS', label: 'All Ratios' },
    { id: 'OPTION_CHAIN', label: 'Option Chain' },
    { id: 'SCANNER', label: 'Spreadsheet Scanner' }
  ];

  return (
    <header className="bg-slate-900 text-slate-100 border-b border-slate-800 sticky top-0 z-30 font-sans shadow-md">
      <div className="max-w-[1920px] mx-auto px-4 py-2 flex items-center justify-between gap-4">
        {/* Zone 1: Brand & Primary Navigation Tabs */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
            <a href="/" className="text-sm font-extrabold tracking-tight text-white whitespace-nowrap font-mono">
              RATIO SPREAD
            </a>
          </div>

          {/* Navigation Links (Compact & Flat) */}
          {!isFocusMode && (
            <nav className="hidden lg:flex items-center gap-1">
              {tabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-slate-800 text-white shadow-sm font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        {/* Zone 2: Right Controls (Exchange, Stock, Expiry, User Account Dropdown) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Exchange Selector */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-md p-0.5 text-xs font-mono">
            <button
              onClick={() => onSelectExchange('NSE')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                exchange === 'NSE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              NSE
            </button>
            <button
              onClick={() => onSelectExchange('BSE')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                exchange === 'BSE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              BSE
            </button>
          </div>

          {/* Stock Dropdown */}
          <StockSelectorDropdown
            selectedStock={selectedStock}
            onSelectStock={onSelectStock}
          />

          {/* Expiry Dropdown */}
          <div className="relative inline-block">
            <select
              value={selectedExpiry}
              onChange={(e) => onSelectExpiry(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-semibold rounded-md px-2.5 py-1.5 pr-7 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {selectedStock.expiries.map(exp => (
                <option key={exp} value={exp}>
                  {exp}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <span className="w-px h-5 bg-slate-800 hidden sm:inline-block" />

          {/* Focus Mode Button */}
          {onToggleFocusMode && (
            <button
              onClick={onToggleFocusMode}
              title={isFocusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isFocusMode
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{isFocusMode ? 'Focused' : 'Focus'}</span>
            </button>
          )}

          {/* Fullscreen Button */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                isFullscreen
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          {/* Angel One Connection Settings */}
          <button
            onClick={onOpenAngelModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-mono transition-colors"
          >
            <span className={`w-2 h-2 rounded-full ${isAngelConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className="hidden sm:inline">{isAngelConnected ? 'Angel Connected' : 'SmartAPI'}</span>
          </button>

          {/* AUTHENTICATED USER DROPDOWN PILL */}
          {currentUser && (
            <div className="relative inline-block">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-100 text-xs font-mono font-bold transition-all"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="max-w-[120px] truncate">{currentUser.email}</span>
                {currentUser.role === 'ADMIN' && (
                  <span className="px-1 bg-amber-500/20 text-amber-400 text-[9px] rounded border border-amber-500/30">ADMIN</span>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-9 z-50 w-56 bg-slate-900 border border-slate-800 shadow-2xl rounded-xl p-2 space-y-1 font-mono text-xs text-slate-200">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <span className="font-bold text-white block">{currentUser.displayName}</span>
                    <span className="text-[10px] text-slate-400 block">{currentUser.email}</span>
                  </div>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onOpenSettings?.();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-2 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>Account Settings</span>
                  </button>

                  {currentUser.role === 'ADMIN' && (
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenAdmin?.();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-2 text-amber-400 transition-colors"
                    >
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      <span>Admin Control Panel</span>
                    </button>
                  )}

                  <div className="pt-1 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onLogout?.();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-500/20 text-rose-400 flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-400" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
