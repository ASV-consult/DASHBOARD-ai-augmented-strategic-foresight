/**
 * CrowsNestMacroRadar — the overcoupling-layer view (Stream 4 sidebar item).
 *
 * Shows the active macro themes and what they propagate to. Two views:
 *   - List view: one card per theme (pillar, status, trajectory, scenarios, propagation count)
 *   - Detail view: scenarios bar + indicators table + chronology + propagation matrix
 *
 * Per the clarity directive: verdict above each block, plain-language pillar names,
 * and the scenario probabilities are visualised as one stacked horizontal bar.
 */
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useForesight } from '@/contexts/ForesightContext';
import { CrowsNestMacroTheme } from '@/types/crows-nest';
import { ChevronLeft, ChevronRight, Globe, Radio } from 'lucide-react';

interface CrowsNestMacroRadarProps {
  selectedThemeId: string | null;
  onSelectTheme: (themeId: string | null) => void;
}

const PILLAR_LABEL: Record<string, string> = {
  Social: 'Social',
  Technology: 'Technology',
  Economic: 'Economic',
  Environmental: 'Environmental / Resources',
  Political_Legal: 'Political / Legal',
  Ethical: 'Ethical / ESG',
};

const TRAJECTORY_VERBAL: Record<string, { symbol: string; phrase: string; color: string }> = {
  rising: { symbol: '▲', phrase: 'escalating', color: 'text-red-500' },
  holding: { symbol: '→', phrase: 'holding steady', color: 'text-slate-500' },
  falling: { symbol: '▼', phrase: 'de-escalating', color: 'text-emerald-500' },
  'two-sided': { symbol: '◇', phrase: 'two-sided', color: 'text-amber-500' },
};

const blockMd = (text: string): React.ReactElement => {
  const components: Components = {
    p: ({ children }) => <p className="text-sm leading-relaxed text-foreground/90 mb-2">{children}</p>,
    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  };
  return <ReactMarkdown components={components}>{text}</ReactMarkdown>;
};

