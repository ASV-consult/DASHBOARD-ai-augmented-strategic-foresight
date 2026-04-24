import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  CircleDot,
  Clock3,
  ExternalLink,
  FileText,
  FolderTree,
  LayoutGrid,
  Link2,
  Microscope,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  CartesianGrid,
  Label as RechartsLabel,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useForesight } from '@/contexts/ForesightContext';
import {
  buildMacroPortfolioModel,
  cleanMacroText,
  compactJoin,
  formatMacroConfidence,
  getActivityEvidence,
  getActivitySummary,
  getRouteLookup,
  getSegmentEvidence,
  getSegmentSummary,
  isReadyNode,
  prepareMacroMarkdown,
} from '@/lib/macro-standard';
import { cn, getSafeExternalUrl } from '@/lib/utils';
import {
  MacroActivityView,
  MacroEntryMode,
  MacroNavigationNode,
  MacroScoreMetric,
  MacroSegmentView,
  MacroSourceRecord,
} from '@/types/macro';

interface MacroDashboardProps {
  initialMode?: MacroEntryMode;
  onRequestModeChange?: (mode: MacroEntryMode) => void;
}

const toneClassName: Record<string, string> = {
  negative: 'border-rose-500/40 bg-rose-500/15 text-rose-700',
  destructive: 'border-red-600/45 bg-red-600/15 text-red-700',  // stronger variant of negative
  warning: 'border-amber-500/35 bg-amber-500/10 text-amber-700',
  positive: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700',
  neutral: 'border-slate-400/35 bg-slate-400/10 text-slate-700',
  secondary: 'border-slate-400/35 bg-slate-400/10 text-slate-700',  // alias for neutral
};

// Status-label palette — the label itself drives color when tone is absent or generic.
// This ensures Contested / Advantaged / Distinctive / Fragile / etc. each get visually
// distinct styling regardless of upstream tone mismatches.
const STATUS_LABEL_TONE: Record<string, string> = {
  // right-to-play scale
  weak: 'negative',
  contested: 'warning',
  credible: 'neutral',
  advantaged: 'positive',
  distinctive: 'positive',
  // sustainability scale
  eroding: 'negative',
  fragile: 'negative',
  holding: 'neutral',
  durable: 'positive',
  compounding: 'positive',
  // other common status labels
  leading: 'positive',
  strong: 'positive',
  stable: 'neutral',
  pressured: 'warning',
  'at risk': 'negative',
  impaired: 'negative',
  pending: 'neutral',
  ready: 'positive',
  active: 'positive',
};

const modeNote = {
  dashboard:
    'Decision dashboard mode. Compare readiness, scan segment calls, and open drill-downs only where the evidence is real.',
  reading:
    'Reading mode starts inside the richest available memo and keeps the same drill-down model without relying on a separate legacy reading bundle.',
};

const formatBadgeClassName = (tone?: string, label?: string) => {
  // 1. Honour explicit tone if known
  const t = cleanMacroText(tone).toLowerCase();
  if (t && toneClassName[t]) return toneClassName[t];
  // 2. Otherwise infer from label (so "Contested" never defaults to the same grey as "Holding")
  const l = cleanMacroText(label).toLowerCase();
  if (l && STATUS_LABEL_TONE[l]) return toneClassName[STATUS_LABEL_TONE[l]];
  return toneClassName.neutral;
};

const formatPublicationDate = (value?: string | null) => {
  const cleaned = cleanMacroText(value);
  if (!cleaned) return 'Date not specified';
  const parsed = Date.parse(cleaned);
  if (Number.isNaN(parsed)) return cleaned;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(parsed));
};

const formatMetricValue = (value?: number | string | null) => {
  if (typeof value === 'number') return Number.isInteger(value) ? `${value}` : value.toFixed(1);
  return cleanMacroText(String(value || '')) || 'Pending';
};

const formatCount = (current?: number, total?: number) =>
  typeof current === 'number' && typeof total === 'number' ? `${current}/${total}` : 'Pending';

const SCORE_META: Record<string, { definition: string; scale: string[] }> = {
  'Market Trajectory': {
    definition: 'How the target market is moving — is the addressable value pool growing or contracting?',
    scale: ['Contracting', 'Declining', 'Transitioning', 'Improving', 'Accelerating'],
  },
  'Market': {
    definition: 'How the target market is moving — is the addressable value pool growing or contracting?',
    scale: ['Contracting', 'Declining', 'Transitioning', 'Improving', 'Accelerating'],
  },
  'Right To Play': {
    definition: 'How well-positioned the company is to compete and win — based on capabilities, relationships, and differentiation.',
    scale: ['Weak', 'Contested', 'Credible', 'Advantaged', 'Distinctive'],
  },
  'Sustainability': {
    definition: 'How durable the competitive position is over time — resistance to erosion by rivals, substitutes, or structural change.',
    scale: ['Eroding', 'Fragile', 'Holding', 'Durable', 'Compounding'],
  },
  'Position Sustainability': {
    definition: 'How durable the competitive position is over time — resistance to erosion by rivals, substitutes, or structural change.',
    scale: ['Eroding', 'Fragile', 'Holding', 'Durable', 'Compounding'],
  },
};

// Score colour — ties to the label (Fragile = red, Advantaged = green, etc)
const scoreColour = (label: string | null): string => {
  if (!label) return 'text-slate-500';
  const l = label.toLowerCase();
  if (['eroding', 'fragile', 'contracting', 'declining', 'weak'].includes(l)) return 'text-rose-600';
  if (['contested', 'transitioning'].includes(l)) return 'text-amber-600';
  if (['holding', 'credible'].includes(l)) return 'text-slate-600';
  if (['durable', 'improving', 'advantaged'].includes(l)) return 'text-emerald-600';
  if (['compounding', 'accelerating', 'distinctive'].includes(l)) return 'text-emerald-700';
  return 'text-slate-500';
};

