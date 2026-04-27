/**
 * VelocityGrid — the headline visualisation for Stream 4.
 *
 * 8 rows × N columns. Each row = a strategic dimension. Each column = a quarterly
 * cycle. Cell color encodes truth-likelihood. The default visual carries ZERO
 * numerals — numbers appear only in the hover tooltip.
 *
 * Design rules (from plan Part 5):
 * - Color is the answer; reading text is optional.
 * - One trend marker per row on the right, in plain-language taxonomy.
 * - Click any row → navigate to dimension drill-down.
 * - Forecast trail shown after a vertical "today" line, dashed-style cells.
 */
import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  CrowsNestDimension,
  truthLikelihoodToHex,
  trendMarker,
  plainTierToBadgeClass,
} from '@/types/crows-nest';
import { ChevronRight } from 'lucide-react';

interface VelocityGridProps {
  dimensions: CrowsNestDimension[];
  onRowClick?: (dimensionId: string) => void;
  /** How many trailing history quarters to show (default 8). */
  historyWindow?: number;
}

interface CellPoint {
  cycle_date: string;
  truth_likelihood: number;
  isForecast: boolean;
  ci_low?: number;
  ci_high?: number;
}

function buildCells(dim: CrowsNestDimension, historyWindow: number): CellPoint[] {
  const history = (dim.history || []).slice(-historyWindow);
  const cells: CellPoint[] = history.map((h) => ({
    cycle_date: h.cycle_date,
    truth_likelihood: (h.aggregate_truth_likelihood ?? h.truth_likelihood ?? 0.5) as number,
    isForecast: false,
  }));
  // Append forecast trajectory
  for (const f of dim.forecast_trajectory || []) {
    cells.push({
      cycle_date: f.cycle_date,
      truth_likelihood: f.truth_likelihood,
      isForecast: true,
      ci_low: f.ci_low,
      ci_high: f.ci_high,
    });
  }
  return cells;
}

function formatPct(tl: number): string {
  return `${Math.round(tl * 100)}%`;
}

const VelocityGridCell: React.FC<{ cell: CellPoint }> = ({ cell }) => {
  const color = truthLikelihoodToHex(cell.truth_likelihood);
  const heightPct = Math.max(20, Math.min(100, cell.truth_likelihood * 100));
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`relative flex h-8 w-full items-end justify-center rounded-sm transition-opacity ${
              cell.isForecast ? 'opacity-60 ring-1 ring-dashed ring-muted-foreground/20' : ''
            }`}
            style={{ minWidth: 14 }}
          >
            <div
              className="w-full rounded-sm"
              style={{
                backgroundColor: color,
                height: `${heightPct}%`,
                opacity: cell.isForecast ? 0.55 : 0.9,
              }}
              aria-hidden="true"
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="font-medium">{cell.cycle_date}</div>
          <div className="text-muted-foreground">
            {cell.isForecast ? 'forecast' : 'historical'} · {formatPct(cell.truth_likelihood)} likely the bet holds
          </div>
          {cell.isForecast && cell.ci_low !== undefined && cell.ci_high !== undefined ? (
            <div className="text-muted-foreground/70 text-[10px]">
              uncertainty band: {formatPct(cell.ci_low)}–{formatPct(cell.ci_high)}
            </div>
          ) : null}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const VelocityGrid: React.FC<VelocityGridProps> = ({
  dimensions,
  onRowClick,
  historyWindow = 8,
}) => {
  if (!dimensions || dimensions.length === 0) {
    return (
      <div className="rounded-2xl border border-border/40 bg-muted/20 p-8 text-sm text-muted-foreground">
        No dimensions to display yet. Upload a Crow's Nest bundle JSON to see the velocity grid.
      </div>
    );
  }

  // Find the "today" boundary — last historical cycle index relative to total cells
  const sampleDim = dimensions[0];
  const totalHistoricalCells = Math.min((sampleDim.history || []).length, historyWindow);

  return (
    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.03] dark:bg-rose-500/[0.05] p-4 md:p-6">
      {/* Column header: cycle dates */}
      <div className="mb-3 grid grid-cols-[200px_1fr_72px] items-center gap-3 text-[10px] uppercase tracking-wide text-muted-foreground/70">
        <div>Bet</div>
        <div className="grid items-center gap-1" style={{ gridTemplateColumns: `repeat(${(sampleDim.history?.slice(-historyWindow).length || 0) + (sampleDim.forecast_trajectory?.length || 0)}, minmax(14px, 1fr))` }}>
          <div className="col-span-full flex justify-between text-[10px]">
            <span>← {historyWindow} cycles back</span>
            <span className="text-rose-500/80 font-medium">today</span>
            <span>forecast →</span>
          </div>
        </div>
        <div className="text-right">trend</div>
      </div>

      <div className="space-y-2">
        {dimensions.map((dim) => {
          const cells = buildCells(dim, historyWindow);
          const trend = trendMarker(dim.history || []);
          const plainTier = dim.current?.plain_tier || dim.plain_state || '—';
          const badgeClass = plainTierToBadgeClass(plainTier);

          return (
            <button
              key={dim.id}
              onClick={() => onRowClick?.(dim.id)}
              className="group grid w-full grid-cols-[200px_1fr_72px] items-center gap-3 rounded-xl border border-transparent p-2 text-left transition hover:border-rose-500/30 hover:bg-rose-500/[0.04]"
            >
              {/* Left: dimension name + plain-tier badge */}
              <div className="flex flex-col gap-1.5 pr-2">
                <div className="text-sm font-medium leading-tight text-foreground line-clamp-2">
                  {dim.name}
                </div>
                <div className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${badgeClass}`}>
                  {plainTier}
                </div>
              </div>

              {/* Middle: the cell row */}
              <div
                className="grid items-end gap-1 relative"
                style={{ gridTemplateColumns: `repeat(${cells.length || 1}, minmax(14px, 1fr))` }}
              >
                {cells.map((cell, idx) => (
                  <VelocityGridCell key={`${dim.id}-${idx}`} cell={cell} />
                ))}
                {/* "Today" divider — vertical line between historical and forecast cells */}
                {totalHistoricalCells > 0 && cells.some((c) => c.isForecast) ? (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-rose-500/40"
                    style={{
                      left: `calc(${(totalHistoricalCells / cells.length) * 100}% - 0.5px)`,
                      pointerEvents: 'none',
                    }}
                    aria-hidden="true"
                  />
                ) : null}
              </div>

              {/* Right: trend marker + chevron */}
              <div className="flex items-center justify-end gap-1.5">
                <span className={`text-base font-semibold ${trend.color}`}>{trend.symbol}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition group-hover:text-rose-500" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-rose-500/10 pt-3 text-[10px] text-muted-foreground">
        <span className="font-medium text-muted-foreground/80">Color =</span>
        <div className="flex items-center gap-1.5">
          <span className="block h-3 w-3 rounded-sm" style={{ background: '#ef4444' }} />
          <span>breaking</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="block h-3 w-3 rounded-sm" style={{ background: '#f59e0b' }} />
          <span>drifting</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="block h-3 w-3 rounded-sm" style={{ background: '#94a3b8' }} />
          <span>mixed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="block h-3 w-3 rounded-sm" style={{ background: '#10b981' }} />
          <span>holding</span>
        </div>
        <span className="ml-auto text-muted-foreground/60">hover any cell for the number</span>
      </div>
    </div>
  );
};
