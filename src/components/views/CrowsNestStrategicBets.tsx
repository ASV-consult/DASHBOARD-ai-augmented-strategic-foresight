/**
 * CrowsNestStrategicBets — Crow's Nest 2.0 (v2) view.
 *
 * Renders the seven load-bearing forecasts (B1..B7) from `crowsNestV2Data.bets`.
 * Hero card, filter/sort bar, grid of bet cards. Click a card to expand the
 * detail panel inline (thesis_resolves_true/false, intermediate_gates,
 * theme_dependencies, scenarios, falsification_criteria, breakage_shape,
 * named_watch_metrics).
 *
 * v2 ONLY — gracefully shows an empty state when `crowsNestV2Data` is null.
 */
import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useForesight } from '@/contexts/ForesightContext';
import {
  StrategicBet,
  tierBadgeClass,
  trajectorySymbol,
  v2TruthLikelihood,
  v2Tier,
} from '@/types/crows-nest-v2';
import {
  Target,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Calendar,
  Layers,
  ShieldAlert,
  Compass,
} from 'lucide-react';

type SortKey = 'bet_id' | 'tl' | 'prior' | 'segment' | 'tier';

const tierRank: Record<string, number> = {
  Vulnerable: 1,
  Erosion: 2,
  Contested: 3,
  'Stationary-with-Calendared-Test': 4,
  Stationary: 5,
  Resilient: 6,
  Confirmed: 7,
};

export const CrowsNestStrategicBets: React.FC = () => {
  const { crowsNestV2Data } = useForesight();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sortKey, setSortKey] = useState<SortKey>('bet_id');
  const [sortAsc, setSortAsc] = useState(true);

  const bets: StrategicBet[] = crowsNestV2Data?.bets ?? [];

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

  if (!crowsNestV2Data) {
    return (
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04]">
        <CardContent className="p-8 text-center">
          <Target className="mx-auto mb-3 h-10 w-10 text-rose-500" />
          <h2 className="text-xl font-semibold text-foreground">Strategic Bets is empty</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Upload a Crow's Nest v2 bundle (
            <code className="text-xs rounded bg-muted/40 px-1 py-0.5">
              schema_version: crows_nest_v2_dashboard_bundle
            </code>
            ) to see the seven load-bearing bets and their dependency structure.
          </p>
        </CardContent>
      </Card>
    );
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'bet_id');
    }
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-5">
      {/* Hero */}
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04] shadow-sm">
        <CardContent className="p-6 md:p-8 space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-rose-500/10 p-2">
              <Target className="h-5 w-5 text-rose-500" />
            </div>
            <div className="flex-1 space-y-1.5">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground leading-snug">
                Strategic Bets — the seven load-bearing forecasts
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Each bet is a single, dated, falsifiable forecast about{' '}
                <strong className="text-foreground">{crowsNestV2Data.company}</strong>. Theme priors
                feed in via weighted dependencies; projections under those themes provide the
                granular evidence channels. Click any card to expand the full thesis, gates,
                falsification criteria and the shape of how it breaks.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-rose-500/10">
            <div className="rounded-lg border border-border/40 bg-background/50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Bets</div>
              <div className="text-lg font-semibold text-foreground tabular-nums">{bets.length}</div>
            </div>
            <div className="rounded-lg border border-border/40 bg-background/50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Themes</div>
              <div className="text-lg font-semibold text-foreground tabular-nums">
                {crowsNestV2Data.themes.length}
              </div>
            </div>
            <div className="rounded-lg border border-border/40 bg-background/50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Projections
              </div>
              <div className="text-lg font-semibold text-foreground tabular-nums">
                {crowsNestV2Data.projections.length}
              </div>
            </div>
            <div className="rounded-lg border border-border/40 bg-background/50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">As of</div>
              <div className="text-sm font-medium text-foreground tabular-nums">
                {crowsNestV2Data.as_of}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sort bar */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground uppercase tracking-wide">Sort by:</span>
        {(['bet_id', 'tl', 'prior', 'segment', 'tier'] as SortKey[]).map((k) => (
          <button
            key={k}
            onClick={() => toggleSort(k)}
            className={`rounded-full border px-3 py-1 transition ${
              sortKey === k
                ? 'border-rose-500/50 bg-rose-500/[0.10] text-rose-700 dark:text-rose-300'
                : 'border-border/40 text-muted-foreground hover:border-rose-500/30 hover:text-foreground'
            }`}
          >
            {k === 'bet_id' ? 'Bet ID' : k === 'tl' ? 'Truth-likelihood' : k.charAt(0).toUpperCase() + k.slice(1)}
            {sortKey === k ? (sortAsc ? ' ▲' : ' ▼') : ''}
          </button>
        ))}
      </div>

      {/* Bet grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sortedBets.map((bet) => (
          <BetCard
            key={bet.id}
            bet={bet}
            expanded={!!expanded[bet.id]}
            onToggle={() => toggleExpanded(bet.id)}
          />
        ))}
      </div>
    </div>
  );
};

interface BetCardProps {
  bet: StrategicBet;
  expanded: boolean;
  onToggle: () => void;
}

const BetCard: React.FC<BetCardProps> = ({ bet, expanded, onToggle }) => {
  const tl = v2TruthLikelihood(bet.current_state);
  const tier = v2Tier(bet.current_state);
  const traj = trajectorySymbol(bet.current_state.trajectory);
  const tlPct = tl !== null ? Math.round(tl * 100) : null;
  const priorPct = Math.round((bet.prior ?? 0) * 100);

  return (
    <Card className="rounded-3xl border-border/60 bg-card/60 shadow-sm hover:border-rose-500/40 transition-colors">
      <CardContent className="p-5 space-y-3">
        {/* Header */}
        <button onClick={onToggle} className="w-full text-left flex items-start gap-3">
          <div className="mt-1 rounded-full bg-rose-500/10 p-2 shrink-0">
            <Target className="h-4 w-4 text-rose-500" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="rounded-full text-[10px] font-mono">
                {bet.id}
              </Badge>
              <Badge variant="outline" className="rounded-full text-[10px]">
                {bet.segment}
              </Badge>
              {tier && (
                <Badge variant="outline" className={`rounded-full text-[10px] ${tierBadgeClass(tier)}`}>
                  {tier}
                </Badge>
              )}
            </div>
            <h3 className="text-sm font-semibold text-foreground leading-snug">{bet.label}</h3>
          </div>
          <div className="shrink-0">
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {/* TL strip */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg border border-border/40 bg-background/40 p-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">TL</div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground tabular-nums text-base">
                {tlPct !== null ? `${tlPct}%` : '—'}
              </span>
              <span className={`text-sm ${traj.color}`} title={traj.label}>
                {traj.symbol}
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-border/40 bg-background/40 p-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Prior</div>
            <div className="font-semibold text-foreground tabular-nums text-base">{priorPct}%</div>
          </div>
          <div className="rounded-lg border border-border/40 bg-background/40 p-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Resolves</div>
            <div className="font-medium text-foreground tabular-nums text-xs flex items-center gap-1">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              {bet.resolution_date}
            </div>
          </div>
        </div>

        {/* Expanded panel */}
        {expanded ? <BetDetail bet={bet} /> : null}
      </CardContent>
    </Card>
  );
};

