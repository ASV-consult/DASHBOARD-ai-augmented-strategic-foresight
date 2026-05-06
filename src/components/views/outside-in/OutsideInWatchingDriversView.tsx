/**
 * OutsideInWatchingDriversView — list of W* drivers; click to expand for full detail.
 *
 * Each driver card shows: thesis, system_claim, current_observed_value (narrative),
 * trajectory readings, indicators (with current_value), falsification thresholds,
 * and the cycle history (prior movement over time).
 */
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useForesight } from '@/contexts/ForesightContext';
import { Telescope, ChevronDown, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { WatchingDriverV3 } from '@/types/crows-nest-v2';

const trajectoryIcon = (trend?: string) => {
  if (!trend) return <Minus className="h-3.5 w-3.5 text-slate-500" />;
  const t = trend.toLowerCase();
  if (t.startsWith('up') || t === 'rising') return <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />;
  if (t.startsWith('down') || t === 'falling') return <TrendingDown className="h-3.5 w-3.5 text-rose-600" />;
  return <Minus className="h-3.5 w-3.5 text-slate-500" />;
};

const DriverCard: React.FC<{ d: WatchingDriverV3 }> = ({ d }) => {
  const [open, setOpen] = useState(false);
  const tl = d.current_state?.truth_likelihood;
  const tlPct = typeof tl === 'number' ? Math.round(tl * 100) : null;
  const trajectory = d.current_state?.trajectory ?? d.trajectory?.trend_direction;

  return (
    <Card className="rounded-2xl border-rose-500/20 bg-rose-500/[0.02]">
      <CardContent className="p-5">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-start gap-3 text-left"
        >
          {open ? (
            <ChevronDown className="mt-1 h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground" />
          )}
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-rose-500/40 text-[10px]">
                {d.id}
              </Badge>
              <Badge variant="outline" className="border-slate-400/40 text-[10px]">
                {d.pillar}
              </Badge>
              <Badge variant="outline" className="border-rose-500/40 text-[10px]">
                {d.tier}
              </Badge>
              <h3 className="text-base font-semibold">{d.name}</h3>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{d.thesis}</p>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                {trajectoryIcon(trajectory)} {trajectory ?? 'no trend yet'}
              </span>
              <span>TL: {tlPct === null ? 'null' : `${tlPct}%`}</span>
              <span>· horizon {d.system_claim?.horizon_date ?? 'n/a'}</span>
              <span>· {d.indicators?.length ?? 0} indicators</span>
              <span>· {d.history?.length ?? 0} cycles</span>
            </div>
          </div>
        </button>

        {open && (
          <div className="mt-5 space-y-5 border-t border-rose-500/15 pt-4 text-sm">
            <Section title="System claim">
              <p className="text-foreground/90">{d.system_claim?.claim}</p>
              {d.system_claim?.rationale && (
                <p className="mt-1 text-xs text-muted-foreground">{d.system_claim.rationale}</p>
              )}
            </Section>

            {d.current_observed_value && (
              <Section title="Current observed value">
                <p className="text-foreground/90">{d.current_observed_value.narrative as string}</p>
                {Array.isArray(d.current_observed_value.source_references) &&
                  (d.current_observed_value.source_references as string[]).length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                      {(d.current_observed_value.source_references as string[]).map((s, i) => (
                        <li key={i}>· {s}</li>
                      ))}
                    </ul>
                  )}
              </Section>
            )}

            {d.trajectory?.readings && d.trajectory.readings.length > 0 && (
              <Section title="Trajectory readings">
                <ul className="space-y-1">
                  {d.trajectory.readings.map((r, i) => (
                    <li key={i} className="rounded-md border border-border/30 bg-background/40 p-2">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {r.date}
                        </Badge>
                        <p className="flex-1 text-xs">{r.what_happened}</p>
                        {r.shift && <span className="text-[10px] text-rose-600">{r.shift}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {d.indicators && d.indicators.length > 0 && (
              <Section title="Indicators (sub-claims)">
                <div className="space-y-1.5">
                  {d.indicators.map((i) => (
                    <div key={i.id} className="rounded-md border border-border/30 bg-background/40 p-2">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {i.id}
                        </Badge>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{i.topic}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{i.testable}</p>
                          <p className="mt-0.5 text-[11px]">
                            <span className="text-muted-foreground">cadence:</span> {i.cadence ?? '—'}
                            {' · '}
                            <span className="text-muted-foreground">current:</span> {i.current_value ?? '—'}
                            {' · '}
                            <span className="text-muted-foreground">horizon:</span> {i.horizon ?? '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {d.falsification_thresholds && d.falsification_thresholds.length > 0 && (
              <Section title="Falsification thresholds (event → magnitude)">
                <ul className="space-y-1.5">
                  {d.falsification_thresholds.map((f, i) => (
                    <li key={i} className="rounded-md border border-amber-500/20 bg-amber-500/[0.03] p-2">
                      <div className="flex items-start justify-between gap-2 text-xs">
                        <p className="flex-1">{f.event}</p>
                        <Badge variant="outline" className="border-amber-500/40 text-[10px]">
                          {f.magnitude}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">{f.rationale}</p>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {d.umicore_translation_hypothesis && (
              <Section title="Umicore translation hypothesis">
                <p className="text-foreground/90">{d.umicore_translation_hypothesis}</p>
              </Section>
            )}

            {d.history && d.history.length > 0 && (
              <Section title="Cycle history">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/40 text-left text-[10px] uppercase text-muted-foreground">
                        <th className="px-2 py-1">Cycle</th>
                        <th className="px-2 py-1">Rows</th>
                        <th className="px-2 py-1">Score</th>
                        <th className="px-2 py-1">+/-/o</th>
                        <th className="px-2 py-1">TL before</th>
                        <th className="px-2 py-1">TL after</th>
                        <th className="px-2 py-1">Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.history.map((h, i) => (
                        <tr key={i} className="border-b border-border/20">
                          <td className="px-2 py-1">{h.cycle_date}</td>
                          <td className="px-2 py-1">{h.n_evidence_rows}</td>
                          <td className="px-2 py-1">{h.cycle_score.toFixed(3)}</td>
                          <td className="px-2 py-1 font-mono">
                            {h.directional_breakdown['+']}/{h.directional_breakdown['-']}/{h.directional_breakdown.o}
                          </td>
                          <td className="px-2 py-1">{h.prior_tl_before === null ? '—' : h.prior_tl_before.toFixed(2)}</td>
                          <td className="px-2 py-1 font-medium">{h.prior_tl_after.toFixed(2)}</td>
                          <td className={`px-2 py-1 ${h.delta > 0 ? 'text-emerald-600' : h.delta < 0 ? 'text-rose-600' : 'text-muted-foreground'}`}>
                            {h.delta > 0 ? '+' : ''}{h.delta.toFixed(3)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            {d.open_sweep_search_terms && d.open_sweep_search_terms.length > 0 && (
              <Section title="Open Sweep search terms">
                <div className="flex flex-wrap gap-1.5">
                  {d.open_sweep_search_terms.map((t, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">
                      {t}
                    </Badge>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
    {children}
  </div>
);

export const OutsideInWatchingDriversView: React.FC = () => {
  const { crowsNestV2Data } = useForesight();
  const oi = crowsNestV2Data?.outside_in;
  if (!oi) {
    return (
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04]">
        <CardContent className="p-8">
          <p className="text-sm text-muted-foreground">
            Outside-In data not loaded. Upload the v3 bundle to see Watching Drivers.
          </p>
        </CardContent>
      </Card>
    );
  }
  const drivers = oi.watching_drivers || [];

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/40">
        <CardContent className="space-y-2 p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Telescope className="h-5 w-5 text-rose-500" />
            Watching Drivers — speculative tier
          </h2>
          <p className="text-sm text-muted-foreground">
            Drivers tracked but not currently linked to a bet. Each has a system_claim, falsification
            thresholds, and Open Sweep search terms feeding the continuous radar. Click a card to
            expand.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="outline">{drivers.length} drivers</Badge>
            <Badge variant="outline">{oi.counts.recent_routing_rows} recent routing rows</Badge>
            <Badge variant="outline">{oi.counts.promotion_proposals_open} promotion proposals open</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {drivers.map((d) => (
          <DriverCard key={d.id} d={d} />
        ))}
      </div>
    </div>
  );
};
