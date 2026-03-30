import { useMemo, useState } from 'react';
import { useForesight } from '@/contexts/ForesightContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SignalDetailDialog } from '@/components/SignalDetailDialog';
import { SignalCard } from '@/components/SignalCard';
import { AssumptionHealth, Signal } from '@/types/foresight';
import { AssumptionSpiderCharts } from '@/components/views/AssumptionSpiderCharts';
import { 
  sortByScore, 
  getTopSignals
} from '@/lib/signal-utils';
import {
  ArrowRight,
  LayoutDashboard,
  Target,
  Radio,
  AlertTriangle,
  TrendingUp,
  Briefcase,
  ChevronRight,
  Calendar,
  Building2,
  AlertCircle,
  Layers,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAssumptionDisplayLabel } from '@/lib/foresight-utils';

interface ExecutiveOverviewProps {
  onNavigate: (tab: string) => void;
  onOpenAssumptionDetail: (assumptionId: string) => void;
}

interface PipelineStageProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  onClick: () => void;
  isActive?: boolean;
  color?: string;
}

function PipelineStage({ icon, label, onClick, isActive, color, count }: PipelineStageProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex h-[128px] w-[122px] flex-col items-center justify-center gap-2 rounded-3xl border border-border/50 bg-background/60 px-3 py-3 text-center shadow-[0_10px_30px_-22px_rgba(15,23,42,0.35)] backdrop-blur transition-all hover:-translate-y-1 hover:border-primary/60 hover:bg-primary/5 xl:h-[148px] xl:w-[138px] xl:gap-3",
        isActive 
          ? "border-primary/60 bg-primary/10 shadow-[0_20px_40px_-25px_rgba(59,130,246,0.35)]" 
          : "hover:border-primary/40"
      )}
    >
      <div className={cn(
        "flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-border/60 shadow-sm transition group-hover:ring-primary/40 xl:h-12 xl:w-12",
        color || "bg-primary/10 text-primary"
      )}>
        {icon}
      </div>
      <span className="min-h-[34px] max-w-[112px] text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-snug whitespace-normal flex items-center text-center xl:max-w-[120px] xl:text-[11px]">
        {label}
      </span>
      {typeof count === 'number' && (
        <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] font-semibold text-foreground">
          {count}
        </span>
      )}
    </button>
  );
}

function PipelineConnector({ label }: { label: string }) {
  return (
    <div className="flex w-[100px] shrink-0 flex-col items-center gap-1 text-center xl:w-[114px]">
      <ChevronRight className="h-5 w-5 text-muted-foreground xl:h-6 xl:w-6" />
      <span className="min-h-[30px] max-w-[100px] text-[10px] font-medium leading-snug text-muted-foreground text-center xl:max-w-[112px] xl:text-[11px]">
        {label}
      </span>
    </div>
  );
}

const cleanNarrative = (text?: string) => {
  if (!text) return '';
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/\[(S\d+)\]/g, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
};

const summarizeWords = (text?: string, maxWords = 12) => {
  const cleaned = cleanNarrative(text);
  if (!cleaned) return '';
  const words = cleaned.split(' ');
  if (words.length <= maxWords) return cleaned;
  return `${words.slice(0, maxWords).join(' ')}...`;
};

const extractBlufFromPaper = (markdown?: string) => {
  if (!markdown) return '';
  const lines = markdown.split(/\r?\n/);
  let inVerdictSection = false;
  const buffer: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (inVerdictSection && buffer.length > 0) break;
      continue;
    }
    if (line.startsWith('#')) {
      const heading = line.replace(/^#+\s*/, '').toLowerCase();
      if (heading.includes('verdict') || heading.includes('bottom line')) {
        inVerdictSection = true;
        continue;
      }
      if (inVerdictSection) break;
    }
    if (inVerdictSection) {
      buffer.push(line);
    }
  }

  if (buffer.length > 0) {
    return cleanNarrative(buffer.join(' '));
  }

  const fallback = cleanNarrative(markdown);
  return summarizeWords(fallback, 30);
};