const BetDetail: React.FC<{ bet: StrategicBet }> = ({ bet }) => (
  <div className="space-y-4 pt-3 border-t border-border/40 text-sm">
    {/* Thesis */}
    <DetailSection icon={Compass} title="Thesis — resolves TRUE">
      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
        {bet.thesis_resolves_true}
      </p>
    </DetailSection>

    <DetailSection icon={ShieldAlert} title="Thesis — resolves FALSE">
      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
        {bet.thesis_resolves_false}
      </p>
    </DetailSection>

    {/* Prior rationale */}
    {bet.prior_rationale ? (
      <DetailSection icon={AlertCircle} title="Prior rationale">
        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {bet.prior_rationale}
        </p>
        {bet.prior_class ? (
          <Badge variant="outline" className="mt-2 rounded-full text-[10px]">
            {bet.prior_class}
          </Badge>
        ) : null}
      </DetailSection>
    ) : null}

    {/* Intermediate gates */}
    {bet.intermediate_gates && bet.intermediate_gates.length > 0 ? (
      <DetailSection icon={Calendar} title={`Intermediate gates (${bet.intermediate_gates.length})`}>
        <ul className="space-y-2">
          {bet.intermediate_gates.map((gate, i) => (
            <li key={i} className="rounded-lg border border-border/40 bg-background/40 p-3 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-foreground text-sm">{gate.name}</span>
                <Badge variant="outline" className="rounded-full text-[10px] font-mono">
                  {gate.date}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{gate.what_resolves}</p>
            </li>
          ))}
        </ul>
      </DetailSection>
    ) : null}

    {/* Theme dependencies */}
    {bet.theme_dependencies && bet.theme_dependencies.length > 0 ? (
      <DetailSection icon={Layers} title={`Theme dependencies (${bet.theme_dependencies.length})`}>
        <ul className="space-y-2">
          {bet.theme_dependencies.map((td, i) => (
            <li key={i} className="rounded-lg border border-border/40 bg-background/40 p-3 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="rounded-full text-[10px] font-mono">
                  {td.theme_id}
                </Badge>
                {td.theme_label ? (
                  <span className="text-sm font-medium text-foreground">{td.theme_label}</span>
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
              {td.transmission_mechanisms && td.transmission_mechanisms.length > 0 ? (
                <ul className="space-y-1 pl-3 border-l border-border/40">
                  {td.transmission_mechanisms.map((tm, j) => (
                    <li key={j} className="text-xs text-muted-foreground leading-relaxed">
                      <span className="font-mono text-[10px] text-foreground/80">{tm.channel}</span>
                      {tm.reading_rule ? <span className="ml-2">{tm.reading_rule}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </DetailSection>
    ) : null}

    {/* Scenarios */}
    {bet.scenarios && bet.scenarios.length > 0 ? (
      <DetailSection icon={Compass} title={`Scenarios (${bet.scenarios.length})`}>
        <ul className="space-y-2">
          {bet.scenarios.map((s, i) => (
            <li key={i} className="rounded-lg border border-border/40 bg-background/40 p-3 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-foreground text-sm">{s.name}</span>
                <Badge variant="outline" className="rounded-full text-[10px]">
                  p={Math.round((s.probability || 0) * 100)}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.narrative}</p>
              {s.what_makes_this_path_break ? (
                <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                  <span className="uppercase tracking-wide text-[10px]">Breaks if: </span>
                  {s.what_makes_this_path_break}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </DetailSection>
    ) : null}

    {/* Falsification criteria */}
    {bet.falsification_criteria && bet.falsification_criteria.length > 0 ? (
      <DetailSection
        icon={ShieldAlert}
        title={`Falsification criteria (${bet.falsification_criteria.length})`}
      >
        <ul className="space-y-1.5 list-disc list-outside pl-5 text-muted-foreground leading-relaxed">
          {bet.falsification_criteria.map((fc, i) => (
            <li key={i} className="text-xs">
              {fc}
            </li>
          ))}
        </ul>
      </DetailSection>
    ) : null}

    {/* Breakage shape */}
    {bet.breakage_shape ? (
      <DetailSection icon={AlertCircle} title="Breakage shape">
        <p className="text-muted-foreground leading-relaxed text-xs whitespace-pre-wrap">
          {bet.breakage_shape}
        </p>
      </DetailSection>
    ) : null}

    {/* Named watch metrics */}
    {bet.named_watch_metrics && bet.named_watch_metrics.length > 0 ? (
      <DetailSection icon={Layers} title={`Named watch metrics (${bet.named_watch_metrics.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border/40">
                <th className="text-left py-1.5 pr-2 font-medium">Metric</th>
                <th className="text-left py-1.5 pr-2 font-medium">Source</th>
                <th className="text-left py-1.5 pr-2 font-medium">Cadence</th>
                <th className="text-left py-1.5 font-medium">Current</th>
              </tr>
            </thead>
            <tbody>
              {bet.named_watch_metrics.map((m, i) => (
                <tr key={i} className="border-b border-border/30 last:border-0">
                  <td className="py-1.5 pr-2 text-foreground">{m.metric || m.name}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground">{m.source || '—'}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground">
                    {m.frequency || m.cadence || '—'}
                  </td>
                  <td className="py-1.5 text-muted-foreground">
                    {String(m.current_value ?? m.current_value_2026_05 ?? '—').slice(0, 80)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DetailSection>
    ) : null}

    {/* Position components loaded */}
    {bet.position_components_loaded && bet.position_components_loaded.length > 0 ? (
      <DetailSection
        icon={Layers}
        title={`Position components loaded (${bet.position_components_loaded.length})`}
      >
        <div className="flex flex-wrap gap-1.5">
          {bet.position_components_loaded.map((pc, i) => (
            <Badge key={i} variant="outline" className="rounded-full text-[10px] font-mono">
              {pc.id}
              {pc.role ? <span className="ml-1 text-muted-foreground">· {pc.role}</span> : null}
            </Badge>
          ))}
        </div>
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
