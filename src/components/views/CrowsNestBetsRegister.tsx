/**
 * CrowsNestBetsRegister — Phase A3 top-level view.
 *
 * The collaborative bets register: every projection on one page with system_claim,
 * user_assertion, divergence, conviction tier, research priority. Sortable.
 *
 * Click any row → drills into the projection detail (Level 3) where the inline
 * editor (Sheet panel) appears for setting user assertions.
 *
 * Per the clarity directive: this view is data-dense by design (it's the
 * register, not a verdict surface) but every column header has a 1-line
 * explanation, and the divergence column is colour-coded so the eye picks it
 * out instantly.
 */
import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useForesight } from '@/contexts/ForesightContext';
import {
  CrowsNestProjection,
  truthLikelihoodToHex,
  plainTierToBadgeClass,
  divergenceSeverityBadgeClass,
  researchPriorityBadge,
} from '@/types/crows-nest';
import { ChevronRight, Layers, AlertCircle, Filter, ArrowUpDown, Pencil } from 'lucide-react';

interface CrowsNestBetsRegisterProps {
  onSelectProjection: (projectionId: string) => void;
  onSelectDimension: (dimensionId: string) => void;
  onOpenEditor?: (projectionId: string) => void;
}

type SortKey =
  | 'projection'
  | 'dimension'
  | 'tier'
  | 'tl'
  | 'priority'
  | 'divergence'
  | 'resolution_date';

type FilterMode = 'all' | 'divergent' | 'elevated' | 'overridden';

interface RegisterRow {
  projection: CrowsNestProjection;
  dimension_id: string;
  dimension_name: string;
}

