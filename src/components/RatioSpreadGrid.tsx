import React from 'react';
import { RatioStrategyRow } from '../types/market';
import { Eye, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface RatioSpreadGridProps {
  rows: RatioStrategyRow[];
  onSelectRow: (row: RatioStrategyRow) => void;
  selectedRowId?: string;
  currentSpot: number;
  lotSize: number;
}

export const RatioSpreadGrid: React.FC<RatioSpreadGridProps> = ({
  rows,
  onSelectRow,
  selectedRowId,
  currentSpot,
  lotSize
}) => {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-500 space-y-2">
        <AlertTriangle className="w-8 h-8 text-neutral-600" />
        <p className="text-sm font-medium">No ratio spread structures match the active filters.</p>
        <p className="text-xs text-neutral-600">Try adjusting strike range, gap steps, or liquidity filters.</p>
      </div>
    );
  }

  const formatCurrency = (val: number | null, prefix = '₹') => {
    if (val === null || val === undefined) return '—';
    return `${prefix}${val.toFixed(2)}`;
  };

  const formatNumber = (val: number | null) => {
    if (val === null || val === undefined) return '—';
    if (val >= 1000000) return `${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return val.toLocaleString();
  };

  return (
    <div className="w-full overflow-x-auto border-b border-neutral-800 bg-neutral-950">
      <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
        {/* Table Header */}
        <thead>
          <tr className="bg-neutral-900/90 text-neutral-400 border-b border-neutral-800 text-[11px] select-none sticky top-0 z-10">
            {/* Frozen Left Columns */}
            <th className="py-2.5 px-3 font-semibold text-neutral-200 sticky left-0 bg-neutral-900 z-10 border-r border-neutral-800">
              Buy Leg (Strike · Qty)
            </th>
            <th className="py-2.5 px-3 font-semibold text-neutral-200 border-r border-neutral-800">
              Buy Ask / Bid
            </th>
            <th className="py-2.5 px-3 font-semibold text-neutral-200 border-r border-neutral-800">
              Sell Leg (Strike · Qty)
            </th>
            <th className="py-2.5 px-3 font-semibold text-neutral-200 border-r border-neutral-800">
              Sell Bid / Ask
            </th>
            <th className="py-2.5 px-2.5 text-center font-semibold text-neutral-300 border-r border-neutral-800">
              Ratio · Gap
            </th>

            {/* Core Strategy Pricing */}
            <th className="py-2.5 px-3 font-semibold text-right text-emerald-400 border-r border-neutral-800">
              Net Executable Entry
            </th>
            <th className="py-2.5 px-3 font-semibold text-right text-neutral-300 border-r border-neutral-800">
              Mid Entry / Cost
            </th>

            {/* Payoff & Risk */}
            <th className="py-2.5 px-3 font-semibold text-right text-emerald-300 border-r border-neutral-800">
              Max Profit
            </th>
            <th className="py-2.5 px-3 font-semibold text-right text-neutral-300 border-r border-neutral-800">
              Max Loss
            </th>
            <th className="py-2.5 px-3 font-semibold text-center text-neutral-300 border-r border-neutral-800">
              Breakeven(s)
            </th>

            {/* Greeks & IV */}
            <th className="py-2.5 px-3 font-semibold text-right text-neutral-400 border-r border-neutral-800">
              Net Greeks (Δ · Θ/lot)
            </th>
            <th className="py-2.5 px-3 font-semibold text-right text-neutral-400 border-r border-neutral-800">
              IV (Buy / Sell)
            </th>

            {/* Liquidity */}
            <th className="py-2.5 px-3 font-semibold text-right text-neutral-400 border-r border-neutral-800">
              Open Interest
            </th>
            <th className="py-2.5 px-3 font-semibold text-right text-neutral-400 border-r border-neutral-800">
              Volume
            </th>

            {/* Action */}
            <th className="py-2.5 px-3 text-center font-semibold text-neutral-400">
              Action
            </th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-neutral-900">
          {rows.map(row => {
            const isSelected = selectedRowId === row.id;
            const isCredit = (row.executableNetEntry || 0) < 0;
            const isDebit = (row.executableNetEntry || 0) > 0;

            // Distance from spot for buy strike
            const buyDistPct = Math.round(((row.buyStrike - currentSpot) / currentSpot) * 1000) / 10;
            const isAtm = Math.abs(row.buyStrike - currentSpot) < 15;

            return (
              <tr
                key={row.id}
                onClick={() => onSelectRow(row)}
                className={`cursor-pointer transition-colors duration-150 ${
                  isSelected
                    ? 'bg-neutral-800/90 hover:bg-neutral-800'
                    : 'hover:bg-neutral-900/80 bg-neutral-950/40'
                }`}
              >
                {/* 1. Frozen: Buy Strike & Qty */}
                <td className="py-2.5 px-3 sticky left-0 bg-neutral-950 z-10 border-r border-neutral-800/80 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-100 text-sm">
                      {row.buyStrike}
                    </span>
                    <span className="text-[11px] text-emerald-400 font-semibold">
                      +{row.longQty}x
                    </span>
                    {isAtm && (
                      <span className="text-[9px] bg-cyan-950/80 text-cyan-300 px-1 py-0.2 rounded border border-cyan-800">
                        ATM
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-500 block">
                    {buyDistPct >= 0 ? `+${buyDistPct}%` : `${buyDistPct}%`} from spot
                  </span>
                </td>

                {/* 2. Buy Ask / Bid Depth */}
                <td className="py-2.5 px-3 border-r border-neutral-800/80 font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-300 font-medium text-xs">
                      Ask: {formatCurrency(row.buyAsk)}
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      ({row.buyAskQty || '—'}q)
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    Bid: {formatCurrency(row.buyBid)} · Sprd: {row.buySpreadPct ? `${row.buySpreadPct}%` : '—'}
                  </div>
                </td>

                {/* 3. Sell Strike & Qty */}
                <td className="py-2.5 px-3 border-r border-neutral-800/80 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-200 text-sm">
                      {row.sellStrike}
                    </span>
                    <span className="text-[11px] text-rose-400 font-semibold">
                      -{row.shortQty}x
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-500 block">
                    Actual Gap: ₹{row.actualGap} ({row.gapSteps} steps)
                  </span>
                </td>

                {/* 4. Sell Bid / Ask Depth */}
                <td className="py-2.5 px-3 border-r border-neutral-800/80 font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="text-rose-300 font-medium text-xs">
                      Bid: {formatCurrency(row.sellBid)}
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      ({row.sellBidQty || '—'}q)
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    Ask: {formatCurrency(row.sellAsk)} · Sprd: {row.sellSpreadPct ? `${row.sellSpreadPct}%` : '—'}
                  </div>
                </td>

                {/* 5. Ratio & Gap Summary */}
                <td className="py-2.5 px-2.5 text-center border-r border-neutral-800/80 font-mono">
                  <span className="px-1.5 py-0.5 bg-neutral-800 text-neutral-200 rounded text-xs font-semibold">
                    {row.ratioStr}
                  </span>
                  <span className="text-[10px] text-neutral-500 block mt-0.5">
                    {row.gapSteps} steps
                  </span>
                </td>

                {/* 6. Net Executable Entry (Primary Metric) */}
                <td className="py-2.5 px-3 text-right border-r border-neutral-800/80 font-mono">
                  {row.executableNetEntry === null ? (
                    <span className="text-neutral-500">—</span>
                  ) : (
                    <div>
                      <div
                        className={`text-sm font-bold flex items-center justify-end gap-1 ${
                          isCredit ? 'text-emerald-400' : isDebit ? 'text-amber-400' : 'text-neutral-300'
                        }`}
                      >
                        {isCredit ? (
                          <>
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>+₹{Math.abs(row.executableNetEntry).toFixed(2)}</span>
                          </>
                        ) : isDebit ? (
                          <>
                            <TrendingDown className="w-3.5 h-3.5" />
                            <span>-₹{Math.abs(row.executableNetEntry).toFixed(2)}</span>
                          </>
                        ) : (
                          <span>₹0.00</span>
                        )}
                        <span className="text-[10px] font-normal text-neutral-400">
                          {isCredit ? 'Credit' : 'Debit'}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 block">
                        Total: {isCredit ? '+' : '-'}₹
                        {Math.abs(row.executableTotalEntry || 0).toLocaleString()} / lot
                      </span>
                    </div>
                  )}
                </td>

                {/* 7. Mid Entry & Cost of Slippage */}
                <td className="py-2.5 px-3 text-right border-r border-neutral-800/80 font-mono">
                  <div className="text-xs text-neutral-200">
                    {row.midNetEntry !== null ? (
                      <span>
                        {row.midNetEntry < 0 ? '+' : '-'}₹{Math.abs(row.midNetEntry).toFixed(2)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-500 block" title="Slippage vs mid execution">
                    Slippage: ₹{(row.slippageCost || 0).toFixed(2)}
                  </span>
                </td>

                {/* 8. Max Profit */}
                <td className="py-2.5 px-3 text-right border-r border-neutral-800/80 font-mono">
                  {row.maxProfitPerShare !== null ? (
                    <div>
                      <span className="text-emerald-400 font-bold text-xs">
                        +₹{row.maxProfitPerShare.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-neutral-400 block">
                        +₹{(row.maxProfitPerLot || 0).toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    '—'
                  )}
                </td>

                {/* 9. Max Loss (Unlimited Warning) */}
                <td className="py-2.5 px-3 text-right border-r border-neutral-800/80 font-mono">
                  {row.isUnlimitedLoss ? (
                    <span className="text-rose-400 font-bold text-xs bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/70 inline-block">
                      Unlimited ⚠️
                    </span>
                  ) : (
                    <div>
                      <span className="text-rose-400 font-semibold text-xs">
                        -₹{Math.abs(Number(row.maxLossPerShare)).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-neutral-500 block">
                        -₹{Math.abs(Number(row.maxLossPerLot)).toLocaleString()}
                      </span>
                    </div>
                  )}
                </td>

                {/* 10. Breakevens */}
                <td className="py-2.5 px-3 text-center border-r border-neutral-800/80 font-mono">
                  {row.breakevens.length > 0 ? (
                    <div className="space-y-0.5">
                      {row.breakevens.map((be, i) => (
                        <span key={i} className="text-xs text-neutral-200 block">
                          ₹{Math.round(be)}{' '}
                          <span className="text-[10px] text-neutral-500">
                            ({row.breakevenDistPcts[i] >= 0 ? '+' : ''}
                            {row.breakevenDistPcts[i]}%)
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-neutral-500 text-xs">None</span>
                  )}
                </td>

                {/* 11. Net Greeks */}
                <td className="py-2.5 px-3 text-right border-r border-neutral-800/80 font-mono">
                  <div className="text-xs text-neutral-300">
                    Δ: <span className={(row.netDelta || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {(row.netDelta || 0).toFixed(3)}
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    Θ: +₹{(row.lotTheta || 0).toFixed(0)}/day
                  </div>
                </td>

                {/* 12. Implied Volatility */}
                <td className="py-2.5 px-3 text-right border-r border-neutral-800/80 font-mono">
                  <span className="text-xs text-neutral-200">
                    {row.buyIv ? `${row.buyIv}%` : '—'}
                  </span>
                  <span className="text-neutral-600 mx-1">/</span>
                  <span className="text-xs text-neutral-300">
                    {row.sellIv ? `${row.sellIv}%` : '—'}
                  </span>
                </td>

                {/* 13. Open Interest & Authentic OI Change */}
                <td className="py-2.5 px-3 text-right border-r border-neutral-800/80 font-mono">
                  <div className="text-xs text-neutral-200">
                    {formatNumber(row.buyOi)} / {formatNumber(row.sellOi)}
                  </div>
                  <div className="text-[10px] text-neutral-500">
                    Comb: {formatNumber(row.combinedOi)}
                  </div>
                </td>

                {/* 14. Volume */}
                <td className="py-2.5 px-3 text-right border-r border-neutral-800/80 font-mono">
                  <div className="text-xs text-neutral-300">
                    {formatNumber(row.combinedVolume)}
                  </div>
                </td>

                {/* 15. Action Button */}
                <td className="py-2.5 px-3 text-center">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onSelectRow(row);
                    }}
                    className="flex items-center gap-1 mx-auto px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded text-[11px] font-medium transition-colors"
                  >
                    <Eye className="w-3 h-3 text-cyan-400" />
                    <span>Payoff</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
