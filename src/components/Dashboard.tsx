import { useMemo, useRef, useState } from 'react';
import { ExecutiveOverview } from '@/components/views/ExecutiveOverview';
import { StrategyComposition } from '@/components/views/StrategyComposition';
import { CoreAssumptionsView } from '@/components/views/CoreAssumptionsView';
import { AssumptionsScoredHub } from '@/components/views/AssumptionsScoredHub';
import { SignalStream } from '@/components/views/SignalStream';
import { OutlierForecast } from '@/components/views/OutlierForecast';
import { WorkstreamsView } from '@/components/views/WorkstreamsView';
import { FinancialAnalysisView } from '@/components/views/FinancialAnalysisView';
import { SharePriceAnalysisView } from '@/components/views/SharePriceAnalysisView';
import { MacroDashboard } from '@/components/views/MacroDashboard';
import { CrowsNestStreamHome } from '@/components/views/CrowsNestStreamHome';
import { CrowsNestDimensionView } from '@/components/views/CrowsNestDimensionView';
import { CrowsNestProjectionView } from '@/components/views/CrowsNestProjectionView';
import { CrowsNestMacroRadar } from '@/components/views/CrowsNestMacroRadar';
import { CrowsNestWhatIf } from '@/components/views/CrowsNestWhatIf';
import { CrowsNestBetsRegister } from '@/components/views/CrowsNestBetsRegister';
import { ProjectionEditor, applyOverridesToBundle } from '@/components/crows-nest/ProjectionEditor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useForesight } from '@/contexts/ForesightContext';
import { buildMacroPortfolioModel } from '@/lib/macro-utils';
import { cn } from '@/lib/utils';
import { useStreamUploader } from '@/hooks/use-stream-uploader';
import {
  Activity,
  Building2,
  BookOpenText,
  Briefcase,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Compass,
  FlaskConical,
  GitMerge,
  Globe,
  Layers,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  ShieldAlert,
  Target,
  TrendingUp,
  Upload,
  Workflow,
  X,
} from 'lucide-react';

type DashboardView =
  | 'streams-home'
  | 'convergence'
  | 'foresight-overview'
  | 'foresight-strategy'
  | 'foresight-core-assumptions'
  | 'foresight-signals-stream'
  | 'foresight-signals-outliers'
  | 'foresight-assumptions-scored'
  | 'foresight-assumptions-synthesized'
  | 'foresight-workstreams'
  | 'financial-overview'
  | 'financial-fundamentals'
  | 'financial-share-price'
  | 'macro-overview'
  | 'macro-risk'
  | 'crows-nest-home'
  | 'crows-nest-bets-register'
  | 'crows-nest-dimension'
  | 'crows-nest-projection'
  | 'crows-nest-macro'
  | 'crows-nest-whatif';

interface SidebarItemProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  onClick: () => void;
  badge?: string;
  collapsed: boolean;
  tone: 'executive' | 'strategic' | 'financial' | 'macro' | 'crows-nest';
}

const cleanText = (value?: string) => {
  if (!value) return '';
  return value.replace(/\s+/g, ' ').trim();
};

