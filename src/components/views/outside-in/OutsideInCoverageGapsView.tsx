/**
 * OutsideInCoverageGapsView — Decisions Log.
 *
 * Narrow governance view that tracks the Outside-In radar's *decisions*:
 *   - Promotion proposals     — drivers that crossed thresholds this cycle and
 *                               are waiting for a promote-to-active decision.
 *   - Explicit deferrals      — decisions to NOT seed certain pillars/candidates,
 *                               with rationale and decision metadata.
 *   - Open Sweep seed terms   — governance over what the autonomous pipeline
 *                               actively scans for in unauthored areas.
 *
 * Pillar-by-pillar coverage assessment was previously in this view; that
 * content now lives in the STEEPLE Tree view (Option B IA cleanup, 2026-05-06).
 * This page narrows to *decision artefacts only*.
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useForesight } from '@/contexts/ForesightContext';
import { ScrollText, AlertTriangle, ArrowUpCircle, Search } from 'lucide-react';

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
  const deferrals = cg?.explicit_deferrals;
  const sweepSeed = cg?.open_sweep_seed_terms_for_unauthored_pillars;
  const promotions = oi.promotion_proposals ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="rounded-2xl border-border/40">
        <CardContent className="space-y-2 p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ScrollText className="h-5 w-5 text-rose-500" />
            Decisions Log
          </h2>
          <p className="text-sm text-muted-foreground">
            Governance trail for the Outside-In radar: pending promotion proposals, explicit
            deferral decisions, and seed terms governing autonomous research. For pillar-by-pillar
            coverage and sub-gap visibility, see <strong>STEEPLE Tree</strong>.
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
              {promotions.length} promotion {promotions.length === 1 ? 'proposal' : 'proposals'}
            </Badge>
            <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300">
              {Object.keys(deferrals ?? {}).length} deferral {Object.keys(deferrals ?? {}).length === 1 ? 'decision' : 'decisions'}
            </Badge>
            <Badge variant="outline" className="border-slate-400/40 text-slate-700 dark:text-slate-300">
              {sweepSeed?.length ?? 0} sweep seed terms
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Promotion proposals */}
      <Card className="rounded-2xl border-emerald-500/30 bg-emerald-500/[0.03]">
        <CardContent className="space-y-3 p-5">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
            Promotion proposals — pending review
          </h3>
          {promotions.length === 0 ? (
            <p className="text-xs italic text-muted-foreground">
              No drivers are currently flagged for promotion. The cycle engine raises a proposal
              when a Watching driver's truth_likelihood crosses the promotion threshold.
            </p>
          ) : (
            <div className="space-y-2">
              {promotions.map((p, i) => {
                const cs = p.current_state_at_proposal as { truth_likelihood?: number; tier?: string; trajectory?: string; as_of?: string } | undefined;
                const tl = cs?.truth_likelihood;
                const sa = p.supporting_aggregate as { n_evidence_rows?: number; cycle_score?: number; summed_score?: number; directional_breakdown?: { '+': number; '-': number; o: number } } | undefined;
                return (
                  <div key={`${p.driver_id}-${i}`} className="rounded-md border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-emerald-500/40 text-[10px] text-emerald-700 dark:text-emerald-300">
                        {p.driver_id}
                      </Badge>
                      <Badge variant="outline" className="border-emerald-500/40 text-[10px] text-emerald-700 dark:text-emerald-300">
                        {p.proposal}
                      </Badge>
                      {tl != null && (
                        <Badge variant="outline" className="border-emerald-500/40 text-[10px] text-emerald-700 dark:text-emerald-300">
                          TL {Number(tl).toFixed(3)}
                        </Badge>
                      )}
                      {cs?.trajectory && (
                        <Badge variant="outline" className="border-emerald-500/40 text-[10px] text-emerald-700 dark:text-emerald-300">
                          {cs.trajectory}
                        </Badge>
                      )}
                      {sa?.n_evidence_rows != null && (
                        <Badge variant="outline" className="border-slate-400/40 text-[10px] text-slate-700 dark:text-slate-300">
                          {sa.n_evidence_rows} evidence rows
                        </Badge>
                      )}
                      {sa?.cycle_score != null && (
                        <Badge variant="outline" className="border-slate-400/40 text-[10px] text-slate-700 dark:text-slate-300">
                          cycle score {sa.cycle_score.toFixed(3)}
                        </Badge>
                      )}
                    </div>
                    {p.rationale && (
                      <div className="mt-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Rationale</p>
                        <p className="mt-0.5 text-sm leading-relaxed">{p.rationale}</p>
                      </div>
                    )}
                    {p.review_action_required && (
                      <div className="mt-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Action required</p>
                        <p className="mt-0.5 text-sm leading-relaxed">{p.review_action_required}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Explicit deferrals */}
      <Card className="rounded-2xl border-amber-500/30 bg-amber-500/[0.04]">
        <CardContent className="space-y-3 p-5">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Explicit deferrals — decided not-to-seed
          </h3>
          {!deferrals || Object.keys(deferrals).length === 0 ? (
            <p className="text-xs italic text-muted-foreground">
              No active deferrals. A deferral is recorded when a pillar or candidate is
              consciously deprioritised; it can be revisited if Open Sweep flags hits in the area.
            </p>
          ) : (
            Object.entries(deferrals).map(([key, info]) => (
              <div key={key} className="rounded-md border border-amber-500/20 bg-amber-500/[0.03] p-3 text-xs">
                <p className="font-medium capitalize">{key.replace(/_/g, ' ')}</p>
                <p className="mt-1 text-muted-foreground">
                  {info.decision ?? 'deferred'} · {info.decided_at ?? 'date n/a'} · by {info.by ?? 'n/a'}
                </p>
                {info.rationale && (
                  <p className="mt-2 leading-relaxed">{info.rationale}</p>
                )}
                {info.unauthored_candidates && info.unauthored_candidates.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Unauthored candidates ({info.unauthored_candidates.length})
                    </p>
                    <ul className="ml-2 mt-1 space-y-0.5">
                      {info.unauthored_candidates.map((c, i) => (
                        <li key={i}>· {c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Open Sweep seed terms */}
      <Card className="rounded-2xl border-border/40">
        <CardContent className="space-y-2 p-5">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Search className="h-4 w-4 text-slate-500" />
            Open Sweep seed terms — for unauthored sub-gaps
          </h3>
          <p className="text-xs text-muted-foreground">
            Search terms the autonomous pipeline uses to scan for evidence in pillars or sub-gaps
            that are not yet authored as Watching drivers.
          </p>
          {!sweepSeed || sweepSeed.length === 0 ? (
            <p className="text-xs italic text-muted-foreground">No seed terms configured.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {sweepSeed.map((t, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
