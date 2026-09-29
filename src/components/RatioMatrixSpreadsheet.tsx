import React, { useState, useMemo } from 'react';
import {
  OptionType,
  RatioStrategyRow,
  OptionContract,
  UnderlyingStock,
  SavedPreset,
  Exchange
} from '../types/market';
import { resolveTokenForExchange } from '../data/universeManager';
import { evaluateStrategyPayoff } from '../engine/payoffEngine';
import { AlertCircle, Check, Eye, Layers } from 'lucide-react';

interface RatioMatrixSpreadsheetProps {
  stock: UnderlyingStock;
  expiry: string;
  optionType: OptionType;
  onChangeOptionType: (type: OptionType) => void;
  ratioLong: number;
  ratioShort: number;
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
  currentSpot: number;
  contracts: Map<string, OptionContract>;
  onSelectStrategy: (strategy: RatioStrategyRow) => void;
  selectedStrategyId?: string;
  onReset: () => void;
  onSavePreset: () => void;
  savedPresets: SavedPreset[];
  onLoadPreset: (preset: SavedPreset) => void;
  exchange?: Exchange;
  density?: 'compact' | 'comfortable';
  showAdvancedData?: boolean;
}

export const RatioMatrixSpreadsheet: React.FC<RatioMatrixSpreadsheetProps> = ({
  stock,
  expiry,
  optionType,
  ratioLong,
  ratioShort,
  gap,
  cnt,
  stk,
  minStrike,
  maxStrike,
  allStrikes,
  currentSpot,
  contracts,
  onSelectStrategy,
  selectedStrategyId,
  exchange = 'NSE',
  density = 'compact',
  showAdvancedData = false
}) => {
  // Determine actual exchange step
  const actualExchangeStep = stock.strikeStep;
  const effectiveStkStep = stk === 'AUTO' ? actualExchangeStep : Number(stk);

  // Generate target gaps: gap, gap*2, gap*3, ..., gap*cnt
  const targetGaps = useMemo(() => {
    const list: number[] = [];
    const count = Math.min(25, Math.max(1, cnt));
    for (let i = 1; i <= count; i++) {
      list.push(gap * i);
    }
    return list;
  }, [gap, cnt]);

  // Validate gaps against actual exchange strike step
  const gapValidationInfo = useMemo(() => {
    let allValid = true;
    const validated = targetGaps.map(g => {
      const remainder = g % effectiveStkStep;
      const isExact = Math.abs(remainder) < 0.01 || Math.abs(remainder - effectiveStkStep) < 0.01;
      if (!isExact) allValid = false;

      const nearestMultiplier = Math.max(1, Math.round(g / effectiveStkStep));
      const nearestValidGap = nearestMultiplier * effectiveStkStep;

      return {
        target: g,
        actual: nearestValidGap,
        isValid: isExact,
        steps: nearestMultiplier
      };
    });

    return { allValid, validated };
  }, [targetGaps, effectiveStkStep]);

  // Filter visible strikes based on MIN and MAX
  const visibleStrikes = useMemo(() => {
    return allStrikes.filter(s => {
      if (minStrike !== 'ALL' && s < minStrike) return false;
      if (maxStrike !== 'ALL' && s > maxStrike) return false;
      return true;
    });
  }, [allStrikes, minStrike, maxStrike]);

  // ATM Strike
  const atmStrike = useMemo(() => {
    if (allStrikes.length === 0) return currentSpot;
    let closest = allStrikes[0];
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

  // Build matrix rows for each visible strike and gap level
  const matrixRows = useMemo(() => {
    return visibleStrikes.map(rowStrike => {
      const buyStrike = rowStrike;
      const buyToken = resolveTokenForExchange(stock.symbol, expiry, buyStrike, optionType, exchange);
      const buyContract = contracts.get(buyToken);
      const buyLtp = buyContract?.ltp ?? null;
      const buyAsk = buyContract?.ask ?? null;
      const buyBid = buyContract?.bid ?? null;

      const cells = gapValidationInfo.validated.map(gInfo => {
        // For CE: Buy lower strike, Sell higher strike (buyStrike + gap)
        // For PE: Buy higher strike, Sell lower strike (buyStrike - gap)
        const sellStrike =
          optionType === 'CE'
            ? Math.round((buyStrike + gInfo.actual) * 100) / 100
            : Math.round((buyStrike - gInfo.actual) * 100) / 100;

        const strikeExists = allStrikes.includes(sellStrike);
        if (!strikeExists || sellStrike <= 0) {
          return {
            targetGap: gInfo.target,
            actualGap: gInfo.actual,
            gapSteps: gInfo.steps,
            isValid: false,
            buyStrike,
            sellStrike,
            buyAsk: null,
            buyBid: null,
            sellBid: null,
            sellAsk: null,
            netEntryBuy: null,
            netEntrySell: null,
            strategyRow: undefined
          };
        }

        const sellToken = resolveTokenForExchange(stock.symbol, expiry, sellStrike, optionType, exchange);
        const sellContract = contracts.get(sellToken);

        const effectiveBuyAsk = buyAsk ?? (buyContract?.ltp ? Math.round((buyContract.ltp + 0.1) * 20) / 20 : null);
        const effectiveBuyBid = buyBid ?? (buyContract?.ltp ? Math.max(0.05, Math.round((buyContract.ltp - 0.1) * 20) / 20) : null);
        const effectiveSellBid =
          (sellContract?.bid !== null && sellContract?.bid !== undefined && sellContract.bid > 0)
            ? sellContract.bid
            : (sellContract?.ltp ? Math.max(0.05, Math.round((sellContract.ltp - 0.1) * 20) / 20) : null);
        const effectiveSellAsk =
          (sellContract?.ask !== null && sellContract?.ask !== undefined && sellContract.ask > 0)
            ? sellContract.ask
            : (sellContract?.ltp ? Math.round((sellContract.ltp + 0.1) * 20) / 20 : null);

        let netEntryBuy: number | null = null;
        let netEntrySell: number | null = null;
        let strategyRow: RatioStrategyRow | undefined;

        if (effectiveBuyAsk !== null && effectiveSellBid !== null) {
          netEntryBuy = Math.round((ratioLong * effectiveBuyAsk - ratioShort * effectiveSellBid) * 100) / 100;
        }

        if (effectiveBuyBid !== null && effectiveSellAsk !== null) {
          netEntrySell = Math.round((ratioLong * effectiveBuyBid - ratioShort * effectiveSellAsk) * 100) / 100;
        }

        if (buyContract && sellContract && netEntryBuy !== null) {
          const legs = [
            {
              side: 'BUY' as const,
              optionType,
              strike: buyStrike,
              quantity: ratioLong,
              actualQuantity: ratioLong * stock.lotSize,
              contract: buyContract,
              executionPrice: effectiveBuyAsk
            },
            {
              side: 'SELL' as const,
              optionType,
              strike: sellStrike,
              quantity: ratioShort,
              actualQuantity: ratioShort * stock.lotSize,
              contract: sellContract,
              executionPrice: effectiveSellBid
            }
          ];

          const legConfigs = legs.map(l => ({
            side: l.side,
            optionType: l.optionType,
            strike: l.strike,
            quantity: l.quantity,
            price: l.executionPrice || 0
          }));

          const payoffResult = evaluateStrategyPayoff(
            legConfigs,
            netEntryBuy,
            currentSpot,
            stock.lotSize
          );

          const id = `${stock.symbol}|${expiry}|${optionType}|${buyStrike}|${sellStrike}|${ratioLong}|${ratioShort}`;

          strategyRow = {
            id,
            underlying: stock.symbol,
            expiry,
            optionType,
            direction: 'NORMAL',
            ratioStr: `${ratioLong}:${ratioShort}`,
            longQty: ratioLong,
            shortQty: ratioShort,
            buyStrike,
            sellStrike,
            actualGap: gInfo.actual,
            gapSteps: gInfo.steps,
            lotSize: stock.lotSize,
            buyAsk: effectiveBuyAsk,
            buyBid: effectiveBuyBid,
            buyAskQty: buyContract.askQty,
            buyBidQty: buyContract.bidQty,
            buyLtp: buyContract.ltp,
            sellBid: effectiveSellBid,
            sellAsk: effectiveSellAsk,
            sellBidQty: sellContract.bidQty,
            sellAskQty: sellContract.askQty,
            sellLtp: sellContract.ltp,
            executableNetEntry: netEntryBuy,
            executableTotalEntry: Math.round(netEntryBuy * stock.lotSize * 100) / 100,
            midNetEntry: null,
            conservativeLiquidation: null,
            slippageCost: null,
            combinedSpreadCost: null,
            buySpread: null,
            buySpreadPct: null,
            sellSpread: null,
            sellSpreadPct: null,
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
          };
        }

        return {
          targetGap: gInfo.target,
          actualGap: gInfo.actual,
          gapSteps: gInfo.steps,
          isValid: gInfo.isValid,
          buyStrike,
          sellStrike,
          buyAsk: effectiveBuyAsk,
          buyBid: effectiveBuyBid,
          sellBid: effectiveSellBid,
          sellAsk: effectiveSellAsk,
          netEntryBuy,
          netEntrySell,
          buyContract,
          sellContract,
          strategyRow
        };
      });

      // ITM / OTM determination
      const isAtm = buyStrike === atmStrike;
      const isItm = optionType === 'CE' ? buyStrike < currentSpot : buyStrike > currentSpot;

      return {
        strike: buyStrike,
        ltp: buyLtp,
        isAtm,
        isItm,
        cells
      };
    });
  }, [
    visibleStrikes,
    stock,
    expiry,
    optionType,
    exchange,
    contracts,
    gapValidationInfo,
    allStrikes,
    ratioLong,
    ratioShort,
    currentSpot,
    atmStrike
  ]);

  // Style helper based on density
  const cellPy = density === 'compact' ? 'py-1.5' : 'py-2.5';
  const cellPx = density === 'compact' ? 'px-2' : 'px-3';

  return (
    <div className="w-full flex flex-col font-sans bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* CALLS / PUTS SECTION HEADER */}
      <div className={`px-4 py-2 border-b flex items-center justify-between transition-colors ${
        optionType === 'CE'
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
          : 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-1.5 h-5 rounded-full ${optionType === 'CE' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="font-extrabold text-sm tracking-wide uppercase font-mono">
            {optionType === 'CE' ? 'CALLS (CE) RATIO SPREAD MATRIX' : 'PUTS (PE) RATIO SPREAD MATRIX'}
          </span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/80 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 font-mono">
            Ratio {ratioLong}:{ratioShort}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-slate-500 dark:text-slate-400">
            {stock.symbol} · Lot: <strong className="text-slate-900 dark:text-slate-100">{stock.lotSize}</strong>
          </span>
        </div>
      </div>

      {/* MATRIX TABLE CONTAINER WITH STICKY HEADERS & COLUMNS */}
      <div className="relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-250px)] border-b border-slate-200 dark:border-slate-800">
        <table className="w-full text-left border-collapse text-xs select-none">
          <thead>
            {/* LEVEL 1 HEADER: GAP COLUMNS */}
            <tr className="bg-slate-900 text-slate-200 border-b border-slate-800 sticky top-0 z-30 font-mono text-[11px]">
              {/* Frozen Left Columns: STRIKE & LTP */}
              <th className="sticky left-0 z-40 bg-slate-900 px-3 py-2 text-center font-bold text-white border-r border-slate-800 min-w-[90px]">
                STRIKE
              </th>
              <th className="sticky left-[90px] z-40 bg-slate-900 px-3 py-2 text-right font-bold text-slate-300 border-r border-slate-800 min-w-[80px]">
                LTP
              </th>

              {/* GAP Multiples Upper Headers */}
              {gapValidationInfo.validated.map((gInfo, idx) => {
                const isOdd = idx % 2 === 0;
                return (
                  <th
                    key={gInfo.target}
                    colSpan={showAdvancedData ? 6 : 2}
                    className={`px-3 py-2 text-center font-bold border-r border-slate-800 ${
                      isOdd ? 'bg-slate-800/90 text-emerald-400' : 'bg-slate-900 text-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>GAP {gInfo.actual}</span>
                      <span className="text-[10px] opacity-60 font-normal">({gInfo.steps} steps)</span>
                    </div>
                  </th>
                );
              })}
            </tr>

            {/* LEVEL 2 HEADER: BUY / SELL SUB-HEADERS */}
            <tr className="bg-slate-800/90 text-slate-300 border-b border-slate-700 sticky top-[33px] z-30 font-mono text-[10px] uppercase tracking-wider">
              <th className="sticky left-0 z-40 bg-slate-800 px-3 py-1.5 text-center font-semibold text-slate-400 border-r border-slate-700">
                (Strike)
              </th>
              <th className="sticky left-[90px] z-40 bg-slate-800 px-3 py-1.5 text-right font-semibold text-slate-400 border-r border-slate-700">
                (Spot/LTP)
              </th>

              {gapValidationInfo.validated.map((gInfo, idx) => {
                const isOdd = idx % 2 === 0;
                return (
                  <React.Fragment key={`sub-${gInfo.target}`}>
                    <th className={`px-2 py-1.5 text-right font-bold border-r border-slate-700/60 ${
                      isOdd ? 'bg-emerald-950/40 text-emerald-400' : 'bg-emerald-950/30 text-emerald-400'
                    }`}>
                      BUY ({ratioLong}x)
                    </th>
                    <th className={`px-2 py-1.5 text-right font-bold border-r border-slate-700 ${
                      isOdd ? 'bg-rose-950/40 text-rose-400' : 'bg-rose-950/30 text-rose-400'
                    }`}>
                      SELL ({ratioShort}x)
                    </th>

                    {showAdvancedData && (
                      <>
                        <th className="px-2 py-1.5 text-right font-medium text-slate-400 border-r border-slate-700/60">
                          IV (B/S)
                        </th>
                        <th className="px-2 py-1.5 text-right font-medium text-slate-400 border-r border-slate-700/60">
                          Δ Delta
                        </th>
                        <th className="px-2 py-1.5 text-right font-medium text-slate-400 border-r border-slate-700/60">
                          OI
                        </th>
                        <th className="px-2 py-1.5 text-right font-medium text-slate-400 border-r border-slate-700">
                          Volume
                        </th>
                      </>
                    )}
                  </React.Fragment>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80 font-mono">
            {matrixRows.map(row => {
              const { strike, ltp, isAtm, isItm, cells } = row;

              // Row background style
              let rowBgClass = isItm
                ? 'bg-slate-100/60 dark:bg-slate-900/30'
                : 'bg-white dark:bg-slate-950';

              if (isAtm) {
                rowBgClass = 'bg-amber-500/10 dark:bg-amber-500/15 font-semibold';
              }

              return (
                <tr
                  key={strike}
                  className={`hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors group ${rowBgClass}`}
                >
                  {/* STICKY STRIKE COLUMN */}
                  <td className={`sticky left-0 z-20 ${cellPy} px-3 text-center font-bold border-r border-slate-200 dark:border-slate-800 transition-colors ${
                    isAtm
                      ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 group-hover:bg-slate-200 dark:group-hover:bg-slate-800'
                  }`}>
                    <div className="flex items-center justify-center gap-1">
                      <span>{strike.toLocaleString('en-IN')}</span>
                      {isAtm && (
                        <span className="text-[9px] bg-slate-950 text-amber-400 px-1 rounded font-mono">
                          ATM
                        </span>
                      )}
                    </div>
                  </td>

                  {/* STICKY LTP COLUMN */}
                  <td className={`sticky left-[90px] z-20 ${cellPy} px-3 text-right text-slate-700 dark:text-slate-300 font-medium border-r border-slate-200 dark:border-slate-800 transition-colors ${
                    isAtm
                      ? 'bg-amber-500/20 dark:bg-amber-500/25 text-amber-950 dark:text-amber-200 font-bold'
                      : 'bg-slate-50 dark:bg-slate-900/80 group-hover:bg-slate-200 dark:group-hover:bg-slate-800'
                  }`}>
                    {ltp !== null ? `₹${ltp.toFixed(2)}` : '—'}
                  </td>

                  {/* GAP CELLS */}
                  {cells.map((cell, idx) => {
                    const {
                      targetGap,
                      buyAsk,
                      sellBid,
                      netEntryBuy,
                      strategyRow,
                      buyContract,
                      sellContract
                    } = cell;

                    const isOddGroup = idx % 2 === 0;
                    const groupBgClass = isOddGroup
                      ? 'bg-slate-50/50 dark:bg-slate-900/20'
                      : 'bg-white dark:bg-slate-950';

                    const isSelected = selectedStrategyId && strategyRow?.id === selectedStrategyId;

                    return (
                      <React.Fragment key={targetGap}>
                        {/* BUY CELL (Executable Net Entry) */}
                        <td
                          onClick={() => strategyRow && onSelectStrategy(strategyRow)}
                          className={`${cellPy} ${cellPx} text-right cursor-pointer transition-all border-r border-slate-200/60 dark:border-slate-800/60 ${groupBgClass} ${
                            isSelected
                              ? 'bg-emerald-500/20 ring-2 ring-emerald-500 text-slate-900 dark:text-white font-bold'
                              : 'hover:bg-emerald-500/10'
                          }`}
                        >
                          {netEntryBuy !== null ? (
                            <div className="flex flex-col items-end">
                              <span className={`font-bold tabular-nums ${
                                netEntryBuy < 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-slate-800 dark:text-slate-200'
                              }`}>
                                {netEntryBuy < 0 ? `-₹${Math.abs(netEntryBuy).toFixed(2)}` : `₹${netEntryBuy.toFixed(2)}`}
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                Ask: ₹{buyAsk?.toFixed(2) || '—'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* SELL CELL */}
                        <td
                          onClick={() => strategyRow && onSelectStrategy(strategyRow)}
                          className={`${cellPy} ${cellPx} text-right cursor-pointer transition-all border-r border-slate-200 dark:border-slate-800 ${groupBgClass} ${
                            isSelected
                              ? 'bg-rose-500/20 ring-2 ring-rose-500 text-slate-900 dark:text-white font-bold'
                              : 'hover:bg-rose-500/10'
                          }`}
                        >
                          {sellBid !== null ? (
                            <div className="flex flex-col items-end">
                              <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                                ₹{sellBid.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                Sell Strike: ₹{cell.sellStrike}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* ADVANCED DATA COLUMNS (Optional) */}
                        {showAdvancedData && (
                          <>
                            {/* IV */}
                            <td className={`${cellPy} ${cellPx} text-right text-slate-500 border-r border-slate-200/60 dark:border-slate-800/60`}>
                              {buyContract?.iv ? `${buyContract.iv.toFixed(1)}%` : '—'}
                            </td>

                            {/* DELTA */}
                            <td className={`${cellPy} ${cellPx} text-right text-slate-500 border-r border-slate-200/60 dark:border-slate-800/60`}>
                              {buyContract?.delta ? buyContract.delta.toFixed(2) : '—'}
                            </td>

                            {/* OI */}
                            <td className={`${cellPy} ${cellPx} text-right text-slate-500 border-r border-slate-200/60 dark:border-slate-800/60`}>
                              {buyContract?.oi ? `${(buyContract.oi / 1000).toFixed(1)}k` : '—'}
                            </td>

                            {/* VOLUME */}
                            <td className={`${cellPy} ${cellPx} text-right text-slate-500 border-r border-slate-200 dark:border-slate-800`}>
                              {buyContract?.volume ? `${(buyContract.volume / 1000).toFixed(1)}k` : '—'}
                            </td>
                          </>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
