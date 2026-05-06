/**
 * OutsideInBetCandidatesView — bets the company isn't currently making but could.
 *
 * Each candidate shows: thesis, trigger drivers, what makes it a candidate today,
 * tipping conditions (primary AND-logic), Umicore-specific levers, and the
 * estimated financial impact framework.
 */
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useForesight } from '@/contexts/ForesightContext';
import { Target, ChevronDown, ChevronRight } from 'lucide-react';
import type { BetCandidateV3 } from '@/types/crows-nest-v2';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
    {children}
  </div>
);

const CandidateCard: React.FC<{ c: BetCandidateV3 }> = ({ c }) => {
  const [open, setOpen] = useState(true);
  return (
    <Card className="rounded-2xl border-rose-500/20 bg-rose-500/[0.02]">
      <CardContent className="p-5">
        <button onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-3 text-left">
          {open ? (
            <ChevronDown className="mt-1 h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground" />
          )}
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-rose-500/40 text-[10px]">
                {c.id}
              </Badge>
              <Badge variant="outline" className="border-rose-500/40 text-[10px]">
                {c.tier}
              </Badge>
              <h3 className="text-base font-semibold">{c.name}</h3>
            </div>
            {!open && c.thesis_one_paragraph && (
              <p className="text-sm text-muted-foreground line-clamp-2">{c.thesis_one_paragraph}</p>
            )}
          </div>
        </button>

        {open && (
          <div className="mt-5 space-y-5 border-t border-rose-500/15 pt-4 text-sm">
            <Section title="Thesis">
              <p className="text-foreground/90">{c.thesis_one_paragraph}</p>
            </Section>

            {c.trigger_drivers && c.trigger_drivers.length > 0 && (
              <Section title="Trigger drivers">
                <div className="space-y-1.5">
                  {c.trigger_drivers.map((td) => (
                    <div key={td.driver_id} className="rounded-md border border-border/30 bg-background/40 p-2">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="text-[10px]">{td.driver_id}</Badge>
                        <div className="flex-1 text-xs">
                          <p className="font-medium">{td.name}</p>
                          <p className="mt-0.5 text-muted-foreground">{td.channel}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {c.what_makes_this_a_candidate_not_a_bet_today && c.what_makes_this_a_candidate_not_a_bet_today.length > 0 && (
              <Section title="Why a candidate, not a bet today">
                <ul className="space-y-1 text-xs">
                  {c.what_makes_this_a_candidate_not_a_bet_today.map((x, i) => (
                    <li key={i} className="rounded-md border border-amber-500/20 bg-amber-500/[0.04] p-2">{x}</li>
                  ))}
                </ul>
              </Section>
            )}

            {c.tipping_conditions?.primary_trigger_AND_logic && c.tipping_conditions.primary_trigger_AND_logic.length > 0 && (
              <Section title="Tipping conditions (primary triggers — AND logic)">
                <ul className="space-y-1.5">
                  {c.tipping_conditions.primary_trigger_AND_logic.map((t, i) => (
                    <li key={i} className="rounded-md border border-emerald-500/20 bg-emerald-500/[0.03] p-2 text-xs">
                      <p className="font-medium">{t.condition}</p>
                      <p className="mt-1 text-muted-foreground">{t.rationale}</p>
                      <p className="mt-1">
                        <span className="text-muted-foreground">Current status: </span>
                        <span className="font-mono">{t.current_status}</span>
                      </p>
                      {t.watch_items && t.watch_items.length > 0 && (
                        <div className="mt-1.5">
                          <span className="text-[10px] font-semibold uppercase text-muted-foreground">Watch:</span>
                          <ul className="mt-0.5 ml-2 space-y-0.5">
                            {t.watch_items.map((w, j) => (
                              <li key={j} className="text-muted-foreground">· {w}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                {c.tipping_conditions.promotion_logic && (
                  <p className="mt-2 text-xs italic text-muted-foreground">{c.tipping_conditions.promotion_logic}</p>
                )}
              </Section>
            )}

            {c.tipping_conditions?.secondary_supportive_signals && c.tipping_conditions.secondary_supportive_signals.length > 0 && (
              <Section title="Secondary supportive signals">
                <ul className="space-y-0.5 text-xs">
                  {c.tipping_conditions.secondary_supportive_signals.map((s, i) => (
                    <li key={i}>· {s}</li>
                  ))}
                </ul>
              </Section>
            )}

            {c.umicore_specific_levers_and_assets && (
              <Section title="Umicore-specific levers and assets">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 text-xs">
                  {c.umicore_specific_levers_and_assets.existing_assets_supporting_candidate &&
                    c.umicore_specific_levers_and_assets.existing_assets_supporting_candidate.length > 0 && (
                      <div className="rounded-md border border-emerald-500/20 bg-emerald-500/[0.03] p-2">
                        <p className="mb-1 text-[10px] font-semibold uppercase text-emerald-700">Existing assets supporting</p>
                        <ul className="space-y-0.5">
                          {c.umicore_specific_levers_and_assets.existing_assets_supporting_candidate.map((a, i) => (
                            <li key={i}>· {a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  {c.umicore_specific_levers_and_assets.gaps_to_close_for_promotion &&
                    c.umicore_specific_levers_and_assets.gaps_to_close_for_promotion.length > 0 && (
                      <div className="rounded-md border border-amber-500/20 bg-amber-500/[0.03] p-2">
                        <p className="mb-1 text-[10px] font-semibold uppercase text-amber-700">Gaps to close</p>
                        <ul className="space-y-0.5">
                          {c.umicore_specific_levers_and_assets.gaps_to_close_for_promotion.map((g, i) => (
                            <li key={i}>· {g}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
                {c.umicore_specific_levers_and_assets.competitive_landscape && (
                  <div className="mt-2 rounded-md border border-border/30 bg-background/40 p-2 text-xs">
                    <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Competitive landscape</p>
                    {c.umicore_specific_levers_and_assets.competitive_landscape.umicore_relative_position && (
                      <p className="italic">{c.umicore_specific_levers_and_assets.competitive_landscape.umicore_relative_position}</p>
                    )}
                  </div>
                )}
              </Section>
            )}

            {c.estimated_financial_impact_framework?.two_sided_outcomes && (
              <Section title="Estimated financial impact (framework)">
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-3 text-xs">
                  {(['upside_case', 'base_case', 'downside_case'] as const).map((k) => {
                    const txt = c.estimated_financial_impact_framework!.two_sided_outcomes![k];
                    if (!txt) return null;
                    const tone =
                      k === 'upside_case'
                        ? 'border-emerald-500/30 bg-emerald-500/[0.04]'
                        : k === 'downside_case'
                          ? 'border-rose-500/30 bg-rose-500/[0.04]'
                          : 'border-slate-400/30 bg-slate-400/[0.04]';
                    return (
                      <div key={k} className={`rounded-md border p-2 ${tone}`}>
                        <p className="mb-1 text-[10px] font-semibold uppercase">{k.replace('_', ' ')}</p>
                        <p>{txt}</p>
                      </div>
                    );
                  })}
                </div>
                {c.estimated_financial_impact_framework.approach_note && (
                  <p className="mt-2 text-[11px] italic text-muted-foreground">
                    {c.estimated_financial_impact_framework.approach_note}
                  </p>
                )}
              </Section>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const OutsideInBetCandidatesView: React.FC = () => {
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
  const candidates = oi.bet_candidates || [];

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/40">
        <CardContent className="space-y-2 p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Target className="h-5 w-5 text-rose-500" />
            Bet Candidates — bets the company isn't yet making
          </h2>
          <p className="text-sm text-muted-foreground">
            Each candidate references the trigger drivers that would justify it and the AND-logic
            tipping conditions that would promote it from candidate to active. Capital-allocation
            decisions follow.
          </p>
          <Badge variant="outline">{candidates.length} candidates</Badge>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {candidates.length === 0 ? (
          <Card className="rounded-2xl border-border/40">
            <CardContent className="p-8 text-sm text-muted-foreground">
              No bet candidates authored yet.
            </CardContent>
          </Card>
        ) : (
          candidates.map((c) => <CandidateCard key={c.id} c={c} />)
        )}
      </div>
    </div>
  );
};
