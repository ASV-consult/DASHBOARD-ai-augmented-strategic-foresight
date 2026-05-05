/**
 * CrowsNestProjectionsBrowse — Crow's Nest 2.0 (v2) view.
 *
 * Renders the 49 falsifiable projections from `crowsNestV2Data.projections`.
 * Filter bar (theme / bet / tier / trajectory), sortable card-grid, with an
 * inline drawer expansion showing the full claim, measurable detail, prior
 * rationale, propagation, candidate sources, and open research questions.
 *
 * Default sort: theme_id ASC, then id ASC. v2 only.
 */
import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useForesight } from '@/contexts/ForesightContext';
import {
  ProjectionV2,
  tierBadgeClass,
  trajectorySymbol,
  v2TruthLikelihood,
  v2Tier,
} from '@/types/crows-nest-v2';
import {
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Filter,
  Calendar,
  Network,
  Beaker,
  HelpCircle,
  BookText,
} from 'lucide-react';

type SortKey = 'default' | 'tl' | 'prior' | 'topic' | 'resolution_date';

const TIER_OPTIONS = [
  'all',
  'Vulnerable',
  'Erosion',
  'Contested',
  'Stationary',
  'Stationary-with-Calendared-Test',
  'Resilient',
  'Confirmed',
];
const TRAJECTORY_OPTIONS = ['all', 'rising', 'falling', 'holding', 'two-sided'];

