import { useMemo, useState } from 'react';
import { useForesight } from '@/contexts/ForesightContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SignalDetailDialog } from '@/components/SignalDetailDialog';
import { SignalCard } from '@/components/SignalCard';
import { Signal, Assumption } from '@/types/foresight';
import { 
  getSignalScore, 
  sortByScore, 
  getTopSignals,
  formatBuildingBlock,
  getAssumptionSensitivity
} from '@/lib/signal-utils';
import {
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
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExecutiveOverviewProps {
  onNavigate: (tab: string) => void;
}

interface PipelineStageProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  onClick: () => void;
  isActive?: boolean;
  color?: string;
}

function PipelineStage({ icon, label, onClick, isActive, color }: PipelineStageProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex h-[120px] w-[110px] flex-col items-center justify-center gap-2 rounded-3xl border border-border/50 bg-background/60 px-3 py-3 text-center shadow-[0_10px_30px_-22px_rgba(15,23,42,0.35)] backdrop-blur transition-all hover:-translate-y-1 hover:border-primary/60 hover:bg-primary/5",
        isActive 
          ? "border-primary/60 bg-primary/10 shadow-[0_20px_40px_-25px_rgba(59,130,246,0.35)]" 
          : "hover:border-primary/40"
      )}
    >
      <div className={cn(
        "flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-border/60 shadow-sm transition group-hover:ring-primary/40",
        color || "bg-primary/10 text-primary"
      )}>
        {icon}
      </div>
      <span className="min-h-[28px] text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-snug whitespace-normal max-w-[100px] flex items-center text-center">
        {label}
      </span>
    </button>
  );
}

function PipelineConnector({ label }: { label: string }) {
  return (
    <div className="flex w-[90px] flex-col items-center gap-1 text-center shrink-0">
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
      <span className="min-h-[28px] text-[10px] font-medium text-muted-foreground leading-snug max-w-[90px] text-center">
        {label}
      </span>
    </div>
  );
}

