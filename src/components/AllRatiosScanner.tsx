import React, { useMemo } from 'react';
import {
  OptionContract,
  UnderlyingStock,
  OptionType,
  RatioStrategyRow,
  Exchange
} from '../types/market';
import { resolveTokenForExchange } from '../data/universeManager';
import { evaluateStrategyPayoff } from '../engine/payoffEngine';
import { Eye, TrendingUp, TrendingDown, Layers } from 'lucide-react';

interface AllRatiosScannerProps {
  stock: UnderlyingStock;
  expiry: string;
  optionType: OptionType;
  contracts: Map<string, OptionContract>;
  allStrikes: number[];
  currentSpot: number;
  onSelectStrategy: (strategy: RatioStrategyRow) => void;
  exchange?: Exchange;
}

export const AllRatiosScanner: React.FC<AllRatiosScannerProps> = ({
  stock,
  expiry,
  optionType,
  contracts,
  allStrikes,
  currentSpot,
  onSelectStrategy,
  exchange = 'NSE'
}) => {
  const comparisonRatios = [
    { long: 1, short: 1, label: '1:1' },
    { long: 1, short: 2, label: '1:2' },
    { long: 1, short: 3, label: '1:3' },
    { long: 1, short: 4, label: '1:4' },
    { long: 2, short: 3, label: '2:3' },
    { long: 2, short: 5, label: '2:5' },
    { long: 3, short: 5, label: '3:5' }
  ];

  // Pick strikes around ATM: ATM, ATM+1 step, ATM+2 steps, etc.
  const atmStrike = useMemo(() => {
    let closest = allStrikes[0] || currentSpot;
    let minDiff = Math.abs(currentSpot - closest);
    for (const s of allStrikes) {
      const diff = Math.abs(currentSpot - s);
      if (diff < minDiff) {
        minDiff = diff;
        closest = s;
      }
    }
    return closest;
  }, [allStrikes, currentSpot]);

  const atmIdx = allStrikes.indexOf(atmStrike);
  const sampleIndices = [
    Math.max(0, atmIdx - 1),
    atmIdx,
    Math.min(allStrikes.length - 1, atmIdx + 1),
    Math.min(allStrikes.length - 1, atmIdx + 2)
  ].filter((v, i, a) => a.indexOf(v) === i);

  const gapStepsList = [1, 2, 3];

  const generatedRows = useMemo(() => {
    const list: RatioStrategyRow[] = [];

    for (const r of comparisonRatios) {
      for (const buyIdx of sampleIndices) {
        for (const gSteps of gapStepsList) {
          const sellIdx = optionType === 'CE' ? buyIdx + gSteps : buyIdx - gSteps;
          if (sellIdx < 0 || sellIdx >= allStrikes.length) continue;

          const buyStrike = allStrikes[buyIdx];
          const sellStrike = allStrikes[sellIdx];
          const actualGap = Math.abs(sellStrike - buyStrike);

          const buyToken = resolveTokenForExchange(stock.symbol, expiry, buyStrike, optionType, exchange);
          const sellToken = resolveTokenForExchange(stock.symbol, expiry, sellStrike, optionType, exchange);

          const buyContract = contracts.get(buyToken);
          const sellContract = contracts.get(sellToken);

          if (!buyContract || !sellContract) continue;

          const buyAsk = buyContract.ask;
          const buyBid = buyContract.bid;
          const sellBid = sellContract.bid;
          const sellAsk = sellContract.ask;

          if (buyAsk === null || sellBid === null) continue;

          const netEntry = Math.round((r.long * buyAsk - r.short * sellBid) * 100) / 100;
          const totalEntry = Math.round(netEntry * stock.lotSize * 100) / 100;

          const legs = [
            {
              side: 'BUY' as const,
              optionType,
              strike: buyStrike,
              quantity: r.long,
              actualQuantity: r.long * stock.lotSize,
              contract: buyContract,
              executionPrice: buyAsk
            },
            {
              side: 'SELL' as const,
              optionType,
              strike: sellStrike,
              quantity: r.short,
              actualQuantity: r.short * stock.lotSize,
              contract: sellContract,
              executionPrice: sellBid
            }
          ];

          const legConfigs = legs.map(l => ({
            side: l.side,
            optionType: l.optionType,
            strike: l.strike,
            quantity: l.quantity,
            price: l.executionPrice || 0
          }));

          const payoff = evaluateStrategyPayoff(legConfigs, netEntry, currentSpot, stock.lotSize);

          list.push({
            id: `${stock.symbol}|${r.label}|${buyStrike}|${sellStrike}`,
            underlying: stock.symbol,
            expiry,
            optionType,
            direction: 'NORMAL',
            ratioStr: r.label,
            longQty: r.long,
            shortQty: r.short,
            buyStrike,
            sellStrike,
            actualGap,
            gapSteps: gSteps,
            lotSize: stock.lotSize,
            buyAsk,
            buyBid,
            buyAskQty: buyContract.askQty,
            buyBidQty: buyContract.bidQty,
            buyLtp: buyContract.ltp,
            sellBid,
            sellAsk,
            sellBidQty: sellContract.bidQty,
            sellAskQty: sellContract.askQty,
            sellLtp: sellContract.ltp,
            executableNetEntry: netEntry,
            executableTotalEntry: totalEntry,
            midNetEntry: null,
            conservativeLiquidation: null,
            slippageCost: null,
            combinedSpreadCost: null,
            buySpread: null,
            buySpreadPct: null,
            sellSpread: null,
            sellSpreadPct: null,
            maxProfitPerShare: payoff.maxProfitPerShare,
            maxProfitPerLot: payoff.maxProfitPerLot,
            maxProfitAtSpot: payoff.maxProfitAtSpot,
            maxLossPerShare: payoff.maxLossPerShare,
            maxLossPerLot: payoff.maxLossPerLot,
            isUnlimitedLoss: payoff.isUnlimitedLoss,
            breakevens: payoff.breakevens,
            breakevenDistPcts: payoff.breakevenDistPcts,
            currentMtmPerShare: 0,
            currentMtmPerLot: 0,
            buyIv: buyContract.iv,
            sellIv: sellContract.iv,
            netDelta: null,
            netGamma: null,
            netTheta: null,
            netVega: null,
            lotDelta: null,
            lotTheta: null,
            buyOi: buyContract.oi,
            sellOi: sellContract.oi,
            buyOiChange: 0,
            sellOiChange: 0,
            buyVolume: buyContract.volume,
            sellVolume: sellContract.volume,
            combinedOi: (buyContract.oi || 0) + (sellContract.oi || 0),
            combinedVolume: (buyContract.volume || 0) + (sellContract.volume || 0),
            legs
          });
        }
      }
    }

    return list;
  }, [comparisonRatios, sampleIndices, gapStepsList, allStrikes, optionType, stock, expiry, contracts, currentSpot]);

  return (
    <div className="flex-1 overflow-x-auto bg-neutral-950 p-5 space-y-4 font-mono text-xs">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="font-bold text-neutral-100 text-sm">
              All Ratios Strategy Comparative Matrix ({stock.symbol} {optionType})
            </h3>
            <p className="text-[11px] text-neutral-400">
              Cross-evaluating 1:1, 1:2, 1:3, 1:4, 2:3, 2:5, 3:5 ratio spread structures across ATM strikes
            </p>
          </div>
        </div>

        <span className="text-[11px] text-neutral-400">
          Showing {generatedRows.length} comparative structures
        </span>
      </div>

      <div className="overflow-x-auto border border-neutral-800 rounded-lg">
        <table className="w-full text-left text-xs whitespace-nowrap divide-y divide-neutral-800">
          <thead className="bg-neutral-900 text-neutral-400 text-[10px] select-none">
            <tr>
              <th className="py-2.5 px-3 font-semibold text-neutral-200">Ratio</th>
              <th className="py-2.5 px-3 font-semibold text-neutral-200">Buy Strike</th>
              <th className="py-2.5 px-3 font-semibold text-neutral-200">Sell Strike</th>
              <th className="py-2.5 px-3 font-semibold text-neutral-300">Actual Gap</th>
              <th className="py-2.5 px-3 font-semibold text-right text-emerald-400">Net Executable Entry</th>
              <th className="py-2.5 px-3 font-semibold text-right text-emerald-300">Max Profit</th>
              <th className="py-2.5 px-3 font-semibold text-right text-neutral-300">Max Loss</th>
              <th className="py-2.5 px-3 font-semibold text-center text-neutral-300">Breakeven(s)</th>
              <th className="py-2.5 px-3 font-semibold text-right text-neutral-400">Open Interest</th>
              <th className="py-2.5 px-3 font-semibold text-right text-neutral-400">Volume</th>
              <th className="py-2.5 px-3 text-center">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-neutral-900 text-[11px] bg-neutral-950/60">
            {generatedRows.map(row => {
              const isCredit = (row.executableNetEntry || 0) < 0;
              const isDebit = (row.executableNetEntry || 0) > 0;

              return (
                <tr key={row.id} className="hover:bg-neutral-900/80 transition-colors">
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 bg-neutral-800 text-emerald-300 rounded font-bold">
                      {row.ratioStr}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-bold text-neutral-100">
                    {row.buyStrike}
                  </td>
                  <td className="py-2 px-3 font-bold text-neutral-200">
                    {row.sellStrike}
                  </td>
                  <td className="py-2 px-3 text-neutral-400">
                    ₹{row.actualGap} ({row.gapSteps} steps)
                  </td>

                  {/* Net Executable Entry */}
                  <td className="py-2 px-3 text-right">
                    <div
                      className={`font-bold flex items-center justify-end gap-1 ${
                        isCredit ? 'text-emerald-400' : isDebit ? 'text-amber-400' : 'text-neutral-300'
                      }`}
                    >
                      {isCredit ? '+' : isDebit ? '-' : ''}₹{Math.abs(row.executableNetEntry || 0).toFixed(2)}
                      <span className="text-[10px] text-neutral-500 font-normal">
                        ({isCredit ? 'Credit' : 'Debit'})
                      </span>
                    </div>
                  </td>

                  {/* Max Profit */}
                  <td className="py-2 px-3 text-right text-emerald-400 font-bold">
                    +₹{row.maxProfitPerShare?.toFixed(2)}
                    <span className="text-[10px] text-neutral-500 block">
                      +₹{row.maxProfitPerLot?.toLocaleString()}
                    </span>
                  </td>

                  {/* Max Loss */}
                  <td className="py-2 px-3 text-right">
                    {row.isUnlimitedLoss ? (
                      <span className="text-rose-400 font-bold text-xs bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800">
                        Unlimited ⚠️
                      </span>
                    ) : (
                      <span className="text-rose-400 font-medium">
                        -₹{Math.abs(Number(row.maxLossPerShare)).toFixed(2)}
                      </span>
                    )}
                  </td>

                  {/* Breakevens */}
                  <td className="py-2 px-3 text-center text-neutral-300">
                    {row.breakevens.length > 0 ? row.breakevens.map(b => `₹${Math.round(b)}`).join(', ') : 'None'}
                  </td>

                  {/* Open Interest */}
                  <td className="py-2 px-3 text-right text-neutral-300">
                    {row.combinedOi?.toLocaleString()}
                  </td>

                  {/* Volume */}
                  <td className="py-2 px-3 text-right text-neutral-400">
                    {row.combinedVolume?.toLocaleString()}
                  </td>

                  {/* Action */}
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={() => onSelectStrategy(row)}
                      className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px] font-medium transition-colors"
                    >
                      Payoff
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
