/**
 * Market Data & Strategy Types for NSE & BSE Equity Options Ratio Spread Scanner
 */

export type Exchange = 'NSE' | 'BSE';
export type MarketSegment = 'NSE' | 'NFO' | 'BSE' | 'BSE_CM' | 'BFO';
export type OptionType = 'CE' | 'PE';
export type LegSide = 'BUY' | 'SELL';
export type GapMode = 'STRIKE_STEPS' | 'PRICE_GAP';
export type ReferenceStrikeMode = 'ATM' | 'ATM_OFFSET' | 'CUSTOM';
export type DirectionMode = 'NORMAL' | 'REVERSE';
export type OiReferenceMode = 'PREV_TICK' | 'ONE_MIN' | 'FIVE_MIN' | 'MARKET_OPEN' | 'PREV_CLOSE';
export type FeedStatus = 'LIVE' | 'STALE' | 'DISCONNECTED' | 'RECONNECTING';

export interface UnderlyingStock {
  symbol: string;
  name: string;
  sector: string;
  lotSize: number;
  spotPrice: number;
  strikeStep: number;
  expiries: string[];
  exchange?: Exchange;
  exchangeSegment?: MarketSegment;
  cashToken?: string | null;
  hasOptions?: boolean;
}

export interface BseCashStock {
  symbol: string;
  name: string;
  token: string;
  lotSize: number;
  exchange: 'BSE';
  exchangeSegment: 'BSE_CM';
  hasOptions?: boolean;
}

export interface OptionContract {
  exchange: 'NFO' | 'BFO';
  marketExchange?: Exchange;
  exchangeSegment?: 'NFO' | 'BFO';
  cashSegment?: 'NSE' | 'BSE_CM';
  underlying: string;
  tradingSymbol: string;
  token: string;
  expiry: string;
  strike: number;
  optionType: OptionType;
  lotSize: number;
  tickSize: number;

  ltp: number | null;
  bid: number | null;
  bidQty: number | null;
  ask: number | null;
  askQty: number | null;
  volume: number | null;
  oi: number | null;
  oiChange?: number | null;
  prevClose: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  avgPrice?: number | null;

  iv: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;

  timestamp: number;
  lastTickDirection?: 'up' | 'down';
}

export interface StrategyLeg {
  side: LegSide;
  optionType: OptionType;
  strike: number;
  quantity: number; // Ratio quantity multiplier (e.g. 1 or 3)
  actualQuantity: number; // quantity * lotSize
  contract: OptionContract;
  executionPrice: number | null; // Ask for BUY, Bid for SELL
}

export interface RatioStrategyRow {
  id: string; // e.g. "RELIANCE|29-Oct-2026|CE|2900|2940|1|3"
  underlying: string;
  expiry: string;
  optionType: OptionType;
  direction: DirectionMode;
  ratioStr: string; // e.g. "1:3"
  longQty: number;
  shortQty: number;
  buyStrike: number;
  sellStrike: number;
  actualGap: number; // in ₹
  gapSteps: number; // in listed strike steps
  targetGapRupees?: number;
  lotSize: number;

  // Pricing
  buyAsk: number | null;
  buyBid: number | null;
  buyAskQty: number | null;
  buyBidQty: number | null;
  buyLtp: number | null;

  sellBid: number | null;
  sellAsk: number | null;
  sellBidQty: number | null;
  sellAskQty: number | null;
  sellLtp: number | null;

  executableNetEntry: number | null; // per share: positive = Net Debit, negative = Net Credit
  executableTotalEntry: number | null; // per lot = executableNetEntry * lotSize
  midNetEntry: number | null; // per share using mid prices
  conservativeLiquidation: number | null; // per share
  slippageCost: number | null; // difference between executable and mid
  combinedSpreadCost: number | null;

  buySpread: number | null;
  buySpreadPct: number | null;
  sellSpread: number | null;
  sellSpreadPct: number | null;