const normalizeForceEntries = (fiveForces: any) => {
  if (!fiveForces) return [] as Array<{ name: string; intensity: string; description: string }>;
  const ignored = new Set(['summary', 'overview', 'confidence', 'forces', 'forces_research_sources', 'base_research_sources']);

  if (Array.isArray(fiveForces.forces)) {
    return fiveForces.forces.map((force: any) => ({
      name: force?.name || force?.force || 'Force',
      intensity: force?.intensity || force?.rating || force?.pressure || force?.level || 'Unknown',
      description: force?.description || force?.analysis || force?.summary || '',
    }));
  }

  if (fiveForces.forces && typeof fiveForces.forces === 'object') {
    return Object.entries(fiveForces.forces).map(([key, force]: [string, any]) => ({
      name: force?.name || force?.force || key.replace(/_/g, ' '),
      intensity: force?.intensity || force?.rating || force?.pressure || force?.level || 'Unknown',
      description: force?.description || force?.analysis || force?.summary || '',
    }));
  }

  return Object.entries(fiveForces)
    .filter(([key, value]) => !ignored.has(key) && typeof value === 'object' && value !== null)
    .map(([key, force]: [string, any]) => ({
      name: force?.name || force?.force || key.replace(/_/g, ' '),
      intensity: force?.intensity || force?.rating || force?.pressure || force?.level || 'Unknown',
      description: force?.description || force?.analysis || force?.summary || '',
    }));
};

const pressureRank = (value?: string) => {
  const normalized = (value || '').toLowerCase();
  if (normalized.includes('high') || normalized.includes('strong')) return 3;
  if (normalized.includes('medium') || normalized.includes('moderate')) return 2;
  if (normalized.includes('low') || normalized.includes('weak')) return 1;
  return 0;
};

const compactForceName = (value: string) => {
  const normalized = value.toLowerCase();
  if (normalized.includes('rivalry')) return 'Industry rivalry';
  if (normalized.includes('buyer') || normalized.includes('customer')) return 'Buyer power';
  if (normalized.includes('supplier')) return 'Supplier power';
  if (normalized.includes('entrant') || normalized.includes('entry')) return 'New entrants';
  if (normalized.includes('substitute')) return 'Substitutes';
  return value;
};

