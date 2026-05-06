/**
 * OutsideInSteepleWatchView — pillar-by-pillar wide scan, NOT bet-filtered.
 *
 * Renders all six STEEPLE pillars with both Active drivers (T*) and Watching
 * drivers (W*) from the v3 outside_in section. Coverage Gaps explicitly shown
 * for empty pillars.
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useForesight } from '@/contexts/ForesightContext';
import { Compass, Telescope, AlertTriangle } from 'lucide-react';
import type { SteepleWatchPayload } from '@/types/crows-nest-v2';

const PILLAR_ORDER = ['Social', 'Technology', 'Economic', 'Environmental', 'Political_Legal', 'Ethical'];

const PILLAR_LABEL: Record<string, string> = {
  Social: 'Social',
  Technology: 'Technology',
  Economic: 'Economic',
  Environmental: 'Environmental',
  Political_Legal: 'Political-Legal',
  Ethical: 'Ethical',
};

export const OutsideInSteepleWatchView: React.FC = () => {
  const { crowsNestV2Data } = useForesight();
  const oi = crowsNestV2Data?.outside_in;

  if (!oi) {
    return (
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04]">
        <CardContent className="p-8">
          <p className="text-sm text-muted-foreground">
            Outside-In data not loaded. Upload the v3 bundle (
            <code className="rounded bg-muted px-1">dashboard_bundle_v3.json</code>) to see the
            STEEPLE Watch view.
          </p>
        </CardContent>
      </Card>
    );
  }

  const watch: SteepleWatchPayload = oi.steeple_watch;

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/40">
        <CardContent className="space-y-2 p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Compass className="h-5 w-5 text-rose-500" />
            STEEPLE Watch — wide scan
          </h2>
          <p className="text-sm text-muted-foreground">
            All six STEEPLE pillars. <strong>NOT bet-filtered.</strong> Active drivers (T*) currently
            linked to bets; Watching drivers (W*) tracked but not yet linked. Last cycle:{' '}
            {oi.latest_cycle ? oi.latest_cycle.cycle_date : 'none'} · {oi.counts.recent_routing_rows}{' '}
            recent routing rows.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {PILLAR_ORDER.map((pillar) => {
          const cell = watch[pillar] || { active: [], watching: [] };
          const empty = cell.active.length === 0 && cell.watching.length === 0;
          return (
            <Card key={pillar} className="rounded-2xl border-border/40">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">{PILLAR_LABEL[pillar] ?? pillar}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {cell.active.length} active
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {cell.watching.length} watching
                    </Badge>
                  </div>
                </div>

                {empty && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.04] p-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                        Coverage gap — pillar empty
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        No drivers tracked in this pillar. See Coverage Gaps view for unauthored
                        sub-gap candidates.
                      </p>
                    </div>
                  </div>
                )}

                {cell.active.length > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                      Active
                    </p>
                    <ul className="space-y-1">
                      {cell.active.map((d) => (
                        <li key={d.id} className="rounded-md border border-emerald-500/20 bg-emerald-500/[0.04] p-2">
                          <div className="flex items-start gap-2">
                            <Badge variant="outline" className="mt-0.5 border-emerald-500/40 text-[10px]">
                              {d.id}
                            </Badge>
                            <div className="flex-1 text-sm">
                              <p className="font-medium">{d.name}</p>
                              {d.thesis && (
                                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{d.thesis}</p>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {cell.watching.length > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-400">
                      Watching
                    </p>
                    <ul className="space-y-1">
                      {cell.watching.map((d) => (
                        <li key={d.id} className="rounded-md border border-rose-500/20 bg-rose-500/[0.04] p-2">
                          <div className="flex items-start gap-2">
                            <Telescope className="mt-1 h-3.5 w-3.5 text-rose-500" />
                            <Badge variant="outline" className="mt-0.5 border-rose-500/40 text-[10px]">
                              {d.id}
                            </Badge>
                            <div className="flex-1 text-sm">
                              <p className="font-medium">{d.name}</p>
                              {d.system_claim && (
                                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                                  Claim: {d.system_claim}
                                </p>
                              )}
                              <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                                <span>📅 horizon {d.horizon_date ?? 'n/a'}</span>
                                <span>· {d.n_indicators ?? 0} indicators</span>
                                <span>· {d.n_falsification_thresholds ?? 0} falsification thresholds</span>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
