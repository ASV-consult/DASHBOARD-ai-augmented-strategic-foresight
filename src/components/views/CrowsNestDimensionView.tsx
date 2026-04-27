/**
 * CrowsNestDimensionView — Stream 4 Level 2 (the "why" view).
 *
 * Three blocks (per plan Part 2):
 *   1. Dimension hero card (verdict + bet + failure mode in plain English)
 *   2. Projections list (one row per projection, click → Level 3)
 *   3. Driver mini-grid (4-8 most-relevant drivers, cross-coupling badges)
 */
import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useForesight } from '@/contexts/ForesightContext';
import {
  CrowsNestDimension,
  CrowsNestProjection,
  CrowsNestDriverSummary,
  truthLikelihoodToHex,
  plainTierToBadgeClass,
  trendMarker,
} from '@/types/crows-nest';
import { ChevronLeft, ChevronRight, ArrowDown, ArrowUp, Minus, Target, AlertTriangle } from 'lucide-react';

interface CrowsNestDimensionViewProps {
  dimensionId: string;
  onSelectProjection: (projectionId: string) => void;
  onBack: () => void;
}

const inlineMd = (text: string): React.ReactElement => {
  const components: Components = {
    p: ({ children }) => <span>{children}</span>,
    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
  };
  return <ReactMarkdown components={components}>{text}</ReactMarkdown>;
};