// Pull the per-metric reasoning string from a scorecard's metrics array.
// Used at every ScoreBar callsite so the hover tooltip can show "why this score".
const reasoningFor = (
  scorecard: { metrics?: Array<{ metric_key: string; reasoning?: string | null }> } | undefined | null,
  metricKey: 'market_trajectory' | 'right_to_play' | 'position_sustainability',
): string | undefined => {
  if (!scorecard?.metrics) return undefined;
  const m = scorecard.metrics.find((x) => x.metric_key === metricKey);
  return m?.reasoning ?? undefined;
};

// Map a 1-10 score to one of the 5 bucket labels. Each label covers 2 levels.
const bucketLabel10 = (label: string, value: number | null | undefined): string | null => {
  const meta = SCORE_META[label];
  if (!meta || value == null) return null;
  const rounded = Math.round(value);
  if (rounded < 1 || rounded > 10) return null;
  // 1-2 -> idx 0, 3-4 -> idx 1, 5-6 -> idx 2, 7-8 -> idx 3, 9-10 -> idx 4
  const idx = Math.min(4, Math.floor((rounded - 1) / 2));
  return meta.scale[idx];
};

const ScoreBar = ({
  label,
  value,
  reasoning,
  maxScore = 10,
}: {
  label: string;
  value?: number | null;
  reasoning?: string;
  maxScore?: number;
}) => {
  const max = maxScore || 10;
  const normalized = Math.max(0, Math.min(max, value ?? 0));
  const meta = SCORE_META[label];
  const scaleLabel = max === 10
    ? bucketLabel10(label, value ?? null)
    : (meta && value != null && Math.round(value) >= 1 && Math.round(value) <= 5
       ? meta.scale[Math.round(value) - 1]
       : null);
  const colour = scoreColour(scaleLabel);
  // Fill proportion 0-1 for the bar
  const fill = value == null ? 0 : normalized / max;

  const bar = (
    <div className="h-full rounded-xl border border-border/60 bg-background/80 px-2.5 py-2 min-w-0">
      <div className="flex items-center justify-between gap-1">
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground truncate">
          {label}
        </p>
        {meta || reasoning ? (
          <span className="text-[9px] text-muted-foreground/60 leading-none">?</span>
        ) : null}
      </div>
      <div className="mt-1 flex items-baseline gap-1 min-w-0">
        <span className="text-base font-bold text-foreground tabular-nums">
          {value === null || value === undefined
            ? '—'
            : value % 1 === 0
              ? normalized
              : value.toFixed(1)}
        </span>
        <span className="text-[10px] text-muted-foreground">/{max}</span>
      </div>
      {scaleLabel ? (
        <p className={cn('mt-0.5 text-[10px] font-medium truncate', colour)}>{scaleLabel}</p>
      ) : null}
      <div className="mt-1.5 relative h-1 rounded-full bg-border/60 overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-primary rounded-full transition-[width]"
          style={{ width: `${Math.round(fill * 100)}%` }}
        />
      </div>
    </div>
  );

  if (!meta && !reasoning) return bar;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{bar}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-md space-y-2 p-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-semibold">{label}</p>
            {scaleLabel ? (
              <p className={cn('text-xs font-semibold', colour)}>
                {value != null ? `${value % 1 === 0 ? normalized : value.toFixed(1)}/${max} · ` : ''}
                {scaleLabel}
              </p>
            ) : null}
          </div>
          {meta ? (
            <p className="text-[11px] text-muted-foreground italic">{meta.definition}</p>
          ) : null}
          {reasoning ? (
            <div className="border-t border-border/40 pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Reasoning</p>
              <p className="text-xs text-foreground/90 leading-relaxed">{reasoning}</p>
            </div>
          ) : null}
          {meta ? (
            <div className="grid grid-cols-5 gap-1 pt-1">
              {meta.scale.map((lbl, i) => {
                // highlight the bucket the current value falls in (max=10: 2 levels per bucket, max=5: 1)
                const bucketMax = max === 10 ? (i + 1) * 2 : i + 1;
                const active = value != null && Math.round(value) <= bucketMax && Math.round(value) > (max === 10 ? i * 2 : i);
                const filled = value != null && (max === 10 ? (i + 1) * 2 : i + 1) <= Math.round(value);
                return (
                  <div key={lbl} className="text-center">
                    <div className={cn('mx-auto mb-0.5 h-1 w-full rounded-full',
                      active ? 'bg-primary ring-2 ring-primary/30' : filled ? 'bg-primary/70' : 'bg-border/60')} />
                    <p className={cn('text-[9px] leading-tight', filled || active ? 'font-medium text-foreground' : 'text-muted-foreground')}>{lbl}</p>
                  </div>
                );
              })}
            </div>
          ) : null}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// "Why these scores?" panel shown below the 3-up ScoreBar grid in each segment tile.
// Always-visible (collapsed by default, expands inline on click) so reasoning is
// available without a hover — matches the user's request that reasoning should
// be given more clearly, not hidden behind a tooltip.
const SegmentScoreReasoning = ({
  segment,
}: {
  segment: {
    marketTrajectoryReasoning?: string | null;
    rightToPlayReasoning?: string | null;
    positionSustainabilityReasoning?: string | null;
  };
}) => {
  const [open, setOpen] = useState(false);

  const items = [
    { label: 'Market', reasoning: segment.marketTrajectoryReasoning },
    { label: 'Right To Play', reasoning: segment.rightToPlayReasoning },
    { label: 'Sustainability', reasoning: segment.positionSustainabilityReasoning },
  ].filter((i) => !!i.reasoning);

  if (items.length === 0) return null;

  return (
    <div
      className="rounded-xl border border-border/50 bg-background/40 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/40 transition"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Why these scores?
        </p>
        <span className="text-[10px] text-muted-foreground">
          {open ? '− collapse' : '+ show reasoning'}
        </span>
      </button>
      {open ? (
        <div className="border-t border-border/40 px-3 py-3 space-y-3">
          {items.map((item) => (
            <div key={item.label}>
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1">
                {item.label}
              </p>
              <p className="text-[11px] leading-relaxed text-foreground/90">
                {item.reasoning}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

// Portfolio Scatter Map — Market Trajectory (x) vs Right To Play (y), bubble size = Position Sustainability.
// Each segment is a single bubble, labeled with its title. Helps the user see the portfolio shape at a glance.
type SegmentScatterItem = {
  name: string;
  x: number;   // market trajectory 1-5
  y: number;   // right to play 1-5
  z: number;   // sustainability (used as bubble size)
  rawZ: number | null;  // unscaled sustainability for tooltip
};

const SCATTER_AXIS_TICKS_10 = [2, 4, 6, 8, 10];
const SCATTER_BUCKET_LABELS: Record<'x' | 'y' | 'z', string[]> = {
  x: ['Contracting', 'Declining', 'Transitioning', 'Improving', 'Accelerating'],
  y: ['Weak', 'Contested', 'Credible', 'Advantaged', 'Distinctive'],
  z: ['Eroding', 'Fragile', 'Holding', 'Durable', 'Compounding'],
};

// Map a /10 tick to its bucket label (1-2->0, 3-4->1, etc)
const bucketFor10 = (val: number, axis: 'x' | 'y' | 'z'): string => {
  const idx = Math.min(4, Math.max(0, Math.floor((Math.round(val) - 1) / 2)));
  return SCATTER_BUCKET_LABELS[axis][idx];
};

const SegmentScatterMap = ({ segments }: { segments: Array<{ title: string; marketTrajectory: number | null; rightToPlay: number | null; positionSustainability: number | null }> }) => {
  const data = segments
    .filter((s) => s.marketTrajectory != null && s.rightToPlay != null)
    .map<SegmentScatterItem>((s) => ({
      name: s.title,
      x: s.marketTrajectory as number,
      y: s.rightToPlay as number,
      // scale sustainability 1-10 to bubble area (z) 200-1400 so differences are visible
      z: 200 + ((s.positionSustainability ?? 5) - 1) * 133,
      rawZ: s.positionSustainability,
    }));

  if (data.length === 0) return null;

  return (
    <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">Portfolio Scatter Map</CardTitle>
        <p className="text-xs text-muted-foreground">
          Market Trajectory (horizontal) vs Right To Play (vertical), scored 1–10. Bubble size = Position Sustainability.
          Top-right quadrant = growing market the company is well-positioned in.
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[380px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
              <XAxis
                type="number"
                dataKey="x"
                name="Market"
                domain={[0.5, 10.5]}
                ticks={SCATTER_AXIS_TICKS_10}
                tickFormatter={(v: number) => `${v} · ${bucketFor10(v, 'x')}`}
                tick={{ fontSize: 9 }}
                stroke="hsl(var(--muted-foreground))"
              >
                <RechartsLabel value="Market Trajectory (1–10)" offset={-25} position="insideBottom" style={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 600 }} />
              </XAxis>
              <YAxis
                type="number"
                dataKey="y"
                name="Right to Play"
                domain={[0.5, 10.5]}
                ticks={SCATTER_AXIS_TICKS_10}
                tickFormatter={(v: number) => `${v} · ${bucketFor10(v, 'y')}`}
                tick={{ fontSize: 9 }}
                stroke="hsl(var(--muted-foreground))"
                width={110}
              >
                <RechartsLabel value="Right To Play (1–10)" angle={-90} offset={-35} position="insideLeft" style={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 600 }} />
              </YAxis>
              <ZAxis type="number" dataKey="z" range={[200, 1400]} name="Sustainability" />
              <ReferenceLine x={5.5} stroke="hsl(var(--border))" strokeDasharray="4 4" />
              <ReferenceLine y={5.5} stroke="hsl(var(--border))" strokeDasharray="4 4" />
              <RechartsTooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={(props) => {
                  const payload = props?.payload?.[0]?.payload as SegmentScatterItem | undefined;
                  if (!payload) return null;
                  const mtLabel = bucketFor10(payload.x, 'x');
                  const rtpLabel = bucketFor10(payload.y, 'y');
                  const psLabel = payload.rawZ != null ? bucketFor10(payload.rawZ, 'z') : '';
                  return (
                    <div className="rounded-xl border border-border bg-card p-3 shadow-lg text-xs space-y-1">
                      <p className="font-semibold text-sm">{payload.name}</p>
                      <p><span className="text-muted-foreground">Market:</span> <strong>{payload.x.toFixed(1)}/10</strong> ({mtLabel})</p>
                      <p><span className="text-muted-foreground">Right to Play:</span> <strong>{payload.y.toFixed(1)}/10</strong> ({rtpLabel})</p>
                      <p><span className="text-muted-foreground">Sustainability:</span> <strong>{payload.rawZ?.toFixed(1) ?? '—'}/10</strong> ({psLabel})</p>
                    </div>
                  );
                }}
              />
              <Scatter
                name="Segments"
                data={data}
                fill="hsl(var(--primary))"
                fillOpacity={0.35}
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                shape="circle"
                label={{
                  dataKey: 'name',
                  position: 'top',
                  fontSize: 10,
                  fill: 'hsl(var(--foreground))',
                  offset: 14,
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

const MetricCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-border/60 bg-background/80 p-3">
    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
    <p className="mt-2 text-sm font-medium leading-6 text-foreground">{value}</p>
  </div>
);

const MetricListCard = ({
  label,
  values,
  emptyFallback = 'Pending',
}: {
  label: string;
  values: string[];
  emptyFallback?: string;
}) => {
  const items = Array.from(new Set(values.map((value) => cleanMacroText(value)).filter(Boolean)));

  return (
    <div className="rounded-2xl border border-border/60 bg-background/80 p-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      {items.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={`${label}-${item}`}
              className="rounded-full border border-border/60 bg-card/70 px-3 py-1 text-xs font-medium text-foreground"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm font-medium text-foreground">{emptyFallback}</p>
      )}
    </div>
  );
};

const memoMarkdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mt-0 font-serif text-4xl font-semibold tracking-tight text-foreground">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-12 border-t border-border/60 pt-6 font-serif text-[1.9rem] font-semibold tracking-tight text-foreground first:mt-0 first:border-t-0 first:pt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-8 text-lg font-semibold tracking-tight text-foreground">{children}</h3>
  ),
  p: ({ children }) => <p className="text-[1.02rem] leading-8 text-foreground/85">{children}</p>,
  ul: ({ children }) => <ul className="my-6 space-y-3 pl-6 marker:text-primary">{children}</ul>,
  ol: ({ children }) => (
    <ol className="my-6 space-y-3 pl-6 marker:font-semibold marker:text-primary">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-1 text-[1.02rem] leading-8 text-foreground/85">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-8 border-l-2 border-primary/35 bg-primary/[0.04] px-5 py-4 font-serif text-[1.04rem] italic leading-8 text-foreground/80">
      {children}
    </blockquote>
  ),
  a: ({ href, children, ...props }) => {
    const safeHref = getSafeExternalUrl(typeof href === 'string' ? href : undefined);
    if (!safeHref) {
      return <span className="font-medium text-foreground">{children}</span>;
    }

    return (
      <a
        {...props}
        href={safeHref}
        target="_blank"
        rel="noreferrer"
        className="font-semibold text-primary decoration-primary/40 underline-offset-4 hover:underline"
      >
        {children}
      </a>
    );
  },
  hr: () => <hr className="my-10 border-border/60" />,
};

const MarkdownMemo = ({
  title,
  markdown,
  fallback,
}: {
  title: string;
  markdown?: string | null;
  fallback?: string | null;
}) => {
  const body = prepareMacroMarkdown(markdown || fallback);
  if (!body) return null;

  return (
    <Card className="rounded-[28px] border border-border/60 bg-card/85 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl">
          <BookOpenText className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-7 pt-2 md:px-8">
        <div className="mx-auto max-w-4xl">
          <article className="prose prose-slate prose-lg max-w-none text-pretty prose-headings:text-foreground prose-p:font-serif prose-li:font-serif prose-strong:text-foreground prose-code:rounded-full prose-code:bg-primary/[0.06] prose-code:px-2 prose-code:py-1 prose-code:text-[0.78em] prose-code:font-medium prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={memoMarkdownComponents}>
              {body}
            </ReactMarkdown>
          </article>
        </div>
      </CardContent>
    </Card>
  );
};

const SourceList = ({
  title,
  panel,
  sources,
  expanded,
  onToggle,
}: {
  title: string;
  panel: {
    cited_source_count?: number;
    supporting_source_count?: number;
    mission_count?: number;
    latest_publication_date?: string | null;
    top_domains?: Array<{ domain: string; count: number }>;
    source_tier_breakdown?: Record<string, number>;
  };
  sources: MacroSourceRecord[];
  expanded: boolean;
  onToggle: () => void;
}) => {
  const visibleSources = expanded ? sources : sources.slice(0, 5);

  return (
    <Card className="rounded-[28px] border border-border/60 bg-card/85 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Link2 className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
          {sources.length > 5 ? (
            <Button variant="outline" size="sm" className="rounded-full" onClick={onToggle}>
              {expanded ? 'Show fewer' : `Show all ${sources.length}`}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Cited Sources" value={`${panel.cited_source_count ?? 0}`} />
          <MetricCard label="Supporting Sources" value={`${panel.supporting_source_count ?? sources.length}`} />
          <MetricCard label="Mission Count" value={`${panel.mission_count ?? 0}`} />
          <MetricCard label="Latest Source" value={formatPublicationDate(panel.latest_publication_date)} />
        </div>

        {panel.top_domains?.length ? (
          <MetricListCard
            label="Top Domains"
            values={panel.top_domains.map((domain) => `${domain.domain} (${domain.count})`)}
          />
        ) : null}

        {panel.source_tier_breakdown && Object.keys(panel.source_tier_breakdown).length ? (
          <MetricListCard
            label="Source Tiers"
            values={Object.entries(panel.source_tier_breakdown).map(([tier, count]) => `${tier} (${count})`)}
          />
        ) : null}

        {visibleSources.length ? (
          <div className="grid gap-3">
            {visibleSources.map((source) => {
              const safeUrl = getSafeExternalUrl(source.url);

              return (
                <div
                  key={source.source_key}
                  className="rounded-2xl border border-border/60 bg-background/80 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{source.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {compactJoin(
                          [
                            cleanMacroText(source.source_domain),
                            cleanMacroText(source.source_tier),
                            source.trust_score ? `Trust ${source.trust_score.toFixed(2)}` : '',
                          ].filter(Boolean),
                          'Source',
                        )}
                      </p>
                    </div>
                    {safeUrl ? (
                      <a
                        href={safeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        Open
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>
                  {source.note ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{source.note}</p> : null}
                  {source.excerpt_preview ? (
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{source.excerpt_preview}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No resolved source detail is available for this view yet.</p>
        )}
      </CardContent>
    </Card>
  );
};

const TopicCard = ({ title, body, meta }: { title: string; body?: string | null; meta?: string[] }) => (
  <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
    <p className="text-sm font-semibold text-foreground">{title}</p>
    {meta?.length ? (
      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{compactJoin(meta)}</p>
    ) : null}
    {body ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p> : null}
  </div>
);

const ScoreMatrix = ({ rows }: { rows: Array<{ activity_key: string; activity_name: string; scores: MacroScoreMetric[]; confidence?: string | null }> }) => {
  if (!rows.length) return null;

  return (
    <Card className="rounded-[28px] border border-border/60 bg-card/85 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl">
          <LayoutGrid className="h-5 w-5 text-primary" />
          Activity Score Matrix
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="min-w-[680px] space-y-2">
          <div className="grid grid-cols-[1.6fr_repeat(3,minmax(0,1fr))_0.8fr] gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <span>Activity</span>
            <span className="text-center">Market</span>
            <span className="text-center">Right To Play</span>
            <span className="text-center">Sustainability</span>
            <span className="text-center">Confidence</span>
          </div>
          {rows.map((row) => {
            const scoreLookup = Object.fromEntries(row.scores.map((score) => [score.metric_key, score.score]));
            return (
              <div
                key={row.activity_key}
                className="grid grid-cols-[1.6fr_repeat(3,minmax(0,1fr))_0.8fr] gap-2 rounded-2xl border border-border/60 bg-background/80 p-3"
              >
                <span className="text-sm font-medium text-foreground">{row.activity_name}</span>
                <span className="text-center text-sm text-foreground">{formatMetricValue(scoreLookup.market_trajectory)}</span>
                <span className="text-center text-sm text-foreground">{formatMetricValue(scoreLookup.right_to_play)}</span>
                <span className="text-center text-sm text-foreground">{formatMetricValue(scoreLookup.position_sustainability)}</span>
                <span className="text-center text-sm text-muted-foreground">{formatMacroConfidence(row.confidence)}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

const NavigationTree = ({
  nodes,
  currentNodeKey,
  onOpenNode,
}: {
  nodes: MacroNavigationNode[];
  currentNodeKey: string;
  onOpenNode: (nodeKey: string) => void;
}) => (
  <div className="space-y-2">
    {nodes.map((node) => (
      <div key={node.node_key} className="space-y-2">
        <button
          type="button"
          onClick={() => onOpenNode(node.node_key)}
          className={cn(
            'flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left text-sm transition',
            currentNodeKey === node.node_key
              ? 'border-primary/30 bg-primary/[0.06] text-foreground'
              : 'border-border/60 bg-background/80 text-muted-foreground hover:border-primary/20 hover:bg-primary/[0.03]',
          )}
        >
          <span>{node.label}</span>
          {node.status ? (
            <Badge variant="outline" className="rounded-full text-[10px]">
              {node.status}
            </Badge>
          ) : null}
        </button>
        {node.children.length ? (
          <div className="ml-4 space-y-2 border-l border-border/60 pl-4">
            <NavigationTree nodes={node.children} currentNodeKey={currentNodeKey} onOpenNode={onOpenNode} />
          </div>
        ) : null}
      </div>
    ))}
  </div>
);

export function MacroDashboard({ initialMode = 'dashboard', onRequestModeChange }: MacroDashboardProps) {
  const { macroData } = useForesight();

  const routeLookup = useMemo(() => (macroData ? getRouteLookup(macroData) : null), [macroData]);
  const portfolio = useMemo(() => (macroData ? buildMacroPortfolioModel(macroData) : null), [macroData]);

  const [mode, setMode] = useState<MacroEntryMode>(initialMode);
  const [currentNodeKey, setCurrentNodeKey] = useState('overview');
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!macroData) return;
    if (initialMode === 'reading') {
      setMode('reading');
      setCurrentNodeKey(macroData.reading_route || macroData.default_route || macroData.overview_view.view_key);
      return;
    }

    setMode('dashboard');
    setCurrentNodeKey((current) =>
      current && current !== 'overview' ? current : macroData.default_route || macroData.overview_view.view_key,
    );
  }, [initialMode, macroData]);

  if (!macroData || !routeLookup || !portfolio) {
    return null;
  }

  const currentSegment =
    routeLookup.segmentByNodeKey[currentNodeKey] ||
    (routeLookup.activityByNodeKey[currentNodeKey]
      ? macroData.segment_views.find(
          (segment) => segment.segment_key === routeLookup.activityByNodeKey[currentNodeKey].segment_key,
        ) || null
      : null);
  const currentActivity = routeLookup.activityByNodeKey[currentNodeKey] || null;

  const openNode = (nodeKey: string) => {
    const targetNode = routeLookup.nodeByNodeKey[nodeKey];
    if (targetNode?.node_type === 'group') return;
    setCurrentNodeKey(nodeKey);
    if (nodeKey === macroData.overview_view.view_key) {
      setMode('dashboard');
      onRequestModeChange?.('dashboard');
    }
  };

  const goToDashboard = (nodeKey = macroData.default_route || macroData.overview_view.view_key) => {
    setMode('dashboard');
    setCurrentNodeKey(nodeKey);
    onRequestModeChange?.('dashboard');
  };

  const goToReading = () => {
    setMode('reading');
    setCurrentNodeKey(macroData.reading_route || macroData.default_route || macroData.overview_view.view_key);
    onRequestModeChange?.('reading');
  };

  const toggleSourceGroup = (key: string) =>
    setExpandedSources((current) => ({ ...current, [key]: !current[key] }));

  const crowNestCard = macroData.overview_view.segment_cards.find(
    (card) => card.segment_key === 'crow_nest_overview',
  );
  const baselineCards = macroData.overview_view.segment_cards.filter(
    (card) => !card.segment_key.startsWith('crow_nest'),
  );

  const hasPortfolioAnalysis = Boolean(
    macroData.portfolio_analysis?.markdown || macroData.executive_analysis?.markdown,
  );

  const renderOverview = () => (
    <div className="space-y-5">
      {/* Header — portfolio thesis + high-level counts (usage guide removed) */}
      <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
        <CardContent className="space-y-5 p-5 md:p-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full text-[11px]">
                Macro Stream
              </Badge>
              <Badge variant="outline" className="rounded-full text-[11px]">
                {macroData.flavor === 'new' ? 'New standard' : 'Legacy fallback'}
              </Badge>
            </div>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                {portfolio.companyName} Macro Decision Tool
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{portfolio.heroThesis}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <MetricCard
                label="Segments Ready"
                value={formatCount(
                  macroData.overview_view.portfolio_progress?.segments_ready,
                  macroData.overview_view.portfolio_progress?.segments_total,
                )}
              />
              <MetricCard
                label="Activities Ready"
                value={formatCount(
                  macroData.overview_view.portfolio_progress?.activities_ready,
                  macroData.overview_view.portfolio_progress?.activities_total,
                )}
              />
              <MetricCard
                label="Missions"
                value={formatCount(
                  macroData.overview_view.portfolio_progress?.missions_completed,
                  macroData.overview_view.portfolio_progress?.missions_planned,
                )}
              />
              <MetricCard
                label="As Of"
                value={macroData.meta.analysis_as_of || macroData.meta.generated_on || 'Not specified'}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Segment Decision Strip — baseline segments only */}
      <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Segment Decision Strip</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          {portfolio.segmentDecisions.map((segment) => (
            <button
              key={segment.segmentKey}
              type="button"
              onClick={() => openNode(segment.nodeKey)}
              className="grid gap-4 rounded-[28px] border border-border/60 bg-background/80 p-5 text-left transition hover:border-primary/30 hover:bg-primary/[0.03]"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={cn('rounded-full text-[11px]', formatBadgeClassName(segment.statusTone, segment.statusLabel))}>
                    {segment.statusLabel}
                  </Badge>
                  <Badge variant="outline" className="rounded-full text-[11px]">
                    {segment.outlookLabel}
                  </Badge>
                </div>
                <div>
                  <p className="text-lg font-semibold tracking-tight text-foreground">{segment.title}</p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{segment.summary}</p>
                </div>
              </div>
              <div className="grid gap-3">
                <MetricCard label="Recommended Action" value={segment.recommendedAction} />
                <MetricCard label="Key Risk" value={segment.keyRisk} />
                <MetricCard label="Key Upside" value={segment.keyUpside} />
              </div>
              <div className="grid gap-2 grid-cols-3">
                <ScoreBar label="Market" value={segment.marketTrajectory} reasoning={segment.marketTrajectoryReasoning ?? undefined} />
                <ScoreBar label="Right To Play" value={segment.rightToPlay} reasoning={segment.rightToPlayReasoning ?? undefined} />
                <ScoreBar label="Sustainability" value={segment.positionSustainability} reasoning={segment.positionSustainabilityReasoning ?? undefined} />
              </div>
              <SegmentScoreReasoning segment={segment} />
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Portfolio Scatter Map — Market (x) vs Right to Play (y), bubble = Sustainability */}
      <SegmentScatterMap segments={portfolio.segmentDecisions} />

      {/* Macro Synthesis — Company Read (internal) + Cross-Cutting Factors (external, STEEPLE) */}
      {hasPortfolioAnalysis ? (
        macroData.executive_analysis?.markdown && macroData.portfolio_analysis?.markdown ? (
          <Tabs defaultValue="company" className="w-full">
            <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl">Macro Synthesis</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Two orthogonal reads — the company itself (internal) vs the broad forces that could shift it (external, STEEPLE).
                    </p>
                  </div>
                  <TabsList>
                    <TabsTrigger value="company">Company Read</TabsTrigger>
                    <TabsTrigger value="factors">Cross-Cutting Factors</TabsTrigger>
                  </TabsList>
                </div>
              </CardHeader>
              <CardContent>
                <TabsContent value="company" className="mt-0">
                  <p className="mb-3 text-xs italic text-muted-foreground">
                    Headline narrative for the whole company — segment economics, portfolio dynamics, central investment question.
                  </p>
                  <MarkdownMemo title="Company Read" markdown={macroData.executive_analysis?.markdown} fallback={macroData.executive_analysis?.summary} />
                </TabsContent>
                <TabsContent value="factors" className="mt-0">
                  <p className="mb-3 text-xs italic text-muted-foreground">
                    Broad forces that could shift the whole company regardless of segment — STEEPLE pillars with real signal (Economic, Political/Regulatory, Technology, Environmental/Resources). Seeded from the latest Crow&apos;s Nest scan.
                  </p>
                  <MarkdownMemo title="Cross-Cutting Factors" markdown={macroData.portfolio_analysis?.markdown} fallback={macroData.portfolio_analysis?.summary} />
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        ) : (
          <MarkdownMemo
            title="Macro Synthesis"
            markdown={macroData.executive_analysis?.markdown ?? macroData.portfolio_analysis?.markdown}
            fallback={macroData.executive_analysis?.summary ?? macroData.portfolio_analysis?.summary}
          />
        )
      ) : null}

      {/* Navigation + Coverage */}
      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xl">
              <FolderTree className="h-5 w-5 text-primary" />
              Navigation Tree
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NavigationTree
              nodes={macroData.navigation_tree}
              currentNodeKey={currentNodeKey}
              onOpenNode={openNode}
            />
          </CardContent>
        </Card>

        <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Microscope className="h-5 w-5 text-primary" />
              Coverage Readout
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {baselineCards.map((card) => (
              <div
                key={card.segment_key}
                className="rounded-2xl border border-border/60 bg-background/80 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{card.title}</p>
                  <Badge className={cn('rounded-full text-[11px]', formatBadgeClassName(card.status_badge?.tone, card.status_badge?.label || card.availability))}>
                    {card.status_badge?.label || card.availability || 'Pending'}
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {card.short_description || 'Coverage summary is still pending.'}
                </p>
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Progress {formatCount(card.research_progress?.completed_mission_count, card.research_progress?.planned_mission_count)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Crow's Nest Intelligence Panel */}
      {crowNestCard ? (
        <Card className="rounded-[30px] border border-primary/20 bg-card/85 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <CircleDot className="h-5 w-5 text-primary" />
                {"Crow's Nest — Live Intelligence"}
              </CardTitle>
              <Badge className={cn('rounded-full text-[11px]', formatBadgeClassName(crowNestCard.status_badge?.tone))}>
                {crowNestCard.status_badge?.label || 'Monitor'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">{crowNestCard.short_description}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {macroData.overview_view.segment_cards
                .filter((card) => card.segment_key.startsWith('crow_nest') && card.segment_key !== 'crow_nest_overview')
                .map((card) => (
                  <button
                    key={card.segment_key}
                    type="button"
                    onClick={() => card.click_target && openNode(card.click_target)}
                    className="rounded-2xl border border-border/60 bg-background/80 p-3 text-left hover:border-primary/30"
                  >
                    <p className="text-xs font-semibold text-foreground">{card.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{card.short_description || 'Signal advisory'}</p>
                  </button>
                ))}
            </div>
            <button
              type="button"
              onClick={() => openNode('cn_overview')}
              className="mt-4 flex items-center gap-2 text-xs font-medium text-primary hover:underline"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              Open full intelligence scan
            </button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );

  const renderSegmentView = (segment: MacroSegmentView) => {
    const activities = macroData.activity_views.filter((activity) => activity.segment_key === segment.segment_key);
    const evidence = getSegmentEvidence(macroData, segment);
    const ready = isReadyNode(segment.availability);
    const summary = getSegmentSummary(segment);
    const hasCompanyAnalysis = Boolean(segment.company_analysis?.markdown || segment.company_analysis?.summary);
    const memo = hasCompanyAnalysis ? (
      <Tabs defaultValue="industry" className="w-full">
        <TabsList className="mb-2">
          <TabsTrigger value="industry">Industry Context</TabsTrigger>
          <TabsTrigger value="company">Company Position</TabsTrigger>
        </TabsList>
        <TabsContent value="industry">
          <MarkdownMemo
            title="Industry Context"
            markdown={segment.written_analysis?.markdown}
            fallback={segment.written_analysis?.summary || segment.decision_summary?.short_description}
          />
        </TabsContent>
        <TabsContent value="company">
          <MarkdownMemo
            title={`${segment.title} — Company Position`}
            markdown={segment.company_analysis?.markdown}
            fallback={segment.company_analysis?.summary}
          />
        </TabsContent>
      </Tabs>
    ) : (
      <MarkdownMemo
        title={`${segment.title} Memo`}
        markdown={segment.written_analysis?.markdown}
        fallback={segment.written_analysis?.summary || segment.decision_summary?.short_description}
      />
    );

    return (
      <div className="space-y-5">
        <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
          <CardContent className="grid gap-5 p-5 md:p-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn('rounded-full text-[11px]', formatBadgeClassName(segment.decision_summary?.status_badge?.tone, segment.decision_summary?.status_badge?.label || (ready ? 'Ready' : 'Pending')))}>
                  {segment.decision_summary?.status_badge?.label || (ready ? 'Ready' : 'Pending')}
                </Badge>
                {segment.decision_summary?.outlook_badge?.label ? (
                  <Badge variant="outline" className="rounded-full text-[11px]">
                    {segment.decision_summary.outlook_badge.label}
                  </Badge>
                ) : null}
                <Badge variant="outline" className="rounded-full text-[11px]">
                  {segment.coverage_status || segment.availability || 'Pending'}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Segment Drill-Down
                </p>
                <h3 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{segment.title}</h3>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{summary}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <MetricCard label="Recommended Action" value={segment.decision_summary?.recommended_action || 'Pending'} />
                <MetricCard label="Key Risk" value={segment.decision_summary?.key_risk || 'Pending'} />
                <MetricCard label="Key Upside" value={segment.decision_summary?.key_upside || 'Pending'} />
              </div>
            </div>

            {/* Mission Progress panel removed — not informative for end-user reading flow. */}
          </CardContent>
        </Card>

        {mode === 'reading' ? memo : null}

        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Business Map</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <MetricCard label="Summary" value={segment.business_map?.summary || 'Pending'} />
              <MetricListCard label="Products / Services" values={segment.business_map?.products_or_services || []} />
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Activities</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {(segment.activity_cards || []).map((activityCard) => {
                const targetNode = routeLookup.activityNodeKeyByActivityKey[activityCard.activity_key];
                return (
                  <button
                    key={activityCard.activity_key}
                    type="button"
                    onClick={() => targetNode && openNode(targetNode)}
                    className="rounded-2xl border border-border/60 bg-background/80 p-4 text-left hover:border-primary/30"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{activityCard.title}</p>
                      <Badge variant="outline" className="rounded-full text-[11px]">
                        {activityCard.coverage_status || activityCard.availability || 'Pending'}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {activityCard.summary || 'Activity summary is pending.'}
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                      <ScoreBar label="Market" value={activityCard.scorecard?.score_lookup.market_trajectory} reasoning={reasoningFor(activityCard.scorecard, 'market_trajectory')} />
                      <ScoreBar label="Right To Play" value={activityCard.scorecard?.score_lookup.right_to_play} reasoning={reasoningFor(activityCard.scorecard, 'right_to_play')} />
                      <ScoreBar label="Sustainability" value={activityCard.scorecard?.score_lookup.position_sustainability} reasoning={reasoningFor(activityCard.scorecard, 'position_sustainability')} />
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {!mode || mode === 'dashboard' ? memo : null}

        <ScoreMatrix rows={segment.visuals?.activity_score_matrix?.rows || []} />

        <SourceList
          title="Segment Source Roll-Up"
          panel={evidence.panel}
          sources={evidence.sources}
          expanded={Boolean(expandedSources[`segment-${segment.segment_key}`])}
          onToggle={() => toggleSourceGroup(`segment-${segment.segment_key}`)}
        />
      </div>
    );
  };

  const renderActivityView = (activity: MacroActivityView) => {
    const evidence = getActivityEvidence(macroData, activity);
    const segment = macroData.segment_views.find((item) => item.segment_key === activity.segment_key) || null;
    const ready = isReadyNode(activity.availability);
    const summary = getActivitySummary(activity);
    const memo = (
      <MarkdownMemo
        title={`${activity.title} Memo`}
        markdown={activity.written_analysis?.markdown}
        fallback={activity.written_analysis?.summary || activity.decision_guidance?.why_now}
      />
    );

    return (
      <div className="space-y-5">
        <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
          <CardContent className="grid gap-5 p-5 md:p-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn('rounded-full text-[11px]', formatBadgeClassName(ready ? 'positive' : 'neutral'))}>
                  {ready ? 'Ready' : 'Pending'}
                </Badge>
                <Badge variant="outline" className="rounded-full text-[11px]">
                  {formatMacroConfidence(activity.scorecard?.confidence)}
                </Badge>
                {segment ? (
                  <Badge variant="outline" className="rounded-full text-[11px]">
                    {segment.title}
                  </Badge>
                ) : null}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Activity Drill-Down
                </p>
                <h3 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{activity.title}</h3>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{summary}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <ScoreBar label="Market Trajectory" value={activity.scorecard?.score_lookup.market_trajectory} reasoning={reasoningFor(activity.scorecard, 'market_trajectory')} />
                <ScoreBar label="Right To Play" value={activity.scorecard?.score_lookup.right_to_play} reasoning={reasoningFor(activity.scorecard, 'right_to_play')} />
                <ScoreBar label="Sustainability" value={activity.scorecard?.score_lookup.position_sustainability} reasoning={reasoningFor(activity.scorecard, 'position_sustainability')} />
              </div>
            </div>

            <div className="rounded-[28px] border border-amber-500/20 bg-amber-500/[0.06] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Decision Guidance</p>
              <div className="mt-4 grid gap-3">
                <MetricCard label="Recommended Action" value={activity.decision_guidance?.recommended_action || 'Pending'} />
                <MetricCard label="Key Risk" value={activity.decision_guidance?.key_risk || 'Pending'} />
                <MetricCard label="Key Upside" value={activity.decision_guidance?.key_upside || 'Pending'} />
              </div>
            </div>
          </CardContent>
        </Card>

        {mode === 'reading' ? memo : null}

        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Business Map</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <MetricCard label="Description" value={activity.business_map?.description || 'Pending'} />
              <MetricListCard label="Products" values={activity.business_map?.products || []} />
              <MetricListCard label="Services" values={activity.business_map?.services || []} emptyFallback="None" />
              <MetricListCard label="End Markets" values={activity.business_map?.end_markets || []} />
              <MetricListCard label="Geographies" values={activity.business_map?.geographies || []} />
              <MetricCard label="Business Model Notes" value={activity.business_map?.business_model_notes || 'Pending'} />
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Coverage</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <MetricCard
                label="Completed Topics"
                value={`${activity.visuals?.topic_coverage?.completed ?? activity.supporting_topics?.completed?.length ?? 0}`}
              />
              <MetricCard
                label="Pending Topics"
                value={`${activity.visuals?.topic_coverage?.pending ?? activity.supporting_topics?.pending?.length ?? 0}`}
              />
            </CardContent>
          </Card>
        </div>

        {!mode || mode === 'dashboard' ? memo : null}

        {(activity.supporting_topics?.completed?.length || activity.supporting_topics?.pending?.length) ? (
          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Completed Topics
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {(activity.supporting_topics?.completed || []).map((topic, index) => (
                  <TopicCard
                    key={`${topic.topic_key || topic.mission_key || index}-completed`}
                    title={topic.topic_name || topic.mission_name || topic.topic_key || 'Completed topic'}
                    body={topic.trusted_interpretation || topic.question || null}
                    meta={[topic.coverage_label || '', topic.confidence || '', topic.mission_key || ''].filter(Boolean)}
                  />
                ))}
                {!activity.supporting_topics?.completed?.length ? (
                  <p className="text-sm text-muted-foreground">No completed topic detail is available yet.</p>
                ) : null}
              </CardContent>
            </Card>

            <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Clock3 className="h-5 w-5 text-primary" />
                  Pending Topics
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {(activity.supporting_topics?.pending || []).map((topic, index) => (
                  <TopicCard
                    key={`${topic.topic_key || topic.mission_key || index}-pending`}
                    title={topic.topic_name || topic.mission_name || topic.topic_key || 'Pending topic'}
                    body={topic.question || null}
                    meta={[topic.mission_key || '', compactJoin(topic.linked_activity_keys || [], '')].filter(Boolean)}
                  />
                ))}
              </CardContent>
            </Card>
          </div>
        ) : null}

        <SourceList
          title="Activity Source Insight"
          panel={evidence.panel}
          sources={evidence.sources}
          expanded={Boolean(expandedSources[`activity-${activity.activity_key}`])}
          onToggle={() => toggleSourceGroup(`activity-${activity.activity_key}`)}
        />
      </div>
    );
  };

  const renderedBody =
    currentActivity ? renderActivityView(currentActivity) : currentSegment ? renderSegmentView(currentSegment) : renderOverview();

  return (
    <div className="space-y-5">
      <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full text-[11px]">
                  {mode === 'reading' ? 'Reading mode' : 'Dashboard mode'}
                </Badge>
                <Badge variant="outline" className="rounded-full text-[11px]">
                  {macroData.bundle_contract?.score_framework?.framework_key || 'Macro scoring'}
                </Badge>
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  {macroData.overview_view.title}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{modeNote[mode]}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={mode === 'dashboard' ? 'default' : 'outline'}
                className="rounded-full px-4"
                onClick={() => goToDashboard()}
              >
                <LayoutGrid className="h-4 w-4" />
                Decision Dashboard
              </Button>
              <Button
                variant={mode === 'reading' ? 'default' : 'outline'}
                className="rounded-full px-4"
                onClick={goToReading}
              >
                <FileText className="h-4 w-4" />
                Executive Reading
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <button type="button" className="rounded-full border border-border/60 px-3 py-1 hover:border-primary/30" onClick={() => goToDashboard()}>
              Overview
            </button>
            {currentSegment ? (
              <>
                <ArrowRight className="h-3.5 w-3.5" />
                <button
                  type="button"
                  className="rounded-full border border-border/60 px-3 py-1 hover:border-primary/30"
                  onClick={() => openNode(currentSegment.view_key)}
                >
                  {currentSegment.title}
                </button>
              </>
            ) : null}
            {currentActivity ? (
              <>
                <ArrowRight className="h-3.5 w-3.5" />
                <button
                  type="button"
                  className="rounded-full border border-border/60 px-3 py-1 hover:border-primary/30"
                  onClick={() => openNode(currentActivity.view_key)}
                >
                  {currentActivity.title}
                </button>
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {renderedBody}
    </div>
  );
}
