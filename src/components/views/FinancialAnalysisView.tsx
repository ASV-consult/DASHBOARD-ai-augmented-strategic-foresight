import { useMemo, useState } from 'react';
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
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Gauge,
  Info,
  Layers,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  FinancialAnalysisSection,
  FinancialBridgeRow,
  FinancialFlag,
  FinancialHistoricalRow,
  FinancialRatioCard,
} from '@/types/financial';

/* ---------- Formatting helpers ---------- */

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

const severityColor = (sev?: string): string => {
  const s = String(sev || '').toLowerCase();
  if (s.includes('high') || s.includes('critical') || s.includes('risk')) {
    return 'bg-destructive/10 text-destructive border-destructive/30';
  }
  if (s.includes('warn') || s.includes('medium')) {
    return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
  }
  if (s.includes('info') || s.includes('low')) {
    return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
  }
  return 'bg-muted text-muted-foreground border-border';
};

const priorityColor = (p?: string): string => {
  const s = String(p || '').toLowerCase();
  if (s === 'high') return 'bg-destructive/10 text-destructive border-destructive/30';
  if (s === 'medium') return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
  return 'bg-muted text-muted-foreground border-border';
};

const comparabilityColor = (c?: string): string => {
  const s = String(c || '').toLowerCase();
  if (s.includes('aligned') || s.includes('match')) {
    return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
  }
  if (s.includes('material_gap') || s.includes('material_lag')) {
    return 'bg-destructive/10 text-destructive border-destructive/30';
  }
  if (s.includes('minor') || s.includes('lag') || s.includes('watch')) {
    return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
  }
  return 'bg-muted text-muted-foreground border-border';
};

const yoySign = (v: number | null | undefined): 'up' | 'down' | 'flat' => {
  if (v === null || v === undefined || Number.isNaN(v)) return 'flat';
  if (v > 0.1) return 'up';
  if (v < -0.1) return 'down';
  return 'flat';
};

/* ---------- Chart helpers ---------- */

interface ChartPoint {
  year: string;
  ar?: number | null;
  yf?: number | null;
}

const buildChartSeries = (
  years: Array<string | number> = [],
  arSeries?: Array<number | null>,
  yfSeries?: Array<number | null>,
): ChartPoint[] => {
  return years.map((y, i) => ({
    year: String(y),
    ar: arSeries?.[i] ?? null,
    yf: yfSeries?.[i] ?? null,
  }));
};

/* ---------- Group historical rows by topic ---------- */

const INCOME_STATEMENT_KEYS = [
  'Revenue', 'Organic Revenue Growth', 'Gross Profit',
  'Adjusted EBITDA', 'Adjusted EBITDA Margin',
  'Adjusted EBIT', 'Adjusted EBIT Margin',
  'EBIT', 'EBIT Margin', 'Operating Income',
  'EBITDA', 'EBITDA Margin',
  'Net Profit', 'Adjusted Net Profit', 'Net Income',
  'EPS', 'EPS (Adjusted)', 'Exceptional Items',
];

const BALANCE_SHEET_KEYS = [
  'Total Assets', 'Total Equity', 'Total Liabilities',
  'Net Debt', 'Gross Debt', 'Total Debt',
  'Cash And Equivalents', 'Cash',
  'Working Capital', 'Inventory', 'Receivables', 'Payables',
  'Goodwill', 'Intangibles',
];

const CASH_FLOW_KEYS = [
  'Operating Cash Flow', 'CFO',
  'CapEx', 'Capital Expenditure',
  'Free Cash Flow', 'FCF', 'FCF Conversion',
  'Dividend', 'Dividends Paid',
  'Acquisitions',
];

const matchGroup = (metric: string, patterns: string[]): boolean => {
  const m = metric.toLowerCase();
  return patterns.some(p => m.includes(p.toLowerCase()));
};

