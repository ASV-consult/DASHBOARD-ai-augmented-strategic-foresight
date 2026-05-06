/**
 * OutsideInSteepleWatchView — full STEEPLE deep-dive tree.
 *
 * Renders all six STEEPLE pillars with a JOINED view of:
 *   1. Active drivers (T*) — bet-anchored, from v2 themes
 *   2. Watching drivers — fully authored W* records (v3-canonical schema)
 *   3. Seeded candidates — one-line theses from steeple_seed_v1.json (~30 items)
 *   4. Subagent-surfaced candidates — W7-W9 from coverage_gaps.json
 *   5. Deferred candidates — explicit deferrals (Ethical pillar)
 *   6. Remaining sub-gaps — unauthored axes flagged in coverage_gaps.json
 *
 * Every node is clickable and reveals an inline detail panel with thesis,
 * Umicore translation hypothesis, and research pointer where available.
 * NOT bet-filtered — this is the radar's wide-scan view.
 */
import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useForesight } from '@/contexts/ForesightContext';
import {
  Compass,
  Telescope,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Target,
  Sprout,
  Eye,
  PauseCircle,
  CircleDashed,
  Search,
} from 'lucide-react';
import type {
  SteepleTreePayload,
  SteepleTreePillarNode,
  SteepleNode,
  SteepleActiveNode,
  SteepleWatchingAuthoredNode,
  SteepleSeededCandidateNode,
  SteepleSubagentCandidateNode,
  SteepleDeferredNode,
} from '@/types/crows-nest-v2';
import { pillarBadgeClass } from '@/types/crows-nest-v2';

const PILLAR_ORDER = ['Social', 'Technology', 'Economic', 'Environmental', 'Political_Legal', 'Ethical'];

const PILLAR_LABEL: Record<string, string> = {
  Social: 'Social',
  Technology: 'Technology',
  Economic: 'Economic',
  Environmental: 'Environmental',
  Political_Legal: 'Political-Legal',
  Ethical: 'Ethical',
};

type TierKey = 'active' | 'watching_authored' | 'seeded_candidates' | 'candidate_for_review' | 'deferred';

const TIER_META: Record<TierKey, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  border: string;
  bg: string;
  textAccent: string;
  description: string;
}> = {
  active: {
    label: 'Active drivers (T*)',
    icon: Target,
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/[0.05]',
    textAccent: 'text-emerald-700 dark:text-emerald-300',
    description: 'Bet-anchored, in cycle scoring',
  },
  watching_authored: {
    label: 'Watching drivers (W*) — authored',
    icon: Telescope,
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/[0.05]',
    textAccent: 'text-rose-700 dark:text-rose-300',
    description: 'Industry-portable, full v3-canonical record',
  },
  seeded_candidates: {
    label: 'Seeded candidates (OI-*)',
    icon: Sprout,
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/[0.04]',
    textAccent: 'text-amber-700 dark:text-amber-300',
    description: 'One-line theses + research pointers; not yet authored',
  },
  candidate_for_review: {
    label: 'Surfaced this cycle (W7-W9)',
    icon: Eye,
    border: 'border-violet-500/30',
    bg: 'bg-violet-500/[0.04]',
    textAccent: 'text-violet-700 dark:text-violet-300',
    description: 'Subagent-surfaced; awaiting v2-seed review',
  },
  deferred: {
    label: 'Deferred',
    icon: PauseCircle,
    border: 'border-slate-400/30',
    bg: 'bg-slate-400/[0.04]',
    textAccent: 'text-slate-600 dark:text-slate-400',
    description: 'Explicitly de-prioritised in v1',
  },
};

type NodeWithTier = SteepleNode & { _tier: TierKey; _pillar: string };

// ─────────────────────────── Detail panel ──────────────────────────────────

const Field: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm leading-relaxed">{value}</p>
    </div>
  );
};

