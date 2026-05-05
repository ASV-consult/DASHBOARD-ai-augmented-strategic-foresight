/**
 * CrowsNestMacroThemesV2 — Crow's Nest 2.0 (v2) macro view.
 *
 * Renders the 6 universal world-state macro themes (T1..T6) from
 * `crowsNestV2Data.themes`. Hero card, grid of theme cards. Click a card to
 * expand: thesis, named watch metrics table, propagation_to_bets_seed,
 * cross_cutting overlay, scenarios with probabilities.
 *
 * Lives ALONGSIDE the legacy `CrowsNestMacroRadar` (v1). v2 only.
 */
import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useForesight } from '@/contexts/ForesightContext';
import {
  MacroThemeV2,
  pillarBadgeClass,
  tierBadgeClass,
  trajectorySymbol,
  v2TruthLikelihood,
  v2Tier,
} from '@/types/crows-nest-v2';
import {
  Compass,
  ChevronDown,
  ChevronRight,
  Globe,
  Layers,
  Network,
  Zap,
  AlertCircle,
} from 'lucide-react';

export const CrowsNestMacroThemesV2: React.FC = () => {
  const { crowsNestV2Data } = useForesight();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const themes: MacroThemeV2[] = useMemo(() => {
    const arr = [...(crowsNestV2Data?.themes ?? [])];
    arr.sort((a, b) => a.id.localeCompare(b.id));
    return arr;
  }, [crowsNestV2Data]);

  if (!crowsNestV2Data) {
    return (
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04]">
        <CardContent className="p-8 text-center">
          <Globe className="mx-auto mb-3 h-10 w-10 text-rose-500" />
          <h2 className="text-xl font-semibold text-foreground">Macro Themes (v2) is empty</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Upload a Crow's Nest v2 bundle (
            <code className="text-xs rounded bg-muted/40 px-1 py-0.5">
              schema_version: crows_nest_v2_dashboard_bundle
            </code>
            ) to see the universal macro themes and how they propagate into the strategic bets.
          </p>
        </CardContent>
      </Card>
    );
  }

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
              <Globe className="h-5 w-5 text-rose-500" />
            </div>
            <div className="flex-1 space-y-1.5">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground leading-snug">
                {themes.length} Macro Themes — universal world-state forces
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Each theme is a force in the world that exists independent of any single company.
                Themes have their own truth-likelihoods and trajectories; they propagate into bets
                via weighted dependencies. Click a card to see the watch metrics, scenario
                distribution, and the bets each theme is loading.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-rose-500/10">
            <SummaryCell
              label="Pillar: Technology"
              count={themes.filter((t) => t.pillar === 'Technology').length}
            />
            <SummaryCell
              label="Pillar: Economic"
              count={themes.filter((t) => t.pillar === 'Economic').length}
            />
            <SummaryCell
              label="Pillar: Political/Legal"
              count={themes.filter((t) => t.pillar === 'Political_Legal').length}
            />
            <SummaryCell
              label="Pillar: Other"
              count={
                themes.filter(
                  (t) =>
                    t.pillar !== 'Technology' &&
                    t.pillar !== 'Economic' &&
                    t.pillar !== 'Political_Legal',
                ).length
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Theme grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {themes.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            expanded={!!expanded[theme.id]}
            onToggle={() => toggleExpanded(theme.id)}
          />
        ))}
      </div>
    </div>
  );
};

const SummaryCell: React.FC<{ label: string; count: number }> = ({ label, count }) => (
  <div className="rounded-lg border border-border/40 bg-background/50 p-3">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-lg font-semibold text-foreground tabular-nums">{count}</div>
  </div>
);

interface ThemeCardProps {
  theme: MacroThemeV2;
  expanded: boolean;
  onToggle: () => void;
}

const ThemeCard: React.FC<ThemeCardProps> = ({ theme, expanded, onToggle }) => {
  const tl = v2TruthLikelihood(theme.current_state);
  const tier = v2Tier(theme.current_state);
  const traj = trajectorySymbol(theme.current_state.trajectory);
  const tlPct = tl !== null ? Math.round(tl * 100) : null;
  const priorPct = Math.round((theme.prior ?? 0) * 100);

  return (
    <Card className="rounded-3xl border-border/60 bg-card/60 shadow-sm hover:border-rose-500/40 transition-colors">
      <CardContent className="p-5 space-y-3">
        <button onClick={onToggle} className="w-full text-left flex items-start gap-3">
          <div className="mt-1 rounded-full bg-rose-500/10 p-2 shrink-0">
            <Compass className="h-4 w-4 text-rose-500" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="rounded-full text-[10px] font-mono">
                {theme.id}
              </Badge>
              <Badge variant="outline" className={`rounded-full text-[10px] ${pillarBadgeClass(theme.pillar)}`}>
                {theme.pillar}
              </Badge>
              {tier && (
                <Badge variant="outline" className={`rounded-full text-[10px] ${tierBadgeClass(tier)}`}>
                  {tier}
                </Badge>
              )}
            </div>
            <h3 className="text-sm font-semibold text-foreground leading-snug">{theme.title}</h3>
          </div>
          <div className="shrink-0">
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

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
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Class</div>
            <div className="text-[10px] text-foreground leading-tight" title={theme.prior_class}>
              {theme.prior_class
                ? theme.prior_class.replace(/_/g, ' ').slice(0, 30) +
                  (theme.prior_class.length > 30 ? '…' : '')
                : '—'}
            </div>
          </div>
        </div>

        {expanded ? <ThemeDetail theme={theme} /> : null}
      </CardContent>
    </Card>
  );
};

