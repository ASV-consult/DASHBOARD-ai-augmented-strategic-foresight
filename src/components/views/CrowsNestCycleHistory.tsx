/**
 * CrowsNestCycleHistory — Phase I view.
 *
 * Chronological book of cycle ledger entries with:
 *   - Top strip: aggregate stats (cycles to date, total projection moves, total
 *     theme shifts, mean per-cycle move count)
 *   - Per-cycle row: date + mode + headline + counts of projections / themes moved
 *     + which exec paper exists
 *   - Click a cycle → expand to show full delta list (per projection + per theme)
 *     and a deep-link to that cycle's executive paper
 *
 * This is the trust layer — the user (or the user's manager) can see the system
 * has a verifiable track record of what changed, in what order, and why.
 */
import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useForesight } from '@/contexts/ForesightContext';
import { CycleHistoryEntry } from '@/types/crows-nest';
import {
  History,
  ChevronRight,
  ChevronDown,
  ArrowDown,
  ArrowUp,
  Minus,
  FileText,
  Calendar,
} from 'lucide-react';

interface Props {
  onSelectProjection?: (id: string) => void;
  onOpenExecutivePaper?: (cycleDate: string) => void;
}

export const CrowsNestCycleHistory: React.FC<Props> = ({ onSelectProjection, onOpenExecutivePaper }) => {
  const { crowsNestData } = useForesight();
  const cycles = (crowsNestData?.cycle_history || []).slice().sort(
    (a, b) => (b.cycle_date || '').localeCompare(a.cycle_date || ''),
  );
  const papers = crowsNestData?.executive_papers || [];
  const papersByDate = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const p of papers) m[p.cycle_date] = true;
    return m;
  }, [papers]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (!crowsNestData) {
    return (
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04]">
        <CardContent className="p-8">
          <p className="text-sm text-muted-foreground">No data loaded.</p>
        </CardContent>
      </Card>
    );
  }

  if (cycles.length === 0) {
    return (
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04]">
        <CardContent className="p-8 space-y-3">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-rose-500/10 p-2">
              <History className="h-5 w-5 text-rose-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Cycle History — empty</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                No cycle entries on file yet. Run the cycle pipeline (cycle_pipeline.py record-cycle)
                to populate the chronological book.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Aggregate stats
  const totalProjMoves = cycles.reduce((s, c) => s + (c.n_projections_moved || 0), 0);
  const totalThemeMoves = cycles.reduce((s, c) => s + (c.n_themes_moved || 0), 0);

  return (
    <div className="space-y-5">
      {/* Hero / aggregate stats */}
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04] shadow-sm">
        <CardContent className="p-6 md:p-8 space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-rose-500/10 p-2">
              <History className="h-5 w-5 text-rose-500" />
            </div>
            <div className="flex-1 space-y-2">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground leading-snug">
                Cycle History — the system's track record
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every cycle that landed evidence and moved a bet shows up here, in chronological
                order. Each entry links to its Executive Paper (if generated) and lets you drill
                into the per-projection and per-theme deltas. This is the trust layer: a verifiable
                record of what changed and why, cycle by cycle.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-rose-500/10">
                <Stat label="Cycles" value={String(cycles.length)} />
                <Stat label="Projection moves" value={String(totalProjMoves)} />
                <Stat label="Theme moves" value={String(totalThemeMoves)} />
                <Stat label="Latest" value={cycles[0].cycle_date} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cycle list */}
      <div className="space-y-2">
        {cycles.map((c) => (
          <CycleRow
            key={c.cycle_date + (c.ts || '')}
            cycle={c}
            hasExecutivePaper={!!papersByDate[c.cycle_date]}
            isExpanded={!!expanded[c.cycle_date + (c.ts || '')]}
            onToggle={() =>
              setExpanded((s) => ({
                ...s,
                [c.cycle_date + (c.ts || '')]: !s[c.cycle_date + (c.ts || '')],
              }))
            }
            onOpenPaper={() => onOpenExecutivePaper?.(c.cycle_date)}
            onSelectProjection={onSelectProjection}
          />
        ))}
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg border border-border/40 bg-background/50 p-3">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-base font-semibold text-foreground tabular-nums">{value}</div>
  </div>
);

