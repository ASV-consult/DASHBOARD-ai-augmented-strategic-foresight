import { useMemo, useState } from 'react';
import { useForesight } from '@/contexts/ForesightContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  FileSearch,
  Gauge,
  Layers,
  LineChart as LineChartIcon,
  Search,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react';
import {
  FinancialRatioCard,
  FinancialStatementHighlight,
  FinancialStatementMetric,
  FinancialStatementSection,
} from '@/types/financial';

const asDate = (value?: string) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
};

const asNum = (value?: number | null, digits = 2) => {
  if (value === undefined || value === null || Number.isNaN(value)) return 'N/A';
  return value.toFixed(digits);
};

const asPct = (value?: number | null, digits = 1) => {
  if (value === undefined || value === null || Number.isNaN(value)) return 'N/A';
  return `${value.toFixed(digits)}%`;
};

const asDeltaPct = (value?: number | null, digits = 1) => {
  if (value === undefined || value === null || Number.isNaN(value)) return 'N/A';
  const normalized = Math.abs(value) <= 1 ? value * 100 : value;
  const sign = normalized > 0 ? '+' : '';
  return `${sign}${normalized.toFixed(digits)}%`;
};

const asCurrency = (value?: number | null, currency = 'EUR', compact = true) => {
  if (value === undefined || value === null || Number.isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: 2,
  }).format(value);
};

const tone = (status?: string) => {
  const s = String(status || '').toLowerCase();
  if (
    s.includes('material_gap') ||
    s.includes('material_lag') ||
    s.includes('high') ||
    s.includes('risk')
  ) {
    return 'bg-destructive/15 text-destructive border-destructive/30';
  }
  if (
    s.includes('watch') ||
    s.includes('medium') ||
    s.includes('lag')
  ) {
    return 'bg-amber-500/15 text-amber-600 border-amber-500/30';
  }
  if (
    s.includes('pass') ||
    s.includes('aligned') ||
    s.includes('outperform') ||
    s.includes('strong') ||
    s.includes('up')
  ) {
    return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
  }
  return 'bg-muted text-muted-foreground border-border';
};

const formatStatementValue = (
  metric: FinancialStatementMetric,
  currency: string,
) => {
  if (metric.value === undefined || metric.value === null) return 'N/A';
  if (metric.unit === 'currency') return asCurrency(metric.value, currency);
  if (metric.unit === 'percent') return asPct(metric.value, 1);

  if (metric.unit === 'ratio') {
    if (
      metric.metric_code.includes('margin') ||
      metric.metric_code.includes('growth') ||
      metric.metric_code.includes('yield') ||
      metric.metric_code.includes('conversion') ||
      metric.metric_code.includes('intensity')
    ) {
      return asPct(Math.abs(metric.value) <= 1 ? metric.value * 100 : metric.value, 1);
    }
    return asNum(metric.value, 2);
  }

  return asNum(metric.value, 2);
};