const ScenarioBar: React.FC<{
  scenarios: Record<string, number>;
}> = ({ scenarios }) => {
  const entries = Object.entries(scenarios).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, p]) => s + p, 0) || 1;
  // Color cycle — first scenario gets a distinct color
  const colors = ['#f43f5e', '#f59e0b', '#10b981', '#6366f1', '#94a3b8'];

  return (
    <div className="space-y-1.5">
      <div className="flex h-6 w-full overflow-hidden rounded-full border border-border/40 bg-muted/20">
        {entries.map(([name, prob], idx) => {
          const widthPct = (prob / total) * 100;
          if (widthPct < 1) return null;
          return (
            <TooltipProvider key={name} delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="flex items-center justify-center text-[9px] font-medium text-white"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: colors[idx] || '#94a3b8',
                    }}
                  >
                    {widthPct >= 12 ? `${Math.round(prob * 100)}%` : ''}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <div className="font-medium">{name.replace(/_/g, ' ')}</div>
                  <div className="text-muted-foreground">{Math.round(prob * 100)}% probability</div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
      {/* Compact legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        {entries.map(([name, prob], idx) => (
          <span key={name} className="flex items-center gap-1">
            <span
              className="block h-2 w-2 rounded-sm"
              style={{ backgroundColor: colors[idx] || '#94a3b8' }}
            />
            <span>
              {name.replace(/_/g, ' ')} <span className="text-muted-foreground/70">{Math.round(prob * 100)}%</span>
            </span>
          </span>
        ))}
      </div>
    </div>
  );
};

const ThemeCard: React.FC<{ theme: CrowsNestMacroTheme; onClick: () => void }> = ({ theme, onClick }) => {
  const traj = TRAJECTORY_VERBAL[theme.current_state.trajectory] || TRAJECTORY_VERBAL.holding;
  const propagationCount = theme.propagation_matrix?.length || 0;
  const dimensionsTouched = new Set(
    (theme.propagation_matrix || []).map((p) => {
      const m = p.driver_id?.match(/^D(\d+)/);
      return m ? `V${m[1]}` : '';
    }).filter(Boolean),
  );

  return (
    <button
      onClick={onClick}
      className="group w-full rounded-2xl border border-rose-500/20 bg-card/50 p-5 text-left transition hover:border-rose-500/40 hover:bg-rose-500/[0.04]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          {/* Pillar + status */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/[0.06] px-2.5 py-0.5 text-[10px] font-medium text-rose-700 dark:text-rose-300">
              {PILLAR_LABEL[theme.pillar] || theme.pillar}
            </span>
            <span className="inline-flex items-center rounded-full border border-border/40 bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground">
              {theme.status}
            </span>
            <span className={`text-xs font-semibold ${traj.color} flex items-center gap-1`}>
              <span>{traj.symbol}</span>
              <span>{traj.phrase}</span>
            </span>
          </div>

          {/* Theme name + headline */}
          <h3 className="text-lg font-semibold text-foreground leading-tight">{theme.theme}</h3>
          {theme.current_state.headline ? (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {theme.current_state.headline}
            </p>
          ) : null}

          {/* Scenario bar */}
          {Object.keys(theme.scenario_probabilities || {}).length > 0 ? (
            <div className="pt-2">
              <ScenarioBar scenarios={theme.scenario_probabilities} />
            </div>
          ) : null}

          {/* Propagation footer */}
          <div className="pt-2 text-xs text-muted-foreground flex flex-wrap items-center gap-2">
            <span>
              <strong className="text-foreground">{propagationCount}</strong> drivers affected
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span>
              touches dimensions: <strong className="text-foreground">{Array.from(dimensionsTouched).sort().join(', ') || '—'}</strong>
            </span>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground/40 transition group-hover:text-rose-500" />
      </div>
    </button>
  );
};

const ThemeDetail: React.FC<{ theme: CrowsNestMacroTheme; onBack: () => void }> = ({ theme, onBack }) => {
  const traj = TRAJECTORY_VERBAL[theme.current_state.trajectory] || TRAJECTORY_VERBAL.holding;

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-rose-500 transition"
      >
        <ChevronLeft className="h-3 w-3" />
        back to active themes
      </button>

      {/* === Block 1: Theme hero === */}
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04] shadow-sm">
        <CardContent className="p-6 md:p-8 space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-rose-500/10 p-2">
              <Globe className="h-5 w-5 text-rose-500" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/[0.06] px-2.5 py-0.5 text-[10px] font-medium text-rose-700 dark:text-rose-300">
                  {PILLAR_LABEL[theme.pillar] || theme.pillar} · {theme.status}
                </span>
                <span className={`text-xs font-semibold ${traj.color} flex items-center gap-1`}>
                  <span>{traj.symbol}</span>
                  <span>{traj.phrase}</span>
                </span>
              </div>
              <h2 className="text-2xl font-semibold text-foreground leading-tight">{theme.theme}</h2>
              {theme.current_state.headline ? (
                <p className="text-base text-foreground leading-relaxed">{theme.current_state.headline}</p>
              ) : null}
            </div>
          </div>

          {Object.keys(theme.scenario_probabilities || {}).length > 0 ? (
            <div className="pt-3 border-t border-rose-500/10 space-y-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-semibold">
                How likely is each scenario?
              </div>
              <ScenarioBar scenarios={theme.scenario_probabilities} />
            </div>
          ) : null}

          {theme.deep_read?.what_is_actually_happening ? (
            <div className="pt-3 border-t border-rose-500/10">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-semibold mb-2">
                What's actually happening
              </div>
              {blockMd(theme.deep_read.what_is_actually_happening)}
            </div>
          ) : null}

          {theme.deep_read?.current_assessed_state ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3">
              <div className="text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-300 font-semibold mb-1">
                Current assessed state
              </div>
              <div className="text-sm text-foreground leading-relaxed">{theme.deep_read.current_assessed_state}</div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* === Block 2: Indicators tracked === */}
      {theme.indicators && theme.indicators.length > 0 ? (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Indicators on watch
          </h3>
          <div className="space-y-2">
            {theme.indicators.map((ind, i) => (
              <div key={i} className="rounded-xl border border-border/40 bg-background/60 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{ind.name}</div>
                    {ind.threshold ? (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Threshold: {ind.threshold}
                      </div>
                    ) : null}
                    <div className="text-[10px] text-muted-foreground/70 mt-0.5">{ind.source}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted-foreground/70 uppercase tracking-wide">Current</div>
                    <div className="text-sm font-medium text-foreground tabular-nums">
                      {ind.current_value !== null && ind.current_value !== undefined ? String(ind.current_value) : '—'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* === Block 3: Propagation matrix === */}
      {theme.propagation_matrix && theme.propagation_matrix.length > 0 ? (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Where this theme propagates
          </h3>
          <p className="mb-2 text-xs text-muted-foreground/80">
            When this theme's scenario probabilities shift, evidence cards auto-propagate into these company drivers.
            Contribution shows how much each driver gets nudged.
          </p>
          <div className="overflow-hidden rounded-xl border border-border/40">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Driver</th>
                  <th className="px-3 py-2 text-left font-semibold">Rule</th>
                  <th className="px-3 py-2 text-right font-semibold">Contribution</th>
                </tr>
              </thead>
              <tbody>
                {theme.propagation_matrix.map((p, i) => {
                  const contrib = p.current_contribution || 0;
                  const contribColor =
                    contrib > 0.1 ? 'text-emerald-600' : contrib < -0.1 ? 'text-amber-600' : 'text-muted-foreground';
                  return (
                    <tr key={i} className="border-t border-border/30">
                      <td className="px-3 py-2 text-xs font-mono text-foreground">{p.driver_id}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground line-clamp-2 max-w-md">
                        {p.rule}
                      </td>
                      <td className={`px-3 py-2 text-xs font-medium tabular-nums text-right ${contribColor}`}>
                        {contrib > 0 ? '+' : ''}
                        {contrib.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* === Block 4: Chronology === */}
      {theme.chronology && theme.chronology.length > 0 ? (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            How we got here
          </h3>
          <ol className="space-y-2 border-l-2 border-rose-500/20 pl-4">
            {[...theme.chronology].reverse().map((ev, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[19px] top-1 h-2.5 w-2.5 rounded-full bg-rose-500/60 border-2 border-background" />
                <div className="text-xs text-muted-foreground">{ev.date}</div>
                <div className="text-sm text-foreground leading-relaxed">{ev.event}</div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
};

export const CrowsNestMacroRadar: React.FC<CrowsNestMacroRadarProps> = ({
  selectedThemeId,
  onSelectTheme,
}) => {
  const { crowsNestData } = useForesight();
  if (!crowsNestData) return null;

  const themes = crowsNestData.macro_themes || [];

  if (selectedThemeId) {
    const theme = themes.find((t) => t.id === selectedThemeId);
    if (theme) {
      return <ThemeDetail theme={theme} onBack={() => onSelectTheme(null)} />;
    }
  }

  if (themes.length === 0) {
    return (
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04]">
        <CardContent className="p-8 text-center">
          <Radio className="mx-auto mb-3 h-10 w-10 text-rose-500" />
          <h3 className="text-base font-semibold text-foreground">No macro themes seeded yet</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Macro themes appear here once the propagation layer has been run. Each theme is a standing
            STEEPLE-pillar story with scenario probabilities and a propagation matrix to company drivers.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Aggregate stats
  const totalDriversAffected = themes.reduce((s, t) => s + (t.propagation_matrix?.length || 0), 0);
  const allDimensions = new Set(
    themes.flatMap((t) =>
      (t.propagation_matrix || [])
        .map((p) => p.driver_id?.match(/^D(\d+)/)?.[1])
        .filter(Boolean)
        .map((n) => `V${n}`),
    ),
  );

  return (
    <div className="space-y-5">
      {/* Hero verdict */}
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04] shadow-sm">
        <CardContent className="p-6 md:p-8 space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-rose-500/10 p-2">
              <Globe className="h-5 w-5 text-rose-500" />
            </div>
            <div className="flex-1 space-y-1.5">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground leading-snug">
                {themes.length} macro {themes.length === 1 ? 'theme' : 'themes'} on the radar, propagating to{' '}
                <span className="text-rose-600 dark:text-rose-300">{totalDriversAffected} drivers</span>{' '}
                across {allDimensions.size} dimensions.
              </h2>
              <p className="text-sm text-muted-foreground">
                Each theme is a standing macro story with named scenarios and probabilities. When a theme's probabilities shift, evidence
                cards auto-propagate into the company drivers it touches — that's the cross-coupling layer.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List of themes */}
      <div className="space-y-3">
        {themes.map((t) => (
          <ThemeCard key={t.id} theme={t} onClick={() => onSelectTheme(t.id)} />
        ))}
      </div>
    </div>
  );
};
