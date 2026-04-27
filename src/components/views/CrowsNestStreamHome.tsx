/**
 * CrowsNestStreamHome — Stream 4 Level 1 page (the 30-second read).
 *
 * Three blocks, top-to-bottom:
 *   1. Headline verdict strip (1-2 plain-language sentences)
 *   2. The 8-dimension velocity grid (the headline visualisation)
 *   3. Honesty gauge (Brier score, plain-language interpretation)
 *
 * Per the clarity directive (plan Part 2):
 *   - Verdict-first, numbers-second
 *   - No jargon in headlines
 *   - Numbers visible only in tooltips / expanded blocks
 */
import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useForesight } from '@/contexts/ForesightContext';
import { VelocityGrid } from '@/components/crows-nest/VelocityGrid';
import { Radio, AlertTriangle, Gauge, Info } from 'lucide-react';

interface CrowsNestStreamHomeProps {
  onSelectDimension: (dimensionId: string) => void;
  onSelectCalibration?: () => void;
}

/** Render a string with **bold** segments using react-markdown, styled inline. */
const inlineMd = (text: string): React.ReactElement => {
  const components: Components = {
    p: ({ children }) => <span>{children}</span>,
    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
  };
  return <ReactMarkdown components={components}>{text}</ReactMarkdown>;
};

export const CrowsNestStreamHome: React.FC<CrowsNestStreamHomeProps> = ({
  onSelectDimension,
  onSelectCalibration,
}) => {
  const { crowsNestData } = useForesight();

  if (!crowsNestData) {
    return (
      <div className="rounded-3xl border border-rose-500/20 bg-rose-500/[0.04] p-8 text-center">
        <Radio className="mx-auto mb-3 h-10 w-10 text-rose-500" />
        <h2 className="text-xl font-semibold text-foreground">Crow's Nest is empty</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          Upload a Crow's Nest bundle JSON (produced by{' '}
          <code className="text-xs rounded bg-muted/40 px-1 py-0.5">build_dashboard_bundle.py</code>) to see
          the velocity grid, dimension drill-downs, and macro radar.
        </p>
      </div>
    );
  }

  const { headline, dimensions, calibration, meta } = crowsNestData;

  // Build a quick stat for the right side of the gauge
  const brierVerdict = (() => {
    const b = calibration.overall_brier;
    if (b === null || b === undefined) return { label: 'Pending', color: 'text-muted-foreground' };
    if (b < 0.18) return { label: 'Well-calibrated', color: 'text-emerald-600 dark:text-emerald-400' };
    if (b < 0.25) return { label: 'Better than random', color: 'text-amber-600 dark:text-amber-400' };
    return { label: 'Worse than random', color: 'text-red-600 dark:text-red-400' };
  })();

  return (
    <div className="space-y-6">
      {/* === Block 1: Headline verdict strip === */}
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04] shadow-sm">
        <CardContent className="p-6 md:p-8 space-y-4">
          {/* Verdict (the loudest text on the page) */}
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-rose-500/10 p-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="text-xl md:text-2xl font-semibold text-foreground leading-snug">
                {inlineMd(headline.verdict_sentence)}
              </div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                {inlineMd(headline.early_warning_phrase)}
              </div>
            </div>
          </div>

          {/* Tier-changes-this-cycle (only if any) */}
          {headline.tier_changes_this_cycle.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-rose-500/10">
              <span className="text-xs uppercase tracking-wide text-muted-foreground/70">
                Changes this cycle:
              </span>
              {headline.tier_changes_this_cycle.map((tc) => {
                const dim = dimensions.find((d) => d.id === tc.dimension_id);
                return (
                  <button
                    key={tc.dimension_id}
                    onClick={() => onSelectDimension(tc.dimension_id)}
                    className="text-xs rounded-full border border-rose-500/30 bg-rose-500/[0.06] px-3 py-1 text-rose-600 hover:bg-rose-500/[0.10] dark:text-rose-300 transition"
                  >
                    {dim?.name || tc.dimension_id}: {tc.plain_change_phrase}
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* Cycle metadata (small, secondary) */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
            <span className="font-medium">{meta.company} · {meta.ticker}</span>
            <span className="text-muted-foreground/40">·</span>
            <span>cycle {meta.cycle_date}</span>
            <span className="text-muted-foreground/40">·</span>
            <span>{headline.raw.dimensions_total} bets tracked</span>
          </div>
        </CardContent>
      </Card>

      {/* === Block 2: Velocity grid (the headline visualisation) === */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Velocity grid
          </h3>
          <span className="text-xs text-muted-foreground/70">
            click any row for the why ↓
          </span>
        </div>
        <VelocityGrid dimensions={dimensions} onRowClick={onSelectDimension} />
      </div>

      {/* === Block 3: Honesty gauge (the credibility anchor) === */}
      <Card className="rounded-3xl border-border/50 bg-card/50 shadow-sm">
        <CardContent className="p-6 flex items-start gap-4">
          <div className="rounded-full bg-muted/40 p-2">
            <Gauge className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground/70">
              <span>How accurate has this system been?</span>
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground/50" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    Brier score = mean squared error of past forecasts vs actual outcomes. 0.00 is perfect; 0.25 is random; lower is better.
                    Computed on {calibration.n_forecasts} historical forecasts.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="text-base text-foreground leading-snug">
              {inlineMd(headline.honesty_sentence)}
            </div>
            {onSelectCalibration ? (
              <button
                onClick={onSelectCalibration}
                className="mt-1 text-xs text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 transition underline-offset-2 hover:underline"
              >
                See the full calibration breakdown →
              </button>
            ) : null}
          </div>
          <div className="text-right">
            <div className={`text-2xl font-semibold ${brierVerdict.color}`}>
              {calibration.overall_brier !== null && calibration.overall_brier !== undefined
                ? calibration.overall_brier.toFixed(2)
                : '—'}
            </div>
            <div className={`text-xs uppercase tracking-wide ${brierVerdict.color}`}>
              {brierVerdict.label}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
