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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useForesight } from '@/contexts/ForesightContext';
import {
  CrowsNestProjection,
  CrowsNestDimension,
  truthLikelihoodToHex,
  plainTierToBadgeClass,
  divergenceSeverityBadgeClass,
  researchPriorityBadge,
} from '@/types/crows-nest';
import {
  ChevronRight,
  ChevronDown,
  Layers,
  AlertCircle,
  Filter,
  ArrowUpDown,
  Pencil,
  ArrowRight,
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
  const { crowsNestData } = useForesight();
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
      {/* Left: claim block */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="rounded border border-border/40 bg-background/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/80">
            {projection.id}
          </span>
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
        </div>

        <div className="text-sm text-foreground leading-snug">{sysClaim}</div>

        {userClaim && userClaim !== sysClaim ? (
          <div className="mt-1 text-sm text-rose-700 dark:text-rose-300 leading-snug">
            <span className="text-[10px] uppercase tracking-wide text-rose-500/80 mr-1.5">your view:</span>
            {userClaim}
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