const NodeDetail: React.FC<{ node: NodeWithTier }> = ({ node }) => {
  if (node.kind === 'active_T_driver') {
    const n = node as SteepleActiveNode & { _tier: TierKey; _pillar: string };
    const cs = (n.current_state || {}) as { theme_truth_likelihood?: number; theme_tier?: string; trajectory?: string };
    return (
      <div className="space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.03] p-3">
        <Field label="Thesis" value={n.thesis} />
        <div className="flex flex-wrap gap-2 text-[11px]">
          {cs.theme_truth_likelihood != null && (
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
              TL {cs.theme_truth_likelihood.toFixed(2)}
            </Badge>
          )}
          {cs.theme_tier && (
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
              {cs.theme_tier}
            </Badge>
          )}
          {cs.trajectory && (
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
              {cs.trajectory}
            </Badge>
          )}
        </div>
      </div>
    );
  }

  if (node.kind === 'watching_W_driver_authored') {
    const n = node as SteepleWatchingAuthoredNode & { _tier: TierKey; _pillar: string };
    const cs = n.current_state || {};
    return (
      <div className="space-y-3 rounded-lg border border-rose-500/20 bg-rose-500/[0.03] p-3">
        <Field label="Thesis" value={n.thesis} />
        <Field label="System claim" value={n.system_claim} />
        <Field label="Umicore translation hypothesis" value={n.umicore_translation_hypothesis} />
        <div className="flex flex-wrap gap-2 text-[11px]">
          {n.horizon_date && (
            <Badge variant="outline" className="border-rose-500/40 text-rose-700 dark:text-rose-300">
              📅 {n.horizon_date}
            </Badge>
          )}
          {cs.truth_likelihood != null && (
            <Badge variant="outline" className="border-rose-500/40 text-rose-700 dark:text-rose-300">
              TL {Number(cs.truth_likelihood).toFixed(2)}
            </Badge>
          )}
          {cs.trajectory && (
            <Badge variant="outline" className="border-rose-500/40 text-rose-700 dark:text-rose-300">
              {cs.trajectory}
            </Badge>
          )}
          <Badge variant="outline" className="border-rose-500/40 text-rose-700 dark:text-rose-300">
            {n.n_indicators ?? 0} indicators
          </Badge>
          <Badge variant="outline" className="border-rose-500/40 text-rose-700 dark:text-rose-300">
            {n.n_falsification_thresholds ?? 0} falsification thresholds
          </Badge>
        </div>
      </div>
    );
  }

  if (node.kind === 'steeple_seed_candidate') {
    const n = node as SteepleSeededCandidateNode & { _tier: TierKey; _pillar: string };
    return (
      <div className="space-y-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.03] p-3">
        <Field label="Thesis" value={n.thesis_one_line} />
        <Field label="Why EU materials / specialty chemicals" value={n.why_eu_materials_specialty_chemicals} />
        <Field label="Umicore translation hypothesis" value={n.umicore_translation_hypothesis} />
        <Field label="First research pointer" value={n.first_research_pointer} />
        <div className="flex flex-wrap gap-2 text-[11px]">
          {n.preliminary_classification && (
            <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300">
              {n.preliminary_classification.replace(/_/g, ' ')}
            </Badge>
          )}
          {n.relation_to_existing && (
            <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300">
              {n.relation_to_existing.replace(/_/g, ' ')}
            </Badge>
          )}
        </div>
      </div>
    );
  }

  if (node.kind === 'subagent_surfaced_candidate') {
    const n = node as SteepleSubagentCandidateNode & { _tier: TierKey; _pillar: string };
    return (
      <div className="space-y-3 rounded-lg border border-violet-500/20 bg-violet-500/[0.03] p-3">
        <Field label="Thesis" value={n.thesis} />
        <Field label="First signal" value={n.first_signal} />
        <Field label="Umicore translation hypothesis" value={n.umicore_translation_hypothesis} />
        {n.decision && (
          <Badge variant="outline" className="border-violet-500/40 text-[11px] text-violet-700 dark:text-violet-300">
            {n.decision.replace(/_/g, ' ')}
          </Badge>
        )}
      </div>
    );
  }

  if (node.kind === 'deferred_seed_candidate') {
    const n = node as SteepleDeferredNode & { _tier: TierKey; _pillar: string };
    return (
      <div className="space-y-3 rounded-lg border border-slate-400/20 bg-slate-400/[0.03] p-3">
        <Field label="Thesis" value={n.thesis_one_line} />
        <Field label="Umicore translation hypothesis" value={n.umicore_translation_hypothesis} />
        <Field label="First research pointer" value={n.first_research_pointer} />
        <Field label="Deferral rationale" value={n.rationale} />
        {n.decided_at && (
          <p className="text-[10px] text-muted-foreground">
            Decision: {n.decision} · {n.decided_at} · by {n.by ?? 'n/a'}
          </p>
        )}
      </div>
    );
  }

  return null;
};