const groupHistoricalRows = (rows: FinancialHistoricalRow[] = []) => {
  const income: FinancialHistoricalRow[] = [];
  const balance: FinancialHistoricalRow[] = [];
  const cash: FinancialHistoricalRow[] = [];
  const other: FinancialHistoricalRow[] = [];

  for (const row of rows) {
    if (matchGroup(row.metric, INCOME_STATEMENT_KEYS)) {
      income.push(row);
    } else if (matchGroup(row.metric, BALANCE_SHEET_KEYS)) {
      balance.push(row);
    } else if (matchGroup(row.metric, CASH_FLOW_KEYS)) {
      cash.push(row);
    } else {
      other.push(row);
    }
  }

  return { income, balance, cash, other };
};

/* ---------- Main component ---------- */

export function FinancialAnalysisView() {
  const { financialData } = useForesight();
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [chartMode, setChartMode] = useState<'ar' | 'yf' | 'both'>('both');

  const fd = financialData;

  const sections = fd?.analysis_sections ?? [];
  const kpis = fd?.kpis ?? [];
  const takeaways = fd?.key_takeaways ?? [];
  const bridge = fd?.ar_vs_yf_bridge ?? [];
  const segments = fd?.segment_analysis ?? [];
  const guidance = fd?.guidance_tracking ?? [];
  const charts = fd?.financial_charts;
  const years = charts?.years ?? [];
  const historical = fd?.historical_table;
  const ratios = fd?.ratio_cards;
  const market = fd?.market_snapshot;
  const governance = fd?.governance_scores;
  const profile = fd?.company_profile;
  const exec = fd?.executive;
  const riskSnapshot = exec?.risk_snapshot;

  const thesis =
    exec?.executive_thesis ||
    exec?.professional_outcome_report ||
    fd?.executive_summary ||
    '';

  const groupedHistorical = useMemo(
    () => groupHistoricalRows(historical?.rows ?? []),
    [historical],
  );

  const revenueSeries = useMemo(
    () => buildChartSeries(years, charts?.revenue_m, charts?.revenue_m_yf),
    [years, charts],
  );
  const ebitdaSeries = useMemo(
    () => buildChartSeries(years, charts?.ebitda_m, charts?.ebitda_m_yf),
    [years, charts],
  );
  const marginSeries = useMemo(
    () => buildChartSeries(years, charts?.ebita_margin_pct, charts?.ebitda_margin_pct_yf),
    [years, charts],
  );
  const fcfSeries = useMemo(
    () => buildChartSeries(years, charts?.fcf_m, charts?.fcf_m_yf),
    [years, charts],
  );
  const netIncomeSeries = useMemo(
    () => buildChartSeries(years, charts?.net_profit_m, charts?.net_profit_m_yf),
    [years, charts],
  );
  const capexSeries = useMemo(() => {
    // YF capex is negative; flip it for display
    return years.map((y, i) => ({
      year: String(y),
      ar: charts?.capex_m?.[i] ?? null,
      yf: charts?.capex_m_yf?.[i] != null ? Math.abs(charts!.capex_m_yf![i] as number) : null,
    }));
  }, [years, charts]);

  const netDebtSeries = useMemo(
    () => years.map((y, i) => ({ year: String(y), ar: charts?.net_debt_m?.[i] ?? null })),
    [years, charts],
  );
  const workingCapitalSeries = useMemo(
    () => years.map((y, i) => ({ year: String(y), ar: charts?.working_capital_m?.[i] ?? null })),
    [years, charts],
  );

  if (!fd) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="mb-2 text-lg font-semibold">No financial analysis loaded</h2>
            <p className="text-sm text-muted-foreground">
              Upload a financial analysis JSON to view the fundamentals dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* ==================== HEADER ==================== */}
      <HeaderCard
        profile={profile}
        exec={exec}
        thesis={thesis}
        showFullSummary={showFullSummary}
        onToggle={() => setShowFullSummary(v => !v)}
        riskFlags={riskSnapshot?.flags ?? []}
      />

      {/* ==================== KPI STRIP ==================== */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {kpis.slice(0, 5).map(k => (
            <KpiCard key={k.key} kpi={k} />
          ))}
        </div>
      )}

      {/* ==================== KEY TAKEAWAYS ==================== */}
      {takeaways.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4" /> Key Takeaways
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {takeaways.map((t, i) => (
                <div
                  key={i}
                  className={`rounded-md border p-3 ${priorityColor(t.priority)}`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold uppercase tracking-wide">
                      {t.headline}
                    </div>
                    {t.priority && (
                      <Badge variant="outline" className={`text-xs ${priorityColor(t.priority)}`}>
                        {t.priority}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm">{t.detail}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================== TABS: Performance / Balance Sheet / Cash Flow ==================== */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-4 w-4" /> Financial Performance
          </CardTitle>
          <ChartModeToggle mode={chartMode} onChange={setChartMode} />
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="performance" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
              <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
            </TabsList>

            <TabsContent value="performance" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <ChartCard title="Revenue" unit="mn EUR">
                  <DualLineChart data={revenueSeries} mode={chartMode} />
                </ChartCard>
                <ChartCard title="EBITDA" unit="mn EUR">
                  <DualLineChart data={ebitdaSeries} mode={chartMode} />
                </ChartCard>
                <ChartCard title="Net Profit" unit="mn EUR">
                  <DualLineChart data={netIncomeSeries} mode={chartMode} />
                </ChartCard>
                <ChartCard title="EBITA / EBITDA Margin" unit="%">
                  <DualLineChart data={marginSeries} mode={chartMode} isPercent />
                </ChartCard>
              </div>
            </TabsContent>

            <TabsContent value="balance" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <ChartCard title="Net Debt" unit="mn EUR" arOnly>
                  <DualLineChart data={netDebtSeries} mode="ar" />
                </ChartCard>
                <ChartCard title="Working Capital" unit="mn EUR" arOnly>
                  <DualLineChart data={workingCapitalSeries} mode="ar" />
                </ChartCard>
              </div>
            </TabsContent>

            <TabsContent value="cashflow" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <ChartCard title="Free Cash Flow" unit="mn EUR">
                  <DualLineChart data={fcfSeries} mode={chartMode} />
                </ChartCard>
                <ChartCard title="CapEx" unit="mn EUR">
                  <DualBarChart data={capexSeries} mode={chartMode} />
                </ChartCard>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ==================== SECTION NARRATIVES ==================== */}
      {sections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" /> Analysis Sections
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sections.map((section, i) => (
              <SectionBlock key={i} section={section} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* ==================== AR vs YF BRIDGE ==================== */}
      {bridge.length > 0 && <BridgeCard bridge={bridge} />}

      {/* ==================== SEGMENTS ==================== */}
      {segments.length > 0 && <SegmentCard segments={segments} />}

      {/* ==================== GUIDANCE ==================== */}
      {guidance.length > 0 && <GuidanceCard items={guidance} />}

      {/* ==================== RATIO CARDS ==================== */}
      {ratios && <RatioCardsBlock ratios={ratios} />}

      {/* ==================== HISTORICAL TABLE ==================== */}
      {historical && historical.rows.length > 0 && (
        <HistoricalTableCard
          years={historical.years}
          groups={groupedHistorical}
        />
      )}

      {/* ==================== MARKET & GOVERNANCE ==================== */}
      <div className="grid gap-4 lg:grid-cols-2">
        {market && <MarketSnapshotCard market={market} />}
        {governance && <GovernanceCard gov={governance} />}
      </div>
    </div>
  );
}

/* ================================================================
   HEADER
================================================================== */

interface HeaderCardProps {
  profile?: any;
  exec?: any;
  thesis: string;
  showFullSummary: boolean;
  onToggle: () => void;
  riskFlags: FinancialFlag[];
}

function HeaderCard({
  profile,
  exec,
  thesis,
  showFullSummary,
  onToggle,
  riskFlags,
}: HeaderCardProps) {
  const truncated = thesis.length > 320 ? thesis.slice(0, 320) + '…' : thesis;
  const topFlag = exec?.top_flag;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-xl font-semibold">
                {profile?.name || 'Company'}
              </h1>
              <Badge variant="outline">{profile?.ticker}</Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {profile?.sector && <span>{profile.sector}</span>}
              {profile?.industry && <span>· {profile.industry}</span>}
              {profile?.country && <span>· {profile.country}</span>}
              {profile?.exchange && <span>· {profile.exchange}</span>}
              {profile?.employees && (
                <span>
                  · {Number(profile.employees).toLocaleString('en-US')} employees
                </span>
              )}
            </div>
          </div>
          {topFlag?.message && (
            <div
              className={`flex min-w-0 max-w-md items-start gap-2 rounded-md border p-3 text-sm ${severityColor(topFlag.severity)}`}
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide">
                  Top Flag · {topFlag.section || topFlag.severity}
                </div>
                <div>{topFlag.message}</div>
              </div>
            </div>
          )}
        </div>

        {thesis && (
          <div className="mt-4 rounded-md bg-muted/40 p-4 text-sm leading-relaxed">
            {showFullSummary ? thesis : truncated}
            {thesis.length > 320 && (
              <Button
                variant="link"
                size="sm"
                className="h-auto px-0 py-0 ml-1"
                onClick={onToggle}
              >
                {showFullSummary ? 'Show less' : 'Read more'}
              </Button>
            )}
          </div>
        )}

        {riskFlags.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <AlertTriangle className="h-3 w-3" /> Risk Signals ({riskFlags.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {riskFlags.map((f, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className={`max-w-full whitespace-normal text-left text-xs ${severityColor(f.severity)}`}
                >
                  {f.section && (
                    <span className="font-semibold mr-1">{f.section}:</span>
                  )}
                  {f.message}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ================================================================
   KPI CARD
================================================================== */

function KpiCard({ kpi }: { kpi: any }) {
  const dir = yoySign(kpi.yoy_change_pct);
  const Icon =
    dir === 'up'
      ? TrendingUp
      : dir === 'down'
        ? TrendingDown
        : CircleDollarSign;
  const trendClr =
    dir === 'up'
      ? 'text-emerald-600'
      : dir === 'down'
        ? 'text-destructive'
        : 'text-muted-foreground';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-muted-foreground">
            {kpi.label}
          </div>
          <Icon className={`h-4 w-4 ${trendClr}`} />
        </div>
        <div className="mt-1 text-xl font-semibold tabular-nums">
          {kpi.display_value || fmtNum(kpi.value)}
        </div>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {kpi.unit || ''}
          </span>
          {kpi.yoy_change_pct !== null && kpi.yoy_change_pct !== undefined && (
            <span className={`tabular-nums ${trendClr}`}>
              {fmtDelta(kpi.yoy_change_pct)} YoY
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ================================================================
   CHART COMPONENTS
================================================================== */

function ChartModeToggle({
  mode,
  onChange,
}: {
  mode: 'ar' | 'yf' | 'both';
  onChange: (m: 'ar' | 'yf' | 'both') => void;
}) {
  const opts: Array<{ key: 'ar' | 'yf' | 'both'; label: string }> = [
    { key: 'ar', label: 'AR' },
    { key: 'yf', label: 'YF' },
    { key: 'both', label: 'Both' },
  ];
  return (
    <div className="inline-flex rounded-md border bg-background p-0.5 text-xs">
      {opts.map(o => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`rounded-sm px-2.5 py-1 font-medium transition-colors ${
            mode === o.key
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
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
    <div className="rounded-md border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold">{title}</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {arOnly && <Badge variant="outline" className="text-[10px]">AR only</Badge>}
          {unit && <span>{unit}</span>}
        </div>
      </div>
      <div className="h-[220px]">{children}</div>
    </div>
  );
}

const AR_COLOR = '#2563eb'; // blue
const YF_COLOR = '#f59e0b'; // amber

function DualLineChart({
  data,
  mode,
  isPercent = false,
}: {
  data: ChartPoint[];
  mode: 'ar' | 'yf' | 'both';
  isPercent?: boolean;
}) {
  const formatter = (v: number) => (isPercent ? fmtPct(v) : fmtNum(v));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
        <XAxis dataKey="year" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={formatter as any} />
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
            connectNulls
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
            connectNulls
          />
        )}
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </LineChart>
    </ResponsiveContainer>
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
        {mode !== 'yf' && (
          <Bar dataKey="ar" name="Annual Report" fill={AR_COLOR} />
        )}
        {mode !== 'ar' && (
          <Bar dataKey="yf" name="Yahoo Finance" fill={YF_COLOR} />
        )}
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ================================================================
   ANALYSIS SECTION
================================================================== */

function SectionBlock({ section }: { section: FinancialAnalysisSection }) {
  const [open, setOpen] = useState(true);
  const narrative = section.narrative || section.text || '';
  const flags = section.flags ?? [];
  const dataTables = section.data_tables ?? [];
  const arVsYf = section.ar_vs_yf ?? [];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-md border">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40">
          <div className="flex items-center gap-2 min-w-0">
            {open ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="font-semibold">{section.title}</span>
            {flags.length > 0 && (
              <Badge
                variant="outline"
                className={`text-xs ${severityColor(flags[0].severity)}`}
              >
                {flags.length} flag{flags.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-4 border-t px-4 py-4">
            {narrative && (
              <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                {narrative}
              </p>
            )}

            {flags.length > 0 && (
              <div className="space-y-1.5">
                {flags.map((f, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${severityColor(f.severity)}`}
                  >
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>{f.message}</span>
                  </div>
                ))}
              </div>
            )}

            {dataTables.length > 0 && (
              <div className="space-y-3">
                {dataTables.map((dt, i) => (
                  <DataTableBlock key={i} name={dt.name} rows={dt.rows} />
                ))}
              </div>
            )}

            {arVsYf.length > 0 && (
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  AR vs YF (this section)
                </div>
                <div className="space-y-2">
                  {arVsYf.map((b, i) => (
                    <BridgeRowInline key={i} row={b} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function DataTableBlock({ name, rows }: { name: string; rows: any[] }) {
  if (!rows || rows.length === 0) return null;
  const columns = Object.keys(rows[0]);

  const formatCell = (v: any, col: string): string => {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'number') {
      if (col.toLowerCase().includes('pct') || col.toLowerCase().includes('margin') || col.toLowerCase().includes('growth')) {
        return fmtPct(v);
      }
      return fmtNum(v);
    }
    return String(v);
  };

  return (
    <div className="rounded-md border">
      <div className="border-b bg-muted/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {name}
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(c => (
                <TableHead key={c} className="whitespace-nowrap text-xs">
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
    <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-sm bg-background px-2 py-1.5 text-xs">
      <div className="flex-1 min-w-0">
        <span className="font-medium">{row.concept || row.ar_metric}</span>
        <span className="ml-2 text-muted-foreground">
          AR: {fmtNum(row.ar_value)} {row.ar_unit}
        </span>
        <span className="ml-2 text-muted-foreground">
          YF: {fmtNum(row.yf_value)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {row.gap_pct !== null && row.gap_pct !== undefined && (
          <span className="tabular-nums text-muted-foreground">
            Δ {fmtDelta(row.gap_pct)}
          </span>
        )}
        {row.comparability && (
          <Badge
            variant="outline"
            className={`text-[10px] ${comparabilityColor(row.comparability)}`}
          >
            {row.comparability.replace(/_/g, ' ')}
          </Badge>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   AR vs YF BRIDGE (dedicated section)
================================================================== */

function BridgeCard({ bridge }: { bridge: FinancialBridgeRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-4 w-4" /> Annual Report ↔ Yahoo Finance Bridge
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Concept</TableHead>
                <TableHead>AR metric</TableHead>
                <TableHead className="text-right">AR value</TableHead>
                <TableHead>YF metric</TableHead>
                <TableHead className="text-right">YF value</TableHead>
                <TableHead className="text-right">Gap</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bridge.map((r, i) => {
                const yfDisp =
                  r.yf_value != null && Math.abs(r.yf_value) > 1e6
                    ? r.yf_value / 1e6
                    : r.yf_value;
                return (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.concept}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.ar_metric}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtNum(r.ar_value)} <span className="text-[10px] text-muted-foreground">{r.ar_unit}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.yf_label || r.yf_metric}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtNum(yfDisp as number | null | undefined)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtDelta(r.gap_pct)}
                    </TableCell>
                    <TableCell>
                      {r.comparability && (
                        <Badge
                          variant="outline"
                          className={`text-xs ${comparabilityColor(r.comparability)}`}
                        >
                          {r.comparability.replace(/_/g, ' ')}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {bridge.some(r => r.definition_from_ar) && (
          <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
            {bridge
              .filter(r => r.definition_from_ar)
              .map((r, i) => (
                <div key={i} className="flex gap-2">
                  <Info className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>
                    <span className="font-medium text-foreground">{r.concept}:</span>{' '}
                    {r.definition_from_ar}
                  </span>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ================================================================
   SEGMENTS
================================================================== */

function SegmentCard({ segments }: { segments: any[] }) {
  const mainSegs = segments.filter(s => !s.is_reconciling_item);
  const recon = segments.filter(s => s.is_reconciling_item);

  const chartData = mainSegs.map(s => ({
    name: s.segment,
    revenue: s.revenue,
    ebita: s.ebita,
    revenueMix: s.revenue_mix_pct,
    ebitaMix: s.ebita_mix_pct,
    margin: s.ebita_margin,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4" /> Segment Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-[240px] rounded-md border p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Revenue & EBITA by Segment (mn EUR)
            </div>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => (v == null ? '—' : fmtNum(v))} />
                <Bar dataKey="revenue" name="Revenue" fill={AR_COLOR} />
                <Bar dataKey="ebita" name="EBITA" fill={YF_COLOR} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="h-[240px] rounded-md border p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              EBITA Margin by Segment
            </div>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: any) => fmtPct(v, 0)} />
                <Tooltip formatter={(v: any) => (v == null ? '—' : fmtPct(v))} />
                <Bar dataKey="margin" name="EBITA margin %" fill="#10b981" />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Segment</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">YoY</TableHead>
                <TableHead className="text-right">Organic</TableHead>
                <TableHead className="text-right">Mix %</TableHead>
                <TableHead className="text-right">EBITA</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="text-right">EBITA mix %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...mainSegs, ...recon].map((s, i) => (
                <TableRow key={i} className={s.is_reconciling_item ? 'text-muted-foreground italic' : ''}>
                  <TableCell className="font-medium">
                    {s.segment} {s.is_reconciling_item && <span className="text-xs">(reconciling)</span>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmtNum(s.revenue)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtDelta(s.revenue_yoy)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtDelta(s.organic_growth)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPct(s.revenue_mix_pct)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtNum(s.ebita)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPct(s.ebita_margin)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPct(s.ebita_mix_pct)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ================================================================
   GUIDANCE
================================================================== */

function GuidanceCard({ items }: { items: any[] }) {
  const [open, setOpen] = useState(false);
  const byStatus = useMemo(() => {
    const out: Record<string, any[]> = {};
    for (const it of items) {
      const key = (it.status || 'pending').toLowerCase();
      (out[key] ||= []).push(it);
    }
    return out;
  }, [items]);

  const counts = {
    achieved: byStatus['achieved']?.length ?? 0,
    on_track: byStatus['on_track']?.length ?? 0,
    behind: byStatus['behind']?.length ?? 0,
    pending: byStatus['pending']?.length ?? 0,
  };

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader>
          <CollapsibleTrigger className="flex w-full items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4" /> Guidance & Target Tracking
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({items.length} targets)
              </span>
            </CardTitle>
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </CollapsibleTrigger>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              {counts.achieved} achieved
            </Badge>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
              {counts.on_track} on track
            </Badge>
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
              {counts.behind} behind
            </Badge>
            <Badge variant="outline">{counts.pending} pending</Badge>
          </div>
          <CollapsibleContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead>Metric</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((g, i) => (
                    <TableRow key={i}>
                      <TableCell className="whitespace-nowrap">{g.target_period}</TableCell>
                      <TableCell>{g.segment}</TableCell>
                      <TableCell className="font-medium">{g.metric}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {g.is_qualitative ? (g.guidance_text || 'qualitative') : g.target_display}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {g.actual_value != null ? fmtNum(g.actual_value) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${statusColor(g.status)}`}>
                          {g.status || 'pending'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}

function statusColor(s?: string): string {
  const v = String(s || '').toLowerCase();
  if (v.includes('achieved')) return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
  if (v.includes('on_track')) return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
  if (v.includes('behind')) return 'bg-destructive/10 text-destructive border-destructive/30';
  return 'bg-muted text-muted-foreground border-border';
}

/* ================================================================
   RATIO CARDS
================================================================== */

function RatioCardsBlock({ ratios }: { ratios: any }) {
  const groups: Array<{ label: string; items: FinancialRatioCard[] | undefined; icon: any }> = [
    { label: 'Profitability & Returns', items: ratios.profitability_returns, icon: TrendingUp },
    { label: 'Liquidity & Solvency', items: ratios.liquidity_solvency, icon: ShieldCheck },
    { label: 'Efficiency', items: ratios.efficiency, icon: Gauge },
    { label: 'Valuation', items: ratios.valuation_governance, icon: CircleDollarSign },
  ];

  const formatRatioValue = (c: FinancialRatioCard): string => {
    if (c.value === null || c.value === undefined) return '—';
    if (c.kind === 'pct') return fmtPct(c.value);
    if (c.kind === 'ratio') return fmtRatio(c.value);
    return fmtNum(c.value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge className="h-4 w-4" /> Ratio Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {groups.map(group => {
          if (!group.items || group.items.length === 0) return null;
          const Icon = group.icon;
          return (
            <div key={group.label}>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Icon className="h-3 w-3" /> {group.label}
              </div>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                {group.items.map((c, i) => (
                  <div key={i} className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">{c.label}</div>
                    <div className="mt-1 text-lg font-semibold tabular-nums">
                      {formatRatioValue(c)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {ratios.dupont && (
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              DuPont Decomposition
            </div>
            <div className="grid gap-2 md:grid-cols-4">
              <DupontCard label="Net Margin" value={ratios.dupont.net_margin_pct} kind="pct" />
              <DupontCard label="Asset Turnover" value={ratios.dupont.asset_turnover} kind="ratio" />
              <DupontCard label="Financial Leverage" value={ratios.dupont.financial_leverage} kind="ratio" />
              <DupontCard label="ROE" value={ratios.dupont.roe_pct} kind="pct" highlight />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
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
  const display =
    value == null ? '—' : kind === 'pct' ? fmtPct(value) : fmtRatio(value);
  return (
    <div
      className={`rounded-md border p-3 ${highlight ? 'border-primary bg-primary/5' : ''}`}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{display}</div>
    </div>
  );
}

/* ================================================================
   HISTORICAL TABLE
================================================================== */

function HistoricalTableCard({
  years,
  groups,
}: {
  years: Array<string | number>;
  groups: {
    income: FinancialHistoricalRow[];
    balance: FinancialHistoricalRow[];
    cash: FinancialHistoricalRow[];
    other: FinancialHistoricalRow[];
  };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" /> Full Historical Data (AR &amp; YF side-by-side)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="income">
          <TabsList className="mb-3">
            {groups.income.length > 0 && <TabsTrigger value="income">Income ({groups.income.length})</TabsTrigger>}
            {groups.balance.length > 0 && <TabsTrigger value="balance">Balance Sheet ({groups.balance.length})</TabsTrigger>}
            {groups.cash.length > 0 && <TabsTrigger value="cash">Cash Flow ({groups.cash.length})</TabsTrigger>}
            {groups.other.length > 0 && <TabsTrigger value="other">Other ({groups.other.length})</TabsTrigger>}
          </TabsList>

          {(['income', 'balance', 'cash', 'other'] as const).map(key => {
            const rows = groups[key];
            if (!rows || rows.length === 0) return null;
            return (
              <TabsContent key={key} value={key}>
                <HistoricalTable years={years} rows={rows} />
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
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

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-background">Metric</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Source</TableHead>
            {years.map(y => (
              <TableHead key={String(y)} className="text-right whitespace-nowrap">
                {y}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => {
            const hasYf = row.yf_values && row.yf_values.some(v => v != null);
            return (
              <>
                <TableRow key={`${i}-ar`}>
                  <TableCell
                    rowSpan={hasYf ? 2 : 1}
                    className="sticky left-0 bg-background font-medium"
                  >
                    {row.metric}
                  </TableCell>
                  <TableCell rowSpan={hasYf ? 2 : 1} className="text-xs text-muted-foreground">
                    {row.unit}
                  </TableCell>
                  <TableCell className="text-xs">
                    <span
                      className="rounded px-1.5 py-0.5"
                      style={{ backgroundColor: `${AR_COLOR}22`, color: AR_COLOR }}
                    >
                      AR
                    </span>
                  </TableCell>
                  {row.values.map((v, j) => (
                    <TableCell
                      key={j}
                      className="text-right tabular-nums text-xs"
                      style={{ color: v == null ? undefined : AR_COLOR }}
                    >
                      {formatV(v, row.unit)}
                    </TableCell>
                  ))}
                </TableRow>
                {hasYf && (
                  <TableRow key={`${i}-yf`} className="border-b">
                    <TableCell className="text-xs">
                      <span
                        className="rounded px-1.5 py-0.5"
                        style={{ backgroundColor: `${YF_COLOR}22`, color: YF_COLOR }}
                      >
                        YF
                      </span>
                    </TableCell>
                    {row.yf_values!.map((v, j) => (
                      <TableCell
                        key={j}
                        className="text-right tabular-nums text-xs"
                        style={{ color: v == null ? undefined : YF_COLOR }}
                      >
                        {formatV(v, row.unit)}
                      </TableCell>
                    ))}
                  </TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/* ================================================================
   MARKET / GOVERNANCE
================================================================== */

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CircleDollarSign className="h-4 w-4" /> Market Snapshot
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-2 border-b border-border/50 py-1 last:border-0">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="tabular-nums">{value}</span>
            </div>
          ))}
        </div>
        {market.source && (
          <div className="mt-2 text-[10px] text-muted-foreground">
            Source: {market.source}
          </div>
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4" /> Governance Risk
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {rows.map(([label, v]) => (
            <div key={label}>
              <div className="mb-1 flex items-baseline justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="tabular-nums font-medium">
                  {v != null ? `${v.toFixed(1)} / 10` : '—'}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full ${riskColor(v)} transition-all`}
                  style={{ width: `${v != null ? Math.min(100, (v / 10) * 100) : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        {gov.scale_note && (
          <div className="mt-3 text-[10px] text-muted-foreground">
            {gov.scale_note}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default FinancialAnalysisView;
