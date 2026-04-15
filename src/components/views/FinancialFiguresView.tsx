/**
 * FinancialFiguresView — visualizes the Annual Report Reader analysis JSON
 * (schema_version: financial_dashboard_v1).
 *
 * This view is the OPERATIONAL counterpart to FinancialAnalysisView:
 *  - Annual-report-grounded multi-year story
 *  - AR vs Yahoo Finance bridge (provenance / data quality)
 *  - Segment decomposition with reconciling items
 *  - Forward-looking target tracking grouped by horizon
 *
 * Layout: Header verdict + KPI strip, then 4 tabs.
 */
import { useMemo, useState } from 'react';
import { useForesight } from '@/contexts/ForesightContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Layers,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────
// Loose types to match our JSON (financial_dashboard_v1 schema produced
// by Annual_report_Reader/analysis/runner.py)
// ─────────────────────────────────────────────────────────────────────────

interface AnalysisJson {
  schema_version: string;
  generated_at_utc?: string;
  run_meta?: {
    company?: string;
    ticker?: string;
    focus_year?: number;
  };
  company_profile?: {
    name?: string;
    ticker?: string;
    currency?: string;
    primary_profit_metric?: string;
  };
  market_snapshot?: {
    market_cap?: number;
    shares_outstanding?: number;
    source?: string;
  };
  executive_summary?: string;
  kpis?: Array<{
    key?: string;
    label?: string;
    value?: number | null;
    display_value?: string;
    unit?: string;
    prior_year?: number | null;
    yoy_change_pct?: number | null;
    trend?: string;
    source?: string;
  }>;
  financial_charts?: {
    years?: number[];
    revenue_m?: Array<number | null>;
    ebita_m?: Array<number | null>;
    ebitda_m?: Array<number | null>;
    net_profit_m?: Array<number | null>;
    fcf_m?: Array<number | null>;
    net_debt_m?: Array<number | null>;
    working_capital_m?: Array<number | null>;
    capex_m?: Array<number | null>;
    ebita_margin_pct?: Array<number | null>;
  };
  historical_table?: {
    years?: string[];
    rows?: Array<{
      metric: string;
      values: Record<string, number | null>;
      source?: string;
    }>;
  };
  ratio_cards?: {
    revenue_growth?: { yoy?: Record<string, number>; cagr_3y?: number; cagr_5y?: number };
    profitability?: { ebita_margin_computed?: Record<string, number>; ebitda_margin_computed?: Record<string, number> };
    cash_efficiency?: { fcf_conversion_ebita?: Record<string, number>; fcf_conversion_ebitda?: Record<string, number> };
    leverage?: { computed?: Record<string, number> };
  };
  ar_vs_yf_bridge?: Array<{
    concept: string;
    ar_metric?: string | null;
    ar_value?: number | null;
    ar_unit?: string;
    yf_metric?: string | null;
    yf_label?: string;
    yf_value?: number | null;
    comparability?: string;
    gap_pct?: number | null;
    definition_from_ar?: string;
    bridge_explanation?: string;
    review_confidence?: string;
  }>;
  analysis_sections?: Array<{
    title: string;
    narrative?: string;
    flags?: string[];
    data_tables?: Array<{ name: string; rows?: any[]; data?: any }>;
  }>;
  segment_analysis?: Array<{
    segment: string;
    is_reconciling_item?: boolean;
    revenue?: number | null;
    revenue_yoy?: number | null;
    revenue_mix_pct?: number | null;
    ebita?: number | null;
    ebita_margin?: number | null;
    ebita_mix_pct?: number | null;
    organic_growth?: number | null;
  }>;
  guidance_tracking?: Array<{
    target_period?: string;
    metric?: string;
    segment?: string;
    target_display?: string;
    is_qualitative?: boolean;
    actual_value?: number | null;
    status?: string;
    guidance_text?: string;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────────────────

const fmtMn = (v?: number | null, currency = 'EUR') => {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  if (Math.abs(v) >= 1000) return `${currency} ${(v / 1000).toFixed(2)}B`;
  return `${currency} ${v.toFixed(0)}M`;
};

const fmtPct = (v?: number | null, digits = 1) => {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(digits)}%`;
};

const fmtRatio = (v?: number | null) => {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `${v.toFixed(1)}x`;
};

const fmtNum = (v?: number | null, digits = 1) => {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return v.toFixed(digits);
};

const fmtCompactCurrency = (v?: number | null, currency = 'EUR') => {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  // YF values are in native units (e.g. 3,090,800,000) — convert to mn
  const inMn = Math.abs(v) > 1_000_000 ? v / 1_000_000 : v;
  return fmtMn(inMn, currency);
};

// ─────────────────────────────────────────────────────────────────────────
// Verdict computation: synthesize a quick "good/mixed/bad" from KPI signals
// ─────────────────────────────────────────────────────────────────────────

type Verdict = 'strong' | 'mixed' | 'weak';

const computeVerdict = (kpis: AnalysisJson['kpis'] = []): { verdict: Verdict; reasons: string[] } => {
  let positive = 0;
  let negative = 0;
  const reasons: string[] = [];
  for (const k of kpis) {
    if (k?.yoy_change_pct == null) continue;
    if (k.trend === 'up' || k.yoy_change_pct > 1) positive += 1;
    else if (k.trend === 'down' || k.yoy_change_pct < -1) {
      negative += 1;
      reasons.push(`${k.label}: ${fmtPct(k.yoy_change_pct)}`);
    }
  }
  let verdict: Verdict = 'mixed';
  if (negative >= 3 && negative > positive * 2) verdict = 'weak';
  else if (positive >= 3 && negative <= 1) verdict = 'strong';
  return { verdict, reasons: reasons.slice(0, 3) };
};

const verdictTone = (v: Verdict) => {
  if (v === 'strong') return { label: 'Strong year', color: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' };
  if (v === 'weak') return { label: 'Difficult year', color: 'bg-red-500/15 text-red-700 border-red-500/30' };
  return { label: 'Mixed year', color: 'bg-amber-500/15 text-amber-700 border-amber-500/30' };
};

// ─────────────────────────────────────────────────────────────────────────
// Comparability badge
// ─────────────────────────────────────────────────────────────────────────

const compTone = (status?: string) => {
  switch ((status || '').toLowerCase()) {
    case 'aligned':
      return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
    case 'minor_gap':
      return 'bg-sky-500/15 text-sky-700 border-sky-500/30';
    case 'material_gap':
      return 'bg-red-500/15 text-red-700 border-red-500/30';
    case 'yf_only':
      return 'bg-amber-500/15 text-amber-700 border-amber-500/30';
    default:
      return 'bg-slate-500/15 text-slate-600 border-slate-500/30';
  }
};

// ─────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  yoy?: number | null;
  trend?: string;
  series?: Array<number | null>;
  years?: number[];
  unit?: string;
}

function Sparkline({ data }: { data: Array<number | null> }) {
  const points = data
    .map((v, i) => ({ i, v: v ?? null }))
    .filter((d) => d.v !== null) as Array<{ i: number; v: number }>;
  if (points.length < 2) return <div className="h-[28px]" />;
  return (
    <ResponsiveContainer width="100%" height={28}>
      <LineChart data={points}>
        <Line type="monotone" dataKey="v" stroke="currentColor" strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function KpiCard({ label, value, yoy, trend, series }: KpiCardProps) {
  const positive = (yoy ?? 0) > 0;
  const negative = (yoy ?? 0) < 0;
  const colorClass = positive ? 'text-emerald-600' : negative ? 'text-red-600' : 'text-muted-foreground';
  return (
    <Card className="rounded-2xl border-border/50 bg-card/70 shadow-sm">
      <CardContent className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{value}</p>
        <div className="mt-1 flex items-center justify-between">
          {yoy != null ? (
            <span className={cn('flex items-center gap-1 text-xs font-medium tabular-nums', colorClass)}>
              {positive ? <ArrowUp className="h-3 w-3" /> : negative ? <ArrowDown className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
              {fmtPct(yoy)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">YoY n/a</span>
          )}
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{trend ?? ''}</span>
        </div>
        {series && series.length > 0 && (
          <div className={cn('mt-2', colorClass)}>
            <Sparkline data={series} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FlagPill({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
      <AlertTriangle className="h-3 w-3" />
      {text}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Performance tab — 4 charts + bridge waterfall
// ─────────────────────────────────────────────────────────────────────────

function PerformanceTab({ data }: { data: AnalysisJson }) {
  const charts = data.financial_charts ?? {};
  const years = charts.years ?? [];

  // Build chart datasets
  const buildSeries = (...metricArrays: Array<{ key: string; values?: Array<number | null> }>) =>
    years.map((yr, i) => {
      const row: Record<string, any> = { year: String(yr) };
      for (const m of metricArrays) {
        const v = m.values?.[i];
        row[m.key] = v == null ? null : v;
      }
      return row;
    });

  const revEbitaSeries = buildSeries(
    { key: 'revenue', values: charts.revenue_m },
    { key: 'ebita', values: charts.ebita_m },
  );
  const marginSeries = buildSeries({ key: 'margin', values: charts.ebita_margin_pct });
  const fcfSeries = buildSeries(
    { key: 'fcf', values: charts.fcf_m },
    { key: 'capex', values: charts.capex_m },
  );
  const debtSeries = buildSeries({ key: 'net_debt', values: charts.net_debt_m });

  // Compute leverage (net debt / EBITDA) for the line overlay
  const leverageData = years.map((yr, i) => {
    const nd = charts.net_debt_m?.[i];
    const ebitda = charts.ebitda_m?.[i];
    const lev = nd != null && ebitda != null && ebitda !== 0 ? nd / ebitda : null;
    return { year: String(yr), net_debt: nd ?? null, leverage: lev };
  });

  const tooltipStyle = {
    background: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: '12px',
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Revenue + EBITA dual-axis */}
      <Card className="rounded-2xl border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Revenue & EBITA</CardTitle>
          <p className="text-xs text-muted-foreground">Multi-year trajectory in EUR millions</p>
        </CardHeader>
        <CardContent className="pt-2">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={revEbitaSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="revenue" fill="#10b981" opacity={0.6} name="Revenue (mn)" />
              <Line yAxisId="right" type="monotone" dataKey="ebita" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 3 }} name="EBITA (mn)" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* EBITA margin with target band */}
      <Card className="rounded-2xl border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">EBITA Margin</CardTitle>
          <p className="text-xs text-muted-foreground">Reported margin vs FY2026 target band (16-18%)</p>
        </CardHeader>
        <CardContent className="pt-2">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={marginSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} unit="%" stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => (v == null ? '—' : `${Number(v).toFixed(1)}%`)} />
              <ReferenceArea y1={16} y2={18} fill="#10b981" fillOpacity={0.08} />
              <ReferenceLine y={16} stroke="#10b981" strokeDasharray="3 3" />
              <ReferenceLine y={18} stroke="#10b981" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="margin" stroke="#0f766e" strokeWidth={2.5} dot={{ r: 3 }} name="EBITA margin %" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* FCF + CapEx */}
      <Card className="rounded-2xl border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Free Cash Flow & CapEx</CardTitle>
          <p className="text-xs text-muted-foreground">Cash generation vs investment</p>
        </CardHeader>
        <CardContent className="pt-2">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={fcfSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="fcf" fill="#10b981" opacity={0.7} name="Free Cash Flow (mn)" />
              <Bar dataKey="capex" fill="#94a3b8" opacity={0.7} name="CapEx (mn)" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Net Debt + Leverage */}
      <Card className="rounded-2xl border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Net Debt & Leverage</CardTitle>
          <p className="text-xs text-muted-foreground">Absolute net debt with computed Net Debt/EBITDA ratio</p>
        </CardHeader>
        <CardContent className="pt-2">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={leverageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine yAxisId="right" y={2} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '2.0x cap', position: 'right', fill: '#f59e0b', fontSize: 10 }} />
              <Bar yAxisId="left" dataKey="net_debt" fill="#dc2626" opacity={0.6} name="Net Debt (mn)" />
              <Line yAxisId="right" type="monotone" dataKey="leverage" stroke="#7c2d12" strokeWidth={2.5} dot={{ r: 3 }} name="Leverage (x)" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Section narratives */}
      <div className="lg:col-span-2 grid gap-3">
        {data.analysis_sections
          ?.filter((s) => ['Performance Overview', 'Margins and Costs', 'Cash Flow and Capital Allocation', 'Balance Sheet and Leverage'].includes(s.title))
          .map((section) => (
            <SectionNarrative key={section.title} section={section} />
          ))}
      </div>
    </div>
  );
}

function SectionNarrative({ section }: { section: AnalysisJson['analysis_sections'] extends Array<infer T> ? T : never }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="rounded-2xl border-border/50 bg-card/40">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 p-4 text-left"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <span className="text-sm font-semibold">{section.title}</span>
            {(section.flags?.length ?? 0) > 0 && (
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-700 bg-amber-500/10">
                {section.flags!.length} flag{section.flags!.length === 1 ? '' : 's'}
              </Badge>
            )}
          </div>
          {!open && (section.flags?.length ?? 0) > 0 && (
            <div className="mt-2 ml-6 space-y-1">
              {section.flags!.slice(0, 2).map((f, i) => (
                <p key={i} className="text-[11px] text-amber-700">⚠ {f}</p>
              ))}
            </div>
          )}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 pl-10 space-y-2">
          {(section.flags?.length ?? 0) > 0 && (
            <div className="space-y-1">
              {section.flags!.map((f, i) => (
                <p key={i} className="text-xs text-amber-700">⚠ {f}</p>
              ))}
            </div>
          )}
          {section.narrative && (
            <p className="text-sm leading-relaxed text-foreground/90">{section.narrative}</p>
          )}
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Segments tab
// ─────────────────────────────────────────────────────────────────────────

function SegmentsTab({ data }: { data: AnalysisJson }) {
  const segments = (data.segment_analysis ?? []).filter(Boolean);
  if (segments.length === 0) {
    return <p className="text-sm text-muted-foreground">No segment data available.</p>;
  }

  const totalRev = segments.filter((s) => !s.is_reconciling_item).reduce((a, s) => a + (s.revenue ?? 0), 0);

  // Bar data for revenue mix and EBITA mix
  const revMixData = segments.map((s) => ({
    segment: s.segment,
    mix: s.revenue_mix_pct ?? 0,
    is_reconciling: s.is_reconciling_item,
  }));
  const ebitaMixData = segments.map((s) => ({
    segment: s.segment,
    mix: s.ebita_mix_pct ?? 0,
    is_reconciling: s.is_reconciling_item,
  }));

  return (
    <div className="space-y-4">
      {/* Segment cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {segments.map((s) => {
          const isRecon = s.is_reconciling_item;
          const rev = s.revenue ?? 0;
          const ebita = s.ebita ?? 0;
          const margin = s.ebita_margin;
          const yoy = s.revenue_yoy;
          return (
            <Card
              key={s.segment}
              className={cn(
                'rounded-2xl border-border/50',
                isRecon && 'border-dashed border-slate-300 bg-slate-50/50',
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
                    {s.segment}
                  </span>
                  {isRecon && (
                    <Badge variant="outline" className="text-[10px] border-slate-400/30 text-slate-500">
                      Reconciling
                    </Badge>
                  )}
                </div>
                <div className="mt-3 space-y-2">
                  <div>
                    <p className="text-[11px] uppercase text-muted-foreground">Revenue</p>
                    <p className="text-xl font-semibold tabular-nums">{fmtMn(rev)}</p>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-muted-foreground">{fmtPct(s.revenue_mix_pct)} of group</span>
                      {yoy != null && (
                        <span className={cn('font-medium', yoy > 0 ? 'text-emerald-600' : 'text-red-600')}>
                          {fmtPct(yoy)} YoY
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-border/50 pt-2">
                    <p className="text-[11px] uppercase text-muted-foreground">EBITA</p>
                    <p className="text-xl font-semibold tabular-nums">{fmtMn(ebita)}</p>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-muted-foreground">{fmtPct(s.ebita_mix_pct)} of group</span>
                      {margin != null && (
                        <Badge variant="outline" className="text-[10px]">
                          margin {margin.toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  {s.organic_growth != null && (
                    <div className="border-t border-border/50 pt-2">
                      <p className="text-[11px] uppercase text-muted-foreground">Organic growth</p>
                      <p
                        className={cn(
                          'text-base font-semibold tabular-nums',
                          s.organic_growth > 0 ? 'text-emerald-600' : 'text-red-600',
                        )}
                      >
                        {fmtPct(s.organic_growth)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Mix bars side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Revenue mix</CardTitle>
            <p className="text-xs text-muted-foreground">% of group revenue (incl. reconciling items)</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revMixData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis type="number" tick={{ fontSize: 11 }} unit="%" stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="segment" tick={{ fontSize: 11 }} width={120} stroke="hsl(var(--muted-foreground))" />
                <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="mix" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">EBITA mix</CardTitle>
            <p className="text-xs text-muted-foreground">% of group EBITA (sum incl. reconciling = 100%)</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ebitaMixData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis type="number" tick={{ fontSize: 11 }} unit="%" stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="segment" tick={{ fontSize: 11 }} width={120} stroke="hsl(var(--muted-foreground))" />
                <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="mix" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Segment section narrative */}
      {data.analysis_sections
        ?.filter((s) => s.title === 'Segment Analysis')
        .map((s) => <SectionNarrative key={s.title} section={s} />)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Targets tab — grouped by horizon
// ─────────────────────────────────────────────────────────────────────────

const targetStatusTone = (status?: string) => {
  switch ((status || '').toLowerCase()) {
    case 'on_track':
    case 'within_range':
    case 'ahead':
    case 'above_range':
      return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
    case 'behind':
    case 'below_range':
      return 'bg-red-500/15 text-red-700 border-red-500/30';
    case 'pending':
      return 'bg-slate-500/15 text-slate-600 border-slate-500/30';
    default:
      return 'bg-slate-500/15 text-slate-600 border-slate-500/30';
  }
};

function TargetsTab({ data }: { data: AnalysisJson }) {
  const targets = data.guidance_tracking ?? [];

  // Group by horizon (target_period)
  const grouped = useMemo(() => {
    const groups = new Map<string, typeof targets>();
    for (const t of targets) {
      const horizon = t.target_period || 'Unknown';
      if (!groups.has(horizon)) groups.set(horizon, []);
      groups.get(horizon)!.push(t);
    }
    // Sort by year (extract year from horizon)
    return Array.from(groups.entries()).sort(([a], [b]) => {
      const ya = parseInt(a.match(/\d{4}/)?.[0] ?? '9999');
      const yb = parseInt(b.match(/\d{4}/)?.[0] ?? '9999');
      return ya - yb;
    });
  }, [targets]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of targets) {
      const s = t.status || 'pending';
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  }, [targets]);

  return (
    <div className="space-y-4">
      {/* Status summary */}
      <Card className="rounded-2xl border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {targets.length} targets tracked
            </span>
            {Object.entries(statusCounts).map(([status, count]) => (
              <Badge key={status} variant="outline" className={cn('text-[11px]', targetStatusTone(status))}>
                {status}: {count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Target groups */}
      {grouped.map(([horizon, items]) => (
        <Card key={horizon} className="rounded-2xl border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-600" />
              {horizon} <span className="text-xs font-normal text-muted-foreground">({items.length} target{items.length === 1 ? '' : 's'})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {items.map((t, i) => (
                <div
                  key={i}
                  className="grid grid-cols-12 gap-3 rounded-lg border border-border/40 bg-card/40 px-3 py-2 text-xs"
                >
                  <div className="col-span-3">
                    <p className="font-semibold text-foreground">{t.metric}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{t.segment}</p>
                  </div>
                  <div className="col-span-3">
                    <p className="text-[10px] uppercase text-muted-foreground">Target</p>
                    <p className="font-medium tabular-nums">{t.target_display ?? '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase text-muted-foreground">Actual</p>
                    <p className="font-medium tabular-nums">
                      {t.actual_value != null ? fmtNum(t.actual_value) : '—'}
                    </p>
                  </div>
                  <div className="col-span-1 flex items-center">
                    <Badge variant="outline" className={cn('text-[10px]', targetStatusTone(t.status))}>
                      {t.status ?? '—'}
                    </Badge>
                  </div>
                  <div className="col-span-3">
                    {t.guidance_text && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{t.guidance_text}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {data.analysis_sections
        ?.filter((s) => s.title === 'Guidance and Target Delivery')
        .map((s) => <SectionNarrative key={s.title} section={s} />)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Quality tab — AR vs YF bridge + accounting
// ─────────────────────────────────────────────────────────────────────────

function QualityTab({ data }: { data: AnalysisJson }) {
  const bridge = data.ar_vs_yf_bridge ?? [];
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of bridge) {
      const k = r.comparability ?? 'unknown';
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [bridge]);

  // Pull accounting section data
  const acctSection = data.analysis_sections?.find((s) => s.title === 'Accounting and One-Offs');
  const exceptionalRows = (acctSection?.data_tables?.find((t) => t.name === 'exceptional_items')?.rows ?? []) as any[];
  const impairmentRows = (acctSection?.data_tables?.find((t) => t.name === 'impairment_assumptions')?.rows ?? []) as any[];
  const validationRows = (acctSection?.data_tables?.find((t) => t.name === 'validation_issues')?.rows ?? []) as any[];

  return (
    <div className="space-y-4">
      {/* Bridge summary */}
      <Card className="rounded-2xl border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-600" />
            Annual Report vs Yahoo Finance — {bridge.length} paired metrics
          </CardTitle>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(counts).map(([status, count]) => (
              <Badge key={status} variant="outline" className={cn('text-[11px]', compTone(status))}>
                {status}: {count}
              </Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {bridge.map((row, i) => (
              <BridgeRow key={i} row={row} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Exceptional items */}
      {exceptionalRows.length > 0 && (
        <Card className="rounded-2xl border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Exceptional items</CardTitle>
            {acctSection?.flags && acctSection.flags.length > 0 && (
              <p className="text-xs text-amber-700">{acctSection.flags[0]}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/40 text-left">
                    <th className="py-2 pr-3 text-[10px] uppercase text-muted-foreground">Segment</th>
                    <th className="py-2 pr-3 text-[10px] uppercase text-muted-foreground">Period</th>
                    <th className="py-2 pr-3 text-[10px] uppercase text-muted-foreground">Item</th>
                    <th className="py-2 text-[10px] uppercase text-muted-foreground text-right">Value (mn)</th>
                  </tr>
                </thead>
                <tbody>
                  {exceptionalRows.map((r: any, i: number) => (
                    <tr key={i} className="border-b border-border/20">
                      <td className="py-1.5 pr-3 text-muted-foreground">{r.segment}</td>
                      <td className="py-1.5 pr-3 text-muted-foreground">{r.period}</td>
                      <td className="py-1.5 pr-3">{r.metric}</td>
                      <td className={cn('py-1.5 text-right tabular-nums font-medium', (r.value ?? 0) < 0 ? 'text-red-600' : 'text-emerald-600')}>
                        {fmtNum(r.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Impairment assumptions */}
      {impairmentRows.length > 0 && (
        <Card className="rounded-2xl border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Impairment assumptions</CardTitle>
            <p className="text-xs text-muted-foreground">Discount rates and growth assumptions per segment</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/40 text-left">
                    <th className="py-2 pr-3 text-[10px] uppercase text-muted-foreground">Segment</th>
                    <th className="py-2 pr-3 text-[10px] uppercase text-muted-foreground">Period</th>
                    <th className="py-2 pr-3 text-[10px] uppercase text-muted-foreground">Assumption</th>
                    <th className="py-2 text-[10px] uppercase text-muted-foreground text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {impairmentRows.slice(0, 30).map((r: any, i: number) => (
                    <tr key={i} className="border-b border-border/20">
                      <td className="py-1.5 pr-3 text-muted-foreground">{r.segment}</td>
                      <td className="py-1.5 pr-3 text-muted-foreground">{r.period}</td>
                      <td className="py-1.5 pr-3">{r.metric}</td>
                      <td className="py-1.5 text-right tabular-nums">
                        {fmtNum(r.value)} {r.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {impairmentRows.length > 30 && (
              <p className="mt-2 text-[11px] text-muted-foreground">+{impairmentRows.length - 30} more</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Validation log summary */}
      {validationRows.length > 0 && (
        <Card className="rounded-2xl border-border/50 bg-slate-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Validation log — {validationRows.length} entries
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Auto-corrections and flagged items applied during extraction quality checks
            </p>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}

function BridgeRow({ row }: { row: NonNullable<AnalysisJson['ar_vs_yf_bridge']>[number] }) {
  const [open, setOpen] = useState(false);
  const hasDetail = row.bridge_explanation || row.definition_from_ar;
  return (
    <div className="rounded-lg border border-border/40 bg-card/40">
      <button
        onClick={() => hasDetail && setOpen((v) => !v)}
        className={cn('flex w-full items-center gap-3 px-3 py-2 text-left text-xs', hasDetail && 'cursor-pointer hover:bg-muted/30')}
      >
        <div className="w-4">
          {hasDetail && (open ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />)}
        </div>
        <div className="flex-1 font-semibold">{row.concept}</div>
        <div className="w-32 text-right tabular-nums text-sky-700 font-medium">
          {row.ar_value != null ? `${fmtNum(row.ar_value)} mn` : '—'}
        </div>
        <div className="w-32 text-right tabular-nums text-amber-700 font-medium">
          {fmtCompactCurrency(row.yf_value)}
        </div>
        <div className="w-20 text-right tabular-nums text-muted-foreground">
          {row.gap_pct != null ? fmtPct(row.gap_pct) : '—'}
        </div>
        <Badge variant="outline" className={cn('text-[10px] w-28 justify-center', compTone(row.comparability))}>
          {row.comparability ?? '—'}
        </Badge>
      </button>
      {open && hasDetail && (
        <div className="border-t border-border/40 px-3 py-3 pl-10 text-[11px] text-foreground/80 leading-relaxed bg-slate-50/50 space-y-2">
          {row.definition_from_ar && (
            <div>
              <span className="font-semibold text-foreground">AR definition:</span>{' '}
              <span>{row.definition_from_ar}</span>
            </div>
          )}
          {row.bridge_explanation && (
            <div>
              <span className="font-semibold text-foreground">Bridge analysis:</span>{' '}
              <span>{row.bridge_explanation}</span>
            </div>
          )}
          {row.review_confidence && (
            <div className="text-muted-foreground">Research confidence: {row.review_confidence}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Historical drill-down (mini table inside Performance tab footer)
// ─────────────────────────────────────────────────────────────────────────

function HistoricalDeepTable({ data }: { data: AnalysisJson }) {
  const ht = data.historical_table;
  const [open, setOpen] = useState(false);
  if (!ht?.years || !ht.rows) return null;

  return (
    <Card className="rounded-2xl border-border/50">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between p-4 text-left">
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="text-sm font-semibold">All historical metrics ({ht.rows.length} rows × {ht.years.length} years)</span>
        </div>
        <span className="text-[11px] text-muted-foreground">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="overflow-x-auto px-4 pb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/40">
                <th className="py-2 pr-3 text-left text-[10px] uppercase text-muted-foreground">Metric</th>
                {ht.years.map((y) => (
                  <th key={y} className="py-2 pr-2 text-right text-[10px] uppercase text-muted-foreground tabular-nums">
                    {y}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ht.rows.map((row, i) => (
                <tr key={i} className="border-b border-border/20 hover:bg-muted/20">
                  <td className="py-1.5 pr-3 font-medium">{row.metric}</td>
                  {ht.years!.map((y) => {
                    const v = row.values?.[y];
                    return (
                      <td key={y} className="py-1.5 pr-2 text-right tabular-nums text-muted-foreground">
                        {v == null ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Main view
// ─────────────────────────────────────────────────────────────────────────

export function FinancialFiguresView() {
  const { financialData } = useForesight();
  const data = financialData as unknown as AnalysisJson | null;

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Card className="max-w-lg rounded-2xl border-border/50">
          <CardContent className="p-6">
            <CircleDollarSign className="mb-3 h-8 w-8 text-emerald-600" />
            <h2 className="text-lg font-semibold">No financial analysis loaded</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload an <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">analysis.json</code> file
              produced by the Annual Report Reader analysis pipeline (
              <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">python -m analysis.runner</code>).
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const company = data.company_profile?.name || data.run_meta?.company || 'Company';
  const ticker = data.company_profile?.ticker || data.run_meta?.ticker;
  const focusYear = data.run_meta?.focus_year;
  const currency = data.company_profile?.currency || 'EUR';
  const primaryProfit = data.company_profile?.primary_profit_metric || 'EBITA';

  const { verdict, reasons } = computeVerdict(data.kpis ?? []);
  const verdictMeta = verdictTone(verdict);

  // Build series lookup by metric key for sparklines
  const charts = data.financial_charts ?? {};
  const seriesFor = (key: keyof typeof charts) => (charts[key] as Array<number | null>) ?? [];

  // Pull common KPIs
  const kpis = data.kpis ?? [];
  const findKpi = (label: string) => kpis.find((k) => k.label?.toLowerCase().includes(label.toLowerCase()));

  const revenueKpi = findKpi('revenue') ?? kpis[0];
  const ebitaKpi = findKpi('ebita') ?? kpis[1];
  const ebitdaKpi = findKpi('ebitda') ?? kpis[2];
  const marginKpi = findKpi('margin') ?? kpis[4];

  // FCF and Net Debt aren't in default KPIs — pull from charts
  const fcfLatest = (charts.fcf_m ?? []).filter((v) => v != null).slice(-1)[0] as number | undefined;
  const fcfPrior = (charts.fcf_m ?? []).filter((v) => v != null).slice(-2, -1)[0] as number | undefined;
  const fcfYoY = fcfLatest != null && fcfPrior != null && fcfPrior !== 0 ? ((fcfLatest - fcfPrior) / Math.abs(fcfPrior)) * 100 : null;

  const ndLatest = (charts.net_debt_m ?? []).filter((v) => v != null).slice(-1)[0] as number | undefined;
  const ndPrior = (charts.net_debt_m ?? []).filter((v) => v != null).slice(-2, -1)[0] as number | undefined;
  const ndYoY = ndLatest != null && ndPrior != null && ndPrior !== 0 ? ((ndLatest - ndPrior) / Math.abs(ndPrior)) * 100 : null;

  return (
    <div className="space-y-4">
      {/* HEADER — verdict + identity */}
      <Card className="rounded-3xl border-border/50 bg-gradient-to-br from-background/80 via-card/80 to-emerald-500/[0.04] shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold">{company}</h1>
                {ticker && (
                  <Badge variant="outline" className="text-[11px] border-emerald-500/30 text-emerald-700">
                    {ticker}
                  </Badge>
                )}
                {focusYear && (
                  <Badge variant="outline" className="text-[11px]">
                    FY{focusYear}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Primary profit metric: {primaryProfit} · Reporting currency: {currency}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn('rounded-full px-3 py-1 text-xs font-semibold', verdictMeta.color)}>
                {verdictMeta.label}
              </Badge>
            </div>
          </div>
          {data.executive_summary && (
            <p className="mt-3 text-sm leading-relaxed text-foreground/90">
              {data.executive_summary}
            </p>
          )}
          {reasons.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {reasons.map((r, i) => (
                <FlagPill key={i} text={r} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI STRIP */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {revenueKpi && (
          <KpiCard
            label="Revenue"
            value={revenueKpi.display_value || fmtMn(revenueKpi.value)}
            yoy={revenueKpi.yoy_change_pct}
            trend={revenueKpi.trend}
            series={seriesFor('revenue_m')}
          />
        )}
        {ebitaKpi && (
          <KpiCard
            label={ebitaKpi.label || 'EBITA'}
            value={ebitaKpi.display_value || fmtMn(ebitaKpi.value)}
            yoy={ebitaKpi.yoy_change_pct}
            trend={ebitaKpi.trend}
            series={seriesFor('ebita_m')}
          />
        )}
        {ebitdaKpi && (
          <KpiCard
            label="EBITDA"
            value={ebitdaKpi.display_value || fmtMn(ebitdaKpi.value)}
            yoy={ebitdaKpi.yoy_change_pct}
            trend={ebitdaKpi.trend}
            series={seriesFor('ebitda_m')}
          />
        )}
        <KpiCard
          label="Free cash flow"
          value={fmtMn(fcfLatest ?? null)}
          yoy={fcfYoY}
          series={seriesFor('fcf_m')}
        />
        <KpiCard
          label="Net debt"
          value={fmtMn(ndLatest ?? null)}
          yoy={ndYoY}
          series={seriesFor('net_debt_m')}
        />
      </div>

      {/* TABS */}
      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance" className="text-xs">
            <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="segments" className="text-xs">
            <Layers className="mr-1.5 h-3.5 w-3.5" />
            Segments
          </TabsTrigger>
          <TabsTrigger value="targets" className="text-xs">
            <Target className="mr-1.5 h-3.5 w-3.5" />
            Targets
          </TabsTrigger>
          <TabsTrigger value="quality" className="text-xs">
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Quality / AR vs YF
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="mt-4 space-y-4">
          <PerformanceTab data={data} />
          <HistoricalDeepTable data={data} />
        </TabsContent>

        <TabsContent value="segments" className="mt-4">
          <SegmentsTab data={data} />
        </TabsContent>

        <TabsContent value="targets" className="mt-4">
          <TargetsTab data={data} />
        </TabsContent>

        <TabsContent value="quality" className="mt-4">
          <QualityTab data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