  // Payoff & Risk
  maxProfitPerShare: number | null;
  maxProfitPerLot: number | null;
  maxProfitAtSpot: number | null;
  maxLossPerShare: number | 'Unlimited';
  maxLossPerLot: number | 'Unlimited';
  isUnlimitedLoss: boolean;
  breakevens: number[];
  breakevenDistPcts: number[];
  currentMtmPerShare: number | null;
  currentMtmPerLot: number | null;

  // Greeks & IV
  buyIv: number | null;
  sellIv: number | null;
  netDelta: number | null; // per share
  netGamma: number | null;
  netTheta: number | null;
  netVega: number | null;
  lotDelta: number | null; // netDelta * lotSize
  lotTheta: number | null; // netTheta * lotSize

  // Liquidity
  buyOi: number | null;
  sellOi: number | null;
  buyOiChange: number | null;
  sellOiChange: number | null;
  buyVolume: number | null;
  sellVolume: number | null;
  combinedOi: number | null;
  combinedVolume: number | null;

  legs: StrategyLeg[];
}

export interface PayoffPoint {
  spotPrice: number;
  pnlPerShare: number;
  pnlPerLot: number;
}

export interface StrategyPayoffResult {
  points: PayoffPoint[];
  maxProfitPerShare: number;
  maxProfitPerLot: number;
  maxProfitAtSpot: number;
  maxLossPerShare: number | 'Unlimited';
  maxLossPerLot: number | 'Unlimited';
  isUnlimitedLoss: boolean;
  breakevens: number[];
  breakevenDistPcts: number[];
  currentSpot: number;
}

export interface AngelOneCredentials {
  apiKey: string;
  clientCode: string;
  pin: string;
  totpSecret: string;
  feedToken?: string;
  jwtToken?: string;
}

export interface MarketFeedMetrics {
  status: FeedStatus;
  angelConnected: boolean;
  isSimulated: boolean;
  lastTickTime: number;
  latencyMs: number;
  dataAgeMs: number;
  subscribedTokensCount: number;
  ticksPerSecond: number;
}

export interface ScannerFilterConfig {
  netType: 'ALL' | 'CREDIT_ONLY' | 'DEBIT_ONLY';
  minOi: number;
  minVolume: number;
  maxSpreadPct: number;
  minMaxProfit: number;
  minDelta: number;
  maxDelta: number;
  searchQuery: string;
}

export type SortField =
  | 'netEntry'
  | 'maxProfit'
  | 'spreadCost'
  | 'combinedOi'
  | 'combinedVolume'
  | 'netTheta'
  | 'netDelta'
  | 'buyStrike';

export type SortDirection = 'ASC' | 'DESC';

export interface GapValidationResult {
  gapIndex: number;
  requestedGap: number;
  actualGap: number;
  isValid: boolean;
  status: 'VALID' | 'ADJUSTED' | 'OUT_OF_BOUNDS';
}

export interface RatioMatrixCell {
  targetGap: number;
  actualGap: number;
  gapSteps: number;
  isValid: boolean;
  isAdjusted: boolean;
  buyStrike: number;
  sellStrike: number;
  buyAsk: number | null;
  buyBid: number | null;
  sellBid: number | null;
  sellAsk: number | null;
  netEntryBuy: number | null; // (LongQty * BuyAsk) - (ShortQty * SellBid)
  netEntrySell: number | null; // (ShortQty * SellBid) - (LongQty * BuyAsk) or write price
  strategyRow?: RatioStrategyRow;
}

export interface RatioMatrixRow {
  strike: number;
  ltp: number | null;
  isAtm: boolean;
  cells: RatioMatrixCell[];
}

export interface StockMarketSummary {
  cash: number;
  future: number;
  basis: number;
  atm: number;
  atmStraddle: number;
  atmStraddlePct: number;
  dte: number;
}

export interface SavedPreset {
  id: string;
  name: string;
  symbol: string;
  gap: number;
  cnt: number;
  stk: string | number; // 'AUTO' or number
  ratioLong: number;
  ratioShort: number;
  minStrike: number | 'ALL';
  maxStrike: number | 'ALL';
  createdAt: number;
}
