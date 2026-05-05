/**
 * CrowsNestBetsRegister — Phase A3 top-level view (revised).
 *
 * The collaborative bets register, GROUPED BY DIMENSION:
 *   - each dimension is a collapsible section with its own header (state badge,
 *     counts, "Open dimension" button)
 *   - inside each section, projection rows show the claim as primary text and
 *     the technical ID as a small chip, so the page reads like a brief, not a
 *     database export
 *
 * Divergence is direction-agnostic — any user assertion that differs from the
 * system claim (whether more or less aggressive) is flagged. The badge shows
 * absolute magnitude + a neutral "diverges" label so the eye doesn't read +/-
 * as good/bad.
 *
 * Click anywhere on a row → projection drill. Click the pencil → editor sheet.
 * Click the dimension header (or its "Open dimension" button) → drills into
 * the full dimension view.
 */
import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useForesight } from '@/contexts/ForesightContext';
import {
  CrowsNestProjection,
  CrowsNestDimension,
  ProjectionProvenance,
  truthLikelihoodToHex,
  plainTierToBadgeClass,
  divergenceSeverityBadgeClass,
  researchPriorityBadge,
} from '@/types/crows-nest';
import {
  StrategicBet,
  ProjectionV2,
  tierBadgeClass,
  trajectorySymbol,
  v2TruthLikelihood,
  v2Tier,
} from '@/types/crows-nest-v2';
import {
  ChevronRight,
  ChevronDown,
  Layers,
  AlertCircle,
  Filter,
  ArrowUpDown,
  Pencil,
  ArrowRight,
  BookText,
  Target,
  Calendar,
  Compass,
  ShieldAlert,
} from 'lucide-react';

interface CrowsNestBetsRegisterProps {
  onSelectProjection: (projectionId: string) => void;
  onSelectDimension: (dimensionId: string) => void;
  onOpenEditor?: (projectionId: string) => void;
}

type SortKey = 'priority' | 'tl' | 'divergence' | 'resolution_date' | 'projection';
type FilterMode = 'all' | 'divergent' | 'elevated' | 'overridden';

interface DimensionGroup {
  dimension: CrowsNestDimension;
  projections: CrowsNestProjection[];
  totals: {
    projections: number;
    overridden: number;
    divergent: number;
    elevated: number;
  };
}