export function ExecutiveOverview({ onNavigate, onOpenAssumptionDetail }: ExecutiveOverviewProps) {
  const { 
    data, 
    allSignals, 
    coreAssumptions, 
    buildingBlocks, 
    workstreams,
    threats, 
    opportunities, 
    earlyWarnings,
    threatIds,
    opportunityIds,
    warningIds
  } = useForesight();
  
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [showHighlights, setShowHighlights] = useState(true);

  // Get company info
  const companyName = data?.meta?.company || data?.strategy_context?.company?.name || 'Company';
  const generatedAt = data?.meta?.generated_at 
    ? new Date(data.meta.generated_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '';

  // Top 5 items per category
  const topThreats = useMemo(() => getTopSignals(threats, 5), [threats]);
  const topOpportunities = useMemo(() => getTopSignals(opportunities, 5), [opportunities]);
  const topWarnings = useMemo(() => getTopSignals(earlyWarnings, 5), [earlyWarnings]);
  
  // Synthesized insights
  const synthesizedInsights = useMemo(() => {
    const improving = allSignals.filter(s => s.impact_direction === 'Positive');
    const deteriorating = allSignals.filter(s => s.impact_direction === 'Negative');
    
    return {
      improving: sortByScore(improving).slice(0, 3),
      deteriorating: sortByScore(deteriorating).slice(0, 3),
    };
  }, [allSignals]);

  const assumptionHealthEntries = useMemo(() => {
    const rootHealth = data?.assumption_health || [];
    const nestedHealth = data?.strategy_context?.assumption_health || [];
    return [...rootHealth, ...nestedHealth];
  }, [data?.assumption_health, data?.strategy_context?.assumption_health]);

  const assumptionHealthMap = useMemo(() => {
    const map = new Map<string, AssumptionHealth>();
    assumptionHealthEntries.forEach((health) => map.set(health.assumption_id, health));
    return map;
  }, [assumptionHealthEntries]);

  const assumptionStatusCounts = useMemo(() => {
    const statuses = Array.from(assumptionHealthMap.values());
    if (statuses.length === 0) {
      return {
        validated: 0,
        stable: coreAssumptions.length,
        challenged: 0,
        total: coreAssumptions.length,
      };
    }

    return {
      validated: statuses.filter((item) => item.verification_status === 'VALIDATED').length,
      stable: statuses.filter((item) => item.verification_status === 'MIXED').length,
      challenged: statuses.filter((item) => item.verification_status === 'AT RISK' || item.verification_status === 'UNKNOWN').length,
      total: statuses.length,
    };
  }, [assumptionHealthMap, coreAssumptions.length]);

  const spiderAssumptions = useMemo(() => {
    return coreAssumptions.map((assumption) => {
      const relatedSignals = allSignals.filter(
        (signal) => signal.related_assumption_id === assumption.id || signal.assumption_id === assumption.id,
      );
      return {
        id: assumption.id,
        statement: assumption.statement,
        displayLabel: getAssumptionDisplayLabel(assumption.id, assumption.statement, 4),
        category: assumption.category,
        supports_building_blocks: assumption.supports_building_blocks,
        health: assumptionHealthMap.get(assumption.id),
        challengingSignals: relatedSignals.filter((signal) => signal.impact_direction === 'Negative'),
        validatingSignals: relatedSignals.filter((signal) => signal.impact_direction === 'Positive'),
      };
    });
  }, [coreAssumptions, allSignals, assumptionHealthMap]);

  const scoredAssumptionsCount =
    data?.strategy_context?.assumption_health?.length ||
    data?.assumption_health?.length ||
    coreAssumptions.length;

  const strategicVerdict = useMemo(() => {
    const diagnosis: any = data?.strategic_impact_analysis?.executive_diagnosis;
    const directVerdict = diagnosis?.bottom_line_verdict || diagnosis?.verdict;
    if (directVerdict) return cleanNarrative(directVerdict);

    const conclusion =
      data?.strategic_impact_analysis?.strategic_impact_analysis?.strategic_conclusion ||
      data?.strategic_impact_analysis?.strategic_conclusion;

    if (typeof conclusion === 'string') {
      return extractBlufFromPaper(conclusion);
    }
    if (conclusion && typeof conclusion === 'object') {
      const summary = (conclusion as any).executive_summary || '';
      const fromPaper = extractBlufFromPaper(summary);
      if (fromPaper) return fromPaper;
    }

    return cleanNarrative(data?.strategy_context?.strategy_snapshot?.strategy_summary || '');
  }, [data]);

  const strategicAtGlance = useMemo(() => {
    const fiveForces = data?.strategy_context?.porter_five_forces || data?.strategy_context?.porter_5_forces;
    const forces = normalizeForceEntries(fiveForces).sort((a, b) => pressureRank(b.intensity) - pressureRank(a.intensity));

    const healthEntries = [
      ...(data?.strategy_context?.assumption_health || []),
      ...(data?.assumption_health || []),
    ];
    const positiveSignals =
      healthEntries.reduce((sum: number, item: any) => sum + Number(item?.positive_signals || 0), 0) ||
      allSignals.filter((signal) => signal.impact_direction === 'Positive').length;
    const negativeSignals =
      healthEntries.reduce((sum: number, item: any) => sum + Number(item?.negative_signals || 0), 0) ||
      allSignals.filter((signal) => signal.impact_direction === 'Negative').length;

    return {
      forces: forces.slice(0, 5),
      assumptionPulse:
        `${assumptionStatusCounts.validated} validated, ${assumptionStatusCounts.stable} stable, ${assumptionStatusCounts.challenged} challenged across ${assumptionStatusCounts.total} assumptions`,
    };
  }, [data, allSignals, assumptionStatusCounts]);

  const signalBalance = useMemo(() => {
    const positive = allSignals.filter((signal) => signal.impact_direction === 'Positive').length;
    const negative = allSignals.filter((signal) => signal.impact_direction === 'Negative').length;
    const totalDirectional = Math.max(positive + negative, 1);
    const warningShare = Math.max(earlyWarnings.length, 0);
    const warningWithinNegativeShare =
      negative > 0 ? Math.min(100, Math.round((earlyWarnings.length / negative) * 100)) : 0;

    return {
      positive,
      negative,
      warnings: earlyWarnings.length,
      positiveShare: Math.round((positive / totalDirectional) * 100),
      negativeShare: Math.round((negative / totalDirectional) * 100),
      warningWithinNegativeShare,
      warningShare:
        allSignals.length > 0 ? Math.min(100, Math.round((warningShare / allSignals.length) * 100)) : 0,
    };
  }, [allSignals, earlyWarnings.length]);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <LayoutDashboard className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground">No Data Loaded</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          Upload a foresight JSON file to view the executive overview and explore the full strategic pipeline.
        </p>
      </div>
    );
  }

  return (
    <div className="relative space-y-8">
      <div className="pointer-events-none absolute -top-24 right-8 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute top-32 -left-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
      <SignalDetailDialog
        signal={selectedSignal}
        onClose={() => setSelectedSignal(null)}
        threatIds={threatIds}
        opportunityIds={opportunityIds}
        warningIds={warningIds}
      />

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-background/80 via-card/80 to-primary/10 p-6 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)] backdrop-blur">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 top-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-border/60 bg-background/70 p-2 shadow-sm">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Executive Overview</p>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{companyName}</h1>
              </div>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {generatedAt}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/70 px-4 py-3 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.35)]">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <Radio className="h-4 w-4" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-foreground">{allSignals.length}</div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Signals</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/70 px-4 py-3 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.35)]">
              <div className="rounded-xl bg-purple-500/10 p-2 text-purple-500">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-foreground">{coreAssumptions.length}</div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Assumptions</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Navigation */}
      <Card className="bg-card/60 border border-border/50 rounded-3xl shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-foreground">Strategic Foresight Pipeline</CardTitle>
          <p className="text-xs text-muted-foreground">Navigate the flow from strategy to action.</p>
        </CardHeader>
        <CardContent className="pt-0 pb-6">
          <div className="flex flex-nowrap items-center justify-center gap-3 py-4 px-2">
            <PipelineStage
              icon={<Building2 className="h-6 w-6 xl:h-7 xl:w-7" />}
              label="Input company name"
              count={1}
              onClick={() => onNavigate('overview')}
              color="bg-slate-500/10 text-slate-500"
            />
            <PipelineConnector label="Research + Strategic analysis" />
            <PipelineStage
              icon={<Layers className="h-6 w-6 xl:h-7 xl:w-7" />}
              label="Strategic Decomposition"
              count={buildingBlocks ? 4 : 0}
              onClick={() => onNavigate('strategy')}
              color="bg-blue-500/10 text-blue-500"
            />
            <PipelineConnector label="Assumption extraction" />
            <PipelineStage
              icon={<Radio className="h-6 w-6 xl:h-7 xl:w-7" />}
              label="Core Assumptions"
              count={coreAssumptions.length}
              onClick={() => onNavigate('core-assumptions')}
              color="bg-cyan-500/10 text-cyan-500"
            />
            <PipelineConnector label="Signal Scanning + Scoring" />
            <PipelineStage
              icon={<Target className="h-6 w-6 xl:h-7 xl:w-7" />}
              label="Signals"
              count={allSignals.length}
              onClick={() => onNavigate('signals')}
              color="bg-purple-500/10 text-purple-500"
            />
            <PipelineConnector label="Signal Aggregation + Analysis" />
            <PipelineStage
              icon={<AlertTriangle className="h-6 w-6 xl:h-7 xl:w-7" />}
              label="Core Assumptions Scored"
              count={scoredAssumptionsCount}
              onClick={() => onNavigate('assumptions')}
              color="bg-orange-500/10 text-orange-500"
            />
            <PipelineConnector label="Impact Formulation" />
            <PipelineStage
              icon={<Briefcase className="h-6 w-6 xl:h-7 xl:w-7" />}
              label="Strategic Impact"
              count={workstreams.length}
              onClick={() => onNavigate('workstreams')}
              color="bg-emerald-500/10 text-emerald-500"
            />
          </div>
        </CardContent>
      </Card>
      <div className="text-center text-sm text-muted-foreground px-6 -mt-2">
        Use the pipeline as your primary navigation to move from inputs to strategic impact. Supporting details sit below.
      </div>
      <Card className="rounded-3xl border border-border/60 bg-card/78 shadow-[0_24px_55px_-32px_rgba(15,23,42,0.35)] backdrop-blur">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                One-view executive summary
              </p>
              <CardTitle className="mt-2 flex items-center gap-2 text-xl font-semibold">
                <FileText className="h-5 w-5 text-primary" />
                Strategic Impact Verdict (Bottom Line Up Front)
              </CardTitle>
            </div>
            <Button
              variant="default"
              size="sm"
              className="rounded-full bg-emerald-600 px-4 text-xs text-white hover:bg-emerald-700"
              onClick={() => onNavigate('workstreams')}
            >
              Open Strategic Impact
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-[28px] border border-emerald-500/35 bg-background/90 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Strategic Impact Verdict
            </p>
            <p className="mt-3 text-base leading-7 text-foreground">
              {strategicVerdict || 'No strategic verdict provided in the current payload.'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
            <div className="rounded-2xl border border-amber-500/30 bg-background/90 p-4 xl:col-span-5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Competitive forces
                </p>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {strategicAtGlance.forces.length > 0 ? (
                  strategicAtGlance.forces.map((force) => (
                    <div
                      key={`${force.name}-${force.intensity}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background px-3 py-2 text-xs"
                    >
                      <span className="font-medium text-foreground">{compactForceName(force.name)}</span>
                      <Badge variant="outline" className="border-amber-500/30 text-[10px] text-amber-700">
                        {force.intensity}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No five-forces scoring available yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-primary/30 bg-background/90 p-4 xl:col-span-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Assumption pulse
                </p>
              </div>
              <p className="mt-3 text-sm font-medium leading-6 text-foreground">
                {strategicAtGlance.assumptionPulse}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-emerald-500/30 bg-background px-3 py-2 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Validated</p>
                  <p className="mt-1 text-base font-semibold text-emerald-600">{assumptionStatusCounts.validated}</p>
                </div>
                <div className="rounded-xl border border-slate-400/40 bg-background px-3 py-2 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Stable</p>
                  <p className="mt-1 text-base font-semibold text-slate-700">{assumptionStatusCounts.stable}</p>
                </div>
                <div className="rounded-xl border border-destructive/25 bg-background px-3 py-2 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Challenged</p>
                  <p className="mt-1 text-base font-semibold text-destructive">{assumptionStatusCounts.challenged}</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Validating signals</span>
                    <span className="font-semibold text-emerald-600">{signalBalance.positive}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-border/60">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${signalBalance.positiveShare}%` }} />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Challenging signals</span>
                    <span className="font-semibold text-destructive">{signalBalance.negative}</span>
                  </div>
                  <div className="relative h-2.5 overflow-hidden rounded-full bg-border/60">
                    <div className="h-full rounded-full bg-destructive" style={{ width: `${signalBalance.negativeShare}%` }} />
                    <div
                      className="absolute left-0 top-0 h-full rounded-full border-r border-background bg-amber-500"
                      style={{ width: `${Math.min(signalBalance.negativeShare, Math.round((signalBalance.negativeShare * signalBalance.warningWithinNegativeShare) / 100))}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                    Amber inside red marks early warnings within the challenging signal base.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full px-4"
                  onClick={() => onNavigate('assumptions')}
                >
                  Open Assumptions Detail
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full px-4"
                  onClick={() => onNavigate('outliers')}
                >
                  Open Signal Outliers
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-background/90 p-4 xl:col-span-3">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Recommended motion
                </p>
              </div>
              <p className="mt-3 text-sm font-medium leading-6 text-foreground">Work in progress</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                This card will summarize the recommended executive motion once the strategic impact layer is finalized.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {spiderAssumptions.length > 0 ? (
        <AssumptionSpiderCharts
          assumptions={spiderAssumptions}
          title="Assumption score view"
          subtitle="Assumption scores are the default view here. Labels use short descriptive names so the executive view is readable without relying on internal IDs alone."
          defaultMode="assumptions"
          onAssumptionClick={(assumption) => onOpenAssumptionDetail(assumption.id)}
        />
      ) : (
        <Card className="rounded-3xl border border-border/60 bg-card/70 shadow-sm">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Assumption scoring is not available yet for this payload.
          </CardContent>
        </Card>
      )}
      <div className="mt-5 flex flex-col items-center gap-2 text-center">
        <div className="text-lg font-semibold text-foreground">Supporting highlights</div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full px-4"
          onClick={() => setShowHighlights(prev => !prev)}
        >
          {showHighlights ? 'Hide detailed highlights' : 'See detailed highlights'}
        </Button>
      </div>

      {/* Main Grid */}
      {showHighlights && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        {/* Top Threats */}
        <Card className="relative overflow-hidden bg-card/60 border border-destructive/30 rounded-3xl shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)] backdrop-blur before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-destructive/80">
          <CardHeader className="pb-3 pt-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Top Threats
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs"
                onClick={() => onNavigate('outliers')}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {topThreats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No threats identified</p>
            ) : (
              topThreats.map(signal => {
                const displaySignal = { ...signal, source: signal.signal_content || signal.source };
                return (
                  <SignalCard
                    key={signal.signal_id}
                    signal={displaySignal}
                    compact
                    showCategory={false}
                    onClick={() => setSelectedSignal(signal)}
                  />
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Top Opportunities */}
        <Card className="relative overflow-hidden bg-card/60 border border-emerald-500/30 rounded-3xl shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)] backdrop-blur before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-emerald-500/80">
          <CardHeader className="pb-3 pt-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2 text-emerald-500">
                <TrendingUp className="h-4 w-4" />
                Top Opportunities
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs"
                onClick={() => onNavigate('outliers')}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {topOpportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No opportunities identified</p>
            ) : (
              topOpportunities.map(signal => {
                const displaySignal = { ...signal, source: signal.signal_content || signal.source };
                return (
                  <SignalCard
                    key={signal.signal_id}
                    signal={displaySignal}
                    compact
                    showCategory={false}
                    onClick={() => setSelectedSignal(signal)}
                  />
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Early Warnings */}
        <Card className="relative overflow-hidden bg-card/60 border border-amber-500/30 rounded-3xl shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)] backdrop-blur before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-amber-500/80">
          <CardHeader className="pb-3 pt-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2 text-amber-500">
                <AlertCircle className="h-4 w-4" />
                Early Warnings
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs"
                onClick={() => onNavigate('outliers')}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {topWarnings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No warnings identified</p>
            ) : (
              topWarnings.map(signal => {
                const displaySignal = { ...signal, source: signal.signal_content || signal.source };
                return (
                  <SignalCard
                    key={signal.signal_id}
                    signal={displaySignal}
                    compact
                    showCategory={false}
                    onClick={() => setSelectedSignal(signal)}
                  />
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
      )}

      {showHighlights && (
      <>
      {/* Second Row */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-card/60 border border-border/50 rounded-3xl shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2 text-foreground">
                <Radio className="h-4 w-4 text-primary" />
                Synthesized Forecast
              </CardTitle>
              <Badge variant="outline" className="rounded-full text-[11px]">
                Work in progress
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Goal: track assumptions over time and visualize which ones are improving or deteriorating.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/50 bg-background/70 p-4 text-sm text-muted-foreground">
              The current model does not yet provide a true over-time assumption trend, so this section stays intentionally marked as work in progress rather than implying false precision.
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-destructive/20 bg-background/70 p-4">
                <h4 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  Deteriorating direction
                </h4>
                <div className="space-y-2">
                  {synthesizedInsights.deteriorating.slice(0, 3).map((signal) => (
                    <button
                      key={signal.signal_id}
                      type="button"
                      className="w-full rounded-xl border border-destructive/15 bg-background/90 p-3 text-left transition hover:border-destructive/35"
                      onClick={() => setSelectedSignal(signal)}
                    >
                      <p className="text-xs text-foreground line-clamp-2">{signal.signal_content}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Signal snapshot only, not a longitudinal assumption trend yet.
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-background/70 p-4">
                <h4 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                  <TrendingUp className="h-3 w-3" />
                  Improving direction
                </h4>
                <div className="space-y-2">
                  {synthesizedInsights.improving.slice(0, 3).map((signal) => (
                    <button
                      key={signal.signal_id}
                      type="button"
                      className="w-full rounded-xl border border-emerald-500/15 bg-background/90 p-3 text-left transition hover:border-emerald-500/35"
                      onClick={() => setSelectedSignal(signal)}
                    >
                      <p className="text-xs text-foreground line-clamp-2">{signal.signal_content}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Signal snapshot only, not a longitudinal assumption trend yet.
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-start">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs"
                onClick={() => onNavigate('synthesized')}
              >
                Open Synthesized View
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workstreams Preview */}
      {workstreams.length > 0 && (
        <Card className="bg-card/60 border border-border/50 rounded-3xl shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2 text-foreground">
                <Briefcase className="h-4 w-4 text-primary" />
                Recommended Workstreams
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs"
                onClick={() => onNavigate('workstreams')}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workstreams.slice(0, 4).map(ws => (
                <div 
                  key={ws.id}
                  className="p-4 rounded-2xl bg-background/60 hover:bg-background/80 hover:shadow-[0_12px_30px_-20px_rgba(15,23,42,0.35)] transition-all cursor-pointer border border-border/50"
                  onClick={() => onNavigate('workstreams')}
                >
                  <h4 className="font-semibold text-sm text-foreground line-clamp-1">
                    {ws.detailed_analysis?.customized_title || ws.recommendation?.project_title || ws.id}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {ws.detailed_analysis?.executive_summary?.issue || ws.detailed_analysis?.rationale}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {ws.recommendation?.product_name || ws.detailed_analysis?.workstream_name}
                    </Badge>
                    {ws.detailed_analysis?.cluster_id && (
                      <Badge variant="secondary" className="text-xs font-mono">
                        {ws.detailed_analysis.cluster_id}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </>
      )}
    </div>
  );
}
