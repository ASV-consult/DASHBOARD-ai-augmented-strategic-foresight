export { MacroDashboard } from './MacroDashboardStandard';
/*
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpenText,
  Compass,
  ExternalLink,
  Gauge,
  MoveUpRight,
  Radar,
  Sparkles,
  Target,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useForesight } from '@/contexts/ForesightContext';
import {
  buildMacroPortfolioModel,
  cleanMacroText,
  compactJoin,
  formatMacroConfidence,
  getActivityNarrative,
  getActivityEvidenceModel,
  getMacroForceNarrative,
  getMacroThemeSummary,
  getRouteLookup,
  MacroActionItem,
  MacroScenarioLane,
  MacroStatusLabel,
} from '@/lib/macro-utils';
import { cn } from '@/lib/utils';
import { MacroActivityView, MacroEntryMode, MacroMacroForce, MacroSegmentView } from '@/types/macro';

interface MacroDashboardProps {
  initialMode?: MacroEntryMode;
  onRequestModeChange?: (mode: MacroEntryMode) => void;
}

type MacroOverlayState =
  | { type: 'theme'; key: string }
  | { type: 'scenario'; key: string }
  | null;

const statusDotClassName: Record<MacroStatusLabel, string> = {
  Advantaged: 'bg-emerald-500',
  Pressured: 'bg-rose-500',
  Contested: 'bg-amber-500',
  Uncertain: 'bg-slate-400',
};

const statusBadgeClassName: Record<MacroStatusLabel, string> = {
  Advantaged: 'border-emerald-500/35 bg-emerald-500/12 text-emerald-700',
  Pressured: 'border-rose-500/35 bg-rose-500/12 text-rose-700',
  Contested: 'border-amber-500/35 bg-amber-500/12 text-amber-700',
  Uncertain: 'border-slate-400/35 bg-slate-400/12 text-slate-700',
};

const directionClassName = (direction: string, present: boolean) => {
  if (!present) return 'border-border/50 bg-background/70 text-muted-foreground';
  if (direction === 'positive') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700';
  if (direction === 'negative') return 'border-rose-500/30 bg-rose-500/10 text-rose-700';
  return 'border-amber-500/30 bg-amber-500/10 text-amber-700';
};

const formatHorizon = (value?: string) =>
  cleanMacroText(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Not specified';

const formatStage = (value?: string) =>
  cleanMacroText(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'N/A';

const segmentShortLabel = (title: string) =>
  title
    .replace(' Materials Solutions', '')
    .replace(' Materials', '')
    .replace(' Solutions', '');

const ScoreBar = ({ label, value }: { label: string; value?: number }) => {
  const normalized = Math.max(0, Math.min(5, value ?? 0));
  return (
    <div className="space-y-2 rounded-2xl border border-border/60 bg-background/80 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{normalized}/5</p>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <span
            key={`${label}-${index}`}
            className={cn(
              'h-2 rounded-full',
              index < normalized ? 'bg-primary' : 'bg-border/80',
            )}
          />
        ))}
      </div>
    </div>
  );
};

const MetricItem = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-border/60 bg-background/80 p-3">
    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
    <p className="mt-2 text-sm font-medium leading-6 text-foreground">{value}</p>
  </div>
);

const MetricList = ({
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
        <p className="mt-2 text-sm font-medium leading-6 text-foreground">{emptyFallback}</p>
      )}
    </div>
  );
};

const formatSecondaryMetricValue = (value: number | string) =>
  typeof value === 'number'
    ? `${Number.isInteger(value) ? value : value.toFixed(1)}`
    : cleanMacroText(String(value));

const formatPublicationDate = (value?: string) => {
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

export function MacroDashboard({ initialMode = 'dashboard', onRequestModeChange }: MacroDashboardProps) {
  const { macroData } = useForesight();

  const portfolioModel = useMemo(() => (macroData ? buildMacroPortfolioModel(macroData) : null), [macroData]);
  const routeLookup = useMemo(() => (macroData ? getRouteLookup(macroData) : null), [macroData]);

  const [mode, setMode] = useState<MacroEntryMode>(initialMode);
  const [currentNodeKey, setCurrentNodeKey] = useState<string>('overview');
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<MacroOverlayState>(null);

  useEffect(() => {
    if (!macroData) return;
    if (initialMode === 'reading') {
      setMode('reading');
      setCurrentNodeKey(macroData.entry_modes.reading_entry_view || 'reading_executive');
      return;
    }

    setMode('dashboard');
    setCurrentNodeKey((current) =>
      current === 'reading_executive' ? macroData.default_route || 'overview' : current || macroData.default_route || 'overview',
    );
  }, [initialMode, macroData]);

  if (!macroData || !portfolioModel || !routeLookup) {
    return null;
  }

  const selectedTheme =
    overlay?.type === 'theme'
      ? portfolioModel.themes.find((theme) => theme.nodeKey === overlay.key) || null
      : null;
  const selectedScenario =
    overlay?.type === 'scenario'
      ? portfolioModel.scenarioLanes.find((lane) => lane.segmentKey === overlay.key) || null
      : null;
  const selectedAction = portfolioModel.actions.find((action) => action.id === selectedActionId) || null;
  const highlightedSegmentKeys = new Set(selectedAction?.relatedSegmentKeys || []);

  const currentSegment =
    routeLookup.segmentByNodeKey[currentNodeKey] ||
    (routeLookup.activityByNodeKey[currentNodeKey]
      ? macroData.segment_views.find(
          (segment) => segment.segment_key === routeLookup.activityByNodeKey[currentNodeKey].parent_segment_key,
        ) || null
      : null);
  const currentActivity = routeLookup.activityByNodeKey[currentNodeKey] || null;

  const goToDashboard = (nodeKey = macroData.default_route || 'overview') => {
    setMode('dashboard');
    setCurrentNodeKey(nodeKey);
    onRequestModeChange?.('dashboard');
  };

  const goToReading = () => {
    setMode('reading');
    setCurrentNodeKey(macroData.entry_modes.reading_entry_view || 'reading_executive');
    onRequestModeChange?.('reading');
  };

  const openOverlayTheme = (nodeKey?: string) => {
    if (!nodeKey) return;
    setOverlay({ type: 'theme', key: nodeKey });
  };

  const openScenario = (segmentKey: string) => {
    setOverlay({ type: 'scenario', key: segmentKey });
  };

  const closeOverlay = () => setOverlay(null);

  const requestActionFocus = (action: MacroActionItem) => {
    setSelectedActionId((current) => (current === action.id ? null : action.id));
  };

  const openPortfolioSignal = (clickTarget?: string, relatedSegmentKeys: string[] = []) => {
    if (clickTarget?.startsWith('theme_')) {
      openOverlayTheme(clickTarget);
      return;
    }
    if (clickTarget) {
      goToDashboard(clickTarget);
      return;
    }
    const segmentKey = relatedSegmentKeys[0];
    if (!segmentKey) return;
    const nodeKey = routeLookup.segmentNodeKeyBySegmentKey[segmentKey];
    if (nodeKey) goToDashboard(nodeKey);
  };

  const openActionPrimary = (action: MacroActionItem) => {
    if (action.primaryClickTarget?.startsWith('theme_')) {
      openOverlayTheme(action.primaryClickTarget);
      return;
    }
    if (action.primaryClickTarget) {
      goToDashboard(action.primaryClickTarget);
    }
  };

  const openFirstRelatedSegment = (segmentKeys: string[]) => {
    const segmentKey = segmentKeys[0];
    if (!segmentKey) return;
    const nodeKey = routeLookup.segmentNodeKeyBySegmentKey[segmentKey];
    if (nodeKey) goToDashboard(nodeKey);
  };

  const segmentDecisionByKey = Object.fromEntries(
    portfolioModel.segmentDecisions.map((decision) => [decision.segmentKey, decision]),
  );
  const overviewThemeCards = macroData.overview_view.top_macro_themes.map((card) => {
    const theme =
      portfolioModel.themes.find(
        (item) => item.themeKey === card.theme_key || item.nodeKey === card.click_target,
      ) || null;

    return {
      themeKey: card.theme_key,
      title: card.title,
      nodeKey: theme?.nodeKey || card.click_target,
      summary: theme ? getMacroThemeSummary(theme) : 'Open overlay to inspect implications.',
      mechanism: theme?.mechanism || 'Open overlay to inspect mechanism.',
      citationsCount: theme?.citationsCount || 0,
      evidenceCount: theme?.evidenceCount || 0,
      affectedSegments: theme?.affectedSegments || [],
    };
  });

  const openSegmentByTitle = (title: string) => {
    const segment = macroData.segment_views.find((item) => item.title === title);
    if (!segment) return;
    closeOverlay();
    goToDashboard(segment.view_key);
  };

  const openActivityByTitle = (title: string) => {
    const activity = macroData.activity_views.find((item) => item.title === title);
    if (!activity) return;
    closeOverlay();
    goToDashboard(activity.view_key);
  };

  const renderShellHeader = () => (
    <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
      <CardContent className="flex flex-col gap-4 p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full border-amber-500/35 text-[11px] text-amber-700">
                Macro Stream
              </Badge>
              <Badge className={cn('rounded-full text-[11px]', portfolioModel.portfolioTone.badgeClassName)}>
                {portfolioModel.portfolioTone.label}
              </Badge>
              {portfolioModel.provisional ? (
                <Badge variant="outline" className="rounded-full text-[11px]">
                  Provisional view
                </Badge>
              ) : null}
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                {portfolioModel.companyName} Macro Decision Tool
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {mode === 'reading'
                  ? 'Linear executive reading mode. Use it for narrative review, then switch back to the dashboard to compare segments and validate decisions.'
                  : 'Guided dashboard mode. Scan the portfolio, compare segments, decide what matters now, and drill down only where the evidence justifies it.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={mode === 'dashboard' ? 'default' : 'outline'}
              className="rounded-full px-4"
              onClick={() => goToDashboard(currentActivity?.view_key || currentSegment?.view_key || macroData.default_route || 'overview')}
            >
              <Compass className="h-4 w-4" />
              Decision Dashboard
            </Button>
            <Button
              variant={mode === 'reading' ? 'default' : 'outline'}
              className="rounded-full px-4"
              onClick={goToReading}
            >
              <BookOpenText className="h-4 w-4" />
              Executive Reading
            </Button>
          </div>
        </div>

        {mode === 'dashboard' ? (
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
                  onClick={() => goToDashboard(currentSegment.view_key)}
                >
                  {currentSegment.title}
                </button>
              </>
            ) : null}
            {currentActivity ? (
              <>
                <ArrowRight className="h-3.5 w-3.5" />
                <span className="rounded-full border border-primary/20 bg-primary/[0.05] px-3 py-1 text-foreground">
                  {currentActivity.title}
                </span>
              </>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  const renderOverview = () => (
    <div className="space-y-5">
      <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
        <CardContent className="grid gap-5 p-5 md:p-6 xl:grid-cols-[1.45fr_0.95fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn('rounded-full text-[11px]', portfolioModel.portfolioTone.badgeClassName)}>
                {portfolioModel.portfolioTone.label}
              </Badge>
              <Badge variant="outline" className="rounded-full text-[11px]">
                {portfolioModel.confidenceLabel}
              </Badge>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                What Is The Overall Portfolio Situation?
              </p>
              <h3 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                {portfolioModel.heroThesis}
              </h3>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {portfolioModel.keyMessages.map((message, index) => (
                <div key={`portfolio-message-${index}`} className="rounded-[24px] border border-border/60 bg-background/80 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Portfolio Message {index + 1}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-foreground">{message}</p>
                </div>
              ))}
            </div>

            {portfolioModel.heroMetrics.length ? (
              <div className="grid gap-3 md:grid-cols-3">
                {portfolioModel.heroMetrics.map((metric) => (
                  <div
                    key={`hero-metric-${metric.label}`}
                    className="rounded-[24px] border border-border/60 bg-background/70 p-4"
                  >
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      {metric.label}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {formatSecondaryMetricValue(metric.value)}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-[28px] border border-amber-500/20 bg-amber-500/[0.06] p-5">
            <div className="flex items-center gap-2 text-amber-700">
              <Sparkles className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.22em]">Recommended Flow</p>
            </div>
            <div className="mt-4 space-y-3">
              {macroData.recommended_user_flow.map((step, index) => (
                <div key={`flow-${index}`} className="flex gap-3 rounded-2xl border border-amber-500/15 bg-background/80 p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-semibold text-black">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-6 text-foreground">{step}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button className="rounded-full bg-amber-500 px-4 text-black hover:bg-amber-600" onClick={goToReading}>
                Open Executive Reading
              </Button>
              <Button
                variant="outline"
                className="rounded-full px-4"
                onClick={() => openFirstRelatedSegment([portfolioModel.actions[0]?.relatedSegmentKeys[0] || ''])}
              >
                Focus Highest Priority Segment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Which Segments Matter Most Right Now?
              </p>
              <CardTitle className="mt-2 text-xl">Segment Decision Strip</CardTitle>
            </div>
            {selectedAction ? (
              <Badge variant="outline" className="rounded-full text-[11px]">
                Action focus: {selectedAction.title}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="grid items-stretch gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          {portfolioModel.segmentDecisions.map((decision) => (
            <button
              key={decision.segmentKey}
              type="button"
              onClick={() => goToDashboard(decision.nodeKey)}
              className={cn(
                'grid h-full gap-5 rounded-[28px] border p-5 text-left transition hover:border-primary/30 hover:bg-primary/[0.03] lg:grid-rows-[220px_auto] xl:grid-rows-[232px_auto] 2xl:grid-rows-[236px_auto]',
                decision.tone.panelClassName,
                highlightedSegmentKeys.size && !highlightedSegmentKeys.has(decision.segmentKey) && 'opacity-60',
                highlightedSegmentKeys.has(decision.segmentKey) && 'ring-2 ring-primary/20',
              )}
            >
              <div className="flex h-full flex-col overflow-hidden">
                <p className="text-lg font-semibold tracking-tight text-foreground">{decision.title}</p>
                <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground xl:line-clamp-5">
                  {decision.thesis}
                </p>
                <div className="mt-auto flex flex-wrap gap-2 pt-5">
                  <Badge className={cn('rounded-full text-[11px]', decision.tone.badgeClassName)}>
                    {decision.status}
                  </Badge>
                  <Badge variant="outline" className="rounded-full text-[11px]">
                    {decision.outlookLabel}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <MetricItem label="Recommended Action" value={decision.actionTitle} />
                <MetricItem label="Key Risk" value={decision.keyRisk} />
                <MetricItem label="Key Upside" value={decision.keyUpside} />
                <MetricItem label="Activities" value={`${decision.activityCount}`} />
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
        <CardHeader className="pb-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Which Segments Matter Most?
          </p>
          <CardTitle className="mt-2 flex items-center gap-2 text-xl">
            <Compass className="h-5 w-5 text-primary" />
            Portfolio Map
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative h-[460px] overflow-hidden rounded-[28px] border border-border/60 bg-background/85">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.5)_1px,transparent_1px),linear-gradient(to_top,hsl(var(--border)/0.5)_1px,transparent_1px)] bg-[size:25%_25%]" />
            <div className="absolute inset-x-5 top-4 flex justify-between text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <span>Defensibility / Right To Play</span>
              <span>High</span>
            </div>
            <div className="absolute bottom-4 left-5 right-5 flex justify-between text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <span>Low market trajectory</span>
              <span>High market trajectory</span>
            </div>
            {portfolioModel.mapPoints.map((point) => (
              <button
                key={point.segmentKey}
                type="button"
                onClick={() => goToDashboard(point.nodeKey)}
                className={cn(
                  'absolute -translate-x-1/2 translate-y-1/2 rounded-full border border-white/70 bg-primary/85 text-white shadow-lg transition hover:scale-[1.03]',
                  highlightedSegmentKeys.size && !highlightedSegmentKeys.has(point.segmentKey) && 'opacity-40',
                )}
                style={{
                  left: `${point.x}%`,
                  bottom: `${point.y}%`,
                  width: `${point.size}px`,
                  height: `${point.size}px`,
                }}
                title={point.title}
              >
                <span className="mx-auto block max-w-[74px] text-center text-[11px] font-semibold leading-4">
                  {segmentShortLabel(point.title)}
                </span>
              </button>
            ))}
          </div>
          <div className="rounded-[24px] border border-border/60 bg-background/80 p-4">
            <p className="text-sm leading-6 text-muted-foreground">
              Read the map left to right for market trajectory and bottom to top for defensibility / right to play. Bubble size shows strategic relevance, so this view helps leadership see which segments warrant the next portfolio conversation first.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
        <CardHeader className="pb-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            What Are The Main Cross-Cutting Macro Pressures?
          </p>
          <CardTitle className="mt-2 flex items-center gap-2 text-xl">
            <Radar className="h-5 w-5 text-primary" />
            Macro Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto">
            <div className="min-w-[980px] space-y-3">
              <div className="grid grid-cols-[1.35fr_repeat(4,minmax(0,1fr))] gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                <span>Theme</span>
                {portfolioModel.segmentDecisions.map((decision) => (
                  <span key={`heatmap-header-${decision.segmentKey}`} className="text-center">
                    {segmentShortLabel(decision.title)}
                  </span>
                ))}
              </div>

              {portfolioModel.heatmapRows.map((row) => (
                <div key={row.themeKey} className="grid grid-cols-[1.35fr_repeat(4,minmax(0,1fr))] gap-2">
                  <button
                    type="button"
                    onClick={() => openOverlayTheme(row.nodeKey)}
                    className="rounded-2xl border border-border/60 bg-background/80 p-3 text-left hover:border-primary/30"
                  >
                    <p className="text-sm font-semibold text-foreground">{row.title}</p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{row.mechanism}</p>
                  </button>
                  {row.cells.map((cell) => (
                    <button
                      key={`${row.themeKey}-${cell.segmentKey}`}
                      type="button"
                      onClick={() => openOverlayTheme(cell.clickTarget)}
                      className={cn(
                        'rounded-2xl border p-3 text-center text-xs font-medium leading-5',
                        directionClassName(cell.direction, cell.present),
                      )}
                    >
                      <span className="block text-[11px] uppercase tracking-[0.16em]">
                        {cell.present ? cell.direction : 'Not material'}
                      </span>
                      <span className="mt-1 block">
                        {cell.present ? `${cell.severity} | ${formatHorizon(cell.horizon)}` : ' '}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {overviewThemeCards.length ? (
        <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Top Theme Lenses</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-3">
            {overviewThemeCards.map((theme) => (
              <button
                key={`overview-theme-${theme.themeKey}`}
                type="button"
                onClick={() => openOverlayTheme(theme.nodeKey)}
                className="rounded-[24px] border border-border/60 bg-background/80 p-4 text-left hover:border-primary/30"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{theme.title}</p>
                  <Badge variant="outline" className="rounded-full text-[11px]">
                    {theme.citationsCount} citations
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{theme.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  <span>{theme.evidenceCount} evidence cues</span>
                  <span>{theme.affectedSegments.length} segments affected</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
        <CardHeader className="pb-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            What Actions Should Management Prioritize?
          </p>
          <CardTitle className="mt-2 flex items-center gap-2 text-xl">
            <Target className="h-5 w-5 text-primary" />
            Ranked Action List
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {portfolioModel.portfolioSignals.length ? (
            <div className="grid gap-3 xl:grid-cols-3">
              {portfolioModel.portfolioSignals.map((signal, index) => (
                <div key={signal.id} className="rounded-[24px] border border-border/60 bg-background/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Model signal {index + 1}
                    </p>
                    <Badge variant="outline" className="rounded-full text-[11px]">
                      {signal.kindLabel}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-foreground">{signal.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => openPortfolioSignal(signal.clickTarget, signal.relatedSegmentKeys)}
                    >
                      Open related view
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {portfolioModel.actions.map((action, index) => (
            <div
              key={action.id}
              className={cn(
                'rounded-[24px] border border-border/60 bg-background/80 p-4 transition',
                selectedActionId === action.id && 'border-primary/30 bg-primary/[0.04]',
              )}
            >
              <button type="button" className="w-full text-left" onClick={() => requestActionFocus(action)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Priority {index + 1}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{action.title}</p>
                  </div>
                  <Badge variant="outline" className="rounded-full text-[11px]">
                    {action.urgencyLabel}
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{action.summary}</p>
              </button>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => openActionPrimary(action)}>
                  Highlight / Open
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  onClick={() => openFirstRelatedSegment(action.relatedSegmentKeys)}
                >
                  Jump To Segment
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
        <CardHeader className="pb-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Where Could The Portfolio Path Change Next?
          </p>
          <CardTitle className="mt-2 flex items-center gap-2 text-xl">
            <MoveUpRight className="h-5 w-5 text-primary" />
            Future Path Ribbon
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-[1.2fr_repeat(4,minmax(0,1fr))] gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <span>Segment</span>
            <span>Now</span>
            <span>5Y</span>
            <span>10Y</span>
            <span>15Y</span>
          </div>
          {portfolioModel.scenarioLanes.map((lane) => (
            <button
              key={lane.segmentKey}
              type="button"
              onClick={() => openScenario(lane.segmentKey)}
              className="grid w-full grid-cols-[1.2fr_repeat(4,minmax(0,1fr))] gap-2 rounded-[24px] border border-border/60 bg-background/80 p-3 text-left hover:border-primary/30"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className={cn('h-2.5 w-2.5 rounded-full', statusDotClassName[segmentDecisionByKey[lane.segmentKey].status])} />
                {lane.title}
              </span>
              {lane.nodes.map((node) => (
                <span key={`${lane.segmentKey}-${node.label}`} className="rounded-2xl border border-border/60 bg-card/70 px-3 py-2 text-xs text-foreground">
                  <span className="block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{node.label}</span>
                  <span className="mt-1 block font-medium">{node.state}</span>
                </span>
              ))}
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
        <CardHeader className="pb-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            What Should Leadership Monitor Now?
          </p>
          <CardTitle className="mt-2 flex items-center gap-2 text-xl">
            <Gauge className="h-5 w-5 text-primary" />
            Portfolio Watchlist
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-5">
          {portfolioModel.watchlist.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openFirstRelatedSegment(item.relatedSegmentKeys)}
              className="rounded-[24px] border border-border/60 bg-background/80 p-4 text-left hover:border-primary/30"
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {item.kind === 'leading' ? 'Leading indicator' : 'Decision trigger'}
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-foreground">{item.label}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                Seen across {item.relatedSegmentKeys.length} segment{item.relatedSegmentKeys.length === 1 ? '' : 's'}
              </p>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  const getActivityStatus = (activity: MacroActivityView) => {
    const market = activity.scores.market_attractiveness;
    const defend = (activity.scores.right_to_play + activity.scores.position_sustainability) / 2;
    const confidence = cleanMacroText(activity.scores.confidence).toLowerCase();

    if (cleanMacroText(activity.scores.outlook_label).toLowerCase() === 'deteriorating' || market < 3) {
      return 'Pressured' as const;
    }
    if (defend >= 3.5 && market >= 3) {
      return 'Advantaged' as const;
    }
    if (confidence === 'low' && market <= 3 && defend <= 3) {
      return 'Uncertain' as const;
    }
    return 'Contested' as const;
  };

  const renderMacroForceCard = (
    force: MacroMacroForce,
    segment: MacroSegmentView,
    activities: MacroActivityView[],
  ) => (
    <button
      key={`${segment.segment_key}-${force.theme_key || force.title}`}
      type="button"
      onClick={() => openOverlayTheme(force.click_target)}
      className="rounded-[24px] border border-border/60 bg-background/80 p-4 text-left hover:border-primary/30"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{force.title || force.theme || 'Macro theme'}</p>
        <Badge variant="outline" className="rounded-full text-[11px]">
          {formatHorizon(force.time_horizon)}
        </Badge>
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Direction | Severity
      </p>
      <p className="mt-1 text-sm text-foreground">
        {cleanMacroText(force.impact_direction || force.direction || 'neutral')} | {cleanMacroText(force.severity || 'medium')}
      </p>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {getMacroForceNarrative(macroData, force, segment, activities)}
      </p>
    </button>
  );

  const renderSegmentView = (segment: MacroSegmentView) => {
    const decision = segmentDecisionByKey[segment.segment_key];
    const activities = routeLookup.activityBySegmentKey[segment.segment_key] || [];
    const primaryActivity = activities[0];
    const segmentHighlights = segment.deep_research_highlights || segment.modules?.deep_research_highlights?.cards || [];

    return (
      <div className="space-y-5">
        <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
          <CardContent className="grid gap-5 p-5 md:p-6 lg:grid-cols-[1.25fr_0.9fr]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn('rounded-full text-[11px]', decision.tone.badgeClassName)}>{decision.status}</Badge>
                <Badge variant="outline" className="rounded-full text-[11px]">
                  {decision.outlookLabel}
                </Badge>
                <Badge variant="outline" className="rounded-full text-[11px]">
                  {decision.confidenceLabel}
                </Badge>
              </div>
              {segment.header_badges?.length ? (
                <div className="flex flex-wrap gap-2">
                  {segment.header_badges.map((badge) => (
                    <Badge key={`${segment.segment_key}-${badge.label}`} variant="outline" className="rounded-full text-[11px]">
                      {badge.label}: {formatSecondaryMetricValue(badge.value)}
                    </Badge>
                  ))}
                </div>
              ) : null}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Which Activities Matter Most Inside This Segment?
                </p>
                <h3 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{segment.title}</h3>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{decision.thesis}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <MetricItem label="Segment Thesis" value={decision.whyItMatters} />
                <MetricItem label="Key Action" value={decision.actionTitle} />
                <MetricItem label="Key Watchpoint" value={decision.watchpoints[0] || 'Watchpoints still emerging'} />
              </div>
            </div>

            <div className="rounded-[28px] border border-amber-500/20 bg-amber-500/[0.06] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">What Next?</p>
              <p className="mt-3 text-sm leading-6 text-foreground">
                Compare the activities first, then open the one that carries the biggest decision weight or uncertainty.
              </p>
              {primaryActivity ? (
                <Button className="mt-4 rounded-full bg-amber-500 px-4 text-black hover:bg-amber-600" onClick={() => goToDashboard(primaryActivity.view_key)}>
                  Open {primaryActivity.title}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {segmentHighlights.length ? (
          <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">What To Inspect Next</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 xl:grid-cols-2">
              {segmentHighlights.map((highlight) => {
                const linkedActivity = activities.find((activity) => activity.activity_key === highlight.activity_key);
                const highlightNarrative = linkedActivity
                  ? getActivityNarrative(
                      macroData,
                      linkedActivity,
                      highlight.right_to_play ||
                        highlight.market_outlook ||
                        'Open the diagnostic workspace to validate the current call and watchpoints.',
                    )
                  : cleanMacroText(highlight.right_to_play || highlight.market_outlook) ||
                    'Open the diagnostic workspace to validate the current call and watchpoints.';

                return (
                  <button
                    key={highlight.activity_key}
                    type="button"
                    onClick={() => goToDashboard(highlight.click_target)}
                    className="rounded-[24px] border border-border/60 bg-background/80 p-4 text-left hover:border-primary/30"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{highlight.title}</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{highlightNarrative}</p>
                      </div>
                      {highlight.judgment_stack?.outlook_label ? (
                        <Badge variant="outline" className="rounded-full text-[11px]">
                          {highlight.judgment_stack.outlook_label}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <ScoreBar label="Market" value={highlight.judgment_stack?.market_attractiveness} />
                      <ScoreBar label="Right To Play" value={highlight.judgment_stack?.right_to_play} />
                      <ScoreBar label="Sustainability" value={highlight.judgment_stack?.position_sustainability} />
                    </div>
                    {(highlight.watchpoints || []).length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {highlight.watchpoints.slice(0, 3).map((watchpoint) => (
                          <span
                            key={`${highlight.activity_key}-${watchpoint}`}
                            className="rounded-full border border-border/60 bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground"
                          >
                            {watchpoint}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </CardContent>
          </Card>
        ) : null}

        <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Activities</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-2">
            {activities.map((activity) => {
              const activityStatus = getActivityStatus(activity);
              return (
                <button
                  key={activity.activity_key}
                  type="button"
                  onClick={() => goToDashboard(activity.view_key)}
                  className="rounded-[28px] border border-border/60 bg-background/80 p-5 text-left hover:border-primary/30"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-foreground">{activity.title}</p>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{activity.short_description}</p>
                    </div>
                    <Badge className={cn('rounded-full text-[11px]', activityStatus === decision.status ? decision.tone.badgeClassName : statusBadgeClassName[activityStatus])}>
                      {activityStatus}
                    </Badge>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <ScoreBar label="Market" value={activity.scores.market_attractiveness} />
                    <ScoreBar label="Right To Play" value={activity.scores.right_to_play} />
                    <ScoreBar label="Sustainability" value={activity.scores.position_sustainability} />
                  </div>
                  <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Next click: open full diagnostics
                  </p>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Business Map</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <MetricList
                label="Products / Services"
                values={segment.business_map?.products || segment.modules?.business_map?.products_services || []}
              />
              <MetricList
                label="End Markets"
                values={segment.business_map?.end_markets || segment.modules?.business_map?.end_markets || []}
              />
              <MetricList
                label="Geographies"
                values={segment.business_map?.key_geographies || segment.modules?.business_map?.key_geographies || []}
              />
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Rolled-Up Segment Judgment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <MetricItem label="Recommended Action" value={decision.recommendedAction} />
              <MetricItem label="Key Risk" value={decision.keyRisk} />
              <MetricItem label="Key Upside" value={decision.keyUpside} />
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Segment-Specific Macro Force View</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-2">
            {segment.major_macro_forces.map((force) => renderMacroForceCard(force, segment, activities))}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderActivityView = (activity: MacroActivityView) => {
    const segment = macroData.segment_views.find((item) => item.segment_key === activity.parent_segment_key);
    if (!segment) return null;

    const status = getActivityStatus(activity);
    const tone = segmentDecisionByKey[segment.segment_key].status === status
      ? segmentDecisionByKey[segment.segment_key].tone
      : {
          Pressured: { badgeClassName: statusBadgeClassName.Pressured },
          Advantaged: { badgeClassName: statusBadgeClassName.Advantaged },
          Contested: { badgeClassName: statusBadgeClassName.Contested },
          Uncertain: { badgeClassName: statusBadgeClassName.Uncertain },
        }[status];
    const activityEvidence = getActivityEvidenceModel(macroData, activity);
    const narrative = getActivityNarrative(
      macroData,
      activity,
      'This activity should be treated as a diagnostic workspace where leadership validates the market path, right to play, and what could change the view.',
    );

    return (
      <div className="space-y-5">
        <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
          <CardContent className="grid gap-5 p-5 md:p-6 lg:grid-cols-[1.25fr_0.9fr]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn('rounded-full text-[11px]', tone.badgeClassName)}>{status}</Badge>
                <Badge variant="outline" className="rounded-full text-[11px]">
                  {formatMacroConfidence(activity.scores.confidence)}
                </Badge>
                <Badge variant="outline" className="rounded-full text-[11px]">
                  {formatStage(activity.modules?.market_clock?.current_stage)}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Diagnostic Workspace
                </p>
                <h3 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{activity.title}</h3>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{narrative}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <ScoreBar label="Market Trajectory" value={activity.scores.market_attractiveness} />
                <ScoreBar label="Right To Play" value={activity.scores.right_to_play} />
                <ScoreBar label="Defensibility" value={activity.modules?.defensibility_test?.defensibility_score || activity.scores.position_sustainability} />
              </div>
            </div>

            <div className="rounded-[28px] border border-amber-500/20 bg-amber-500/[0.06] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">What Changes The View?</p>
              <div className="mt-4 space-y-3">
                {(activity.modules?.scenario_box?.what_changes_the_judgment || []).slice(0, 4).map((item) => (
                  <div key={item} className="rounded-2xl border border-amber-500/15 bg-background/80 p-3 text-sm leading-6 text-foreground">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">What Matters Now</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(activity.modules?.what_matters_now?.points || [narrative]).slice(0, 3).map((point) => (
                <div key={point} className="rounded-2xl border border-border/60 bg-background/80 p-4 text-sm leading-6 text-foreground">
                  {point}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Evidence Quality</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <MetricItem label="Confidence" value={formatMacroConfidence(activity.scores.confidence)} />
                <MetricItem label="Promoted Items" value={`${activityEvidence.totalPromotedItems}`} />
                <MetricItem label="Citation Count" value={`${activityEvidence.citationCount}`} />
                <MetricItem label="Open Gaps" value={`${activityEvidence.openGaps.length}`} />
              </div>

              {activityEvidence.coverage.length ? (
                <div className="grid gap-3">
                  {activityEvidence.coverage.map((coverage) => (
                    <div
                      key={`${activity.activity_key}-${coverage.lensKey}`}
                      className="rounded-2xl border border-border/60 bg-background/80 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{coverage.label}</p>
                        <Badge variant="outline" className="rounded-full text-[11px]">
                          {coverage.count} items
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{coverage.uniqueSources} unique sources</span>
                        {coverage.sourceTiers.length ? <span>{compactJoin(coverage.sourceTiers, 'Unknown tier')}</span> : null}
                        {coverage.qaStatuses.length ? <span>{compactJoin(coverage.qaStatuses, 'Unspecified QA')}</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {activityEvidence.openGaps.length ? (
                <details className="rounded-[24px] border border-border/60 bg-background/80 p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-foreground">
                    Open gaps and missing evidence
                  </summary>
                  <div className="mt-4 space-y-3">
                    {activityEvidence.openGaps.map((gap) => (
                      <div
                        key={`${activity.activity_key}-gap-${gap}`}
                        className="rounded-2xl border border-border/60 bg-card/70 p-3 text-sm leading-6 text-muted-foreground"
                      >
                        {gap}
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}

              {activityEvidence.sources.length ? (
                <details className="rounded-[24px] border border-border/60 bg-background/80 p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-foreground">
                    Source detail
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {activityEvidence.exactCitationMappingAvailable
                      ? 'Source cards are mapped directly from the activity evidence block.'
                      : activityEvidence.derivedFromThemes
                        ? "Source cards are derived from the activity's linked macro themes because the activity payload carries citation counts but not direct citation keys."
                        : 'Source cards are limited because the activity payload does not expose direct citation keys.'}
                  </p>
                  <div className="mt-4 grid gap-3">
                    {activityEvidence.sources.map((source) => (
                      <div
                        key={`${activity.activity_key}-source-${source.sourceKey}`}
                        className="rounded-2xl border border-border/60 bg-card/70 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{source.title}</p>
                            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                              {source.sourceDomain} | {source.sourceTier} | {formatPublicationDate(source.publicationDate)}
                            </p>
                          </div>
                          {source.url ? (
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-foreground hover:border-primary/30"
                            >
                              Open source
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                  {activityEvidence.unresolvedCitations ? (
                    <p className="mt-4 text-xs text-muted-foreground">
                      {activityEvidence.unresolvedCitations} citation reference
                      {activityEvidence.unresolvedCitations === 1 ? '' : 's'} could not be resolved from the source index.
                    </p>
                  ) : null}
                </details>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Snapshot And Footprint</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <MetricItem label="Activity Snapshot" value={activity.modules?.activity_snapshot?.summary || activity.short_description || 'Pending'} />
              <MetricItem label="Why It Matters" value={activity.modules?.activity_snapshot?.why_it_matters || narrative} />
              <MetricItem label="Value Chain Position" value={activity.modules?.business_footprint?.value_chain_position || 'Pending'} />
              <MetricList label="Products / Services" values={activity.modules?.business_footprint?.products_services || []} />
              <MetricList label="End Markets" values={activity.modules?.business_footprint?.end_markets || []} />
              <MetricList label="Customer Types" values={activity.modules?.business_footprint?.customer_types || []} />
              <MetricList label="Geographies" values={activity.modules?.business_footprint?.key_geographies || []} />
              <MetricList label="Relevant Players" values={activity.modules?.business_footprint?.relevant_players || []} />
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Market Clock And Structure</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <MetricItem label="Market Clock" value={formatStage(activity.modules?.market_clock?.current_stage)} />
              <MetricItem label="Speed Of Change" value={activity.modules?.market_clock?.speed_of_change || 'Pending'} />
              <MetricItem label="Growth Profile" value={activity.modules?.market_clock?.growth_profile || activity.modules?.market_clock?.summary || 'Pending'} />
              <MetricItem label="Market Summary" value={activity.modules?.market_clock?.summary || 'Pending'} />
              <MetricList label="Demand Drivers" values={activity.modules?.market_clock?.key_demand_drivers || []} />
              <MetricList label="Headwinds" values={activity.modules?.market_clock?.key_headwinds || []} />
              <MetricList label="Inflection Points" values={activity.modules?.market_clock?.inflection_points || []} />
              <MetricItem label="Structure Judgment" value={activity.modules?.five_forces?.overall_structure_judgment || 'Pending'} />
              <MetricItem label="Defensibility Test" value={activity.modules?.defensibility_test?.summary || 'Pending'} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Defensibility Test</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <MetricItem label="Summary" value={activity.modules?.defensibility_test?.summary || 'Pending'} />
              <MetricItem
                label="Defensibility Score"
                value={`${activity.modules?.defensibility_test?.defensibility_score || activity.scores.position_sustainability}/5`}
              />
              <MetricList label="Current Advantages" values={activity.modules?.defensibility_test?.current_advantages || []} />
              <MetricList label="Structural Weaknesses" values={activity.modules?.defensibility_test?.structural_weaknesses || []} />
              <MetricList label="Must Be True" values={activity.modules?.defensibility_test?.must_be_true || []} />
              <MetricList label="Failure Modes" values={activity.modules?.defensibility_test?.failure_modes || []} />
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Five Forces</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { label: 'Competitive Rivalry', force: activity.modules?.five_forces?.competitive_rivalry },
                  { label: 'Supplier Power', force: activity.modules?.five_forces?.supplier_power },
                  { label: 'Customer Power', force: activity.modules?.five_forces?.customer_power },
                  { label: 'Threat Of Substitutes', force: activity.modules?.five_forces?.threat_of_substitutes },
                  { label: 'Threat Of New Entry', force: activity.modules?.five_forces?.threat_of_new_entry },
                ].map(({ label, force }) => (
                  <div
                    key={`${activity.activity_key}-${label}`}
                    className="rounded-2xl border border-border/60 bg-background/80 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <Badge variant="outline" className="rounded-full text-[11px]">
                        {cleanMacroText(force?.level || 'unspecified') || 'unspecified'}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {cleanMacroText(force?.summary || '') || 'No further structured summary is provided for this force.'}
                    </p>
                    {(force?.key_players || []).length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(force?.key_players || []).map((player) => (
                          <span
                            key={`${activity.activity_key}-${label}-${player}`}
                            className="rounded-full border border-border/60 bg-card/70 px-3 py-1 text-xs font-medium text-foreground"
                          >
                            {player}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              <MetricItem label="Overall Structure Judgment" value={activity.modules?.five_forces?.overall_structure_judgment || 'Pending'} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Macro Force Map</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {(activity.modules?.macro_force_map?.forces || []).map((force) => renderMacroForceCard(force, segment, [activity]))}
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Scenario Box</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <MetricItem label="Base" value={activity.modules?.scenario_box?.base_case || 'Pending'} />
              <MetricItem label="Bull" value={activity.modules?.scenario_box?.bull_case || 'Pending'} />
              <MetricItem label="Bear" value={activity.modules?.scenario_box?.bear_case || 'Pending'} />
              <MetricList label="Leading Indicators" values={activity.modules?.scenario_box?.leading_indicators || []} />
              <MetricList label="Triggers" values={activity.modules?.scenario_box?.triggers || []} />
              <MetricList label="What Changes The Judgment" values={activity.modules?.scenario_box?.what_changes_the_judgment || []} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderReadingView = () => (
    <div className="space-y-5">
      <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
        <CardContent className="grid gap-5 p-5 md:p-6 lg:grid-cols-[1.35fr_0.85fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Narrative Mode
            </p>
            <h3 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Executive Reading View
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              {portfolioModel.heroThesis}
            </p>
          </div>
          <div className="rounded-[28px] border border-amber-500/20 bg-amber-500/[0.06] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Switch Back To Compare</p>
            <p className="mt-3 text-sm leading-6 text-foreground">
              Use this mode for a linear walkthrough. Switch back to the dashboard when you need to compare segments or validate the evidence behind a call.
            </p>
            <Button className="mt-4 rounded-full bg-amber-500 px-4 text-black hover:bg-amber-600" onClick={() => goToDashboard()}>
              Open Decision Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Company-Level Macro Judgment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 text-sm leading-6 text-foreground">
            {portfolioModel.heroThesis}
          </div>
          <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 text-sm leading-6 text-muted-foreground">
            {portfolioModel.confidenceLabel}
          </div>
          {portfolioModel.heroMetrics.length ? (
            <div className="grid gap-3 md:grid-cols-3">
              {portfolioModel.heroMetrics.map((metric) => (
                <MetricItem
                  key={`reading-hero-${metric.label}`}
                  label={metric.label}
                  value={formatSecondaryMetricValue(metric.value)}
                />
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Segment Briefs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {portfolioModel.segmentDecisions.map((decision) => (
            <div key={`reading-${decision.segmentKey}`} className="rounded-[24px] border border-border/60 bg-background/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{decision.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{decision.thesis}</p>
                </div>
                <Badge className={cn('rounded-full text-[11px]', decision.tone.badgeClassName)}>{decision.status}</Badge>
              </div>
              <Button variant="outline" size="sm" className="mt-4 rounded-full" onClick={() => goToDashboard(decision.nodeKey)}>
                Open Segment
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Cross-Cutting Macro Themes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {portfolioModel.themes.map((theme) => (
            <button
              key={`reading-theme-${theme.themeKey}`}
              type="button"
              onClick={() => openOverlayTheme(theme.nodeKey)}
              className="w-full rounded-[24px] border border-border/60 bg-background/80 p-4 text-left hover:border-primary/30"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{theme.title}</p>
                <Badge variant="outline" className="rounded-full text-[11px]">
                  {theme.citationsCount} citations
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{getMacroThemeSummary(theme)}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[30px] border border-border/60 bg-card/85 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Portfolio Implications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {portfolioModel.portfolioSignals.map((signal) => (
            <div key={`reading-signal-${signal.id}`} className="rounded-[24px] border border-border/60 bg-background/80 p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {signal.kindLabel}
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">{signal.summary}</p>
            </div>
          ))}
          {portfolioModel.actions.map((action) => (
            <div key={`reading-action-${action.id}`} className="rounded-[24px] border border-border/60 bg-background/80 p-4">
              <p className="text-sm font-semibold text-foreground">{action.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{action.summary}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  const renderOverlay = () => (
    <Sheet open={Boolean(overlay)} onOpenChange={(open) => !open && closeOverlay()}>
      <SheetContent side="right" className="w-full overflow-y-auto border-l border-border/60 p-0 sm:max-w-[560px]">
        <div className="p-6">
          {selectedTheme ? (
            <>
              <SheetHeader>
                <SheetTitle>{selectedTheme.title}</SheetTitle>
                <SheetDescription>{selectedTheme.mechanism}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <MetricItem label="What Is Changing" value={selectedTheme.summary} />
                <div className="grid gap-3 md:grid-cols-2">
                  <MetricItem label="Severity" value={selectedTheme.severity} />
                  <MetricItem label="Horizon" value={formatHorizon(selectedTheme.horizon)} />
                </div>

                <div className="rounded-[24px] border border-border/60 bg-background/80 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Affected Segments
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedTheme.affectedSegments.length ? (
                      selectedTheme.affectedSegments.map((segmentTitle) => (
                        <button
                          key={`theme-segment-${segmentTitle}`}
                          type="button"
                          onClick={() => openSegmentByTitle(segmentTitle)}
                          className="rounded-full border border-border/60 bg-card/70 px-3 py-1 text-xs font-medium text-foreground hover:border-primary/30"
                        >
                          {segmentTitle}
                        </button>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Pending</span>
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] border border-border/60 bg-background/80 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Affected Activities
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedTheme.affectedActivities.length ? (
                      selectedTheme.affectedActivities.map((activityTitle) => (
                        <button
                          key={`theme-activity-${activityTitle}`}
                          type="button"
                          onClick={() => openActivityByTitle(activityTitle)}
                          className="rounded-full border border-border/60 bg-card/70 px-3 py-1 text-xs font-medium text-foreground hover:border-primary/30"
                        >
                          {activityTitle}
                        </button>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Pending</span>
                    )}
                  </div>
                </div>

                <MetricList label="Strategic Implications" values={selectedTheme.strategicImplications} />

                <div className="rounded-[24px] border border-border/60 bg-background/80 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Key Evidence
                  </p>
                  <div className="mt-3 space-y-3">
                    {selectedTheme.keyEvidence.length ? (
                      selectedTheme.keyEvidence.map((item) => (
                        <div
                          key={`${selectedTheme.themeKey}-evidence-${item}`}
                          className="rounded-2xl border border-border/60 bg-card/70 p-3 text-sm leading-6 text-muted-foreground"
                        >
                          {item}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-border/60 bg-card/70 p-3 text-sm leading-6 text-muted-foreground">
                        No structured evidence detail is available for this theme.
                      </div>
                    )}
                  </div>
                </div>

                {selectedTheme.sources.length ? (
                  <details className="rounded-[24px] border border-border/60 bg-background/80 p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-foreground">
                      Source detail
                    </summary>
                    <div className="mt-4 grid gap-3">
                      {selectedTheme.sources.map((source) => (
                        <div
                          key={`${selectedTheme.themeKey}-source-${source.sourceKey}`}
                          className="rounded-2xl border border-border/60 bg-card/70 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{source.title}</p>
                              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                {source.sourceDomain} | {source.sourceTier} | {formatPublicationDate(source.publicationDate)}
                              </p>
                            </div>
                            {source.url ? (
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-foreground hover:border-primary/30"
                              >
                                Open source
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                    {selectedTheme.unresolvedCitations ? (
                      <p className="mt-4 text-xs text-muted-foreground">
                        {selectedTheme.unresolvedCitations} citation reference
                        {selectedTheme.unresolvedCitations === 1 ? '' : 's'} could not be resolved from the source index.
                      </p>
                    ) : null}
                  </details>
                ) : null}
              </div>
            </>
          ) : null}

          {selectedScenario ? (
            <>
              <SheetHeader>
                <SheetTitle>{selectedScenario.title}</SheetTitle>
                <SheetDescription>Base, bull, and bear cases with the triggers that would change the current call.</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <MetricItem label="Base Case" value={selectedScenario.baseCase} />
                <MetricItem label="Bull Case" value={selectedScenario.bullCase} />
                <MetricItem label="Bear Case" value={selectedScenario.bearCase} />
                <MetricItem label="Triggers" value={compactJoin(selectedScenario.triggers, 'Pending')} />
                <MetricItem label="Leading Indicators" value={compactJoin(selectedScenario.leadingIndicators, 'Pending')} />
              </div>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );

  const renderedBody =
    mode === 'reading'
      ? renderReadingView()
      : currentActivity
        ? renderActivityView(currentActivity)
        : currentSegment
          ? renderSegmentView(currentSegment)
          : renderOverview();

  return (
    <div className="space-y-5">
      {renderShellHeader()}
      {renderedBody}
      {renderOverlay()}
    </div>
  );
}
*/