const ThemeDetail: React.FC<{ theme: MacroThemeV2 }> = ({ theme }) => {
  const scenarios =
    theme.scenarios && typeof theme.scenarios === 'object' && !Array.isArray(theme.scenarios)
      ? (theme.scenarios as Record<string, number>)
      : null;

  return (
    <div className="space-y-4 pt-3 border-t border-border/40 text-sm">
      {/* Thesis */}
      {theme.thesis ? (
        <DetailSection icon={Compass} title="Thesis">
          <p className="text-muted-foreground leading-relaxed text-xs whitespace-pre-wrap">
            {theme.thesis}
          </p>
        </DetailSection>
      ) : null}

      {/* Definition */}
      {theme.definition ? (
        <DetailSection icon={AlertCircle} title="Definition">
          <p className="text-muted-foreground leading-relaxed text-xs whitespace-pre-wrap">
            {theme.definition}
          </p>
        </DetailSection>
      ) : null}

      {/* Prior rationale */}
      {theme.prior_rationale ? (
        <DetailSection icon={AlertCircle} title="Prior rationale">
          <p className="text-muted-foreground leading-relaxed text-xs whitespace-pre-wrap">
            {theme.prior_rationale}
          </p>
        </DetailSection>
      ) : null}

      {/* Named watch metrics */}
      {theme.named_watch_metrics && theme.named_watch_metrics.length > 0 ? (
        <DetailSection icon={Zap} title={`Named watch metrics (${theme.named_watch_metrics.length})`}>
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
                {theme.named_watch_metrics.map((m, i) => (
                  <tr key={i} className="border-b border-border/30 last:border-0 align-top">
                    <td className="py-1.5 pr-2 text-foreground">{m.name || m.metric || '—'}</td>
                    <td className="py-1.5 pr-2 text-muted-foreground">{m.source || '—'}</td>
                    <td className="py-1.5 pr-2 text-muted-foreground">
                      {m.cadence || m.frequency || '—'}
                    </td>
                    <td className="py-1.5 text-muted-foreground max-w-xs">
                      {String(m.current_value ?? m.current_value_2026_05 ?? '—').slice(0, 120)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DetailSection>
      ) : null}

      {/* Propagation to bets */}
      {theme.propagation_to_bets_seed && theme.propagation_to_bets_seed.length > 0 ? (
        <DetailSection
          icon={Network}
          title={`Propagates into bets (${theme.propagation_to_bets_seed.length})`}
        >
          <ul className="space-y-2">
            {theme.propagation_to_bets_seed.map((p, i) => (
              <li
                key={i}
                className="rounded-lg border border-border/40 bg-background/40 p-3 space-y-1"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  {(p.bet_id || p.bet_id_placeholder) && (
                    <Badge variant="outline" className="rounded-full text-[10px] font-mono">
                      {p.bet_id || p.bet_id_placeholder}
                    </Badge>
                  )}
                  {(p.bet_label || p.label || p.name) && (
                    <span className="text-xs font-medium text-foreground">
                      {p.bet_label || p.label || p.name}
                    </span>
                  )}
                  {typeof p.weight === 'number' ? (
                    <Badge variant="outline" className="rounded-full text-[10px]">
                      weight {p.weight.toFixed(2)}
                    </Badge>
                  ) : null}
                  {p.role ? (
                    <Badge variant="outline" className="rounded-full text-[10px]">
                      {p.role}
                    </Badge>
                  ) : null}
                </div>
                {(p.channel || p.transmission_mechanism) && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <span className="uppercase tracking-wide text-[10px]">Channel: </span>
                    {p.channel || p.transmission_mechanism}
                  </p>
                )}
                {(p.rule || p.reading_rule || p.rationale) && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {p.rule || p.reading_rule || p.rationale}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </DetailSection>
      ) : null}

      {/* Cross-cutting */}
      {theme.cross_cutting && theme.cross_cutting.length > 0 ? (
        <DetailSection icon={Layers} title={`Cross-cutting overlay (${theme.cross_cutting.length})`}>
          <ul className="space-y-1 list-disc list-outside pl-5 text-muted-foreground leading-relaxed">
            {theme.cross_cutting.map((cc, i) => (
              <li key={i} className="text-xs">
                {cc}
              </li>
            ))}
          </ul>
        </DetailSection>
      ) : null}

      {/* Scenarios */}
      {scenarios && Object.keys(scenarios).length > 0 ? (
        <DetailSection icon={Compass} title={`Scenarios (${Object.keys(scenarios).length})`}>
          <ScenarioBars scenarios={scenarios} />
        </DetailSection>
      ) : null}

      {/* Expected projection topics */}
      {theme.expected_projection_topics && theme.expected_projection_topics.length > 0 ? (
        <DetailSection
          icon={Layers}
          title={`Expected projection topics (${theme.expected_projection_topics.length})`}
        >
          <ul className="space-y-1 list-disc list-outside pl-5 text-muted-foreground leading-relaxed">
            {theme.expected_projection_topics.map((t, i) => (
              <li key={i} className="text-xs">
                {t}
              </li>
            ))}
          </ul>
        </DetailSection>
      ) : null}
    </div>
  );
};

const ScenarioBars: React.FC<{ scenarios: Record<string, number> }> = ({ scenarios }) => {
  const entries = Object.entries(scenarios).sort(([, a], [, b]) => b - a);
  return (
    <ul className="space-y-2">
      {entries.map(([name, prob]) => {
        const pct = Math.round((prob || 0) * 100);
        return (
          <li key={name} className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-foreground capitalize">{name.replace(/_/g, ' ')}</span>
              <span className="text-xs font-semibold tabular-nums text-foreground">{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
              <div
                className="h-full bg-rose-500/60 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
};

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
