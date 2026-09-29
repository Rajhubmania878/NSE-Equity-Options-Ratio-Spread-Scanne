import { Exchange, UnderlyingStock, OptionType, BseCashStock } from '../types/market';
import {
  NSE_EQUITY_UNIVERSE,
  getAllUnderlyings as getAllNseUnderlyings,
  getUnderlyingBySymbol as getNseUnderlyingBySymbol,
  getAvailableExpiries as getNseAvailableExpiries,
  getListedStrikes as getNseListedStrikes,
  resolveAngelToken as resolveNseAngelToken,
  resolveAngelFutToken as resolveNseAngelFutToken,
  resolveAngelCashToken as resolveNseAngelCashToken,
  generateTradingSymbol as generateNseTradingSymbol,
  getAtmStrike as getNseAtmStrike,
  getDaysToExpiry as getNseDaysToExpiry,
  formatExpiry as formatNseExpiry,
  normalizeExpiry as normalizeNseExpiry,
  getAvailableSectors as getNseAvailableSectors
} from './nseUniverse';
import {
  BSE_EQUITY_UNIVERSE,
  BSE_CASH_UNIVERSE,
  getAllBseUnderlyings,
  getAllBseCashStocks,
  getBseUnderlyingBySymbol,
  getBseAvailableExpiries,
  getBseListedStrikes,
  resolveBseAngelToken,
  resolveBseAngelFutToken,
  resolveBseAngelCashToken,
  generateBseTradingSymbol,
  getBseAtmStrike,
  getBseDaysToExpiry,
  formatBseExpiry,
  normalizeBseExpiry,
  getBseAvailableSectors
} from './bseUniverse';

/**
 * Returns all active option underlyings for the selected exchange.
 */
export function getUnderlyingsForExchange(exchange: Exchange): UnderlyingStock[] {
  return exchange === 'BSE' ? getAllBseUnderlyings() : getAllNseUnderlyings();
}

/**
 * Returns all cash equities for the selected exchange.
 */
export function getCashStocksForExchange(exchange: Exchange): Array<{
  symbol: string;
  name: string;
  token?: string;
  lotSize: number;
  exchange: Exchange;
  hasOptions?: boolean;
}> {
  if (exchange === 'BSE') {
    return getAllBseCashStocks();
  }
  return getAllNseUnderlyings().map(u => ({
    symbol: u.symbol,
    name: u.name,
    token: u.cashToken || undefined,
    lotSize: 1,
    exchange: 'NSE' as const,
    hasOptions: true
  }));
}

/**
 * Gets underlying stock object by symbol and exchange.
 */
export function getUnderlyingBySymbolAndExchange(symbol: string, exchange: Exchange): UnderlyingStock {
  return exchange === 'BSE' ? getBseUnderlyingBySymbol(symbol) : getNseUnderlyingBySymbol(symbol);
}

/**
 * Gets valid expiries for stock on the selected exchange.
 */
export function getExpiriesForExchange(symbol: string, exchange: Exchange): string[] {
  return exchange === 'BSE' ? getBseAvailableExpiries(symbol) : getNseAvailableExpiries(symbol);
}

/**
 * Gets listed genuine strikes for stock on the selected exchange.
 * Never creates synthetic strikes.
 */
export function getListedStrikesForExchange(symbol: string, expiry: string, exchange: Exchange): number[] {
  return exchange === 'BSE' ? getBseListedStrikes(symbol, expiry) : getNseListedStrikes(symbol, expiry);
}

/**
 * Resolves option contract token for the selected exchange.
 * For NSE: NFO token
 * For BSE: BFO token
 */
export function resolveTokenForExchange(
  symbol: string,
  expiry: string,
  strike: number,
  optionType: OptionType,
  exchange: Exchange
): string {
  return exchange === 'BSE'
    ? resolveBseAngelToken(symbol, expiry, strike, optionType)
    : resolveNseAngelToken(symbol, expiry, strike, optionType);
}

/**
 * Resolves future contract token for the selected exchange.
 */
export function resolveFutTokenForExchange(
  symbol: string,
  expiry: string,
  exchange: Exchange
): string | null {
  return exchange === 'BSE'
    ? resolveBseAngelFutToken(symbol, expiry)
    : resolveNseAngelFutToken(symbol, expiry);
}

/**
 * Resolves cash stock token for the selected exchange.
 * For NSE: NSE cash token (exchangeType 1)
 * For BSE: BSE cash token (exchangeType 3)
 */
export function resolveCashTokenForExchange(symbol: string, exchange: Exchange): string | null {
  return exchange === 'BSE'
    ? resolveBseAngelCashToken(symbol)
    : resolveNseAngelCashToken(symbol);
}

/**
 * Formats Angel One Trading Symbol for the selected exchange.
 */
export function generateTradingSymbolForExchange(
  symbol: string,
  expiry: string,
  strike: number,
  optionType: OptionType,
  exchange: Exchange
): string {
  return exchange === 'BSE'
    ? generateBseTradingSymbol(symbol, expiry, strike, optionType)
    : generateNseTradingSymbol(symbol, expiry, strike, optionType);
}

/**
 * Calculates ATM strike for the selected exchange.
 */
export function getAtmStrikeForExchange(spot: number, strikes: number[], exchange: Exchange): number {
  return exchange === 'BSE' ? getBseAtmStrike(spot, strikes) : getNseAtmStrike(spot, strikes);
}

/**
 * Calculates days to expiry.
 */
export function getDaysToExpiryForExchange(expiryStr: string, exchange: Exchange): number {
  return exchange === 'BSE' ? getBseDaysToExpiry(expiryStr) : getNseDaysToExpiry(expiryStr);
}

/**
 * Formats expiry for display.
 */
export function formatExpiryForExchange(exp: string, exchange: Exchange): string {
  return exchange === 'BSE' ? formatBseExpiry(exp) : formatNseExpiry(exp);
}

/**
 * Normalizes expiry for keys.
 */
export function normalizeExpiryForExchange(exp: string, exchange: Exchange): string {
  return exchange === 'BSE' ? normalizeBseExpiry(exp) : normalizeNseExpiry(exp);
}

/**
 * Returns available sectors for the selected exchange.
 */
export function getAvailableSectorsForExchange(exchange: Exchange): string[] {
  return exchange === 'BSE' ? getBseAvailableSectors() : getNseAvailableSectors();
}
