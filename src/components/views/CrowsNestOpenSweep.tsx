/**
 * CrowsNestOpenSweep — Phase H view.
 *
 * Two stacked panels:
 *   1. Proposed Bets Inbox — pending cluster-promotion proposals from the Sweep.
 *      Each proposal has the LLM's reasoning (coherence + novelty + load-bearing)
 *      plus the draft framing. User can Accept / Adapt / Reject. Decisions are
 *      persisted to localStorage for the PoC; production would write back to
 *      proposed_bets_inbox.json on the backend.
 *
 *   2. Sweep Evidence per Projection — for each projection that received ≥1
 *      routed evidence item this cycle, show the count + titles + lean.
 *      Click a projection → drill into the projection page.
 */
import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForesight } from '@/contexts/ForesightContext';
import {
  SweepProposal,
  SweepEvidenceItem,
} from '@/types/crows-nest';
import {
  Inbox,
  Sprout,
  Telescope,
  CheckCircle2,
  XCircle,
  Pencil,
  ChevronRight,
  ArrowDown,
  ArrowUp,
  Minus,
} from 'lucide-react';

interface Props {
  onSelectProjection?: (id: string) => void;
}

const KIND_LABEL: Record<string, string> = {
  projection_candidate: 'New projection',
  theme_candidate: 'New macro theme',
  adapt_existing: 'Adapt existing',
  keep_clustered_no_promotion_yet: 'Keep clustered',
};

const KIND_TONE: Record<string, string> = {
  projection_candidate: 'border-rose-500/40 bg-rose-500/[0.06] text-rose-700 dark:text-rose-300',
  theme_candidate: 'border-amber-500/40 bg-amber-500/[0.06] text-amber-700 dark:text-amber-300',
  adapt_existing: 'border-sky-500/40 bg-sky-500/[0.06] text-sky-700 dark:text-sky-300',
  keep_clustered_no_promotion_yet: 'border-slate-500/40 bg-slate-500/[0.06] text-slate-700 dark:text-slate-300',
};

const STATUS_KEY = (proposalId: string) => `sweep_proposal_status_${proposalId}`;

type LocalDecision = { status: 'accepted' | 'adapted' | 'rejected'; note?: string; ts: string };

function readDecision(proposalId: string): LocalDecision | null {
  try {
    const raw = localStorage.getItem(STATUS_KEY(proposalId));
    return raw ? (JSON.parse(raw) as LocalDecision) : null;
  } catch {
    return null;
  }
}

function writeDecision(proposalId: string, decision: LocalDecision) {
  try {
    localStorage.setItem(STATUS_KEY(proposalId), JSON.stringify(decision));
  } catch {
    /* noop */
  }
}

