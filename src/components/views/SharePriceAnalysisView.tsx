import { useMemo } from 'react';
import { useForesight } from '@/contexts/ForesightContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  CandlestickChart,
  CheckCircle2,
  Clock,
  LineChart as LineChartIcon,
  Radar,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

const asPct = (value?: number | null, digits = 1) => {
  if (value === undefined || value === null || Number.isNaN(value)) return 'N/A';
  const normalized = Math.abs(value) <= 1 ? value * 100 : value;
  return `${normalized.toFixed(digits)}%`;
};

const asDeltaPct = (value?: number | null, digits = 1) => {
  if (value === undefined || value === null || Number.isNaN(value)) return 'N/A';
  const normalized = Math.abs(value) <= 1 ? value * 100 : value;
  const sign = normalized > 0 ? '+' : '';
  return `${sign}${normalized.toFixed(digits)}%`;
};

const asNum = (value?: number | null, digits = 2) => {
  if (value === undefined || value === null || Number.isNaN(value)) return 'N/A';
  return value.toFixed(digits);
};

const asDate = (value?: string) => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
};

const confidenceTone = (value?: number) => {
  if (value === undefined || value === null) return 'bg-muted text-muted-foreground';
  if (value >= 0.75) return 'bg-emerald-500/15 text-emerald-600';
  if (value >= 0.5) return 'bg-amber-500/15 text-amber-600';
  return 'bg-destructive/15 text-destructive';
};

export function SharePriceAnalysisView() {
  const { sharePriceData } = useForesight();

  const eventChartData = useMemo(() => {
    if (!sharePriceData?.key_events?.length) return [];
    return sharePriceData.key_events.map((event) => ({
      label: event.date?.slice(5) || event.date,
      return_1d: event.return_1d ? event.return_1d * 100 : 0,
      abnormal_1d: event.abnormal_return_1d ? event.abnormal_return_1d * 100 : 0,
    }));
  }, [sharePriceData?.key_events]);

  if (!sharePriceData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CandlestickChart className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground">No Share Price Stream Loaded</h3>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Upload your agentic share-price analysis JSON to unlock this view.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-background/80 via-card/80 to-sky-500/10 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-sky-500/20 blur-3xl" />
        <CardContent className="relative grid grid-cols-1 gap-4 p-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-border/60 bg-background/70 p-2 shadow-sm">
                <CandlestickChart className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Share Price Analysis</p>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  {sharePriceData._meta?.company || 'Company'}
                </h2>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{sharePriceData.executive_summary || 'No executive summary provided.'}</p>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <Badge variant="outline" className="font-mono">
                {sharePriceData._meta?.ticker || 'Ticker'}
              </Badge>
              <Badge variant="outline">{sharePriceData._meta?.model || 'Agent Model'}</Badge>
              <Badge variant="outline">Run {sharePriceData._meta?.run_id || 'n/a'}</Badge>
              <Badge variant="outline">Generated {asDate(sharePriceData._meta?.generated_at)}</Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Current regime</p>
              <p className="mt-1 text-lg font-semibold capitalize text-foreground">
                {sharePriceData.price_profile?.current_regime || 'n/a'}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Current price</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {asNum(sharePriceData.price_profile?.current_price, 2)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Total return</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {asPct(sharePriceData.price_profile?.total_return, 1)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Max drawdown</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {asPct(sharePriceData.price_profile?.max_drawdown, 1)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LineChartIcon className="h-4 w-4 text-primary" />
              Price Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              ['CAGR', asPct(sharePriceData.price_profile?.cagr, 2)],
              ['Annualized volatility', asPct(sharePriceData.price_profile?.annualized_volatility, 1)],
              ['52w high', asNum(sharePriceData.price_profile?.['52w_high'], 2)],
              ['52w low', asNum(sharePriceData.price_profile?.['52w_low'], 2)],
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
              <Radar className="h-4 w-4 text-primary" />
              Earnings Pattern
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{sharePriceData.earnings_pattern?.summary || 'No earnings pattern summary provided.'}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-border/50 bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">Avg Day-0 reaction</p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {asPct(sharePriceData.earnings_pattern?.avg_day0_reaction, 2)}
                </p>
              </div>
              <div className="rounded-xl border border-border/50 bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">Avg abnormal Day-0</p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {asPct(sharePriceData.earnings_pattern?.avg_abnormal_day0, 2)}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="capitalize">
              Market tendency: {sharePriceData.earnings_pattern?.market_tendency || 'n/a'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Long-term Narrative
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {sharePriceData.trend_narrative?.long_term || 'No long-term narrative provided.'}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" />
              Medium-term Narrative
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {sharePriceData.trend_narrative?.medium_term || 'No medium-term narrative provided.'}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Recent Narrative
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {sharePriceData.trend_narrative?.recent || 'No recent narrative provided.'}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LineChartIcon className="h-4 w-4 text-primary" />
            Event Return vs Abnormal Return (1D)
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          {eventChartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                <Legend />
                <Bar dataKey="return_1d" name="Return 1D %" fill="#64748b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="abnormal_1d" name="Abnormal 1D %" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No key event chart data available.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-primary" />
            Key Event Forensics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sharePriceData.key_events?.length ? (
            sharePriceData.key_events.map((event) => (
              <div key={`${event.date}-${event.event_type}`} className="rounded-xl border border-border/50 bg-background/70 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{asDate(event.date)}</Badge>
                    <Badge variant="secondary">{event.event_type}</Badge>
                  </div>
                  <Badge className={confidenceTone(event.confidence)}>
                    Confidence {event.confidence === undefined ? 'n/a' : asNum(event.confidence, 2)}
                  </Badge>
                </div>
                <div className="mb-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <p className="text-muted-foreground">
                    Return 1D: <span className="font-semibold text-foreground">{asDeltaPct(event.return_1d, 1)}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Abnormal 1D:{' '}
                    <span className="font-semibold text-foreground">{asDeltaPct(event.abnormal_return_1d, 1)}</span>
                  </p>
                </div>
                {event.explanation && <p className="text-sm text-muted-foreground">{event.explanation}</p>}
                {event.market_lesson && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Market lesson:</span> {event.market_lesson}
                  </p>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No key events provided.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-primary" />
              Forward Risk Factors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {sharePriceData.risk_factors?.length ? (
              sharePriceData.risk_factors.map((risk, idx) => (
                <div key={idx} className="rounded-xl border border-border/50 bg-background/70 p-3">
                  {risk}
                </div>
              ))
            ) : (
              <p>No risk factors provided.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Monitoring Priorities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {sharePriceData.monitoring_priorities?.length ? (
              sharePriceData.monitoring_priorities.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-border/50 bg-background/70 p-3">
                  {item}
                </div>
              ))
            ) : (
              <p>No monitoring priorities provided.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Peer Context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{sharePriceData.peer_context?.summary || 'No peer context summary provided.'}</p>
          <p>
            Relative performance (12m):{' '}
            <span className="font-semibold text-foreground">
              {asPct(sharePriceData.peer_context?.relative_performance_12m, 1)}
            </span>
          </p>
          {sharePriceData.peer_context?.key_divergences?.length ? (
            <div className="space-y-2">
              {sharePriceData.peer_context.key_divergences.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-border/50 bg-background/70 p-3">
                  {item}
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
