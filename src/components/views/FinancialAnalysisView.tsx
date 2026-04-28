import { useMemo, useState, useEffect } from 'react';
import { useForesight } from '@/contexts/ForesightContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Gauge,
  Info,
  Layers,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  FinancialAnalysisSection,
  FinancialBridgeRow,
  FinancialEarningsQuality,
  FinancialHistoricalRow,
  FinancialMetricBridge,
  FinancialMetricFamily,
  FinancialRatioCard,
  FinancialSegment,
  EqBridgeMetric,
  EqFavorability,
  EqSeverity,
  EqHistoricalPattern,
  EqOneTimeDressing,
  EqDisclosureGap,
  FinancialWorkingCapitalAnalysis,
  WcBridgeRow,
  WcHeadlineMetric,
  WcTopInsight,
  WcPeerBenchmark,
} from '@/types/financial';

/* ============================================================
   FORMATTERS
============================================================ */

const fmtNum = (v: number | null | undefined, digits = 1): string => {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const abs = Math.abs(v);
  if (abs >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return v.toFixed(digits);
};

const fmtPct = (v: number | null | undefined, digits = 1): string => {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `${v.toFixed(digits)}%`;
};

const fmtDelta = (v: number | null | undefined, digits = 1): string => {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(digits)}%`;
};

const fmtRatio = (v: number | null | undefined, digits = 2): string => {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `${v.toFixed(digits)}x`;
};

const yoySign = (v?: number | null): 'up' | 'down' | 'flat' => {
  if (v === null || v === undefined || Number.isNaN(v)) return 'flat';
  if (v > 0.1) return 'up';
  if (v < -0.1) return 'down';
  return 'flat';
};

/* ============================================================
   STYLE TOKENS — aligned with StrategyComposition design
============================================================ */

const SEVERITY_TONE: Record<string, { card: string; icon: string; chip: string; text: string }> = {
  high: {
    card: 'border-destructive/35 bg-destructive/[0.04]',
    icon: 'bg-destructive/10 text-destructive',
    chip: 'border-destructive/35 bg-destructive/10 text-destructive',
    text: 'text-destructive',
  },
  warning: {
    card: 'border-amber-500/40 bg-amber-500/[0.04]',
    icon: 'bg-amber-500/10 text-amber-600',
    chip: 'border-amber-500/35 bg-amber-500/10 text-amber-600',
    text: 'text-amber-600',
  },
  info: {
    card: 'border-blue-500/30 bg-blue-500/[0.03]',
    icon: 'bg-blue-500/10 text-blue-600',
    chip: 'border-blue-500/30 bg-blue-500/10 text-blue-600',
    text: 'text-blue-600',
  },
  default: {
    card: 'border-border/60 bg-card/70',
    icon: 'bg-muted text-muted-foreground',
    chip: 'border-border/60 text-muted-foreground',
    text: 'text-muted-foreground',
  },
};

const tone = (sev?: string) => {
  const s = String(sev || '').toLowerCase();
  if (s.includes('high') || s.includes('critical') || s.includes('risk') || s === 'red') return SEVERITY_TONE.high;
  if (s.includes('warn') || s.includes('medium') || s === 'amber') return SEVERITY_TONE.warning;
  if (s.includes('info') || s.includes('low') || s === 'blue') return SEVERITY_TONE.info;
  return SEVERITY_TONE.default;
};

const priorityTone = (p?: string) => {
  const s = String(p || '').toLowerCase();
  if (s === 'high') return SEVERITY_TONE.high;
  if (s === 'medium') return SEVERITY_TONE.warning;
  return SEVERITY_TONE.info;
};

const compToneClass = (c?: string): string => {
  const s = String(c || '').toLowerCase();
  if (s.includes('aligned') || s.includes('match')) return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-600';
  if (s.includes('material_gap') || s.includes('material_lag')) return 'border-destructive/35 bg-destructive/10 text-destructive';
  if (s.includes('minor') || s.includes('lag') || s.includes('watch')) return 'border-amber-500/35 bg-amber-500/10 text-amber-600';
  return 'border-border/60 text-muted-foreground';
};

const statusTone = (s?: string): string => {
  const v = String(s || '').toLowerCase();
  if (v.includes('achieved')) return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-600';
  if (v.includes('on_track')) return 'border-blue-500/30 bg-blue-500/10 text-blue-600';
  if (v.includes('behind')) return 'border-destructive/35 bg-destructive/10 text-destructive';
  return 'border-border/60 text-muted-foreground';
};

const SECTION_LABEL_CLASS = 'text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground';

/* ============================================================
   YEAR-GAP-AWARE CHART HELPERS
============================================================ */

interface ChartPoint {
  year: string;
  ar?: number | null;
  yf?: number | null;
  __isGap?: boolean;
}

interface PaddedSeries {
  data: ChartPoint[];
  gaps: Array<{ from: string; to: string }>;
}

/**
 * Insert null-padded years into series whenever there is a gap > 1 year.
 * Returns a flat year axis where every year from min..max is present, plus
 * the list of detected gap ranges so we can highlight them in the chart.
 */
const padYearGaps = (
  years: Array<string | number>,
  arSeries?: Array<number | null>,
  yfSeries?: Array<number | null>,
): PaddedSeries => {
  const numericYears = years.map(y => parseInt(String(y), 10)).filter(y => !Number.isNaN(y));
  if (numericYears.length === 0) {
    return { data: [], gaps: [] };
  }

  const arMap = new Map<number, number | null>();
  const yfMap = new Map<number, number | null>();
  numericYears.forEach((y, i) => {
    arMap.set(y, arSeries?.[i] ?? null);
    yfMap.set(y, yfSeries?.[i] ?? null);
  });

  const sorted = [...numericYears].sort((a, b) => a - b);
  const gaps: Array<{ from: string; to: string }> = [];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] > 1) {
      gaps.push({ from: String(sorted[i - 1]), to: String(sorted[i]) });
    }
  }

  const minYear = sorted[0];
  const maxYear = sorted[sorted.length - 1];
  const data: ChartPoint[] = [];
  for (let y = minYear; y <= maxYear; y++) {
    const isGap = !arMap.has(y);
    data.push({
      year: String(y),
      ar: arMap.has(y) ? arMap.get(y) ?? null : null,
      yf: yfMap.has(y) ? yfMap.get(y) ?? null : null,
      __isGap: isGap,
    });
  }
  return { data, gaps };
};

const buildBarChartSeries = (
  years: Array<string | number>,
  arSeries?: Array<number | null>,
  yfSeries?: Array<number | null>,
): ChartPoint[] => {
  return years.map((y, i) => ({
    year: String(y),
    ar: arSeries?.[i] ?? null,
    yf: yfSeries?.[i] ?? null,
  }));
};

/* ============================================================
   HISTORICAL ROW GROUPING (general — not Aalberts-specific)
============================================================ */

const INCOME_KEYS = [
  'revenue', 'organic', 'gross profit', 'gross margin',
  'ebitda', 'ebita', 'ebit', 'operating income', 'operating margin',
  'net profit', 'net income', 'eps', 'exceptional',
];
const BALANCE_KEYS = [
  'asset', 'equity', 'liabilit', 'debt', 'cash and',
  'working capital', 'inventory', 'receivable', 'payable',
  'goodwill', 'intangible',
];
const CASH_KEYS = [
  'cash flow', 'cfo', 'capex', 'capital expenditure',
  'fcf', 'free cash', 'dividend', 'acquisition',
];

const matchKeys = (metric: string, patterns: string[]): boolean => {
  const m = metric.toLowerCase();
  return patterns.some(p => m.includes(p));
};

const groupHistoricalRows = (rows: FinancialHistoricalRow[] = []) => {
  const income: FinancialHistoricalRow[] = [];
  const balance: FinancialHistoricalRow[] = [];
  const cash: FinancialHistoricalRow[] = [];
  const other: FinancialHistoricalRow[] = [];
  for (const row of rows) {
    if (matchKeys(row.metric, CASH_KEYS)) cash.push(row);
    else if (matchKeys(row.metric, BALANCE_KEYS)) balance.push(row);
    else if (matchKeys(row.metric, INCOME_KEYS)) income.push(row);
    else other.push(row);
  }
  return { income, balance, cash, other };
};

/* ============================================================
   MAIN COMPONENT
============================================================ */

export function FinancialAnalysisView() {
  const { financialData } = useForesight();
  const [activeSubtab, setActiveSubtab] = useState('overview');

  const fd = financialData;

  if (!fd) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="max-w-md rounded-3xl border-border/60">
          <CardContent className="p-8 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="mb-2 text-lg font-semibold">No financial analysis loaded</h2>
            <p className="text-sm text-muted-foreground">
              Drop a financial-analysis JSON onto the upload area to view the dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sections = fd.analysis_sections ?? [];
  const kpis = fd.kpis ?? [];
  const takeaways = fd.key_takeaways ?? [];
  const bridge = fd.ar_vs_yf_bridge ?? [];
  const metricBridge = fd.metric_bridge;
  const earningsQuality = fd.earnings_quality;
  const workingCapitalAnalysis = fd.working_capital_analysis;
  const segments = fd.segment_analysis ?? [];
  const guidance = fd.guidance_tracking ?? [];
  const charts = fd.financial_charts;
  const historical = fd.historical_table;
  const ratios = fd.ratio_cards;
  const market = fd.market_snapshot;
  const governance = fd.governance_scores;
  const profile = fd.company_profile;
  const exec = fd.executive;
  const thesis =
    exec?.executive_thesis ||
    exec?.professional_outcome_report ||
    fd.executive_summary ||
    '';

  return (
    <div className="space-y-6 p-4 md:p-6">
      <HeroHeader profile={profile} thesis={thesis} topFlag={exec?.top_flag} />

      <Tabs value={activeSubtab} onValueChange={setActiveSubtab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-muted/50 p-1 md:flex md:w-auto md:inline-flex">
          <TabsTrigger value="overview" className="rounded-xl">Overview</TabsTrigger>
          <TabsTrigger value="performance" className="rounded-xl">Performance</TabsTrigger>
          <TabsTrigger value="bridge" className="rounded-xl">AR ↔ YF Bridge</TabsTrigger>
          {earningsQuality && (
            <TabsTrigger value="earnings-quality" className="rounded-xl">Earnings Quality</TabsTrigger>
          )}
          {workingCapitalAnalysis && (
            <TabsTrigger value="working-capital" className="rounded-xl">Working Capital</TabsTrigger>
          )}
          <TabsTrigger value="segments" className="rounded-xl">Segments</TabsTrigger>
          <TabsTrigger value="ratios" className="rounded-xl">Ratios &amp; Historicals</TabsTrigger>
          <TabsTrigger value="guide" className="rounded-xl">Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <OverviewPage
            kpis={kpis}
            takeaways={takeaways}
            guidance={guidance}
            market={market}
            governance={governance}
          />
        </TabsContent>

        <TabsContent value="performance" className="mt-6 space-y-6">
          <PerformancePage charts={charts} sections={sections} />
        </TabsContent>

        <TabsContent value="bridge" className="mt-6 space-y-6">
          <BridgePage bridge={bridge} sections={sections} metricBridge={metricBridge} />
        </TabsContent>

        {earningsQuality && (
          <TabsContent value="earnings-quality" className="mt-6 space-y-6">
            <EarningsQualityPage data={earningsQuality} />
          </TabsContent>
        )}

        {workingCapitalAnalysis && (
          <TabsContent value="working-capital" className="mt-6 space-y-6">
            <WorkingCapitalPage
              data={workingCapitalAnalysis}
              companyTicker={profile?.ticker ?? 'UNKNOWN'}
            />
          </TabsContent>
        )}

        <TabsContent value="segments" className="mt-6 space-y-6">
          <SegmentsPage segments={segments} guidance={guidance} />
        </TabsContent>

        <TabsContent value="ratios" className="mt-6 space-y-6">
          <RatiosHistoricalPage ratios={ratios} historical={historical} />
        </TabsContent>

        <TabsContent value="guide" className="mt-6 space-y-6">
          <GuidePage
            hasEarningsQuality={Boolean(earningsQuality)}
            hasWorkingCapital={Boolean(workingCapitalAnalysis)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ============================================================
   HERO HEADER (always visible)
============================================================ */

function HeroHeader({
  profile,
  thesis,
  topFlag,
}: {
  profile?: any;
  thesis: string;
  topFlag?: any;
}) {
  const [expanded, setExpanded] = useState(false);
  const truncated = thesis.length > 360 ? thesis.slice(0, 360) + '…' : thesis;
  const t = tone(topFlag?.severity);

  return (
    <Card className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-background/80 via-card/80 to-primary/10 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)] backdrop-blur">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-12 top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />

      <CardContent className="relative z-10 p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-border/60 bg-background/70 p-2 shadow-sm">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {profile?.name || 'Company'}
                </h1>
                <p className={SECTION_LABEL_CLASS}>
                  {profile?.ticker} · Financial Fundamentals
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
              {profile?.sector && (
                <span className="rounded-full border border-border/50 bg-background/70 px-3 py-1">
                  {profile.sector}
                </span>
              )}
              {profile?.industry && (
                <span className="rounded-full border border-border/50 bg-background/70 px-3 py-1">
                  {profile.industry}
                </span>
              )}
              {profile?.country && (
                <span className="rounded-full border border-border/50 bg-background/70 px-3 py-1">
                  {profile.country}
                </span>
              )}
              {profile?.exchange && (
                <span className="rounded-full border border-border/50 bg-background/70 px-3 py-1">
                  {profile.exchange}
                </span>
              )}
              {profile?.employees && (
                <span className="rounded-full border border-border/50 bg-background/70 px-3 py-1">
                  {Number(profile.employees).toLocaleString('en-US')} employees
                </span>
              )}
            </div>
          </div>

          {topFlag?.message && (
            <div className={cn(
              'flex max-w-md items-start gap-3 rounded-2xl border p-4 text-sm shadow-sm',
              t.card,
            )}>
              <div className={cn('rounded-xl p-1.5 shrink-0', t.icon)}>
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className={cn('text-[10px] font-semibold uppercase tracking-[0.18em]', t.text)}>
                  Top flag · {topFlag.section || topFlag.severity}
                </p>
                <p className="mt-1 text-foreground">{topFlag.message}</p>
              </div>
            </div>
          )}
        </div>

        {thesis && (
          <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/[0.04] p-4">
            <p className="text-sm leading-relaxed text-foreground">
              {expanded ? thesis : truncated}
              {thesis.length > 360 && (
                <Button
                  variant="link"
                  size="sm"
                  className="ml-1 h-auto px-0 py-0"
                  onClick={() => setExpanded(v => !v)}
                >
                  {expanded ? 'Show less' : 'Read more'}
                </Button>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ============================================================
   OVERVIEW PAGE
============================================================ */

function OverviewPage({
  kpis,
  takeaways,
  guidance,
  market,
  governance,
}: {
  kpis: any[];
  takeaways: any[];
  guidance: any[];
  market?: any;
  governance?: any;
}) {
  return (
    <div className="space-y-6">
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {kpis.slice(0, 5).map((k: any) => (
            <KpiTile key={k.key} kpi={k} />
          ))}
        </div>
      )}

      {takeaways.length > 0 && (
        <SectionShell
          icon={Sparkles}
          title="Key Takeaways"
          subtitle="Investor concern level — high needs immediate scrutiny, medium is worth watching, low is informational."
          count={takeaways.length}
        >
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px]">
            <span className={SECTION_LABEL_CLASS}>Priority legend:</span>
            <Badge variant="outline" className={cn('rounded-full', SEVERITY_TONE.high.chip)}>
              High — material risk
            </Badge>
            <Badge variant="outline" className={cn('rounded-full', SEVERITY_TONE.warning.chip)}>
              Medium — watch closely
            </Badge>
            <Badge variant="outline" className={cn('rounded-full', SEVERITY_TONE.info.chip)}>
              Low — informational
            </Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {takeaways.map((t: any, i: number) => (
              <TakeawayCard key={i} takeaway={t} />
            ))}
          </div>
        </SectionShell>
      )}

      {guidance.length > 0 && (
        <FoldableSection
          icon={Target}
          title="Guidance &amp; Target Tracking"
          count={guidance.length}
          defaultOpen={false}
        >
          <GuidanceTable items={guidance} />
        </FoldableSection>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {market && <MarketSnapshotCard market={market} />}
        {governance && <GovernanceCard gov={governance} />}
      </div>
    </div>
  );
}

function KpiTile({ kpi }: { kpi: any }) {
  const dir = yoySign(kpi.yoy_change_pct);
  const Icon = dir === 'up' ? TrendingUp : dir === 'down' ? TrendingDown : Activity;
  const trendClr =
    dir === 'up' ? 'text-emerald-600' : dir === 'down' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <Card className="rounded-2xl border-border/60 bg-card/70 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <p className={SECTION_LABEL_CLASS}>{kpi.label}</p>
          <Icon className={cn('h-4 w-4', trendClr)} />
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums">
          {kpi.display_value || fmtNum(kpi.value)}
        </p>
        <div className="mt-1 flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">{kpi.unit || ''}</span>
          {kpi.yoy_change_pct !== null && kpi.yoy_change_pct !== undefined && (
            <span className={cn('tabular-nums font-medium', trendClr)}>
              {fmtDelta(kpi.yoy_change_pct)} YoY
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TakeawayCard({ takeaway }: { takeaway: any }) {
  const t = priorityTone(takeaway.priority);
  return (
    <div className={cn('rounded-2xl border p-4 transition-shadow hover:shadow-sm', t.card)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={cn('text-[10px] font-semibold uppercase tracking-[0.18em]', t.text)}>
          {takeaway.headline}
        </span>
        {takeaway.priority && (
          <Badge variant="outline" className={cn('rounded-full text-[10px] capitalize', t.chip)}>
            {takeaway.priority}
          </Badge>
        )}
      </div>
      <p className="text-sm leading-relaxed text-foreground">{takeaway.detail}</p>
    </div>
  );
}

/* ============================================================
   PERFORMANCE PAGE
============================================================ */

function PerformancePage({ charts, sections }: { charts?: any; sections: FinancialAnalysisSection[] }) {
  const [chartMode, setChartMode] = useState<'ar' | 'yf' | 'both'>('both');
  const years = charts?.years ?? [];

  const revenue = useMemo(() => padYearGaps(years, charts?.revenue_m, charts?.revenue_m_yf), [years, charts]);
  const ebitda = useMemo(() => padYearGaps(years, charts?.ebitda_m, charts?.ebitda_m_yf), [years, charts]);
  const netIncome = useMemo(() => padYearGaps(years, charts?.net_profit_m, charts?.net_profit_m_yf), [years, charts]);
  const margin = useMemo(() => padYearGaps(years, charts?.ebita_margin_pct, charts?.ebitda_margin_pct_yf), [years, charts]);
  const fcf = useMemo(() => padYearGaps(years, charts?.fcf_m, charts?.fcf_m_yf), [years, charts]);
  const capex = useMemo(() => {
    const yfFlipped = (charts?.capex_m_yf ?? []).map((v: number | null) => v != null ? Math.abs(v) : null);
    return buildBarChartSeries(years, charts?.capex_m, yfFlipped);
  }, [years, charts]);
  const netDebt = useMemo(() => padYearGaps(years, charts?.net_debt_m), [years, charts]);
  const workingCapital = useMemo(() => padYearGaps(years, charts?.working_capital_m), [years, charts]);

  return (
    <div className="space-y-6">
      <SectionShell
        icon={Gauge}
        title="Financial Performance"
        actions={<ChartModeToggle mode={chartMode} onChange={setChartMode} />}
      >
        <Tabs defaultValue="performance" className="w-full">
          <TabsList className="mb-4 rounded-xl">
            <TabsTrigger value="performance" className="rounded-lg">Income Statement</TabsTrigger>
            <TabsTrigger value="balance" className="rounded-lg">Balance Sheet</TabsTrigger>
            <TabsTrigger value="cashflow" className="rounded-lg">Cash Flow</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Revenue" unit="mn">
                <DualLineChart series={revenue} mode={chartMode} />
              </ChartCard>
              <ChartCard title="EBITDA" unit="mn">
                <DualLineChart series={ebitda} mode={chartMode} />
              </ChartCard>
              <ChartCard title="Net Profit" unit="mn">
                <DualLineChart series={netIncome} mode={chartMode} />
              </ChartCard>
              <ChartCard title="Operating Margin" unit="%">
                <DualLineChart series={margin} mode={chartMode} isPercent />
              </ChartCard>
            </div>
          </TabsContent>

          <TabsContent value="balance" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Net Debt" unit="mn" arOnly>
                <DualLineChart series={netDebt} mode="ar" />
              </ChartCard>
              <ChartCard title="Working Capital" unit="mn" arOnly>
                <DualLineChart series={workingCapital} mode="ar" />
              </ChartCard>
            </div>
          </TabsContent>

          <TabsContent value="cashflow" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Free Cash Flow" unit="mn">
                <DualLineChart series={fcf} mode={chartMode} />
              </ChartCard>
              <ChartCard title="CapEx" unit="mn">
                <DualBarChart data={capex} mode={chartMode} />
              </ChartCard>
            </div>
          </TabsContent>
        </Tabs>
      </SectionShell>

      {sections.length > 0 && (
        <SectionShell icon={FileText} title="Analysis Sections" count={sections.length}>
          <div className="space-y-3">
            {sections.map((s, i) => (
              <SectionFolder key={i} section={s} defaultOpen={false} />
            ))}
          </div>
        </SectionShell>
      )}
    </div>
  );
}

function ChartModeToggle({
  mode,
  onChange,
}: {
  mode: 'ar' | 'yf' | 'both';
  onChange: (m: 'ar' | 'yf' | 'both') => void;
}) {
  const opts: Array<{ key: 'ar' | 'yf' | 'both'; label: string }> = [
    { key: 'ar', label: 'Annual Report' },
    { key: 'yf', label: 'Yahoo Finance' },
    { key: 'both', label: 'Both' },
  ];
  return (
    <div className="inline-flex rounded-full border border-border/60 bg-background/70 p-0.5 text-xs shadow-sm">
      {opts.map(o => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            'rounded-full px-3 py-1 font-medium transition-all',
            mode === o.key
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ChartCard({
  title,
  unit,
  arOnly = false,
  children,
}: {
  title: string;
  unit?: string;
  arOnly?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {arOnly && (
            <Badge variant="outline" className="rounded-full text-[10px]">AR only</Badge>
          )}
          {unit && <span>{unit}</span>}
        </div>
      </div>
      <div className="h-[220px]">{children}</div>
    </div>
  );
}

const AR_COLOR = '#2563eb';
const YF_COLOR = '#f59e0b';
const GAP_COLOR = '#cbd5e1';

function GapLegend({ gaps }: { gaps: Array<{ from: string; to: string }> }) {
  if (gaps.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
      <span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: `${GAP_COLOR}55` }} />
      <span>Year gap:</span>
      {gaps.map((g, i) => (
        <Badge key={i} variant="outline" className="rounded-full text-[10px]">
          {g.from} → {g.to}
        </Badge>
      ))}
    </div>
  );
}

function DualLineChart({
  series,
  mode,
  isPercent = false,
}: {
  series: PaddedSeries;
  mode: 'ar' | 'yf' | 'both';
  isPercent?: boolean;
}) {
  const formatter = (v: number) => (isPercent ? fmtPct(v) : fmtNum(v));
  const { data, gaps } = series;

  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height={gaps.length > 0 ? '88%' : '100%'}>
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={formatter as any} />
          {/* Highlight gap year-bands */}
          {gaps.map((g, i) => (
            <ReferenceArea
              key={i}
              x1={String(parseInt(g.from, 10) + 1)}
              x2={String(parseInt(g.to, 10) - 1)}
              fill={GAP_COLOR}
              fillOpacity={0.18}
            />
          ))}
          <Tooltip
            formatter={(v: any) => (v == null ? '—' : formatter(v))}
            labelClassName="text-xs"
          />
          {mode !== 'ar' && (
            <Line
              type="monotone"
              dataKey="yf"
              name="Yahoo Finance"
              stroke={YF_COLOR}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls={false}
            />
          )}
          {mode !== 'yf' && (
            <Line
              type="monotone"
              dataKey="ar"
              name="Annual Report"
              stroke={AR_COLOR}
              strokeWidth={2.5}
              dot={{ r: 3 }}
              connectNulls={false}
            />
          )}
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </LineChart>
      </ResponsiveContainer>
      <GapLegend gaps={gaps} />
    </div>
  );
}

function DualBarChart({
  data,
  mode,
}: {
  data: ChartPoint[];
  mode: 'ar' | 'yf' | 'both';
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
        <XAxis dataKey="year" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(v: any) => (v == null ? '—' : fmtNum(v))}
          labelClassName="text-xs"
        />
        {mode !== 'yf' && <Bar dataKey="ar" name="Annual Report" fill={AR_COLOR} />}
        {mode !== 'ar' && <Bar dataKey="yf" name="Yahoo Finance" fill={YF_COLOR} />}
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ============================================================
   ANALYSIS SECTION FOLDER (default closed)
============================================================ */

function SectionFolder({
  section,
  defaultOpen = false,
}: {
  section: FinancialAnalysisSection;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [showValidation, setShowValidation] = useState(false);
  const narrative = section.narrative || section.text || '';
  const flags = section.flags ?? [];
  const dataTables = section.data_tables ?? [];
  const arVsYf = section.ar_vs_yf ?? [];
  const flagTone = flags.length > 0 ? tone(flags[0].severity) : tone();
  const preview = narrative.length > 140 ? narrative.slice(0, 140) + '…' : narrative;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className={cn(
        'overflow-hidden rounded-2xl border bg-card/70 shadow-sm transition-all',
        open ? 'border-primary/45 bg-primary/[0.03]' : 'border-border/60 hover:border-primary/30',
      )}>
        <CollapsibleTrigger className="w-full text-left">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className={cn(
                'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                open ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary',
              )}>
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={SECTION_LABEL_CLASS}>Analysis section</p>
                    <h4 className="mt-1 text-base font-semibold leading-snug">{section.title}</h4>
                  </div>
                  <ChevronRight className={cn(
                    'mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform',
                    open && 'rotate-90',
                  )} />
                </div>
                {!open && preview && (
                  <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{preview}</p>
                )}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  {flags.length > 0 && (
                    <Badge variant="outline" className={cn('rounded-full', flagTone.chip)}>
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      {flags.length} flag{flags.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                  {dataTables.length > 0 && (
                    <Badge variant="outline" className="rounded-full">
                      {dataTables.length} table{dataTables.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                  {arVsYf.length > 0 && (
                    <Badge variant="outline" className="rounded-full">
                      {arVsYf.length} AR↔YF check{arVsYf.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-4 border-t border-border/50 bg-background/40 p-5">
            {narrative && (
              <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                {narrative}
              </p>
            )}

            {flags.length > 0 && (
              <Collapsible open={showValidation} onOpenChange={setShowValidation}>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-left hover:bg-muted/40">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Validation issues ({flags.length})
                    </span>
                  </div>
                  {showValidation ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-1.5">
                  {flags.map((f, i) => {
                    const t = tone(f.severity);
                    return (
                      <div key={i} className={cn('flex items-start gap-2 rounded-xl border px-3 py-2 text-xs', t.card)}>
                        <AlertTriangle className={cn('mt-0.5 h-3 w-3 shrink-0', t.text)} />
                        <span>{f.message}</span>
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            )}

            {dataTables.length > 0 && (
              <div className="space-y-3">
                {dataTables.map((dt, i) => (
                  <DataTableBlock key={i} name={dt.name} rows={dt.rows} />
                ))}
              </div>
            )}

            {arVsYf.length > 0 && (
              <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                <p className={cn(SECTION_LABEL_CLASS, 'mb-2')}>AR vs YF for this section</p>
                <div className="space-y-2">
                  {arVsYf.map((b, i) => (
                    <BridgeRowInline key={i} row={b} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function DataTableBlock({ name, rows }: { name: string; rows: any[] }) {
  if (!rows || rows.length === 0) return null;
  const columns = Object.keys(rows[0]);
  const formatCell = (v: any, col: string): string => {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'number') {
      const c = col.toLowerCase();
      if (c.includes('pct') || c.includes('margin') || c.includes('growth') || c.includes('rate')) return fmtPct(v);
      return fmtNum(v);
    }
    return String(v);
  };

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <div className="border-b border-border/50 bg-muted/30 px-3 py-2">
        <p className={SECTION_LABEL_CLASS}>{name}</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(c => (
                <TableHead key={c} className="whitespace-nowrap text-[11px]">
                  {c.replace(/_/g, ' ')}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                {columns.map(c => (
                  <TableCell key={c} className="whitespace-nowrap text-xs tabular-nums">
                    {formatCell(r[c], c)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function BridgeRowInline({ row }: { row: FinancialBridgeRow }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-card/70 px-3 py-2 text-xs">
      <div className="min-w-0 flex-1">
        <span className="font-medium">{row.concept || row.ar_metric}</span>
        <span className="ml-2 text-muted-foreground">
          AR {fmtNum(row.ar_value)} {row.ar_unit}
        </span>
        <span className="ml-2 text-muted-foreground">
          YF {fmtNum(row.yf_value)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {row.gap_pct !== null && row.gap_pct !== undefined && (
          <span className="tabular-nums text-muted-foreground">Δ {fmtDelta(row.gap_pct)}</span>
        )}
        {row.comparability && (
          <Badge variant="outline" className={cn('rounded-full text-[10px]', compToneClass(row.comparability))}>
            {row.comparability.replace(/_/g, ' ')}
          </Badge>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   AR ↔ YF BRIDGE PAGE — clickable rows with reasoning
============================================================ */

/** Map a bridge-row concept/ar_metric to a metric_bridge family key.
 *  Simple keyword match — same rules as the Python FAMILY_PATTERNS. */
function familyKeyForConcept(concept: string): string | null {
  const s = concept.toLowerCase();
  if (/\bebitda\b/.test(s)) return 'ebitda';
  if (/\bebita\b/.test(s)) return 'ebita';
  if (/\bebit\b|operating profit|operating income/.test(s)) return 'ebit';
  if (/free cash flow|\bfcf\b/.test(s)) return 'fcf';
  if (/operating cash flow|cash flow from operations|\bcfo\b/.test(s)) return 'operating_cash_flow';
  if (/\bcapex\b|capital expenditure/.test(s)) return 'capex';
  if (/net profit|net income|profit attributable/.test(s)) return 'net_profit';
  if (/\beps\b|earnings per share/.test(s)) return 'eps';
  if (/\brevenue\b|turnover|net sales/.test(s)) return 'revenue';
  if (/gross profit/.test(s)) return 'gross_profit';
  if (/net debt/.test(s)) return 'net_debt';
  if (/working capital/.test(s)) return 'working_capital';
  if (/total assets/.test(s)) return 'total_assets';
  if (/total equity|shareholders.? equity|^equity$/.test(s)) return 'total_equity';
  return null;
}

function BridgePage({
  bridge,
  sections,
  metricBridge,
}: {
  bridge: FinancialBridgeRow[];
  sections: FinancialAnalysisSection[];
  metricBridge?: FinancialMetricBridge;
}) {
  const [selected, setSelected] = useState<FinancialBridgeRow | null>(null);

  // Per-row reasoning lives on the bridge row itself (`bridge_explanation`).
  // We additionally collect any per-row `bridge_explanation` mentioned inside
  // section ar_vs_yf payloads as a fallback, keyed by concept.
  const fallbackByConcept = useMemo(() => {
    const map = new Map<string, { sectionTitle: string; explanation: string }>();
    for (const s of sections) {
      const arVsYf = s.ar_vs_yf ?? [];
      for (const item of arVsYf) {
        const key = String(item.concept || item.ar_metric || '').toLowerCase();
        const expl = (item as any).bridge_explanation as string | undefined;
        if (key && expl && !map.has(key)) {
          map.set(key, { sectionTitle: s.title, explanation: expl });
        }
      }
    }
    return map;
  }, [sections]);

  const summary = useMemo(() => {
    let aligned = 0, gaps = 0, watch = 0;
    for (const b of bridge) {
      const c = String(b.comparability || '').toLowerCase();
      if (c.includes('aligned') || c.includes('match')) aligned += 1;
      else if (c.includes('material_gap') || c.includes('material_lag')) gaps += 1;
      else watch += 1;
    }
    return { aligned, gaps, watch };
  }, [bridge]);

  return (
    <SectionShell
      icon={Layers}
      title="Annual Report ↔ Yahoo Finance Bridge"
      subtitle="Click any row to see the reasoning behind the gap and the AR definition."
    >
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <Badge variant="outline" className="rounded-full border-emerald-500/35 bg-emerald-500/10 text-emerald-600">
          {summary.aligned} aligned
        </Badge>
        <Badge variant="outline" className="rounded-full border-destructive/35 bg-destructive/10 text-destructive">
          {summary.gaps} material gaps
        </Badge>
        <Badge variant="outline" className="rounded-full border-amber-500/35 bg-amber-500/10 text-amber-600">
          {summary.watch} watch / minor
        </Badge>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Concept</TableHead>
              <TableHead className="text-right">AR value</TableHead>
              <TableHead className="text-right">YF value</TableHead>
              <TableHead className="text-right">Gap</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bridge.map((r, i) => {
              const yfDisp =
                r.yf_value != null && Math.abs(r.yf_value) > 1e6 ? r.yf_value / 1e6 : r.yf_value;
              return (
                <TableRow
                  key={i}
                  className="cursor-pointer transition-colors hover:bg-muted/40"
                  onClick={() => setSelected(r)}
                >
                  <TableCell>
                    <div className="font-medium">{r.concept}</div>
                    <div className="text-[10px] text-muted-foreground">{r.ar_metric}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtNum(r.ar_value)} <span className="text-[10px] text-muted-foreground">{r.ar_unit}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtNum(yfDisp as number | null | undefined)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmtDelta(r.gap_pct)}</TableCell>
                  <TableCell>
                    {r.comparability && (
                      <Badge variant="outline" className={cn('rounded-full text-[10px]', compToneClass(r.comparability))}>
                        {r.comparability.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-3xl">
          {selected && (() => {
            const concept = String(selected.concept || selected.ar_metric || '');
            const famKey = familyKeyForConcept(concept);
            const family = famKey ? metricBridge?.families?.[famKey] : undefined;
            return (
              <BridgeDetail
                row={selected}
                family={family}
                fallback={fallbackByConcept.get(concept.toLowerCase())}
              />
            );
          })()}
        </DialogContent>
      </Dialog>
    </SectionShell>
  );
}

const confidenceTone = (c?: string): string => {
  const v = String(c || '').toLowerCase();
  if (v === 'high') return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-600';
  if (v === 'medium') return 'border-amber-500/35 bg-amber-500/10 text-amber-600';
  if (v === 'low') return 'border-destructive/35 bg-destructive/10 text-destructive';
  return 'border-border/60 text-muted-foreground';
};

function BridgeDetail({
  row,
  family,
  fallback,
}: {
  row: FinancialBridgeRow;
  family?: FinancialMetricFamily;
  fallback?: { sectionTitle: string; explanation: string };
}) {
  const explanation = row.bridge_explanation || fallback?.explanation || '';
  const explanationSource = row.bridge_explanation
    ? 'Per-metric reasoning from the AR ↔ YF reconciliation'
    : fallback
      ? `Pulled from section: ${fallback.sectionTitle}`
      : '';

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          {family?.canonical_label || row.concept}
        </DialogTitle>
        <DialogDescription>
          {family
            ? `${Object.keys(family.variants ?? {}).length} AR variant${Object.keys(family.variants ?? {}).length === 1 ? '' : 's'} · Yahoo Finance: ${row.yf_label || row.yf_metric || 'n/a'}`
            : `AR metric ${row.ar_metric || '—'} vs YF metric ${row.yf_label || row.yf_metric}`}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {family ? (
          <VariantsPanel family={family} />
        ) : (
          <LegacyValuesPanel row={row} />
        )}

        {family?.reconciliation_walks && family.reconciliation_walks.length > 0 && (
          <WalksPanel family={family} />
        )}

        {explanation && (
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4">
            <p className={cn(SECTION_LABEL_CLASS, 'flex items-center gap-1')}>
              <Info className="h-3 w-3" /> Why this gap exists
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {explanation}
            </p>
            {explanationSource && (
              <p className="mt-2 text-[10px] text-muted-foreground">{explanationSource}</p>
            )}
          </div>
        )}

        {row.definition_from_ar && (
          <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
            <p className={SECTION_LABEL_CLASS}>Definition from the annual report</p>
            <p className="mt-2 text-sm leading-relaxed">{row.definition_from_ar}</p>
          </div>
        )}

        {!explanation && !row.definition_from_ar && !family && (
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
            No reconciliation reasoning has been recorded for this metric yet. Common drivers of
            AR ↔ YF gaps: scope (consolidation, minority interests), timing (period cutoff,
            restated comparatives), classification (adjusted vs IFRS, operating vs financial),
            or one-off items not flagged in YF.
          </div>
        )}
      </div>
    </>
  );
}

function LegacyValuesPanel({ row }: { row: FinancialBridgeRow }) {
  const yfDisp =
    row.yf_value != null && Math.abs(row.yf_value) > 1e6 ? row.yf_value / 1e6 : row.yf_value;
  return (
    <div className="grid grid-cols-3 gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4">
      <div>
        <p className={SECTION_LABEL_CLASS}>Annual Report</p>
        <p className="mt-1 text-lg font-semibold tabular-nums" style={{ color: AR_COLOR }}>
          {fmtNum(row.ar_value)}
        </p>
        <p className="text-[11px] text-muted-foreground">{row.ar_unit}</p>
      </div>
      <div>
        <p className={SECTION_LABEL_CLASS}>Yahoo Finance</p>
        <p className="mt-1 text-lg font-semibold tabular-nums" style={{ color: YF_COLOR }}>
          {fmtNum(yfDisp as number | null | undefined)}
        </p>
        <p className="text-[11px] text-muted-foreground">{row.ar_unit}</p>
      </div>
      <div>
        <p className={SECTION_LABEL_CLASS}>Gap</p>
        <p className="mt-1 text-lg font-semibold tabular-nums">{fmtDelta(row.gap_pct)}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {row.comparability && (
            <Badge variant="outline" className={cn('rounded-full text-[10px]', compToneClass(row.comparability))}>
              {row.comparability.replace(/_/g, ' ')}
            </Badge>
          )}
          {row.review_confidence && (
            <Badge variant="outline" className={cn('rounded-full text-[10px]', confidenceTone(row.review_confidence))}>
              confidence: {row.review_confidence}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

const VARIANT_DESCRIPTIONS: Record<string, string> = {
  statutory: 'As reported on the consolidated IFRS income statement / balance sheet.',
  adjusted: 'Company APM. Excludes items management classifies as non-recurring.',
  before_exceptionals: "Excludes items the company labels 'exceptional'.",
  before_ppa: 'Excludes amortisation of acquired intangibles (PPA amortisation).',
  pro_forma: 'Restated as if recent M&A happened at period start.',
  constant_currency: 'Normalised to a prior-year FX rate.',
  organic: 'Excludes contribution from M&A.',
  segment: 'Segment-level figure (not the consolidated group total).',
};

// Whether YF's value can be meaningfully called a "match" for any AR
// variant. If the smallest residual after alignment is huge (>20%), we
// should NOT highlight any AR variant as "closest" — YF is using an
// IFRS-statutory definition the AR data doesn't separately surface.
const YF_MATCH_THRESHOLD_PCT = 20;

function VariantsPanel({ family }: { family: FinancialMetricFamily }) {
  const variants = Object.values(family.variants ?? {});
  const yfCmp = family.yf_comparable;
  const unit = family.unit || '';
  const yfValue = yfCmp?.value_focus_year ?? null;
  const residualPct = yfCmp?.residual_gap_pct ?? null;
  const hasYf = yfValue !== null && yfValue !== undefined;
  const matchIsMeaningful =
    residualPct !== null &&
    residualPct !== undefined &&
    Math.abs(residualPct) < YF_MATCH_THRESHOLD_PCT;
  const matchedVariant = matchIsMeaningful ? yfCmp?.variant_matched : undefined;

  // Are all AR variants within 1% of each other? If so, they're effectively
  // the same number published under different labels.
  const focusValues = variants
    .map(v => v.focus_year_value)
    .filter((v): v is number => v !== null && v !== undefined);
  const allConverge =
    focusValues.length > 1 &&
    (Math.max(...focusValues) - Math.min(...focusValues)) / Math.max(...focusValues.map(Math.abs)) < 0.01;

  return (
    <div className="space-y-3">
      {/* ─── Yahoo Finance (always first, prominent) ─────────────────── */}
      {hasYf && (
        <div className="rounded-2xl border-2 border-amber-500/25 bg-amber-500/[0.04] p-4">
          <div className="flex items-baseline justify-between">
            <div>
              <p className={SECTION_LABEL_CLASS}>Yahoo Finance</p>
              <p className="mt-1 text-xs text-muted-foreground">
                IFRS-statutory definition (third-party feed)
              </p>
            </div>
            <p className="text-2xl font-semibold tabular-nums" style={{ color: YF_COLOR }}>
              {fmtNum(yfValue)}
              <span className="ml-1.5 text-xs text-muted-foreground font-normal">{unit}</span>
            </p>
          </div>
        </div>
      )}

      {/* ─── Annual Report variants ──────────────────────────────────── */}
      <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <p className={SECTION_LABEL_CLASS}>
            Annual Report — {variants.length} variant{variants.length === 1 ? '' : 's'} from company
          </p>
          <p className="text-[10px] text-muted-foreground">{unit}</p>
        </div>

        {allConverge && (
          <div className="mb-3 rounded-lg border border-blue-500/25 bg-blue-500/[0.04] px-3 py-2 text-xs text-blue-700">
            <span className="font-semibold">Note:</span> All variants converge within 1% for this
            year — the company presents the same figure under multiple labels.
          </div>
        )}

        <div className="space-y-2">
          {variants.map((v) => {
            const isMatched = matchedVariant === v.variant;
            const description = VARIANT_DESCRIPTIONS[v.variant];
            return (
              <div
                key={v.variant}
                className={cn(
                  'rounded-xl border p-3 transition-colors',
                  isMatched ? 'border-primary/45 bg-primary/[0.05]' : 'border-border/60 bg-background/70',
                )}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="rounded-full text-[10px] capitalize">
                        {v.variant.replace(/_/g, ' ')}
                      </Badge>
                      {isMatched && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                          ◄ matches Yahoo
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm truncate">{v.label_in_ar}</p>
                    {description && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
                    )}
                  </div>
                  <p className="text-lg font-semibold tabular-nums shrink-0" style={{ color: AR_COLOR }}>
                    {fmtNum(v.focus_year_value)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Gap interpretation ──────────────────────────────────────── */}
      {hasYf && residualPct !== null && residualPct !== undefined && (
        <div className={cn(
          'rounded-xl border p-3 text-xs',
          Math.abs(residualPct) < 1
            ? 'border-emerald-500/25 bg-emerald-500/[0.04] text-emerald-700'
            : Math.abs(residualPct) < YF_MATCH_THRESHOLD_PCT
              ? 'border-amber-500/25 bg-amber-500/[0.04] text-amber-700'
              : 'border-destructive/25 bg-destructive/[0.04] text-destructive',
        )}>
          {Math.abs(residualPct) < 1 ? (
            <span>
              <span className="font-semibold">AR and YF agree</span> — residual {fmtDelta(residualPct)}.
            </span>
          ) : matchIsMeaningful ? (
            <span>
              <span className="font-semibold">Minor gap: {fmtDelta(residualPct)}</span> vs Yahoo's
              definition. Common drivers: IFRS 16 lease treatment, impairment classification, timing.
            </span>
          ) : (
            <span>
              <span className="font-semibold">Large gap: {fmtDelta(residualPct)}</span> — Yahoo uses
              the IFRS-statutory line, but this annual report appears to publish only APM variants.
              No true apples-to-apples AR counterpart was extracted.
            </span>
          )}
        </div>
      )}

      {(family.primary_for_trend || family.primary_for_peers) && (
        <div className="flex flex-wrap gap-3 rounded-xl border border-border/50 bg-background/60 p-3 text-[11px] text-muted-foreground">
          {family.primary_for_trend && (
            <span>
              <span className="font-semibold text-foreground">Primary for trend:</span>{' '}
              {family.primary_for_trend.replace(/_/g, ' ')}
            </span>
          )}
          {family.primary_for_peers && (
            <span>
              <span className="font-semibold text-foreground">Primary for peer comparison:</span>{' '}
              {family.primary_for_peers.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function WalksPanel({ family }: { family: FinancialMetricFamily }) {
  const walks = family.reconciliation_walks ?? [];
  if (walks.length === 0) return null;
  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
      <p className={cn(SECTION_LABEL_CLASS, 'mb-2')}>Reconciliation walks</p>
      <div className="space-y-3">
        {walks.map((w, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="rounded-full text-[10px] capitalize">
                  {w.from_variant.replace(/_/g, ' ')}
                </Badge>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <Badge variant="outline" className="rounded-full text-[10px] capitalize">
                  {w.to_variant.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  'font-semibold tabular-nums',
                  w.delta > 0 ? 'text-emerald-600' : 'text-destructive',
                )}>
                  {w.delta > 0 ? '+' : ''}{fmtNum(w.delta)}
                </span>
                {w.confidence && (
                  <Badge variant="outline" className={cn('rounded-full text-[10px]', confidenceTone(w.confidence))}>
                    {w.confidence}
                  </Badge>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-foreground">{w.reason}</p>
            {w.components && w.components.length > 0 && (
              <div className="mt-2 space-y-1 border-t border-border/40 pt-2 text-xs">
                {w.components.map((c, j) => (
                  <div key={j} className="flex items-baseline justify-between text-muted-foreground">
                    <span>{c.label}</span>
                    <span className="tabular-nums">{fmtNum(c.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   EARNINGS QUALITY PAGE — AR-vs-YF quality-of-earnings forensics
============================================================ */

function EarningsQualityPage({ data }: { data: FinancialEarningsQuality }) {
  const verdictStyle: Record<string, string> = {
    clean: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    mixed: 'bg-amber-100 text-amber-800 border-amber-200',
    concerning: 'bg-red-100 text-red-800 border-red-200',
    limited: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const hasData =
    data.bridge_assessment.length > 0 ||
    data.historical_patterns.length > 0 ||
    data.one_time_dressings.length > 0 ||
    data.disclosure_gaps.length > 0;

  return (
    <div className="space-y-6">
      {/* Verdict banner */}
      <Card className="border-2">
        <CardContent className="p-6 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                verdictStyle[data.overall_verdict] ?? verdictStyle.mixed
              )}
            >
              {data.overall_verdict}
            </span>
            <span className="text-sm text-muted-foreground">
              Earnings Quality Verdict
            </span>
          </div>
          <p className="text-lg font-medium leading-relaxed">{data.one_liner}</p>
          {data.summary && (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {data.summary}
            </p>
          )}
          {data.methodology_note && (
            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <strong>Methodology note:</strong> {data.methodology_note}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Red flags */}
      {data.red_flags.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-900">
              <AlertTriangle className="h-4 w-4" />
              Red Flags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 list-decimal list-inside text-sm text-red-900">
              {data.red_flags.map((rf, i) => (
                <li key={i} className="leading-relaxed">
                  {rf}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Bridge assessment */}
      {data.bridge_assessment.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              AR vs Yahoo Finance — Bridge Assessment
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Rows sorted aggressive-first. <strong>Aggressive</strong> means the
              annual report is presenting this metric more favorably than Yahoo
              Finance — the primary flag.
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead className="text-right">AR</TableHead>
                    <TableHead className="text-right">YF</TableHead>
                    <TableHead className="text-right">Gap %</TableHead>
                    <TableHead>Favorability</TableHead>
                    <TableHead>Severity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.bridge_assessment.map((row, i) => (
                    <BridgeAssessmentRow key={i} row={row} />
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historical patterns */}
      {data.historical_patterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historical Patterns</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Multi-year signals that single-year gaps cannot reveal.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.historical_patterns.map((p, i) => (
              <HistoricalPatternCard key={i} pattern={p} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* One-time dressings */}
      {data.one_time_dressings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">One-Time Dressings</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Non-recurring items that inflate or deflate current-period headlines.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.one_time_dressings.map((d, i) => (
              <OneTimeDressingCard key={i} item={d} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Disclosure gaps */}
      {data.disclosure_gaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Disclosure Gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.disclosure_gaps.map((g, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <SeverityBadge severity={g.severity} />
                  <div className="flex-1">
                    <div className="font-medium">{g.metric}</div>
                    <div className="text-xs text-muted-foreground">{g.impact}</div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {!hasData && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No earnings-quality signals detected for this period.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FavorabilityBadge({ favorability }: { favorability: EqFavorability }) {
  const styles: Record<EqFavorability, string> = {
    aggressive: 'bg-red-100 text-red-800 border-red-200',
    disclosure_gap: 'bg-amber-100 text-amber-800 border-amber-200',
    conservative: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    aligned: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  const labels: Record<EqFavorability, string> = {
    aggressive: 'Aggressive (AR > YF)',
    disclosure_gap: 'Disclosure gap',
    conservative: 'Conservative',
    aligned: 'Aligned',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        styles[favorability] ?? styles.aligned
      )}
    >
      {labels[favorability] ?? favorability}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: EqSeverity }) {
  const styles: Record<EqSeverity, string> = {
    high: 'bg-red-600 text-white',
    medium: 'bg-amber-500 text-white',
    low: 'bg-slate-400 text-white',
    none: 'bg-slate-200 text-slate-700',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold uppercase',
        styles[severity] ?? styles.none
      )}
    >
      {severity}
    </span>
  );
}

function BridgeAssessmentRow({ row }: { row: EqBridgeMetric }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow
        onClick={() => setOpen(o => !o)}
        className="cursor-pointer hover:bg-muted/40"
      >
        <TableCell>
          <div className="font-medium">{row.metric_name}</div>
          <div className="text-xs text-muted-foreground">{row.concept}</div>
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {row.ar_value === null ? '—' : fmtNum(row.ar_value)}
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {row.yf_value === null ? '—' : fmtNum(row.yf_value)}
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {row.gap_pct === null ? '—' : `${row.gap_pct.toFixed(1)}%`}
        </TableCell>
        <TableCell>
          <FavorabilityBadge favorability={row.favorability} />
        </TableCell>
        <TableCell>
          <SeverityBadge severity={row.severity} />
        </TableCell>
      </TableRow>
      {open && row.interpretation && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={6} className="text-sm text-muted-foreground">
            {row.interpretation}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function HistoricalPatternCard({ pattern }: { pattern: EqHistoricalPattern }) {
  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="font-medium text-sm">{pattern.title}</div>
        <SeverityBadge severity={pattern.severity} />
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {pattern.years_covered.length > 0 && (
          <span>
            Years: {pattern.years_covered[0]}–
            {pattern.years_covered[pattern.years_covered.length - 1]}
          </span>
        )}
        {pattern.favorable_years_count !== null &&
          pattern.favorable_years_count !== undefined &&
          pattern.unfavorable_years_count !== null &&
          pattern.unfavorable_years_count !== undefined && (
            <span>
              Favorable: <strong>{pattern.favorable_years_count}</strong> of{' '}
              {pattern.favorable_years_count + pattern.unfavorable_years_count}
            </span>
          )}
        {pattern.cumulative_impact_eur_m !== null &&
          pattern.cumulative_impact_eur_m !== undefined && (
            <span>
              Cumulative impact:{' '}
              <strong
                className={cn(
                  pattern.cumulative_impact_eur_m > 0
                    ? 'text-red-700'
                    : 'text-emerald-700'
                )}
              >
                EUR {fmtNum(pattern.cumulative_impact_eur_m)}m
              </strong>
            </span>
          )}
      </div>
      {pattern.narrative && (
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {pattern.narrative}
        </p>
      )}
    </div>
  );
}

function OneTimeDressingCard({ item }: { item: EqOneTimeDressing }) {
  const sign = item.amount_eur_m >= 0 ? '+' : '';
  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="font-medium text-sm">{item.item}</div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tabular-nums">
            EUR {sign}
            {fmtNum(item.amount_eur_m)}m
          </span>
          {item.recurring && (
            <Badge
              variant="outline"
              className="border-amber-300 bg-amber-50 text-amber-800 text-[10px]"
            >
              Recurring
            </Badge>
          )}
        </div>
      </div>
      {item.affects.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.affects.map(a => (
            <Badge key={a} variant="secondary" className="text-[10px]">
              {a}
            </Badge>
          ))}
        </div>
      )}
      {item.why_it_matters && (
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {item.why_it_matters}
        </p>
      )}
    </div>
  );
}

/* ============================================================
   SEGMENTS PAGE — overview cards then detail
============================================================ */

function SegmentsPage({ segments, guidance }: { segments: FinancialSegment[]; guidance: any[] }) {
  const mainSegs = segments.filter(s => !s.is_reconciling_item);
  const recon = segments.filter(s => s.is_reconciling_item);
  const [selected, setSelected] = useState<string | null>(null);

  const segGuidance = (segName: string) =>
    guidance.filter(g => String(g.segment || '').toLowerCase() === segName.toLowerCase());

  return (
    <div className="space-y-6">
      <SectionShell
        icon={Building2}
        title="Segments overview"
        subtitle="Click a segment for the full picture, including guidance targets."
        count={mainSegs.length}
      >
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {mainSegs.map((s, i) => (
            <SegmentTile
              key={i}
              segment={s}
              isSelected={selected === s.segment}
              onClick={() => setSelected(selected === s.segment ? null : s.segment)}
            />
          ))}
        </div>
      </SectionShell>

      {selected && (() => {
        const seg = mainSegs.find(s => s.segment === selected);
        if (!seg) return null;
        const sg = segGuidance(seg.segment);
        return (
          <SectionShell
            icon={ChevronRight}
            title={`${seg.segment} — detail`}
          >
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Stat label="Revenue" value={fmtNum(seg.revenue)} hint="mn" />
              <Stat label="Revenue YoY" value={fmtDelta(seg.revenue_yoy)} dir={yoySign(seg.revenue_yoy)} />
              <Stat label="Organic growth" value={fmtDelta(seg.organic_growth)} dir={yoySign(seg.organic_growth)} />
              <Stat label="Revenue mix" value={fmtPct(seg.revenue_mix_pct)} />
              <Stat label="EBITA" value={fmtNum(seg.ebita)} hint="mn" />
              <Stat label="EBITA margin" value={fmtPct(seg.ebita_margin)} />
              <Stat label="EBITA mix" value={fmtPct(seg.ebita_mix_pct)} />
            </div>

            {sg.length > 0 && (
              <div className="mt-4">
                <p className={cn(SECTION_LABEL_CLASS, 'mb-2')}>Guidance targets for this segment</p>
                <GuidanceTable items={sg} />
              </div>
            )}
          </SectionShell>
        );
      })()}

      <SectionShell icon={Activity} title="Comparative view">
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Revenue & EBITA by Segment" unit="mn">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mainSegs.map(s => ({
                name: s.segment, revenue: s.revenue, ebita: s.ebita,
              }))} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => (v == null ? '—' : fmtNum(v))} />
                <Bar dataKey="revenue" name="Revenue" fill={AR_COLOR} />
                <Bar dataKey="ebita" name="EBITA" fill={YF_COLOR} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="EBITA Margin by Segment" unit="%">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mainSegs.map(s => ({ name: s.segment, margin: s.ebita_margin }))}
                margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: any) => fmtPct(v, 0)} />
                <Tooltip formatter={(v: any) => (v == null ? '—' : fmtPct(v))} />
                <Bar dataKey="margin" name="EBITA margin %">
                  {mainSegs.map((s, i) => (
                    <Cell key={i} fill={s.ebita_margin && s.ebita_margin > 15 ? '#10b981' : s.ebita_margin && s.ebita_margin > 8 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </SectionShell>

      {recon.length > 0 && (
        <FoldableSection icon={Info} title="Reconciling items" count={recon.length} defaultOpen={false}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">EBITA</TableHead>
                <TableHead className="text-right">EBITA mix</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recon.map((s, i) => (
                <TableRow key={i} className="text-muted-foreground italic">
                  <TableCell>{s.segment}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtNum(s.revenue)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtNum(s.ebita)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPct(s.ebita_mix_pct)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </FoldableSection>
      )}
    </div>
  );
}

function SegmentTile({
  segment,
  isSelected,
  onClick,
}: {
  segment: FinancialSegment;
  isSelected: boolean;
  onClick: () => void;
}) {
  const dir = yoySign(segment.revenue_yoy);
  const Icon = dir === 'up' ? TrendingUp : dir === 'down' ? TrendingDown : Activity;
  const trendClr = dir === 'up' ? 'text-emerald-600' : dir === 'down' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group rounded-2xl border bg-card/70 p-4 text-left shadow-sm transition-all',
        isSelected
          ? 'border-primary/45 bg-primary/[0.04] shadow-md'
          : 'border-border/60 hover:border-primary/30 hover:shadow-md',
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={SECTION_LABEL_CLASS}>Segment</p>
          <h4 className="mt-1 text-base font-semibold capitalize">{segment.segment}</h4>
        </div>
        <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', isSelected && 'rotate-90')} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground">Revenue</p>
          <p className="text-lg font-semibold tabular-nums">{fmtNum(segment.revenue)}</p>
          <div className={cn('mt-0.5 flex items-center gap-1 text-[11px]', trendClr)}>
            <Icon className="h-3 w-3" /> {fmtDelta(segment.revenue_yoy)} YoY
          </div>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">EBITA margin</p>
          <p className="text-lg font-semibold tabular-nums">{fmtPct(segment.ebita_margin)}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{fmtPct(segment.ebita_mix_pct)} of group</p>
        </div>
      </div>
    </button>
  );
}

function Stat({ label, value, hint, dir }: { label: string; value: string; hint?: string; dir?: 'up' | 'down' | 'flat' }) {
  const trendClr = dir === 'up' ? 'text-emerald-600' : dir === 'down' ? 'text-destructive' : '';
  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-3">
      <p className={SECTION_LABEL_CLASS}>{label}</p>
      <p className={cn('mt-1 text-lg font-semibold tabular-nums', trendClr)}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function GuidanceTable({ items }: { items: any[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead>Period</TableHead>
            <TableHead>Segment</TableHead>
            <TableHead>Metric</TableHead>
            <TableHead>Target</TableHead>
            <TableHead className="text-right">Actual</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((g: any, i: number) => (
            <TableRow key={i}>
              <TableCell className="whitespace-nowrap text-xs">{g.target_period}</TableCell>
              <TableCell className="text-xs">{g.segment}</TableCell>
              <TableCell className="text-xs font-medium">{g.metric}</TableCell>
              <TableCell className="max-w-[260px] truncate text-xs text-muted-foreground" title={g.guidance_text || g.target_display}>
                {g.is_qualitative ? (g.guidance_text || 'qualitative') : g.target_display}
              </TableCell>
              <TableCell className="text-right text-xs tabular-nums">
                {g.actual_value != null ? fmtNum(g.actual_value) : '—'}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={cn('rounded-full text-[10px]', statusTone(g.status))}>
                  {g.status || 'pending'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ============================================================
   RATIOS & HISTORICALS PAGE
============================================================ */

function RatiosHistoricalPage({ ratios, historical }: { ratios?: any; historical?: any }) {
  const grouped = useMemo(() => groupHistoricalRows(historical?.rows ?? []), [historical]);
  return (
    <div className="space-y-6">
      {ratios && <RatioCardsBlock ratios={ratios} />}
      {historical && historical.rows?.length > 0 && (
        <HistoricalTableCard years={historical.years} groups={grouped} />
      )}
    </div>
  );
}

function RatioCardsBlock({ ratios }: { ratios: any }) {
  const groups: Array<{ label: string; items?: FinancialRatioCard[]; icon: any }> = [
    { label: 'Profitability & Returns', items: ratios.profitability_returns, icon: TrendingUp },
    { label: 'Liquidity & Solvency', items: ratios.liquidity_solvency, icon: ShieldCheck },
    { label: 'Efficiency', items: ratios.efficiency, icon: Gauge },
    { label: 'Valuation', items: ratios.valuation_governance, icon: CircleDollarSign },
  ];

  const formatValue = (c: FinancialRatioCard): string => {
    if (c.value === null || c.value === undefined) return '—';
    if (c.kind === 'pct') return fmtPct(c.value);
    if (c.kind === 'ratio') return fmtRatio(c.value);
    return fmtNum(c.value);
  };

  return (
    <SectionShell icon={Gauge} title="Ratio Dashboard">
      <div className="space-y-5">
        {groups.map(group => {
          if (!group.items || group.items.length === 0) return null;
          const Icon = group.icon;
          return (
            <div key={group.label}>
              <p className={cn(SECTION_LABEL_CLASS, 'mb-2 flex items-center gap-1.5')}>
                <Icon className="h-3 w-3" /> {group.label}
              </p>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                {group.items.map((c, i) => (
                  <div key={i} className="rounded-2xl border border-border/60 bg-card/70 p-4">
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums">{formatValue(c)}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {ratios.dupont && (
          <div>
            <p className={cn(SECTION_LABEL_CLASS, 'mb-2')}>DuPont Decomposition</p>
            <div className="grid gap-2 md:grid-cols-4">
              <DupontCard label="Net Margin" value={ratios.dupont.net_margin_pct} kind="pct" />
              <DupontCard label="Asset Turnover" value={ratios.dupont.asset_turnover} kind="ratio" />
              <DupontCard label="Financial Leverage" value={ratios.dupont.financial_leverage} kind="ratio" />
              <DupontCard label="ROE" value={ratios.dupont.roe_pct} kind="pct" highlight />
            </div>
          </div>
        )}
      </div>
    </SectionShell>
  );
}

function DupontCard({
  label,
  value,
  kind,
  highlight = false,
}: {
  label: string;
  value?: number;
  kind: 'pct' | 'ratio';
  highlight?: boolean;
}) {
  const display = value == null ? '—' : kind === 'pct' ? fmtPct(value) : fmtRatio(value);
  return (
    <div className={cn(
      'rounded-2xl border bg-card/70 p-4',
      highlight ? 'border-primary/45 bg-primary/[0.05]' : 'border-border/60',
    )}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{display}</p>
    </div>
  );
}

function HistoricalTableCard({
  years,
  groups,
}: {
  years: Array<string | number>;
  groups: ReturnType<typeof groupHistoricalRows>;
}) {
  const [search, setSearch] = useState('');
  const q = search.toLowerCase().trim();

  const filterRows = (rows: FinancialHistoricalRow[]) =>
    q ? rows.filter(r => r.metric.toLowerCase().includes(q)) : rows;

  const filteredGroups = {
    income: filterRows(groups.income),
    balance: filterRows(groups.balance),
    cash: filterRows(groups.cash),
    other: filterRows(groups.other),
  };
  const totalFiltered = filteredGroups.income.length + filteredGroups.balance.length + filteredGroups.cash.length + filteredGroups.other.length;

  return (
    <SectionShell
      icon={FileText}
      title="Full Historical Data"
      subtitle="AR (blue) and YF (amber) shown side-by-side per metric."
    >
      <div className="mb-3 flex items-center gap-3">
        <input
          type="text"
          placeholder="Search metrics..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-8 w-64 rounded-lg border border-border/60 bg-background px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
        {q && <span className="text-xs text-muted-foreground">{totalFiltered} result{totalFiltered !== 1 ? 's' : ''}</span>}
      </div>

      <Tabs defaultValue={groups.income.length ? 'income' : groups.balance.length ? 'balance' : 'cash'}>
        <TabsList className="mb-3 rounded-xl">
          {filteredGroups.income.length > 0 && <TabsTrigger value="income" className="rounded-lg">Income ({filteredGroups.income.length})</TabsTrigger>}
          {filteredGroups.balance.length > 0 && <TabsTrigger value="balance" className="rounded-lg">Balance ({filteredGroups.balance.length})</TabsTrigger>}
          {filteredGroups.cash.length > 0 && <TabsTrigger value="cash" className="rounded-lg">Cash ({filteredGroups.cash.length})</TabsTrigger>}
          {filteredGroups.other.length > 0 && <TabsTrigger value="other" className="rounded-lg">Other ({filteredGroups.other.length})</TabsTrigger>}
        </TabsList>

        {(['income', 'balance', 'cash', 'other'] as const).map(key => {
          const rows = filteredGroups[key];
          if (!rows || rows.length === 0) return null;
          return (
            <TabsContent key={key} value={key}>
              <HistoricalTable years={years} rows={rows} />
            </TabsContent>
          );
        })}
      </Tabs>
    </SectionShell>
  );
}

function HistoricalTable({
  years,
  rows,
}: {
  years: Array<string | number>;
  rows: FinancialHistoricalRow[];
}) {
  const formatV = (v: number | null | undefined, unit: string) => {
    if (v === null || v === undefined) return '—';
    if (unit === '%') return fmtPct(v);
    return fmtNum(v);
  };

  // Group rows by family_key. Rows with no family_key render as standalone
  // entries (e.g. margins, ratios that didn't make it into a family).
  // Within a family: the statutory variant (or the single variant) is the
  // primary row shown by default, paired with YF where available. Other
  // variants (adjusted, before_exceptionals, ...) render inside a
  // collapsible "N variant(s) from company" block.
  type RowGroup = {
    familyKey: string | null;
    primary: FinancialHistoricalRow;
    apmVariants: FinancialHistoricalRow[];
  };

  const groups: RowGroup[] = [];
  const byFamily = new Map<string, RowGroup>();
  for (const r of rows) {
    const fk = r.family_key ?? null;
    if (!fk) {
      groups.push({ familyKey: null, primary: r, apmVariants: [] });
      continue;
    }
    const existing = byFamily.get(fk);
    const isStatutory = (r.variant ?? 'statutory') === 'statutory';
    const hasYfRow = !!(r.yf_values && r.yf_values.some(v => v != null));
    if (!existing) {
      const g: RowGroup = { familyKey: fk, primary: r, apmVariants: [] };
      byFamily.set(fk, g);
      groups.push(g);
    } else {
      const existingIsStatutory = (existing.primary.variant ?? 'statutory') === 'statutory';
      const existingHasYf = !!(existing.primary.yf_values && existing.primary.yf_values.some(v => v != null));
      // Prefer: (a) row that is statutory, (b) row that carries YF, (c) first seen.
      const shouldReplace =
        (isStatutory && !existingIsStatutory) ||
        (isStatutory === existingIsStatutory && hasYfRow && !existingHasYf);
      if (shouldReplace) {
        existing.apmVariants.push(existing.primary);
        existing.primary = r;
      } else {
        existing.apmVariants.push(r);
      }
    }
  }

  return (
    <div className="space-y-2">
      {/* Shared year header — one row above all family blocks. Column widths
          align with the family-block tables below because every row in the
          doc uses the same column structure (metric / unit / source / years). */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/30">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-muted/30 w-[220px]">Metric</TableHead>
                <TableHead className="w-[60px]">Unit</TableHead>
                <TableHead className="w-[52px]">Source</TableHead>
                {years.map(y => (
                  <TableHead key={String(y)} className="text-right whitespace-nowrap">
                    {y}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
          </Table>
        </div>
      </div>
      {groups.map((g, gi) => (
        <FamilyBlock
          key={`${g.familyKey ?? 'none'}-${gi}`}
          group={g}
          years={years}
          formatV={formatV}
        />
      ))}
    </div>
  );
}

function FamilyBlock({
  group,
  years,
  formatV,
}: {
  group: {
    familyKey: string | null;
    primary: FinancialHistoricalRow;
    apmVariants: FinancialHistoricalRow[];
  };
  years: Array<string | number>;
  formatV: (v: number | null | undefined, unit: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const { primary, apmVariants } = group;
  const hasYf = !!(primary.yf_values && primary.yf_values.some(v => v != null));
  const hasApm = apmVariants.length > 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/70">
      <div className="overflow-x-auto">
        <Table>
          <TableBody>
            {/* Primary row (AR — statutory or first variant) */}
            <TableRow className={hasYf ? 'border-b-0' : ''}>
              <TableCell rowSpan={hasYf ? 2 : 1} className="sticky left-0 bg-background align-top w-[220px]">
                <div className="font-medium">{primary.metric}</div>
                {primary.variant && primary.variant !== 'statutory' && (
                  <div className="mt-0.5 text-[10px] text-muted-foreground capitalize">
                    {primary.variant.replace(/_/g, ' ')}
                  </div>
                )}
              </TableCell>
              <TableCell rowSpan={hasYf ? 2 : 1} className="text-xs text-muted-foreground w-[60px]">
                {primary.unit}
              </TableCell>
              <TableCell className="text-xs w-[52px]">
                <span className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${AR_COLOR}1A`, color: AR_COLOR }}>
                  AR
                </span>
              </TableCell>
              {primary.values.map((v, j) => (
                <TableCell
                  key={j}
                  className="text-right tabular-nums text-xs"
                  style={{ color: v == null ? undefined : AR_COLOR }}
                >
                  {formatV(v, primary.unit)}
                </TableCell>
              ))}
            </TableRow>

            {/* YF row (only for rows where we have a YF counterpart) */}
            {hasYf && (
              <TableRow>
                <TableCell className="text-xs">
                  <span className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${YF_COLOR}1A`, color: YF_COLOR }}>
                    YF
                  </span>
                </TableCell>
                {primary.yf_values!.map((v, j) => (
                  <TableCell
                    key={j}
                    className="text-right tabular-nums text-xs"
                    style={{ color: v == null ? undefined : YF_COLOR }}
                  >
                    {formatV(v, primary.unit)}
                  </TableCell>
                ))}
              </TableRow>
            )}

            {/* Expandable APM variants (company-only) */}
            {hasApm && expanded && apmVariants.map((v, vi) => (
              <TableRow key={`apm-${vi}`} className="bg-muted/10">
                <TableCell className="sticky left-0 bg-muted/10 align-top pl-6 text-xs">
                  <div className="text-foreground">{v.metric}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground capitalize">
                    {v.variant?.replace(/_/g, ' ') || '—'}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{v.unit}</TableCell>
                <TableCell className="text-xs">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px]"
                    style={{ backgroundColor: `${AR_COLOR}1A`, color: AR_COLOR }}
                  >
                    AR · APM
                  </span>
                </TableCell>
                {v.values.map((val, j) => (
                  <TableCell
                    key={j}
                    className="text-right tabular-nums text-xs"
                    style={{ color: val == null ? undefined : AR_COLOR }}
                  >
                    {formatV(val, v.unit)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* APM expander footer */}
      {hasApm && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="flex w-full items-center justify-between gap-2 border-t border-border/40 bg-muted/20 px-4 py-2 text-left text-xs text-muted-foreground hover:bg-muted/30"
        >
          <span className="flex items-center gap-1.5">
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <span>
              {apmVariants.length} variant{apmVariants.length === 1 ? '' : 's'} from company{' '}
              <span className="font-medium">
                ({apmVariants.map(v => v.variant?.replace(/_/g, ' ') || 'other').join(', ')})
              </span>
            </span>
          </span>
          <span className="text-[10px] italic text-muted-foreground/80">
            not published by Yahoo Finance
          </span>
        </button>
      )}

      {/* Years header at the top — injected via an initial empty row-equivalent.
          Simpler approach: render years as labels only for the first group.
          Here we keep the header implicit via column widths; cleaner rendering
          is done at the wrapper level. */}
    </div>
  );
}

/* ============================================================
   MARKET / GOVERNANCE
============================================================ */

function MarketSnapshotCard({ market }: { market: any }) {
  const rows: Array<[string, string]> = [
    ['Price', market.price_display || fmtNum(market.price, 2)],
    ['Market cap', market.market_cap_display || fmtNum(market.market_cap, 0)],
    ['Enterprise value', market.enterprise_value_display || fmtNum(market.enterprise_value, 0)],
    ['P/E (trailing)', fmtRatio(market.pe_ratio)],
    ['P/E (forward)', fmtRatio(market.forward_pe)],
    ['EV / EBITDA', fmtRatio(market.ev_to_ebitda)],
    ['EV / Revenue', fmtRatio(market.ev_to_revenue)],
    ['P / Book', fmtRatio(market.price_to_book)],
    ['Dividend yield', fmtPct(market.dividend_yield_pct)],
    ['Payout ratio', market.payout_ratio != null ? fmtPct(market.payout_ratio * 100) : '—'],
    ['Beta', fmtNum(market.beta, 2)],
    ['52W range', `${fmtNum(market.fifty_two_week_low, 2)} – ${fmtNum(market.fifty_two_week_high, 2)}`],
    ['52W change', market.fifty_two_week_change_pct != null ? fmtDelta(market.fifty_two_week_change_pct * 100) : '—'],
  ];
  return (
    <Card className="rounded-3xl border-border/60 bg-card/70 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CircleDollarSign className="h-4 w-4 text-primary" /> Market Snapshot
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-2 border-b border-border/40 py-1 last:border-0">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="tabular-nums">{value}</span>
            </div>
          ))}
        </div>
        {market.source && (
          <p className="mt-2 text-[10px] text-muted-foreground">Source: {market.source}</p>
        )}
      </CardContent>
    </Card>
  );
}

function GovernanceCard({ gov }: { gov: any }) {
  const rows: Array<[string, number | undefined]> = [
    ['Overall risk', gov.overall_risk],
    ['Audit risk', gov.audit_risk],
    ['Board risk', gov.board_risk],
    ['Compensation risk', gov.compensation_risk],
    ['Shareholder rights risk', gov.shareholder_rights_risk],
  ];
  const riskColor = (v?: number) => {
    if (v == null) return 'bg-muted';
    if (v <= 3) return 'bg-emerald-500';
    if (v <= 6) return 'bg-amber-500';
    return 'bg-destructive';
  };
  return (
    <Card className="rounded-3xl border-border/60 bg-card/70 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-primary" /> Governance Risk
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {rows.map(([label, v]) => (
            <div key={label}>
              <div className="mb-1 flex items-baseline justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="tabular-nums font-medium">
                  {v != null ? `${v.toFixed(1)} / 10` : '—'}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className={cn('h-full transition-all', riskColor(v))}
                  style={{ width: `${v != null ? Math.min(100, (v / 10) * 100) : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
        {gov.scale_note && (
          <p className="mt-3 text-[10px] text-muted-foreground">{gov.scale_note}</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ============================================================
   SHARED SHELLS
============================================================ */

function SectionShell({
  icon: Icon,
  title,
  subtitle,
  count,
  actions,
  children,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  count?: number;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-3xl border-border/60 bg-card/70 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-primary/10 p-2 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                {title}
                {count !== undefined && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">({count})</span>
                )}
              </CardTitle>
              {subtitle && (
                <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
          {actions}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function FoldableSection({
  icon: Icon,
  title,
  count,
  defaultOpen = false,
  children,
}: {
  icon: any;
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="rounded-3xl border-border/60 bg-card/70 shadow-sm">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full text-left">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-muted text-muted-foreground p-2">
                  <Icon className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-semibold">
                  {title}
                  {count !== undefined && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">({count})</span>
                  )}
                </CardTitle>
              </div>
              <ChevronRight className={cn(
                'h-4 w-4 text-muted-foreground transition-transform',
                open && 'rotate-90',
              )} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>{children}</CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/* ==========================================================================
   WORKING CAPITAL PAGE — deep WC analysis with AR-vs-YF bridge,
   multi-year trajectory, forensic quality signals, and editable notes.
============================================================================ */

const WC_VERDICT_STYLES: Record<string, string> = {
  improving: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  deteriorating: 'bg-red-100 text-red-800 border-red-200',
  mixed: 'bg-amber-100 text-amber-800 border-amber-200',
  stable: 'bg-slate-100 text-slate-700 border-slate-200',
  limited: 'bg-slate-100 text-slate-700 border-slate-200',
};

const WC_PATTERN_SEVERITY_STYLES: Record<string, string> = {
  positive_structural: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  positive_cyclical: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  neutral_scope: 'bg-slate-100 text-slate-700 border-slate-200',
  mixed: 'bg-amber-100 text-amber-800 border-amber-200',
  negative_cyclical: 'bg-red-50 text-red-700 border-red-100',
  negative_structural: 'bg-red-100 text-red-800 border-red-200',
};

const WC_DIRECTION_STYLES: Record<string, string> = {
  positive_for_cash: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  negative_for_cash: 'bg-red-100 text-red-800 border-red-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
};

function WorkingCapitalPage({
  data,
  companyTicker,
}: {
  data: FinancialWorkingCapitalAnalysis;
  companyTicker: string;
}) {
  const notesKey = `wc_notes_${companyTicker}`;
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(notesKey);
      if (stored !== null) setNotes(stored);
      else if (data.custom_notes) setNotes(data.custom_notes);
    } catch {
      /* ignore */
    }
  }, [notesKey, data.custom_notes]);

  const handleNotesChange = (value: string) => {
    setNotes(value);
    try {
      localStorage.setItem(notesKey, value);
    } catch {
      /* ignore */
    }
  };

  // 7-year NWC overview (all years with NWC data — typically FY19-FY25, no gaps)
  const nwcOverviewData = useMemo(() => {
    if (!data.trajectory?.years) return [];
    return data.trajectory.years
      .map((y, i) => ({
        year: y.replace('FY', ''),
        NWC: data.trajectory.nwc_m?.[i] ?? null,
        NWC_pct: data.trajectory.nwc_pct_revenue?.[i] ?? null,
      }))
      .filter((d) => d.NWC !== null || d.NWC_pct !== null);
  }, [data.trajectory]);

  // Efficiency ratios — only show years where at least one ratio has data
  // (trims the FY19-FY21 empty leading years that the user flagged)
  const efficiencyChartData = useMemo(() => {
    if (!data.trajectory?.years) return [];
    return data.trajectory.years
      .map((y, i) => ({
        year: y.replace('FY', ''),
        days_wc: data.trajectory.days_wc?.[i] ?? null,
        dio: data.trajectory.dio_disclosed?.[i] ?? data.trajectory.dio_computed?.[i] ?? null,
        dso: data.trajectory.dso?.[i] ?? null,
        dpo: data.trajectory.dpo?.[i] ?? null,
      }))
      .filter((d) => d.days_wc !== null || d.dio !== null || d.dso !== null || d.dpo !== null);
  }, [data.trajectory]);

  const componentsChartData = useMemo(() => {
    const c = data.components_multi_year;
    if (!c?.years) return [];
    return c.years.map((y, i) => ({
      year: y.replace('FY', ''),
      Inventories: c.inventories?.[i] ?? null,
      'Trade Receivables': c.trade_receivables_net?.[i] ?? null,
      'Trade & Other Payables': c.trade_and_other_payables?.[i] ?? null,
      'Other Current Assets': c.other_current_assets?.[i] ?? null,
      'Other Current Liabilities': c.other_current_liabilities?.[i] ?? null,
    }));
  }, [data.components_multi_year]);

  return (
    <div className="space-y-6">
      {/* Verdict banner */}
      <Card className="border-2">
        <CardContent className="p-6 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                WC_VERDICT_STYLES[data.overall_verdict] ?? WC_VERDICT_STYLES.mixed
              )}
            >
              {data.overall_verdict}
            </span>
            <span className="text-sm text-muted-foreground">
              Working Capital Verdict — focus year FY{data.focus_year}
            </span>
          </div>
          <p className="text-lg font-medium leading-relaxed">{data.one_liner}</p>
          {data.summary && (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {data.summary}
            </p>
          )}
          {data.methodology_note && (
            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <strong>Methodology note:</strong> {data.methodology_note}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Conclusions — fast-read panel. Rendered BEFORE the deep dive. */}
      {data.top_insights && data.top_insights.length > 0 && (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/[0.04] to-transparent">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Fast Read — Key Conclusions
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              The 4 things to know before diving into the detail below.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid gap-2 md:grid-cols-2">
              {data.top_insights.map((ins, i) => (
                <WcTopInsightCard key={i} insight={ins} />
              ))}
            </div>
            {data.bottom_line && (
              <div className="mt-4 rounded-lg border border-primary/30 bg-primary/[0.06] p-4">
                <div className="flex items-start gap-2">
                  <div className="rounded bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary shrink-0">
                    Bottom line
                  </div>
                </div>
                <p className="mt-2 text-sm leading-relaxed font-medium text-foreground">
                  {data.bottom_line}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Headline metrics */}
      {data.headline_metrics?.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
          {data.headline_metrics.map((m) => (
            <WcMetricCard key={m.key} metric={m} />
          ))}
        </div>
      )}

      {/* Red flags — promoted up so the story is visible before the detail */}
      {data.red_flags?.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-900">
              <AlertTriangle className="h-4 w-4" />
              Red Flags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 list-decimal list-inside text-sm text-red-900">
              {data.red_flags.map((rf, i) => (
                <li key={i} className="leading-relaxed">
                  {rf}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* ============ IN-DEPTH ANALYSIS (main story, before AR vs YF) ============ */}
      <WcSectionDivider
        title="In-Depth Analysis"
        subtitle="Multi-year trajectory, components, cash-flow movement, patterns, and forensic signals — the story."
        icon={<Gauge className="h-5 w-5 text-primary" />}
      />

      {/* 1. 7-year NWC overview — NWC bars + NWC/Revenue % line (dual axis) */}
      {nwcOverviewData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">7-Year NWC Trajectory</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              NWC in absolute €m (bars) and NWC as % of revenue (line) — the long-run efficiency picture.
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={nwcOverviewData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="year" stroke="#6b7280" fontSize={12} />
                  <YAxis yAxisId="left" stroke="#2563eb" fontSize={12} label={{ value: 'mn EUR', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#6b7280' }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#dc2626" fontSize={12} label={{ value: '% of revenue', angle: 90, position: 'insideRight', fontSize: 11, fill: '#6b7280' }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="left" dataKey="NWC" fill="#2563eb" name="NWC (€m)" />
                  <Line yAxisId="right" type="monotone" dataKey="NWC_pct" stroke="#dc2626" strokeWidth={2} dot name="NWC % of Revenue" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Efficiency ratios (DIO/DSO/DPO/DaysWC) — only show years with data */}
      {efficiencyChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Efficiency Ratios (days)</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              DIO (Aalberts-disclosed), DSO, DPO, and Days Working Capital. Only years with disclosed
              data are shown ({efficiencyChartData[0]?.year}–{efficiencyChartData[efficiencyChartData.length - 1]?.year}).
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={efficiencyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="year" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} label={{ value: 'days', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#6b7280' }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="days_wc" name="Days WC" stroke="#2563eb" strokeWidth={2.5} dot />
                  <Line type="monotone" dataKey="dio" name="DIO" stroke="#16a34a" strokeWidth={2.5} dot />
                  <Line type="monotone" dataKey="dso" name="DSO" stroke="#f59e0b" strokeWidth={2.5} dot />
                  <Line type="monotone" dataKey="dpo" name="DPO" stroke="#dc2626" strokeWidth={2.5} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Component balances */}
      {componentsChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Balance Sheet Components (mn EUR)</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Year-end positions. <span className="text-emerald-700 font-medium">Green shades = operating assets</span>,{' '}
              <span className="text-red-700 font-medium">red shades = operating liabilities</span>.
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={componentsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="year" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Inventories" fill="#16a34a" />
                  <Bar dataKey="Trade Receivables" fill="#22c55e" />
                  <Bar dataKey="Other Current Assets" fill="#86efac" />
                  <Bar dataKey="Trade & Other Payables" fill="#dc2626" />
                  <Bar dataKey="Other Current Liabilities" fill="#fca5a5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. Cash flow WC movement */}
      {data.cash_flow_movement && data.cash_flow_movement.years?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cash-Flow Statement WC Movement</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-emerald-700 font-medium">Positive = cash released from WC</span> ·{' '}
              <span className="text-red-700 font-medium">negative = cash consumed by WC build</span>.
              This is the organic signal, uncontaminated by scope effects (divestments, acquisitions).
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Line</TableHead>
                    {data.cash_flow_movement.years.map((y) => (
                      <TableHead key={y} className="text-right">{y}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <WcCfRow label="Change in inventories" values={data.cash_flow_movement.change_in_inventories} />
                  <WcCfRow label="Change in trade and other receivables" values={data.cash_flow_movement.change_in_receivables} />
                  <WcCfRow label="Change in trade and other payables" values={data.cash_flow_movement.change_in_payables} />
                  <TableRow className="font-semibold bg-slate-50">
                    <TableCell>Total change in working capital</TableCell>
                    {(data.cash_flow_movement.total_wc_movement ?? []).map((v, i) => (
                      <TableCell key={i} className={cn(
                        'text-right',
                        v != null && v > 0 ? 'text-emerald-700' : v != null && v < 0 ? 'text-red-700' : ''
                      )}>
                        {fmtNum(v, 1)}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            {data.cash_flow_movement.narrative && (
              <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                {data.cash_flow_movement.narrative}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 5. Multi-year patterns */}
      {data.multi_year_patterns?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Multi-Year Patterns</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Structural signals that single-year deltas miss.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.multi_year_patterns.map((p, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="font-medium text-sm flex-1">{p.title}</div>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
                      WC_PATTERN_SEVERITY_STYLES[p.severity] ?? WC_PATTERN_SEVERITY_STYLES.mixed
                    )}
                  >
                    {p.severity.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.narrative}</p>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Years: {p.years_covered.join(', ')}</span>
                  {p.cumulative_impact_eur_m !== null && p.cumulative_impact_eur_m !== undefined && (
                    <span>Impact: {fmtNum(p.cumulative_impact_eur_m, 1)} mn EUR</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 6. Quality signals */}
      {data.quality_signals?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quality Signals</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Forensic signals — where is WC moving against cash generation, and what does it mean?
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.quality_signals.map((s, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="font-medium text-sm flex-1">{s.title}</div>
                  <div className="flex gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
                        WC_DIRECTION_STYLES[s.direction] ?? WC_DIRECTION_STYLES.neutral
                      )}
                    >
                      {s.direction.replace(/_/g, ' ')}
                    </span>
                    <SeverityBadge severity={s.severity === 'none' ? 'low' : (s.severity as EqSeverity)} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.narrative}</p>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  {s.years_affected && <span>Years: {s.years_affected.join(', ')}</span>}
                  {s.cash_impact_eur_m !== null && s.cash_impact_eur_m !== undefined && (
                    <span>Cash impact: {fmtNum(s.cash_impact_eur_m, 1)} mn EUR</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ============ AR ↔ YAHOO FINANCE COMPARISON (at the end) ============ */}
      {(data.ar_vs_yf_wc_bridge?.length > 0 || data.methodology_reconciliation) && (
        <WcSectionDivider
          title="AR ↔ Yahoo Finance Comparison"
          subtitle="Methodology reconciliation — how Aalberts' APM differs from Yahoo Finance's generic WC definition."
          icon={<ShieldCheck className="h-5 w-5 text-primary" />}
        />
      )}

      {/* AR vs YF bridge */}
      {data.ar_vs_yf_wc_bridge?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Side-by-Side WC Bridge</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              AR APM reclassifies items vs YF's generic balance-sheet view. A 23% aggregate gap
              exists because YF includes tax and current provisions that AR's APM strips.
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concept</TableHead>
                    <TableHead className="text-right">AR</TableHead>
                    <TableHead className="text-right">YF</TableHead>
                    <TableHead className="text-right">Gap %</TableHead>
                    <TableHead>Favorability</TableHead>
                    <TableHead>Severity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.ar_vs_yf_wc_bridge.map((row, i) => (
                    <WcBridgeRowComponent key={i} row={row} />
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Methodology reconciliation */}
      {data.methodology_reconciliation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Methodology Walk — line-by-line</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              From statutory balance sheet to Aalberts' APM NWC and to Yahoo Finance's WC.
              The residual gap's composition is the interesting bit.
            </p>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold mb-2">AR APM NWC Walk</h4>
              <Table>
                <TableBody>
                  {data.methodology_reconciliation.ar_apm_nwc_walk.map((ln, i) => (
                    <TableRow key={i}>
                      <TableCell className={cn('text-xs', ln.line.startsWith('=') && 'font-semibold bg-slate-50')}>{ln.line}</TableCell>
                      <TableCell className={cn('text-xs text-right', ln.line.startsWith('=') && 'font-semibold bg-slate-50')}>
                        {typeof ln.value === 'number' ? fmtNum(ln.value, 1) : ln.value}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">YF WC Walk</h4>
              <Table>
                <TableBody>
                  {data.methodology_reconciliation.yf_wc_walk.map((ln, i) => (
                    <TableRow key={i}>
                      <TableCell className={cn('text-xs', ln.line.startsWith('=') && 'font-semibold bg-slate-50')}>{ln.line}</TableCell>
                      <TableCell className={cn('text-xs text-right', ln.line.startsWith('=') && 'font-semibold bg-slate-50')}>
                        {typeof ln.value === 'number' ? fmtNum(ln.value, 1) : ln.value}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="md:col-span-2">
              <h4 className="text-sm font-semibold mb-2">
                Reconciling gap: {fmtNum(data.methodology_reconciliation.reconciling_gap_mn_eur, 1)} mn EUR
              </h4>
              <ul className="space-y-2 text-xs">
                {data.methodology_reconciliation.reconciling_gap_components.map((c, i) => (
                  <li key={i}>
                    <span className="font-medium">{c.item}</span> ({typeof c.amount === 'number' ? fmtNum(c.amount, 1) : c.amount} mn EUR):{' '}
                    <span className="text-muted-foreground">{c.narrative}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disclosure gaps */}
      {data.disclosure_gaps?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Disclosure Gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.disclosure_gaps.map((g, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <SeverityBadge severity={g.severity === 'none' ? 'low' : (g.severity as EqSeverity)} />
                  <div className="flex-1">
                    <div className="font-medium">{g.metric}</div>
                    <div className="text-xs text-muted-foreground">
                      <span className="italic">Expected in: {g.expected_in}. </span>
                      {g.impact}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Peer benchmark — Aalberts (AR + YF) vs listed peers, Ontex-style stacked bar */}
      {data.peer_benchmark && <WcPeerBenchmarkCard peer={data.peer_benchmark} />}

      {/* Personal analyst notes — editable, persisted in localStorage */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            Personal Analyst Notes
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Free-form workspace for your own WC commentary. Saved automatically to this browser
            (localStorage key: <code className="text-[10px]">{notesKey}</code>) — survives refreshes.
          </p>
        </CardHeader>
        <CardContent>
          <textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Add your own observations, questions, follow-ups, or alternative hypotheses here..."
            rows={10}
            className="w-full rounded-md border border-slate-200 bg-white p-3 text-sm font-mono leading-relaxed focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{notes.length.toLocaleString()} chars</span>
            <button
              onClick={() => {
                if (confirm('Clear personal notes for this company?')) {
                  handleNotesChange('');
                }
              }}
              className="text-red-600 hover:text-red-700"
            >
              Clear
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function WcMetricCard({ metric }: { metric: WcHeadlineMetric }) {
  const trendColor = {
    improving: 'text-emerald-600',
    deteriorating: 'text-red-600',
    stable: 'text-slate-500',
    mixed: 'text-amber-600',
  }[metric.trend ?? 'stable'];

  const TrendIcon =
    metric.trend === 'improving' ? TrendingUp :
    metric.trend === 'deteriorating' ? TrendingDown : Activity;

  const fmtValue = (v: number | null | undefined) => {
    if (v === null || v === undefined || Number.isNaN(v)) return '—';
    if (metric.unit === '%') return `${v.toFixed(1)}%`;
    if (metric.unit === 'days') return `${v.toFixed(v === Math.round(v) ? 0 : 1)}d`;
    if (metric.unit === 'mn EUR') return fmtNum(v, 1);
    return fmtNum(v, 1);
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="text-xs font-medium text-muted-foreground">{metric.label}</div>
          <TrendIcon className={cn('h-4 w-4', trendColor)} />
        </div>
        <div className="text-2xl font-semibold">{fmtValue(metric.value)}</div>
        {metric.prior_year !== null && metric.prior_year !== undefined && (
          <div className="text-xs text-muted-foreground">
            vs {fmtValue(metric.prior_year)} PY
            {metric.yoy_change_pct !== null && metric.yoy_change_pct !== undefined && (
              <span className={cn('ml-2 font-medium', trendColor)}>
                {fmtDelta(metric.yoy_change_pct, 1)}
              </span>
            )}
          </div>
        )}
        {metric.commentary && (
          <p className="text-xs text-muted-foreground leading-relaxed pt-1 border-t">
            {metric.commentary}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function WcBridgeRowComponent({ row }: { row: WcBridgeRow }) {
  return (
    <TableRow>
      <TableCell>
        <div className="font-medium text-sm">{row.concept}</div>
        {row.bridge_explanation && (
          <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {row.bridge_explanation}
          </div>
        )}
      </TableCell>
      <TableCell className="text-right font-mono text-sm">
        {row.ar_value === null || row.ar_value === undefined ? '—' : fmtNum(row.ar_value, 1)}
      </TableCell>
      <TableCell className="text-right font-mono text-sm">
        {row.yf_value === null || row.yf_value === undefined ? '—' : fmtNum(row.yf_value, 1)}
      </TableCell>
      <TableCell className="text-right font-mono text-sm">
        {row.gap_pct === null || row.gap_pct === undefined ? '—' : fmtDelta(row.gap_pct, 1)}
      </TableCell>
      <TableCell>
        {row.favorability && <FavorabilityBadge favorability={row.favorability as EqFavorability} />}
      </TableCell>
      <TableCell>
        {row.severity && <SeverityBadge severity={row.severity === 'none' ? 'low' : (row.severity as EqSeverity)} />}
      </TableCell>
    </TableRow>
  );
}

function WcSectionDivider({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="pt-4 pb-1 border-b border-primary/20">
      <div className="flex items-center gap-3">
        {icon && <div className="rounded-lg bg-primary/10 p-2">{icon}</div>}
        <div>
          <h3 className="text-lg font-bold tracking-tight text-foreground">{title}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function WcTopInsightCard({ insight }: { insight: WcTopInsight }) {
  const icon = insight.icon ?? 'neutral';
  const styles = {
    cash_positive: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', Icon: TrendingUp },
    cash_negative: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', Icon: TrendingDown },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', Icon: AlertTriangle },
    neutral: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', Icon: Activity },
  }[icon];
  const { Icon } = styles;
  return (
    <div className={cn('rounded-xl border p-3 space-y-2', styles.bg, styles.border)}>
      <div className="flex items-start gap-2">
        <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', styles.text)} />
        <div className="flex-1 min-w-0">
          <div className={cn('font-semibold text-sm leading-tight', styles.text)}>
            {insight.headline}
          </div>
          {insight.quantified_impact && (
            <div className={cn('mt-1 inline-block rounded-md bg-white/60 px-2 py-0.5 text-xs font-mono font-semibold', styles.text)}>
              {insight.quantified_impact}
            </div>
          )}
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {insight.detail}
      </p>
    </div>
  );
}

function WcCfRow({ label, values }: { label: string; values?: (number | null)[] }) {
  return (
    <TableRow>
      <TableCell className="text-xs">{label}</TableCell>
      {(values ?? []).map((v, i) => (
        <TableCell key={i} className="text-right text-xs">{fmtNum(v, 1)}</TableCell>
      ))}
    </TableRow>
  );
}

/* ==========================================================================
   PEER BENCHMARK — Ontex-style stacked-bar comparing Aalberts (AR + YF)
   against listed peers (e.g. Geberit, IMI). Inline SVG ships from the
   Python pipeline (output/Aalberts/Final Analysis/peer_wc_chart.py).
============================================================================ */

function WcPeerBenchmarkCard({ peer }: { peer: WcPeerBenchmark }) {
  return (
    <div className="space-y-4">
      {/* Section header */}
      <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50/40 to-transparent">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-amber-600" />
            Peer Benchmark — {peer.focus_year ?? 'FY2025'}
          </CardTitle>
          {peer.chart_caption && (
            <p className="text-xs text-muted-foreground mt-1">{peer.chart_caption}</p>
          )}
        </CardHeader>
        {peer.chart_svg && (
          <CardContent>
            <div
              className="overflow-x-auto rounded-md border border-slate-200 bg-white p-2"
              // The SVG is produced by our own Python pipeline; safe static markup.
              dangerouslySetInnerHTML={{ __html: peer.chart_svg }}
            />
          </CardContent>
        )}
      </Card>

      {/* Ratios (focus year) */}
      {peer.ratios_table && peer.ratios_table.rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              FY{peer.focus_year?.replace('FY', '') ?? '2025'} ratios — apples-to-apples on Yahoo Finance basis
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-[10px] uppercase tracking-wide text-muted-foreground">
                  {peer.ratios_table.columns.map((c) => (
                    <th key={c} className="px-2 py-2 text-left font-semibold">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {peer.ratios_table.rows.map((row, ri) => (
                  <tr key={ri} className="border-b last:border-b-0 hover:bg-slate-50/50">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-2 py-2 text-foreground">
                        {cell == null ? '—' : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Trend table */}
      {peer.trend_table_twc_pct_revenue && peer.trend_table_twc_pct_revenue.rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Trade NWC / Revenue % — 4-year trend</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-[10px] uppercase tracking-wide text-muted-foreground">
                  {peer.trend_table_twc_pct_revenue.columns.map((c) => (
                    <th key={c} className="px-2 py-2 text-left font-semibold">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {peer.trend_table_twc_pct_revenue.rows.map((row, ri) => (
                  <tr key={ri} className="border-b last:border-b-0 hover:bg-slate-50/50">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-2 py-2 text-foreground">
                        {cell == null ? '—' : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Read-across narrative */}
      {peer.narrative && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Read-across narrative</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {peer.narrative}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Methodology callout */}
      {peer.methodology_callout && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-slate-600" />
              {peer.methodology_callout.header ?? 'Methodology'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {peer.methodology_callout.formulas_used && (
              <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Formulas
                </p>
                <ul className="space-y-1 text-xs">
                  {Object.entries(peer.methodology_callout.formulas_used).map(([k, v]) => (
                    <li key={k}>
                      <span className="font-semibold text-slate-700">{k}:</span>{' '}
                      <span className="text-muted-foreground">{v}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {peer.methodology_callout.distortions && peer.methodology_callout.distortions.length > 0 && (
              <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Distortions to watch
                </p>
                <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
                  {peer.methodology_callout.distortions.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}
            {peer.methodology_callout.why_two_aalberts_bars && (
              <div className="rounded-md border border-amber-300 bg-amber-50/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 mb-1">
                  Why two Aalberts bars
                </p>
                <p className="text-xs text-muted-foreground">
                  {peer.methodology_callout.why_two_aalberts_bars}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Business mix overlay */}
      {peer.business_mix && Object.keys(peer.business_mix).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-600" />
              Business Mix Overlay
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Read the chart in light of segmental composition: peers with different mixes will have
              structurally different working-capital profiles, not just operationally different ones.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {Object.entries(peer.business_mix).map(([key, mix]) => (
              <div key={key} className="rounded-md border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h4 className="text-sm font-semibold capitalize">{key}</h4>
                  {mix.revenue_total_local !== undefined && mix.currency && (
                    <Badge variant="outline" className="text-[10px]">
                      {mix.currency} {mix.revenue_total_local.toLocaleString()} mn
                    </Badge>
                  )}
                </div>
                {mix.segments && (
                  <ul className="space-y-1 text-xs mb-2">
                    {Object.entries(mix.segments).map(([seg, pct]) => (
                      <li key={seg} className="flex justify-between gap-2">
                        <span className="text-muted-foreground truncate">{seg}</span>
                        <span className="font-medium tabular-nums">{pct}%</span>
                      </li>
                    ))}
                  </ul>
                )}
                {mix.comparable_segment_for_chart && (
                  <p className="text-[11px] italic text-muted-foreground">
                    {mix.comparable_segment_for_chart}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {peer.data_source && (
        <p className="text-[10px] text-muted-foreground italic">
          Data source: <code>{peer.data_source}</code>
        </p>
      )}
    </div>
  );
}

/* ==========================================================================
   GUIDE PAGE — how to read each tab, what the verdicts mean, where the
   numbers come from. Pure documentation, styled to match the dashboard.
============================================================================ */

function GuidePage({
  hasEarningsQuality,
  hasWorkingCapital,
}: {
  hasEarningsQuality: boolean;
  hasWorkingCapital: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Intro header */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">How to read this dashboard</h2>
              <p className="text-sm text-muted-foreground">
                Full guide to every tab, metric, and colour code.
              </p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            This financial analysis combines <strong>annual report (AR)</strong> figures with{' '}
            <strong>Yahoo Finance (YF)</strong> feed data, cross-checked and annotated for
            disclosure quality. Every number has a source tag and, where methodology differs
            between AR and YF, a bridge explains the gap. The tabs below are ordered from{' '}
            <em>headline → detail → forensic → reference</em>.
          </p>
        </CardContent>
      </Card>

      {/* Tab-by-tab guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Tab-by-tab guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <GuideTabBlock
            icon={<Sparkles className="h-4 w-4" />}
            name="Overview"
            role="headline"
            purpose="At-a-glance read of the focus year. Shows headline KPIs, the 5–7 key takeaways ranked by priority, the market snapshot (price, multiples, yield, beta), the governance score from Yahoo's ISS feed, and progress against company guidance targets."
            keySignals={[
              'KPI trend arrows: up = improving, down = deteriorating, flat = stable',
              'Takeaway priority colour: red = high, amber = medium, grey = low',
              'Guidance status: ✓ on track / ⚠ behind / ✗ off track',
            ]}
            whenToUse="First stop for a 60-second read. If a single KPI looks wrong, jump to Performance → Charts."
          />

          <GuideTabBlock
            icon={<Gauge className="h-4 w-4" />}
            name="Performance"
            role="detail"
            purpose="Multi-year charts (up to 9 years) for Revenue, EBITDA, Net Profit, Margin, FCF, CapEx, Net Debt, Working Capital. Each chart has an AR/YF/both toggle — compare reported figures against the independent Yahoo Finance feed. Below the charts, the 7 narrative analysis sections (Performance Overview, Margins, Cash Flow, Balance Sheet, Accounting, Segment, Guidance) break down the story."
            keySignals={[
              'Green bars = AR reported. Amber bars = Yahoo Finance.',
              'Gap between the two lines → methodology difference or restatement',
              'Flat years with no data = disclosure gap (multi-year series start varies by metric)',
            ]}
            whenToUse="When you want to see if a KPI change is a one-year blip or a multi-year pattern."
          />

          <GuideTabBlock
            icon={<ShieldCheck className="h-4 w-4" />}
            name="AR ↔ YF Bridge"
            role="detail"
            purpose="Every key metric reconciled side-by-side: AR value, YF value, gap %, status. Click any row for the per-metric explanation — including definition from the annual report, which variant matches YF, and the residual gap's mechanism (IFRS 16 leases, impairment treatment, APM scope, timing, etc.)."
            keySignals={[
              'Status badges — green "aligned" (<2% gap), amber "minor_gap" (2–10%), red "material_gap" (10–25%), dark red "significant_gap" (>25%)',
              'Click a row to drill into the metric family and variant walk',
              'The dialog shows AR variants (statutory / adjusted / before_exceptionals / before_ppa) and which one YF is closest to',
            ]}
            whenToUse="Use when YF data contradicts the AR headline — the bridge explains why they disagree."
          />

          {hasEarningsQuality && (
            <GuideTabBlock
              icon={<AlertTriangle className="h-4 w-4" />}
              name="Earnings Quality"
              role="forensic"
              purpose="Forensic quality-of-earnings analysis. Classifies every AR-vs-YF gap on two axes: direction (does AR look better or worse than YF?) and severity. Surfaces multi-year adjustment asymmetry, recurring 'non-recurring' items, one-time dressings, and disclosure gaps. Produces an overall verdict with a one-liner summary."
              keySignals={[
                'Verdict colour: green "clean" / amber "mixed" / red "concerning" / grey "limited"',
                'Favorability: red "aggressive" = AR looks better than YF (flag), green "conservative" = AR looks worse (usually no concern), amber "disclosure_gap" = missing data',
                'Patterns ranked by cumulative €m impact across years — the headline quality signal',
                'Red Flags are quantified (€xxxm impact where possible) — not vibes',
              ]}
              whenToUse="Due-diligence reading. When you suspect the APM headlines are flattering the underlying IFRS numbers."
            />
          )}

          {hasWorkingCapital && (
            <GuideTabBlock
              icon={<CircleDollarSign className="h-4 w-4" />}
              name="Working Capital"
              role="forensic"
              purpose="Deep working-capital analysis. 7 headline ratios (NWC, NWC%Rev, DaysWC, DIO, DSO, DPO, CCC), multi-year trajectory charts, component balances (inventories / receivables / payables split), cash-flow-statement WC movement, AR↔YF WC bridge with methodology walk, multi-year patterns, quality signals, red flags, disclosure gaps — and an editable notes area for personal commentary (auto-saved per-company to your browser)."
              keySignals={[
                'Trend arrow: improving = cash released, deteriorating = cash consumed',
                'Pattern severity: green positive_structural (sustainable improvement), amber neutral_scope (distorted by M&A), red negative_structural (persistent deterioration)',
                'Signal direction: green positive_for_cash / red negative_for_cash — quantified in €m where possible',
                'Cash-flow WC movement table shows the ORGANIC signal (isolates scope effects from divestments)',
                'Personal Analyst Notes field is yours — type anything, it saves to your browser',
              ]}
              whenToUse="When you want to understand the €m cash released/consumed by working capital — the bridge between accrual earnings and actual cash."
            />
          )}

          <GuideTabBlock
            icon={<Building2 className="h-4 w-4" />}
            name="Segments"
            role="detail"
            purpose="Per-segment revenue, EBITA, margin, mix %, and organic growth. Revenue/EBITA mix bars show which segment is driving or dragging the group result. The 'Corporate / Eliminations' row is the reconciling line, not a real segment."
            keySignals={[
              'Mix % = segment contribution to group total',
              "Organic growth strips M&A and FX — the 'real' underlying rate",
              'Negative EBITA mix % for Corporate = unallocated costs drag group EBITA',
            ]}
            whenToUse="When the group margin is compressing — is it one bad segment or a broad issue?"
          />

          <GuideTabBlock
            icon={<Activity className="h-4 w-4" />}
            name="Ratios & Historicals"
            role="reference"
            purpose="Reference ratio tables (profitability, cash efficiency, leverage, DuPont) + the full historical data matrix (every line item × every year in a flat table). This is the 'data room' — useful for custom analysis or exports."
            keySignals={[
              'Ratios marked (AR) use annual report figures; (YF) use Yahoo Finance',
              'The historical table rows often duplicate slightly (e.g. "Revenue" and "Total Revenue") — that is the AR using multiple labels; values should match within rounding',
            ]}
            whenToUse="For spot-checks, audits, or copying a specific cell into a model."
          />

          <GuideTabBlock
            icon={<FileText className="h-4 w-4" />}
            name="Guide"
            role="reference"
            purpose="This tab. Kept in-dashboard so every reader can find it without leaving the app."
            keySignals={[]}
            whenToUse=""
          />
        </CardContent>
      </Card>

      {/* Badge legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Badge / colour legend
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <LegendGroup
            title="Comparability (AR vs YF)"
            entries={[
              { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'aligned', desc: '< 2% gap — safe to use interchangeably' },
              { color: 'bg-amber-100 text-amber-800 border-amber-200', label: 'minor_gap', desc: '2–10% — methodology nuance, watch but not critical' },
              { color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'material_gap', desc: '10–25% — definitional divergence, understand before using' },
              { color: 'bg-red-100 text-red-800 border-red-200', label: 'significant_gap', desc: '> 25% — APM and statutory are not comparable; pick one' },
              { color: 'bg-slate-100 text-slate-700 border-slate-200', label: 'disclosure_gap', desc: 'Data missing on one side — cannot compute gap' },
            ]}
          />
          <LegendGroup
            title="Favorability (Earnings Quality)"
            entries={[
              { color: 'bg-red-100 text-red-800 border-red-200', label: 'aggressive', desc: 'AR presents metric MORE favorably than YF — the primary flag' },
              { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'conservative', desc: 'AR presents metric LESS favorably than YF — generally safe' },
              { color: 'bg-slate-100 text-slate-600 border-slate-200', label: 'aligned', desc: 'Gap < 2%, methodologies converge' },
              { color: 'bg-amber-100 text-amber-800 border-amber-200', label: 'disclosure_gap', desc: 'One side missing data — medium flag by default' },
            ]}
          />
          <LegendGroup
            title="Severity (all tabs)"
            entries={[
              { color: 'bg-red-600 text-white', label: 'HIGH', desc: 'Act on this — material to the thesis' },
              { color: 'bg-amber-500 text-white', label: 'MEDIUM', desc: 'Watch — worth asking management about' },
              { color: 'bg-slate-400 text-white', label: 'LOW', desc: 'Note only — minor issue' },
              { color: 'bg-slate-200 text-slate-700', label: 'NONE', desc: 'No signal — metric is clean' },
            ]}
          />
          <LegendGroup
            title="Verdict (Earnings Quality & Working Capital)"
            entries={[
              { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'clean / improving', desc: 'No material quality concerns; trend is positive' },
              { color: 'bg-amber-100 text-amber-800 border-amber-200', label: 'mixed', desc: 'Some flags exist but partially offset by positives' },
              { color: 'bg-red-100 text-red-800 border-red-200', label: 'concerning / deteriorating', desc: 'Material issues; dig before relying on headlines' },
              { color: 'bg-slate-100 text-slate-700 border-slate-200', label: 'limited / stable', desc: 'Not enough data, or no directional signal' },
            ]}
          />
        </CardContent>
      </Card>

      {/* Methodology notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Methodology &amp; data provenance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="font-semibold mb-1">Two sources of truth</p>
            <p className="text-muted-foreground">
              <strong>AR (Annual Report)</strong>: the company's own published figures, including
              APMs (Alternative Performance Measures — "Adjusted EBIT", "EBITDA before exceptionals",
              etc.).<br />
              <strong>YF (Yahoo Finance)</strong>: a standardised IFRS-statutory feed, not adjusted
              for company-specific one-offs. The independence is the value.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="font-semibold mb-1">Why the two disagree</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li><strong>APM vs statutory:</strong> company-defined "before exceptionals" ≠ IFRS number</li>
              <li><strong>Classification:</strong> IFRS 16 leases, impairments, NCI treatment</li>
              <li><strong>Timing:</strong> period cutoff, restated comparatives</li>
              <li><strong>Scope:</strong> divestments, acquisitions, held-for-sale items</li>
              <li><strong>Definition:</strong> gross vs net CapEx; OCF pre- or post-tax/interest; FCF formula</li>
            </ul>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="font-semibold mb-1">Verification chain</p>
            <p className="text-muted-foreground">
              Values marked as AR-sourced have been extracted from the PDF with a page reference
              and cross-checked against the prior-year comparative in the next year's annual report.
              Any mismatches are flagged in the Earnings Quality and Working Capital sections.
              YF series come from a financial data bundle created at a specific snapshot date —
              see <code className="text-xs">run_meta.generated_at_utc</code> for that date.
            </p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="font-semibold mb-1 text-blue-900">Personal Analyst Notes (Working Capital tab)</p>
            <p className="text-blue-900">
              The notes field on the Working Capital tab saves to your <em>browser</em>{' '}
              (<code className="text-xs">localStorage</code>) keyed by the company ticker. It
              is not exported with the JSON and not synced to any server — it stays on this
              machine. Clearing browser data erases it.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* How to use */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Suggested workflow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <WorkflowStep
            n={1}
            title="Overview tab — 60 seconds"
            text="Read the hero thesis + top flag, skim the KPIs, glance at key takeaways. You should know the direction of the story before leaving this tab."
          />
          <WorkflowStep
            n={2}
            title="Performance tab — 3 minutes"
            text="Look at the multi-year charts. Toggle between AR / YF / both. Is the trend multi-year or a one-year anomaly? Does YF agree?"
          />
          <WorkflowStep
            n={3}
            title="AR ↔ YF Bridge — 2 minutes"
            text="Scan for red or amber status rows. Click any flagged metric to read the per-metric reconciliation."
          />
          {hasEarningsQuality && (
            <WorkflowStep
              n={4}
              title="Earnings Quality — 5 minutes"
              text="Start with the verdict banner. Read the red flags. Scan the bridge assessment table (aggressive rows first). Review historical patterns for multi-year asymmetry."
            />
          )}
          {hasWorkingCapital && (
            <WorkflowStep
              n={5}
              title="Working Capital — 5 minutes"
              text="Read the verdict + headline metrics. Check the cash-flow WC movement table for the organic signal. Scan patterns and quality signals. Add your own notes if anything needs following up."
            />
          )}
          <WorkflowStep
            n={hasEarningsQuality && hasWorkingCapital ? 6 : hasEarningsQuality || hasWorkingCapital ? 5 : 4}
            title="Segments + Ratios — as needed"
            text="Drill-down tabs. Use Segments when margin is moving. Use Ratios & Historicals for a specific data point."
          />
        </CardContent>
      </Card>
    </div>
  );
}

function GuideTabBlock({
  icon,
  name,
  role,
  purpose,
  keySignals,
  whenToUse,
}: {
  icon: React.ReactNode;
  name: string;
  role: 'headline' | 'detail' | 'forensic' | 'reference';
  purpose: string;
  keySignals: string[];
  whenToUse: string;
}) {
  const roleColor = {
    headline: 'bg-blue-100 text-blue-800 border-blue-200',
    detail: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    forensic: 'bg-purple-100 text-purple-800 border-purple-200',
    reference: 'bg-slate-100 text-slate-700 border-slate-200',
  }[role];
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="rounded-lg bg-primary/10 p-2">{icon}</div>
        <h3 className="font-semibold text-base">{name}</h3>
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            roleColor
          )}
        >
          {role}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{purpose}</p>
      {keySignals.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1 uppercase tracking-wide text-muted-foreground">
            Key signals
          </p>
          <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
            {keySignals.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {whenToUse && (
        <div className="rounded-md bg-slate-50 border border-slate-200 p-2 text-xs">
          <span className="font-semibold text-slate-700">When to use: </span>
          <span className="text-slate-600">{whenToUse}</span>
        </div>
      )}
    </div>
  );
}

function LegendGroup({
  title,
  entries,
}: {
  title: string;
  entries: { color: string; label: string; desc: string }[];
}) {
  return (
    <div>
      <p className="text-xs font-semibold mb-2 uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="space-y-1.5">
        {entries.map((e, i) => (
          <div key={i} className="flex items-start gap-3 text-sm">
            <span
              className={cn(
                'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold uppercase whitespace-nowrap shrink-0',
                e.color
              )}
            >
              {e.label}
            </span>
            <span className="text-muted-foreground leading-relaxed flex-1">{e.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkflowStep({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="flex items-start shrink-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
          {n}
        </div>
      </div>
      <div className="flex-1">
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{text}</p>
      </div>
    </div>
  );
}

export default FinancialAnalysisView;
