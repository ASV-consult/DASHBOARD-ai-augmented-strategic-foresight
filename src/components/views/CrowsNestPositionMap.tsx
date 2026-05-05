/**
 * CrowsNestPositionMap — Crow's Nest 2.0 (v2) view.
 *
 * Renders the 38 sourced position components from `crowsNestV2Data.position_map`.
 * Tabs by kind (segment_position / site_footprint / offtake_book /
 * strategic_commitment / balance_sheet_position / governance_constraint /
 * technology_position / capability_position). Search by id/label, filter by
 * kind. The factual_corrections_flagged list is surfaced prominently above
 * the components.
 *
 * v2 only.
 */
import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useForesight } from '@/contexts/ForesightContext';
import {
  PositionComponent,
  positionKindLabel,
} from '@/types/crows-nest-v2';
import {
  Map,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Building2,
  CheckCircle2,
  AlertCircle,
  Network,
  BookOpen,
  Search,
} from 'lucide-react';

export const CrowsNestPositionMap: React.FC = () => {
  const { crowsNestV2Data } = useForesight();
  const [activeKind, setActiveKind] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showCorrections, setShowCorrections] = useState<boolean>(true);

  const positionMap = crowsNestV2Data?.position_map;
  const components: PositionComponent[] = positionMap?.components ?? [];
  const corrections: string[] = positionMap?.factual_corrections_flagged ?? [];

  const kinds = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of components) {
      counts[c.kind] = (counts[c.kind] || 0) + 1;
    }
    return counts;
  }, [components]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return components.filter((c) => {
      if (activeKind !== 'all' && c.kind !== activeKind) return false;
      if (q) {
        const hay = `${c.id} ${c.label} ${c.notes ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [components, activeKind, search]);

  if (!crowsNestV2Data) {
    return (
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04]">
        <CardContent className="p-8 text-center">
          <Map className="mx-auto mb-3 h-10 w-10 text-rose-500" />
          <h2 className="text-xl font-semibold text-foreground">Position Map is empty</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Upload a Crow's Nest v2 bundle (
            <code className="text-xs rounded bg-muted/40 px-1 py-0.5">
              schema_version: crows_nest_v2_dashboard_bundle
            </code>
            ) to see the sourced position components and factual corrections.
          </p>
        </CardContent>
      </Card>
    );
  }

  const toggleExpanded = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const company = crowsNestV2Data.company || positionMap?.company || '';
  const titleCompany = company ? company.charAt(0).toUpperCase() + company.slice(1) : 'Company';

  return (
    <div className="space-y-5">
      {/* Hero */}
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04] shadow-sm">
        <CardContent className="p-6 md:p-8 space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-rose-500/10 p-2">
              <Map className="h-5 w-5 text-rose-500" />
            </div>
            <div className="flex-1 space-y-1.5">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground leading-snug">
                {titleCompany} Position Map — {components.length} sourced components across{' '}
                {Object.keys(kinds).length} kinds
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Each component is one observable, sourced fact about the company's actual position
                in the world — segment economics, site footprint, offtake book, strategic
                commitments, balance-sheet locks, governance constraints, technology positions, and
                capabilities. These are the substrate that the bets and projections sit on.
              </p>
              {positionMap?.summary ? (
                <p className="text-xs text-muted-foreground leading-relaxed pt-1 border-t border-rose-500/10">
                  {positionMap.summary.slice(0, 380)}
                  {positionMap.summary.length > 380 ? '…' : ''}
                </p>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Factual corrections — prominent */}
      {corrections.length > 0 ? (
        <Card className="rounded-3xl border-amber-500/40 bg-amber-500/[0.06] shadow-sm">
          <CardContent className="p-5 space-y-3">
            <button
              onClick={() => setShowCorrections((s) => !s)}
              className="w-full text-left flex items-center gap-2"
            >
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span className="font-semibold text-foreground">
                Factual corrections flagged ({corrections.length})
              </span>
              <span className="ml-auto">
                {showCorrections ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </span>
            </button>
            {showCorrections ? (
              <ul className="space-y-2">
                {corrections.map((c, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-amber-500/30 bg-background/50 p-3 text-xs text-foreground leading-relaxed"
                  >
                    <span className="font-mono text-[10px] text-amber-700 dark:text-amber-300 mr-2">
                      [{i + 1}]
                    </span>
                    {c}
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Kind tabs + search */}
      <Card className="rounded-2xl border-border/60 bg-card/40">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveKind('all')}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                activeKind === 'all'
                  ? 'border-rose-500/50 bg-rose-500/[0.10] text-rose-700 dark:text-rose-300'
                  : 'border-border/40 text-muted-foreground hover:border-rose-500/30 hover:text-foreground'
              }`}
            >
              All ({components.length})
            </button>
            {Object.entries(kinds)
              .sort(([, a], [, b]) => b - a)
              .map(([kind, count]) => (
                <button
                  key={kind}
                  onClick={() => setActiveKind(kind)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    activeKind === kind
                      ? 'border-rose-500/50 bg-rose-500/[0.10] text-rose-700 dark:text-rose-300'
                      : 'border-border/40 text-muted-foreground hover:border-rose-500/30 hover:text-foreground'
                  }`}
                >
                  {positionKindLabel(kind)} ({count})
                </button>
              ))}
          </div>

          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by id, label, or notes…"
              className="flex-1 rounded-md border border-border/40 bg-background/50 px-2 py-1 text-xs focus:border-rose-500/40 outline-none"
            />
            <span className="text-xs text-muted-foreground tabular-nums">
              {filtered.length}/{components.length}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Components */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="rounded-2xl border-border/60 bg-card/40">
            <CardContent className="p-6 text-sm text-center text-muted-foreground">
              No components match the current filters.
            </CardContent>
          </Card>
        ) : (
          filtered.map((c) => (
            <ComponentCard
              key={c.id}
              component={c}
              expanded={!!expanded[c.id]}
              onToggle={() => toggleExpanded(c.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

interface ComponentCardProps {
  component: PositionComponent;
  expanded: boolean;
  onToggle: () => void;
}

const ComponentCard: React.FC<ComponentCardProps> = ({ component, expanded, onToggle }) => (
  <Card className="rounded-2xl border-border/60 bg-card/60 shadow-sm hover:border-rose-500/40 transition-colors">
    <CardContent className="p-4 space-y-2">
      <button onClick={onToggle} className="w-full text-left flex items-start gap-3">
        <div className="mt-1 rounded-full bg-rose-500/10 p-1.5 shrink-0">
          <Building2 className="h-3.5 w-3.5 text-rose-500" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="rounded-full text-[10px] font-mono">
              {component.id}
            </Badge>
            <Badge variant="outline" className="rounded-full text-[10px]">
              {positionKindLabel(component.kind)}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {component.citations?.length ?? 0} citation
              {(component.citations?.length ?? 0) === 1 ? '' : 's'}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-foreground leading-snug">{component.label}</h3>
        </div>
        <div className="shrink-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded ? <ComponentDetail component={component} /> : null}
    </CardContent>
  </Card>
);

const ComponentDetail: React.FC<{ component: PositionComponent }> = ({ component }) => (
  <div className="space-y-3 pt-3 border-t border-border/40 text-sm">
    {/* Decision */}
    {component.the_decision_umicore_made ? (
      <DetailSection icon={CheckCircle2} title="The decision the company made">
        <p className="text-muted-foreground leading-relaxed text-xs whitespace-pre-wrap">
          {component.the_decision_umicore_made}
        </p>
      </DetailSection>
    ) : null}

    {/* Concrete facts */}
    {component.concrete_facts && Object.keys(component.concrete_facts).length > 0 ? (
      <DetailSection icon={BookOpen} title="Concrete facts">
        <div className="rounded-lg border border-border/40 bg-background/40 p-3 space-y-1 text-xs">
          {Object.entries(component.concrete_facts).map(([k, v]) => (
            <div key={k} className="grid grid-cols-[180px_1fr] gap-2 items-start">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {k.replace(/_/g, ' ')}
              </span>
              <span className="text-foreground tabular-nums">
                {typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? '—')}
              </span>
            </div>
          ))}
        </div>
      </DetailSection>
    ) : null}

    {/* What it exposes to */}
    {component.what_it_exposes_to && component.what_it_exposes_to.length > 0 ? (
      <DetailSection
        icon={AlertCircle}
        title={`What it exposes to (${component.what_it_exposes_to.length})`}
      >
        <ul className="space-y-1 list-disc list-outside pl-5 text-muted-foreground leading-relaxed">
          {component.what_it_exposes_to.map((s, i) => (
            <li key={i} className="text-xs">
              {s}
            </li>
          ))}
        </ul>
      </DetailSection>
    ) : null}

    {/* Downstream dependencies */}
    {component.downstream_dependencies && component.downstream_dependencies.length > 0 ? (
      <DetailSection
        icon={Network}
        title={`Downstream dependencies (${component.downstream_dependencies.length})`}
      >
        <ul className="space-y-1 list-disc list-outside pl-5 text-muted-foreground leading-relaxed">
          {component.downstream_dependencies.map((s, i) => (
            <li key={i} className="text-xs">
              {s}
            </li>
          ))}
        </ul>
      </DetailSection>
    ) : null}

    {/* Citations */}
    {component.citations && component.citations.length > 0 ? (
      <DetailSection icon={BookOpen} title={`Citations (${component.citations.length})`}>
        <ul className="space-y-2">
          {component.citations.map((cit, i) => (
            <li
              key={i}
              className="rounded-lg border border-border/40 bg-background/40 p-2.5 space-y-1"
            >
              <div className="flex items-center gap-2 flex-wrap">
                {cit.stream ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-mono">
                    {cit.stream}
                  </Badge>
                ) : null}
                {cit.ref ? (
                  <span className="text-[10px] font-mono text-muted-foreground break-all">
                    {cit.ref}
                  </span>
                ) : null}
              </div>
              {cit.snippet ? (
                <p className="text-xs text-muted-foreground leading-relaxed">{cit.snippet}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </DetailSection>
    ) : null}

    {/* Notes */}
    {component.notes ? (
      <DetailSection icon={BookOpen} title="Notes">
        <p className="text-muted-foreground leading-relaxed text-xs whitespace-pre-wrap">
          {component.notes}
        </p>
      </DetailSection>
    ) : null}
  </div>
);

interface DetailSectionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}

const DetailSection: React.FC<DetailSectionProps> = ({ icon: Icon, title, children }) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
      <Icon className="h-3 w-3" />
      <span className="font-medium">{title}</span>
    </div>
    <div>{children}</div>
  </div>
);
