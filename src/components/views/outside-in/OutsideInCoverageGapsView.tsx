/**
 * OutsideInCoverageGapsView — STEEPLE pillars with no drivers tracked, plus
 * sub-axis remaining_subgaps within thinly-covered pillars. Surfaces blind
 * spots in the current driver universe.
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useForesight } from '@/contexts/ForesightContext';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

const PILLAR_LABEL: Record<string, string> = {
  Social: 'Social',
  Technology: 'Technology',
  Economic: 'Economic',
  Environmental: 'Environmental',
  Political_Legal: 'Political-Legal',
  Ethical: 'Ethical',
};

const coverageTone = (cov?: string) => {
  if (!cov) return 'border-slate-400/30 bg-slate-400/[0.05]';
  const c = cov.toLowerCase();
  if (c.includes('gap')) return 'border-rose-500/40 bg-rose-500/[0.06]';
  if (c.includes('thin')) return 'border-amber-500/40 bg-amber-500/[0.05]';
  if (c.includes('narrow')) return 'border-amber-500/40 bg-amber-500/[0.04]';
  if (c.includes('moderate')) return 'border-blue-500/30 bg-blue-500/[0.04]';
  if (c.includes('good')) return 'border-emerald-500/40 bg-emerald-500/[0.04]';
  return 'border-slate-400/30 bg-slate-400/[0.05]';
};

export const OutsideInCoverageGapsView: React.FC = () => {
  const { crowsNestV2Data } = useForesight();
  const oi = crowsNestV2Data?.outside_in;
  if (!oi) {
    return (
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04]">
        <CardContent className="p-8">
          <p className="text-sm text-muted-foreground">Outside-In data not loaded.</p>
        </CardContent>
      </Card>
    );
  }

  const cg = oi.coverage_gaps;
  // Use either top-level pillar_coverage_assessment or summary_by_pillar shape
  const pillarMap =
    (cg?.summary_by_pillar as Record<string, { active?: string[]; watching?: string[]; coverage?: string; remaining_subgaps?: string[] }> | undefined) ||
    (cg?.pillar_coverage_assessment as Record<string, { active_drivers?: string[]; coverage?: string; note?: string; remaining_subgaps?: string[] }> | undefined) ||
    (oi.pillar_coverage_assessment as Record<string, { active_drivers?: string[]; coverage?: string; note?: string; remaining_subgaps?: string[] }> | undefined) ||
    {};

  const deferrals = cg?.explicit_deferrals;
  const sweepSeed = cg?.open_sweep_seed_terms_for_unauthored_pillars;

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/40">
        <CardContent className="space-y-2 p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ShieldAlert className="h-5 w-5 text-rose-500" />
            Coverage Gaps
          </h2>
          <p className="text-sm text-muted-foreground">
            STEEPLE pillars with no drivers tracked + sub-axis sub-gaps in thinly-covered pillars.
            These are the radar's <strong>known unknowns</strong>: signals that, if Open Sweep flagged
            multiple hits, would prompt seed-list expansion in the next cycle.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {Object.entries(pillarMap).map(([pillar, info]) => {
          const cov = (info as { coverage?: string }).coverage ?? 'unknown';
          const subgaps = (info as { remaining_subgaps?: string[] }).remaining_subgaps ?? [];
          const active = ((info as { active?: string[]; active_drivers?: string[] }).active ??
            (info as { active_drivers?: string[] }).active_drivers ?? []) as string[];
          const watching = ((info as { watching?: string[] }).watching ?? []) as string[];
          return (
            <Card key={pillar} className={`rounded-2xl border ${coverageTone(cov)}`}>
              <CardContent className="space-y-2 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">{PILLAR_LABEL[pillar] ?? pillar}</h3>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {cov}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <span>
                    <strong>Active:</strong> {active.length ? active.join(', ') : '—'}
                  </span>
                  {watching.length > 0 && (
                    <span>
                      <strong>Watching:</strong> {watching.join(', ')}
                    </span>
                  )}
                </div>
                {subgaps.length > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Remaining sub-gaps
                    </p>
                    <ul className="space-y-0.5 text-xs">
                      {subgaps.map((s, i) => (
                        <li key={i} className="text-foreground/80">· {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(info as { note?: string }).note && (
                  <p className="text-[11px] italic text-muted-foreground">
                    {(info as { note?: string }).note}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {deferrals && Object.keys(deferrals).length > 0 && (
        <Card className="rounded-2xl border-amber-500/30 bg-amber-500/[0.04]">
          <CardContent className="space-y-3 p-5">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Explicit deferrals (decided not-to-seed)
            </h3>
            {Object.entries(deferrals).map(([key, info]) => (
              <div key={key} className="rounded-md border border-amber-500/20 bg-amber-500/[0.03] p-3 text-xs">
                <p className="font-medium">{key}</p>
                <p className="mt-1 text-muted-foreground">
                  Decided {info.decided_at} by {info.by} — {info.decision}
                </p>
                {info.rationale && <p className="mt-1">{info.rationale}</p>}
                {info.unauthored_candidates && info.unauthored_candidates.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] font-semibold uppercase">Unauthored candidates</p>
                    <ul className="ml-2 mt-1 space-y-0.5">
                      {info.unauthored_candidates.map((c, i) => (
                        <li key={i}>· {c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {sweepSeed && sweepSeed.length > 0 && (
        <Card className="rounded-2xl border-border/40">
          <CardContent className="space-y-2 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Open Sweep seed terms (for unauthored sub-gaps)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {sweepSeed.map((t, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">
                  {t}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
