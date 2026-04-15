import React, { Component, useMemo, useRef, useState } from 'react';
import { useForesight } from '@/contexts/ForesightContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ─── Error boundary to catch render crashes ──────────────────────────────────
class SharePriceErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 m-4">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Share Price View Error</h3>
          <p className="text-sm text-red-500 font-mono whitespace-pre-wrap">{this.state.error.message}</p>
          <p className="text-xs text-muted-foreground mt-2 font-mono whitespace-pre-wrap">{this.state.error.stack?.slice(0, 500)}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  CandlestickChart,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Eye,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import type { SignificantEvent, TrendPeriod } from '@/types/share-price';

// ─── Formatters ──────────────────────────────────────────────────────────────

// Pipeline always emits returns/ratios as decimal fractions (0.5775 = 57.75%).
// Always multiply by 100 — the previous heuristic clipped >100% returns to single-digit %.
const pct = (v?: number | null, d = 1): string => {
  if (v == null || Number.isNaN(v)) return 'N/A';
  return `${(v * 100).toFixed(d)}%`;
};

const deltaPct = (v?: number | null, d = 1): string => {
  if (v == null || Number.isNaN(v)) return 'N/A';
  const n = v * 100;
  return `${n > 0 ? '+' : ''}${n.toFixed(d)}%`;
};

const fmtDate = (s?: string): string => {
  if (!s) return '—';
  return s.slice(0, 10);
};

// ─── Color helpers ────────────────────────────────────────────────────────────

const colorPct = (v?: number | null): string =>
  v != null && v > 0 ? 'text-emerald-500' : 'text-red-500';

const regimeLabel = (r: string): string =>
  r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const regimeBadgeCls = (r: string): string =>
  r.includes('bull')
    ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
    : r.includes('bear')
      ? 'bg-red-500/15 text-red-600 border-red-500/30'
      : 'bg-slate-500/15 text-slate-500 border-slate-500/30';

const themeTypeFill = (t?: string): string =>
  t === 'structural' ? '#0ea5e9' : t === 'cyclical' ? '#f59e0b' : '#94a3b8';

const themeTypeBadgeCls = (t?: string): string =>
  t === 'structural'
    ? 'bg-sky-500/15 text-sky-600 border-sky-500/30'
    : t === 'cyclical'
      ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
      : 'bg-slate-500/15 text-slate-500 border-slate-500/30';

