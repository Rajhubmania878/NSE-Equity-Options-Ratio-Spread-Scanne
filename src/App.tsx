import React, { useState, useEffect, useMemo } from 'react';
import {
  Exchange,
  OptionType,
  GapMode,
  DirectionMode,
  ReferenceStrikeMode,
  RatioStrategyRow,
  MarketFeedMetrics,
  ScannerFilterConfig,
  SortField,
  SortDirection,
  StrategyLeg,
  StockMarketSummary,
  SavedPreset
} from './types/market';
import { UserProfile } from './types/auth';
import { authService } from './services/authService';
import {
  getUnderlyingBySymbolAndExchange,
  getListedStrikesForExchange,
  getAtmStrikeForExchange,
  resolveTokenForExchange,
  getDaysToExpiryForExchange,
  getExpiriesForExchange
} from './data/universeManager';
import { marketDataFeed } from './services/marketDataFeed';
import { evaluateStrategyPayoff } from './engine/payoffEngine';
import { oiTracker } from './engine/oiTracker';

// Components
import { HeaderBar, MainTabType } from './components/HeaderBar';
import { StatusBar } from './components/StatusBar';
import { MarketSnapshotStrip } from './components/MarketSnapshotStrip';
import { StrategyControlBar } from './components/StrategyControlBar';
import { RatioMatrixSpreadsheet } from './components/RatioMatrixSpreadsheet';
import { SelectedStrategyPanel } from './components/SelectedStrategyPanel';
import { ControlsPanel } from './components/ControlsPanel';
import { FilterToolbar } from './components/FilterToolbar';
import { RatioSpreadGrid } from './components/RatioSpreadGrid';
import { OptionChainDualView } from './components/OptionChainDualView';
import { AllRatiosScanner } from './components/AllRatiosScanner';
import { StrategyDetailDrawer } from './components/StrategyDetailDrawer';
import { AngelOneModal } from './components/AngelOneModal';
import { UnitTestsModal } from './components/UnitTestsModal';

// Auth Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { TermsPage, PrivacyPage } from './pages/TermsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminPage } from './pages/AdminPage';

export type ViewMode =
  | 'LANDING'
  | 'LOGIN'
  | 'SIGNUP'
  | 'FORGOT_PASSWORD'
  | 'TERMS'
  | 'PRIVACY'
  | 'APP';