export const CrowsNestProjectionsBrowse: React.FC = () => {
  const { crowsNestV2Data } = useForesight();
  const [filterTheme, setFilterTheme] = useState<string>('all');
  const [filterBet, setFilterBet] = useState<string>('all');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterTrajectory, setFilterTrajectory] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [sortAsc, setSortAsc] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState<string>('');

  const projections = crowsNestV2Data?.projections ?? [];
  const themes = crowsNestV2Data?.themes ?? [];
  const bets = crowsNestV2Data?.bets ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = projections.filter((p) => {
      if (filterTheme !== 'all' && p.theme_id !== filterTheme) return false;
      if (filterBet !== 'all' && !p.propagates_to_bets.some((b) => b.bet_id === filterBet))
        return false;
      const t = v2Tier(p.current_state) || '';
      if (filterTier !== 'all' && t !== filterTier) return false;
      const traj = (p.current_state.trajectory || '').toLowerCase();
      if (filterTrajectory !== 'all' && !traj.includes(filterTrajectory)) return false;
      if (q) {
        const hay = `${p.id} ${p.topic} ${p.claim_under_test} ${p.measurable?.metric ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    arr = [...arr];
    arr.sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      switch (sortKey) {
        case 'default': {
          const tCmp = a.theme_id.localeCompare(b.theme_id);
          if (tCmp !== 0) return tCmp * dir;
          return a.id.localeCompare(b.id) * dir;
        }
        case 'tl': {
          const av = v2TruthLikelihood(a.current_state) ?? 0;
          const bv = v2TruthLikelihood(b.current_state) ?? 0;
          return (av - bv) * dir;
        }
        case 'prior':
          return ((a.prior ?? 0) - (b.prior ?? 0)) * dir;
        case 'topic':
          return a.topic.localeCompare(b.topic) * dir;
        case 'resolution_date':
          return (a.resolution_date || '').localeCompare(b.resolution_date || '') * dir;
      }
    });
    return arr;
  }, [projections, filterTheme, filterBet, filterTier, filterTrajectory, sortKey, sortAsc, search]);

  if (!crowsNestV2Data) {
    return (
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04]">
        <CardContent className="p-8 text-center">
          <ClipboardList className="mx-auto mb-3 h-10 w-10 text-rose-500" />
          <h2 className="text-xl font-semibold text-foreground">Projections (v2) is empty</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Upload a Crow's Nest v2 bundle (
            <code className="text-xs rounded bg-muted/40 px-1 py-0.5">
              schema_version: crows_nest_v2_dashboard_bundle
            </code>
            ) to browse the falsifiable projections under each theme.
          </p>
        </CardContent>
      </Card>
    );
  }

  const toggleExpanded = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };
  const resetFilters = () => {
    setFilterTheme('all');
    setFilterBet('all');
    setFilterTier('all');
    setFilterTrajectory('all');
    setSearch('');
    setSortKey('default');
    setSortAsc(true);
  };

  return (
    <div className="space-y-5">
      {/* Hero */}
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04] shadow-sm">
        <CardContent className="p-6 md:p-8 space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-rose-500/10 p-2">
              <ClipboardList className="h-5 w-5 text-rose-500" />
            </div>
            <div className="flex-1 space-y-1.5">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground leading-snug">
                {projections.length} Projections — falsifiable measurables under each theme
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Each projection has a single measurable metric, a date, and explicit thresholds for
                resolution true and false. Projections anchor under one theme and propagate into
                one or more bets via weighted channels.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter & sort bar */}
      <Card className="rounded-2xl border-border/60 bg-card/40">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Filter className="h-3 w-3" />
            <span className="font-medium">Filter & sort</span>
            <span className="ml-auto tabular-nums text-foreground/80">
              {filtered.length}/{projections.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
            <FilterSelect
              label="Theme"
              value={filterTheme}
              onChange={setFilterTheme}
              options={[
                { value: 'all', label: 'All themes' },
                ...themes.map((t) => ({ value: t.id, label: `${t.id} · ${t.title}` })),
              ]}
            />
            <FilterSelect
              label="Bet"
              value={filterBet}
              onChange={setFilterBet}
              options={[
                { value: 'all', label: 'All bets' },
                ...bets.map((b) => ({ value: b.id, label: `${b.id} · ${b.label.slice(0, 35)}` })),
              ]}
            />
            <FilterSelect
              label="Tier"
              value={filterTier}
              onChange={setFilterTier}
              options={TIER_OPTIONS.map((o) => ({ value: o, label: o === 'all' ? 'All tiers' : o }))}
            />
            <FilterSelect
              label="Trajectory"
              value={filterTrajectory}
              onChange={setFilterTrajectory}
              options={TRAJECTORY_OPTIONS.map((o) => ({
                value: o,
                label: o === 'all' ? 'All trajectories' : o,
              }))}
            />
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="id / topic / metric"
                className="rounded-md border border-border/40 bg-background/50 px-2 py-1 text-xs focus:border-rose-500/40 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Sort:</span>
            {(['default', 'tl', 'prior', 'topic', 'resolution_date'] as SortKey[]).map((k) => (
              <button
                key={k}
                onClick={() => toggleSort(k)}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] transition ${
                  sortKey === k
                    ? 'border-rose-500/50 bg-rose-500/[0.10] text-rose-700 dark:text-rose-300'
                    : 'border-border/40 text-muted-foreground hover:border-rose-500/30 hover:text-foreground'
                }`}
              >
                {k === 'default'
                  ? 'Theme/ID'
                  : k === 'tl'
                  ? 'TL'
                  : k === 'resolution_date'
                  ? 'Resolves'
                  : k.charAt(0).toUpperCase() + k.slice(1)}
                {sortKey === k ? (sortAsc ? ' ▲' : ' ▼') : ''}
              </button>
            ))}
            <button
              onClick={resetFilters}
              className="ml-auto rounded-full border border-border/40 px-2.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:border-rose-500/30"
            >
              Reset
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Projection list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="rounded-2xl border-border/60 bg-card/40">
            <CardContent className="p-6 text-sm text-center text-muted-foreground">
              No projections match the current filters.
            </CardContent>
          </Card>
        ) : (
          filtered.map((p) => (
            <ProjectionCard
              key={p.id}
              projection={p}
              expanded={!!expanded[p.id]}
              onToggle={() => toggleExpanded(p.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}

const FilterSelect: React.FC<FilterSelectProps> = ({ label, value, onChange, options }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-border/40 bg-background/50 px-2 py-1 text-xs focus:border-rose-500/40 outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

interface ProjectionCardProps {
  projection: ProjectionV2;
  expanded: boolean;
  onToggle: () => void;
}

const ProjectionCard: React.FC<ProjectionCardProps> = ({ projection, expanded, onToggle }) => {
  const tl = v2TruthLikelihood(projection.current_state);
  const tier = v2Tier(projection.current_state);
  const traj = trajectorySymbol(projection.current_state.trajectory);
  const tlPct = tl !== null ? Math.round(tl * 100) : null;
  const priorPct = Math.round((projection.prior ?? 0) * 100);

  return (
    <Card className="rounded-2xl border-border/60 bg-card/60 shadow-sm hover:border-rose-500/40 transition-colors">
      <CardContent className="p-4 space-y-2">
        <button onClick={onToggle} className="w-full text-left flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="rounded-full text-[10px] font-mono">
                {projection.id}
              </Badge>
              <Badge variant="outline" className="rounded-full text-[10px] font-mono">
                {projection.theme_id}
              </Badge>
              {tier && (
                <Badge variant="outline" className={`rounded-full text-[10px] ${tierBadgeClass(tier)}`}>
                  {tier}
                </Badge>
              )}
              <span className="text-[10px] text-muted-foreground tabular-nums">
                TL{' '}
                <span className="font-semibold text-foreground">
                  {tlPct !== null ? `${tlPct}%` : '—'}
                </span>{' '}
                <span className={traj.color}>{traj.symbol}</span>
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                Prior <span className="font-semibold text-foreground">{priorPct}%</span>
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Calendar className="h-3 w-3" />
                {projection.resolution_date}
              </span>
            </div>
            <p className="text-sm text-foreground leading-snug">{projection.topic}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {projection.measurable?.metric}
            </p>
            {projection.propagates_to_bets && projection.propagates_to_bets.length > 0 ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  → bets:
                </span>
                {projection.propagates_to_bets.map((pb) => (
                  <Badge
                    key={pb.bet_id}
                    variant="outline"
                    className="rounded-full text-[10px] font-mono"
                  >
                    {pb.bet_id} · w={pb.weight.toFixed(2)}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </button>

        {expanded ? <ProjectionDetail projection={projection} /> : null}
      </CardContent>
    </Card>
  );
};

const ProjectionDetail: React.FC<{ projection: ProjectionV2 }> = ({ projection }) => (
  <div className="space-y-3 pt-3 border-t border-border/40 text-sm">
    {/* Claim under test */}
    <DetailSection icon={BookText} title="Claim under test">
      <p className="text-muted-foreground leading-relaxed text-xs">{projection.claim_under_test}</p>
    </DetailSection>

    {/* Measurable */}
    {projection.measurable ? (
      <DetailSection icon={Beaker} title="Measurable">
        <div className="rounded-lg border border-border/40 bg-background/40 p-3 space-y-1.5 text-xs">
          <KeyVal k="Metric" v={projection.measurable.metric} />
          <KeyVal k="Data source" v={projection.measurable.data_source} />
          <KeyVal k="Frequency" v={projection.measurable.frequency} />
          <KeyVal k="Current value / range" v={projection.measurable.current_value_or_range} />
          <KeyVal
            k="Threshold (resolves TRUE)"
            v={projection.measurable.threshold_for_resolution_true}
            valClassName="text-emerald-700 dark:text-emerald-300"
          />
          <KeyVal
            k="Threshold (resolves FALSE)"
            v={projection.measurable.threshold_for_resolution_false}
            valClassName="text-rose-700 dark:text-rose-300"
          />
        </div>
      </DetailSection>
    ) : null}

    {/* Prior rationale */}
    {projection.prior_rationale ? (
      <DetailSection icon={BookText} title="Prior rationale">
        <p className="text-muted-foreground leading-relaxed text-xs whitespace-pre-wrap">
          {projection.prior_rationale}
        </p>
        {projection.prior_class ? (
          <Badge variant="outline" className="mt-2 rounded-full text-[10px]">
            {projection.prior_class}
          </Badge>
        ) : null}
      </DetailSection>
    ) : null}

    {/* Propagation */}
    {projection.propagates_to_bets && projection.propagates_to_bets.length > 0 ? (
      <DetailSection
        icon={Network}
        title={`Propagates to bets (${projection.propagates_to_bets.length})`}
      >
        <ul className="space-y-2">
          {projection.propagates_to_bets.map((pb, i) => (
            <li
              key={i}
              className="rounded-lg border border-border/40 bg-background/40 p-2.5 space-y-0.5"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="rounded-full text-[10px] font-mono">
                  {pb.bet_id}
                </Badge>
                <Badge variant="outline" className="rounded-full text-[10px]">
                  weight {pb.weight.toFixed(2)}
                </Badge>
              </div>
              {pb.channel ? (
                <p className="text-xs text-muted-foreground leading-relaxed">{pb.channel}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </DetailSection>
    ) : null}

    {/* Candidate sources */}
    {projection.candidate_sources && projection.candidate_sources.length > 0 ? (
      <DetailSection icon={BookText} title="Candidate sources">
        <div className="flex flex-wrap gap-1">
          {projection.candidate_sources.map((s, i) => (
            <Badge key={i} variant="outline" className="rounded-full text-[10px] font-mono">
              {s}
            </Badge>
          ))}
        </div>
      </DetailSection>
    ) : null}

    {/* Open research questions */}
    {projection.open_research_questions && projection.open_research_questions.length > 0 ? (
      <DetailSection
        icon={HelpCircle}
        title={`Open research questions (${projection.open_research_questions.length})`}
      >
        <ul className="space-y-1 list-disc list-outside pl-5 text-muted-foreground leading-relaxed">
          {projection.open_research_questions.map((q, i) => (
            <li key={i} className="text-xs">
              {q}
            </li>
          ))}
        </ul>
      </DetailSection>
    ) : null}
  </div>
);

const KeyVal: React.FC<{ k: string; v?: string | null; valClassName?: string }> = ({
  k,
  v,
  valClassName,
}) => (
  <div className="grid grid-cols-[140px_1fr] gap-2 items-start">
    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</span>
    <span className={`text-foreground ${valClassName ?? ''}`}>{v || '—'}</span>
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