const RatioCardGroup = ({
  title,
  cards,
  currency,
}: {
  title: string;
  cards?: FinancialRatioCard[];
  currency: string;
}) => {
  if (!cards?.length) return null;

  return (
    <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {cards.map((item) => (
          <div key={`${title}-${item.label}`} className="rounded-xl border border-border/50 bg-background/70 p-3">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {item.kind === 'percent'
                ? asPct(item.value, 1)
                : item.kind === 'currency'
                  ? asCurrency(item.value, currency)
                  : asNum(item.value, 2)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

const StatementHighlights = ({
  title,
  rows,
}: {
  title: string;
  rows?: FinancialStatementHighlight[];
}) => {
  if (!rows?.length) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {rows.slice(0, 6).map((row, idx) => (
          <div key={`${title}-${row.metric_code || idx}`} className="rounded-xl border border-border/50 bg-background/70 p-3">
            <p className="text-sm font-medium text-foreground">{row.label || row.metric_code || 'Metric'}</p>
            <p className="mt-1 text-xs text-muted-foreground">Status: {row.status || 'n/a'}</p>
            <p className="text-xs text-muted-foreground">Peer gap: {asNum(row.peer_gap, 2)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const StatementCard = ({
  section,
  currency,
}: {
  section?: FinancialStatementSection;
  currency: string;
}) => {
  if (!section) return null;

  return (
    <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="text-base">{section.title}</CardTitle>
        {section.summary && <p className="text-sm text-muted-foreground">{section.summary}</p>}
        {section.question && (
          <p className="rounded-xl border border-border/50 bg-background/70 p-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Analyst prompt:</span> {section.question}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {section.expert_assessment && (
          <p className="rounded-xl border border-border/50 bg-background/70 p-3 text-sm text-muted-foreground">
            {section.expert_assessment}
          </p>
        )}
        {section.metrics?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2">Metric</th>
                  <th className="px-2 py-2">Value</th>
                  <th className="px-2 py-2">YoY</th>
                  <th className="px-2 py-2">Peer median</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {section.metrics.map((metric) => (
                  <tr key={metric.metric_code} className="border-b border-border/40">
                    <td className="px-2 py-2 font-medium text-foreground">{metric.label}</td>
                    <td className="px-2 py-2">{formatStatementValue(metric, currency)}</td>
                    <td className="px-2 py-2">{asDeltaPct(metric.yoy_change_pct, 1)}</td>
                    <td className="px-2 py-2">{asNum(metric.peer_median, 2)}</td>
                    <td className="px-2 py-2">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${tone(metric.status)}`}>
                        {metric.status || 'n/a'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <StatementHighlights title="Top strengths" rows={section.top_strengths} />
        <StatementHighlights title="Top risks" rows={section.top_risks} />
      </CardContent>
    </Card>
  );
};

export function FinancialAnalysisView() {
  const { financialData } = useForesight();
  const [activeTab, setActiveTab] = useState<'executive' | 'performance' | 'statements' | 'validation'>(
    'executive',
  );
  const currency = financialData?.company_profile?.currency || 'EUR';
  const statementLab = financialData?.statement_lab;
  const statementEntries = [
    statementLab?.statements?.income_statement,
    statementLab?.statements?.balance_sheet,
    statementLab?.statements?.cash_flow,
  ].filter(Boolean) as FinancialStatementSection[];

  const trendRows = useMemo(() => {
    const charts = financialData?.financial_charts;
    if (!charts?.years?.length) return [];
    return charts.years.map((year, idx) => ({
      year,
      revenue_b: charts.revenue_b?.[idx],
      ebitda_m: charts.ebitda_m?.[idx],
      free_cash_flow_m: charts.free_cash_flow_m?.[idx],
      gross_margin_pct: charts.gross_margin_pct?.[idx],
      operating_margin_pct: charts.operating_margin_pct?.[idx],
      ebitda_margin_pct: charts.ebitda_margin_pct?.[idx],
    }));
  }, [financialData?.financial_charts]);

  if (!financialData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CircleDollarSign className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground">No Financial Stream Loaded</h3>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Upload a financial analysis JSON payload to unlock this stream.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-background/80 via-card/80 to-emerald-500/10 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-500/20 blur-3xl" />
        <CardContent className="relative grid grid-cols-1 gap-6 p-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-border/60 bg-background/70 p-2 shadow-sm">
                <Building2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Financial Analysis Stream</p>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  {financialData.company_profile?.name || financialData.run_meta?.company}
                </h2>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {financialData.executive?.executive_thesis
                || (financialData as any).executive_summary
                || 'No executive thesis provided.'}
            </p>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <Badge variant="outline" className="font-mono">
                {financialData.company_profile?.ticker || financialData.run_meta?.ticker}
              </Badge>
              <Badge variant="outline">Schema {financialData.schema_version}</Badge>
              <Badge variant="outline">Generated {asDate(financialData.generated_at_utc)}</Badge>
              {financialData.run_meta?.preferred_year !== undefined && (
                <Badge variant="outline">Preferred year {financialData.run_meta.preferred_year}</Badge>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Market cap</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {financialData.market_snapshot?.market_cap_display ||
                  asCurrency(financialData.market_snapshot?.market_cap, currency)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Price</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {financialData.market_snapshot?.price_display ||
                  asCurrency(financialData.market_snapshot?.price, currency)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Top flag severity</p>
              <p className="mt-1 text-lg font-semibold text-foreground capitalize">
                {financialData.executive?.top_flag?.severity || 'n/a'}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Run status</p>
              <p className="mt-1 text-lg font-semibold text-foreground capitalize">
                {financialData.run_meta?.status || 'n/a'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList className="flex w-full flex-wrap items-center gap-2 rounded-full border border-border/60 bg-card/70 p-1 shadow-sm backdrop-blur">
          <TabsTrigger value="executive" className="rounded-full px-4 py-2 text-xs font-medium">
            <Sparkles className="mr-1 h-4 w-4" />
            Executive Pulse
          </TabsTrigger>
          <TabsTrigger value="performance" className="rounded-full px-4 py-2 text-xs font-medium">
            <LineChartIcon className="mr-1 h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="statements" className="rounded-full px-4 py-2 text-xs font-medium">
            <Layers className="mr-1 h-4 w-4" />
            Statement Lab
          </TabsTrigger>
          <TabsTrigger value="validation" className="rounded-full px-4 py-2 text-xs font-medium">
            <ClipboardCheck className="mr-1 h-4 w-4" />
            Validation Layer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="executive" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Outcome Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>
                  {financialData.executive?.professional_outcome_report
                    || (financialData as any).executive_summary
                    || 'No outcome report provided.'}
                </p>
                <div className="rounded-xl border border-border/50 bg-background/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Critic verdict</p>
                  <p className="mt-1 text-sm text-foreground">
                    {financialData.executive?.critic_verdict || 'No critic verdict provided.'}
                  </p>
                </div>
                {financialData.executive?.top_flag && (
                  <div className="rounded-xl border border-border/50 bg-background/70 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Top flag</p>
                      <Badge className={tone(financialData.executive.top_flag.severity)}>
                        {financialData.executive.top_flag.severity || 'n/a'}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-foreground">
                      {financialData.executive.top_flag.message || 'No message'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Gauge className="h-4 w-4 text-primary" />
                  Risk Snapshot
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  {
                    label: 'Deterministic flags',
                    value: financialData.executive?.risk_snapshot?.deterministic_flags_total,
                  },
                  {
                    label: 'High severity flags',
                    value: financialData.executive?.risk_snapshot?.high_severity_flags,
                  },
                  {
                    label: 'Risk signals',
                    value: financialData.executive?.risk_snapshot?.risk_signals,
                  },
                  {
                    label: 'Accounting checks',
                    value: financialData.executive?.risk_snapshot?.medium_or_high_accounting_checks,
                  },
                  {
                    label: 'Low confidence claims',
                    value: financialData.executive?.risk_snapshot?.low_confidence_claims,
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-border/50 bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-xl font-semibold text-foreground">
                      {item.value === undefined || item.value === null ? 'N/A' : item.value}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {financialData.kpis?.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {financialData.kpis.map((kpi) => (
                <Card key={kpi.key} className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="mt-1 text-xl font-semibold text-foreground">
                      {kpi.display_value || asCurrency(kpi.value, currency)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{kpi.subtext}</p>
                    {kpi.trend && (
                      <Badge className={`mt-2 ${tone(kpi.trend)}`}>{kpi.trend}</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          {financialData.key_takeaways?.length ? (
            <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Key Takeaways
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {financialData.key_takeaways.map((item) => (
                  <div key={item.headline} className="rounded-xl border border-border/50 bg-background/70 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-foreground">{item.headline}</h4>
                      {item.priority ? <Badge className={tone(item.priority)}>{item.priority}</Badge> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {financialData.analysis_sections?.length ? (
            <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileSearch className="h-4 w-4 text-primary" />
                  Analysis Sections
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {financialData.analysis_sections.map((section, idx) => {
                  // Support both shapes: { aspect_key, title, text } and { title, narrative, flags }
                  const anySection = section as any;
                  const title = anySection.title || anySection.aspect_key || `Section ${idx + 1}`;
                  const subtitle = anySection.aspect_key && anySection.aspect_key !== title ? anySection.aspect_key : null;
                  const body = anySection.text || anySection.narrative || '';
                  const flags = Array.isArray(anySection.flags) ? anySection.flags : [];
                  return (
                    <div key={title + idx} className="rounded-xl border border-border/50 bg-background/70 p-3">
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      {subtitle && (
                        <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{subtitle}</p>
                      )}
                      {flags.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {flags.map((f: string, i: number) => (
                            <li key={i} className="text-xs text-amber-700">⚠ {f}</li>
                          ))}
                        </ul>
                      )}
                      {body && <p className="mt-2 text-sm text-muted-foreground">{body}</p>}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <LineChartIcon className="h-4 w-4 text-primary" />
                  Multi-year Financial Trajectory
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                {trendRows.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendRows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="revenue_b" name="Revenue (B)" stroke="#2563eb" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="ebitda_m" name="EBITDA (M)" stroke="#059669" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="free_cash_flow_m" name="FCF (M)" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No financial chart series available.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-primary" />
                  Margin Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                {trendRows.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendRows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="year" />
                      <YAxis tickFormatter={(value) => `${value}%`} />
                      <Tooltip formatter={(value: number) => asPct(value, 1)} />
                      <Legend />
                      <Area type="monotone" dataKey="gross_margin_pct" name="Gross margin" stroke="#0ea5e9" fill="#0ea5e933" />
                      <Line type="monotone" dataKey="operating_margin_pct" name="Operating margin" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="ebitda_margin_pct" name="EBITDA margin" stroke="#22c55e" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No margin chart data available.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CircleDollarSign className="h-4 w-4 text-primary" />
                  Market Snapshot
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  ['P/E', asNum(financialData.market_snapshot?.pe_ratio, 2)],
                  ['EV/EBITDA', asNum(financialData.market_snapshot?.ev_to_ebitda, 2)],
                  ['Price/Book', asNum(financialData.market_snapshot?.price_to_book, 2)],
                  ['Dividend yield', asPct(financialData.market_snapshot?.dividend_yield_pct, 2)],
                  ['52w change', asPct(financialData.market_snapshot?.fifty_two_week_change_pct, 1)],
                  ['Beta', asNum(financialData.market_snapshot?.beta, 2)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-border/50 bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Governance Scores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  ['Audit', financialData.governance_scores?.audit_risk],
                  ['Board', financialData.governance_scores?.board_risk],
                  ['Compensation', financialData.governance_scores?.compensation_risk],
                  ['Shareholder rights', financialData.governance_scores?.shareholder_rights_risk],
                  ['Overall', financialData.governance_scores?.overall_risk],
                ].map(([label, value]) => (
                  <div key={String(label)} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-semibold text-foreground">{asNum(value as number, 1)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(0, Math.min(100, Number(value || 0) * 10))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" />
                Scenario Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {financialData.scenario_analysis?.summary && (
                <p className="text-sm text-muted-foreground">{financialData.scenario_analysis.summary}</p>
              )}
              {financialData.scenario_analysis?.rows?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-2 py-2">Scenario</th>
                        <th className="px-2 py-2">Rev growth</th>
                        <th className="px-2 py-2">EBITDA margin</th>
                        <th className="px-2 py-2">Debt/EBITDA</th>
                        <th className="px-2 py-2">Implied equity</th>
                        <th className="px-2 py-2">Upside</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financialData.scenario_analysis.rows.map((row) => (
                        <tr key={row.name} className="border-b border-border/40">
                          <td className="px-2 py-2 font-medium capitalize text-foreground">{row.name}</td>
                          <td className="px-2 py-2">{asPct(row.revenue_growth_pct, 1)}</td>
                          <td className="px-2 py-2">{asPct(row.ebitda_margin_pct, 1)}</td>
                          <td className="px-2 py-2">{asNum(row.projected_debt_to_ebitda, 2)}</td>
                          <td className="px-2 py-2">{asCurrency(row.implied_equity_value, currency)}</td>
                          <td className="px-2 py-2">{asPct(row.implied_upside_pct, 1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No scenario rows available.</p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <RatioCardGroup title="Profitability & Returns" cards={financialData.ratio_cards?.profitability_returns} currency={currency} />
            <RatioCardGroup title="Liquidity & Solvency" cards={financialData.ratio_cards?.liquidity_solvency} currency={currency} />
            <RatioCardGroup title="Efficiency" cards={financialData.ratio_cards?.efficiency} currency={currency} />
            <RatioCardGroup title="Valuation & Governance" cards={financialData.ratio_cards?.valuation_governance} currency={currency} />
          </div>

          {financialData.ratio_cards?.dupont ? (
            <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Workflow className="h-4 w-4 text-primary" />
                  DuPont Decomposition
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-border/50 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">Net margin</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {asPct(financialData.ratio_cards.dupont.net_margin_pct, 1)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">Asset turnover</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {asNum(financialData.ratio_cards.dupont.asset_turnover, 2)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">Financial leverage</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {asNum(financialData.ratio_cards.dupont.financial_leverage, 2)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">ROE</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {asPct(financialData.ratio_cards.dupont.roe_pct, 1)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {financialData.multi_year_context?.highlights?.length ? (
              <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Multi-year Highlights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {financialData.multi_year_context.highlights.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                      <span>{item}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            {financialData.historical_table?.rows?.length ? (
              <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Historical Table</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-2 py-2">Metric</th>
                        <th className="px-2 py-2">Unit</th>
                        {financialData.historical_table.years.map((year) => (
                          <th key={year} className="px-2 py-2">{year}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {financialData.historical_table.rows.map((row) => {
                        // Defensive: support either array values (canonical contract)
                        // or object values keyed by year (older / alternative producers)
                        const years = financialData.historical_table?.years ?? [];
                        const valueAt = (idx: number, year: string): number | null => {
                          if (Array.isArray(row.values)) return row.values[idx] ?? null;
                          if (row.values && typeof row.values === 'object') {
                            const obj = row.values as Record<string, number | null>;
                            return obj[year] ?? null;
                          }
                          return null;
                        };
                        return (
                          <tr key={row.metric} className="border-b border-border/40">
                            <td className="px-2 py-2 font-medium text-foreground">{row.metric}</td>
                            <td className="px-2 py-2 text-muted-foreground">{row.unit}</td>
                            {years.map((year, idx) => {
                              const value = valueAt(idx, year);
                              return (
                                <td key={`${row.metric}-${idx}`} className="px-2 py-2">
                                  {value === null ? 'N/A' : asNum(value, 2)}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="statements" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Returns Dimension Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {statementLab?.returns_dimension_metrics?.length ? (
                  statementLab.returns_dimension_metrics.map((metric) => (
                    <div key={metric.metric_name} className="rounded-xl border border-border/50 bg-background/70 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{metric.metric_name}</p>
                        <Badge className={tone(metric.status)}>{metric.status || 'n/a'}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Target {asNum(metric.target_value, 2)} vs peer median {asNum(metric.peer_median, 2)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No returns dimension metrics provided.</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Liquidity Dimension Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {statementLab?.liquidity_dimension_metrics?.length ? (
                  statementLab.liquidity_dimension_metrics.map((metric) => (
                    <div key={metric.metric_name} className="rounded-xl border border-border/50 bg-background/70 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{metric.metric_name}</p>
                        <Badge className={tone(metric.status)}>{metric.status || 'n/a'}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Target {asNum(metric.target_value, 2)} vs peer median {asNum(metric.peer_median, 2)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No liquidity metrics provided.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {statementEntries.map((section) => (
            <StatementCard key={section.title} section={section} currency={currency} />
          ))}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Peer FX Context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {financialData.peer_fx_context?.requires_fx_normalization
                    ? 'Mixed-currency peer set detected. Ratio-based comparisons are safer than absolute level comparisons.'
                    : 'Peer set appears currency-homogeneous.'}
                </p>
                {financialData.peer_fx_context?.approved_peers?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {financialData.peer_fx_context.approved_peers.map((peer) => (
                      <Badge key={peer} variant="outline" className="font-mono text-[11px]">
                        {peer}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Sector Intelligence Pack</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Pack: <span className="font-medium text-foreground">{financialData.sector_intelligence?.pack || 'n/a'}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Sector / Industry:{' '}
                  <span className="font-medium text-foreground">
                    {financialData.sector_intelligence?.detected_sector || 'n/a'} /{' '}
                    {financialData.sector_intelligence?.detected_industry || 'n/a'}
                  </span>
                </p>
                {financialData.sector_intelligence?.focus_metrics?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {financialData.sector_intelligence.focus_metrics.map((metric) => (
                      <Badge key={metric} variant="secondary" className="text-[11px]">
                        {metric}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="validation" className="space-y-6 pt-4">
          <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Search className="h-4 w-4 text-primary" />
                Discrepancy Bridge
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {financialData.discrepancy_bridge?.summary || 'No discrepancy summary provided.'}
              </p>
              {financialData.discrepancy_bridge?.overall_assessment && (
                <p className="rounded-xl border border-border/50 bg-background/70 p-3 text-sm text-muted-foreground">
                  {financialData.discrepancy_bridge.overall_assessment}
                </p>
              )}
              {financialData.discrepancy_bridge?.rows?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-2 py-2">Metric</th>
                        <th className="px-2 py-2">Statement</th>
                        <th className="px-2 py-2">Status</th>
                        <th className="px-2 py-2">Gap %</th>
                        <th className="px-2 py-2">Next check</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financialData.discrepancy_bridge.rows.map((row) => (
                        <tr key={row.metric_key} className="border-b border-border/40">
                          <td className="px-2 py-2 font-medium text-foreground">{row.metric_key}</td>
                          <td className="px-2 py-2">{row.statement || 'n/a'}</td>
                          <td className="px-2 py-2">
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${tone(row.status)}`}>
                              {row.status || 'n/a'}
                            </span>
                          </td>
                          <td className="px-2 py-2">{asDeltaPct(row.gap_pct_estimate, 1)}</td>
                          <td className="px-2 py-2 text-muted-foreground">{row.next_check || 'n/a'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Accounting Quality Checks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {financialData.accounting_quality?.summary || 'No accounting quality summary provided.'}
                </p>
                {financialData.accounting_quality?.checks?.map((check) => (
                  <div key={check.check_id} className="rounded-xl border border-border/50 bg-background/70 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{check.check_id}</p>
                      <Badge className={tone(check.severity)}>{check.severity}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{check.message}</p>
                    {check.recommendation && (
                      <p className="mt-1 text-xs text-muted-foreground">Recommendation: {check.recommendation}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardCheck className="h-4 w-4 text-primary" />
                  Verification Confidence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {financialData.verification?.claim_confidence_rows?.length ? (
                  financialData.verification.claim_confidence_rows.map((item) => (
                    <div key={item.claim_id} className="rounded-xl border border-border/50 bg-background/70 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{item.claim_id}</p>
                        <Badge className={tone(item.confidence_level)}>
                          {item.confidence_level} ({asNum(item.confidence_score, 2)})
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{item.claim_text}</p>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.max(0, Math.min(100, (item.confidence_score || 0) * 100))}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No verification rows provided.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Workflow className="h-4 w-4 text-primary" />
                Challenge Loop
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {financialData.challenge_loop?.verdict && (
                <Badge className={tone(financialData.challenge_loop.verdict)}>
                  Verdict: {financialData.challenge_loop.verdict}
                </Badge>
              )}
              {[
                ['Contradictions', financialData.challenge_loop?.contradictions],
                ['Weak causality', financialData.challenge_loop?.weak_causality],
                ['Missing risks', financialData.challenge_loop?.missing_risks],
                ['Revision actions', financialData.challenge_loop?.revision_actions],
              ].map(([title, list]) =>
                Array.isArray(list) && list.length ? (
                  <div key={title as string} className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {title}
                    </h4>
                    <div className="space-y-2">
                      {list.map((item, idx) => (
                        <div key={`${title}-${idx}`} className="rounded-xl border border-border/50 bg-background/70 p-3 text-sm text-muted-foreground">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null,
              )}
              {financialData.challenge_loop?.revised_outcome_focus && (
                <p className="rounded-xl border border-border/50 bg-background/70 p-3 text-sm text-foreground">
                  {financialData.challenge_loop.revised_outcome_focus}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                  Action Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {financialData.action_plan?.length ? (
                  financialData.action_plan.map((item, idx) => (
                    <div key={`${item.owner}-${idx}`} className="rounded-xl border border-border/50 bg-background/70 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{item.owner}</p>
                        {item.urgency && <Badge className={tone(item.urgency)}>{item.urgency}</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{item.action}</p>
                      {item.rationale && <p className="mt-1 text-xs text-muted-foreground">{item.rationale}</p>}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No action plan rows provided.</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Gauge className="h-4 w-4 text-primary" />
                  Monitoring Indicators
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {financialData.monitoring_indicators?.length ? (
                  financialData.monitoring_indicators.map((item) => (
                    <div key={`${item.metric}-${item.trigger}`} className="rounded-xl border border-border/50 bg-background/70 p-3">
                      <p className="text-sm font-medium text-foreground">{item.metric}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.why}</p>
                      {item.trigger && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Trigger: <span className="font-medium text-foreground">{item.trigger}</span>
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No monitoring indicators provided.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {financialData.challenge_followup?.research_items?.length ? (
            <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Challenge Follow-up Research</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {financialData.challenge_followup.research_items.map((item, idx) => (
                  <div key={`${item.action}-${idx}`} className="rounded-xl border border-border/50 bg-background/70 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{item.action || 'Action item'}</p>
                      {item.confidence ? <Badge className={tone(item.confidence)}>{item.confidence}</Badge> : null}
                    </div>
                    {item.research_findings && <p className="text-sm text-muted-foreground">{item.research_findings}</p>}
                    {item.recommended_update && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Recommended update: {item.recommended_update}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
