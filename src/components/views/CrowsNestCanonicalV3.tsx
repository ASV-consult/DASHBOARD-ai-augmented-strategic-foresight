/**
 * CrowsNestCanonicalV3 — the v3 canonical bundle's "Strategic Stakes" view.
 *
 * Renders the new BMS-bet-spine-with-deep-researched-indicators structure:
 *   - top-level: list of bet cards (5 for Umicore)
 *   - each bet expands to show indicators sorted by weight_in_bet desc
 *   - each indicator opens a TWO-PANEL drill-down:
 *       Panel 1 "Where it is now" — current_state_assessment + trajectory chart
 *       Panel 2 "Where it's going" — forward_projection central path + milestones
 *
 * Visual idiom matches CrowsNestBetsRegister.tsx (rose-toned cards, rounded-2xl).
 * Trajectory chart uses recharts. No emojis.
 */
import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useForesight } from '@/contexts/ForesightContext';
import {
  BetV3,
  IndicatorV3,
  V3FalsificationThreshold,
  V3InflectionEvent,
  tierBadgeClassV3,
  confidenceBadgeClassV3,
  macroDriverChipClassV3,
  extractTrajectorySeries,
  extractMultiRegionTrajectorySeries,
} from '@/types/crows-nest-v3';
import {
  ChevronRight,
  ChevronDown,
  Layers,
  Target,
  ShieldAlert,
  Compass,
  TrendingUp,
  Calendar,
  ExternalLink,
  Search,
  AlertTriangle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

/* ─────────────────────────── Top-level ─────────────────────────── */

export const CrowsNestCanonicalV3: React.FC = () => {
  const { crowsNestV3Data } = useForesight();
  const [expandedBets, setExpandedBets] = useState<Record<string, boolean>>({});
  const [expandedIndicators, setExpandedIndicators] = useState<Record<string, boolean>>({});

  const indicatorsByBet = useMemo(() => {
    const idx: Record<string, IndicatorV3[]> = {};
    if (!crowsNestV3Data) return idx;
    for (const ind of crowsNestV3Data.indicators ?? []) {
      const k = ind.bet_id;
      if (!idx[k]) idx[k] = [];
      idx[k].push(ind);
    }
    // Sort each list by weight_in_bet descending (then id ascending as tiebreaker).
    for (const k of Object.keys(idx)) {
      idx[k].sort((a, b) => {
        const wa = a.feeds_into_bet_resolution?.weight_in_bet ?? 0;
        const wb = b.feeds_into_bet_resolution?.weight_in_bet ?? 0;
        if (wa !== wb) return wb - wa;
        return (a.indicator_id || '').localeCompare(b.indicator_id || '');
      });
    }
    return idx;
  }, [crowsNestV3Data]);

  if (!crowsNestV3Data) {
    return (
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04]">
        <CardContent className="p-8">
          <p className="text-sm text-muted-foreground">
            No v3 canonical bundle loaded. Upload <code>canonical_bundle.json</code>{' '}
            (schema_version <code>crows_nest_v3_canonical_bundle</code>).
          </p>
        </CardContent>
      </Card>
    );
  }

  const bets = crowsNestV3Data.bets ?? [];
  const indicators = crowsNestV3Data.indicators ?? [];
  const deeplyResearched =
    crowsNestV3Data.counts?.deeply_researched_indicators ??
    indicators.filter((i) => i.current_state_assessment && i.forward_projection).length;

  const toggleBet = (id: string) =>
    setExpandedBets((p) => ({ ...p, [id]: !p[id] }));
  const toggleIndicator = (id: string) =>
    setExpandedIndicators((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div className="space-y-5">
      {/* Hero verdict */}
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04] shadow-sm">
        <CardContent className="p-6 md:p-8 space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-rose-500/10 p-2">
              <Layers className="h-5 w-5 text-rose-500" />
            </div>
            <div className="flex-1 space-y-1.5">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground leading-snug">
                Strategic Stakes (v3 canonical) — {bets.length} bets, {indicators.length} indicators
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The v3 reset moves to a 2-layer canonical model: each bet is a{' '}
                <strong className="text-foreground">single dated, falsifiable forecast</strong>{' '}
                authored from real sources. Each indicator below carries a deeply-researched{' '}
                <strong className="text-foreground">current state assessment</strong> (where it is
                now, with Tier-1/Tier-2 source triangulation) plus a{' '}
                <strong className="text-foreground">forward projection</strong> (where it's going,
                with calendared inflection events and confidence intervals).
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-rose-500/10">
            <div className="rounded-lg border border-border/40 bg-background/50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Bets</div>
              <div className="text-lg font-semibold text-foreground tabular-nums">{bets.length}</div>
            </div>
            <div className="rounded-lg border border-border/40 bg-background/50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Indicators</div>
              <div className="text-lg font-semibold text-foreground tabular-nums">{indicators.length}</div>
            </div>
            <div className="rounded-lg border border-border/40 bg-background/50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Deeply researched</div>
              <div className="text-lg font-semibold text-foreground tabular-nums">{deeplyResearched}</div>
            </div>
            <div className="rounded-lg border border-border/40 bg-background/50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">As of</div>
              <div className="text-sm font-medium text-foreground tabular-nums">{crowsNestV3Data.as_of}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bet cards */}
      <div className="space-y-3">
        {bets.map((bet) => (
          <BetCardV3
            key={bet.bet_id}
            bet={bet}
            indicators={indicatorsByBet[bet.bet_id] || []}
            expanded={!!expandedBets[bet.bet_id]}
            onToggle={() => toggleBet(bet.bet_id)}
            expandedIndicators={expandedIndicators}
            onToggleIndicator={toggleIndicator}
          />
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────── Bet card ─────────────────────────── */

interface BetCardV3Props {
  bet: BetV3;
  indicators: IndicatorV3[];
  expanded: boolean;
  onToggle: () => void;
  expandedIndicators: Record<string, boolean>;
  onToggleIndicator: (indicatorId: string) => void;
}

const BetCardV3: React.FC<BetCardV3Props> = ({
  bet,
  indicators,
  expanded,
  onToggle,
  expandedIndicators,
  onToggleIndicator,
}) => {
  const claim = bet.system_claim?.claim || bet.system_claim?.statement || '';
  const targetValue = bet.system_claim?.target_value;

  return (
    <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/40">
      {/* Header */}
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
          {bet.bet_id}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm md:text-base font-semibold text-foreground">{bet.name}</h3>
            <Badge variant="outline" className="rounded-full text-[10px]">
              {bet.segment}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
            {bet.resolution_date ? `Resolves ${bet.resolution_date}` : ''}
            {bet.intermediate_gate ? ` — gate: ${bet.intermediate_gate.name} (${bet.intermediate_gate.date})` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="rounded-full border border-border/40 bg-background/60 px-2 py-0.5 tabular-nums">
            {indicators.length} indicator{indicators.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Expanded body */}
      {expanded ? (
        <div className="space-y-5 p-4 md:p-6 text-sm">
          {/* 1. WHAT IS THIS BET? */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/15 text-[11px] font-bold text-rose-700 dark:text-rose-300">
                1
              </span>
              <h4 className="text-sm font-semibold text-foreground">What is this bet?</h4>
            </div>
            <div className="ml-8 rounded-xl border border-border/40 bg-background/40 p-3 space-y-2">
              <p className="text-sm text-foreground/90 leading-relaxed">{claim}</p>
              {targetValue ? (
                <div className="flex items-start gap-2 pt-2 border-t border-border/30">
                  <Target className="mt-0.5 h-3.5 w-3.5 text-rose-500 shrink-0" />
                  <div className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground/80">Target value: </span>
                    {targetValue}
                  </div>
                </div>
              ) : null}
              {bet.system_claim?.rationale ? (
                <div className="text-[11px] text-muted-foreground italic leading-relaxed pt-1">
                  {bet.system_claim.rationale}
                </div>
              ) : null}
            </div>
          </section>

          {/* 2. WHY IS IT A BET? — baseline financial anchor + position components */}
          {(bet.baseline_financial_anchor || (bet.position_components && bet.position_components.length > 0)) ? (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/15 text-[11px] font-bold text-rose-700 dark:text-rose-300">
                  2
                </span>
                <h4 className="text-sm font-semibold text-foreground">Why is it a bet?</h4>
                <span className="text-[11px] text-muted-foreground">
                  — the financial anchor + committed positions
                </span>
              </div>

              {bet.baseline_financial_anchor ? (
                <div className="ml-8 mb-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                  {bet.baseline_financial_anchor.fy2025_revenue_eur_m !== undefined ? (
                    <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">FY2025 revenue</div>
                      <div className="text-sm font-semibold text-foreground tabular-nums">
                        EUR {bet.baseline_financial_anchor.fy2025_revenue_eur_m}m
                      </div>
                    </div>
                  ) : null}
                  {bet.baseline_financial_anchor.fy2025_ebita_eur_m !== undefined ? (
                    <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">FY2025 EBITA</div>
                      <div className="text-sm font-semibold text-foreground tabular-nums">
                        EUR {bet.baseline_financial_anchor.fy2025_ebita_eur_m}m
                      </div>
                    </div>
                  ) : null}
                  {bet.baseline_financial_anchor.fy2025_ebita_margin_pct !== undefined ? (
                    <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">EBITA margin</div>
                      <div className="text-sm font-semibold text-foreground tabular-nums">
                        {bet.baseline_financial_anchor.fy2025_ebita_margin_pct}%
                      </div>
                    </div>
                  ) : null}
                  {bet.baseline_financial_anchor.fy2025_capital_employed_eur_bn !== undefined ? (
                    <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Capital employed</div>
                      <div className="text-sm font-semibold text-foreground tabular-nums">
                        EUR {bet.baseline_financial_anchor.fy2025_capital_employed_eur_bn}bn
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {bet.position_components && bet.position_components.length > 0 ? (
                <div className="ml-8">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground/80 font-semibold mb-1.5">
                    Committed position components ({bet.position_components.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {bet.position_components.map((id) => (
                      <span
                        key={id}
                        className="inline-flex items-center rounded-full border border-border/40 bg-background/60 px-2 py-0.5 text-[10px] font-mono text-muted-foreground"
                        title={id}
                      >
                        {id}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {/* 3. WHAT WOULD RESOLVE IT? — intermediate gate + two-sided test */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/15 text-[11px] font-bold text-rose-700 dark:text-rose-300">
                3
              </span>
              <h4 className="text-sm font-semibold text-foreground">What would resolve it?</h4>
            </div>
            <div className="ml-8 space-y-3">
              {bet.intermediate_gate ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-xs font-semibold text-foreground">{bet.intermediate_gate.name}</span>
                    <Badge variant="outline" className="rounded-full text-[10px] font-mono">
                      {bet.intermediate_gate.date}
                    </Badge>
                  </div>
                  {bet.intermediate_gate.what_must_be_true ? (
                    <p className="text-[11px] text-foreground/85 leading-relaxed">
                      {bet.intermediate_gate.what_must_be_true}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {bet.two_sided_test && bet.two_sided_test.length > 0 ? (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground/80 font-semibold mb-1.5">
                    Two-sided test
                  </div>
                  <ul className="list-disc list-outside pl-5 space-y-1 text-[11px] text-foreground/85 leading-relaxed">
                    {bet.two_sided_test.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </section>

          {/* 4. INDICATORS feeding this bet */}
          {indicators.length > 0 ? (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/15 text-[11px] font-bold text-rose-700 dark:text-rose-300">
                  4
                </span>
                <h4 className="text-sm font-semibold text-foreground">Indicators feeding this bet</h4>
                <span className="text-[11px] text-muted-foreground">— sorted by weight, click to expand</span>
              </div>
              <ul className="ml-8 space-y-2">
                {indicators.map((ind) => (
                  <IndicatorRowV3
                    key={ind.indicator_id}
                    indicator={ind}
                    expanded={!!expandedIndicators[ind.indicator_id]}
                    onToggle={() => onToggleIndicator(ind.indicator_id)}
                  />
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

/* ─────────────────────────── Indicator row + drill-down ─────────────────────────── */

interface IndicatorRowV3Props {
  indicator: IndicatorV3;
  expanded: boolean;
  onToggle: () => void;
}

const IndicatorRowV3: React.FC<IndicatorRowV3Props> = ({ indicator, expanded, onToggle }) => {
  const cs = indicator.current_state_assessment;
  const tier = cs?.tier ?? null;
  const confidence = cs?.confidence ?? null;
  const weight = indicator.feeds_into_bet_resolution?.weight_in_bet;

  return (
    <li className="rounded-lg border border-border/40 bg-background/40 overflow-hidden">
      {/* Compact row */}
      <div
        className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 px-3 py-2 cursor-pointer hover:bg-rose-500/[0.04] transition"
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
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        <span className="rounded border border-rose-500/30 bg-rose-500/[0.06] px-1.5 py-0.5 text-[10px] font-mono text-rose-700 dark:text-rose-300">
          {indicator.indicator_id}
        </span>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-foreground line-clamp-1">{indicator.topic}</div>
          {cs?.value ? (
            <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{cs.value}</div>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {tier ? (
            <span className={`rounded-full border px-1.5 py-0.5 ${tierBadgeClassV3(tier)}`}>{tier}</span>
          ) : (
            <span className="rounded-full border border-slate-400/40 bg-slate-400/[0.06] px-1.5 py-0.5 text-slate-500">
              not yet researched
            </span>
          )}
          {confidence ? (
            <span className={`rounded-full border px-1.5 py-0.5 ${confidenceBadgeClassV3(confidence)}`}>
              conf: {confidence}
            </span>
          ) : null}
          {typeof weight === 'number' ? (
            <span className="rounded-full border border-border/40 bg-background/60 px-1.5 py-0.5 tabular-nums" title="Weight in bet">
              w {weight.toFixed(3)}
            </span>
          ) : null}
        </div>
      </div>

      {/* Expanded — two-panel drill-down */}
      {expanded ? <IndicatorDetailV3 indicator={indicator} /> : null}
    </li>
  );
};

/* ─────────────────────────── Indicator detail (two-panel) ─────────────────────────── */

/* Region line colours — stable across renders */
const REGION_COLORS: Record<string, string> = {
  China: '#ef4444',
  EU: '#3b82f6',
  US: '#10b981',
  'EU all-BEV': '#3b82f6',
  'US all-BEV': '#10b981',
  World: '#8b5cf6',
  'EMDEs ex-China': '#f59e0b',
};
const FALLBACK_COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f97316'];
function regionColor(name: string, idx: number): string {
  return REGION_COLORS[name] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

const IndicatorDetailV3: React.FC<{ indicator: IndicatorV3 }> = ({ indicator }) => {
  const cs = indicator.current_state_assessment;
  const fp = indicator.forward_projection;
  const sysClaim = indicator.system_claim;

  const multiSeries = useMemo(
    () => extractMultiRegionTrajectorySeries(indicator.trajectory?.readings),
    [indicator.trajectory?.readings],
  );
  const singleSeries = useMemo(
    () => (multiSeries ? null : extractTrajectorySeries(indicator.trajectory?.readings)),
    [indicator.trajectory?.readings, multiSeries],
  );
  const [methodOpen, setMethodOpen] = useState(false);

  const macroDrivers = indicator.informs_macro_drivers ?? [];
  const weight = indicator.feeds_into_bet_resolution?.weight_in_bet;
  const weightRationale = indicator.feeds_into_bet_resolution?.rationale;
  const falsifications = indicator.falsification_thresholds ?? [];
  const sweepTerms = indicator.open_sweep_search_terms ?? [];

  return (
    <div className="border-t border-border/30 bg-background/20 p-4 space-y-4">
      {/* TWO-PANEL: where it is now / where it's going */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* PANEL 1 — Where it is now */}
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.03] p-3 md:p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-emerald-600" />
            <h5 className="text-sm font-semibold text-foreground">Where it is now</h5>
            <span className="text-[10px] text-muted-foreground italic">(the understanding)</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {cs?.tier ? (
              <span className={`rounded-full border px-2 py-0.5 text-[10px] ${tierBadgeClassV3(cs.tier)}`}>
                {cs.tier}
              </span>
            ) : (
              <span className="rounded-full border border-slate-400/40 bg-slate-400/[0.06] px-2 py-0.5 text-[10px] text-slate-500">
                not yet researched
              </span>
            )}
            {cs?.confidence ? (
              <span className={`rounded-full border px-2 py-0.5 text-[10px] ${confidenceBadgeClassV3(cs.confidence)}`}>
                {cs.confidence} confidence
              </span>
            ) : null}
            {cs?.as_of ? (
              <span className="rounded-full border border-border/40 bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground tabular-nums">
                as of {cs.as_of}
              </span>
            ) : null}
          </div>

          {cs?.value ? (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
                Triangulated value
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed font-medium">{cs.value}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No current-state assessment yet.</p>
          )}

          {cs?.method ? (
            <div className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground/80">Method: </span>
              {cs.method}
            </div>
          ) : null}

          {cs?.method_detail ? (
            <div className="rounded-lg border border-border/40 bg-background/50 overflow-hidden">
              <button
                onClick={() => setMethodOpen((v) => !v)}
                className="w-full text-left px-3 py-2 text-[11px] font-semibold text-foreground/80 hover:bg-rose-500/[0.04] transition flex items-center gap-2"
              >
                {methodOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                Method detail
              </button>
              {methodOpen ? (
                <div className="border-t border-border/30 px-3 py-2 text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                  {cs.method_detail}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Source references */}
          {cs?.source_references && cs.source_references.length > 0 ? (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">
                Source references ({cs.source_references.length})
              </div>
              <ul className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {cs.source_references.map((sr, i) => (
                  <li key={i} className="text-[11px] leading-snug">
                    {sr.url ? (
                      <a
                        href={sr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-start gap-1 text-emerald-700 dark:text-emerald-300 hover:underline font-medium"
                      >
                        <ExternalLink className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>{sr.name}</span>
                      </a>
                    ) : (
                      <span className="font-medium text-foreground/85">{sr.name}</span>
                    )}
                    {sr.what_it_provides ? (
                      <p className="text-muted-foreground italic mt-0.5">{sr.what_it_provides}</p>
                    ) : null}
                    {sr.as_of ? (
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">as of {sr.as_of}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Uncertainty drivers */}
          {cs?.uncertainty_drivers && cs.uncertainty_drivers.length > 0 ? (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
                Uncertainty drivers
              </div>
              <ul className="list-disc list-outside pl-5 space-y-0.5 text-[11px] text-muted-foreground leading-relaxed">
                {cs.uncertainty_drivers.map((u, i) => (
                  <li key={i}>{u}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Trajectory chart — multi-region when readings carry a region field */}
          <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Trajectory
              </div>
              {(multiSeries ?? singleSeries) ? (
                <span className="text-[10px] text-muted-foreground">
                  {(multiSeries ?? singleSeries)!.fieldLabel}
                  {multiSeries ? ` — ${multiSeries.regions.length} regions` : ''}
                </span>
              ) : null}
            </div>

            {/* Data-quality badge — only shown when not primary */}
            {indicator.trajectory?.data_quality &&
            indicator.trajectory.data_quality !== 'primary' ? (
              <div className="mb-2 flex items-start gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/[0.08] px-2.5 py-1.5">
                <AlertTriangle className="h-3 w-3 mt-0.5 text-amber-700 dark:text-amber-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                    {indicator.trajectory.data_quality === 'triangulated_estimate'
                      ? 'Estimate — not market data'
                      : indicator.trajectory.data_quality === 'estimated'
                        ? 'Synthetic / forward estimate'
                        : 'Mixed sources — see note'}
                  </div>
                  {indicator.trajectory.data_quality_note ? (
                    <p className="text-[10px] text-amber-900 dark:text-amber-200 leading-relaxed mt-0.5">
                      {indicator.trajectory.data_quality_note}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {multiSeries ? (
              /* ── Multi-region chart ── */
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={multiSeries.pivoted}
                    margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                    <XAxis dataKey="x" tick={{ fontSize: 10 }} />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      domain={[0, 'auto']}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <RechartsTooltip
                      contentStyle={{ fontSize: 11, padding: 6 }}
                      formatter={(value: number | null, name: string) =>
                        value == null ? ['—', name] : [`${value}%`, name]
                      }
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
                      iconType="circle"
                      iconSize={8}
                    />
                    {multiSeries.regions.map((r, idx) => (
                      <Line
                        key={r.name}
                        type="monotone"
                        dataKey={r.name}
                        stroke={regionColor(r.name, idx)}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : singleSeries ? (
              /* ── Single-series chart (fallback) ── */
              <div style={{ width: '100%', height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={singleSeries.points}
                    margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                    <XAxis dataKey="x" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                    <RechartsTooltip
                      contentStyle={{ fontSize: 11, padding: 6 }}
                      formatter={(value: number) => [value, singleSeries.fieldLabel]}
                    />
                    <Line
                      type="monotone"
                      dataKey="y"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic py-3">
                Trajectory not yet quantified
              </p>
            )}

            {indicator.trajectory?.trend_direction ? (
              <p className="text-[10px] text-muted-foreground italic mt-1.5 leading-relaxed">
                {indicator.trajectory.trend_direction}
              </p>
            ) : null}
          </div>
        </div>

        {/* PANEL 2 — Where it's going */}
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.03] p-3 md:p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-rose-600" />
            <h5 className="text-sm font-semibold text-foreground">Where it's going</h5>
            <span className="text-[10px] text-muted-foreground italic">(the prediction)</span>
          </div>

          {fp ? (
            <>
              {fp.horizon_date ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full text-[10px] font-mono border-rose-500/40 text-rose-700 dark:text-rose-300">
                    horizon {fp.horizon_date}
                  </Badge>
                  {fp.confidence ? (
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${confidenceBadgeClassV3(fp.confidence)}`}>
                      {fp.confidence} confidence
                    </span>
                  ) : null}
                </div>
              ) : null}

              {fp.central_path?.value_at_horizon ? (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
                    Central-path value at horizon
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed font-semibold">
                    {fp.central_path.value_at_horizon}
                  </p>
                </div>
              ) : null}

              {fp.central_path?.confidence_interval ? (
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-muted-foreground uppercase tracking-wide font-semibold">CI:</span>
                  <span className="rounded-full border border-rose-500/30 bg-rose-500/[0.06] px-2 py-0.5 tabular-nums text-rose-700 dark:text-rose-300">
                    {String(fp.central_path.confidence_interval.low ?? '?')} —{' '}
                    {String(fp.central_path.confidence_interval.high ?? '?')}
                  </span>
                </div>
              ) : null}

              {fp.rationale ? (
                <div className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground/80">Why: </span>
                  {fp.rationale}
                </div>
              ) : null}

              {/* Intermediate milestones — small timeline */}
              {fp.central_path?.intermediate_milestones && fp.central_path.intermediate_milestones.length > 0 ? (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">
                    Intermediate milestones
                  </div>
                  <ul className="space-y-1.5">
                    {fp.central_path.intermediate_milestones.map((m, i) => (
                      <li key={i} className="rounded-lg border border-border/40 bg-background/50 px-2.5 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="rounded-full text-[10px] font-mono">
                            {m.date}
                          </Badge>
                          {m.value ? (
                            <span className="text-xs font-semibold text-foreground">{m.value}</span>
                          ) : null}
                        </div>
                        {m.rationale ? (
                          <p className="text-[10px] text-muted-foreground leading-relaxed">{m.rationale}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Calendared inflection events */}
              {fp.calendared_inflection_events && fp.calendared_inflection_events.length > 0 ? (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Calendared inflection events
                  </div>
                  <ul className="space-y-1.5">
                    {fp.calendared_inflection_events.map((ev: V3InflectionEvent, i) => (
                      <li key={i} className="rounded-lg border border-amber-500/30 bg-amber-500/[0.04] px-2.5 py-2">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {ev.date ? (
                            <Badge variant="outline" className="rounded-full text-[10px] font-mono border-amber-500/40">
                              {ev.date}
                            </Badge>
                          ) : null}
                          {ev.probability_estimate ? (
                            <span className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                              {ev.probability_estimate}
                            </span>
                          ) : null}
                        </div>
                        {ev.event ? (
                          <p className="text-[11px] font-medium text-foreground/90 leading-relaxed">{ev.event}</p>
                        ) : null}
                        {ev.expected_impact_on_indicator ? (
                          <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                            <span className="font-semibold">Impact: </span>
                            {ev.expected_impact_on_indicator}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* What would invalidate central path */}
              {fp.what_would_invalidate_central_path && fp.what_would_invalidate_central_path.length > 0 ? (
                <div className="rounded-lg border border-rose-500/40 bg-rose-500/[0.06] p-2.5">
                  <div className="text-[10px] uppercase tracking-wide text-rose-700 dark:text-rose-300 font-semibold mb-1.5 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    What would invalidate this central path
                  </div>
                  <ul className="list-disc list-outside pl-5 space-y-0.5 text-[11px] text-rose-900 dark:text-rose-200 leading-relaxed">
                    {fp.what_would_invalidate_central_path.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-muted-foreground italic">No forward projection yet.</p>
          )}
        </div>
      </div>

      {/* System claim block */}
      {sysClaim ? (
        <div className="rounded-xl border border-border/40 bg-background/40 p-3 space-y-1.5">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
            System claim (testable)
          </div>
          {sysClaim.statement ? (
            <p className="text-xs text-foreground/90 leading-relaxed">{sysClaim.statement}</p>
          ) : null}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1.5">
            {sysClaim.metric_unit ? (
              <div className="rounded-lg border border-border/40 bg-background/60 px-2.5 py-1.5">
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Metric</div>
                <div className="text-[11px] text-foreground/90">{sysClaim.metric_unit}</div>
              </div>
            ) : null}
            {sysClaim.horizon_date ? (
              <div className="rounded-lg border border-border/40 bg-background/60 px-2.5 py-1.5">
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Horizon</div>
                <div className="text-[11px] text-foreground/90 font-mono">{sysClaim.horizon_date}</div>
              </div>
            ) : null}
          </div>
          {sysClaim.resolves_true_if ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.04] px-2.5 py-1.5">
              <div className="text-[9px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300 font-semibold">
                Resolves TRUE if
              </div>
              <div className="text-[11px] text-foreground/90">{sysClaim.resolves_true_if}</div>
            </div>
          ) : null}
          {sysClaim.resolves_false_if ? (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/[0.04] px-2.5 py-1.5">
              <div className="text-[9px] uppercase tracking-wide text-rose-700 dark:text-rose-300 font-semibold">
                Resolves FALSE if
              </div>
              <div className="text-[11px] text-foreground/90">{sysClaim.resolves_false_if}</div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Falsification thresholds */}
      {falsifications.length > 0 ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.04] p-3">
          <div className="text-[10px] uppercase tracking-wide text-rose-700 dark:text-rose-300 font-semibold mb-1.5 flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" />
            Falsification thresholds
          </div>
          <ul className="space-y-1.5">
            {falsifications.map((ft: V3FalsificationThreshold, i) => (
              <li key={i} className="rounded-lg border border-border/40 bg-background/40 px-2.5 py-2">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  {ft.event ? (
                    <span className="text-[11px] font-medium text-foreground">{ft.event}</span>
                  ) : null}
                  {ft.magnitude ? (
                    <Badge variant="outline" className="rounded-full text-[10px] border-rose-500/40 text-rose-700 dark:text-rose-300">
                      {ft.magnitude}
                    </Badge>
                  ) : null}
                </div>
                {ft.rationale ? (
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{ft.rationale}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Cross-references row: macro drivers + weight + sweep */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {macroDrivers.length > 0 ? (
          <div className="rounded-xl border border-border/40 bg-background/40 p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">
              Informs macro drivers
            </div>
            <div className="flex flex-wrap gap-1.5">
              {macroDrivers.map((d) => (
                <span
                  key={d}
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-mono font-semibold ${macroDriverChipClassV3(d)}`}
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.04] p-3">
          <div className="text-[10px] uppercase tracking-wide text-rose-700 dark:text-rose-300 font-semibold mb-1.5">
            Weight in bet resolution
          </div>
          <div className="text-2xl font-semibold text-rose-700 dark:text-rose-300 tabular-nums">
            {typeof weight === 'number' ? weight.toFixed(3) : '—'}
          </div>
          {weightRationale ? (
            <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">{weightRationale}</p>
          ) : null}
        </div>

        {indicator.cadence ? (
          <div className="rounded-xl border border-border/40 bg-background/40 p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">
              Cadence
            </div>
            <p className="text-[11px] text-foreground/85 leading-relaxed">{indicator.cadence}</p>
          </div>
        ) : null}
      </div>

      {/* Open Sweep search terms */}
      {sweepTerms.length > 0 ? (
        <div className="rounded-xl border border-border/40 bg-background/40 p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 flex items-center gap-1">
            <Search className="h-3 w-3" />
            Open Sweep search terms ({sweepTerms.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {sweepTerms.map((t, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-full border border-border/40 bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Metadata footer */}
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground/80 border-t border-border/30 pt-2">
        {indicator.metadata?.last_deep_research_pass ? (
          <span className="tabular-nums">
            last deep research pass: {indicator.metadata.last_deep_research_pass}
          </span>
        ) : null}
        {indicator.metadata?.research_priority ? (
          <span>· priority: {indicator.metadata.research_priority}</span>
        ) : null}
        {indicator.metadata?.tier_1_upgrade_note ? (
          <span className="italic" title={indicator.metadata.tier_1_upgrade_note}>
            · Tier-1 note available
          </span>
        ) : null}
      </div>
    </div>
  );
};

export default CrowsNestCanonicalV3;
