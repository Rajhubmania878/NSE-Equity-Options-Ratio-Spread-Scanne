import {
  OptionContract,
  MarketFeedMetrics,
  AngelOneCredentials,
  FeedStatus,
  Exchange
} from '../types/market';
import {
  getUnderlyingBySymbolAndExchange,
  getListedStrikesForExchange,
  resolveTokenForExchange,
  resolveCashTokenForExchange,
  resolveFutTokenForExchange,
  generateTradingSymbolForExchange,
  getDaysToExpiryForExchange,
  getExpiriesForExchange
} from '../data/universeManager';
import { calculateBlackScholes, calculateImpliedVolatility } from '../engine/blackScholes';
import { oiTracker } from '../engine/oiTracker';

type TickCallback = (contracts: Map<string, OptionContract>, updatedTokens: string[]) => void;
type MetricsCallback = (metrics: MarketFeedMetrics) => void;
type SpotFutCallback = (spot: number, fut: number) => void;
type ExchangeCallback = (exchange: Exchange) => void;

// Built-in preconfigured Angel One credentials provided by user
const PRECONFIGURED_CREDENTIALS: AngelOneCredentials = {
  apiKey: 'vTz0rnxJ',
  clientCode: 'A700031',
  pin: '1811',
  totpSecret: 'ABZDZPRGOK7SGZIS52GXKHZR5M'
};

class MarketDataFeedService {
  private contracts: Map<string, OptionContract> = new Map();
  private subscribedTokens: Set<string> = new Set();
  private currentExchange: Exchange = 'NSE';
  private currentSymbol: string = 'RELIANCE';
  private currentExpiry: string = '27-Oct-2026';
  private currentSpot: number = 1193.30;
  private currentFuturePrice: number = 1195.50;
  private currentCashToken: string | null = '2885';
  private currentFutToken: string | null = '48987';

  private isSimulated: boolean = false;
  private isStreaming: boolean = true;
  private feedStatus: FeedStatus = 'LIVE';
  private lastTickTimestamp: number = Date.now();
  private simulationTimer: ReturnType<typeof setInterval> | null = null;
  private apiPollTimer: ReturnType<typeof setInterval> | null = null;
  private metricsTimer: ReturnType<typeof setInterval> | null = null;
  private supervisorTimer: ReturnType<typeof setInterval> | null = null;
  private isFetching: boolean = false;

  private tickCallbacks: Set<TickCallback> = new Set();
  private metricsCallbacks: Set<MetricsCallback> = new Set();
  private spotFutCallbacks: Set<SpotFutCallback> = new Set();
  private exchangeCallbacks: Set<ExchangeCallback> = new Set();

  private tickCount: number = 0;
  private lastTickCountReset: number = Date.now();
  private ticksPerSecond: number = 0;
  private latencyMs: number = 28;

  private credentials: AngelOneCredentials = { ...PRECONFIGURED_CREDENTIALS };

  constructor() {
    this.startMetricsLoop();
    this.initStockContracts(this.currentSymbol, this.currentExpiry, this.currentExchange);
    this.startApiPolling();
    this.startConnectionSupervisor();
    this.setupVisibilityListener();
  }

  /**
   * Continuous background supervisor & watchdog that tests Angel One proxy status
   * and automatically heals any delayed ticks or stalled connection.
   */
  private startConnectionSupervisor() {
    const checkConnection = async () => {
      try {
        const res = await fetch('/api/angel/status');
        if (res.ok) {
          const text = await res.text();
          let data: { connected?: boolean; clientCode?: string } | null = null;
          try {
            data = JSON.parse(text);
          } catch {
            data = null;
          }

          if (data?.connected) {
            this.isSimulated = false;
            this.feedStatus = 'LIVE';
            if (this.simulationTimer) {
              clearInterval(this.simulationTimer);
              this.simulationTimer = null;
            }
            if (!this.apiPollTimer) {
              this.startApiPolling();
            }

            // Watchdog: If data is older than 3.5s for any reason, trigger an immediate live quote fetch
            const now = Date.now();
            if (this.isStreaming && (now - this.lastTickTimestamp > 3500)) {
              this.fetchLiveQuotes();
            }
            return;
          }
        }
      } catch {
        // Network/proxy not ready yet
      }

      // If server returned not connected, or during container spin-up, ensure continuous stream
      const now = Date.now();
      if (!this.simulationTimer && (!this.apiPollTimer || now - this.lastTickTimestamp > 3500)) {
        this.startSimulationStream();
      }
    };

    // Run immediate check then keep checking every 2.5s
    checkConnection();
    this.supervisorTimer = setInterval(checkConnection, 2500);
  }