// ─────────────────────────── Node row ──────────────────────────────────────

const NodeRow: React.FC<{
  node: NodeWithTier;
  expanded: boolean;
  onToggle: () => void;
  matchesQuery: boolean;
}> = ({ node, expanded, onToggle, matchesQuery }) => {
  const meta = TIER_META[node._tier];
  const Icon = meta.icon;

  const labelText = (() => {
    if (node.kind === 'steeple_seed_candidate') {
      return (node as SteepleSeededCandidateNode).thesis_one_line || node.name;
    }
    return node.name;
  })();

  return (
    <li className={`rounded-md border ${meta.border} ${meta.bg} ${matchesQuery ? '' : 'opacity-40'}`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-2 p-2 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
      >
        {expanded ? (
          <ChevronDown className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        )}
        <Icon className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${meta.textAccent}`} />
        <Badge
          variant="outline"
          className={`mt-0.5 flex-shrink-0 text-[10px] ${meta.border} ${meta.textAccent}`}
        >
          {node.id}
        </Badge>
        <div className="flex-1 text-sm">
          <p className="font-medium leading-snug">{labelText}</p>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-border/40 p-2">
          <NodeDetail node={node} />
        </div>
      )}
    </li>
  );
};

// ─────────────────────────── Pillar card ───────────────────────────────────

const PillarCard: React.FC<{
  pillar: string;
  node: SteepleTreePillarNode;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  query: string;
}> = ({ pillar, node, expandedIds, onToggle, query }) => {
  const allRows: NodeWithTier[] = useMemo(() => {
    const rows: NodeWithTier[] = [];
    node.active.forEach((n) => rows.push({ ...n, _tier: 'active', _pillar: pillar }));
    node.watching_authored.forEach((n) => rows.push({ ...n, _tier: 'watching_authored', _pillar: pillar }));
    node.seeded_candidates.forEach((n) => rows.push({ ...n, _tier: 'seeded_candidates', _pillar: pillar }));
    node.candidate_for_review.forEach((n) => rows.push({ ...n, _tier: 'candidate_for_review', _pillar: pillar }));
    node.deferred.forEach((n) => rows.push({ ...n, _tier: 'deferred', _pillar: pillar }));
    return rows;
  }, [node, pillar]);

  const matchesQuery = (n: NodeWithTier): boolean => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const haystack = [
      n.id,
      n.name,
      (n as SteepleSeededCandidateNode).thesis_one_line,
      (n as SteepleWatchingAuthoredNode).thesis,
      (n as SteepleWatchingAuthoredNode).system_claim,
      (n as SteepleWatchingAuthoredNode).umicore_translation_hypothesis,
      (n as SteepleSeededCandidateNode).why_eu_materials_specialty_chemicals,
      (n as SteepleSeededCandidateNode).first_research_pointer,
      (n as SteepleSubagentCandidateNode).thesis,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  };

  const grouped: Record<TierKey, NodeWithTier[]> = {
    active: [],
    watching_authored: [],
    seeded_candidates: [],
    candidate_for_review: [],
    deferred: [],
  };
  allRows.forEach((r) => grouped[r._tier].push(r));

  const tierOrder: TierKey[] = [
    'active',
    'watching_authored',
    'candidate_for_review',
    'seeded_candidates',
    'deferred',
  ];

  const totalMatching = allRows.filter(matchesQuery).length;
  const cov = node.pillar_assessment.coverage_label?.toLowerCase() || '';
  const covColor = cov.includes('gap')
    ? 'border-rose-500/40 text-rose-700 dark:text-rose-300'
    : cov.includes('thin') || cov.includes('narrow')
      ? 'border-amber-500/40 text-amber-700 dark:text-amber-300'
      : cov.includes('moderate')
        ? 'border-amber-500/40 text-amber-700 dark:text-amber-300'
        : cov.includes('good')
          ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
          : 'border-slate-400/40 text-slate-700 dark:text-slate-300';

  return (
    <Card className="rounded-2xl border-border/40">
      <CardContent className="space-y-3 p-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs ${pillarBadgeClass(pillar)}`}>
              {PILLAR_LABEL[pillar] ?? pillar}
            </Badge>
            <h3 className="text-base font-semibold">{node.counts.total_tracked} tracked</h3>
          </div>
          <div className="flex items-center gap-1.5 text-[10px]">
            {node.pillar_assessment.coverage_label && (
              <Badge variant="outline" className={`text-[10px] ${covColor}`}>
                {node.pillar_assessment.coverage_label}
              </Badge>
            )}
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
              {node.counts.active}T
            </Badge>
            <Badge variant="outline" className="border-rose-500/40 text-rose-700 dark:text-rose-300">
              {node.counts.watching_authored}W
            </Badge>
            <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300">
              {node.counts.seeded_candidates} seeded
            </Badge>
            {node.counts.candidate_for_review > 0 && (
              <Badge variant="outline" className="border-violet-500/40 text-violet-700 dark:text-violet-300">
                +{node.counts.candidate_for_review} review
              </Badge>
            )}
            {node.counts.deferred > 0 && (
              <Badge variant="outline" className="border-slate-400/40 text-slate-700 dark:text-slate-300">
                {node.counts.deferred} deferred
              </Badge>
            )}
          </div>
        </div>

        {/* Pillar assessment note */}
        {node.pillar_assessment.note && (
          <p className="text-xs italic text-muted-foreground">{node.pillar_assessment.note}</p>
        )}

        {/* Empty pillar warning */}
        {node.counts.total_tracked === 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.04] p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Pillar empty</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Nothing tracked. See sub-gaps below for unauthored axes.
              </p>
            </div>
          </div>
        )}

        {/* Query hit count */}
        {query.trim() && (
          <p className="text-[10px] text-muted-foreground">
            {totalMatching} of {allRows.length} matching “{query}”
          </p>
        )}

        {/* Tier groups */}
        {tierOrder.map((tier) => {
          const rows = grouped[tier];
          if (rows.length === 0) return null;
          const meta = TIER_META[tier];
          const Icon = meta.icon;
          return (
            <div key={tier}>
              <div className="mb-1 flex items-center gap-1.5">
                <Icon className={`h-3 w-3 ${meta.textAccent}`} />
                <p className={`text-[10px] font-semibold uppercase tracking-wide ${meta.textAccent}`}>
                  {meta.label} · {rows.length}
                </p>
                <span className="text-[10px] text-muted-foreground">— {meta.description}</span>
              </div>
              <ul className="space-y-1">
                {rows.map((n) => (
                  <NodeRow
                    key={`${tier}-${n.id}`}
                    node={n}
                    expanded={expandedIds.has(`${pillar}-${n.id}`)}
                    onToggle={() => onToggle(`${pillar}-${n.id}`)}
                    matchesQuery={matchesQuery(n)}
                  />
                ))}
              </ul>
            </div>
          );
        })}

        {/* Remaining sub-gaps (text-only) */}
        {node.remaining_subgaps.length > 0 && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.03] p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <CircleDashed className="h-3 w-3 text-amber-600" />
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                Remaining sub-gaps · {node.remaining_subgaps.length}
              </p>
            </div>
            <ul className="space-y-0.5 pl-4 text-[11px] text-muted-foreground">
              {node.remaining_subgaps.map((g, i) => (
                <li key={i} className="list-disc leading-relaxed">{g}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─────────────────────────── Main view ─────────────────────────────────────

export const OutsideInSteepleWatchView: React.FC = () => {
  const { crowsNestV2Data } = useForesight();
  const oi = crowsNestV2Data?.outside_in;

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const tree = oi?.steeple_tree as SteepleTreePayload | undefined;

  // Totals across the whole tree
  const totals = useMemo(() => {
    const init = { active: 0, watching: 0, seeded: 0, review: 0, deferred: 0, subgaps: 0, total: 0 };
    if (!tree) return init;
    PILLAR_ORDER.forEach((p) => {
      const n = tree[p];
      if (!n) return;
      init.active += n.counts.active;
      init.watching += n.counts.watching_authored;
      init.seeded += n.counts.seeded_candidates;
      init.review += n.counts.candidate_for_review;
      init.deferred += n.counts.deferred;
      init.subgaps += n.counts.remaining_subgaps;
      init.total += n.counts.total_tracked;
    });
    return init;
  }, [tree]);

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

  if (!tree) {
    return (
      <Card className="rounded-3xl border-amber-500/30 bg-amber-500/[0.04]">
        <CardContent className="p-8 space-y-2">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
            STEEPLE tree missing from bundle
          </p>
          <p className="text-xs text-muted-foreground">
            Bundle does not include <code className="rounded bg-muted px-1">outside_in.steeple_tree</code>.
            Re-run <code className="rounded bg-muted px-1">build_dashboard_bundle_v3.py</code> to regenerate.
          </p>
        </CardContent>
      </Card>
    );
  }

  const expandAll = () => {
    const all = new Set<string>();
    PILLAR_ORDER.forEach((p) => {
      const n = tree[p];
      if (!n) return;
      [...n.active, ...n.watching_authored, ...n.seeded_candidates, ...n.candidate_for_review, ...n.deferred].forEach(
        (x) => all.add(`${p}-${x.id}`),
      );
    });
    setExpandedIds(all);
  };
  const collapseAll = () => setExpandedIds(new Set());

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <Card className="rounded-2xl border-border/40">
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Compass className="h-5 w-5 text-rose-500" />
                STEEPLE Watch — full deep-dive tree
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                All six STEEPLE pillars joined: active drivers, watching drivers, seeded candidates,
                surfaced-this-cycle, deferrals, and remaining sub-gaps. <strong>NOT bet-filtered.</strong>{' '}
                Click any row for inline detail. Last cycle:{' '}
                {oi.latest_cycle ? oi.latest_cycle.cycle_date : 'none'} · {oi.counts.recent_routing_rows}{' '}
                recent routing rows.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
                {totals.active} active
              </Badge>
              <Badge variant="outline" className="border-rose-500/40 text-rose-700 dark:text-rose-300">
                {totals.watching} watching
              </Badge>
              <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300">
                {totals.seeded} seeded
              </Badge>
              {totals.review > 0 && (
                <Badge variant="outline" className="border-violet-500/40 text-violet-700 dark:text-violet-300">
                  {totals.review} for review
                </Badge>
              )}
              {totals.deferred > 0 && (
                <Badge variant="outline" className="border-slate-400/40 text-slate-700 dark:text-slate-300">
                  {totals.deferred} deferred
                </Badge>
              )}
              <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300">
                {totals.subgaps} sub-gaps
              </Badge>
              <Badge variant="outline" className="border-slate-400/40 text-slate-700 dark:text-slate-300">
                {totals.total} total tracked
              </Badge>
            </div>
          </div>

          {/* Search + expand controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by id, thesis, Umicore translation, research pointer…"
                className="w-full rounded-md border border-border/60 bg-background py-1.5 pl-8 pr-2 text-xs"
              />
            </div>
            <button
              type="button"
              onClick={expandAll}
              className="rounded-md border border-border/60 bg-background px-2 py-1 text-[11px] hover:bg-muted/40"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="rounded-md border border-border/60 bg-background px-2 py-1 text-[11px] hover:bg-muted/40"
            >
              Collapse all
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Pillar grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {PILLAR_ORDER.map((pillar) => {
          const node = tree[pillar];
          if (!node) return null;
          return (
            <PillarCard
              key={pillar}
              pillar={pillar}
              node={node}
              expandedIds={expandedIds}
              onToggle={toggle}
              query={query}
            />
          );
        })}
      </div>
    </div>
  );
};
