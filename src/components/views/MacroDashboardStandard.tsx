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
  negative: 'border-rose-500/35 bg-rose-500/10 text-rose-700',
  warning: 'border-amber-500/35 bg-amber-500/10 text-amber-700',
  positive: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700',
  neutral: 'border-slate-400/35 bg-slate-400/10 text-slate-700',
};

const modeNote = {
  dashboard:
    'Decision dashboard mode. Compare readiness, scan segment calls, and open drill-downs only where the evidence is real.',
  reading:
    'Reading mode starts inside the richest available memo and keeps the same drill-down model without relying on a separate legacy reading bundle.',
};

const formatBadgeClassName = (tone?: string) => toneClassName[cleanMacroText(tone).toLowerCase()] || toneClassName.neutral;

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

const ScoreBar = ({ label, value }: { label: string; value?: number | null }) => {
  const normalized = Math.max(0, Math.min(5, value ?? 0));
  const meta = SCORE_META[label];
  const scaleLabel = meta && typeof value === 'number' && value >= 1 && value <= 5
    ? meta.scale[Math.round(value) - 1]
    : null;

  const bar = (
    <div className="rounded-2xl border border-border/60 bg-background/80 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {label}{meta ? <span className="ml-1 cursor-help opacity-40">?</span> : null}
        </p>
        <p className="text-sm font-semibold text-foreground">
          {value === null || value === undefined ? 'Pending' : `${normalized}/5`}
          {scaleLabel ? <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">· {scaleLabel}</span> : null}
        </p>
      </div>
      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <span
            key={`${label}-${index}`}
            className={cn('h-2 rounded-full', index < normalized ? 'bg-primary' : 'bg-border/80')}
          />
        ))}
      </div>
    </div>
  );

  if (!meta) return bar;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{bar}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs space-y-2 p-3">
          <p className="text-xs font-semibold">{label}</p>
          <p className="text-xs text-muted-foreground">{meta.definition}</p>
          <div className="grid grid-cols-5 gap-1 pt-1">
            {meta.scale.map((lbl, i) => (
              <div key={lbl} className="text-center">
                <div className={cn('mx-auto mb-0.5 h-1.5 w-full rounded-full', i < normalized ? 'bg-primary' : 'bg-border/60')} />
                <p className={cn('text-[9px]', i < normalized ? 'font-medium text-foreground' : 'text-muted-foreground')}>{lbl}</p>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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

  const renderOverview = () => (
    <div className="space-y-5">
      <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
        <CardContent className="grid gap-5 p-5 md:p-6 xl:grid-cols-[1.2fr_0.8fr]">
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

          <div className="rounded-[28px] border border-amber-500/20 bg-amber-500/[0.06] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Suggested Flow</p>
            <div className="mt-4 space-y-3">
              {macroData.recommended_user_flow.map((step, index) => (
                <div key={step} className="flex gap-3 rounded-2xl border border-amber-500/15 bg-background/80 p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-semibold text-black">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-6 text-foreground">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

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
                  <Badge className={cn('rounded-full text-[11px]', formatBadgeClassName(segment.ready ? 'positive' : 'neutral'))}>
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
              <div className="grid gap-3 md:grid-cols-3">
                <ScoreBar label="Market" value={segment.marketTrajectory} />
                <ScoreBar label="Right To Play" value={segment.rightToPlay} />
                <ScoreBar label="Sustainability" value={segment.positionSustainability} />
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

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
            {macroData.overview_view.segment_cards.map((card) => (
              <div
                key={card.segment_key}
                className="rounded-2xl border border-border/60 bg-background/80 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{card.title}</p>
                  <Badge className={cn('rounded-full text-[11px]', formatBadgeClassName(card.status_badge?.tone))}>
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
                <Badge className={cn('rounded-full text-[11px]', formatBadgeClassName(segment.decision_summary?.status_badge?.tone))}>
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

            <div className="rounded-[28px] border border-amber-500/20 bg-amber-500/[0.06] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Mission Progress</p>
              <div className="mt-4 grid gap-3">
                <MetricCard
                  label="Completed"
                  value={`${segment.research_progress?.completed_mission_count ?? segment.visuals?.research_progress?.completed ?? 0}`}
                />
                <MetricCard
                  label="Planned"
                  value={`${segment.research_progress?.planned_mission_count ?? segment.visuals?.research_progress?.planned ?? 0}`}
                />
                <MetricCard
                  label="Availability"
                  value={ready ? 'Decision-grade drill-down available' : 'Placeholder drill-down'}
                />
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
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <ScoreBar label="Market" value={activityCard.scorecard?.score_lookup.market_trajectory} />
                      <ScoreBar label="Right To Play" value={activityCard.scorecard?.score_lookup.right_to_play} />
                      <ScoreBar label="Sustainability" value={activityCard.scorecard?.score_lookup.position_sustainability} />
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
              <div className="grid gap-3 md:grid-cols-3">
                <ScoreBar label="Market Trajectory" value={activity.scorecard?.score_lookup.market_trajectory} />
                <ScoreBar label="Right To Play" value={activity.scorecard?.score_lookup.right_to_play} />
                <ScoreBar label="Sustainability" value={activity.scorecard?.score_lookup.position_sustainability} />
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
              <MetricCard
                label="Completed Missions"
                value={`${activity.research_progress?.completed_mission_count ?? 0}`}
              />
              <MetricCard
                label="Planned Missions"
                value={`${activity.research_progress?.planned_mission_count ?? 0}`}
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