export const CrowsNestOpenSweep: React.FC<Props> = ({ onSelectProjection }) => {
  const { crowsNestData } = useForesight();
  const sweep = crowsNestData?.open_sweep;
  const [tick, setTick] = useState(0);

  if (!crowsNestData) {
    return (
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04]">
        <CardContent className="p-8">
          <p className="text-sm text-muted-foreground">No data loaded.</p>
        </CardContent>
      </Card>
    );
  }

  const proposals = (sweep?.inbox?.proposals || []).slice();
  const evidenceMap = sweep?.evidence_per_projection || {};
  const totalEvidence = Object.values(evidenceMap).reduce((s, arr) => s + (arr?.length || 0), 0);

  // Re-read decisions from localStorage on every render (cheap)
  const decisions = useMemo(() => {
    const map: Record<string, LocalDecision | null> = {};
    for (const p of proposals) map[p.proposal_id] = readDecision(p.proposal_id);
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposals.length, tick]);

  const pending = proposals.filter((p) => !decisions[p.proposal_id] && (p.status || 'pending') === 'pending');
  const decided = proposals.filter((p) => decisions[p.proposal_id]);

  return (
    <div className="space-y-5">
      {/* Hero */}
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04] shadow-sm">
        <CardContent className="p-6 md:p-8 space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-rose-500/10 p-2">
              <Telescope className="h-5 w-5 text-rose-500" />
            </div>
            <div className="flex-1 space-y-2">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground leading-snug">
                Open Sweep — what's moving that we didn't ask about
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The dual engine's second loop. Daily ingestion → monthly classification → 3 buckets:
                items that map to existing bets (route to those projections), items that touch a
                dimension/theme but no projection captures the angle (coverage gaps), and orphans.
                A reasoned cluster-promotion agent then proposes new bets or new macro themes for
                you to <strong className="text-foreground">accept, adapt, or reject</strong>.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-rose-500/10">
                <Stat label="Proposals pending" value={String(pending.length)} tone="rose" />
                <Stat label="Decided" value={String(decided.length)} tone="muted" />
                <Stat label="Routed evidence" value={String(totalEvidence)} tone="muted" />
                <Stat
                  label="Projections w/ evidence"
                  value={String(Object.keys(evidenceMap).length)}
                  tone="muted"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="inbox">
        <TabsList className="rounded-full">
          <TabsTrigger value="inbox" className="rounded-full text-xs">
            <Inbox className="h-3.5 w-3.5 mr-1.5" />
            Proposed bets ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="evidence" className="rounded-full text-xs">
            <Sprout className="h-3.5 w-3.5 mr-1.5" />
            Evidence routed ({totalEvidence})
          </TabsTrigger>
          {decided.length > 0 ? (
            <TabsTrigger value="decided" className="rounded-full text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Decided ({decided.length})
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="inbox" className="mt-4">
          {pending.length === 0 ? (
            <Card className="rounded-2xl border-border/40">
              <CardContent className="p-6 text-sm text-muted-foreground italic text-center">
                No pending proposals. The next monthly Sweep will surface new candidates.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pending.map((p) => (
                <ProposalCard
                  key={p.proposal_id}
                  proposal={p}
                  onDecided={() => setTick((t) => t + 1)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="evidence" className="mt-4">
          <EvidencePerProjection map={evidenceMap} onSelectProjection={onSelectProjection} />
        </TabsContent>

        {decided.length > 0 ? (
          <TabsContent value="decided" className="mt-4">
            <div className="space-y-2">
              {decided.map((p) => (
                <DecidedRow key={p.proposal_id} proposal={p} decision={decisions[p.proposal_id]} />
              ))}
            </div>
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; tone: 'rose' | 'muted' }> = ({ label, value, tone }) => (
  <div
    className={`rounded-lg border p-3 ${
      tone === 'rose' ? 'border-rose-500/40 bg-rose-500/[0.06]' : 'border-border/40 bg-background/50'
    }`}
  >
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className={`text-lg font-semibold tabular-nums ${tone === 'rose' ? 'text-rose-700 dark:text-rose-300' : 'text-foreground'}`}>
      {value}
    </div>
  </div>
);

const ProposalCard: React.FC<{ proposal: SweepProposal; onDecided: () => void }> = ({ proposal, onDecided }) => {
  const [adapting, setAdapting] = useState(false);
  const [note, setNote] = useState('');

  const decide = (status: 'accepted' | 'adapted' | 'rejected') => {
    writeDecision(proposal.proposal_id, {
      status,
      note: note || undefined,
      ts: new Date().toISOString(),
    });
    onDecided();
  };

  const kindTone = KIND_TONE[proposal.kind] || 'border-border/40 bg-background/50 text-muted-foreground';
  const kindLabel = KIND_LABEL[proposal.kind] || proposal.kind;
  const draft = proposal.draft;

  return (
    <Card className="rounded-2xl border-border/40">
      <CardContent className="p-5 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${kindTone}`}>
                {kindLabel}
              </span>
              {proposal.cluster_label ? (
                <span className="text-[10px] text-muted-foreground">{proposal.cluster_label}</span>
              ) : null}
              {proposal.supporting_evidence_count ? (
                <span className="text-[10px] text-muted-foreground">
                  · {proposal.supporting_evidence_count} evidence item{proposal.supporting_evidence_count === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>
            <h4 className="text-base md:text-lg font-semibold text-foreground leading-tight">
              {draft?.human_title || proposal.cluster_label || proposal.proposal_id}
            </h4>
            {draft?.claim ? (
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed font-serif">{draft.claim}</p>
            ) : null}
          </div>
        </div>

        {/* Reasoning */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {proposal.coherence_assessment ? (
            <ReasoningBox label="Coherence">{proposal.coherence_assessment}</ReasoningBox>
          ) : null}
          {proposal.novelty_assessment ? (
            <ReasoningBox label="Novelty">{proposal.novelty_assessment}</ReasoningBox>
          ) : null}
          {proposal.load_bearing_assessment ? (
            <ReasoningBox label="Load-bearing">{proposal.load_bearing_assessment}</ReasoningBox>
          ) : null}
        </div>

        {proposal.rationale_summary ? (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.03] p-3">
            <div className="text-[10px] uppercase tracking-wide text-rose-700 dark:text-rose-300 font-semibold mb-1">
              Recommendation rationale
            </div>
            <p className="text-sm text-foreground/85 leading-relaxed font-serif">{proposal.rationale_summary}</p>
          </div>
        ) : null}

        {/* Draft details */}
        {draft ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {draft.parent_dimension_id ? (
              <Field label="Dimension" value={draft.parent_dimension_id} />
            ) : null}
            {draft.pillar ? <Field label="Pillar" value={draft.pillar} /> : null}
            {draft.prior_class ? (
              <Field
                label="Class"
                value={draft.prior_class === 'currently_observable_persistence' ? 'Persistence (B)' : 'Forward (A)'}
              />
            ) : null}
            {typeof draft.prior === 'number' ? (
              <Field label="Prior" value={`${Math.round(draft.prior * 100)}%`} />
            ) : null}
            {draft.target_value !== undefined && draft.target_value !== null ? (
              <Field label="Target" value={String(draft.target_value)} />
            ) : null}
            {draft.resolution_date ? <Field label="Resolves" value={draft.resolution_date} /> : null}
          </div>
        ) : null}

        {draft?.prior_rationale ? (
          <div className="rounded-xl border border-border/40 bg-background/40 p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
              Prior rationale
            </div>
            <p className="text-sm text-foreground/85 leading-relaxed font-serif">{draft.prior_rationale}</p>
          </div>
        ) : null}

        {(draft?.what_would_move_it_up?.length || draft?.what_would_move_it_down?.length) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {draft?.what_would_move_it_up?.length ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-3">
                <div className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300 font-semibold mb-1.5">
                  What would move it up ↑
                </div>
                <ul className="space-y-1">
                  {draft.what_would_move_it_up.map((t, i) => (
                    <li key={i} className="text-xs text-foreground/85 list-disc list-inside">{t}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {draft?.what_would_move_it_down?.length ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-3">
                <div className="text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-300 font-semibold mb-1.5">
                  What would move it down ↓
                </div>
                <ul className="space-y-1">
                  {draft.what_would_move_it_down.map((t, i) => (
                    <li key={i} className="text-xs text-foreground/85 list-disc list-inside">{t}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {proposal.kind === 'adapt_existing' && proposal.adaptation_proposed ? (
          <div className="rounded-xl border border-sky-500/30 bg-sky-500/[0.04] p-3">
            <div className="text-[10px] uppercase tracking-wide text-sky-700 dark:text-sky-300 font-semibold mb-1">
              Adaptation proposed for {proposal.existing_id}
            </div>
            <p className="text-sm text-foreground/85 leading-relaxed">{proposal.adaptation_proposed}</p>
          </div>
        ) : null}

        {proposal.kind === 'keep_clustered_no_promotion_yet' && proposal.promotion_signal_needed ? (
          <div className="rounded-xl border border-slate-500/30 bg-slate-500/[0.04] p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Tracking only — promotion signal needed
            </div>
            <p className="text-sm text-foreground/85 leading-relaxed">{proposal.promotion_signal_needed}</p>
            {proposal.next_review_in_cycles ? (
              <div className="text-[10px] text-muted-foreground mt-1">
                Re-review in {proposal.next_review_in_cycles} cycle{proposal.next_review_in_cycles === 1 ? '' : 's'}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Action bar */}
        <div className="border-t border-border/30 pt-3 flex items-center gap-2 flex-wrap">
          {adapting ? (
            <>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note your adaptation (e.g. tighten threshold, change resolution date, swap drivers)"
                className="flex-1 min-w-[280px] rounded-lg border border-border/40 bg-background/60 px-3 py-1.5 text-xs"
              />
              <button
                onClick={() => decide('adapted')}
                className="rounded-full border border-sky-500/40 bg-sky-500/[0.10] px-3 py-1.5 text-xs text-sky-700 dark:text-sky-300 hover:bg-sky-500/[0.16] transition"
              >
                Save adaptation
              </button>
              <button
                onClick={() => setAdapting(false)}
                className="text-xs text-muted-foreground hover:text-foreground transition"
              >
                cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => decide('accepted')}
                className="rounded-full border border-emerald-500/40 bg-emerald-500/[0.10] px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/[0.16] transition inline-flex items-center gap-1"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Accept
              </button>
              <button
                onClick={() => setAdapting(true)}
                className="rounded-full border border-sky-500/40 bg-sky-500/[0.10] px-3 py-1.5 text-xs text-sky-700 dark:text-sky-300 hover:bg-sky-500/[0.16] transition inline-flex items-center gap-1"
              >
                <Pencil className="h-3.5 w-3.5" />
                Adapt
              </button>
              <button
                onClick={() => decide('rejected')}
                className="rounded-full border border-rose-500/40 bg-rose-500/[0.06] px-3 py-1.5 text-xs text-rose-700 dark:text-rose-300 hover:bg-rose-500/[0.10] transition inline-flex items-center gap-1"
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </button>
              <span className="ml-auto text-[10px] text-muted-foreground/60">
                Decisions saved locally; production will sync to backend.
              </span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const ReasoningBox: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="rounded-xl border border-border/40 bg-background/40 p-3">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
      {label}
    </div>
    <p className="text-xs text-foreground/85 leading-snug">{children}</p>
  </div>
);

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg border border-border/40 bg-background/50 px-3 py-2">
    <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-xs font-medium text-foreground">{value}</div>
  </div>
);

const DecidedRow: React.FC<{ proposal: SweepProposal; decision: LocalDecision | null }> = ({ proposal, decision }) => {
  const tone =
    decision?.status === 'accepted'
      ? 'border-emerald-500/40 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-300'
      : decision?.status === 'rejected'
      ? 'border-rose-500/40 bg-rose-500/[0.06] text-rose-700 dark:text-rose-300'
      : 'border-sky-500/40 bg-sky-500/[0.06] text-sky-700 dark:text-sky-300';
  return (
    <div className="rounded-xl border border-border/40 bg-background/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${tone}`}>
              {decision?.status}
            </span>
            <span className="text-sm font-medium text-foreground">
              {proposal.draft?.human_title || proposal.cluster_label || proposal.proposal_id}
            </span>
          </div>
          {decision?.note ? (
            <div className="text-xs text-muted-foreground italic mt-1">"{decision.note}"</div>
          ) : null}
        </div>
        <div className="text-[10px] text-muted-foreground/60">{decision?.ts.slice(0, 10)}</div>
      </div>
    </div>
  );
};

const EvidencePerProjection: React.FC<{
  map: Record<string, SweepEvidenceItem[]>;
  onSelectProjection?: (id: string) => void;
}> = ({ map, onSelectProjection }) => {
  const entries = Object.entries(map).sort((a, b) => (b[1]?.length || 0) - (a[1]?.length || 0));
  if (entries.length === 0) {
    return (
      <Card className="rounded-2xl border-border/40">
        <CardContent className="p-6 text-sm text-muted-foreground italic text-center">
          No evidence routed yet. Run a Sweep cycle to populate.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {entries.map(([pid, items]) => {
        const counts = countLeans(items);
        return (
          <Card key={pid} className="rounded-2xl border-border/40">
            <CardContent className="p-4">
              <button
                onClick={() => onSelectProjection?.(pid)}
                className="w-full text-left group"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-border/40 bg-background/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                      {pid}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {items.length} item{items.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {counts.against > 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-rose-600">
                        <ArrowDown className="h-3 w-3" /> {counts.against}
                      </span>
                    ) : null}
                    {counts.mixed > 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-amber-600">
                        <Minus className="h-3 w-3" /> {counts.mixed}
                      </span>
                    ) : null}
                    {counts.supportive > 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-emerald-600">
                        <ArrowUp className="h-3 w-3" /> {counts.supportive}
                      </span>
                    ) : null}
                    <ChevronRight className="h-3.5 w-3.5 group-hover:text-rose-500 transition" />
                  </div>
                </div>
                <ul className="space-y-1">
                  {items.slice(0, 5).map((it, i) => (
                    <li key={i} className="text-xs text-foreground/80 leading-snug line-clamp-1">
                      <LeanIcon lean={it.directional_lean} /> {it.title}
                    </li>
                  ))}
                  {items.length > 5 ? (
                    <li className="text-[10px] text-muted-foreground/70 italic">
                      +{items.length - 5} more
                    </li>
                  ) : null}
                </ul>
              </button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

function countLeans(items: SweepEvidenceItem[]): { supportive: number; against: number; mixed: number } {
  return items.reduce(
    (acc, it) => {
      const l = (it.directional_lean || '').toLowerCase();
      if (l === 'supportive') acc.supportive += 1;
      else if (l === 'against') acc.against += 1;
      else acc.mixed += 1;
      return acc;
    },
    { supportive: 0, against: 0, mixed: 0 },
  );
}

const LeanIcon: React.FC<{ lean?: string }> = ({ lean }) => {
  const l = (lean || '').toLowerCase();
  if (l === 'supportive') return <ArrowUp className="inline h-3 w-3 text-emerald-600 mr-1" />;
  if (l === 'against') return <ArrowDown className="inline h-3 w-3 text-rose-600 mr-1" />;
  return <Minus className="inline h-3 w-3 text-amber-600 mr-1" />;
};