export default function App() {
  // Authentication & Router View State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.getUser());
  const [viewMode, setViewMode] = useState<ViewMode>(() => (authService.getToken() ? 'APP' : 'LANDING'));
  const [showSettingsOverlay, setShowSettingsOverlay] = useState(false);
  const [showAdminOverlay, setShowAdminOverlay] = useState(false);

  // Initial Auth Check on Mount
  useEffect(() => {
    authService.me().then(user => {
      if (user && user.isActive) {
        setCurrentUser(user);
        if (viewMode === 'LOGIN' || viewMode === 'SIGNUP' || viewMode === 'LANDING') {
          setViewMode('APP');
        }
      } else {
        setCurrentUser(null);
        if (viewMode === 'APP') {
          setViewMode('LOGIN');
        }
      }
    });
  }, []);

  // Navigation & Modal States
  const [activeTab, setActiveTab] = useState<MainTabType>('MATRIX');
  const [isAngelModalOpen, setIsAngelModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [selectedStrategyRow, setSelectedStrategyRow] = useState<RatioStrategyRow | null>(null);

  // Terminal Focus, Fullscreen, Density & Advanced Data States
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');
  const [showAdvancedData, setShowAdvancedData] = useState<boolean>(false);

  // Top-Level Exchange Selection (NSE / BSE)
  const [exchange, setExchange] = useState<Exchange>('NSE');

  // Core Stock & Expiry Selection
  const [symbol, setSymbol] = useState<string>('RELIANCE');
  const stock = useMemo(() => getUnderlyingBySymbolAndExchange(symbol, exchange), [symbol, exchange]);
  const [expiry, setExpiry] = useState<string>(() => {
    const s = getUnderlyingBySymbolAndExchange('RELIANCE', 'NSE');
    const oct = s.expiries.find(e => e.includes('Oct') || e.includes('OCT'));
    return oct || s.expiries[0] || '27-Oct-2026';
  });
  const [optionType, setOptionType] = useState<OptionType>('CE');
  const [direction, setDirection] = useState<DirectionMode>('NORMAL');

  // Ratio States (Long:Short)
  const [ratioLong, setRatioLong] = useState<number>(1);
  const [ratioShort, setRatioShort] = useState<number>(3);

  // Flagship GAP, CNT, STK, MIN, MAX Controls
  const [gap, setGap] = useState<number>(() => (stock.strikeStep <= 20 ? 20 : 50));
  const [cnt, setCnt] = useState<number>(5);
  const [stk, setStk] = useState<string | number>('AUTO');
  const [minStrike, setMinStrike] = useState<number | 'ALL'>('ALL');
  const [maxStrike, setMaxStrike] = useState<number | 'ALL'>('ALL');

  // Scanner Mode Controls
  const [gapMode, setGapMode] = useState<GapMode>('STRIKE_STEPS');
  const [gapSteps, setGapSteps] = useState<number>(2);
  const [targetPriceGap, setTargetPriceGap] = useState<number>(50);
  const [strikeRange, setStrikeRange] = useState<number>(15);
  const [referenceMode, setReferenceMode] = useState<ReferenceStrikeMode>('ATM');
  const [pricingMode, setPricingMode] = useState<'EXECUTABLE' | 'MID' | 'CONSERVATIVE'>('EXECUTABLE');

  // Real-time Market Data State
  const [contracts, setContracts] = useState(marketDataFeed.getContracts());
  const [currentSpot, setCurrentSpot] = useState(marketDataFeed.getCurrentSpot());
  const [futurePrice, setFuturePrice] = useState(marketDataFeed.getCurrentFuturePrice());
  const [isStreaming, setIsStreaming] = useState(true);
  const [metrics, setMetrics] = useState<MarketFeedMetrics>({
    status: 'LIVE',
    angelConnected: true,
    isSimulated: false,
    lastTickTime: Date.now(),
    latencyMs: 24,
    dataAgeMs: 40,
    subscribedTokensCount: 60,
    ticksPerSecond: 6
  });

  // Saved Presets
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);

  // Filters & Sorting
  const [filter, setFilter] = useState<ScannerFilterConfig>({
    netType: 'ALL',
    minOi: 0,
    minVolume: 0,
    maxSpreadPct: 50,
    minMaxProfit: 0,
    minDelta: -1,
    maxDelta: 1,
    searchQuery: ''
  });

  const [sortField, setSortField] = useState<SortField>('netEntry');
  const [sortDirection, setSortDirection] = useState<SortDirection>('ASC');

  // Toast
  const [stockSwitchToast, setStockSwitchToast] = useState<string | null>(null);

  // Exchange Switcher
  const handleSelectExchange = (newExchange: Exchange) => {
    if (newExchange === exchange) return;
    setExchange(newExchange);

    const validUnderlying = getUnderlyingBySymbolAndExchange(symbol, newExchange);
    const targetSymbol = validUnderlying.symbol || 'RELIANCE';
    setSymbol(targetSymbol);

    const validExpiries = getExpiriesForExchange(targetSymbol, newExchange);
    const validExpiry = validExpiries.includes(expiry)
      ? expiry
      : (validExpiries.find(e => e.includes('Oct') || e.includes('OCT')) || validExpiries[0] || '29-Oct-2026');
    setExpiry(validExpiry);

    const newStep = validUnderlying.strikeStep;
    const defaultGap = newStep <= 10 ? newStep * 2 : newStep;
    setGap(defaultGap);
    setStk('AUTO');
    setMinStrike('ALL');
    setMaxStrike('ALL');
    setSelectedStrategyRow(null);

    marketDataFeed.switchExchange(newExchange);
    setContracts(new Map(marketDataFeed.getContracts()));
    setCurrentSpot(marketDataFeed.getCurrentSpot());
    setFuturePrice(marketDataFeed.getCurrentFuturePrice());

    setStockSwitchToast(`EXCHANGE [ ${newExchange} ] · ${targetSymbol} · Lot ${validUnderlying.lotSize}`);
    setTimeout(() => setStockSwitchToast(null), 2500);
  };

  const handleSelectStock = (newSymbol: string) => {
    const newStock = getUnderlyingBySymbolAndExchange(newSymbol, exchange);
    setSymbol(newSymbol);

    const validExpiries = getExpiriesForExchange(newSymbol, exchange);
    const validExpiry = validExpiries.includes(expiry)
      ? expiry
      : (validExpiries.find(e => e.includes('Oct') || e.includes('OCT')) || validExpiries[0] || '29-Oct-2026');
    setExpiry(validExpiry);

    const newStep = newStock.strikeStep;
    const defaultGap = newStep <= 10 ? newStep * 2 : newStep;
    setGap(defaultGap);
    setStk('AUTO');
    setMinStrike('ALL');
    setMaxStrike('ALL');
    setSelectedStrategyRow(null);

    marketDataFeed.initStockContracts(newSymbol, validExpiry, exchange, strikeRange);
    setContracts(new Map(marketDataFeed.getContracts()));
    setCurrentSpot(marketDataFeed.getCurrentSpot());
    setFuturePrice(marketDataFeed.getCurrentFuturePrice());

    setStockSwitchToast(`[${exchange}] Switched to ${newSymbol} · Lot ${newStock.lotSize} · Step ₹${newStep}`);
    setTimeout(() => setStockSwitchToast(null), 2500);
  };

  const handleResetStockConfig = () => {
    setGap(stock.strikeStep <= 20 ? 20 : 50);
    setCnt(5);
    setStk('AUTO');
    setMinStrike('ALL');
    setMaxStrike('ALL');
    setRatioLong(1);
    setRatioShort(3);
  };

  const handleSavePreset = async () => {
    if (!currentUser) return;
    try {
      const saved = await authService.saveStrategy({
        name: `${symbol} ${ratioLong}:${ratioShort} (GAP ₹${gap}, CNT ${cnt})`,
        exchange,
        underlying: symbol,
        expiry,
        ratioLong,
        ratioShort,
        gap,
        cnt,
        stk,
        referenceMode,
        optionType,
        minStrike,
        maxStrike
      });

      const updatedPreset: SavedPreset = {
        id: saved.id,
        name: saved.name,
        symbol: saved.underlying,
        gap: saved.gap,
        cnt: saved.cnt,
        stk: saved.stk,
        ratioLong: saved.ratioLong,
        ratioShort: saved.ratioShort,
        minStrike: saved.minStrike,
        maxStrike: saved.maxStrike,
        createdAt: saved.createdAt
      };

      setSavedPresets(prev => [updatedPreset, ...prev]);
    } catch (e) {
      // ignore
    }
  };

  const handleLoadPreset = (preset: SavedPreset) => {
    setSymbol(preset.symbol);
    setGap(preset.gap);
    setCnt(preset.cnt);
    setStk(preset.stk);
    setRatioLong(preset.ratioLong);
    setRatioShort(preset.ratioShort);
    setMinStrike(preset.minStrike);
    setMaxStrike(preset.maxStrike);
  };

  // Subscribe to Market Feed
  useEffect(() => {
    if (viewMode !== 'APP') return;

    marketDataFeed.initStockContracts(symbol, expiry, exchange, strikeRange);
    setContracts(new Map(marketDataFeed.getContracts()));
    setCurrentSpot(marketDataFeed.getCurrentSpot());
    setFuturePrice(marketDataFeed.getCurrentFuturePrice());

    const unsubTicks = marketDataFeed.subscribeTicks((updatedContracts) => {
      setContracts(new Map(updatedContracts));
      setCurrentSpot(marketDataFeed.getCurrentSpot());
    });

    const unsubMetrics = marketDataFeed.subscribeMetrics(newMetrics => {
      setMetrics(newMetrics);
    });

    const unsubSpotFut = marketDataFeed.subscribeSpotFut((newSpot, newFut) => {
      setCurrentSpot(newSpot);
      setFuturePrice(newFut);
    });

    return () => {
      unsubTicks();
      unsubMetrics();
      unsubSpotFut();
    };
  }, [symbol, expiry, exchange, strikeRange, viewMode]);

  const handleToggleStreaming = () => {
    const next = !isStreaming;
    setIsStreaming(next);
    marketDataFeed.toggleStreaming(next);
  };

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
    setShowSettingsOverlay(false);
    setShowAdminOverlay(false);
    setViewMode('LOGIN');
  };

  // Exchange Listed Strikes & ATM
  const allListedStrikes = useMemo(() => getListedStrikesForExchange(symbol, expiry, exchange), [symbol, expiry, exchange]);
  const atmStrike = useMemo(() => getAtmStrikeForExchange(currentSpot, allListedStrikes, exchange), [currentSpot, allListedStrikes, exchange]);

  const stockSummary: StockMarketSummary = useMemo(() => {
    const atmTokenCE = resolveTokenForExchange(symbol, expiry, atmStrike, 'CE', exchange);
    const atmTokenPE = resolveTokenForExchange(symbol, expiry, atmStrike, 'PE', exchange);
    const atmCE = contracts.get(atmTokenCE);
    const atmPE = contracts.get(atmTokenPE);

    const ceLtp = atmCE?.ltp || 0;
    const peLtp = atmPE?.ltp || 0;
    const straddle = Math.round((ceLtp + peLtp) * 100) / 100;
    const straddlePct = Math.round((straddle / currentSpot) * 1000) / 10;

    const futurePriceVal = futurePrice > 0 ? futurePrice : Math.round(currentSpot * 1.004 * 20) / 20;
    const basis = Math.round((futurePriceVal - currentSpot) * 100) / 100;
    const dte = Math.round(getDaysToExpiryForExchange(expiry, exchange));

    return {
      cash: currentSpot,
      future: futurePriceVal,
      basis,
      atm: atmStrike,
      atmStraddle: straddle,
      atmStraddlePct: straddlePct,
      dte
    };
  }, [symbol, expiry, atmStrike, contracts, currentSpot, futurePrice, exchange]);

  const availableStrikesCount = useMemo(() => {
    const atmIdx = allListedStrikes.indexOf(atmStrike);
    if (atmIdx === -1) return { below: 15, above: 15 };
    return {
      below: atmIdx,
      above: allListedStrikes.length - 1 - atmIdx
    };
  }, [allListedStrikes, atmStrike]);

  // Strategy Row Generation for Scanner Mode
  const generatedStrategyRows: RatioStrategyRow[] = useMemo(() => {
    const rows: RatioStrategyRow[] = [];
    const strikes = allListedStrikes;
    const atmIndex = strikes.indexOf(atmStrike);
    const centerIdx = atmIndex >= 0 ? atmIndex : Math.floor(strikes.length / 2);

    const minIdx = Math.max(0, centerIdx - strikeRange);
    const maxIdx = Math.min(strikes.length - 1, centerIdx + strikeRange);

    for (let i = minIdx; i <= maxIdx; i++) {
      let buyIndex = i;
      let sellIndex = -1;
      let effectiveGapSteps = gapSteps;

      if (gapMode === 'STRIKE_STEPS') {
        if (optionType === 'CE') {
          sellIndex = direction === 'NORMAL' ? buyIndex + gapSteps : buyIndex - gapSteps;
        } else {
          sellIndex = direction === 'NORMAL' ? buyIndex - gapSteps : buyIndex + gapSteps;
        }
      } else {
        const baseStrike = strikes[buyIndex];
        const targetStrike =
          optionType === 'CE'
            ? direction === 'NORMAL'
              ? baseStrike + targetPriceGap
              : baseStrike - targetPriceGap
            : direction === 'NORMAL'
            ? baseStrike - targetPriceGap
            : baseStrike + targetPriceGap;

        let bestIdx = -1;
        let bestDiff = Infinity;
        for (let j = 0; j < strikes.length; j++) {
          const diff = Math.abs(strikes[j] - targetStrike);
          if (diff < bestDiff) {
            bestDiff = diff;
            bestIdx = j;
          }
        }
        sellIndex = bestIdx;
        effectiveGapSteps = Math.abs(sellIndex - buyIndex);
      }

      if (sellIndex < 0 || sellIndex >= strikes.length || sellIndex === buyIndex) {
        continue;
      }

      const buyStrike = strikes[buyIndex];
      const sellStrike = strikes[sellIndex];
      const actualGap = Math.abs(Math.round((sellStrike - buyStrike) * 100) / 100);

      const buyToken = resolveTokenForExchange(symbol, expiry, buyStrike, optionType, exchange);
      const sellToken = resolveTokenForExchange(symbol, expiry, sellStrike, optionType, exchange);

      const buyContract = contracts.get(buyToken);
      const sellContract = contracts.get(sellToken);

      const buyAsk = buyContract?.ask ?? null;
      const buyBid = buyContract?.bid ?? null;
      const buyAskQty = buyContract?.askQty ?? null;
      const buyBidQty = buyContract?.bidQty ?? null;
      const buyLtp = buyContract?.ltp ?? null;

      const sellBid = sellContract?.bid ?? null;
      const sellAsk = sellContract?.ask ?? null;
      const sellBidQty = sellContract?.bidQty ?? null;
      const sellAskQty = sellContract?.askQty ?? null;
      const sellLtp = sellContract?.ltp ?? null;

      let executableNetEntry: number | null = null;
      let executableTotalEntry: number | null = null;
      let midNetEntry: number | null = null;
      let conservativeLiquidation: number | null = null;
      let slippageCost: number | null = null;

      if (buyAsk !== null && sellBid !== null) {
        executableNetEntry = Math.round((ratioLong * buyAsk - ratioShort * sellBid) * 100) / 100;
        executableTotalEntry = Math.round(executableNetEntry * stock.lotSize * 100) / 100;

        if (buyBid !== null && sellAsk !== null) {
          const buyMid = (buyAsk + buyBid) / 2;
          const sellMid = (sellAsk + sellBid) / 2;
          midNetEntry = Math.round((ratioLong * buyMid - ratioShort * sellMid) * 100) / 100;
          conservativeLiquidation = Math.round((ratioLong * buyBid - ratioShort * sellAsk) * 100) / 100;
          slippageCost = Math.round(Math.abs(executableNetEntry - midNetEntry) * 100) / 100;
        }
      }

      const buySpread = buyAsk !== null && buyBid !== null ? Math.round((buyAsk - buyBid) * 100) / 100 : null;
      const buySpreadPct =
        buySpread !== null && buyAsk !== null && buyAsk > 0
          ? Math.round((buySpread / buyAsk) * 1000) / 10
          : null;

      const sellSpread = sellAsk !== null && sellBid !== null ? Math.round((sellAsk - sellBid) * 100) / 100 : null;
      const sellSpreadPct =
        sellSpread !== null && sellAsk !== null && sellAsk > 0
          ? Math.round((sellSpread / sellAsk) * 1000) / 10
          : null;

      const combinedSpreadCost =
        buySpread !== null && sellSpread !== null
          ? Math.round((ratioLong * buySpread + ratioShort * sellSpread) * 100) / 100
          : null;

      const legs: StrategyLeg[] = [];
      if (buyContract) {
        legs.push({
          side: 'BUY',
          optionType,
          strike: buyStrike,
          quantity: ratioLong,
          actualQuantity: ratioLong * stock.lotSize,
          contract: buyContract,
          executionPrice: buyAsk
        });
      }
      if (sellContract) {
        legs.push({
          side: 'SELL',
          optionType,
          strike: sellStrike,
          quantity: ratioShort,
          actualQuantity: ratioShort * stock.lotSize,
          contract: sellContract,
          executionPrice: sellBid
        });
      }

      const legConfigs = legs.map(l => ({
        side: l.side,
        optionType: l.optionType,
        strike: l.strike,
        quantity: l.quantity,
        price: l.executionPrice || 0
      }));

      const payoffResult = evaluateStrategyPayoff(
        legConfigs,
        executableNetEntry || 0,
        currentSpot,
        stock.lotSize
      );

      const buyDelta = buyContract?.delta || 0;
      const sellDelta = sellContract?.delta || 0;
      const buyTheta = buyContract?.theta || 0;
      const sellTheta = sellContract?.theta || 0;
      const buyGamma = buyContract?.gamma || 0;
      const sellGamma = sellContract?.gamma || 0;
      const buyVega = buyContract?.vega || 0;
      const sellVega = sellContract?.vega || 0;

      const netDelta = Math.round((ratioLong * buyDelta - ratioShort * sellDelta) * 1000) / 1000;
      const netGamma = Math.round((ratioLong * buyGamma - ratioShort * sellGamma) * 10000) / 10000;
      const netTheta = Math.round((ratioLong * buyTheta - ratioShort * sellTheta) * 100) / 100;
      const netVega = Math.round((ratioLong * buyVega - ratioShort * sellVega) * 100) / 100;

      const buyOi = buyContract?.oi || null;
      const sellOi = sellContract?.oi || null;
      const buyOiChg = oiTracker.getOiChange(buyToken, buyOi).change;
      const sellOiChg = oiTracker.getOiChange(sellToken, sellOi).change;
      const buyVol = buyContract?.volume || null;
      const sellVol = sellContract?.volume || null;

      const rowId = `${symbol}|${expiry}|${optionType}|${buyStrike}|${sellStrike}|${ratioLong}|${ratioShort}`;

      rows.push({
        id: rowId,
        underlying: symbol,
        expiry,
        optionType,
        direction,
        ratioStr: `${ratioLong}:${ratioShort}`,
        longQty: ratioLong,
        shortQty: ratioShort,
        buyStrike,
        sellStrike,
        actualGap,
        gapSteps: effectiveGapSteps,
        lotSize: stock.lotSize,
        buyAsk,
        buyBid,
        buyAskQty,
        buyBidQty,
        buyLtp,
        sellBid,
        sellAsk,
        sellBidQty,
        sellAskQty,
        sellLtp,
        executableNetEntry,
        executableTotalEntry,
        midNetEntry,
        conservativeLiquidation,
        slippageCost,
        combinedSpreadCost,
        buySpread,
        buySpreadPct,
        sellSpread,
        sellSpreadPct,
        maxProfitPerShare: payoffResult.maxProfitPerShare,
        maxProfitPerLot: payoffResult.maxProfitPerLot,
        maxProfitAtSpot: payoffResult.maxProfitAtSpot,
        maxLossPerShare: payoffResult.maxLossPerShare,
        maxLossPerLot: payoffResult.maxLossPerLot,
        isUnlimitedLoss: payoffResult.isUnlimitedLoss,
        breakevens: payoffResult.breakevens,
        breakevenDistPcts: payoffResult.breakevenDistPcts,
        currentMtmPerShare: 0,
        currentMtmPerLot: 0,
        buyIv: buyContract?.iv || null,
        sellIv: sellContract?.iv || null,
        netDelta,
        netGamma,
        netTheta,
        netVega,
        lotDelta: Math.round(netDelta * stock.lotSize * 100) / 100,
        lotTheta: Math.round(netTheta * stock.lotSize * 100) / 100,
        buyOi,
        sellOi,
        buyOiChange: buyOiChg,
        sellOiChange: sellOiChg,
        buyVolume: buyVol,
        sellVolume: sellVol,
        combinedOi: (buyOi || 0) + (sellOi || 0),
        combinedVolume: (buyVol || 0) + (sellVol || 0),
        legs
      });
    }

    return rows;
  }, [
    symbol,
    expiry,
    optionType,
    direction,
    ratioLong,
    ratioShort,
    gapMode,
    gapSteps,
    targetPriceGap,
    strikeRange,
    allListedStrikes,
    atmStrike,
    contracts,
    currentSpot,
    stock.lotSize,
    exchange
  ]);

  const filteredRows = useMemo(() => {
    return generatedStrategyRows.filter(row => {
      if (filter.netType === 'CREDIT_ONLY' && (row.executableNetEntry === null || row.executableNetEntry >= 0)) return false;
      if (filter.netType === 'DEBIT_ONLY' && (row.executableNetEntry === null || row.executableNetEntry <= 0)) return false;
      if (filter.minOi > 0 && (row.combinedOi ?? 0) < filter.minOi) return false;
      if (filter.minVolume > 0 && (row.combinedVolume ?? 0) < filter.minVolume) return false;
      if (filter.maxSpreadPct < 50 && row.buySpreadPct !== null && row.buySpreadPct > filter.maxSpreadPct) return false;
      if (filter.minMaxProfit > 0 && (row.maxProfitPerLot ?? 0) < filter.minMaxProfit) return false;
      if (row.netDelta !== null) {
        if (row.netDelta < filter.minDelta || row.netDelta > filter.maxDelta) return false;
      }
      if (filter.searchQuery.trim()) {
        const query = filter.searchQuery.toLowerCase();
        const text = `${row.buyStrike} ${row.sellStrike} ${row.ratioStr} ${row.actualGap}`.toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });
  }, [generatedStrategyRows, filter]);

  const sortedRows = useMemo(() => {
    const rowsCopy = [...filteredRows];
    rowsCopy.sort((a, b) => {
      let valA: number | null = 0;
      let valB: number | null = 0;

      switch (sortField) {
        case 'buyStrike': valA = a.buyStrike; valB = b.buyStrike; break;
        case 'netEntry': valA = a.executableNetEntry; valB = b.executableNetEntry; break;
        case 'maxProfit': valA = a.maxProfitPerLot; valB = b.maxProfitPerLot; break;
        case 'netDelta': valA = a.netDelta; valB = b.netDelta; break;
        case 'netTheta': valA = a.netTheta; valB = b.netTheta; break;
        case 'combinedOi': valA = a.combinedOi; valB = b.combinedOi; break;
        case 'combinedVolume': valA = a.combinedVolume; valB = b.combinedVolume; break;
      }

      if (valA === null) return 1;
      if (valB === null) return -1;
      return sortDirection === 'ASC' ? valA - valB : valB - valA;
    });
    return rowsCopy;
  }, [filteredRows, sortField, sortDirection]);

  // ROUTER CONTROLLER
  if (viewMode === 'LANDING') {
    return (
      <LandingPage
        onNavigateLogin={() => setViewMode('LOGIN')}
        onNavigateSignup={() => setViewMode('SIGNUP')}
        onNavigateTerms={() => setViewMode('TERMS')}
        onNavigatePrivacy={() => setViewMode('PRIVACY')}
      />
    );
  }

  if (viewMode === 'LOGIN') {
    return (
      <LoginPage
        onLoginSuccess={user => {
          setCurrentUser(user);
          setViewMode('APP');
        }}
        onNavigateSignup={() => setViewMode('SIGNUP')}
        onNavigateForgotPassword={() => setViewMode('FORGOT_PASSWORD')}
        onNavigateHome={() => setViewMode('LANDING')}
      />
    );
  }

  if (viewMode === 'SIGNUP') {
    return (
      <SignupPage
        onNavigateLogin={() => setViewMode('LOGIN')}
        onNavigateTerms={() => setViewMode('TERMS')}
        onNavigatePrivacy={() => setViewMode('PRIVACY')}
        onNavigateHome={() => setViewMode('LANDING')}
      />
    );
  }

  if (viewMode === 'FORGOT_PASSWORD') {
    return (
      <ForgotPasswordPage
        onNavigateLogin={() => setViewMode('LOGIN')}
        onNavigateHome={() => setViewMode('LANDING')}
      />
    );
  }

  if (viewMode === 'TERMS') {
    return <TermsPage onNavigateHome={() => setViewMode(currentUser ? 'APP' : 'LANDING')} />;
  }

  if (viewMode === 'PRIVACY') {
    return <PrivacyPage onNavigateHome={() => setViewMode(currentUser ? 'APP' : 'LANDING')} />;
  }

  // PROTECTED APPLICATION VIEW MODE
  if (!currentUser) {
    setViewMode('LOGIN');
    return null;
  }

  return (
    <div className={`bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors ${
      isFullscreen ? 'fixed inset-0 z-50 overflow-y-auto' : 'min-h-screen'
    }`}>
      {/* 1. TOP BAR WITH AUTHENTICATED USER DROPDOWN */}
      <HeaderBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        metrics={metrics}
        exchange={exchange}
        onSelectExchange={handleSelectExchange}
        onOpenAngelModal={() => setIsAngelModalOpen(true)}
        onOpenTestModal={() => setIsTestModalOpen(true)}
        onToggleStreaming={handleToggleStreaming}
        isStreaming={isStreaming}
        selectedStock={stock}
        onSelectStock={handleSelectStock}
        selectedExpiry={expiry}
        onSelectExpiry={setExpiry}
        ratioLong={ratioLong}
        ratioShort={ratioShort}
        onSelectRatio={(l, s) => {
          setRatioLong(l);
          setRatioShort(s);
        }}
        isFocusMode={isFocusMode}
        onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        currentUser={currentUser}
        onOpenSettings={() => {
          setShowSettingsOverlay(true);
          setShowAdminOverlay(false);
        }}
        onOpenAdmin={() => {
          setShowAdminOverlay(true);
          setShowSettingsOverlay(false);
        }}
        onLogout={handleLogout}
      />

      {/* Settings Overlay Drawer */}
      {showSettingsOverlay && (
        <SettingsPage
          user={currentUser}
          onLogout={handleLogout}
          onClose={() => setShowSettingsOverlay(false)}
        />
      )}

      {/* Admin Panel Overlay Drawer */}
      {showAdminOverlay && (
        <AdminPage
          currentUser={currentUser}
          onClose={() => setShowAdminOverlay(false)}
        />
      )}

      {/* 2. MARKET SNAPSHOT STRIP */}
      {!isFocusMode && !showSettingsOverlay && !showAdminOverlay && (
        <MarketSnapshotStrip
          symbol={symbol}
          exchange={exchange}
          summary={stockSummary}
          metrics={metrics}
          onRefreshLive={() => marketDataFeed.forceRefreshLiveQuotes()}
        />
      )}

      {/* Dynamic Stock Switch Toast Notification */}
      {stockSwitchToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900 text-white text-xs font-mono rounded-lg shadow-2xl flex items-center gap-2 border border-emerald-500 animate-in fade-in slide-in-from-bottom-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
          <span>{stockSwitchToast}</span>
        </div>
      )}

      {/* 3. MAIN WORKSPACE */}
      <main className="flex-1 flex flex-col">
        {/* VIEW 1: RATIO MATRIX SPREADSHEET */}
        {activeTab === 'MATRIX' && !showSettingsOverlay && !showAdminOverlay && (
          <div className="flex flex-col flex-1">
            <StrategyControlBar
              stock={stock}
              optionType={optionType}
              onChangeOptionType={setOptionType}
              direction={direction}
              onChangeDirection={setDirection}
              ratioLong={ratioLong}
              ratioShort={ratioShort}
              onChangeRatio={(l, s) => {
                setRatioLong(l);
                setRatioShort(s);
              }}
              gap={gap}
              onChangeGap={setGap}
              cnt={cnt}
              onChangeCnt={setCnt}
              stk={stk}
              onChangeStk={setStk}
              minStrike={minStrike}
              onChangeMinStrike={setMinStrike}
              maxStrike={maxStrike}
              onChangeMaxStrike={setMaxStrike}
              allStrikes={allListedStrikes}
              referenceMode={referenceMode}
              onChangeReferenceMode={setReferenceMode}
              atmStrike={atmStrike}
              density={density}
              onChangeDensity={setDensity}
              showAdvancedData={showAdvancedData}
              onToggleAdvancedData={() => setShowAdvancedData(!showAdvancedData)}
              onReset={handleResetStockConfig}
              onSavePreset={handleSavePreset}
              savedPresets={savedPresets}
              onLoadPreset={handleLoadPreset}
            />

            <RatioMatrixSpreadsheet
              stock={stock}
              expiry={expiry}
              optionType={optionType}
              onChangeOptionType={setOptionType}
              ratioLong={ratioLong}
              ratioShort={ratioShort}
              gap={gap}
              onChangeGap={setGap}
              cnt={cnt}
              onChangeCnt={setCnt}
              stk={stk}
              onChangeStk={setStk}
              minStrike={minStrike}
              onChangeMinStrike={setMinStrike}
              maxStrike={maxStrike}
              onChangeMaxStrike={setMaxStrike}
              allStrikes={allListedStrikes}
              currentSpot={currentSpot}
              contracts={contracts}
              onSelectStrategy={setSelectedStrategyRow}
              selectedStrategyId={selectedStrategyRow?.id}
              onReset={handleResetStockConfig}
              onSavePreset={handleSavePreset}
              savedPresets={savedPresets}
              onLoadPreset={handleLoadPreset}
              exchange={exchange}
              density={density}
              showAdvancedData={showAdvancedData}
            />

            {selectedStrategyRow && (
              <SelectedStrategyPanel
                strategy={selectedStrategyRow}
                onClose={() => setSelectedStrategyRow(null)}
                currentSpot={currentSpot}
              />
            )}
          </div>
        )}

        {/* VIEW 2: SPREAD SCANNER */}
        {activeTab === 'SCANNER' && !showSettingsOverlay && !showAdminOverlay && (
          <>
            <ControlsPanel
              selectedStock={stock}
              onSelectStock={handleSelectStock}
              selectedExpiry={expiry}
              onSelectExpiry={setExpiry}
              optionType={optionType}
              onChangeOptionType={setOptionType}
              direction={direction}
              onChangeDirection={setDirection}
              ratioLong={ratioLong}
              ratioShort={ratioShort}
              onChangeRatio={(l, s) => {
                setRatioLong(l);
                setRatioShort(s);
              }}
              gapMode={gapMode}
              onChangeGapMode={setGapMode}
              gapSteps={gapSteps}
              onChangeGapSteps={setGapSteps}
              targetPriceGap={targetPriceGap}
              onChangeTargetPriceGap={setTargetPriceGap}
              strikeRange={strikeRange}
              onChangeStrikeRange={setStrikeRange}
              referenceMode={referenceMode}
              onChangeReferenceMode={setReferenceMode}
              atmStrike={atmStrike}
              pricingMode={pricingMode}
              onChangePricingMode={setPricingMode}
              availableStrikesCount={availableStrikesCount}
            />

            <FilterToolbar
              filter={filter}
              onChangeFilter={setFilter}
              sortField={sortField}
              onChangeSortField={setSortField}
              sortDirection={sortDirection}
              onToggleSortDirection={() => setSortDirection(d => (d === 'ASC' ? 'DESC' : 'ASC'))}
              totalCount={generatedStrategyRows.length}
              filteredCount={sortedRows.length}
            />

            <RatioSpreadGrid
              rows={sortedRows}
              onSelectRow={setSelectedStrategyRow}
              selectedRowId={selectedStrategyRow?.id}
              currentSpot={currentSpot}
              lotSize={stock.lotSize}
            />
          </>
        )}

        {/* VIEW 3: OPTION CHAIN DUAL VIEW */}
        {activeTab === 'OPTION_CHAIN' && !showSettingsOverlay && !showAdminOverlay && (
          <OptionChainDualView
            contracts={contracts}
            strikes={allListedStrikes}
            currentSpot={currentSpot}
            selectedSymbol={symbol}
            selectedExpiry={expiry}
            activeBuyStrike={selectedStrategyRow?.buyStrike}
            activeSellStrike={selectedStrategyRow?.sellStrike}
            onSelectStrike={() => {
              setActiveTab('MATRIX');
            }}
            exchange={exchange}
          />
        )}

        {/* VIEW 4: ALL RATIOS COMPARATIVE SCANNER */}
        {activeTab === 'ALL_RATIOS' && !showSettingsOverlay && !showAdminOverlay && (
          <AllRatiosScanner
            stock={stock}
            expiry={expiry}
            optionType={optionType}
            contracts={contracts}
            allStrikes={allListedStrikes}
            currentSpot={currentSpot}
            onSelectStrategy={setSelectedStrategyRow}
            exchange={exchange}
          />
        )}
      </main>

      {/* FOOTER STATUS BAR */}
      {!isFocusMode && !showSettingsOverlay && !showAdminOverlay && (
        <StatusBar
          metrics={metrics}
          stock={stock}
          currentSpot={currentSpot}
          summary={stockSummary}
          expiry={expiry}
          stk={stk}
          exchange={exchange}
        />
      )}

      {/* Angel One SmartAPI Feed Settings Modal */}
      <AngelOneModal
        isOpen={isAngelModalOpen}
        onClose={() => setIsAngelModalOpen(false)}
        metrics={metrics}
      />

      {/* Verification Unit Test Suite Modal */}
      <UnitTestsModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
      />
    </div>
  );
}
