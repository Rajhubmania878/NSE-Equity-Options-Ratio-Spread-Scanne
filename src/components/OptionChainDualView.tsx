import React from 'react';
import { OptionContract, Exchange } from '../types/market';
import { getAtmStrikeForExchange, resolveTokenForExchange } from '../data/universeManager';

interface OptionChainDualViewProps {
  contracts: Map<string, OptionContract>;
  strikes: number[];
  currentSpot: number;
  selectedSymbol: string;
  selectedExpiry: string;
  activeBuyStrike?: number;
  activeSellStrike?: number;
  onSelectStrike: (strike: number) => void;
  exchange?: Exchange;
}

export const OptionChainDualView: React.FC<OptionChainDualViewProps> = ({
  contracts,
  strikes,
  currentSpot,
  selectedSymbol,
  selectedExpiry,
  activeBuyStrike,
  activeSellStrike,
  onSelectStrike,
  exchange = 'NSE'
}) => {
  const atmStrike = getAtmStrikeForExchange(currentSpot, strikes, exchange);

  const getContract = (strike: number, type: 'CE' | 'PE'): OptionContract | undefined => {
    const token = resolveTokenForExchange(selectedSymbol, selectedExpiry, strike, type, exchange);
    const byToken = contracts.get(token);
    if (byToken) return byToken;

    for (const contract of contracts.values()) {
      if (contract.strike === strike && contract.optionType === type) {
        return contract;
      }
    }
    return undefined;
  };

  const formatPrice = (p: number | null) => (p !== null ? `₹${p.toFixed(2)}` : '—');
  const formatCompact = (val: number | null) => {
    if (val === null) return '—';
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return val.toString();
  };

  return (
    <div className="w-full overflow-x-auto bg-neutral-950 border-b border-neutral-800">
      <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
        {/* Dual Super Header */}
        <thead>
          <tr className="bg-neutral-900 border-b border-neutral-800 text-[11px] font-mono text-center">
            <th colSpan={7} className="py-2 bg-emerald-950/40 text-emerald-300 font-bold border-r border-neutral-800">
              CALLS (CE) · BUY / SELL LEGS
            </th>
            <th className="py-2 px-4 bg-neutral-900 text-neutral-100 font-bold border-r border-neutral-800">
              STRIKE
            </th>
            <th colSpan={7} className="py-2 bg-rose-950/40 text-rose-300 font-bold">
              PUTS (PE) · BUY / SELL LEGS
            </th>
          </tr>
          <tr className="bg-neutral-900/80 text-neutral-400 text-[10px] font-mono border-b border-neutral-800 select-none">
            {/* Call Columns */}
            <th className="py-1.5 px-2.5 text-right">OI</th>
            <th className="py-1.5 px-2 text-right">Vol</th>
            <th className="py-1.5 px-2 text-right">IV</th>
            <th className="py-1.5 px-2 text-right">Delta</th>
            <th className="py-1.5 px-2 text-right text-emerald-400">Bid</th>
            <th className="py-1.5 px-2 text-right text-emerald-400">Ask</th>
            <th className="py-1.5 px-2.5 text-right text-neutral-200 border-r border-neutral-800">LTP</th>

            {/* Strike */}
            <th className="py-1.5 px-4 text-center font-bold text-neutral-100 border-r border-neutral-800">
              Strike (₹)
            </th>

            {/* Put Columns */}
            <th className="py-1.5 px-2.5 text-left text-neutral-200">LTP</th>
            <th className="py-1.5 px-2 text-left text-rose-400">Bid</th>
            <th className="py-1.5 px-2 text-left text-rose-400">Ask</th>
            <th className="py-1.5 px-2 text-left">Delta</th>
            <th className="py-1.5 px-2 text-left">IV</th>
            <th className="py-1.5 px-2 text-left">Vol</th>
            <th className="py-1.5 px-2.5 text-left">OI</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-neutral-900 font-mono text-[11px]">
          {strikes.map(strike => {
            const ce = getContract(strike, 'CE');
            const pe = getContract(strike, 'PE');
            const isAtm = strike === atmStrike;
            const isBuy = strike === activeBuyStrike;
            const isSell = strike === activeSellStrike;

            const isCallItm = strike < currentSpot;
            const isPutItm = strike > currentSpot;

            return (
              <tr
                key={strike}
                onClick={() => onSelectStrike(strike)}
                className={`cursor-pointer transition-colors duration-100 ${
                  isAtm
                    ? 'bg-neutral-800/90'
                    : isBuy
                    ? 'bg-emerald-950/40 hover:bg-emerald-950/60'
                    : isSell
                    ? 'bg-rose-950/40 hover:bg-rose-950/60'
                    : 'hover:bg-neutral-900/70'
                }`}
              >
                {/* CE Data (ITM has subtle background) */}
                <td className={`py-1.5 px-2.5 text-right text-neutral-400 ${isCallItm ? 'bg-neutral-900/30' : ''}`}>
                  {formatCompact(ce?.oi || null)}
                </td>
                <td className={`py-1.5 px-2 text-right text-neutral-500 ${isCallItm ? 'bg-neutral-900/30' : ''}`}>
                  {formatCompact(ce?.volume || null)}
                </td>
                <td className={`py-1.5 px-2 text-right text-neutral-400 ${isCallItm ? 'bg-neutral-900/30' : ''}`}>
                  {ce?.iv ? `${ce.iv}%` : '—'}
                </td>
                <td className={`py-1.5 px-2 text-right text-emerald-400 ${isCallItm ? 'bg-neutral-900/30' : ''}`}>
                  {ce?.delta ? ce.delta.toFixed(2) : '—'}
                </td>
                <td className={`py-1.5 px-2 text-right text-neutral-300 ${isCallItm ? 'bg-neutral-900/30' : ''}`}>
                  {formatPrice(ce?.bid || null)}
                </td>
                <td className={`py-1.5 px-2 text-right text-emerald-300 font-semibold ${isCallItm ? 'bg-neutral-900/30' : ''}`}>
                  {formatPrice(ce?.ask || null)}
                </td>
                <td className={`py-1.5 px-2.5 text-right font-bold text-neutral-100 border-r border-neutral-800 ${isCallItm ? 'bg-neutral-900/30' : ''}`}>
                  {formatPrice(ce?.ltp || null)}
                </td>

                {/* Middle Strike */}
                <td className="py-1.5 px-4 text-center font-bold border-r border-neutral-800 bg-neutral-900">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className={isAtm ? 'text-cyan-400 text-sm' : isBuy ? 'text-emerald-400 text-sm' : isSell ? 'text-rose-400 text-sm' : 'text-neutral-100'}>
                      {strike}
                    </span>
                    {isAtm && (
                      <span className="text-[9px] bg-cyan-900/80 text-cyan-300 px-1 rounded">
                        ATM
                      </span>
                    )}
                    {isBuy && (
                      <span className="text-[9px] bg-emerald-900 text-emerald-200 px-1 rounded">
                        BUY
                      </span>
                    )}
                    {isSell && (
                      <span className="text-[9px] bg-rose-900 text-rose-200 px-1 rounded">
                        SELL
                      </span>
                    )}
                  </div>
                </td>

                {/* PE Data */}
                <td className={`py-1.5 px-2.5 text-left font-bold text-neutral-100 ${isPutItm ? 'bg-neutral-900/30' : ''}`}>
                  {formatPrice(pe?.ltp || null)}
                </td>
                <td className={`py-1.5 px-2 text-left text-rose-300 font-semibold ${isPutItm ? 'bg-neutral-900/30' : ''}`}>
                  {formatPrice(pe?.bid || null)}
                </td>
                <td className={`py-1.5 px-2 text-left text-neutral-300 ${isPutItm ? 'bg-neutral-900/30' : ''}`}>
                  {formatPrice(pe?.ask || null)}
                </td>
                <td className={`py-1.5 px-2 text-left text-rose-400 ${isPutItm ? 'bg-neutral-900/30' : ''}`}>
                  {pe?.delta ? pe.delta.toFixed(2) : '—'}
                </td>
                <td className={`py-1.5 px-2 text-left text-neutral-400 ${isPutItm ? 'bg-neutral-900/30' : ''}`}>
                  {pe?.iv ? `${pe.iv}%` : '—'}
                </td>
                <td className={`py-1.5 px-2 text-left text-neutral-500 ${isPutItm ? 'bg-neutral-900/30' : ''}`}>
                  {formatCompact(pe?.volume || null)}
                </td>
                <td className={`py-1.5 px-2.5 text-left text-neutral-400 ${isPutItm ? 'bg-neutral-900/30' : ''}`}>
                  {formatCompact(pe?.oi || null)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