export const CrowsNestBetsRegister: React.FC<CrowsNestBetsRegisterProps> = ({
  onSelectProjection,
  onSelectDimension,
  onOpenEditor,
}) => {
  const { crowsNestData, crowsNestV2Data } = useForesight();
  const [sortKey, setSortKey] = useState<SortKey>('priority');
  const [sortAsc, setSortAsc] = useState(false);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups: DimensionGroup[] = useMemo(() => {
    if (!crowsNestData) return [];
    const out: DimensionGroup[] = [];
    for (const dim of crowsNestData.dimensions) {
      const projs = dim.projections;
      const overridden = projs.filter((p) => p.user_assertion).length;
      const divergent = projs.filter((p) => p.divergence).length;
      const elevated = projs.filter((p) => p.research_priority === 'elevated').length;
      out.push({
        dimension: dim,
        projections: projs,
        totals: { projections: projs.length, overridden, divergent, elevated },
      });
    }
    return out;
  }, [crowsNestData]);

  // v2-aware: when a v2 bundle is loaded, render the 7 v2 bets grouped by bet
  // through the same dimension-grouped visual idiom as v1. Hooks above run
  // unconditionally so the order is stable across loaded/unloaded transitions.
  if (crowsNestV2Data) {
    return (
      <CrowsNestBetsRegisterV2
        data={crowsNestV2Data}
        onSelectProjection={onSelectProjection}
      />
    );
  }

  const passesFilter = (p: CrowsNestProjection): boolean => {
    if (filter === 'all') return true;
    if (filter === 'divergent') return Boolean(p.divergence);
    if (filter === 'elevated') return p.research_priority === 'elevated';
    if (filter === 'overridden') return Boolean(p.user_assertion);
    return true;
  };

  const sortProjections = (projs: CrowsNestProjection[]): CrowsNestProjection[] => {
    const arr = [...projs].filter(passesFilter);
    const dir = sortAsc ? 1 : -1;
    const severityOrder: Record<string, number> = { material: 3, moderate: 2, minor: 1 };
    const priorityOrder: Record<string, number> = { elevated: 3, auto: 2, deferred: 1 };

    arr.sort((a, b) => {
      switch (sortKey) {
        case 'projection':
          return a.id.localeCompare(b.id) * dir;
        case 'tl':
          return (a.current.truth_likelihood - b.current.truth_likelihood) * dir;
        case 'priority':
          return (
            (priorityOrder[b.research_priority || 'auto'] - priorityOrder[a.research_priority || 'auto']) *
            (sortAsc ? -1 : 1)
          );
        case 'divergence':
          return (
            ((severityOrder[b.divergence?.severity || ''] || 0) - (severityOrder[a.divergence?.severity || ''] || 0)) *
            (sortAsc ? -1 : 1)
          );
        case 'resolution_date':
          return (a.resolution_date || '').localeCompare(b.resolution_date || '') * dir;
      }
    });
    return arr;
  };

  if (!crowsNestData) {
    return (
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04]">
        <CardContent className="p-8">
          <p className="text-sm text-muted-foreground">No data loaded.</p>
        </CardContent>
      </Card>
    );
  }

  const totals = crowsNestData.bets_register?.totals;
  const totalDivergent = groups.reduce((s, g) => s + g.totals.divergent, 0);
  const totalOverridden = groups.reduce((s, g) => s + g.totals.overridden, 0);
  const totalElevated = groups.reduce((s, g) => s + g.totals.elevated, 0);
  const totalAll = groups.reduce((s, g) => s + g.totals.projections, 0);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const toggleCollapsed = (dimId: string) =>
    setCollapsed((prev) => ({ ...prev, [dimId]: !prev[dimId] }));

  return (
    <div className="space-y-5">
      {/* Hero verdict + totals */}
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04] shadow-sm">
        <CardContent className="p-6 md:p-8 space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-rose-500/10 p-2">
              <Layers className="h-5 w-5 text-rose-500" />
            </div>
            <div className="flex-1 space-y-1.5">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground leading-snug">
                Bets register — the projection set the company is implicitly betting on
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Each projection has a <strong className="text-foreground">system claim</strong> (what the analysis
                stack inferred). You can override any one with your own{' '}
                <strong className="text-foreground">assertion</strong> — for example if the company believes LFP
                share will be 30% rather than the system's 40%, or 50% rather than 40%. Any divergence in
                either direction is flagged and elevated for the next research cycle.
              </p>
            </div>
          </div>

          {totals ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-rose-500/10">
              <div className="rounded-lg border border-border/40 bg-background/50 p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Projections</div>
                <div className="text-lg font-semibold text-foreground tabular-nums">{totalAll}</div>
              </div>
              <div className="rounded-lg border border-border/40 bg-background/50 p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Your overrides</div>
                <div className="text-lg font-semibold text-foreground tabular-nums">{totalOverridden}</div>
              </div>
              <div className="rounded-lg border border-rose-500/40 bg-rose-500/[0.06] p-3">
                <div className="text-[10px] uppercase tracking-wide text-rose-700 dark:text-rose-300">
                  Divergent (any direction)
                </div>
                <div className="text-lg font-semibold text-rose-700 dark:text-rose-300 tabular-nums">
                  {totalDivergent}
                </div>
              </div>
              <div className="rounded-lg border border-orange-500/40 bg-orange-500/[0.06] p-3">
                <div className="text-[10px] uppercase tracking-wide text-orange-700 dark:text-orange-300">
                  Elevated for research
                </div>
                <div className="text-lg font-semibold text-orange-700 dark:text-orange-300 tabular-nums">
                  {totalElevated}
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Filter + sort controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">show:</span>
        {(['all', 'divergent', 'elevated', 'overridden'] as FilterMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setFilter(mode)}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              filter === mode
                ? 'border-rose-500/50 bg-rose-500/[0.08] text-rose-700 dark:text-rose-300 font-medium'
                : 'border-border/40 bg-background/60 text-muted-foreground hover:border-rose-500/30'
            }`}
          >
            {mode === 'all'
              ? `all (${totalAll})`
              : mode === 'divergent'
              ? `divergent (${totalDivergent})`
              : mode === 'elevated'
              ? `elevated (${totalElevated})`
              : `overridden (${totalOverridden})`}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="uppercase tracking-wide">sort:</span>
          {(
            [
              ['priority', 'priority'],
              ['divergence', 'divergence'],
              ['tl', 'truth-likelihood'],
              ['resolution_date', 'resolves'],
            ] as Array<[SortKey, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => toggleSort(key)}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition ${
                sortKey === key
                  ? 'border-rose-500/40 bg-rose-500/[0.06] text-rose-700 dark:text-rose-300'
                  : 'border-border/40 bg-background/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
              <ArrowUpDown
                className={`h-3 w-3 ${sortKey === key ? 'opacity-100' : 'opacity-40'} ${
                  sortKey === key && sortAsc ? 'rotate-180' : ''
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Dimension-grouped sections */}
      <div className="space-y-3">
        {groups.map((group) => {
          const dim = group.dimension;
          const sortedProjections = sortProjections(group.projections);
          const isCollapsed = collapsed[dim.id] === true;
          const hidden = filter !== 'all' && sortedProjections.length === 0;
          if (hidden) return null;

          const dimTierBadge = plainTierToBadgeClass(dim.plain_state || dim.current.plain_tier || 'mixed');

          return (
            <div
              key={dim.id}
              className="overflow-hidden rounded-2xl border border-border/40 bg-card/40"
            >
              {/* Dimension header */}
              <div
                className="flex flex-wrap items-center gap-3 border-b border-border/30 bg-muted/20 px-4 py-3 cursor-pointer hover:bg-rose-500/[0.04] transition"
                onClick={() => toggleCollapsed(dim.id)}
              >
                <button
                  className="flex items-center text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCollapsed(dim.id);
                  }}
                  title={isCollapsed ? 'Expand' : 'Collapse'}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                <span className="rounded-md border border-rose-500/30 bg-rose-500/[0.06] px-2 py-0.5 text-xs font-mono font-semibold text-rose-700 dark:text-rose-300">
                  {dim.id}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm md:text-base font-semibold text-foreground">{dim.name}</h3>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${dimTierBadge}`}
                    >
                      {dim.plain_state || dim.current.plain_tier}
                    </span>
                  </div>
                  {dim.implicit_bet ? (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{dim.implicit_bet}</p>
                  ) : null}
                </div>

                {/* Per-dimension counts */}
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="rounded-full border border-border/40 bg-background/60 px-2 py-0.5 tabular-nums">
                    {group.totals.projections} projections
                  </span>
                  {group.totals.divergent > 0 ? (
                    <span className="rounded-full border border-rose-500/40 bg-rose-500/[0.06] px-2 py-0.5 text-rose-700 dark:text-rose-300 tabular-nums">
                      {group.totals.divergent} divergent
                    </span>
                  ) : null}
                  {group.totals.elevated > 0 ? (
                    <span className="rounded-full border border-orange-500/40 bg-orange-500/[0.06] px-2 py-0.5 text-orange-700 dark:text-orange-300 tabular-nums">
                      {group.totals.elevated} elevated
                    </span>
                  ) : null}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectDimension(dim.id);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/[0.06] px-3 py-1 text-xs text-rose-700 dark:text-rose-300 hover:bg-rose-500/[0.12] transition"
                  title={`Open ${dim.name} dimension`}
                >
                  Open dimension
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {/* Projection rows */}
              {!isCollapsed ? (
                sortedProjections.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-muted-foreground italic">
                    No projections in this dimension match the current filter.
                  </div>
                ) : (
                  <ul className="divide-y divide-border/30">
                    {sortedProjections.map((projection) => (
                      <ProjectionRow
                        key={projection.id}
                        projection={projection}
                        onSelect={() => onSelectProjection(projection.id)}
                        onOpenEditor={onOpenEditor ? () => onOpenEditor(projection.id) : undefined}
                      />
                    ))}
                  </ul>
                )
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface ProjectionRowProps {
  projection: CrowsNestProjection;
  onSelect: () => void;
  onOpenEditor?: () => void;
}

const STREAM_LABEL: Record<string, string> = {
  strategic: 'Strategic',
  financial: 'Financial',
  macro: 'Macro',
  convergence: 'Convergence',
};

const STREAM_TONE: Record<string, string> = {
  strategic: 'border-sky-500/40 bg-sky-500/[0.08] text-sky-700 dark:text-sky-300',
  financial: 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300',
  macro: 'border-amber-500/40 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300',
  convergence: 'border-violet-500/40 bg-violet-500/[0.08] text-violet-700 dark:text-violet-300',
};

const ProvenanceTooltip: React.FC<{ provenance: ProjectionProvenance }> = ({ provenance }) => {
  const conf = provenance.confidence;
  const confTone =
    conf === 'high'
      ? 'text-emerald-700 dark:text-emerald-300'
      : conf === 'low'
      ? 'text-amber-700 dark:text-amber-300'
      : 'text-muted-foreground';

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground hover:border-border hover:bg-background cursor-help"
          >
            <BookText className="h-2.5 w-2.5" />
            based on {provenance.source_streams.length} stream{provenance.source_streams.length === 1 ? '' : 's'}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-md text-xs p-0 overflow-hidden">
          <div className="bg-card border-b border-border/40 p-2.5">
            <div className="flex items-center justify-between mb-1">
              <div className="font-medium text-foreground">Provenance</div>
              <span className={`text-[10px] uppercase font-medium ${confTone}`}>
                {conf} confidence
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {provenance.source_streams.map((s) => (
                <span
                  key={s}
                  className={`rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-wide ${STREAM_TONE[s] || 'border-border/40 bg-background/60 text-muted-foreground'}`}
                >
                  {STREAM_LABEL[s] || s}
                </span>
              ))}
            </div>
          </div>
          <div className="p-2.5 space-y-2 max-h-80 overflow-y-auto">
            {provenance.source_artefacts.slice(0, 6).map((art, i) => (
              <div key={i} className="text-[11px] leading-snug">
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <span
                    className={`rounded border px-1 py-0 text-[8px] uppercase tracking-wide ${STREAM_TONE[art.stream] || 'border-border/40 bg-background/60 text-muted-foreground'}`}
                  >
                    {STREAM_LABEL[art.stream] || art.stream}
                  </span>
                  <span className="text-muted-foreground/70 text-[9px]">{art.kind}</span>
                </div>
                <div className="font-medium text-foreground">{art.title}</div>
                <div className="text-muted-foreground italic mt-0.5">"{art.snippet}"</div>
              </div>
            ))}
            {provenance.notes ? (
              <div className="pt-1 border-t border-border/30 text-[10px] text-amber-700 dark:text-amber-300 italic">
                Note: {provenance.notes}
              </div>
            ) : null}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const ProjectionRow: React.FC<ProjectionRowProps> = ({ projection, onSelect, onOpenEditor }) => {
  const tl = projection.current.truth_likelihood;
  const tlColor = truthLikelihoodToHex(tl);
  const tier = projection.current.plain_tier || projection.plain_outcome_phrase || '—';
  const tierBadge = plainTierToBadgeClass(tier);
  const div = projection.divergence;
  const divBadge = divergenceSeverityBadgeClass(div?.severity);
  const priority = researchPriorityBadge(projection.research_priority);
  const sysClaim = projection.system_claim?.claim || projection.claim;
  const userClaim = projection.user_assertion?.claim;

  return (
    <li
      onClick={onSelect}
      className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3 cursor-pointer hover:bg-rose-500/[0.04] transition"
    >
      {/* Left: title + claim block */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${tierBadge}`}
          >
            {tier}
          </span>
          {projection.user_assertion ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/[0.08] px-2 py-0.5 text-[10px] text-rose-700 dark:text-rose-300 font-medium">
              <Pencil className="h-2.5 w-2.5" />
              your override
            </span>
          ) : null}
          {projection.provenance ? (
            <ProvenanceTooltip provenance={projection.provenance} />
          ) : null}
          <span className="rounded border border-border/30 bg-background/40 px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground/60">
            {projection.id}
          </span>
        </div>

        {/* Human title — primary visual weight */}
        {projection.human_title ? (
          <div className="text-sm md:text-[15px] font-semibold text-foreground leading-snug">
            {projection.human_title}
          </div>
        ) : null}

        {/* Formal claim — secondary */}
        <div className={`text-xs text-muted-foreground leading-snug ${projection.human_title ? 'mt-0.5' : ''}`}>
          {sysClaim}
        </div>

        {userClaim && userClaim !== sysClaim ? (
          <div className="mt-1 text-xs text-rose-700 dark:text-rose-300 leading-snug">
            <span className="text-[10px] uppercase tracking-wide text-rose-500/80 mr-1.5">your view:</span>
            {userClaim}
          </div>
        ) : null}

        {/* Plain verdict + why */}
        {projection.plain_verdict ? (
          <div className="mt-1.5 text-xs text-foreground/75 leading-snug">
            <span className="font-medium text-foreground/90">Read:</span> {projection.plain_verdict}
          </div>
        ) : null}
        {projection.plain_why ? (
          <div className="text-xs text-foreground/65 leading-snug italic">
            {projection.plain_why}
          </div>
        ) : null}

        {/* Divergence callout — direction-agnostic */}
        {div ? (
          <div className="mt-2">
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] ${divBadge}`}
                  >
                    <AlertCircle className="h-2.5 w-2.5" />
                    Diverges ({div.severity})
                    {typeof div.delta === 'number' ? (
                      <span className="font-mono font-medium ml-0.5">
                        {Math.abs(div.delta) >= 1
                          ? Math.abs(div.delta).toFixed(2)
                          : `${(Math.abs(div.delta) * 100).toFixed(0)}pp`}
                      </span>
                    ) : null}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  <div className="font-medium mb-1">Divergence (system vs your view)</div>
                  <div className="text-muted-foreground">{div.summary}</div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ) : null}
      </div>

      {/* Right: stats column */}
      <div className="flex flex-col items-end justify-between gap-1.5 min-w-[170px]">
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground/70">truth-lik.</div>
            <div className="text-sm font-semibold tabular-nums" style={{ color: tlColor }}>
              {Math.round(tl * 100)}%
            </div>
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${priority.className}`}
            title="Research priority for the next cycle"
          >
            {priority.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground tabular-nums" title="Resolution date">
            resolves {projection.resolution_date}
          </span>
          {onOpenEditor ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenEditor();
              }}
              title="Edit / override projection"
              className="rounded p-1 text-muted-foreground/60 hover:bg-rose-500/10 hover:text-rose-500 transition"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
        </div>
      </div>
    </li>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// v2-aware rendering branch
// ─────────────────────────────────────────────────────────────────────────────

interface BetsRegisterV2Props {
  data: import('@/types/crows-nest-v2').CrowsNestV2Data;
  onSelectProjection: (projectionId: string) => void;
}

const CrowsNestBetsRegisterV2: React.FC<BetsRegisterV2Props> = ({ data, onSelectProjection }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sortKey, setSortKey] = useState<'bet_id' | 'tl' | 'prior' | 'segment' | 'tier'>('bet_id');
  const [sortAsc, setSortAsc] = useState(true);

  const bets = data.bets ?? [];
  const projectionsByBet = useMemo(() => {
    const idx: Record<string, ProjectionV2[]> = {};
    for (const p of data.projections ?? []) {
      for (const link of p.propagates_to_bets ?? []) {
        if (!link.bet_id) continue;
        (idx[link.bet_id] = idx[link.bet_id] || []).push(p);
      }
    }
    return idx;
  }, [data.projections]);

  const tierRank: Record<string, number> = {
    Vulnerable: 1,
    Erosion: 2,
    Contested: 3,
    'Stationary-with-Calendared-Test': 4,
    Stationary: 5,
    Resilient: 6,
    Confirmed: 7,
  };

  const sortedBets = useMemo(() => {
    const arr = [...bets];
    arr.sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      switch (sortKey) {
        case 'bet_id':
          return a.id.localeCompare(b.id) * dir;
        case 'tl': {
          const av = v2TruthLikelihood(a.current_state) ?? 0;
          const bv = v2TruthLikelihood(b.current_state) ?? 0;
          return (av - bv) * dir;
        }
        case 'prior':
          return ((a.prior ?? 0) - (b.prior ?? 0)) * dir;
        case 'segment':
          return (a.segment || '').localeCompare(b.segment || '') * dir;
        case 'tier': {
          const ar = tierRank[v2Tier(a.current_state) || ''] ?? 99;
          const br = tierRank[v2Tier(b.current_state) || ''] ?? 99;
          return (ar - br) * dir;
        }
      }
    });
    return arr;
  }, [bets, sortKey, sortAsc]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(key === 'bet_id');
    }
  };

  const toggleExpanded = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div className="space-y-5">
      {/* Hero verdict + counts */}
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04] shadow-sm">
        <CardContent className="p-6 md:p-8 space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-rose-500/10 p-2">
              <Target className="h-5 w-5 text-rose-500" />
            </div>
            <div className="flex-1 space-y-1.5">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground leading-snug">
                Bets register — the {bets.length} load-bearing forecasts
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Each bet is a single, dated, falsifiable forecast about{' '}
                <strong className="text-foreground">{data.company}</strong>. Macro-driver priors feed
                in via weighted dependencies; indicators under those drivers provide the granular
                evidence channels. Click a bet to expand its thesis, gates, theme dependencies,
                scenarios and falsification criteria.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-rose-500/10">
            <div className="rounded-lg border border-border/40 bg-background/50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Bets</div>
              <div className="text-lg font-semibold text-foreground tabular-nums">{bets.length}</div>
            </div>
            <div className="rounded-lg border border-border/40 bg-background/50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Macro drivers</div>
              <div className="text-lg font-semibold text-foreground tabular-nums">
                {data.themes.length}
              </div>
            </div>
            <div className="rounded-lg border border-border/40 bg-background/50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Indicators</div>
              <div className="text-lg font-semibold text-foreground tabular-nums">
                {data.projections.length}
              </div>
            </div>
            <div className="rounded-lg border border-border/40 bg-background/50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">As of</div>
              <div className="text-sm font-medium text-foreground tabular-nums">{data.as_of}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sort bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Sort by:</span>
        {(['bet_id', 'tl', 'prior', 'segment', 'tier'] as const).map((k) => (
          <button
            key={k}
            onClick={() => toggleSort(k)}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition ${
              sortKey === k
                ? 'border-rose-500/50 bg-rose-500/[0.10] text-rose-700 dark:text-rose-300 font-medium'
                : 'border-border/40 bg-background/60 text-muted-foreground hover:border-rose-500/30'
            }`}
          >
            {k === 'bet_id'
              ? 'Bet ID'
              : k === 'tl'
              ? 'Truth-likelihood'
              : k.charAt(0).toUpperCase() + k.slice(1)}
            <ArrowUpDown className={`h-3 w-3 ${sortKey === k ? 'opacity-100' : 'opacity-40'} ${sortKey === k && !sortAsc ? 'rotate-180' : ''}`} />
          </button>
        ))}
      </div>

      {/* Bet cards */}
      <div className="space-y-3">
        {sortedBets.map((bet) => (
          <BetCardV2
            key={bet.id}
            bet={bet}
            indicators={projectionsByBet[bet.id] || []}
            expanded={!!expanded[bet.id]}
            onToggle={() => toggleExpanded(bet.id)}
            onSelectProjection={onSelectProjection}
          />
        ))}
      </div>
    </div>
  );
};

