import { useMemo, useRef, useState } from 'react';
import { useForesight } from '@/contexts/ForesightContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  BookOpen,
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

const pct = (v?: number | null, d = 1): string => {
  if (v === undefined || v === null || Number.isNaN(v)) return 'N/A';
  const n = Math.abs(v) <= 1 ? v * 100 : v;
  return `${n.toFixed(d)}%`;
};

const deltaPct = (v?: number | null, d = 1): string => {
  if (v === undefined || v === null || Number.isNaN(v)) return 'N/A';
  const n = Math.abs(v) <= 1 ? v * 100 : v;
  return `${n > 0 ? '+' : ''}${n.toFixed(d)}%`;
};

const fmtDate = (s?: string): string => {
  if (!s) return '—';
  return s.slice(0, 10);
};

const fmtNum = (v?: number | null, d = 2): string => {
  if (v === undefined || v === null || Number.isNaN(v)) return 'N/A';
  return v.toFixed(d);
};

// ─── Color helpers ────────────────────────────────────────────────────────────

const colorPct = (v?: number | null): string =>
  v !== undefined && v !== null && v > 0 ? 'text-emerald-500' : 'text-red-500';

const regimeLabel = (r: string): string =>
  r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const regimeFill = (r: string): string =>
  r.includes('bull') ? '#22c55e' : r.includes('bear') ? '#ef4444' : '#94a3b8';

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
  v !== undefined && v >= 0.6
    ? 'bg-emerald-500/15 text-emerald-600'
    : v !== undefined && v >= 0.35
      ? 'bg-amber-500/15 text-amber-600'
      : 'bg-red-500/15 text-red-500';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PriceTooltip = (props: any) => {
  const { active, payload, label } = props ?? {};
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/60 bg-card/95 p-3 shadow-lg text-xs backdrop-blur">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-mono text-foreground">{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export function SharePriceAnalysisView() {
  const { sharePriceData } = useForesight();
  const detailPanelRef = useRef<HTMLDivElement>(null);

  const [selectedPeriodIdx, setSelectedPeriodIdx] = useState<number | null>(null);
  const [selectedEventIdx, setSelectedEventIdx] = useState<number | null>(null);
  const [showMA, setShowMA] = useState({ ma50: true, ma200: true });
  const [detailTab, setDetailTab] = useState<'period' | 'event'>('period');
  const [expandedCounterHypo, setExpandedCounterHypo] = useState(false);
  const [expandedEvidence, setExpandedEvidence] = useState(false);
  const [expandedQueries, setExpandedQueries] = useState(false);

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

  const priceSeries = useMemo(() => {
    if (!pp?.price_series?.length) return [];
    return pp.price_series;
  }, [pp?.price_series]);

  // Set of dates in the series for snapping ReferenceArea bounds
  const seriesDates = useMemo(() => {
    return new Set(priceSeries.map((p) => p.date));
  }, [priceSeries]);

  const driverChartData = useMemo(() => {
    if (!dm?.driver_themes?.length) return [];
    return dm.driver_themes.map((t) => ({
      shortName: t.theme.length > 38 ? t.theme.slice(0, 36) + '…' : t.theme,
      fullName: t.theme,
      importance_score: t.importance_score ?? 0,
      theme_type: t.theme_type,
    }));
  }, [dm?.driver_themes]);

  const monitoringSignals = useMemo(() => {
    if (!dm?.driver_themes) return [];
    return dm.driver_themes
      .slice(0, 5)
      .flatMap((t) => t.monitoring_signals ?? [])
      .filter(Boolean)
      .slice(0, 8);
  }, [dm?.driver_themes]);

  // Map event dates to period indices for quick lookup
  const eventPeriodMap = useMemo(() => {
    const map = new Map<number, number>(); // eventIdx → periodIdx
    se.forEach((ev, ei) => {
      const d = ev.date;
      periods.forEach((p, pi) => {
        if (d >= p.start_date && d <= p.end_date) map.set(ei, pi);
      });
    });
    return map;
  }, [se, periods]);

  // Events that fall within the selected period
  const periodEvents = useMemo(() => {
    if (selectedPeriodIdx === null) return [];
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
    setExpandedQueries(false);
    setTimeout(() => detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const handleEventClick = (eventIdx: number) => {
    setSelectedEventIdx(eventIdx);
    const pi = eventPeriodMap.get(eventIdx);
    if (pi !== undefined) setSelectedPeriodIdx(pi);
    setDetailTab('event');
    setExpandedCounterHypo(false);
    setExpandedEvidence(false);
    setExpandedQueries(false);
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
          Upload your <code className="text-xs bg-muted px-1 rounded">SP_*.json</code> analysis file to unlock this view.
        </p>
      </div>
    );
  }

  const selectedPeriod: TrendPeriod | null =
    selectedPeriodIdx !== null ? (periods[selectedPeriodIdx] ?? null) : null;
  const selectedEvent: SignificantEvent | null =
    selectedEventIdx !== null ? (se[selectedEventIdx] ?? null) : null;

  // ── Render ──────────────────────────────────────────────────────────────────
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
                <Badge variant="outline">{fmtDate(ap.start_date)} → {fmtDate(ap.end_date)}</Badge>
              )}
              {rm?.react_enabled && (
                <Badge className="bg-violet-500/15 text-violet-600 border-violet-500/30">
                  AI Attribution · {rm.react_model}
                </Badge>
              )}
              <Badge variant="outline" className="text-muted-foreground">
                Generated {fmtDate(rm?.generated_at)}
              </Badge>
            </div>
            {cp && (
              <p className="text-sm text-muted-foreground">
                {cp.sector}{cp.industry ? ` · ${cp.industry}` : ''}{cp.country ? ` · ${cp.country}` : ''}
                {cp.market_cap ? ` · €${(cp.market_cap / 1e9).toFixed(1)}B market cap` : ''}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Latest close', value: rm?.ticker ? `${pp?.target?.latest_close?.toFixed(2) ?? 'N/A'} ${cp?.currency ?? ''}` : 'N/A' },
              { label: 'Current regime', value: ta?.current_regime ? regimeLabel(ta.current_regime) : 'N/A', cls: ta?.current_regime ? regimeBadgeCls(ta.current_regime) : '' },
              { label: 'Total return', value: pct(pp?.target?.total_return), cls: colorPct(pp?.target?.total_return) },
              { label: 'Max drawdown', value: pct(pp?.target?.max_drawdown), cls: 'text-red-500' },
            ].map(({ label, value, cls }) => (
              <div key={label} className="rounded-2xl border border-border/60 bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`mt-1 text-lg font-semibold ${cls ?? 'text-foreground'}`}>{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── 2. KPI strip ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {[
          { label: 'Total return', value: deltaPct(pp?.target?.total_return), pos: (pp?.target?.total_return ?? 0) > 0 },
          { label: 'vs Benchmark', value: deltaPct(pp?.relative?.outperformance), pos: (pp?.relative?.outperformance ?? 0) > 0 },
          { label: '12m momentum', value: deltaPct(ta?.momentum?.['12m']), pos: (ta?.momentum?.['12m'] ?? 0) > 0 },
          { label: 'Ann. volatility', value: pct(pp?.target?.annualized_volatility), pos: null },
          { label: 'Max drawdown', value: pct(pp?.target?.max_drawdown), pos: false },
          { label: 'Ann. return', value: deltaPct(pp?.target?.annualized_return), pos: (pp?.target?.annualized_return ?? 0) > 0 },
        ].map(({ label, value, pos }) => (
          <div key={label} className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`mt-1 text-xl font-semibold ${pos === null ? 'text-foreground' : pos ? 'text-emerald-500' : 'text-red-500'}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* ── 3. Executive guide (conditional) ──────────────────────────────── */}
      {eg?.stock_story && (
        <Card className="rounded-2xl border border-sky-500/30 bg-sky-500/5 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-sky-500/15 text-sky-600 border-sky-500/30">Guide</Badge>
              <span className="text-xs text-muted-foreground">AI-generated orientation — read before exploring the chart</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{eg.stock_story}</p>
            {eg.key_drivers && eg.key_drivers.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Key drivers</p>
                <div className="space-y-2">
                  {eg.key_drivers.map((d, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-600">
                        {i + 1}
                      </span>
                      <div>
                        <span className="text-sm font-semibold text-foreground">{d.name}</span>
                        <span className="text-sm text-muted-foreground"> — {d.plain_summary}</span>
                      </div>
                    </div>
                  ))}
                </div>
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
      )}

      {/* ── 4. Interactive price chart ─────────────────────────────────────── */}
      <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CandlestickChart className="h-4 w-4 text-sky-600" />
              Price Chart — {rm?.ticker}
              <span className="text-xs font-normal text-muted-foreground ml-1">
                · Click a coloured band or event line to open attribution
              </span>
            </CardTitle>
            <div className="flex gap-2">
              {(['ma50', 'ma200'] as const).map((ma) => (
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
            </div>
          </div>
          {/* Regime legend */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
            {[['bull_trend', 'Bull'], ['bear_trend', 'Bear'], ['consolidation', 'Consolidation']].map(([r, label]) => (
              <span key={r} className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: regimeFill(r), opacity: 0.55 }} />
                {label}
              </span>
            ))}
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-amber-400" />
              Event
            </span>
          </div>
        </CardHeader>
        <CardContent className="h-[420px] pl-0">
          {priceSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={priceSeries}
                margin={{ top: 8, right: 32, left: 8, bottom: 8 }}
                onClick={(state: { activeLabel?: string } | null) => {
                  if (!state?.activeLabel) return;
                  const clickedDate = state.activeLabel;
                  // Check if click is on an event
                  const evIdx = se.findIndex((e) => e.date === clickedDate);
                  if (evIdx >= 0) { handleEventClick(evIdx); return; }
                  // Otherwise find containing period
                  const pIdx = periods.findIndex((p) => clickedDate >= p.start_date && clickedDate <= p.end_date);
                  if (pIdx >= 0) handlePeriodClick(pIdx);
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.25} />
                <XAxis
                  dataKey="date"
                  interval={Math.floor(priceSeries.length / 7)}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v: string) => v?.slice(0, 7)}
                />
                <YAxis
                  yAxisId="price"
                  orientation="left"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v: number) => v.toFixed(0)}
                  width={42}
                />
                <YAxis
                  yAxisId="norm"
                  orientation="right"
                  domain={[40, 220]}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v: number) => `${v}`}
                  width={36}
                />
                <Tooltip content={<PriceTooltip />} />

                {/* Trend period background bands — snap to dates that exist in the series */}
                {periods.map((p, i) => {
                  const x1 = seriesDates.has(p.start_date)
                    ? p.start_date
                    : priceSeries.find((pt) => pt.date >= p.start_date)?.date;
                  const x2 = seriesDates.has(p.end_date)
                    ? p.end_date
                    : [...priceSeries].reverse().find((pt) => pt.date <= p.end_date)?.date;
                  if (!x1 || !x2) return null;
                  return (
                    <ReferenceArea
                      key={`band-${i}`}
                      yAxisId="price"
                      x1={x1}
                      x2={x2}
                      fill={regimeFill(p.regime)}
                      fillOpacity={selectedPeriodIdx === i ? 0.30 : 0.12}
                      strokeOpacity={0}
                    />
                  );
                })}

                {/* Event marker lines — only render for dates in the series */}
                {se.map((ev, i) => {
                  if (!seriesDates.has(ev.date)) return null;
                  return (
                    <ReferenceLine
                      key={`ev-${i}`}
                      yAxisId="price"
                      x={ev.date}
                      stroke="#f59e0b"
                      strokeDasharray="3 5"
                      strokeWidth={selectedEventIdx === i ? 2.5 : 1.5}
                      opacity={selectedEventIdx === i ? 1 : 0.45}
                    />
                  );
                })}

                {/* Price line */}
                <Line
                  yAxisId="price"
                  dataKey="close"
                  name="Price"
                  stroke="#3b82f6"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                {showMA.ma50 && (
                  <Line
                    yAxisId="price"
                    dataKey="ma50"
                    name="MA50"
                    stroke="#10b981"
                    dot={false}
                    strokeWidth={1}
                    strokeDasharray="5 3"
                    isAnimationActive={false}
                    connectNulls
                  />
                )}
                {showMA.ma200 && (
                  <Line
                    yAxisId="price"
                    dataKey="ma200"
                    name="MA200"
                    stroke="#f59e0b"
                    dot={false}
                    strokeWidth={1}
                    strokeDasharray="5 3"
                    isAnimationActive={false}
                    connectNulls
                  />
                )}
                {/* Normalized relative line */}
                <Line
                  yAxisId="norm"
                  dataKey="normalized"
                  name="Normalized"
                  stroke="#6366f1"
                  dot={false}
                  strokeWidth={1}
                  opacity={0.5}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No price series data available.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 5. Detail panel (period + event attribution) ───────────────────── */}
      <div
        ref={detailPanelRef}
        className={`transition-all duration-300 overflow-hidden ${selectedPeriodIdx !== null ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        {selectedPeriod && (
          <Card className="rounded-2xl border border-sky-500/30 bg-sky-500/5 shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={regimeBadgeCls(selectedPeriod.regime)}>
                    {regimeLabel(selectedPeriod.regime)}
                  </Badge>
                  <span className="text-sm font-semibold text-foreground">
                    {fmtDate(selectedPeriod.start_date)} → {fmtDate(selectedPeriod.end_date)}
                  </span>
                  <span className={`text-sm font-semibold ${colorPct(selectedPeriod.period_return)}`}>
                    {deltaPct(selectedPeriod.period_return)}
                  </span>
                  {selectedPeriod.period_abnormal_return !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      {deltaPct(selectedPeriod.period_abnormal_return)} abnormal
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">{selectedPeriod.trading_days}d</span>
                  {selectedPeriod.is_latest_period && (
                    <Badge variant="outline" className="text-xs">Current period</Badge>
                  )}
                </div>
                <button onClick={closeDetail} className="rounded-full p-1 hover:bg-muted transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              {/* Tabs */}
              {selectedEvent && (
                <div className="flex gap-1 mt-2">
                  {(['period', 'event'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setDetailTab(tab)}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                        detailTab === tab
                          ? 'bg-sky-500/20 text-sky-700 dark:text-sky-400'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {tab === 'period' ? 'Period overview' : 'Event attribution'}
                    </button>
                  ))}
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-4 pt-0">
              {/* Period tab */}
              {detailTab === 'period' && (
                <div className="space-y-4">
                  {selectedPeriod.period_summary && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{selectedPeriod.period_summary}</p>
                  )}
                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-sm">
                    {[
                      { label: 'Return', value: deltaPct(selectedPeriod.period_return) },
                      { label: 'vs Benchmark', value: selectedPeriod.benchmark_return !== undefined ? deltaPct((selectedPeriod.period_return ?? 0) - selectedPeriod.benchmark_return) : 'N/A' },
                      { label: 'Ann. Vol', value: pct(selectedPeriod.annualized_volatility) },
                      { label: 'Events', value: String(periodEvents.length) },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-xl border border-border/50 bg-background/60 p-3">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="font-semibold text-foreground">{value}</p>
                      </div>
                    ))}
                  </div>
                  {/* Events in this period */}
                  {periodEvents.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Significant events in this period — click to see attribution
                      </p>
                      <div className="space-y-1.5">
                        {periodEvents.map(({ ev, i }) => (
                          <button
                            key={i}
                            onClick={() => handleEventClick(i)}
                            className={`w-full text-left rounded-xl border px-3 py-2 text-xs transition-colors hover:border-sky-500/40 hover:bg-sky-500/5 ${
                              selectedEventIdx === i
                                ? 'border-sky-500/50 bg-sky-500/10'
                                : 'border-border/50 bg-background/60'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-muted-foreground">{fmtDate(ev.date)}</span>
                                {ev.anchor_title && (
                                  <span className="text-foreground font-medium">{ev.anchor_title}</span>
                                )}
                                <span className={`font-semibold ${colorPct(ev.return_1d)}`}>
                                  {deltaPct(ev.return_1d)}
                                </span>
                              </div>
                              {ev.attribution?.confidence !== undefined && (
                                <Badge className={`${confidenceCls(ev.attribution.confidence)} text-[10px]`}>
                                  {pct(ev.attribution.confidence, 0)} conf.
                                </Badge>
                              )}
                            </div>
                            {ev.attribution?.most_probable_reason && (
                              <p className="mt-1 text-muted-foreground line-clamp-1">
                                {ev.attribution.most_probable_reason}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Event attribution tab */}
              {detailTab === 'event' && selectedEvent && (
                <div className="space-y-4">
                  {/* Reason + interpretation */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground leading-relaxed flex-1">
                        {selectedEvent.attribution?.most_probable_reason ?? 'No attribution available.'}
                      </p>
                      {selectedEvent.attribution?.confidence !== undefined && (
                        <Badge className={`${confidenceCls(selectedEvent.attribution.confidence)} flex-shrink-0`}>
                          {pct(selectedEvent.attribution.confidence, 0)} confidence
                        </Badge>
                      )}
                    </div>
                    {selectedEvent.attribution?.investor_interpretation && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {selectedEvent.attribution.investor_interpretation}
                      </p>
                    )}
                  </div>

                  {/* Event metadata */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-sm">
                    {[
                      { label: 'Date', value: fmtDate(selectedEvent.date) },
                      { label: '1D return', value: deltaPct(selectedEvent.return_1d) },
                      { label: 'Abnormal', value: deltaPct(selectedEvent.abnormal_return_1d) },
                      { label: 'Z-score', value: fmtNum(selectedEvent.z_score_60d) },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-xl border border-border/50 bg-background/60 p-3">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="font-semibold text-foreground">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Driver breakdown */}
                  {selectedEvent.attribution?.driver_breakdown?.length ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Driver breakdown</p>
                      <div className="space-y-2">
                        {selectedEvent.attribution.driver_breakdown.map((d, i) => (
                          <div key={i} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-foreground font-medium flex-1 mr-2">{d.driver}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={`text-[10px] ${
                                  d.direction === 'positive' ? 'text-emerald-600 border-emerald-500/30' :
                                  d.direction === 'negative' ? 'text-red-500 border-red-500/30' :
                                  'text-muted-foreground'
                                }`}>
                                  {d.direction}
                                </Badge>
                                <span className="font-mono text-muted-foreground w-8 text-right">{pct(d.weight, 0)}</span>
                              </div>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, (d.weight ?? 0) * 100)}%`,
                                  background: d.direction === 'positive' ? '#22c55e' : d.direction === 'negative' ? '#ef4444' : '#94a3b8',
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* What to monitor */}
                  {selectedEvent.attribution?.what_to_monitor_next?.length ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What to monitor next</p>
                      <ul className="space-y-1">
                        {selectedEvent.attribution.what_to_monitor_next.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <ChevronRight className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-sky-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {/* Counter-hypotheses collapsible */}
                  {selectedEvent.attribution?.counter_hypotheses?.length ? (
                    <div className="rounded-xl border border-border/50 bg-background/60 overflow-hidden">
                      <button
                        onClick={() => setExpandedCounterHypo(!expandedCounterHypo)}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span>Counter-hypotheses ({selectedEvent.attribution.counter_hypotheses.length})</span>
                        {expandedCounterHypo ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                      {expandedCounterHypo && (
                        <div className="px-3 pb-3 space-y-1.5 border-t border-border/40">
                          {selectedEvent.attribution.counter_hypotheses.map((h, i) => (
                            <p key={i} className="text-xs text-muted-foreground pt-1.5">{h}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Evidence collapsible */}
                  {selectedEvent.attribution?.evidence?.length ? (
                    <div className="rounded-xl border border-border/50 bg-background/60 overflow-hidden">
                      <button
                        onClick={() => setExpandedEvidence(!expandedEvidence)}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5" />
                          Evidence ({selectedEvent.attribution.evidence.length} sources
                          {selectedEvent.attribution.search_results_count
                            ? ` from ${selectedEvent.attribution.search_results_count} results`
                            : ''})
                        </span>
                        {expandedEvidence ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                      {expandedEvidence && (
                        <div className="px-3 pb-3 space-y-2 border-t border-border/40 pt-2">
                          {selectedEvent.attribution.evidence.map((ev, i) => (
                            <div key={i} className="rounded-lg border border-border/40 bg-background/80 p-2.5">
                              <a
                                href={ev.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-medium text-sky-600 hover:underline line-clamp-1"
                              >
                                {ev.title}
                              </a>
                              {ev.snippet && (
                                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{ev.snippet}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Research queries collapsible */}
                  {selectedEvent.attribution?.queries?.length ? (
                    <div className="rounded-xl border border-border/50 bg-background/60 overflow-hidden">
                      <button
                        onClick={() => setExpandedQueries(!expandedQueries)}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span>Research queries ({selectedEvent.attribution.queries.length})</span>
                        {expandedQueries ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                      {expandedQueries && (
                        <div className="px-3 pb-3 space-y-1.5 border-t border-border/40 pt-2">
                          {selectedEvent.attribution.queries.map((q, i) => (
                            <div key={i} className="text-xs">
                              <span className="text-muted-foreground mr-1">R{q.round ?? i + 1}:</span>
                              <span className="text-foreground">{q.query}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── 6. Driver map ──────────────────────────────────────────────────── */}
      {dm?.driver_themes && dm.driver_themes.length > 0 && (
        <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-sky-600" />
              Driver Map
              <span className="text-xs font-normal text-muted-foreground ml-1">
                · {dm.events_analyzed} events analyzed
              </span>
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
                  <XAxis
                    type="number"
                    domain={[0, 0.35]}
                    tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="shortName"
                    width={230}
                    tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
                  />
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any, _name: any, props: any) => [
                      `${(Number(v) * 100).toFixed(1)}%`,
                      props?.payload?.fullName ?? 'Importance',
                    ]}
                  />
                  <Bar dataKey="importance_score" radius={[0, 4, 4, 0]}>
                    {driverChartData.map((entry, i) => (
                      <Cell key={i} fill={themeTypeFill(entry.theme_type)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Theme detail cards */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {dm.driver_themes.map((t, i) => (
                <div key={i} className="rounded-xl border border-border/50 bg-background/60 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground leading-snug">{t.theme}</p>
                    <div className="flex gap-1 flex-shrink-0">
                      <Badge className={`${themeTypeBadgeCls(t.theme_type)} text-[10px]`}>
                        {t.theme_type}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {pct(t.importance_score, 0)}
                      </Badge>
                    </div>
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground leading-relaxed">{t.description}</p>}
                  {t.forward_looking && (
                    <p className="text-xs text-sky-600 dark:text-sky-400 leading-relaxed">
                      <span className="font-semibold">Forward: </span>{t.forward_looking}
                    </p>
                  )}
                  {t.monitoring_signals?.length ? (
                    <div className="flex flex-wrap gap-1">
                      {t.monitoring_signals.slice(0, 3).map((s, si) => (
                        <span key={si} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{s}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            {/* Dominant narrative */}
            {dm.dominant_narrative && (
              <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Dominant narrative</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{dm.dominant_narrative}</p>
              </div>
            )}

            {/* Regime driver map */}
            {dm.regime_driver_map && Object.keys(dm.regime_driver_map).length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Object.entries(dm.regime_driver_map).map(([regime, drivers]) => (
                  <div key={regime} className="rounded-xl border border-border/50 bg-background/60 p-3">
                    <Badge className={`${regimeBadgeCls(regime)} mb-2 text-[10px]`}>{regimeLabel(regime)}</Badge>
                    <ul className="space-y-1">
                      {(drivers as string[]).slice(0, 4).map((d, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0 text-muted-foreground" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Theme interactions */}
            {dm.theme_interactions?.length ? (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Theme interactions</p>
                {dm.theme_interactions.map((t, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{t}</p>
                ))}
              </div>
            ) : null}

            {/* Monitoring priorities */}
            {monitoringSignals.length > 0 && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" /> Monitoring priorities
                </p>
                <ul className="space-y-1">
                  {monitoringSignals.map((s, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0 text-amber-500" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── 7. Trend periods table ─────────────────────────────────────────── */}
      <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingDown className="h-4 w-4 text-sky-600" />
            All Trend Periods
            <span className="text-xs font-normal text-muted-foreground ml-1">· click any row to open attribution</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  {['#', 'Start', 'End', 'Regime', 'Return', 'vs BM', 'Abnormal', 'Days', 'Events'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((p, i) => (
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
                      <Badge className={`${regimeBadgeCls(p.regime)} text-[10px]`}>
                        {regimeLabel(p.regime)}
                      </Badge>
                      {p.is_latest_period && <span className="ml-1 text-muted-foreground">(current)</span>}
                    </td>
                    <td className={`px-3 py-2 font-semibold ${colorPct(p.period_return)}`}>
                      {deltaPct(p.period_return)}
                    </td>
                    <td className={`px-3 py-2 ${colorPct(p.benchmark_return)}`}>
                      {p.benchmark_return !== undefined ? deltaPct(p.benchmark_return) : '—'}
                    </td>
                    <td className={`px-3 py-2 ${colorPct(p.period_abnormal_return)}`}>
                      {p.period_abnormal_return !== undefined ? deltaPct(p.period_abnormal_return) : '—'}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{p.trading_days}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.event_count ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── 8. Peer comparison ────────────────────────────────────────────── */}
      {pc?.peers && pc.peers.length > 0 && (
        <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-sky-600" />
              Peer Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    {['Ticker', 'Name', 'Total Return', 'Ann. Return', 'Ann. Vol', 'Max DD', 'Correlation'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Target row first */}
                  <tr className="border-b border-border/30 bg-sky-500/8 font-semibold">
                    <td className="px-3 py-2 font-mono text-sky-600">{rm?.ticker}</td>
                    <td className="px-3 py-2">{cp?.name ?? rm?.company}</td>
                    <td className={`px-3 py-2 ${colorPct(pp?.target?.total_return)}`}>{deltaPct(pp?.target?.total_return)}</td>
                    <td className={`px-3 py-2 ${colorPct(pp?.target?.annualized_return)}`}>{deltaPct(pp?.target?.annualized_return)}</td>
                    <td className="px-3 py-2 text-foreground">{pct(pp?.target?.annualized_volatility)}</td>
                    <td className="px-3 py-2 text-red-500">{pct(pp?.target?.max_drawdown)}</td>
                    <td className="px-3 py-2 text-muted-foreground">—</td>
                  </tr>
                  {pc.peers.map((peer) => (
                    <tr key={peer.ticker} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2 font-mono text-muted-foreground">{peer.ticker}</td>
                      <td className="px-3 py-2">{peer.name ?? peer.ticker}</td>
                      <td className={`px-3 py-2 ${colorPct(peer.total_return)}`}>{deltaPct(peer.total_return)}</td>
                      <td className={`px-3 py-2 ${colorPct(peer.annualized_return)}`}>{deltaPct(peer.annualized_return)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{pct(peer.annualized_volatility)}</td>
                      <td className="px-3 py-2 text-red-500">{pct(peer.max_drawdown)}</td>
                      <td className="px-3 py-2">
                        {peer.correlation_to_target !== undefined && peer.correlation_to_target !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-sky-500"
                                style={{ width: `${((peer.correlation_to_target + 1) / 2) * 100}%` }}
                              />
                            </div>
                            <span className="text-muted-foreground font-mono">{peer.correlation_to_target.toFixed(2)}</span>
                          </div>
                        ) : '—'}
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
        <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Earnings Reaction Pattern</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Events analyzed', value: String(pc.earnings_reaction.events_considered ?? 'N/A') },
              { label: 'Avg Day-0 return', value: deltaPct(pc.earnings_reaction.avg_return_day0) },
              { label: 'Avg abnormal Day-0', value: deltaPct(pc.earnings_reaction.avg_abnormal_day0) },
              { label: 'Window −3/+3 return', value: deltaPct(pc.earnings_reaction.avg_return_m3_p3) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