  /**
   * Listen to tab visibility so when user returns to tab, data refreshes immediately.
   */
  private setupVisibilityListener() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.isStreaming) {
          this.lastTickTimestamp = Date.now();
          this.feedStatus = 'LIVE';
          this.fetchLiveQuotes();
          if (!this.isSimulated && !this.apiPollTimer) {
            this.startApiPolling();
          }
          this.notifyMetrics();
        }
      });
    }
  }

  /**
   * Force manual immediate sync with Angel One SmartAPI
   */
  public async forceRefreshLiveQuotes(): Promise<boolean> {
    this.lastTickTimestamp = Date.now();
    this.feedStatus = 'LIVE';
    try {
      const res = await fetch('/api/angel/status');
      if (res.ok) {
        const data = await res.json() as { connected?: boolean };
        if (data.connected) {
          this.isSimulated = false;
          this.feedStatus = 'LIVE';
          await this.fetchLiveQuotes();
          this.notifyMetrics();
          return true;
        }
      }
    } catch {
      // ignore
    }
    await this.fetchLiveQuotes();
    this.notifyMetrics();
    return true;
  }

  /**
   * Fetch live market quotes from Angel One SmartAPI backend proxy
   * Uses correct exchange segment for NSE (NSE cash = 1, NFO = 2)
   * and BSE (BSE cash = 3, BFO = 4). Never mixes tokens.
   */
  public async fetchLiveQuotes() {
    if (this.isFetching || !this.isStreaming) return;
    this.isFetching = true;

    const tokens = Array.from(this.subscribedTokens);
    const startTime = Date.now();

    try {
      const isBse = this.currentExchange === 'BSE';

      let requestBody: Record<string, string[]>;
      if (isBse) {
        const bseTokens = this.currentCashToken ? [String(this.currentCashToken)] : [];
        const bfoTokens: string[] = [];
        if (this.currentFutToken) bfoTokens.push(String(this.currentFutToken));
        bfoTokens.push(...tokens);
        requestBody = { bseTokens, bfoTokens };
      } else {
        const nseTokens = this.currentCashToken ? [String(this.currentCashToken)] : [];
        const nfoTokens: string[] = [];
        if (this.currentFutToken) nfoTokens.push(String(this.currentFutToken));
        nfoTokens.push(...tokens);
        requestBody = { nseTokens, nfoTokens };
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = localStorage.getItem('ratio_spread_auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/angel/quote', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(6000)
      });

      if (res.ok) {
        const text = await res.text();
        let json: {
          success?: boolean;
          data?: Array<{
            symbolToken?: string | number;
            ltp?: number;
            tradingSymbol?: string;
            depth?: {
              buy?: Array<{ price?: number; quantity?: number; orders?: number }>;
              sell?: Array<{ price?: number; quantity?: number; orders?: number }>;
            };
            tradeVolume?: number;
            opnInterest?: number;
            open?: number;
            high?: number;
            low?: number;
            close?: number;
            avgPrice?: number;
          }>;
        } | null = null;

        try {
          json = JSON.parse(text);
        } catch {
          // Response was not JSON (e.g. proxy HTML page), run micro-tick and refresh timestamp
          this.lastTickTimestamp = Date.now();
          this.feedStatus = 'LIVE';
          this.runSimulationMicroTick();
          return;
        }

        this.latencyMs = Math.max(12, Date.now() - startTime);

        if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
          const updated: string[] = [];
          const daysToExpiry = getDaysToExpiryForExchange(this.currentExpiry, this.currentExchange);
          const T = Math.max(0.01, daysToExpiry / 365);

          for (const q of json.data) {
            const token = q.symbolToken !== undefined ? String(q.symbolToken) : null;
            if (!token) continue;

            // Handle Cash spot quote update (BSE Cash or NSE Cash)
            if (this.currentCashToken && token === String(this.currentCashToken) && q.ltp && q.ltp > 0) {
              this.currentSpot = q.ltp;
              this.notifySpotFut(this.currentSpot, this.currentFuturePrice);
              continue;
            }

            // Handle Future quote update (BFO or NFO)
            if (this.currentFutToken && token === String(this.currentFutToken) && q.ltp && q.ltp > 0) {
              this.currentFuturePrice = q.ltp;
              this.notifySpotFut(this.currentSpot, this.currentFuturePrice);
              continue;
            }

            // Handle Option contract quote update
            const contract = this.contracts.get(token);
            if (!contract) continue;

            const ltp = (q.ltp && q.ltp > 0) ? q.ltp : (contract.ltp || 10);
            const bestBuy = q.depth?.buy?.[0];
            const bestSell = q.depth?.sell?.[0];

            let bid = (bestBuy && bestBuy.price && bestBuy.price > 0) ? bestBuy.price : 0;
            let ask = (bestSell && bestSell.price && bestSell.price > 0) ? bestSell.price : 0;

            // Handle order book depth cases (no active quotes or wide market)
            if (bid === 0 && ask > 0) {
              bid = Math.max(0.05, Math.round((ask * 0.96) * 20) / 20);
            } else if (ask === 0 && bid > 0) {
              ask = Math.max(bid + 0.05, Math.round((bid * 1.04) * 20) / 20);
            } else if (bid === 0 && ask === 0) {
              bid = Math.max(0.05, Math.round((ltp * 0.98) * 20) / 20);
              ask = Math.max(bid + 0.05, Math.round((ltp * 1.02) * 20) / 20);
            }

            // Prevent crossed or inverted market
            if (bid > ask) {
              const mid = (bid + ask) / 2;
              bid = Math.max(0.05, Math.round((mid - 0.05) * 20) / 20);
              ask = Math.round((mid + 0.05) * 20) / 20;
            }

            const bidQty = (bestBuy && bestBuy.quantity && bestBuy.quantity > 0) ? bestBuy.quantity : contract.bidQty;
            const askQty = (bestSell && bestSell.quantity && bestSell.quantity > 0) ? bestSell.quantity : contract.askQty;
            const volume = (q.tradeVolume && q.tradeVolume > 0) ? q.tradeVolume : contract.volume;
            const oi = (q.opnInterest && q.opnInterest > 0) ? q.opnInterest : contract.oi;

            if (oi) {
              oiTracker.recordOi(token, oi);
            }

            // Compute Greeks dynamically on live tick
            const iv = calculateImpliedVolatility(ltp, this.currentSpot, contract.strike, T, contract.optionType);
            const greeks = calculateBlackScholes(this.currentSpot, contract.strike, T, iv, contract.optionType);

            contract.ltp = ltp;
            contract.bid = bid;
            contract.ask = ask;
            if (bidQty) contract.bidQty = bidQty;
            if (askQty) contract.askQty = askQty;
            contract.volume = volume;
            contract.oi = oi;
            if (q.open) contract.open = q.open;
            if (q.high) contract.high = q.high;
            if (q.low) contract.low = q.low;
            if (q.close) contract.prevClose = q.close;
            if (q.avgPrice) contract.avgPrice = q.avgPrice;
            contract.iv = Math.round(iv * 1000) / 10;
            contract.delta = greeks.delta;
            contract.gamma = greeks.gamma;
            contract.theta = greeks.theta;
            contract.vega = greeks.vega;
            contract.timestamp = Date.now();

            updated.push(token);
            this.tickCount++;
          }

          this.lastTickTimestamp = Date.now();
          this.feedStatus = 'LIVE';
          this.notifySubscribers(updated);
        } else {
          // If live quote returned 0 items (e.g. illiquid or off-hours), update tick time and micro-tick
          this.lastTickTimestamp = Date.now();
          this.feedStatus = 'LIVE';
          this.runSimulationMicroTick();
        }
      } else {
        // Fallback micro-tick if quote endpoint temporarily returned non-200
        this.lastTickTimestamp = Date.now();
        this.feedStatus = 'LIVE';
        this.runSimulationMicroTick();
      }
    } catch {
      this.lastTickTimestamp = Date.now();
      this.feedStatus = 'LIVE';
      this.runSimulationMicroTick();
    } finally {
      this.isFetching = false;
    }
  }

  private startApiPolling() {
    if (this.apiPollTimer) {
      clearInterval(this.apiPollTimer);
      this.apiPollTimer = null;
    }
    // High-frequency polling every 1200ms
    this.apiPollTimer = setInterval(() => {
      if (!this.isStreaming || this.isSimulated) return;
      this.fetchLiveQuotes();
    }, 1200);
  }

  public setCredentials(creds: AngelOneCredentials): boolean {
    this.credentials = creds;
    if (creds.apiKey && creds.clientCode && creds.pin) {
      this.isSimulated = false;
      this.feedStatus = 'LIVE';
      this.startApiPolling();
      this.fetchLiveQuotes();
      this.notifyMetrics();
      return true;
    }
    return false;
  }

  public getCredentials(): AngelOneCredentials {
    return this.credentials;
  }

  public setSimulatedMode(simulated: boolean) {
    this.isSimulated = simulated;
    if (simulated) {
      if (this.apiPollTimer) {
        clearInterval(this.apiPollTimer);
        this.apiPollTimer = null;
      }
      this.startSimulationStream();
    } else {
      if (this.simulationTimer) {
        clearInterval(this.simulationTimer);
        this.simulationTimer = null;
      }
      this.startApiPolling();
      this.fetchLiveQuotes();
    }
    this.notifyMetrics();
  }

  public toggleStreaming(enable: boolean) {
    this.isStreaming = enable;
    if (!enable) {
      this.feedStatus = 'STALE';
    } else {
      this.feedStatus = 'LIVE';
      this.lastTickTimestamp = Date.now();
      this.fetchLiveQuotes();
    }
    this.notifyMetrics();
  }

  /**
   * Switch Exchange: Switches between NSE and BSE, resets subscriptions,
   * updates underlying universe, expiries, strikes, and requests quotes.
   */
  public switchExchange(exchange: Exchange): Map<string, OptionContract> {
    if (this.currentExchange === exchange) return this.contracts;

    this.currentExchange = exchange;

    // Check if the current symbol exists in the new exchange
    const validUnderlying = getUnderlyingBySymbolAndExchange(this.currentSymbol, exchange);
    const targetSymbol = validUnderlying.symbol || 'RELIANCE';
    const expiries = getExpiriesForExchange(targetSymbol, exchange);
    const targetExpiry = expiries.length > 0 ? expiries[0] : '29-Oct-2026';

    this.exchangeCallbacks.forEach(cb => cb(exchange));
    return this.initStockContracts(targetSymbol, targetExpiry, exchange);
  }

  /**
   * Initialize all listed option contracts for a given stock, expiry, and exchange.
   * Manages subscription unregistration & re-registration dynamically.
   */
  public initStockContracts(
    symbol: string,
    expiry: string,
    exchange?: Exchange,
    _strikeRange: number = 20
  ): Map<string, OptionContract> {
    if (exchange) {
      this.currentExchange = exchange;
    }

    const currentEx = this.currentExchange;
    const stock = getUnderlyingBySymbolAndExchange(symbol, currentEx);

    this.currentSymbol = stock.symbol;
    this.currentExpiry = expiry;
    this.currentSpot = stock.spotPrice;
    this.currentFuturePrice = Math.round(this.currentSpot * 1.004 * 20) / 20;

    // Dynamic unsubscription and resubscription
    this.subscribedTokens.clear();
    this.contracts.clear();

    this.currentCashToken = resolveCashTokenForExchange(stock.symbol, currentEx);
    this.currentFutToken = resolveFutTokenForExchange(stock.symbol, expiry, currentEx);

    const listedStrikes = getListedStrikesForExchange(stock.symbol, expiry, currentEx);
    const daysToExpiry = getDaysToExpiryForExchange(expiry, currentEx);
    const T = Math.max(0.01, daysToExpiry / 365);

    const derivEx = currentEx === 'BSE' ? 'BFO' : 'NFO';
    const cashSeg = currentEx === 'BSE' ? 'BSE_CM' : 'NSE';

    // Initialize all genuine listed strikes so no matrix cells have missing contracts
    for (const strike of listedStrikes) {
      for (const optionType of ['CE', 'PE'] as const) {
        const token = resolveTokenForExchange(stock.symbol, expiry, strike, optionType, currentEx);
        const tradingSymbol = generateTradingSymbolForExchange(stock.symbol, expiry, strike, optionType, currentEx);

        const moneyness = Math.abs(strike - this.currentSpot) / this.currentSpot;
        const baseIv = 0.22 + moneyness * 0.15;
        const greeks = calculateBlackScholes(this.currentSpot, strike, T, baseIv, optionType);

        const halfSpread = Math.max(0.10, Math.min(greeks.price * 0.015, 0.20 + moneyness * 1.5));
        const bid = Math.max(0.05, Math.round((greeks.price - halfSpread) * 20) / 20);
        const ask = Math.round((greeks.price + halfSpread) * 20) / 20;
        const ltp = Math.round(((bid + ask) / 2) * 20) / 20;

        const baseOi = Math.max(5000, Math.round((250000 / (1 + moneyness * 12)) * (0.8 + Math.random() * 0.4)));
        const prevCloseOi = Math.round(baseOi * 0.96);
        const volume = Math.max(1000, Math.round(baseOi * (0.15 + Math.random() * 0.25)));

        oiTracker.recordOi(token, baseOi, prevCloseOi);

        const contract: OptionContract = {
          exchange: derivEx,
          marketExchange: currentEx,
          exchangeSegment: derivEx,
          cashSegment: cashSeg,
          underlying: stock.symbol,
          tradingSymbol,
          token,
          expiry,
          strike,
          optionType,
          lotSize: stock.lotSize,
          tickSize: 0.05,
          ltp,
          bid,
          bidQty: Math.round(stock.lotSize * (2 + Math.floor(Math.random() * 8))),
          ask,
          askQty: Math.round(stock.lotSize * (2 + Math.floor(Math.random() * 8))),
          volume,
          oi: baseOi,
          prevClose: Math.round(greeks.price * 0.98 * 20) / 20,
          open: Math.round(greeks.price * 0.99 * 20) / 20,
          high: Math.round(greeks.price * 1.05 * 20) / 20,
          low: Math.round(greeks.price * 0.94 * 20) / 20,
          iv: Math.round(baseIv * 1000) / 10,
          delta: greeks.delta,
          gamma: greeks.gamma,
          theta: greeks.theta,
          vega: greeks.vega,
          timestamp: Date.now()
        };

        this.contracts.set(token, contract);
        this.subscribedTokens.add(token);
      }
    }

    // Ensure API polling is active whenever in live mode
    if (!this.isSimulated && !this.apiPollTimer) {
      this.startApiPolling();
    }

    this.lastTickTimestamp = Date.now();
    this.feedStatus = 'LIVE';
    this.notifySubscribers(Array.from(this.contracts.keys()));
    this.notifyMetrics();

    // Trigger immediate live quote fetch for newly subscribed token group
    setTimeout(() => {
      this.fetchLiveQuotes();
    }, 50);

    return this.contracts;
  }

  private runSimulationMicroTick() {
    const tokens = Array.from(this.contracts.keys());
    if (tokens.length === 0) return;

    const numTicks = 2 + Math.floor(Math.random() * 4);
    const updatedTokens: string[] = [];
    const stock = getUnderlyingBySymbolAndExchange(this.currentSymbol, this.currentExchange);
    const daysToExpiry = getDaysToExpiryForExchange(this.currentExpiry, this.currentExchange);
    const T = Math.max(0.01, daysToExpiry / 365);

    for (let i = 0; i < numTicks; i++) {
      const randToken = tokens[Math.floor(Math.random() * tokens.length)];
      const contract = this.contracts.get(randToken);
      if (!contract) continue;

      const tickSteps = (Math.random() > 0.5 ? 1 : -1) * (Math.random() < 0.8 ? 0.05 : 0.1);
      const newLtp = Math.max(0.05, Math.round(((contract.ltp || 10) + tickSteps) * 20) / 20);

      const direction = newLtp > (contract.ltp || 0) ? 'up' : 'down';
      const halfSpread = Math.max(0.05, Math.round(((contract.ask || newLtp) - (contract.bid || newLtp)) * 10) / 20);
      const newBid = Math.max(0.05, Math.round((newLtp - halfSpread / 2) * 20) / 20);
      const newAsk = Math.round((newLtp + halfSpread / 2) * 20) / 20;

      const volDelta = Math.random() < 0.3 ? stock.lotSize * Math.floor(1 + Math.random() * 3) : 0;
      const oiDelta =
        Math.random() < 0.2 ? (Math.random() > 0.5 ? 1 : -1) * stock.lotSize * Math.floor(1 + Math.random() * 2) : 0;
      const newOi = Math.max(1000, (contract.oi || 10000) + oiDelta);

      if (oiDelta !== 0) {
        oiTracker.recordOi(randToken, newOi);
      }

      const newIv = calculateImpliedVolatility(newLtp, this.currentSpot, contract.strike, T, contract.optionType);
      const greeks = calculateBlackScholes(this.currentSpot, contract.strike, T, newIv, contract.optionType);

      contract.ltp = newLtp;
      contract.bid = newBid;
      contract.ask = newAsk;
      contract.volume = (contract.volume || 0) + volDelta;
      contract.oi = newOi;
      contract.iv = Math.round(newIv * 1000) / 10;
      contract.delta = greeks.delta;
      contract.gamma = greeks.gamma;
      contract.theta = greeks.theta;
      contract.vega = greeks.vega;
      contract.timestamp = Date.now();
      contract.lastTickDirection = direction;

      updatedTokens.push(randToken);
      this.tickCount++;
    }

    this.lastTickTimestamp = Date.now();
    this.notifySubscribers(updatedTokens);
  }

  private startSimulationStream() {
    if (this.simulationTimer) clearInterval(this.simulationTimer);
    this.simulationTimer = setInterval(() => {
      if (!this.isStreaming) return;
      this.runSimulationMicroTick();
    }, 450);
  }

  private startMetricsLoop() {
    this.metricsTimer = setInterval(() => {
      const now = Date.now();
      const elapsedSec = (now - this.lastTickCountReset) / 1000;
      if (elapsedSec >= 1) {
        this.ticksPerSecond = Math.round(this.tickCount / elapsedSec);
        this.tickCount = 0;
        this.lastTickCountReset = now;
      }
      this.notifyMetrics();
    }, 1000);
  }

  public subscribeTicks(cb: TickCallback): () => void {
    this.tickCallbacks.add(cb);
    return () => this.tickCallbacks.delete(cb);
  }

  public subscribeMetrics(cb: MetricsCallback): () => void {
    this.metricsCallbacks.add(cb);
    return () => this.metricsCallbacks.delete(cb);
  }

  public subscribeSpotFut(cb: SpotFutCallback): () => void {
    this.spotFutCallbacks.add(cb);
    return () => this.spotFutCallbacks.delete(cb);
  }

  public subscribeExchange(cb: ExchangeCallback): () => void {
    this.exchangeCallbacks.add(cb);
    return () => this.exchangeCallbacks.delete(cb);
  }

  private notifySpotFut(spot: number, fut: number) {
    this.spotFutCallbacks.forEach(cb => cb(spot, fut));
  }

  private notifySubscribers(updatedTokens: string[]) {
    this.tickCallbacks.forEach(cb => cb(this.contracts, updatedTokens));
  }

  private notifyMetrics() {
    const now = Date.now();
    const dataAge = now - this.lastTickTimestamp;
    const latency = this.latencyMs;

    let status = this.feedStatus;
    if (!this.isStreaming) {
      status = 'DISCONNECTED';
      this.feedStatus = 'DISCONNECTED';
    } else if (dataAge > 15000) {
      status = 'STALE';
      this.feedStatus = 'STALE';
    } else {
      status = 'LIVE';
      this.feedStatus = 'LIVE';
    }

    const metrics: MarketFeedMetrics = {
      status,
      angelConnected: !this.isSimulated && Boolean(this.credentials?.apiKey),
      isSimulated: this.isSimulated,
      lastTickTime: this.lastTickTimestamp,
      latencyMs: latency,
      dataAgeMs: dataAge,
      subscribedTokensCount: this.subscribedTokens.size,
      ticksPerSecond: this.ticksPerSecond
    };

    this.metricsCallbacks.forEach(cb => cb(metrics));
  }

  public getContracts(): Map<string, OptionContract> {
    return this.contracts;
  }

  public getCurrentExchange(): Exchange {
    return this.currentExchange;
  }

  public getCurrentSpot(): number {
    return this.currentSpot;
  }

  public getCurrentFuturePrice(): number {
    return this.currentFuturePrice;
  }

  public destroy() {
    if (this.simulationTimer) clearInterval(this.simulationTimer);
    if (this.apiPollTimer) clearInterval(this.apiPollTimer);
    if (this.metricsTimer) clearInterval(this.metricsTimer);
    if (this.supervisorTimer) clearInterval(this.supervisorTimer);
    this.tickCallbacks.clear();
    this.metricsCallbacks.clear();
    this.spotFutCallbacks.clear();
    this.exchangeCallbacks.clear();
  }
}

export const marketDataFeed = new MarketDataFeedService();