const confidenceCls = (v?: number): string =>
  v != null && v >= 0.6
    ? 'bg-emerald-500/15 text-emerald-600'
    : v != null && v >= 0.35
      ? 'bg-amber-500/15 text-amber-600'
      : 'bg-red-500/15 text-red-500';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PriceTooltip = (props: any) => {
  const { active, payload, label } = props ?? {};
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/60 bg-card/95 p-3 shadow-lg text-xs backdrop-blur">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {(payload as Array<{ name: string; value: number; color: string }>).map(
        (p: { name: string; value: number; color: string }) => (
          <div key={p.name} className="flex justify-between gap-4">
            <span style={{ color: p.color }}>{p.name}</span>
            <span className="font-mono text-foreground">
              {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
            </span>
          </div>
        ),
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export function SharePriceAnalysisView() {
  return (
    <SharePriceErrorBoundary>
      <SharePriceAnalysisViewInner />
    </SharePriceErrorBoundary>
  );
}

function SharePriceAnalysisViewInner() {
  const { sharePriceData } = useForesight();
  const detailPanelRef = useRef<HTMLDivElement>(null);

  const [selectedPeriodIdx, setSelectedPeriodIdx] = useState<number | null>(null);
  const [selectedEventIdx, setSelectedEventIdx] = useState<number | null>(null);
  const [showMA, setShowMA] = useState({ ma50: true, ma200: true });
  const [showPeers, setShowPeers] = useState(false);
  const [chartView, setChartView] = useState<'price' | 'relative'>('price');
  const [detailTab, setDetailTab] = useState<'period' | 'event'>('period');
  const [expandedCounterHypo, setExpandedCounterHypo] = useState(false);
  const [expandedEvidence, setExpandedEvidence] = useState(false);
  const [expandedPeriodQueries, setExpandedPeriodQueries] = useState(false);
  const [expandedPeriodEvidence, setExpandedPeriodEvidence] = useState(false);

  // ── Derived data ────────────────────────────────────────────────────────────
  const rm = sharePriceData?.run_meta;
  const cp = sharePriceData?.company_profile;
  const ap = sharePriceData?.analysis_period;
  const pp = sharePriceData?.price_performance;
  const ta = sharePriceData?.trend_analysis;
  const dm = sharePriceData?.driver_map;
  const pc = sharePriceData?.peer_comparison;
  const se = sharePriceData?.significant_events ?? [];
  const eg = sharePriceData?.executive_guide;
  const periods = ta?.trend_periods ?? [];

  // Full price series — also merge peer composite if available (indexed to 100, on right axis)
  const priceSeries = useMemo(() => {
    const raw = pp?.price_series;
    if (!raw || raw.length === 0) return [];
    const composite = ta?.peer_attribution?.composite_series ?? [];
    if (composite.length === 0) return raw;
    // Build date → composite_close lookup
    const compMap = new Map<string, number>();
    for (const c of composite) compMap.set(c.date, c.close);
    return raw.map((p) => ({ ...p, peer_composite: compMap.get(p.date) ?? null }));
  }, [pp?.price_series, ta?.peer_attribution?.composite_series]);

  // Date set for quick lookup
  const dateSet = useMemo(() => new Set(priceSeries.map((p) => p.date)), [priceSeries]);

  // Snap period start/end to nearest date that actually exists in the series
  const snappedPeriods = useMemo(() => {
    if (!periods.length || !priceSeries.length) return [];
    return periods.map((p) => {
      // Find first series date >= period start
      const x1 = dateSet.has(p.start_date)
        ? p.start_date
        : priceSeries.find((pt) => pt.date >= p.start_date)?.date ?? null;
      // Find last series date <= period end
      const x2 = dateSet.has(p.end_date)
        ? p.end_date
        : [...priceSeries].reverse().find((pt) => pt.date <= p.end_date)?.date ?? null;
      return { x1, x2 };
    });
  }, [periods, priceSeries, dateSet]);

  // Per-period attribution level: 'sourced' | 'reasoning' | 'none'
  const periodAttrLevel = useMemo(() => {
    return periods.map((p) => {
      const eventsInPeriod = se.filter(
        (ev) => ev.date >= p.start_date && ev.date <= p.end_date,
      );
      if (eventsInPeriod.some((ev) => (ev.attribution?.evidence?.length ?? 0) > 0)) return 'sourced' as const;
      if (eventsInPeriod.some((ev) => !!ev.attribution?.most_probable_reason)) return 'reasoning' as const;
      return 'none' as const;
    });
  }, [periods, se]);

  // Event dots: distinguish "sourced" (has evidence) vs "unsourced reasoning" vs none
  const eventDots = useMemo(() => {
    return se
      .map((ev, i) => {
        const att = ev.attribution;
        const evidenceCount = att?.evidence?.length ?? 0;
        const hasReasoning = !!att?.most_probable_reason;
        const matchingPoint = priceSeries.find((pt) => pt.date === ev.date);
        return {
          idx: i,
          date: ev.date,
          close: ev.close ?? matchingPoint?.close,
          normalized: matchingPoint?.normalized ?? null,
          level: evidenceCount > 0 ? 'sourced' as const : hasReasoning ? 'reasoning' as const : 'none' as const,
          evidenceCount,
        };
      })
      .filter((d) => d.close != null && dateSet.has(d.date));
  }, [se, priceSeries, dateSet]);

  const driverChartData = useMemo(() => {
    const themes = dm?.driver_themes;
    if (!themes || themes.length === 0) return [];
    return themes.map((t) => ({
      shortName: t.theme.length > 38 ? t.theme.slice(0, 36) + '\u2026' : t.theme,
      fullName: t.theme,
      importance_score: t.importance_score ?? 0,
      theme_type: t.theme_type,
    }));
  }, [dm?.driver_themes]);

  const monitoringSignals = useMemo(() => {
    const themes = dm?.driver_themes;
    if (!themes || themes.length === 0) return [];
    return themes
      .slice(0, 5)
      .flatMap((t) => t.monitoring_signals ?? [])
      .filter(Boolean)
      .slice(0, 8);
  }, [dm?.driver_themes]);

  // Map event dates to period indices
  const eventPeriodMap = useMemo(() => {
    const map = new Map<number, number>();
    se.forEach((ev, ei) => {
      const d = ev.date;
      periods.forEach((p, pi) => {
        if (d >= p.start_date && d <= p.end_date) map.set(ei, pi);
      });
    });
    return map;
  }, [se, periods]);

  // Events in selected period
  const periodEvents = useMemo(() => {
    if (selectedPeriodIdx == null) return [];
    const p = periods[selectedPeriodIdx];
    if (!p) return [];
    return se
      .map((ev, i) => ({ ev, i }))
      .filter(({ ev }) => ev.date >= p.start_date && ev.date <= p.end_date);
  }, [selectedPeriodIdx, periods, se]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handlePeriodClick = (idx: number) => {
    setSelectedPeriodIdx(idx);
    setSelectedEventIdx(null);
    setDetailTab('period');
    setExpandedCounterHypo(false);
    setExpandedEvidence(false);
    // reset collapsibles
    setTimeout(() => detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const handleEventClick = (eventIdx: number) => {
    setSelectedEventIdx(eventIdx);
    const pi = eventPeriodMap.get(eventIdx);
    if (pi != null) setSelectedPeriodIdx(pi);
    setDetailTab('event');
    setExpandedCounterHypo(false);
    setExpandedEvidence(false);
    // reset collapsibles
    setTimeout(() => detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const closeDetail = () => {
    setSelectedPeriodIdx(null);
    setSelectedEventIdx(null);
  };

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!sharePriceData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CandlestickChart className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground">No Share Price Stream Loaded</h3>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Upload a <code className="text-xs bg-muted px-1 rounded">SP_*.json</code> analysis file.
        </p>
      </div>
    );
  }

  const selectedPeriod: TrendPeriod | null =
    selectedPeriodIdx != null ? (periods[selectedPeriodIdx] ?? null) : null;
  const selectedEvent: SignificantEvent | null =
    selectedEventIdx != null ? (se[selectedEventIdx] ?? null) : null;

  // Match the trend period to its anchor in significant_events (so the Period
  // tab can show the same research trail / driver_breakdown / queries as Event tab)
  const selectedPeriodAnchor: SignificantEvent | null = useMemo(() => {
    if (!selectedPeriod) return null;
    return (
      se.find(
        (e) =>
          e.anchor_type === 'trend_period' &&
          e.window_start === selectedPeriod.start_date &&
          e.window_end === selectedPeriod.end_date,
      ) ?? null
    );
  }, [selectedPeriod, se]);

  return (
    <div className="space-y-6">

      {/* ── 1. Hero header ─────────────────────────────────────────────────── */}
      <Card className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-background/80 via-card/80 to-sky-500/10 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-sky-500/20 blur-3xl" />
        <CardContent className="relative grid grid-cols-1 gap-4 p-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-border/60 bg-background/70 p-2 shadow-sm">
                <CandlestickChart className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Share Price Analysis</p>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  {rm?.company || cp?.name || 'Company'}
                </h2>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <Badge variant="outline" className="font-mono">{rm?.ticker}</Badge>
              <Badge variant="outline">{rm?.benchmark_label}</Badge>
              {ap && (
                <Badge variant="outline">{fmtDate(ap.start_date)} &rarr; {fmtDate(ap.end_date)}</Badge>
              )}
              {rm?.react_enabled && (
                <Badge className="bg-violet-500/15 text-violet-600 border-violet-500/30">
                  AI Attribution
                </Badge>
              )}
              <Badge variant="outline" className="text-muted-foreground">
                Generated {fmtDate(rm?.generated_at)}
              </Badge>
            </div>
            {cp && (
              <p className="text-sm text-muted-foreground">
                {cp.sector}{cp.industry ? ` \u00b7 ${cp.industry}` : ''}{cp.country ? ` \u00b7 ${cp.country}` : ''}
                {cp.market_cap ? ` \u00b7 \u20ac${(cp.market_cap / 1e9).toFixed(1)}B market cap` : ''}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Latest close" value={pp?.target?.latest_close != null ? `${pp.target.latest_close.toFixed(2)} ${cp?.currency ?? ''}` : 'N/A'} />
            <KpiCard label="Current regime" value={ta?.current_regime ? regimeLabel(ta.current_regime) : 'N/A'} className={ta?.current_regime ? regimeBadgeCls(ta.current_regime) : ''} />
            <KpiCard label="Total return" value={pct(pp?.target?.total_return)} className={colorPct(pp?.target?.total_return)} />
            <KpiCard label="Max drawdown" value={pct(pp?.target?.max_drawdown)} className="text-red-500" />
          </div>
        </CardContent>
      </Card>

      {/* ── 2. KPI strip ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <KpiStrip label="Total return" value={deltaPct(pp?.target?.total_return)} positive={(pp?.target?.total_return ?? 0) > 0} />
        <KpiStrip label="vs Benchmark" value={deltaPct(pp?.relative?.outperformance)} positive={(pp?.relative?.outperformance ?? 0) > 0} />
        <KpiStrip label="12m momentum" value={deltaPct(ta?.momentum?.['12m'])} positive={(ta?.momentum?.['12m'] ?? 0) > 0} />
        <KpiStrip label="Ann. volatility" value={pct(pp?.target?.annualized_volatility)} />
        <KpiStrip label="Max drawdown" value={pct(pp?.target?.max_drawdown)} positive={false} />
        <KpiStrip label="Ann. return" value={deltaPct(pp?.target?.annualized_return)} positive={(pp?.target?.annualized_return ?? 0) > 0} />
      </div>

      {/* ── 3. Executive guide ─────────────────────────────────────────────── */}
      {eg?.stock_story ? (
        <Card className="rounded-2xl border border-sky-500/30 bg-sky-500/5 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-sky-500/15 text-sky-600 border-sky-500/30">Guide</Badge>
              <span className="text-xs text-muted-foreground">AI-generated orientation</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{eg.stock_story}</p>
            {eg.key_drivers && eg.key_drivers.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Key drivers</p>
                {eg.key_drivers.map((d, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-600">
                      {i + 1}
                    </span>
                    <div>
                      <span className="text-sm font-semibold text-foreground">{d.name}</span>
                      <span className="text-sm text-muted-foreground"> &mdash; {d.plain_summary}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {eg.current_watch && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-start gap-2">
                <Eye className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Watch now</span>
                  <p className="text-sm text-amber-900/80 dark:text-amber-200 mt-0.5">{eg.current_watch}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* ── 4. Price chart + regime strip ────────────────────────────────── */}
      <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CandlestickChart className="h-4 w-4 text-sky-600" />
              Price Chart
              {periods.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  click a regime band to explore
                </span>
              )}
            </CardTitle>
            <div className="flex gap-2 items-center">
              {/* Price vs Relative view toggle */}
              <div className="flex rounded-full border border-border/60 p-0.5 bg-muted/40">
                {(['price', 'relative'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setChartView(mode)}
                    className={`rounded-full px-3 py-0.5 text-xs font-medium transition-colors ${
                      chartView === mode
                        ? 'bg-sky-500/20 text-sky-700 dark:text-sky-400'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title={mode === 'price' ? 'Show Aalberts in EUR + benchmark/peers indexed' : 'Show Aalberts + benchmark + peers all indexed to 100 at start (apples-to-apples)'}
                  >
                    {mode === 'price' ? 'Price' : 'Relative'}
                  </button>
                ))}
              </div>
              <div className="w-px h-5 bg-border/60" />
              {chartView === 'price' && (['ma50', 'ma200'] as const).map((ma) => (
                <button
                  key={ma}
                  onClick={() => setShowMA((prev) => ({ ...prev, [ma]: !prev[ma] }))}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    showMA[ma]
                      ? ma === 'ma50'
                        ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                      : 'bg-muted text-muted-foreground border-border/60'
                  }`}
                >
                  {ma.toUpperCase()}
                </button>
              ))}
              {ta?.peer_attribution?.composite_series && ta.peer_attribution.composite_series.length > 0 && (
                <button
                  onClick={() => setShowPeers((v) => !v)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    showPeers
                      ? 'bg-violet-500/15 text-violet-600 border-violet-500/30'
                      : 'bg-muted text-muted-foreground border-border/60'
                  }`}
                  title="Toggle segment-weighted peer composite line"
                >
                  Peers
                </button>
              )}
            </div>
          </div>
          {/* Regime legend */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
            {[['bull', 'Bull', '#22c55e'], ['bear', 'Bear', '#ef4444'], ['consolidation', 'Consolidation', '#94a3b8']].map(
              ([key, label, color]) => (
                <span key={key} className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color, opacity: 0.6 }} />
                  {label}
                </span>
              ),
            )}
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-sky-500" />
              Sourced event
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full border border-amber-500 bg-transparent" />
              Reasoning only
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-4 border-t-2 border-dashed" style={{ borderColor: '#8b5cf6' }} />
              {rm?.benchmark_label ?? 'Benchmark'}
            </span>
            {showPeers && (
              <span className="flex items-center gap-1">
                <span className="inline-block h-0.5 w-4 border-t-2 border-dashed" style={{ borderColor: '#a855f7' }} />
                Peer composite
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="h-[440px]">
          {priceSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={priceSeries}
                margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                onClick={(state: { activeLabel?: string } | null) => {
                  if (!state?.activeLabel) return;
                  const d = state.activeLabel;
                  // Check event first
                  const ei = se.findIndex((e) => e.date === d);
                  if (ei >= 0) { handleEventClick(ei); return; }
                  // Otherwise find containing period
                  const pi = periods.findIndex((p) => d >= p.start_date && d <= p.end_date);
                  if (pi >= 0) handlePeriodClick(pi);
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.25} />
                <XAxis
                  dataKey="date"
                  interval={Math.floor(priceSeries.length / 7)}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v: string) => (v ? v.slice(0, 7) : '')}
                />
                {/* Price axis (left, EUR) — hidden ticks in relative view but kept for coord system */}
                <YAxis
                  yAxisId="price"
                  tick={chartView === 'price' ? { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } : false}
                  tickFormatter={(v: number) => String(Math.round(v))}
                  width={chartView === 'price' ? 42 : 0}
                  hide={chartView === 'relative'}
                />
                {/* Normalized axis (right, indexed to 100) — primary in relative view */}
                <YAxis
                  yAxisId="norm"
                  orientation={chartView === 'relative' ? 'left' : 'right'}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v: number) => chartView === 'relative' ? `${Math.round(v)}` : String(Math.round(v))}
                  width={chartView === 'relative' ? 48 : 36}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<PriceTooltip />} />

                {/* Regime period backgrounds — bind to the visible axis */}
                {snappedPeriods.map((sp, i) => {
                  if (!sp.x1 || !sp.x2) return null;
                  const p = periods[i];
                  const isActive = selectedPeriodIdx === i;
                  const fill = p.regime.includes('bull')
                    ? '#22c55e'
                    : p.regime.includes('bear')
                      ? '#ef4444'
                      : '#94a3b8';
                  return (
                    <ReferenceArea
                      key={`regime-${i}`}
                      yAxisId={chartView === 'price' ? 'price' : 'norm'}
                      x1={sp.x1}
                      x2={sp.x2}
                      fill={fill}
                      fillOpacity={isActive ? 0.25 : 0.08}
                      strokeOpacity={0}
                      ifOverflow="hidden"
                    />
                  );
                })}

                {/* Event dots — y value swaps between close (price) and normalized (relative) */}
                {eventDots.map((d) => {
                  const fill = d.level === 'sourced' ? '#0ea5e9' : d.level === 'reasoning' ? 'transparent' : '#94a3b8';
                  const stroke = d.level === 'sourced' ? '#0ea5e9' : d.level === 'reasoning' ? '#f59e0b' : '#94a3b8';
                  const r = d.level === 'sourced' ? 4.5 : d.level === 'reasoning' ? 3.5 : 2;
                  const y = chartView === 'price' ? d.close : d.normalized;
                  if (y == null) return null;
                  return (
                    <ReferenceDot
                      key={`evt-${d.idx}`}
                      yAxisId={chartView === 'price' ? 'price' : 'norm'}
                      x={d.date}
                      y={y}
                      r={r}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={d.level === 'reasoning' ? 1.5 : 1}
                      fillOpacity={d.level === 'sourced' ? 0.85 : 0.5}
                      ifOverflow="hidden"
                    />
                  );
                })}

                {chartView === 'price' ? (
                  <>
                    {/* Price view: Aalberts in EUR on left axis */}
                    <Line yAxisId="price" dataKey="close" name="Price (EUR)" stroke="#3b82f6" dot={false} strokeWidth={2} isAnimationActive={false} />
                    {showMA.ma50 && <Line yAxisId="price" dataKey="ma50" name="MA50" stroke="#10b981" dot={false} strokeWidth={1} strokeDasharray="5 3" isAnimationActive={false} connectNulls />}
                    {showMA.ma200 && <Line yAxisId="price" dataKey="ma200" name="MA200" stroke="#f59e0b" dot={false} strokeWidth={1} strokeDasharray="5 3" isAnimationActive={false} connectNulls />}
                    <Line yAxisId="norm" dataKey="benchmark_normalized" name={rm?.benchmark_label ?? 'Benchmark'} stroke="#8b5cf6" dot={false} strokeWidth={1.5} strokeDasharray="6 3" isAnimationActive={false} opacity={0.55} />
                    {showPeers && (
                      <Line yAxisId="norm" dataKey="peer_composite" name="Peer composite" stroke="#a855f7" dot={false} strokeWidth={1.5} strokeDasharray="3 3" isAnimationActive={false} connectNulls opacity={0.75} />
                    )}
                  </>
                ) : (
                  <>
                    {/* Relative view: all three indexed to 100 on single right axis */}
                    <Line yAxisId="norm" dataKey="normalized" name={`${rm?.ticker ?? 'Target'} (indexed)`} stroke="#3b82f6" dot={false} strokeWidth={2.5} isAnimationActive={false} />
                    <Line yAxisId="norm" dataKey="benchmark_normalized" name={rm?.benchmark_label ?? 'Benchmark'} stroke="#8b5cf6" dot={false} strokeWidth={1.5} strokeDasharray="6 3" isAnimationActive={false} opacity={0.75} />
                    {showPeers && (
                      <Line yAxisId="norm" dataKey="peer_composite" name="Peer composite" stroke="#a855f7" dot={false} strokeWidth={1.5} strokeDasharray="3 3" isAnimationActive={false} connectNulls opacity={0.8} />
                    )}
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No price data.</div>
          )}
        </CardContent>
      </Card>

      {/* ── 5. Detail panel ────────────────────────────────────────────────── */}
      <div ref={detailPanelRef}>
        {selectedPeriod && (
          <Card className="rounded-2xl border border-sky-500/30 bg-sky-500/5 shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={regimeBadgeCls(selectedPeriod.regime)}>
                    {regimeLabel(selectedPeriod.regime)}
                  </Badge>
                  <span className="text-sm font-semibold text-foreground">
                    {fmtDate(selectedPeriod.start_date)} &rarr; {fmtDate(selectedPeriod.end_date)}
                  </span>
                  <span className={`text-sm font-semibold ${colorPct(selectedPeriod.period_return)}`}>
                    {deltaPct(selectedPeriod.period_return)}
                  </span>
                  <span className="text-xs text-muted-foreground">{selectedPeriod.trading_days}d</span>
                </div>
                <button onClick={closeDetail} className="rounded-full p-1 hover:bg-muted transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              {selectedEvent && (
                <div className="flex gap-1 mt-2">
                  {(['period', 'event'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setDetailTab(tab)}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                        detailTab === tab ? 'bg-sky-500/20 text-sky-700 dark:text-sky-400' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {tab === 'period' ? 'Period overview' : 'Event attribution'}
                    </button>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {detailTab === 'period' && (
                <div className="space-y-4">
                  {selectedPeriod.period_summary && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{selectedPeriod.period_summary}</p>
                  )}

                  {/* Attribution bridge: 3-way decomposition */}
                  {selectedPeriod.attribution_flavour && selectedPeriod.attribution_flavour !== 'unknown' && (
                    <div className="rounded-xl border border-border/50 bg-background/60 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Return decomposition
                        </p>
                        <Badge className={`text-[10px] ${
                          selectedPeriod.attribution_flavour === 'idiosyncratic' ? 'bg-sky-500/15 text-sky-600 border-sky-500/30' :
                          selectedPeriod.attribution_flavour === 'sector' ? 'bg-amber-500/15 text-amber-600 border-amber-500/30' :
                          selectedPeriod.attribution_flavour === 'market' ? 'bg-slate-500/15 text-slate-500 border-slate-500/30' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {selectedPeriod.attribution_flavour}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs">
                        {[
                          { label: 'Market (benchmark)', val: selectedPeriod.market_component, hint: 'index-wide beta' },
                          { label: 'Sector (peers \u2212 market)', val: selectedPeriod.sector_component, hint: 'peer group move' },
                          { label: 'Idiosyncratic', val: selectedPeriod.idiosyncratic_component, hint: 'company-specific', strong: selectedPeriod.attribution_flavour === 'idiosyncratic' },
                        ].map(({ label, val, hint, strong }) => (
                          <div key={label} className={`flex items-center justify-between gap-2 py-1 px-2 rounded ${strong ? 'bg-sky-500/10 font-semibold' : ''}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-muted-foreground flex-shrink-0 w-40">{label}</span>
                              <span className="text-muted-foreground/60 text-[10px] truncate">{hint}</span>
                            </div>
                            <span className={`font-mono ${colorPct(val)}`}>
                              {val !== undefined && val !== null ? deltaPct(val) : '\u2014'}
                            </span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between gap-2 py-1 px-2 rounded border-t border-border/40 mt-1 pt-2">
                          <span className="text-foreground font-semibold">Total period return</span>
                          <span className={`font-mono font-semibold ${colorPct(selectedPeriod.period_return)}`}>
                            {deltaPct(selectedPeriod.period_return)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* L2: Sub-sector peer decomposition — shows WHICH peer group drove the move */}
                  {selectedPeriod.segment_peer_returns && selectedPeriod.segment_peer_returns.length > 0 && (
                    <div className="rounded-xl border border-border/50 bg-background/60 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Sub-sector peer returns in this window
                        </p>
                        <span className="text-[10px] text-muted-foreground">answers "which sub-sector moved"</span>
                      </div>
                      <div className="space-y-1 text-xs">
                        {(() => {
                          const rows = [...(selectedPeriod.segment_peer_returns ?? [])];
                          // Find max absolute return to highlight strongest mover
                          const maxAbs = Math.max(...rows.map((r) => Math.abs(r.avg_return ?? 0)), 0.0001);
                          return rows.map((r) => {
                            const isStrongest = Math.abs(r.avg_return ?? 0) === maxAbs;
                            const isThin = r.peer_count < 2;
                            return (
                              <div key={r.segment} className={`flex items-center justify-between gap-2 py-1 px-2 rounded ${isStrongest ? 'bg-sky-500/10' : ''}`}>
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className={`${isStrongest ? 'font-semibold text-foreground' : 'text-foreground/90'} truncate`} title={r.segment}>
                                    {r.segment}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground/70 flex-shrink-0">
                                    ({r.peers.join(', ')})
                                  </span>
                                  {isThin && (
                                    <span className="text-[10px] text-amber-600 flex-shrink-0">thin</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="text-[10px] text-muted-foreground">w={pct(r.weight, 0)}</span>
                                  <span className={`font-mono ${colorPct(r.avg_return)} w-12 text-right`}>
                                    {deltaPct(r.avg_return)}
                                  </span>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                      {selectedPeriod.peer_composite_return != null && (
                        <div className="flex items-center justify-between gap-2 py-1 px-2 rounded border-t border-border/40 pt-2 text-xs">
                          <span className="text-muted-foreground italic">Peer composite (weighted)</span>
                          <span className={`font-mono italic ${colorPct(selectedPeriod.peer_composite_return)}`}>
                            {deltaPct(selectedPeriod.peer_composite_return)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* L2: Broad sector indices + triangulation flag */}
                  {selectedPeriod.sector_index_returns && Object.keys(selectedPeriod.sector_index_returns).length > 0 && (
                    <div className="rounded-xl border border-border/50 bg-background/60 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Broad sector indices in this window
                        </p>
                        <span className="text-[10px] text-muted-foreground">answers "was the sector moving too"</span>
                      </div>
                      <div className="space-y-1 text-xs">
                        {Object.entries(selectedPeriod.sector_index_returns).map(([tk, ret]) => (
                          <div key={tk} className="flex items-center justify-between gap-2 py-1 px-2 rounded">
                            <span className="text-foreground/90 font-mono text-[11px]">{tk}</span>
                            <span className={`font-mono ${colorPct(ret)} w-12 text-right`}>{deltaPct(ret)}</span>
                          </div>
                        ))}
                        {selectedPeriod.sector_index_avg != null && (
                          <div className="flex items-center justify-between gap-2 py-1 px-2 rounded border-t border-border/40 pt-2">
                            <span className="text-muted-foreground italic">Sector index average</span>
                            <span className={`font-mono italic ${colorPct(selectedPeriod.sector_index_avg)}`}>
                              {deltaPct(selectedPeriod.sector_index_avg)}
                            </span>
                          </div>
                        )}
                      </div>
                      {selectedPeriod.triangulation?.flag && (
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40">
                          <Badge variant="outline" className={`text-[10px] ${
                            selectedPeriod.triangulation.flag === 'company_specific' ? 'bg-sky-500/15 text-sky-600 border-sky-500/30' :
                            selectedPeriod.triangulation.flag === 'sector_wide_confirmed' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' :
                            selectedPeriod.triangulation.flag === 'sector_wide_partial' ? 'bg-amber-500/15 text-amber-600 border-amber-500/30' :
                            selectedPeriod.triangulation.flag === 'peer_set_specific' ? 'bg-violet-500/15 text-violet-600 border-violet-500/30' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {selectedPeriod.triangulation.flag.replace(/_/g, ' ')}
                          </Badge>
                          {selectedPeriod.triangulation.summary && (
                            <span className="text-[10px] text-muted-foreground">{selectedPeriod.triangulation.summary}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Period attribution — what the model thinks drove this period */}
                  {selectedPeriodAnchor?.attribution?.most_probable_reason && (
                    <div className="rounded-xl border border-border/50 bg-background/60 p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Period attribution</p>
                        {selectedPeriodAnchor.attribution.confidence != null && (
                          <Badge className={`text-[10px] ${confidenceCls(selectedPeriodAnchor.attribution.confidence)}`}>
                            {pct(selectedPeriodAnchor.attribution.confidence, 0)} confidence
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">
                        {selectedPeriodAnchor.attribution.most_probable_reason}
                      </p>
                      {selectedPeriodAnchor.attribution.investor_interpretation && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {selectedPeriodAnchor.attribution.investor_interpretation}
                        </p>
                      )}

                      {/* L3: two-part explanation for sector-flavour periods (when populated by new pipeline) */}
                      {(selectedPeriodAnchor.attribution.sector_move_explanation || selectedPeriodAnchor.attribution.company_specific_explanation) && (
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 mt-3">
                          {selectedPeriodAnchor.attribution.sector_move_explanation?.what_drove_peers && (
                            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                                  Sector move
                                </p>
                                {selectedPeriodAnchor.attribution.sector_move_explanation.peer_group_return_pp != null && (
                                  <span className={`text-xs font-mono ${colorPct(selectedPeriodAnchor.attribution.sector_move_explanation.peer_group_return_pp)}`}>
                                    {deltaPct(selectedPeriodAnchor.attribution.sector_move_explanation.peer_group_return_pp)}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-foreground leading-relaxed">
                                {selectedPeriodAnchor.attribution.sector_move_explanation.what_drove_peers}
                              </p>
                              {selectedPeriodAnchor.attribution.sector_move_explanation.catalysts && selectedPeriodAnchor.attribution.sector_move_explanation.catalysts.length > 0 && (
                                <ul className="space-y-0.5">
                                  {selectedPeriodAnchor.attribution.sector_move_explanation.catalysts.map((c, i) => (
                                    <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                      <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0 text-amber-600" />{c}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {(selectedPeriodAnchor.attribution.sector_move_explanation.evidence_urls || []).length > 0 && (
                                <p className="text-[10px] text-muted-foreground">
                                  {selectedPeriodAnchor.attribution.sector_move_explanation.evidence_urls!.length} sector sources
                                </p>
                              )}
                            </div>
                          )}
                          {selectedPeriodAnchor.attribution.company_specific_explanation?.what_aalberts_added && (
                            <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-400">
                                  Company-specific (idiosyncratic)
                                </p>
                                {selectedPeriodAnchor.attribution.company_specific_explanation.idiosyncratic_return_pp != null && (
                                  <span className={`text-xs font-mono ${colorPct(selectedPeriodAnchor.attribution.company_specific_explanation.idiosyncratic_return_pp)}`}>
                                    {deltaPct(selectedPeriodAnchor.attribution.company_specific_explanation.idiosyncratic_return_pp)}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-foreground leading-relaxed">
                                {selectedPeriodAnchor.attribution.company_specific_explanation.what_aalberts_added}
                              </p>
                              {selectedPeriodAnchor.attribution.company_specific_explanation.catalysts && selectedPeriodAnchor.attribution.company_specific_explanation.catalysts.length > 0 && (
                                <ul className="space-y-0.5">
                                  {selectedPeriodAnchor.attribution.company_specific_explanation.catalysts.map((c, i) => (
                                    <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                      <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0 text-sky-600" />{c}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {(selectedPeriodAnchor.attribution.company_specific_explanation.evidence_urls || []).length > 0 && (
                                <p className="text-[10px] text-muted-foreground">
                                  {selectedPeriodAnchor.attribution.company_specific_explanation.evidence_urls!.length} company sources
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Reconciliation note when flavour ≠ driver weights */}
                      {(() => {
                        const flav = selectedPeriod.attribution_flavour;
                        const total = Math.abs(selectedPeriod.period_return ?? 0);
                        const sectorPct = total > 0 ? Math.abs(selectedPeriod.sector_component ?? 0) / total : 0;
                        if (flav === 'sector' && sectorPct > 0.5) {
                          return (
                            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs">
                              <p className="text-amber-700 dark:text-amber-300">
                                <strong>Note:</strong> The mathematical decomposition shows this is a SECTOR move
                                (peers moved {deltaPct(selectedPeriod.sector_component)} beyond the index — {(sectorPct*100).toFixed(0)}% of total).
                                The drivers below explain the smaller {deltaPct(selectedPeriod.idiosyncratic_component)} idiosyncratic
                                outperformance. Look at the "Segment & Peer Map" panel for which peer group drove the sector move.
                              </p>
                            </div>
                          );
                        }
                        if (flav === 'market' && total > 0 && Math.abs(selectedPeriod.market_component ?? 0) / total > 0.5) {
                          return (
                            <div className="rounded-lg border border-slate-500/30 bg-slate-500/5 p-2.5 text-xs">
                              <p className="text-slate-600 dark:text-slate-300">
                                <strong>Note:</strong> This was primarily an INDEX-WIDE move (benchmark moved {deltaPct(selectedPeriod.market_component)}).
                                Aalberts roughly tracked it. The reasoning below is the agent's best attempt to explain
                                the residual idiosyncratic component.
                              </p>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Driver breakdown bars */}
                      {selectedPeriodAnchor.attribution.driver_breakdown && selectedPeriodAnchor.attribution.driver_breakdown.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Drivers (weighted to total move)</p>
                          {selectedPeriodAnchor.attribution.driver_breakdown.map((d, i) => (
                            <div key={i} className="space-y-0.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-foreground flex-1 mr-2">{d.driver}</span>
                                <span className="font-mono text-muted-foreground">{pct(d.weight, 0)}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(100, (d.weight ?? 0) * 100)}%`,
                                    background: d.direction === 'positive' ? '#22c55e' : d.direction === 'negative' ? '#ef4444' : '#94a3b8',
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* What to monitor */}
                      {selectedPeriodAnchor.attribution.what_to_monitor_next && selectedPeriodAnchor.attribution.what_to_monitor_next.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Watch next</p>
                          {selectedPeriodAnchor.attribution.what_to_monitor_next.map((m, i) => (
                            <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0 text-sky-500" />{m}
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Research trail — collapsible queries + evidence */}
                      <CollapsibleSection
                        title={`Research queries (${selectedPeriodAnchor.attribution.queries?.length ?? 0})`}
                        expanded={expandedPeriodQueries}
                        toggle={() => setExpandedPeriodQueries(!expandedPeriodQueries)}
                        items={(selectedPeriodAnchor.attribution.queries ?? []).map((q, i) =>
                          (typeof q === 'string' ? q : `R${q.round ?? i + 1}: ${q.query}`)
                        )}
                      />
                      <CollapsibleSection
                        title={`Evidence captured (${selectedPeriodAnchor.attribution.evidence?.length ?? 0})`}
                        expanded={expandedPeriodEvidence}
                        toggle={() => setExpandedPeriodEvidence(!expandedPeriodEvidence)}
                        items={(selectedPeriodAnchor.attribution.evidence ?? []).map((e) =>
                          `${e.title || e.url}${e.snippet ? ' — ' + e.snippet.slice(0, 120) : ''}`
                        )}
                      />
                    </div>
                  )}

                  {periodEvents.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Events in period</p>
                      {periodEvents.map(({ ev, i }) => (
                        <button
                          key={i}
                          onClick={() => handleEventClick(i)}
                          className={`w-full text-left rounded-xl border px-3 py-2 text-xs transition-colors hover:bg-sky-500/5 ${
                            selectedEventIdx === i ? 'border-sky-500/50 bg-sky-500/10' : 'border-border/50 bg-background/60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-muted-foreground">{fmtDate(ev.date)}</span>
                              {ev.anchor_title && <span className="text-foreground font-medium">{ev.anchor_title}</span>}
                              <span className={`font-semibold ${colorPct(ev.return_1d)}`}>{deltaPct(ev.return_1d)}</span>
                            </div>
                            {ev.attribution?.confidence != null && (
                              <Badge className={`${confidenceCls(ev.attribution.confidence)} text-[10px]`}>
                                {pct(ev.attribution.confidence, 0)}
                              </Badge>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {detailTab === 'event' && selectedEvent && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground leading-relaxed flex-1">
                      {selectedEvent.attribution?.most_probable_reason ?? 'No attribution.'}
                    </p>
                    {selectedEvent.attribution?.confidence != null && (
                      <Badge className={`${confidenceCls(selectedEvent.attribution.confidence)} flex-shrink-0`}>
                        {pct(selectedEvent.attribution.confidence, 0)} confidence
                      </Badge>
                    )}
                  </div>
                  {selectedEvent.attribution?.investor_interpretation && (
                    <p className="text-sm text-muted-foreground">{selectedEvent.attribution.investor_interpretation}</p>
                  )}
                  {/* Driver breakdown bars */}
                  {selectedEvent.attribution?.driver_breakdown && selectedEvent.attribution.driver_breakdown.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Drivers</p>
                      {selectedEvent.attribution.driver_breakdown.map((d, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-foreground font-medium flex-1 mr-2">{d.driver}</span>
                            <span className="font-mono text-muted-foreground">{pct(d.weight, 0)}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, (d.weight ?? 0) * 100)}%`,
                                background: d.direction === 'positive' ? '#22c55e' : d.direction === 'negative' ? '#ef4444' : '#94a3b8',
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* What to monitor */}
                  {selectedEvent.attribution?.what_to_monitor_next && selectedEvent.attribution.what_to_monitor_next.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Watch next</p>
                      {selectedEvent.attribution.what_to_monitor_next.map((item, i) => (
                        <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0 text-sky-500" />{item}
                        </p>
                      ))}
                    </div>
                  )}
                  {/* Collapsible sections */}
                  <CollapsibleSection
                    title={`Counter-hypotheses (${selectedEvent.attribution?.counter_hypotheses?.length ?? 0})`}
                    expanded={expandedCounterHypo}
                    toggle={() => setExpandedCounterHypo(!expandedCounterHypo)}
                    items={selectedEvent.attribution?.counter_hypotheses}
                  />
                  <CollapsibleSection
                    title={`Evidence (${selectedEvent.attribution?.evidence?.length ?? 0})`}
                    expanded={expandedEvidence}
                    toggle={() => setExpandedEvidence(!expandedEvidence)}
                    items={selectedEvent.attribution?.evidence?.map((e) => e.title + (e.snippet ? ` — ${e.snippet}` : ''))}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── 6. Driver map ──────────────────────────────────────────────────── */}
      {driverChartData.length > 0 && (
        <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-sky-600" />
              Driver Map
              <span className="text-xs font-normal text-muted-foreground ml-1">{dm?.events_analyzed} events analyzed</span>
            </CardTitle>
            <div className="flex gap-3 text-xs mt-1">
              {[['structural', 'Structural'], ['cyclical', 'Cyclical'], ['episodic', 'Episodic']].map(([t, label]) => (
                <span key={t} className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: themeTypeFill(t) }} />
                  {label}
                </span>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={driverChartData} margin={{ left: 10, right: 32, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.25} horizontal={false} />
                  <XAxis type="number" domain={[0, 0.35]} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="shortName" width={230} tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} />
                  <Bar dataKey="importance_score" radius={[0, 4, 4, 0]}>
                    {driverChartData.map((entry, i) => (
                      <Cell key={i} fill={themeTypeFill(entry.theme_type)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Theme cards */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {(dm?.driver_themes ?? []).map((t, i) => (
                <div key={i} className="rounded-xl border border-border/50 bg-background/60 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground leading-snug">{t.theme}</p>
                    <Badge className={`${themeTypeBadgeCls(t.theme_type)} text-[10px]`}>{t.theme_type}</Badge>
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                  {t.forward_looking && (
                    <p className="text-xs text-sky-600 dark:text-sky-400">
                      <span className="font-semibold">Forward: </span>{t.forward_looking}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {dm?.dominant_narrative && (
              <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Dominant narrative</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{dm.dominant_narrative}</p>
              </div>
            )}

            {monitoringSignals.length > 0 && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" /> Monitoring priorities
                </p>
                {monitoringSignals.map((s, i) => (
                  <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0 text-amber-500" />{s}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── 7. Trend periods table ─────────────────────────────────────────── */}
      {periods.length > 0 && (
        <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4 text-sky-600" />
              All Trend Periods
              <span className="text-xs font-normal text-muted-foreground ml-1">click a row to open detail</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    {['#', 'Start', 'End', 'Regime', 'Return', 'vs BM', 'Days', 'Ev.', 'Triang.', ''].map((h, hi) => (
                      <th key={hi} className="px-3 py-2 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periods.map((p, i) => {
                    const level = periodAttrLevel[i];
                    return (
                      <tr
                        key={i}
                        onClick={() => handlePeriodClick(i)}
                        className={`border-b border-border/30 cursor-pointer transition-colors hover:bg-muted/40 ${
                          selectedPeriodIdx === i ? 'bg-sky-500/10 ring-1 ring-inset ring-sky-500/30' : ''
                        } ${p.is_latest_period ? 'font-semibold' : ''}`}
                      >
                        <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2 font-mono">{fmtDate(p.start_date)}</td>
                        <td className="px-3 py-2 font-mono">{fmtDate(p.end_date)}</td>
                        <td className="px-3 py-2">
                          <Badge className={`${regimeBadgeCls(p.regime)} text-[10px]`}>{regimeLabel(p.regime)}</Badge>
                          {p.is_latest_period && <span className="ml-1 text-muted-foreground">(current)</span>}
                        </td>
                        <td className={`px-3 py-2 font-semibold ${colorPct(p.period_return)}`}>{deltaPct(p.period_return)}</td>
                        <td className={`px-3 py-2 ${colorPct(p.period_abnormal_return)}`}>{p.period_abnormal_return != null ? deltaPct(p.period_abnormal_return) : '\u2014'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{p.trading_days}</td>
                        <td className="px-3 py-2 text-muted-foreground">{p.event_count ?? 0}</td>
                        <td className="px-3 py-2">
                          {p.triangulation?.flag && (
                            <span
                              title={p.triangulation.summary || ''}
                              className={`inline-flex h-4 items-center rounded-full px-1.5 text-[9px] font-medium ${
                                p.triangulation.flag === 'company_specific' ? 'bg-sky-500/15 text-sky-600' :
                                p.triangulation.flag === 'sector_wide_confirmed' ? 'bg-emerald-500/15 text-emerald-600' :
                                p.triangulation.flag === 'sector_wide_partial' ? 'bg-amber-500/15 text-amber-600' :
                                p.triangulation.flag === 'peer_set_specific' ? 'bg-violet-500/15 text-violet-600' :
                                'bg-muted text-muted-foreground'
                              }`}
                            >
                              {p.triangulation.flag === 'company_specific' ? 'company' :
                               p.triangulation.flag === 'sector_wide_confirmed' ? 'sector' :
                               p.triangulation.flag === 'sector_wide_partial' ? 'sector*' :
                               p.triangulation.flag === 'peer_set_specific' ? 'peer-set' :
                               p.triangulation.flag}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {level === 'sourced' && (
                            <span className="inline-flex h-4 items-center rounded-full bg-sky-500/15 px-1.5 text-[9px] font-medium text-sky-600" title="AI attribution with web sources">
                              AI
                            </span>
                          )}
                          {level === 'reasoning' && (
                            <span className="inline-flex h-4 items-center rounded-full border border-amber-500/40 px-1.5 text-[9px] font-medium text-amber-600" title="AI reasoning (no web sources)">
                              AI
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 7b. Segment & Peer Map (NEW) ─────────────────────────────────── */}
      {ta?.peer_attribution?.segment_coverage && Object.keys(ta.peer_attribution.segment_coverage).length > 0 && (
        <SegmentPeerMap
          peerAttribution={ta.peer_attribution}
          peers={pc?.peers ?? []}
          companyName={rm?.company || cp?.name || 'Target'}
          companyTicker={rm?.ticker || ''}
        />
      )}

      {/* ── 8. Peer comparison ────────────────────────────────────────────── */}
      {pc?.peers && pc.peers.length > 0 && (
        <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-sky-600" /> Peer Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    {['Ticker', 'Name', 'Total Return', 'Ann. Vol', 'Max DD', 'Correlation'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pc.peers.map((peer) => (
                    <tr key={peer.ticker} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2 font-mono text-muted-foreground">{peer.ticker}</td>
                      <td className="px-3 py-2">{peer.name ?? peer.ticker}</td>
                      <td className={`px-3 py-2 ${colorPct(peer.total_return)}`}>{deltaPct(peer.total_return)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{pct(peer.annualized_volatility)}</td>
                      <td className="px-3 py-2 text-red-500">{pct(peer.max_drawdown)}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {peer.correlation_to_target != null ? peer.correlation_to_target.toFixed(2) : '\u2014'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 9. Earnings reaction ───────────────────────────────────────────── */}
      {pc?.earnings_reaction && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Earnings events" value={String(pc.earnings_reaction.events_considered ?? 'N/A')} />
          <KpiCard label="Avg Day-0 return" value={deltaPct(pc.earnings_reaction.avg_return_day0)} />
          <KpiCard label="Avg abnormal Day-0" value={deltaPct(pc.earnings_reaction.avg_abnormal_day0)} />
          <KpiCard label="Window -3/+3" value={deltaPct(pc.earnings_reaction.avg_return_m3_p3)} />
        </div>
      )}
    </div>
  );
}

// ─── Small reusable pieces ────────────────────────────────────────────────────

function KpiCard({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${className || 'text-foreground'}`}>{value}</p>
    </div>
  );
}

function KpiStrip({ label, value, positive }: { label: string; value: string; positive?: boolean | null }) {
  const cls = positive == null ? 'text-foreground' : positive ? 'text-emerald-500' : 'text-red-500';
  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${cls}`}>{value}</p>
    </div>
  );
}

function CollapsibleSection({
  title, expanded, toggle, items,
}: {
  title: string; expanded: boolean; toggle: () => void; items?: string[];
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="rounded-xl border border-border/50 bg-background/60 overflow-hidden">
      <button onClick={toggle} className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
        <span>{title}</span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-1.5 border-t border-border/40 pt-2">
          {items.map((item, i) => (
            <p key={i} className="text-xs text-muted-foreground">{item}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Segment & Peer Map ──────────────────────────────────────────────────────
// Static peer-name lookup (pipeline only stores tickers right now)
const PEER_NAMES: Record<string, string> = {
  'BEAN.SW': 'Belimo',
  'GEBN.SW': 'Geberit',
  'WTS':     'Watts Water',
  'IMI.L':   'IMI plc',
  'PH':      'Parker-Hannifin',
  'ITT':     'ITT Inc.',
  'BOY.L':   'Bodycote',
  'OERL.SW': 'OC Oerlikon',
  'CR':      'Crane Company',
  'VACN.SW': 'VAT Group',
  'ASM.AS':  'ASM International',
  'ASML':    'ASML Holding',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SegmentPeerMap({ peerAttribution, peers, companyName, companyTicker }: {
  peerAttribution: any;
  peers: Array<{ ticker: string; name?: string; total_return?: number; annualized_volatility?: number; max_drawdown?: number; correlation_to_target?: number }>;
  companyName: string;
  companyTicker: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const segCoverage: Record<string, { weight: number; peers: string[]; peer_count: number }> =
    peerAttribution?.segment_coverage ?? {};
  const peerStatsByTicker = useMemo(() => {
    const m: Record<string, typeof peers[number]> = {};
    for (const p of peers) m[p.ticker] = p;
    return m;
  }, [peers]);

  const segments = Object.entries(segCoverage)
    .map(([name, info]) => ({ name, ...info }))
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));

  const totalWeight = segments.reduce((s, x) => s + (x.weight ?? 0), 0) || 1;
  const dropped = peerAttribution?.peers_dropped_low_comparability ?? [];
  const confidence = peerAttribution?.coverage_confidence ?? 'unknown';
  const notes = peerAttribution?.coverage_notes ?? [];

  const confidenceCls =
    confidence === 'high' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
    : confidence === 'medium' ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
    : 'bg-red-500/15 text-red-500 border-red-500/30';

  return (
    <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
      <CardHeader>
        <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between text-left">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-sky-600" />
            Segment & Peer Map
            <span className="text-xs font-normal text-muted-foreground ml-1">
              · {segments.length} segments \u00b7 {peers.length} peers \u00b7 {dropped.length} excluded
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={`text-[10px] ${confidenceCls}`}>coverage: {confidence}</Badge>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {/* Segment mix bar — proportional widths */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {companyName} ({companyTicker}) revenue mix by industry segment
            </p>
            <div className="flex h-7 w-full overflow-hidden rounded-lg border border-border/40">
              {segments.map((s, i) => {
                const widthPct = ((s.weight ?? 0) / totalWeight) * 100;
                const colors = ['#0ea5e9', '#10b981', '#f59e0b', '#a855f7', '#ec4899', '#64748b'];
                const bg = colors[i % colors.length];
                const isThin = s.peer_count < 2;
                return (
                  <div
                    key={s.name}
                    style={{ width: `${widthPct}%`, background: bg, opacity: isThin ? 0.55 : 0.85 }}
                    className="flex items-center justify-center text-[10px] font-medium text-white"
                    title={`${s.name}: ${(s.weight*100).toFixed(1)}% weight, ${s.peer_count} peer(s)`}
                  >
                    {widthPct >= 8 && `${(s.weight*100).toFixed(0)}%`}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coverage notes */}
          {notes.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
              {notes.map((n: string, i: number) => (
                <p key={i} className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />{n}
                </p>
              ))}
            </div>
          )}

          {/* Per-segment cards with peers */}
          <div className="space-y-3">
            {segments.map((s, i) => {
              const colors = ['#0ea5e9', '#10b981', '#f59e0b', '#a855f7', '#ec4899', '#64748b'];
              const accent = colors[i % colors.length];
              const isThin = s.peer_count < 2;
              return (
                <div key={s.name} className="rounded-xl border border-border/50 bg-background/60 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-sm" style={{ background: accent }} />
                      <span className="text-sm font-semibold text-foreground">{s.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(s.weight*100).toFixed(1)}% weight
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {isThin && (
                        <Badge className="text-[10px] bg-amber-500/15 text-amber-600 border-amber-500/30">
                          THIN ({s.peer_count} peer)
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px]">{s.peer_count} peer(s)</Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                    {s.peers.map((ticker) => {
                      const stat = peerStatsByTicker[ticker];
                      const ret = stat?.total_return;
                      const vol = stat?.annualized_volatility;
                      const corr = stat?.correlation_to_target;
                      const name = PEER_NAMES[ticker] ?? stat?.name ?? ticker;
                      return (
                        <div key={ticker} className="rounded-lg border border-border/40 bg-card/40 p-2 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono font-semibold text-foreground">{ticker}</span>
                            <span className="text-muted-foreground truncate ml-2 text-[10px]" title={name}>{name}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 text-[10px]">
                            <div>
                              <span className="text-muted-foreground/70">Return</span>
                              <div className={ret !== undefined && ret > 0 ? 'text-emerald-500 font-mono' : 'text-red-500 font-mono'}>
                                {ret !== undefined ? `${(ret*100).toFixed(0)}%` : '\u2014'}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground/70">Vol</span>
                              <div className="text-foreground font-mono">{vol !== undefined ? `${(vol*100).toFixed(0)}%` : '\u2014'}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground/70">Corr</span>
                              <div className="text-foreground font-mono">{corr !== undefined && corr !== null ? corr.toFixed(2) : '\u2014'}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Excluded peers */}
          {dropped.length > 0 && (
            <div className="rounded-xl border border-border/30 bg-muted/20 p-3 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Peers excluded from composite (low comparability)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {dropped.map((dp: { ticker: string; name?: string; comparability?: string }, i: number) => {
                  const display = PEER_NAMES[dp.ticker] ?? dp.name ?? dp.ticker;
                  return (
                    <span key={i} className="rounded-md border border-border/50 bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                      <span className="font-mono">{dp.ticker}</span> · {display} · <span className="italic">{dp.comparability ?? '?'}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