interface BetCardV2Props {
  bet: StrategicBet;
  indicators: ProjectionV2[];
  expanded: boolean;
  onToggle: () => void;
  onSelectProjection: (id: string) => void;
}

const BetCardV2: React.FC<BetCardV2Props> = ({
  bet,
  indicators,
  expanded,
  onToggle,
  onSelectProjection,
}) => {
  const tl = v2TruthLikelihood(bet.current_state);
  const tier = v2Tier(bet.current_state);
  const traj = trajectorySymbol(bet.current_state.trajectory);
  const tlPct = tl !== null ? Math.round(tl * 100) : null;
  const priorPct = Math.round((bet.prior ?? 0) * 100);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/40">
      {/* Bet header — mirrors v1 dimension header */}
      <div
        className="flex flex-wrap items-center gap-3 border-b border-border/30 bg-muted/20 px-4 py-3 cursor-pointer hover:bg-rose-500/[0.04] transition"
        onClick={onToggle}
      >
        <button
          className="flex items-center text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          title={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <span className="rounded-md border border-rose-500/30 bg-rose-500/[0.06] px-2 py-0.5 text-xs font-mono font-semibold text-rose-700 dark:text-rose-300">
          {bet.id}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm md:text-base font-semibold text-foreground">{bet.label}</h3>
            {tier ? (
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${tierBadgeClass(tier)}`}>
                {tier}
              </span>
            ) : null}
            <Badge variant="outline" className="rounded-full text-[10px]">
              {bet.segment}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
            Resolves {bet.resolution_date}
          </p>
        </div>

        {/* TL / prior strip */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="rounded-full border border-border/40 bg-background/60 px-2 py-0.5 tabular-nums inline-flex items-center gap-1">
            TL <strong className="text-foreground">{tlPct !== null ? `${tlPct}%` : '—'}</strong>
            <span className={traj.color} title={traj.label}>
              {traj.symbol}
            </span>
          </span>
          <span className="rounded-full border border-border/40 bg-background/60 px-2 py-0.5 tabular-nums">
            prior {priorPct}%
          </span>
          {indicators.length > 0 ? (
            <span className="rounded-full border border-border/40 bg-background/60 px-2 py-0.5 tabular-nums">
              {indicators.length} indicator{indicators.length === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>
      </div>

      {/* Expanded body */}
      {expanded ? (
        <div className="space-y-4 p-4 md:p-5 text-sm">
          {/* Thesis cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
              <div className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300 font-semibold mb-1 flex items-center gap-1">
                <Compass className="h-3 w-3" />
                Resolves TRUE
              </div>
              <p className="text-xs text-foreground/85 leading-relaxed whitespace-pre-wrap">
                {bet.thesis_resolves_true}
              </p>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-3">
              <div className="text-[10px] uppercase tracking-wide text-rose-700 dark:text-rose-300 font-semibold mb-1 flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" />
                Resolves FALSE
              </div>
              <p className="text-xs text-foreground/85 leading-relaxed whitespace-pre-wrap">
                {bet.thesis_resolves_false}
              </p>
            </div>
          </div>

          {/* Prior rationale */}
          {bet.prior_rationale ? (
            <div className="rounded-xl border border-border/40 bg-background/40 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
                Prior rationale
              </div>
              <p className="text-xs text-foreground/85 leading-relaxed whitespace-pre-wrap">
                {bet.prior_rationale}
              </p>
            </div>
          ) : null}

          {/* Intermediate gates */}
          {bet.intermediate_gates && bet.intermediate_gates.length > 0 ? (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Intermediate gates ({bet.intermediate_gates.length})
              </div>
              <ul className="space-y-1.5">
                {bet.intermediate_gates.map((g, i) => (
                  <li key={i} className="rounded-lg border border-border/40 bg-background/40 p-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-foreground">{g.name}</span>
                      <Badge variant="outline" className="rounded-full text-[10px] font-mono">
                        {g.date}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                      {g.what_resolves}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Theme dependencies */}
          {bet.theme_dependencies && bet.theme_dependencies.length > 0 ? (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 flex items-center gap-1">
                <Layers className="h-3 w-3" />
                Macro driver dependencies ({bet.theme_dependencies.length})
              </div>
              <ul className="space-y-1.5">
                {bet.theme_dependencies.map((td, i) => (
                  <li key={i} className="rounded-lg border border-border/40 bg-background/40 p-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="rounded-full text-[10px] font-mono">
                        {td.theme_id}
                      </Badge>
                      {td.theme_label ? (
                        <span className="text-xs font-medium text-foreground">{td.theme_label}</span>
                      ) : null}
                      <Badge variant="outline" className="rounded-full text-[10px]">
                        weight {td.weight.toFixed(2)}
                      </Badge>
                      {td.role ? (
                        <Badge variant="outline" className="rounded-full text-[10px]">
                          {td.role}
                        </Badge>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Scenarios */}
          {bet.scenarios && bet.scenarios.length > 0 ? (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 flex items-center gap-1">
                <Compass className="h-3 w-3" />
                Scenarios ({bet.scenarios.length})
              </div>
              <ul className="space-y-1.5">
                {bet.scenarios.map((s, i) => (
                  <li key={i} className="rounded-lg border border-border/40 bg-background/40 p-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-foreground">{s.name}</span>
                      <Badge variant="outline" className="rounded-full text-[10px]">
                        p={Math.round((s.probability || 0) * 100)}%
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                      {s.narrative}
                    </p>
                    {s.what_makes_this_path_break ? (
                      <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed mt-1">
                        <span className="uppercase tracking-wide text-[9px]">Breaks if: </span>
                        {s.what_makes_this_path_break}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Falsification criteria */}
          {bet.falsification_criteria && bet.falsification_criteria.length > 0 ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.04] p-3">
              <div className="text-[10px] uppercase tracking-wide text-rose-700 dark:text-rose-300 font-semibold mb-1.5 flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" />
                Falsification criteria ({bet.falsification_criteria.length})
              </div>
              <ul className="list-disc list-outside pl-5 space-y-1 text-[11px] text-foreground/85 leading-relaxed">
                {bet.falsification_criteria.map((fc, i) => (
                  <li key={i}>{fc}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Indicators routed to this bet */}
          {indicators.length > 0 ? (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 flex items-center gap-1">
                <Target className="h-3 w-3" />
                Indicators feeding this bet ({indicators.length})
              </div>
              <ul className="divide-y divide-border/30 rounded-lg border border-border/40 bg-background/40 overflow-hidden">
                {indicators.map((ind) => {
                  const indTl = v2TruthLikelihood(ind.current_state);
                  const indTier = v2Tier(ind.current_state);
                  const indTraj = trajectorySymbol(ind.current_state.trajectory);
                  const link = ind.propagates_to_bets?.find((b) => b.bet_id === bet.id);
                  return (
                    <li
                      key={ind.id}
                      onClick={() => onSelectProjection(ind.id)}
                      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2 cursor-pointer hover:bg-rose-500/[0.04] transition"
                    >
                      <span className="rounded border border-rose-500/30 bg-rose-500/[0.06] px-1.5 py-0.5 text-[10px] font-mono text-rose-700 dark:text-rose-300">
                        {ind.id}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-foreground line-clamp-1">{ind.topic}</div>
                        <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                          {ind.measurable?.metric || ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        {indTier ? (
                          <span className={`rounded-full border px-1.5 py-0.5 ${tierBadgeClass(indTier)}`}>
                            {indTier}
                          </span>
                        ) : null}
                        <span className="tabular-nums">
                          TL {indTl !== null ? `${Math.round(indTl * 100)}%` : '—'}
                        </span>
                        <span className={indTraj.color} title={indTraj.label}>
                          {indTraj.symbol}
                        </span>
                        {link?.weight !== undefined ? (
                          <span className="tabular-nums" title="Propagation weight">
                            w{link.weight.toFixed(2)}
                          </span>
                        ) : null}
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {/* Breakage shape */}
          {bet.breakage_shape ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-3">
              <div className="text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-300 font-semibold mb-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Breakage shape
              </div>
              <p className="text-xs text-foreground/85 leading-relaxed whitespace-pre-wrap">
                {bet.breakage_shape}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