export const CrowsNestBetsRegister: React.FC<CrowsNestBetsRegisterProps> = ({
  onSelectProjection,
  onOpenEditor,
}) => {
  const { crowsNestData } = useForesight();
  const [sortKey, setSortKey] = useState<SortKey>('priority');
  const [sortAsc, setSortAsc] = useState(false);
  const [filter, setFilter] = useState<FilterMode>('all');

  // Flatten all projections with their parent-dimension context
  const rows: RegisterRow[] = useMemo(() => {
    if (!crowsNestData) return [];
    const out: RegisterRow[] = [];
    for (const dim of crowsNestData.dimensions) {
      for (const p of dim.projections) {
        out.push({ projection: p, dimension_id: dim.id, dimension_name: dim.name });
      }
    }
    return out;
  }, [crowsNestData]);

  const filtered = useMemo(() => {
    if (filter === 'divergent') return rows.filter((r) => r.projection.divergence);
    if (filter === 'elevated') return rows.filter((r) => r.projection.research_priority === 'elevated');
    if (filter === 'overridden') return rows.filter((r) => r.projection.user_assertion);
    return rows;
  }, [rows, filter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortAsc ? 1 : -1;
    const severityOrder: Record<string, number> = { material: 3, moderate: 2, minor: 1 };
    const priorityOrder: Record<string, number> = { elevated: 3, auto: 2, deferred: 1 };

    arr.sort((a, b) => {
      const pa = a.projection;
      const pb = b.projection;
      switch (sortKey) {
        case 'projection':
          return pa.id.localeCompare(pb.id) * dir;
        case 'dimension':
          return a.dimension_id.localeCompare(b.dimension_id) * dir;
        case 'tier':
          return (pa.current.conviction_tier || '').localeCompare(pb.current.conviction_tier || '') * dir;
        case 'tl':
          return (pa.current.truth_likelihood - pb.current.truth_likelihood) * dir;
        case 'priority':
          return (
            (priorityOrder[pb.research_priority || 'auto'] - priorityOrder[pa.research_priority || 'auto']) *
            (sortAsc ? -1 : 1)
          );
        case 'divergence':
          return (
            (severityOrder[pb.divergence?.severity || ''] || 0) -
            (severityOrder[pa.divergence?.severity || ''] || 0)
          ) * (sortAsc ? -1 : 1);
        case 'resolution_date':
          return (pa.resolution_date || '').localeCompare(pb.resolution_date || '') * dir;
      }
    });
    return arr;
  }, [filtered, sortKey, sortAsc]);

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

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Hero verdict + filters */}
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
                Each projection has a <strong className="text-foreground">system claim</strong> (what the system
                inferred from analysis-stack data). You can override any one with a{' '}
                <strong className="text-foreground">user assertion</strong> — for example if the company believes
                LFP share will be 30% rather than the system's 40% read. Divergent projections are auto-elevated
                in the research queue and become the next cycle's research focus.
              </p>
            </div>
          </div>

          {/* Totals strip */}
          {totals ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-rose-500/10">
              <div className="rounded-lg border border-border/40 bg-background/50 p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Projections</div>
                <div className="text-lg font-semibold text-foreground tabular-nums">{totals.all_projections}</div>
              </div>
              <div className="rounded-lg border border-border/40 bg-background/50 p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">User overrides</div>
                <div className="text-lg font-semibold text-foreground tabular-nums">{totals.with_user_assertion}</div>
              </div>
              <div className="rounded-lg border border-rose-500/40 bg-rose-500/[0.06] p-3">
                <div className="text-[10px] uppercase tracking-wide text-rose-700 dark:text-rose-300">Material divergence</div>
                <div className="text-lg font-semibold text-rose-700 dark:text-rose-300 tabular-nums">
                  {totals.divergent_material}
                </div>
              </div>
              <div className="rounded-lg border border-orange-500/40 bg-orange-500/[0.06] p-3">
                <div className="text-[10px] uppercase tracking-wide text-orange-700 dark:text-orange-300">Elevated priority</div>
                <div className="text-lg font-semibold text-orange-700 dark:text-orange-300 tabular-nums">
                  {totals.elevated_priority}
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Filter pills */}
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
              ? `all (${rows.length})`
              : mode === 'divergent'
              ? `divergent (${rows.filter((r) => r.projection.divergence).length})`
              : mode === 'elevated'
              ? `elevated (${rows.filter((r) => r.projection.research_priority === 'elevated').length})`
              : `overridden (${rows.filter((r) => r.projection.user_assertion).length})`}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-muted-foreground/70">
          click any row → projection detail with inline editor
        </span>
      </div>

      {/* The table */}
      <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/50">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">
                <SortHeader label="Projection" active={sortKey === 'projection'} asc={sortAsc} onClick={() => toggleSort('projection')} />
              </th>
              <th className="px-3 py-2 text-left w-16">
                <SortHeader label="Dim" active={sortKey === 'dimension'} asc={sortAsc} onClick={() => toggleSort('dimension')} />
              </th>
              <th className="px-3 py-2 text-left">System claim</th>
              <th className="px-3 py-2 text-left">User assertion</th>
              <th className="px-3 py-2 text-left">
                <SortHeader label="Divergence" active={sortKey === 'divergence'} asc={sortAsc} onClick={() => toggleSort('divergence')} />
              </th>
              <th className="px-3 py-2 text-left">
                <SortHeader label="Tier" active={sortKey === 'tier'} asc={sortAsc} onClick={() => toggleSort('tier')} />
              </th>
              <th className="px-3 py-2 text-right">
                <SortHeader label="TL" active={sortKey === 'tl'} asc={sortAsc} onClick={() => toggleSort('tl')} />
              </th>
              <th className="px-3 py-2 text-left w-20">
                <SortHeader label="Priority" active={sortKey === 'priority'} asc={sortAsc} onClick={() => toggleSort('priority')} />
              </th>
              <th className="px-3 py-2 text-left">
                <SortHeader label="Resolves" active={sortKey === 'resolution_date'} asc={sortAsc} onClick={() => toggleSort('resolution_date')} />
              </th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ projection, dimension_id }) => {
              const tl = projection.current.truth_likelihood;
              const tlColor = truthLikelihoodToHex(tl);
              const tier = projection.current.plain_tier || projection.plain_outcome_phrase || '—';
              const tierBadge = plainTierToBadgeClass(tier);
              const div = projection.divergence;
              const divBadge = divergenceSeverityBadgeClass(div?.severity);
              const priority = researchPriorityBadge(projection.research_priority);

              return (
                <tr
                  key={projection.id}
                  onClick={() => onSelectProjection(projection.id)}
                  className="border-t border-border/30 cursor-pointer hover:bg-rose-500/[0.04] transition"
                >
                  <td className="px-3 py-2.5 align-top">
                    <div className="text-xs font-mono text-muted-foreground">{projection.id}</div>
                    <div className="text-xs text-foreground line-clamp-1 mt-0.5 max-w-md">
                      {projection.claim}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <span className="rounded border border-border/40 bg-background/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                      {dimension_id}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <TruncCell
                      value={projection.system_claim?.target_value}
                      claim={projection.system_claim?.claim}
                      metric={projection.system_claim?.target_metric}
                    />
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    {projection.user_assertion ? (
                      <TruncCell
                        value={projection.user_assertion.target_value}
                        claim={projection.user_assertion.claim}
                        metric={projection.user_assertion.target_metric}
                        emphasis
                      />
                    ) : (
                      <span className="text-[10px] text-muted-foreground/50 italic">— no override —</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    {div ? (
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${divBadge}`}
                            >
                              <AlertCircle className="h-2.5 w-2.5" />
                              {div.severity}
                              {typeof div.delta === 'number' ? (
                                <span className="font-mono ml-0.5">
                                  {div.delta > 0 ? '+' : ''}
                                  {div.delta.toFixed(2)}
                                </span>
                              ) : null}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-xs">
                            <div className="font-medium mb-1">Divergence</div>
                            <div className="text-muted-foreground">{div.summary}</div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${tierBadge}`}>
                      {tier}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 align-top text-right">
                    <span className="font-medium tabular-nums" style={{ color: tlColor }}>
                      {Math.round(tl * 100)}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${priority.className}`}>
                      {priority.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 align-top text-xs text-muted-foreground tabular-nums">
                    {projection.resolution_date}
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <div className="flex items-center gap-1">
                      {onOpenEditor ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenEditor(projection.id);
                          }}
                          title="Edit / override projection"
                          className="rounded p-1 text-muted-foreground/60 hover:bg-rose-500/10 hover:text-rose-500 transition"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground italic">
            No projections match the current filter.
          </div>
        ) : null}
      </div>
    </div>
  );
};

const SortHeader: React.FC<{ label: string; active: boolean; asc: boolean; onClick: () => void }> = ({
  label,
  active,
  asc,
  onClick,
}) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={`inline-flex items-center gap-1 hover:text-foreground transition ${active ? 'text-foreground' : ''}`}
  >
    {label}
    <ArrowUpDown className={`h-3 w-3 ${active ? 'opacity-100' : 'opacity-30'} ${active && asc ? 'rotate-180' : ''}`} />
  </button>
);

const TruncCell: React.FC<{
  value?: number | string | null;
  claim?: string | null;
  metric?: string | null;
  emphasis?: boolean;
}> = ({ value, claim, metric, emphasis }) => {
  const valueStr =
    typeof value === 'number'
      ? value > 0 && value <= 1.5
        ? `${(value * 100).toFixed(0)}%`
        : value.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : value || '';

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`max-w-[200px] ${emphasis ? 'text-foreground font-medium' : 'text-foreground/80'}`}>
            {valueStr ? (
              <div className="text-xs tabular-nums">
                <span className={emphasis ? 'text-rose-700 dark:text-rose-300' : ''}>{valueStr}</span>
                {metric ? <span className="text-muted-foreground/70"> · {(metric || '').slice(0, 40)}{metric.length > 40 ? '…' : ''}</span> : null}
              </div>
            ) : (
              <div className="text-xs text-foreground/80 line-clamp-1">{(claim || '').slice(0, 60)}</div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-md text-xs">
          <div className="font-medium mb-0.5">{claim || valueStr}</div>
          {metric ? <div className="text-muted-foreground text-[10px]">Metric: {metric}</div> : null}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