export function ExecutiveOverview({ onNavigate }: ExecutiveOverviewProps) {
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
  const [showHighlights, setShowHighlights] = useState(false);

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
  
  // Most sensitive assumptions (by signal count and average score)
  const sensitiveAssumptions = useMemo(() => {
    if (!coreAssumptions.length) return [];
    
    return coreAssumptions
      .map(a => ({
        assumption: a,
        ...getAssumptionSensitivity(allSignals, a.id)
      }))
      .filter(a => a.total > 0)
      .sort((a, b) => {
        // Sort by total signals * average score
        const scoreA = a.total * a.avgScore;
        const scoreB = b.total * b.avgScore;
        return scoreB - scoreA;
      })
      .slice(0, 5);
  }, [coreAssumptions, allSignals]);

  // Synthesized insights
  const synthesizedInsights = useMemo(() => {
    const improving = allSignals.filter(s => s.impact_direction === 'Positive');
    const deteriorating = allSignals.filter(s => s.impact_direction === 'Negative');
    
    return {
      improving: sortByScore(improving).slice(0, 3),
      deteriorating: sortByScore(deteriorating).slice(0, 3),
    };
  }, [allSignals]);

  const scoredAssumptionsCount =
    data?.strategy_context?.assumption_health?.length ||
    data?.assumption_health?.length ||
    coreAssumptions.length;

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
              icon={<Building2 className="h-5 w-5" />}
              label="Input company name"
              count={1}
              onClick={() => onNavigate('overview')}
              color="bg-slate-500/10 text-slate-500"
            />
            <PipelineConnector label="Research + Strategic analysis" />
            <PipelineStage
              icon={<Layers className="h-5 w-5" />}
              label="Strategic Decomposition"
              count={buildingBlocks ? 4 : 0}
              onClick={() => onNavigate('strategy')}
              color="bg-blue-500/10 text-blue-500"
            />
            <PipelineConnector label="Assumption extraction" />
            <PipelineStage
              icon={<Radio className="h-5 w-5" />}
              label="Core Assumptions"
              count={coreAssumptions.length}
              onClick={() => onNavigate('core-assumptions')}
              color="bg-cyan-500/10 text-cyan-500"
            />
            <PipelineConnector label="Signal Scanning + Scoring" />
            <PipelineStage
              icon={<Target className="h-5 w-5" />}
              label="Signals"
              count={allSignals.length}
              onClick={() => onNavigate('signals')}
              color="bg-purple-500/10 text-purple-500"
            />
            <PipelineConnector label="Signal Aggregation + Analysis" />
            <PipelineStage
              icon={<AlertTriangle className="h-5 w-5" />}
              label="Core Assumptions Scored"
              count={scoredAssumptionsCount}
              onClick={() => onNavigate('assumptions')}
              color="bg-orange-500/10 text-orange-500"
            />
            <PipelineConnector label="Impact Formulation" />
            <PipelineStage
              icon={<Briefcase className="h-5 w-5" />}
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
      <div className="text-center text-lg font-semibold text-foreground mt-5">
        Model highlights at a glance
      </div>
      <div className="flex justify-center mt-2">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full px-4"
          onClick={() => setShowHighlights(prev => !prev)}
        >
          {showHighlights ? 'Hide highlights' : 'See highlights'}
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Sensitive Assumptions */}
        <Card className="bg-card/60 border border-border/50 rounded-3xl shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2 text-foreground">
                <Target className="h-4 w-4 text-primary" />
                Most Sensitive Assumptions
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs"
                onClick={() => onNavigate('assumptions')}
              >
                View All
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Ranked by signal volume and average impact score</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sensitiveAssumptions.map(({ assumption, total, threats, opportunities, avgScore }) => (
                <div 
                  key={assumption.id}
                  className="flex items-start gap-3 p-3 rounded-2xl bg-background/60 border border-border/50 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_12px_30px_-20px_rgba(15,23,42,0.35)] cursor-pointer"
                  onClick={() => onNavigate('assumptions')}
                >
                  <Badge variant="outline" className="font-mono font-bold shrink-0 rounded-full px-3">
                    {assumption.id}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-2">
                      {assumption.statement}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] uppercase tracking-wide">
                      <span className="text-muted-foreground">{total} signals</span>
                      <span className="text-destructive">{threats} threats</span>
                      <span className="text-emerald-500">{opportunities} opps</span>
                      <span className="text-amber-500">Avg {avgScore.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Synthesized Forecast Summary */}
        <Card className="bg-card/60 border border-border/50 rounded-3xl shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2 text-foreground">
              <Radio className="h-4 w-4 text-primary" />
              Synthesized Forecast
            </CardTitle>
            <p className="text-xs text-muted-foreground">What's improving vs deteriorating</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {/* Deteriorating */}
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-destructive mb-3 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Deteriorating
                </h4>
                <div className="space-y-2">
                  {synthesizedInsights.deteriorating.map(signal => (
                    <div 
                      key={signal.signal_id}
                      className="p-3 rounded-2xl bg-background/70 border border-destructive/20 cursor-pointer hover:border-destructive/40 hover:bg-destructive/5 transition-colors"
                      onClick={() => setSelectedSignal(signal)}
                    >
                      <p className="text-xs text-foreground line-clamp-2">
                        {signal.signal_content}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {signal.related_assumption_id || signal.assumption_id}
                        </Badge>
                        <span className="text-[10px] text-destructive font-semibold">
                          {getSignalScore(signal).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Improving */}
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-emerald-500 mb-3 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Improving
                </h4>
                <div className="space-y-2">
                  {synthesizedInsights.improving.map(signal => (
                    <div 
                      key={signal.signal_id}
                      className="p-3 rounded-2xl bg-background/70 border border-emerald-500/20 cursor-pointer hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-colors"
                      onClick={() => setSelectedSignal(signal)}
                    >
                      <p className="text-xs text-foreground line-clamp-2">
                        {signal.signal_content}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {signal.related_assumption_id || signal.assumption_id}
                        </Badge>
                        <span className="text-[10px] text-emerald-500 font-semibold">
                          {getSignalScore(signal).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