const ProjectionRow: React.FC<{
  projection: CrowsNestProjection;
  onClick: () => void;
}> = ({ projection, onClick }) => {
  const tl = projection.current.truth_likelihood;
  const ciLow = projection.current.ci[0];
  const ciHigh = projection.current.ci[1];
  const color = truthLikelihoodToHex(tl);
  const tier = projection.current.plain_tier || projection.plain_outcome_phrase || '—';
  const badgeClass = plainTierToBadgeClass(tier);
  const trend = trendMarker(projection.history || []);

  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-xl border border-border/40 bg-background/60 p-4 text-left transition hover:border-rose-500/40 hover:bg-rose-500/[0.04]"
    >
      {/* Left: outcome label + trend */}
      <div className="flex w-32 shrink-0 flex-col gap-1">
        <span className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${badgeClass}`}>
          {projection.plain_outcome_phrase}
        </span>
        <span className={`text-xs font-semibold ${trend.color} flex items-center gap-1`}>
          <span>{trend.symbol}</span>
          <span className="text-[10px] uppercase">{trend.label}</span>
        </span>
      </div>

      {/* Middle: claim + why */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="text-sm text-foreground line-clamp-2">{projection.claim}</div>
        <div className="text-[11px] text-muted-foreground">
          Resolves {projection.resolution_date} · {projection.one_line_why}
        </div>
      </div>

      {/* Right: truth-likelihood bar */}
      <div className="w-40 shrink-0">
        <div className="flex items-center gap-2">
          {/* Bar */}
          <div className="relative flex-1 h-3 rounded-full bg-muted/30 overflow-hidden">
            {/* CI band */}
            <div
              className="absolute top-0 bottom-0 bg-slate-400/30"
              style={{
                left: `${ciLow * 100}%`,
                width: `${(ciHigh - ciLow) * 100}%`,
              }}
              aria-hidden="true"
            />
            {/* Center marker */}
            <div
              className="absolute top-0 bottom-0 w-1 rounded-full"
              style={{
                left: `calc(${tl * 100}% - 2px)`,
                backgroundColor: color,
              }}
              aria-hidden="true"
            />
          </div>
          <span className="text-xs font-medium tabular-nums text-foreground">
            {Math.round(tl * 100)}%
          </span>
        </div>
        <div className="mt-1 text-[9px] uppercase tracking-wide text-muted-foreground/70 text-right">
          likely to hold
        </div>
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition group-hover:text-rose-500" />
    </button>
  );
};

const DriverPill: React.FC<{ driver: CrowsNestDriverSummary }> = ({ driver }) => {
  const score = driver.current_state.score;
  const velocity = driver.current_state.velocity;
  const VelocityIcon = velocity > 0.05 ? ArrowUp : velocity < -0.05 ? ArrowDown : Minus;
  const velocityColor =
    velocity > 0.05 ? 'text-emerald-500' : velocity < -0.05 ? 'text-red-500' : 'text-slate-400';

  // Driver state visualization
  const scoreColor =
    score > 0.3
      ? 'bg-emerald-500'
      : score > 0.05
      ? 'bg-emerald-300'
      : score > -0.05
      ? 'bg-slate-400'
      : score > -0.3
      ? 'bg-amber-500'
      : 'bg-red-500';
  const scoreWidth = Math.abs(score) * 100;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="rounded-xl border border-border/40 bg-background/80 p-3 hover:border-rose-500/30 transition cursor-default">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="text-[11px] font-medium text-foreground line-clamp-2 flex-1">
                {driver.name}
              </div>
              <VelocityIcon className={`h-3 w-3 shrink-0 ${velocityColor}`} />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative h-1.5 rounded-full bg-muted/30 overflow-hidden">
                <div
                  className={`absolute top-0 bottom-0 ${scoreColor}`}
                  style={{
                    width: `${scoreWidth}%`,
                    left: score >= 0 ? '50%' : `${50 - scoreWidth}%`,
                  }}
                  aria-hidden="true"
                />
                {/* Center line */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-muted-foreground/30"
                  style={{ left: '50%' }}
                  aria-hidden="true"
                />
              </div>
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {score > 0 ? '+' : ''}
                {score.toFixed(2)}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1">
              <span className="text-[9px] uppercase tracking-wide text-muted-foreground/60">
                {driver.category}
              </span>
              {driver.cross_dimensions.length > 0 ? (
                <span className="text-[9px] rounded-full border border-rose-500/30 bg-rose-500/[0.06] px-1.5 py-0.5 text-rose-600 dark:text-rose-300">
                  ★ {driver.cross_dimensions.join(', ')}
                </span>
              ) : null}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          <div className="font-medium mb-1">{driver.name}</div>
          <div className="text-muted-foreground">
            State: <span className="font-mono">{score > 0 ? '+' : ''}{score.toFixed(2)}</span> ·
            velocity <span className="font-mono">{velocity > 0 ? '+' : ''}{velocity.toFixed(2)}</span>
          </div>
          {driver.cross_dimensions.length > 0 ? (
            <div className="text-muted-foreground/80 mt-1">
              Also affects: {driver.cross_dimensions.join(', ')} (★ cross-coupling driver)
            </div>
          ) : null}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const CrowsNestDimensionView: React.FC<CrowsNestDimensionViewProps> = ({
  dimensionId,
  onSelectProjection,
  onBack,
}) => {
  const { crowsNestData } = useForesight();
  if (!crowsNestData) return null;

  const dim: CrowsNestDimension | undefined = crowsNestData.dimensions.find(
    (d) => d.id === dimensionId,
  );
  if (!dim) {
    return (
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04]">
        <CardContent className="p-8">
          <p className="text-sm text-muted-foreground">Dimension not found.</p>
          <button onClick={onBack} className="mt-3 text-xs text-rose-500 hover:underline">
            ← Back to velocity grid
          </button>
        </CardContent>
      </Card>
    );
  }

  // Sort projections by current truth-likelihood (most concerning first)
  const sortedProjections = [...dim.projections].sort(
    (a, b) => a.current.truth_likelihood - b.current.truth_likelihood,
  );

  return (
    <div className="space-y-5">
      {/* Back link */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-rose-500 transition"
      >
        <ChevronLeft className="h-3 w-3" />
        back to velocity grid
      </button>

      {/* === Block 1: Dimension hero card === */}
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04] shadow-sm">
        <CardContent className="p-6 md:p-8 space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-rose-500/10 p-2">
              <Target className="h-5 w-5 text-rose-500" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${plainTierToBadgeClass(dim.current.plain_tier || dim.plain_state)}`}>
                  {dim.current.plain_tier || dim.plain_state}
                </span>
                <span className="text-xs text-muted-foreground">
                  {Math.round(dim.current.truth_likelihood * 100)}% likely the bet holds (cycle {dim.current.as_of})
                </span>
              </div>
              <h2 className="text-2xl font-semibold text-foreground leading-tight">{dim.name}</h2>
              <div className="text-base text-foreground leading-relaxed">
                {inlineMd(dim.verdict_sentence)}
              </div>
              <div className="text-sm text-muted-foreground leading-relaxed">{dim.one_line_why}</div>
            </div>
          </div>

          {/* What the company is betting */}
          <div className="grid gap-3 md:grid-cols-2 pt-2 border-t border-rose-500/10">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
              <div className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300 font-semibold mb-1">
                What the company is betting on
              </div>
              <div className="text-xs text-foreground leading-relaxed">{dim.implicit_bet}</div>
            </div>
            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-3">
              <div className="text-[10px] uppercase tracking-wide text-red-700 dark:text-red-300 font-semibold mb-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                If this goes wrong
              </div>
              <div className="text-xs text-foreground leading-relaxed">{dim.asymmetric_failure_mode}</div>
            </div>
          </div>

          {/* Suggested next click */}
          {dim.suggested_next_click ? (
            <div className="text-xs italic text-rose-600 dark:text-rose-300">
              💡 {dim.suggested_next_click}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* === Block 2: Projections list === */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            The {dim.projections.length} bets under this dimension
          </h3>
          <span className="text-xs text-muted-foreground/70">sorted: most-concerning first</span>
        </div>
        <div className="space-y-2">
          {sortedProjections.map((p) => (
            <ProjectionRow
              key={p.id}
              projection={p}
              onClick={() => onSelectProjection(p.id)}
            />
          ))}
        </div>
      </div>

      {/* === Block 3: Driver mini-grid === */}
      {dim.driver_summaries && dim.driver_summaries.length > 0 ? (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              The drivers moving this dimension
            </h3>
            <span className="text-xs text-muted-foreground/70">
              ★ = also affects another dimension
            </span>
          </div>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {dim.driver_summaries.map((d) => (
              <DriverPill key={d.id} driver={d} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