const CycleRow: React.FC<{
  cycle: CycleHistoryEntry;
  hasExecutivePaper: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onOpenPaper: () => void;
  onSelectProjection?: (id: string) => void;
}> = ({ cycle, hasExecutivePaper, isExpanded, onToggle, onOpenPaper, onSelectProjection }) => {
  const direction = aggregateDirection(cycle.projection_deltas || []);
  const dirIcon = direction > 0.005 ? ArrowUp : direction < -0.005 ? ArrowDown : Minus;
  const Icon = dirIcon;
  const dirTone =
    direction > 0.005
      ? 'text-emerald-700 dark:text-emerald-300'
      : direction < -0.005
      ? 'text-rose-700 dark:text-rose-300'
      : 'text-muted-foreground';

  return (
    <Card className="rounded-2xl border-border/40">
      <CardContent className="p-4">
        <button onClick={onToggle} className="w-full flex items-start gap-3 text-left group">
          <div className="mt-0.5 text-muted-foreground">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-full border border-rose-500/30 bg-rose-500/[0.06] px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:text-rose-300 inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {cycle.cycle_date}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{cycle.mode}</span>
              <span className="text-xs text-muted-foreground">
                · {cycle.n_projections_moved} bet{cycle.n_projections_moved === 1 ? '' : 's'} moved
                {cycle.n_themes_moved > 0 ? ` · ${cycle.n_themes_moved} theme${cycle.n_themes_moved === 1 ? '' : 's'} moved` : ''}
              </span>
              <span className={`ml-auto inline-flex items-center gap-1 ${dirTone}`}>
                <Icon className="h-3.5 w-3.5" />
                <span className="text-xs tabular-nums">
                  net {direction > 0 ? '+' : ''}{Math.round(direction * 100)}pp avg
                </span>
              </span>
            </div>
            {cycle.summary ? (
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">{cycle.summary}</p>
            ) : null}
          </div>
        </button>

        {isExpanded ? (
          <div className="mt-4 pt-3 border-t border-border/30 space-y-3">
            {/* Projection deltas */}
            {cycle.projection_deltas?.length > 0 ? (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">
                  Projection deltas
                </div>
                <div className="space-y-1">
                  {cycle.projection_deltas.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => onSelectProjection?.(d.id)}
                      className="w-full flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-background/40 px-3 py-2 text-xs hover:bg-rose-500/[0.04] transition text-left"
                    >
                      <span className="font-mono text-muted-foreground/80">{d.id}</span>
                      <span className="tabular-nums">
                        <span className="text-muted-foreground">{Math.round((d.before || 0) * 100)}%</span>
                        <span className="mx-1.5 text-muted-foreground/40">→</span>
                        <span className="font-medium text-foreground">{Math.round((d.after || 0) * 100)}%</span>
                        {(() => {
                          const δ = (d.after || 0) - (d.before || 0);
                          const t = Math.abs(δ) < 0.005 ? 'text-muted-foreground' : δ > 0 ? 'text-emerald-600' : 'text-rose-600';
                          return (
                            <span className={`ml-2 ${t}`}>
                              ({δ > 0 ? '+' : ''}{Math.round(δ * 100)}pp)
                            </span>
                          );
                        })()}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Theme deltas */}
            {cycle.themes_touched?.length > 0 ? (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">
                  Macro theme shifts
                </div>
                <div className="space-y-1">
                  {cycle.themes_touched.map((t) => {
                    const δ = (t.after || 0) - (t.before || 0);
                    const tone = Math.abs(δ) < 0.005 ? 'text-muted-foreground' : δ > 0 ? 'text-emerald-600' : 'text-rose-600';
                    return (
                      <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.03] px-3 py-2 text-xs">
                        <span className="font-mono text-muted-foreground/80">{t.id}</span>
                        <span className="tabular-nums">
                          <span className="text-muted-foreground">{Math.round((t.before || 0) * 100)}%</span>
                          <span className="mx-1.5 text-muted-foreground/40">→</span>
                          <span className="font-medium text-foreground">{Math.round((t.after || 0) * 100)}%</span>
                          <span className={`ml-2 ${tone}`}>
                            ({δ > 0 ? '+' : ''}{Math.round(δ * 100)}pp)
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Executive paper link */}
            <div className="flex items-center gap-2">
              {hasExecutivePaper ? (
                <button
                  onClick={onOpenPaper}
                  className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/[0.06] px-3 py-1 text-xs text-rose-700 dark:text-rose-300 hover:bg-rose-500/[0.12] transition"
                >
                  <FileText className="h-3 w-3" />
                  Open this cycle's Executive Paper
                </button>
              ) : (
                <span className="text-[10px] text-muted-foreground italic">
                  No Executive Paper generated for this cycle yet.
                </span>
              )}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

function aggregateDirection(deltas: Array<{ before?: number; after?: number }>): number {
  if (!deltas.length) return 0;
  let s = 0;
  let n = 0;
  for (const d of deltas) {
    if (typeof d.before === 'number' && typeof d.after === 'number') {
      s += d.after - d.before;
      n += 1;
    }
  }
  return n > 0 ? s / n : 0;
}