const summarize = (value?: string, maxWords = 20) => {
  const text = cleanText(value);
  if (!text) return '';
  const words = text.split(' ');
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(' ')}...`;
};

const toDateLabel = (value?: string) => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
};

const viewMetaMap: Record<DashboardView, { title: string; stream: string; note: string }> = {
  'streams-home': {
    title: 'Executive Stream Home',
    stream: 'Streams Home',
    note: 'Choose the stream that answers the immediate leadership question, then move from executive context into evidence.',
  },
  convergence: {
    title: 'Convergence Workspace',
    stream: 'Executive Layer',
    note: 'Intersection workspace across streams.',
  },
  'foresight-overview': {
    title: 'Strategic Executive Overview',
    stream: 'Strategic Stream',
    note: 'Start point for strategic analysis.',
  },
  'foresight-strategy': {
    title: 'Strategy Decomposition',
    stream: 'Strategic Stream',
    note: 'Core strategy structure and rationale.',
  },
  'foresight-core-assumptions': {
    title: 'Core Assumptions',
    stream: 'Strategic Stream',
    note: 'Assumption inventory and diagnostics.',
  },
  'foresight-signals-stream': {
    title: 'Signal Stream',
    stream: 'Strategic Stream',
    note: 'Signals linked to assumptions.',
  },
  'foresight-signals-outliers': {
    title: 'Signal Outliers',
    stream: 'Strategic Stream',
    note: 'Threats, opportunities, and early warnings with the highest combined importance.',
  },
  'foresight-assumptions-scored': {
    title: 'Assumptions Scored',
    stream: 'Strategic Stream',
    note: 'Scored assumption health view.',
  },
  'foresight-assumptions-synthesized': {
    title: 'Assumptions Synthesized',
    stream: 'Strategic Stream',
    note: 'Synthesized scenario implications.',
  },
  'foresight-workstreams': {
    title: 'Strategic Impact',
    stream: 'Strategic Stream',
    note: 'Recommended strategic workstreams.',
  },
  'financial-overview': {
    title: 'Financial Executive Overview',
    stream: 'Financial Stream',
    note: 'Start point for financial interpretation.',
  },
  'financial-fundamentals': {
    title: 'Financial Fundamentals',
    stream: 'Financial Stream',
    note: 'Fundamental performance and statement analysis.',
  },
  'financial-share-price': {
    title: 'Share Price Analysis',
    stream: 'Financial Stream',
    note: 'Market behavior and event-forensics.',
  },
  'macro-overview': {
    title: 'Macro Decision Dashboard',
    stream: 'Macro Stream',
    note: 'Executive comparison layer across overview, segment, and activity decisions.',
  },
  'macro-risk': {
    title: 'Macro Executive Reading',
    stream: 'Macro Stream',
    note: 'Memo-first reading mode inside the same macro drill-down experience.',
  },
  'crows-nest-home': {
    title: 'Crow\'s Nest — Velocity Grid',
    stream: 'Crow\'s Nest',
    note: 'The 30-second read: where the company is bet, and which bets are moving against it right now.',
  },
  'crows-nest-bets-register': {
    title: 'Crow\'s Nest — Bets Register',
    stream: 'Crow\'s Nest',
    note: 'The full projection set with system claims, your assertions, divergence flags, and research priority.',
  },
  'crows-nest-dimension': {
    title: 'Crow\'s Nest — Dimension drill-down',
    stream: 'Crow\'s Nest',
    note: 'Why is this bet moving the way it is? Projections, drivers, and cross-couplings.',
  },
  'crows-nest-projection': {
    title: 'Crow\'s Nest — Projection deep-dive',
    stream: 'Crow\'s Nest',
    note: 'Truth-likelihood timeline + driver breakdown + evidence cards.',
  },
  'crows-nest-macro': {
    title: 'Crow\'s Nest — Macro Radar',
    stream: 'Crow\'s Nest',
    note: 'Active macro themes + their propagation matrix. The overcoupling layer.',
  },
  'crows-nest-whatif': {
    title: 'Crow\'s Nest — What-If',
    stream: 'Crow\'s Nest',
    note: 'Stress-test the company\'s bets. Scenarios that override drivers or macro themes and cascade through.',
  },
};

function SidebarItem({ label, icon: Icon, isActive, onClick, badge, collapsed, tone }: SidebarItemProps) {
  const toneStyles = {
    executive: {
      active: 'border-primary/30 bg-primary/[0.06] shadow-sm',
      inactive: 'border-border/60 bg-background/70 hover:border-primary/20 hover:bg-primary/[0.03]',
      iconActive: 'text-primary',
      iconInactive: 'text-muted-foreground',
      badge: 'border-primary/40 text-primary',
    },
    strategic: {
      active: 'border-sky-500/30 bg-sky-500/[0.06] shadow-sm',
      inactive: 'border-border/60 bg-background/70 hover:border-sky-500/20 hover:bg-sky-500/[0.03]',
      iconActive: 'text-sky-600',
      iconInactive: 'text-muted-foreground',
      badge: 'border-sky-500/35 text-sky-600',
    },
    financial: {
      active: 'border-emerald-500/30 bg-emerald-500/[0.06] shadow-sm',
      inactive:
        'border-border/60 bg-background/70 hover:border-emerald-500/20 hover:bg-emerald-500/[0.03]',
      iconActive: 'text-emerald-600',
      iconInactive: 'text-muted-foreground',
      badge: 'border-emerald-500/35 text-emerald-600',
    },
    macro: {
      active: 'border-amber-500/30 bg-amber-500/[0.06] shadow-sm',
      inactive: 'border-border/60 bg-background/70 hover:border-amber-500/20 hover:bg-amber-500/[0.03]',
      iconActive: 'text-amber-600',
      iconInactive: 'text-muted-foreground',
      badge: 'border-amber-500/35 text-amber-600',
    },
    'crows-nest': {
      active: 'border-rose-500/30 bg-rose-500/[0.06] shadow-sm',
      inactive: 'border-border/60 bg-background/70 hover:border-rose-500/20 hover:bg-rose-500/[0.03]',
      iconActive: 'text-rose-600',
      iconInactive: 'text-muted-foreground',
      badge: 'border-rose-500/35 text-rose-600',
    },
  } as const;

  const selectedTone = toneStyles[tone];

  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border transition',
        collapsed ? 'px-2 py-2' : 'px-3 py-2 text-left',
        'flex items-center justify-between gap-3',
        isActive ? selectedTone.active : selectedTone.inactive,
      )}
    >
      <span className={cn('flex items-center gap-2 text-sm', isActive ? 'text-foreground font-medium' : 'text-foreground')}>
        <Icon className={cn('h-4 w-4', isActive ? selectedTone.iconActive : selectedTone.iconInactive)} />
        {!collapsed && <span className="truncate">{label}</span>}
      </span>
      {!collapsed && badge && (
        <Badge
          variant={isActive ? 'default' : 'outline'}
          className={cn('rounded-full px-2 py-0 text-[10px]', !isActive && selectedTone.badge)}
        >
          {badge}
        </Badge>
      )}
    </button>
  );
}

interface HomeStreamCardProps {
  tone: 'strategic' | 'financial' | 'macro' | 'crows-nest';
  title: string;
  statusLabel: string;
  statusClassName: string;
  icon: React.ComponentType<{ className?: string }>;
  summary: string;
  highlights: Array<{ label: string; value: string }>;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

function HomeStreamCard({
  tone,
  title,
  statusLabel,
  statusClassName,
  icon: Icon,
  summary,
  highlights,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
}: HomeStreamCardProps) {
  const toneStyles = {
    strategic: {
      card: 'border-sky-500/25 bg-background/88 hover:border-sky-500/40',
      iconWrap: 'border-sky-500/20 bg-sky-500/[0.08]',
      icon: 'text-sky-600',
      highlight: 'border-sky-500/15 bg-sky-500/[0.04]',
      primaryButton: 'bg-sky-600 text-white hover:bg-sky-700',
      secondaryButton: 'border-sky-500/25 text-sky-700 hover:bg-sky-500/[0.08]',
    },
    financial: {
      card: 'border-emerald-500/25 bg-background/88 hover:border-emerald-500/40',
      iconWrap: 'border-emerald-500/20 bg-emerald-500/[0.08]',
      icon: 'text-emerald-600',
      highlight: 'border-emerald-500/15 bg-emerald-500/[0.04]',
      primaryButton: 'bg-emerald-600 text-white hover:bg-emerald-700',
      secondaryButton: 'border-emerald-500/25 text-emerald-700 hover:bg-emerald-500/[0.08]',
    },
    macro: {
      card: 'border-amber-500/25 bg-background/88 hover:border-amber-500/40',
      iconWrap: 'border-amber-500/20 bg-amber-500/[0.08]',
      icon: 'text-amber-600',
      highlight: 'border-amber-500/15 bg-amber-500/[0.04]',
      primaryButton: 'bg-amber-500 text-black hover:bg-amber-600',
      secondaryButton: 'border-amber-500/25 text-amber-700 hover:bg-amber-500/[0.08]',
    },
    'crows-nest': {
      card: 'border-rose-500/25 bg-background/88 hover:border-rose-500/40',
      iconWrap: 'border-rose-500/20 bg-rose-500/[0.08]',
      icon: 'text-rose-600',
      highlight: 'border-rose-500/15 bg-rose-500/[0.04]',
      primaryButton: 'bg-rose-500 text-white hover:bg-rose-600',
      secondaryButton: 'border-rose-500/25 text-rose-700 hover:bg-rose-500/[0.08]',
    },
  } as const;

  const selectedTone = toneStyles[tone];

  return (
    <Card className={cn('rounded-[28px] border shadow-sm transition-colors', selectedTone.card)}>
      <CardContent className="flex h-full flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={cn('rounded-2xl border p-3', selectedTone.iconWrap)}>
              <Icon className={cn('h-5 w-5', selectedTone.icon)} />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{summary}</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'max-w-[132px] rounded-full px-3 py-1 text-center text-[11px] font-semibold leading-4 whitespace-normal',
              statusClassName,
            )}
          >
            {statusLabel}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {highlights.map((item) => (
            <div key={`${title}-${item.label}`} className={cn('rounded-2xl border p-3', selectedTone.highlight)}>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-sm font-medium text-foreground break-words">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <Button className={cn('rounded-full px-4', selectedTone.primaryButton)} onClick={onPrimaryAction}>
            {primaryActionLabel}
          </Button>
          {secondaryActionLabel && onSecondaryAction ? (
            <Button
              variant="outline"
              className={cn('rounded-full px-4', selectedTone.secondaryButton)}
              onClick={onSecondaryAction}
            >
              {secondaryActionLabel}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const {
    data,
    workstreams,
    allSignals,
    coreAssumptions,
    threats,
    opportunities,
    hasForesightData,
    hasFinancialData,
    hasSharePriceData,
    hasMacroData,
    hasCrowsNestData,
    financialData,
    sharePriceData,
    macroData,
    crowsNestData,
    companyName,
    resetStreams,
  } = useForesight();
  const { uploadFiles } = useStreamUploader();
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const [activeView, setActiveView] = useState<DashboardView>('streams-home');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [viewHistory, setViewHistory] = useState<DashboardView[]>([]);
  const [focusAssumptionId, setFocusAssumptionId] = useState<string | null>(null);
  const [crowsNestDimensionId, setCrowsNestDimensionId] = useState<string | null>(null);
  const [crowsNestProjectionId, setCrowsNestProjectionId] = useState<string | null>(null);
  const [crowsNestMacroThemeId, setCrowsNestMacroThemeId] = useState<string | null>(null);
  const [crowsNestWhatIfId, setCrowsNestWhatIfId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorProjectionId, setEditorProjectionId] = useState<string | null>(null);
  const [overrideTick, setOverrideTick] = useState(0); // increment after save to force re-render

  // Apply persisted localStorage overrides to the loaded bundle in-place on every load + save tick.
  useMemo(() => {
    if (crowsNestData?.meta?.company) {
      applyOverridesToBundle(crowsNestData, crowsNestData.meta.company);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crowsNestData, overrideTick]);

  const hasWorkstreams = workstreams.length > 0 || !!data?.strategic_impact_analysis;
  const assumptionsSubtab =
    activeView === 'foresight-assumptions-synthesized' ? 'synthesized' : 'scored';

  const streamSummary = useMemo(() => {
    const strategicVerdict =
      data?.strategic_impact_analysis?.executive_diagnosis?.bottom_line_verdict ||
      data?.strategic_impact_analysis?.executive_diagnosis?.verdict ||
      data?.strategy_context?.strategy_snapshot?.strategy_summary ||
      data?.company_strategy?.strategy_snapshot?.strategy_summary ||
      '';

    const financialThesis =
      financialData?.executive?.executive_thesis ||
      financialData?.executive?.professional_outcome_report ||
      financialData?.executive?.critic_verdict ||
      '';

    const sharePriceSummary =
      sharePriceData?.executive_guide?.stock_story ||
      sharePriceData?.driver_map?.dominant_narrative ||
      '';

    return {
      strategicVerdict: summarize(strategicVerdict, 24),
      financialThesis: summarize(financialThesis, 24),
      sharePriceSummary: summarize(sharePriceSummary, 24),
      topFlag: financialData?.executive?.top_flag?.message || '',
      marketRegime: sharePriceData?.trend_analysis?.current_regime || '',
      macroThesis: macroData ? summarize(buildMacroPortfolioModel(macroData).heroThesis, 24) : '',
    };
  }, [data, financialData, macroData, sharePriceData]);

  const companyContext = useMemo(() => {
    const strategyCompany = data?.strategy_context?.company || data?.company_strategy?.company;
    // Home page hero derives identity from the strategic stream ONLY.
    // Financial / macro streams show their own company info inside their
    // respective cards — they should NOT override the top-level display
    // when the strategic stream is loaded for a different company.
    const displayName =
      strategyCompany?.name ||
      data?.meta?.company ||
      companyName ||
      'Company';
    const industry = strategyCompany?.industry || 'Industry';
    const asOf =
      strategyCompany?.as_of_date ||
      data?.meta?.generated_at ||
      sharePriceData?._meta?.generated_at;
    const oneLine =
      data?.strategy_context?.strategy_snapshot?.one_line_positioning ||
      data?.company_strategy?.strategy_snapshot?.one_line_positioning ||
      macroData?.overview_view?.title ||
      'Use Streams Home to orient quickly, then open each stream executive overview.';
    return {
      displayName,
      industry,
      asOf,
      oneLine,
    };
  }, [companyName, data, macroData, sharePriceData]);

  const navigate = (view: DashboardView, _sidebarBehavior = true) => {
    if (view !== activeView) {
      setViewHistory((prev) => [...prev, activeView]);
    }
    setActiveView(view);
  };

  const goBack = () => {
    setViewHistory((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const previousView = next.pop() as DashboardView;
      setActiveView(previousView);
      return next;
    });
  };

  const handleForesightNavigate = (tab: string) => {
    const routeByTab: Record<string, DashboardView> = {
      overview: 'foresight-overview',
      strategy: 'foresight-strategy',
      'core-assumptions': 'foresight-core-assumptions',
      signals: 'foresight-signals-stream',
      outliers: 'foresight-signals-outliers',
      assumptions: 'foresight-assumptions-scored',
      synthesized: 'foresight-assumptions-synthesized',
      workstreams: 'foresight-workstreams',
    };
    navigate(routeByTab[tab] || 'foresight-overview');
  };

  const renderNoDataCard = (message: string) => (
    <Card className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
      <CardContent className="space-y-3 p-6">
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );

  const currentViewMeta = viewMetaMap[activeView];

  const strategicStepNavigation = useMemo(() => {
    const steps: DashboardView[] = [
      'foresight-overview',
      'foresight-strategy',
      'foresight-core-assumptions',
      'foresight-signals-stream',
      'foresight-signals-outliers',
      'foresight-assumptions-scored',
      'foresight-assumptions-synthesized',
      'foresight-workstreams',
    ];

    const index = steps.indexOf(activeView);
    if (index === -1) return null;

    return {
      previous: index > 0 ? steps[index - 1] : null,
      next: index < steps.length - 1 ? steps[index + 1] : null,
    };
  }, [activeView]);

  const previousStepMeta = strategicStepNavigation?.previous ? viewMetaMap[strategicStepNavigation.previous] : null;
  const nextStepMeta = strategicStepNavigation?.next ? viewMetaMap[strategicStepNavigation.next] : null;
  const canReturnToStrategicOverview =
    activeView !== 'foresight-overview' && activeView.startsWith('foresight-');

  const renderStreamsHome = () => {
    const asOfDisplay = toDateLabel(companyContext.asOf);
    const strategicReady = hasForesightData;
    const financialReady = hasFinancialData || hasSharePriceData;
    const macroReady = hasMacroData;
    const financialCoverage = Number(hasFinancialData) + Number(hasSharePriceData);
    const activeStreamCount = Number(strategicReady) + Number(financialReady) + Number(macroReady);
    const positiveSignals = allSignals.filter((signal) => signal.impact_direction === 'Positive').length;
    const negativeSignals = allSignals.filter((signal) => signal.impact_direction === 'Negative').length;
    const startRecommendation = strategicReady
        ? {
            title: 'Start with the Strategic Stream',
            body:
              'It currently provides the clearest executive framing for the company case. The financial executive layer is still work in progress, while the macro stream now operates as a separate decision tool when loaded.',
          }
      : financialReady
        ? {
            title: 'Start with the Financial Stream',
            body:
              'Use the financial layer first to establish business and market context while the strategic stream is still missing. The financial view is still being refined, while the macro stream may already be available as a separate decision tool.',
          }
        : macroReady
          ? {
              title: 'Start with the Macro Stream',
              body:
                'Use the macro decision dashboard to compare segments, surface cross-cutting pressures, and set the first drill-down path. The financial layer is still being refined, while the strategic stream is not currently loaded.',
            }
        : {
            title: 'Load a stream to begin',
            body:
              'Once a stream is uploaded, this page becomes the executive launch point for every downstream analysis and drill-down view. The financial layer is still being refined, while the macro layer now supports a guided decision flow when loaded.',
          };

    const financialSecondaryAction = hasSharePriceData
      ? {
          label: 'Open Share-Price Detail',
          onClick: () => navigate('financial-share-price', false),
        }
      : hasFinancialData
        ? {
            label: 'Open Fundamentals Detail',
            onClick: () => navigate('financial-fundamentals', false),
          }
        : undefined;

    return (
      <div className="space-y-5">
        <Card className="rounded-[30px] border border-border/60 bg-card/78 shadow-sm">
          <CardContent className="flex flex-col gap-6 p-6 md:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Streams Home
                </p>
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                    {companyContext.displayName}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                    {companyContext.oneLine}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-medium">
                    {companyContext.industry}
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-medium">
                    <Calendar className="mr-1 h-3.5 w-3.5" />
                    {asOfDisplay}
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-medium">
                    {activeStreamCount} active {activeStreamCount === 1 ? 'stream' : 'streams'}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button className="rounded-full px-4" onClick={() => uploadInputRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full px-4"
                  onClick={() => navigate('convergence', false)}
                >
                  Convergence
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-full px-4"
                  onClick={resetStreams}
                  title="Clear all loaded streams"
                >
                  <X className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-border/60 bg-background/80 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Recommended start
                </p>
                <p className="mt-2 text-base font-semibold text-foreground">{startRecommendation.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{startRecommendation.body}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-2">
                <div className="rounded-3xl border border-border/60 bg-background/80 px-4 py-4">
                  <p className="text-xl font-semibold text-foreground">{allSignals.length}</p>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Signals
                  </p>
                </div>
                <div className="rounded-3xl border border-border/60 bg-background/80 px-4 py-4">
                  <p className="text-xl font-semibold text-foreground">{coreAssumptions.length}</p>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Assumptions
                  </p>
                </div>
                <div className="rounded-3xl border border-border/60 bg-background/80 px-4 py-4">
                  <p className="text-xl font-semibold text-foreground">{workstreams.length}</p>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Workstreams
                  </p>
                </div>
                <div className="rounded-3xl border border-border/60 bg-background/80 px-4 py-4">
                  <p className="text-xl font-semibold text-foreground">{financialCoverage}/2</p>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Finance
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          <HomeStreamCard
            tone="strategic"
            title="Strategic Stream"
            statusLabel={strategicReady ? 'Executive-ready' : 'Awaiting upload'}
            statusClassName={
              strategicReady
                ? 'border-sky-500/30 bg-sky-500/12 text-sky-700'
                : 'border-border/60 bg-background/75 text-muted-foreground'
            }
            icon={Compass}
            summary={
              strategicReady
                ? streamSummary.strategicVerdict ||
                  'Strategic stream is loaded and ready for the executive overview.'
                : 'Upload the foresight JSON stream to unlock the executive verdict, decomposition, assumptions, signals, and impact workstreams.'
            }
            highlights={[
              { label: 'Signals', value: `${allSignals.length}` },
              { label: 'Assumptions', value: `${coreAssumptions.length}` },
              {
                label: 'Positive / Negative',
                value:
                  positiveSignals + negativeSignals > 0
                    ? `${positiveSignals} / ${negativeSignals}`
                    : 'Pending',
              },
            ]}
            primaryActionLabel="Open Strategic Executive"
            onPrimaryAction={() => navigate('foresight-overview', false)}
            secondaryActionLabel={hasWorkstreams ? 'Open Strategic Impact' : 'Open Signal Stream'}
            onSecondaryAction={() =>
              navigate(hasWorkstreams ? 'foresight-workstreams' : 'foresight-signals-stream', false)
            }
          />

          <HomeStreamCard
            tone="financial"
            title="Financial Stream"
            statusLabel={
              financialCoverage === 2
                ? 'Loaded'
                : financialReady
                  ? 'Partially loaded'
                  : 'Awaiting upload'
            }
            statusClassName={
              financialCoverage === 2
                ? 'border-emerald-500/30 bg-emerald-500/12 text-emerald-700'
                : financialReady
                  ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700'
                  : 'border-border/60 bg-background/75 text-muted-foreground'
            }
            icon={CircleDollarSign}
            summary={
              financialReady
                ? streamSummary.financialThesis ||
                  streamSummary.sharePriceSummary ||
                  'Financial analysis and share-price analysis are being assembled here for executive use. This stream is still work in progress.'
                : 'Upload financial analysis and share-price analysis payloads to unlock the financial executive layer, statement review, and market context.'
            }
            highlights={[
              { label: 'Financial analysis', value: hasFinancialData ? 'Yes' : 'No' },
              { label: 'Share-price analysis', value: hasSharePriceData ? 'Yes' : 'No' },
              { label: 'Share-price regime', value: streamSummary.marketRegime || 'Pending' },
            ]}
            primaryActionLabel="Open Financial Executive"
            onPrimaryAction={() => navigate('financial-overview', false)}
            secondaryActionLabel={financialSecondaryAction?.label}
            onSecondaryAction={financialSecondaryAction?.onClick}
          />

          <HomeStreamCard
            tone="macro"
            title="Macro Stream"
            statusLabel={macroReady ? 'Loaded' : 'Awaiting upload'}
            statusClassName={
              macroReady
                ? 'border-amber-500/30 bg-amber-500/12 text-amber-700'
                : 'border-border/60 bg-background/75 text-muted-foreground'
            }
            icon={ShieldAlert}
            summary={
              macroReady
                ? streamSummary.macroThesis ||
                  'Macro is loaded as a guided decision tool with overview, segment, activity, and memo-first reading modes.'
                : 'Upload the macro dashboard JSON to unlock the segment decision strip, segment drill-downs, activity diagnostics, and source roll-ups.'
            }
            highlights={[
              { label: 'Mode', value: macroReady ? 'Decision tool' : 'Pending' },
              { label: 'Entry', value: macroData?.default_route || 'overview' },
              { label: 'Reading', value: macroData?.reading_route || 'pending' },
            ]}
            primaryActionLabel="Open Macro Dashboard"
            onPrimaryAction={() => navigate('macro-overview', false)}
            secondaryActionLabel={macroReady ? 'Open Executive Reading' : 'Open Convergence Workspace'}
            onSecondaryAction={() => navigate(macroReady ? 'macro-risk' : 'convergence', false)}
          />

          <HomeStreamCard
            tone="crows-nest"
            title="Crow's Nest"
            statusLabel={hasCrowsNestData ? 'Loaded' : 'Awaiting upload'}
            statusClassName={
              hasCrowsNestData
                ? 'border-rose-500/30 bg-rose-500/12 text-rose-700'
                : 'border-border/60 bg-background/75 text-muted-foreground'
            }
            icon={Radio}
            summary={
              hasCrowsNestData
                ? (crowsNestData?.headline?.verdict_sentence?.replace(/\*\*/g, '') ||
                  'Predictive foresight layer: 8 strategic dimensions, projection-level truth-likelihood timelines, and a calibration-audited honesty gauge.')
                : 'Upload the Crow\'s Nest bundle JSON (schema_version: crows_nest_v2) to unlock the velocity grid, dimension drill-downs, and projection deep-dives.'
            }
            highlights={
              hasCrowsNestData
                ? [
                    { label: 'Bets tracked', value: `${crowsNestData?.headline?.raw?.dimensions_total ?? 0}` },
                    { label: 'At risk', value: `${(crowsNestData?.headline?.raw?.dimensions_at_risk ?? 0) + (crowsNestData?.headline?.raw?.dimensions_breaking ?? 0)}` },
                    { label: 'Brier', value: crowsNestData?.calibration?.overall_brier != null ? crowsNestData.calibration.overall_brier.toFixed(2) : '—' },
                  ]
                : [
                    { label: 'Mode', value: 'Predictive' },
                    { label: 'Entry', value: 'Velocity grid' },
                    { label: 'Levels', value: '3-deep drill' },
                  ]
            }
            primaryActionLabel="Open Velocity Grid"
            onPrimaryAction={() => navigate('crows-nest-home', false)}
          />
        </div>
      </div>
    );
  };

  const renderFinancialExecutiveOverview = () => {
    if (!hasFinancialData && !hasSharePriceData) {
      return renderNoDataCard('Financial stream is not loaded yet. Upload financial and/or share-price JSON files.');
    }

    return (
      <div className="space-y-5">
        <Card className="rounded-3xl border border-border/60 bg-card/70 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <CircleDollarSign className="h-4 w-4 text-primary" />
                Financial Stream Executive Overview
              </CardTitle>
              <Badge variant="outline" className="rounded-full text-[11px]">
                Work in progress
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Single-page summary for fundamentals and share-price intelligence. This section will
              keep expanding as the financial stream matures.
            </p>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="rounded-2xl border border-border/60 bg-background/80 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Fundamentals snapshot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Badge variant={hasFinancialData ? 'default' : 'secondary'}>
                    {hasFinancialData ? 'Loaded' : 'Missing'}
                  </Badge>
                  <p className="text-muted-foreground">
                    {streamSummary.financialThesis || 'Upload fundamentals JSON to show executive thesis.'}
                  </p>
                  {streamSummary.topFlag && (
                    <p className="text-xs text-muted-foreground">
                      Top flag: {summarize(streamSummary.topFlag, 18)}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('financial-fundamentals', false)}
                  >
                    Open Fundamentals Detail
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-border/60 bg-background/80 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Share-price snapshot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Badge variant={hasSharePriceData ? 'default' : 'secondary'}>
                    {hasSharePriceData ? 'Loaded' : 'Missing'}
                  </Badge>
                  <p className="text-muted-foreground">
                    {streamSummary.sharePriceSummary || 'Upload share-price JSON to show price narrative.'}
                  </p>
                  {streamSummary.marketRegime && (
                    <p className="text-xs text-muted-foreground">
                      Current regime: {streamSummary.marketRegime}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('financial-share-price', false)}
                  >
                    Open Share-Price Detail
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderCurrentView = () => {
    if (activeView.startsWith('foresight-') && !hasForesightData) {
      return renderNoDataCard('Strategic foresight stream is not loaded yet. Upload a foresight JSON file.');
    }

    if (activeView.startsWith('macro-') && !hasMacroData) {
      return renderNoDataCard('Macro stream is not loaded yet. Upload a macro dashboard JSON file.');
    }

    if (activeView.startsWith('crows-nest-') && !hasCrowsNestData) {
      return renderNoDataCard('Crow\'s Nest stream is not loaded yet. Upload a Crow\'s Nest bundle JSON (schema_version: crows_nest_v2).');
    }

    switch (activeView) {
      case 'streams-home':
        return renderStreamsHome();
      case 'convergence':
        return (
          <Card className="rounded-3xl border border-border/60 bg-background/80 shadow-sm">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Workflow className="h-4 w-4 text-primary" />
                  Convergence Workspace
                </CardTitle>
                <Badge variant="outline" className="rounded-full text-[11px]">
                  Work in progress
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                This workspace is reserved for final intersection logic across Strategic, Financial,
                and Macro streams.
              </p>
              <p>
                Current readiness: Strategic {hasForesightData ? 'ready' : 'missing'}, Financial{' '}
                {hasFinancialData || hasSharePriceData ? 'partially ready' : 'missing'}, Macro pending.
              </p>
            </CardContent>
          </Card>
        );
      case 'foresight-overview':
        return (
          <ExecutiveOverview
            onNavigate={handleForesightNavigate}
            onOpenAssumptionDetail={(assumptionId) => {
              setFocusAssumptionId(assumptionId);
              navigate('foresight-assumptions-scored', false);
            }}
          />
        );
      case 'foresight-strategy':
        return <StrategyComposition />;
      case 'foresight-core-assumptions':
        return <CoreAssumptionsView />;
      case 'foresight-signals-stream':
        return <SignalStream />;
      case 'foresight-signals-outliers':
        return <OutlierForecast />;
      case 'foresight-assumptions-scored':
      case 'foresight-assumptions-synthesized':
        return (
          <AssumptionsScoredHub
            activeTab={assumptionsSubtab}
            onTabChange={(tab) =>
              navigate(
                tab === 'synthesized' ? 'foresight-assumptions-synthesized' : 'foresight-assumptions-scored',
                false,
              )
            }
            focusAssumptionId={focusAssumptionId}
            onFocusAssumptionConsumed={() => setFocusAssumptionId(null)}
          />
        );
      case 'foresight-workstreams':
        return <WorkstreamsView />;
      case 'financial-overview':
        return renderFinancialExecutiveOverview();
      case 'financial-fundamentals':
        return <FinancialAnalysisView />;
      case 'financial-share-price':
        return <SharePriceAnalysisView />;
      case 'macro-overview':
        return (
          <MacroDashboard
            initialMode="dashboard"
            onRequestModeChange={(nextMode) => navigate(nextMode === 'reading' ? 'macro-risk' : 'macro-overview', false)}
          />
        );
      case 'macro-risk':
        return (
          <MacroDashboard
            initialMode="reading"
            onRequestModeChange={(nextMode) => navigate(nextMode === 'reading' ? 'macro-risk' : 'macro-overview', false)}
          />
        );
      case 'crows-nest-home':
        return (
          <CrowsNestStreamHome
            onSelectDimension={(dimId) => {
              setCrowsNestDimensionId(dimId);
              navigate('crows-nest-dimension');
            }}
          />
        );
      case 'crows-nest-bets-register':
        return (
          <CrowsNestBetsRegister
            onSelectProjection={(pid) => {
              setCrowsNestProjectionId(pid);
              navigate('crows-nest-projection');
            }}
            onSelectDimension={(did) => {
              setCrowsNestDimensionId(did);
              navigate('crows-nest-dimension');
            }}
            onOpenEditor={(pid) => {
              setEditorProjectionId(pid);
              setEditorOpen(true);
            }}
          />
        );
      case 'crows-nest-dimension': {
        if (!crowsNestDimensionId) {
          return renderNoDataCard('Pick a dimension from the velocity grid first.');
        }
        return (
          <CrowsNestDimensionView
            dimensionId={crowsNestDimensionId}
            onSelectProjection={(pid) => {
              setCrowsNestProjectionId(pid);
              navigate('crows-nest-projection');
            }}
            onBack={() => navigate('crows-nest-home')}
          />
        );
      }
      case 'crows-nest-projection': {
        if (!crowsNestProjectionId) {
          return renderNoDataCard('Pick a projection from a dimension first.');
        }
        return (
          <CrowsNestProjectionView
            projectionId={crowsNestProjectionId}
            onBack={() => navigate('crows-nest-dimension')}
            onOpenEditor={(pid) => {
              setEditorProjectionId(pid);
              setEditorOpen(true);
            }}
          />
        );
      }
      case 'crows-nest-macro':
        return (
          <CrowsNestMacroRadar
            selectedThemeId={crowsNestMacroThemeId}
            onSelectTheme={setCrowsNestMacroThemeId}
          />
        );
      case 'crows-nest-whatif':
        return (
          <CrowsNestWhatIf
            selectedScenarioId={crowsNestWhatIfId}
            onSelectScenario={setCrowsNestWhatIfId}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex flex-1 flex-col gap-4 p-4 lg:p-5 xl:flex-row">
        <input
          ref={uploadInputRef}
          type="file"
          accept=".json"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              void uploadFiles(e.target.files);
            }
            e.target.value = '';
          }}
        />
        <aside
          className={cn(
            'w-full transition-all duration-300 xl:flex-none xl:sticky xl:top-4 xl:self-start',
            isSidebarCollapsed ? 'xl:w-[86px]' : 'xl:w-[300px]',
          )}
        >
          <div className="max-h-[calc(100vh-2rem)] overflow-y-auto">
            <Card className="rounded-2xl border border-border/60 bg-card/80 shadow-sm">
              <CardHeader className={cn('pb-2', isSidebarCollapsed && 'px-2')}>
                <div className="flex items-center justify-between">
                  {!isSidebarCollapsed && <CardTitle className="text-sm">Navigation</CardTitle>}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                    title={isSidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
                  >
                    {isSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className={cn('space-y-4', isSidebarCollapsed && 'px-2')}>
                {!isSidebarCollapsed ? (
                  <div className="rounded-xl border border-border/60 bg-background/80 p-3">
                    <button
                      type="button"
                      className="text-left"
                      title="Back to Streams Home"
                      onClick={() => navigate('streams-home', false)}
                    >
                      <p className="text-sm font-semibold text-foreground hover:text-primary">{companyContext.displayName}</p>
                    </button>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {companyContext.industry} | {toDateLabel(companyContext.asOf)}
                    </p>
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{companyContext.oneLine}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 rounded-full px-3 text-[11px]"
                        onClick={() => uploadInputRef.current?.click()}
                      >
                        <Upload className="mr-1.5 h-3 w-3" />
                        Upload
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 rounded-full px-3 text-[11px]"
                        onClick={resetStreams}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      title="Streams Home"
                      onClick={() => navigate('streams-home', false)}
                    >
                      <Building2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      title="Upload JSON files"
                      onClick={() => uploadInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className={cn('space-y-2 rounded-xl border p-2', isSidebarCollapsed ? 'border-primary/25 bg-primary/[0.06] p-1.5' : 'border-primary/20 bg-primary/[0.05]')}>
                  {!isSidebarCollapsed && (
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Start Here
                    </p>
                  )}
                  <SidebarItem
                    label="Streams Home"
                    icon={LayoutDashboard}
                    isActive={activeView === 'streams-home'}
                    onClick={() => navigate('streams-home')}
                    collapsed={isSidebarCollapsed}
                    tone="executive"
                  />
                  <SidebarItem
                    label="Convergence Workspace"
                    icon={GitMerge}
                    isActive={activeView === 'convergence'}
                    onClick={() => navigate('convergence')}
                    badge="WIP"
                    collapsed={isSidebarCollapsed}
                    tone="executive"
                  />
                </div>

                <div className={cn('space-y-2 rounded-xl border p-2', isSidebarCollapsed ? 'border-sky-500/25 bg-sky-500/[0.08] p-1.5' : 'border-sky-500/20 bg-sky-500/[0.06]')}>
                  {!isSidebarCollapsed && (
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Strategic Stream
                      </p>
                      <Badge variant={hasForesightData ? 'default' : 'secondary'} className="text-[10px]">
                        {hasForesightData ? 'Loaded' : 'Missing'}
                      </Badge>
                    </div>
                  )}
                  <SidebarItem
                    label="Executive Overview"
                    icon={LayoutDashboard}
                    isActive={activeView === 'foresight-overview'}
                    onClick={() => navigate('foresight-overview')}
                    collapsed={isSidebarCollapsed}
                    tone="strategic"
                  />
                  <SidebarItem
                    label="Strategy Decomposition"
                    icon={Layers}
                    isActive={activeView === 'foresight-strategy'}
                    onClick={() => navigate('foresight-strategy')}
                    collapsed={isSidebarCollapsed}
                    tone="strategic"
                  />
                  <SidebarItem
                    label="Core Assumptions"
                    icon={Target}
                    isActive={activeView === 'foresight-core-assumptions'}
                    onClick={() => navigate('foresight-core-assumptions')}
                    collapsed={isSidebarCollapsed}
                    tone="strategic"
                  />
                  <SidebarItem
                    label="Signal Stream"
                    icon={Radio}
                    isActive={activeView === 'foresight-signals-stream'}
                    onClick={() => navigate('foresight-signals-stream')}
                    collapsed={isSidebarCollapsed}
                    tone="strategic"
                  />
                  <SidebarItem
                    label="Signal Outliers"
                    icon={Activity}
                    isActive={activeView === 'foresight-signals-outliers'}
                    onClick={() => navigate('foresight-signals-outliers')}
                    collapsed={isSidebarCollapsed}
                    tone="strategic"
                  />
                  <SidebarItem
                    label="Assumptions Scored"
                    icon={Target}
                    isActive={activeView === 'foresight-assumptions-scored'}
                    onClick={() => navigate('foresight-assumptions-scored')}
                    collapsed={isSidebarCollapsed}
                    tone="strategic"
                  />
                  <SidebarItem
                    label="Assumptions Synthesized"
                    icon={Compass}
                    isActive={activeView === 'foresight-assumptions-synthesized'}
                    onClick={() => navigate('foresight-assumptions-synthesized')}
                    collapsed={isSidebarCollapsed}
                    tone="strategic"
                  />
                  <SidebarItem
                    label="Strategic Impact"
                    icon={Briefcase}
                    isActive={activeView === 'foresight-workstreams'}
                    onClick={() => navigate('foresight-workstreams')}
                    badge={hasWorkstreams ? 'Ready' : 'Pending'}
                    collapsed={isSidebarCollapsed}
                    tone="strategic"
                  />
                </div>

                <div className={cn('space-y-2 rounded-xl border p-2', isSidebarCollapsed ? 'border-emerald-500/25 bg-emerald-500/[0.08] p-1.5' : 'border-emerald-500/20 bg-emerald-500/[0.06]')}>
                  {!isSidebarCollapsed && (
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Financial Stream
                      </p>
                      <Badge variant={hasFinancialData || hasSharePriceData ? 'default' : 'secondary'} className="text-[10px]">
                        {Number(hasFinancialData) + Number(hasSharePriceData)}/2
                      </Badge>
                    </div>
                  )}
                  <SidebarItem
                    label="Executive Overview"
                    icon={LayoutDashboard}
                    isActive={activeView === 'financial-overview'}
                    onClick={() => navigate('financial-overview')}
                    badge="WIP"
                    collapsed={isSidebarCollapsed}
                    tone="financial"
                  />
                  <SidebarItem
                    label="Financial Fundamentals"
                    icon={CircleDollarSign}
                    isActive={activeView === 'financial-fundamentals'}
                    onClick={() => navigate('financial-fundamentals')}
                    collapsed={isSidebarCollapsed}
                    tone="financial"
                  />
                  <SidebarItem
                    label="Share Price Analysis"
                    icon={TrendingUp}
                    isActive={activeView === 'financial-share-price'}
                    onClick={() => navigate('financial-share-price')}
                    collapsed={isSidebarCollapsed}
                    tone="financial"
                  />
                </div>

                <div className={cn('space-y-2 rounded-xl border p-2', isSidebarCollapsed ? 'border-amber-500/25 bg-amber-500/[0.08] p-1.5' : 'border-amber-500/20 bg-amber-500/[0.06]')}>
                  {!isSidebarCollapsed && (
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Macro Stream
                      </p>
                      <Badge variant={hasMacroData ? 'default' : 'secondary'} className="text-[10px]">
                        {hasMacroData ? 'Loaded' : 'Missing'}
                      </Badge>
                    </div>
                  )}
                  <SidebarItem
                    label="Decision Dashboard"
                    icon={LayoutDashboard}
                    isActive={activeView === 'macro-overview'}
                    onClick={() => navigate('macro-overview')}
                    badge={hasMacroData ? 'Ready' : 'Pending'}
                    collapsed={isSidebarCollapsed}
                    tone="macro"
                  />
                  <SidebarItem
                    label="Executive Reading"
                    icon={BookOpenText}
                    isActive={activeView === 'macro-risk'}
                    onClick={() => navigate('macro-risk')}
                    badge={hasMacroData ? 'Ready' : 'Pending'}
                    collapsed={isSidebarCollapsed}
                    tone="macro"
                  />
                </div>

                <div className={cn('space-y-2 rounded-xl border p-2', isSidebarCollapsed ? 'border-rose-500/25 bg-rose-500/[0.08] p-1.5' : 'border-rose-500/20 bg-rose-500/[0.06]')}>
                  {!isSidebarCollapsed && (
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Crow's Nest
                      </p>
                      <Badge variant={hasCrowsNestData ? 'default' : 'secondary'} className="text-[10px]">
                        {hasCrowsNestData ? 'Loaded' : 'Missing'}
                      </Badge>
                    </div>
                  )}
                  <SidebarItem
                    label="Bets Register"
                    icon={Layers}
                    isActive={activeView === 'crows-nest-bets-register'}
                    onClick={() => navigate('crows-nest-bets-register')}
                    badge={hasCrowsNestData ? `${crowsNestData?.bets_register?.totals?.with_user_assertion ?? 0}/${crowsNestData?.bets_register?.totals?.all_projections ?? 0}` : 'Pending'}
                    collapsed={isSidebarCollapsed}
                    tone="crows-nest"
                  />
                  <SidebarItem
                    label="Velocity Grid"
                    icon={Radio}
                    isActive={activeView === 'crows-nest-home'}
                    onClick={() => navigate('crows-nest-home')}
                    badge={hasCrowsNestData ? 'Ready' : 'Pending'}
                    collapsed={isSidebarCollapsed}
                    tone="crows-nest"
                  />
                  <SidebarItem
                    label="Macro Radar"
                    icon={Globe}
                    isActive={activeView === 'crows-nest-macro'}
                    onClick={() => navigate('crows-nest-macro')}
                    badge={hasCrowsNestData ? `${crowsNestData?.macro_themes?.length ?? 0}` : 'Pending'}
                    collapsed={isSidebarCollapsed}
                    tone="crows-nest"
                  />
                  <SidebarItem
                    label="What-If"
                    icon={FlaskConical}
                    isActive={activeView === 'crows-nest-whatif'}
                    onClick={() => navigate('crows-nest-whatif')}
                    badge={hasCrowsNestData ? `${crowsNestData?.what_if_scenarios?.length ?? 0}` : 'Pending'}
                    collapsed={isSidebarCollapsed}
                    tone="crows-nest"
                  />
                </div>

                {!isSidebarCollapsed && (
                  <div className="rounded-xl border border-border/60 bg-background/80 p-3">
                    <p className="text-xs font-medium text-foreground">Quick status</p>
                    <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                      <p>Threat outliers: {threats.length}</p>
                      <p>Opportunity outliers: {opportunities.length}</p>
                      <p>Linked workstreams: {workstreams.length}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </aside>

        <section className="min-w-0 flex-1 rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm md:p-5 lg:p-6">
          {activeView !== 'streams-home' ? (
            <div className="mb-4 rounded-2xl border border-border/60 bg-background/92 p-4 shadow-sm">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full text-[10px]">
                      {currentViewMeta.stream}
                    </Badge>
                    <Badge variant="outline" className="rounded-full text-[10px]">
                      You are here
                    </Badge>
                  </div>
                  <h2 className="mt-2 text-base font-semibold tracking-tight text-foreground md:text-lg">
                    {currentViewMeta.title}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{currentViewMeta.note}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {canReturnToStrategicOverview ? (
                    <Button
                      variant="secondary"
                      className="rounded-full px-4"
                      onClick={() => navigate('foresight-overview', false)}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Executive Overview
                    </Button>
                  ) : null}
                  <Button variant="outline" className="rounded-full px-4" disabled={viewHistory.length === 0} onClick={goBack}>
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button variant="secondary" className="rounded-full px-4" onClick={() => navigate('streams-home', false)}>
                    Streams Home
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          {renderCurrentView()}
          {strategicStepNavigation ? (
            <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div className="flex justify-start">
                {previousStepMeta ? (
                  <Button
                    variant="outline"
                    className="h-auto min-h-14 rounded-2xl px-4 py-3"
                    onClick={() => navigate(strategicStepNavigation.previous!, false)}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4 shrink-0" />
                    <span className="flex flex-col items-start text-left">
                      <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Previous step
                      </span>
                      <span className="text-sm font-semibold text-foreground">{previousStepMeta.title}</span>
                    </span>
                  </Button>
                ) : (
                  <div />
                )}
              </div>

              <div className="flex justify-center">
                {canReturnToStrategicOverview ? (
                  <Button
                    variant="ghost"
                    className="rounded-full px-4 text-sm"
                    onClick={() => navigate('foresight-overview', false)}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Strategic Executive Overview
                  </Button>
                ) : (
                  <div />
                )}
              </div>

              <div className="flex justify-end">
                {nextStepMeta ? (
                  <Button
                    variant="outline"
                    className="h-auto min-h-14 rounded-2xl px-4 py-3"
                    onClick={() => navigate(strategicStepNavigation.next!, false)}
                  >
                    <span className="flex flex-col items-end text-right">
                      <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Next step
                      </span>
                      <span className="text-sm font-semibold text-foreground">{nextStepMeta.title}</span>
                    </span>
                    <ChevronRight className="ml-2 h-4 w-4 shrink-0" />
                  </Button>
                ) : (
                  <div />
                )}
              </div>
            </div>
          ) : null}
        </section>
      </main>

      {/* Crow's Nest projection editor — mounted globally so any view can trigger it */}
      <ProjectionEditor
        projection={
          editorProjectionId && crowsNestData
            ? crowsNestData.dimensions.flatMap((d) => d.projections).find((p) => p.id === editorProjectionId) || null
            : null
        }
        company={crowsNestData?.meta?.company || ''}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSaved={() => {
          // Force re-application of overrides + re-render
          setOverrideTick((t) => t + 1);
        }}
      />
    </div>
  );
}
