import { useState, useMemo } from 'react';
import { useForesight } from '@/contexts/ForesightContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle, TrendingUp, Shield, Layers, X, ArrowLeft, ExternalLink, Clock,
  Link as LinkIcon, Target, DollarSign, Activity, GitBranch, Zap, Building2,
  CheckCircle2, AlertCircle, ChevronRight, BarChart3, Compass, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Signal, Assumption, StrategicObjective, FinancialTarget, KPI, ImpactPathway, AssumptionCluster, AssumptionHealth } from '@/types/foresight';
import { cn } from '@/lib/utils';
import { getHealthColor, getStatusBadgeVariant } from '@/lib/foresight-utils';
import { getSignalScore } from '@/lib/signal-utils';
import { SignalDetailDialog } from '@/components/SignalDetailDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const buildingBlockIcons: Record<string, React.ReactNode> = {
  direction_and_positioning: <Compass className="h-4 w-4" />,
  value_creation: <Layers className="h-4 w-4" />,
  value_defence: <Shield className="h-4 w-4" />,
  key_levers: <Zap className="h-4 w-4" />,
};

const buildingBlockLabels: Record<string, string> = {
  direction_and_positioning: 'Direction & Positioning',
  value_creation: 'Value Creation',
  value_defence: 'Strategic Defence',
  key_levers: 'Key Levers',
};

const formatBuildingBlock = (block: string) => {
  return buildingBlockLabels[block] || block.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

interface AssumptionWithSignals extends Assumption {
  challengingSignals: Signal[];
  validatingSignals: Signal[];
  health?: AssumptionHealth;
}

type SummaryBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

const splitSummaryBlocks = (summary: string[]): SummaryBlock[] => {
  const blocks: SummaryBlock[] = [];
  const bulletPattern = /^([-*]|\u2022|\u2013|\u2014)\s+(.*)$/;

  summary.forEach((entry) => {
    const lines = entry
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    let paragraph: string[] = [];
    let list: string[] = [];

    const flushParagraph = () => {
      if (paragraph.length > 0) {
        blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
        paragraph = [];
      }
    };

    const flushList = () => {
      if (list.length > 0) {
        blocks.push({ type: 'list', items: list });
        list = [];
      }
    };

    lines.forEach((line) => {
      const match = line.match(bulletPattern);
      if (match) {
        flushParagraph();
        list.push(match[2]);
      } else {
        flushList();
        paragraph.push(line);
      }
    });

    flushParagraph();
    flushList();
  });

  return blocks;
};

// Strategy Snapshot Card
function StrategySnapshotCard() {
  const { data } = useForesight();
  const snapshot = data?.strategy_context?.strategy_snapshot;
  const company = data?.strategy_context?.company;

  if (!snapshot) return null;

  return (
    <Card className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-background/80 via-card/80 to-primary/10 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)] backdrop-blur">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-12 top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-border/60 bg-background/70 p-2 shadow-sm">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Strategy Snapshot</p>
              <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
                Strategic Positioning
              </CardTitle>
            </div>
          </div>
          {snapshot.confidence && (
            <Badge variant="secondary" className="text-[11px] uppercase tracking-wide">
              {snapshot.confidence} confidence
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-primary">{snapshot.one_line_positioning}</p>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{snapshot.strategy_summary}</p>
        <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-wide text-muted-foreground">
          {company?.industry && (
            <span className="rounded-full border border-border/50 bg-background/70 px-3 py-1">
              {company.industry}
            </span>
          )}
          {company?.as_of_date && (
            <span className="rounded-full border border-border/50 bg-background/70 px-3 py-1">
              As of {company.as_of_date}
            </span>
          )}
          {snapshot.time_horizon && (
            <span className="flex items-center gap-1 rounded-full border border-border/50 bg-background/70 px-3 py-1">
              <Clock className="h-3 w-3" />
              {snapshot.time_horizon}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Confidence indicator component
function ConfidenceIndicator({ level }: { level?: string }) {
  if (!level) return null;

  const getColor = () => {
    const l = level.toLowerCase();
    if (l.includes('high') || l.includes('strong')) return 'bg-primary';
    if (l.includes('medium') || l.includes('moderate')) return 'bg-primary/60';
    return 'bg-muted-foreground/40';
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("h-2 w-2 rounded-full", getColor())} />
      <span className="text-xs text-muted-foreground capitalize">{level}</span>
    </div>
  );
}

// Strategic Objectives Section - Redesigned
// Strategic Objectives Section - Redesigned
function StrategicObjectivesSection() {
  const { data, getAssumptionById } = useForesight();
  const objectives = data?.strategy_context?.strategic_objectives;
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);

  if (!objectives) return null;

  const primaryGoals = objectives.primary_goals || [];
  const financialTargets = objectives.financial_targets || [];

  return (
    <div className="space-y-8">
      {/* Financial Targets - Hero Cards */}
      {financialTargets.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Financial Targets
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {financialTargets.map((target, idx) => (
              <Card key={idx} className="relative overflow-hidden border-none shadow-md bg-gradient-to-br from-card to-secondary/10 hover:shadow-lg transition-all">
                <div className="absolute -right-4 -top-4 opacity-[0.03]">
                  <DollarSign className="h-32 w-32" />
                </div>
                <CardContent className="p-6 relative z-10">
                  <div className="flex flex-col h-full justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{target.metric}</p>
                      <h4 className="text-2xl font-semibold text-foreground mt-2">{target.target}</h4>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs bg-background/50 backdrop-blur-sm border-primary/20 text-primary">
                          {target.timeframe}
                        </Badge>
                        <ConfidenceIndicator level={target.evidence_strength} />
                      </div>
                    </div>

                    {target.linked_assumptions?.length > 0 && (
                      <div className="pt-4 border-t border-border/10">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <LinkIcon className="h-3 w-3" />
                          {target.linked_assumptions.length} linked assumptions
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Primary Goals */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Strategic Goals
          </h3>
          <Badge variant="secondary" className="rounded-full px-3">
            {primaryGoals.length} Objectives
          </Badge>
        </div>

        <div className="grid gap-3">
          {primaryGoals.map((goal, idx) => {
            const isExpanded = expandedGoal === goal.objective_id;
            const linkedAssumptions = goal.linked_assumptions || [];

            return (
              <div
                key={goal.objective_id || idx}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border bg-card/70 transition-all shadow-sm backdrop-blur hover:shadow-md",
                  isExpanded ? "border-primary/50 shadow-md bg-primary/5" : "border-border/60 hover:border-primary/40"
                )}
              >
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => setExpandedGoal(isExpanded ? null : goal.objective_id)}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "mt-1 h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-colors",
                      isExpanded ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                    )}>
                      <CheckCircle2 className="h-4 w-4" />
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <h4 className="text-base font-medium leading-normal text-foreground group-hover:text-primary transition-colors">
                          {goal.objective}
                        </h4>
                        <ChevronRight className={cn("h-5 w-5 text-muted-foreground transition-transform shrink-0", isExpanded && "rotate-90")} />
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="font-medium text-xs">{goal.target_date}</span>
                        </div>
                        <div className="h-4 w-px bg-border" />
                        <ConfidenceIndicator level={goal.confidence} />
                        <ConfidenceIndicator level={goal.evidence_strength} />

                        {linkedAssumptions.length > 0 && (
                          <Badge variant="outline" className="ml-auto text-xs border-dashed">
                            {linkedAssumptions.length} assumptions
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && linkedAssumptions.length > 0 && (
                  <div className="px-5 pb-5 pt-0 ml-12 animation-fade-in">
                    <div className="pt-4 border-t border-border/50 space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Supported By Assumptions
                      </p>
                      <div className="grid gap-2">
                        {linkedAssumptions.map((aId, aIdx) => {
                          const assumption = getAssumptionById(aId);
                          return (
                            <div key={aIdx} className="flex items-center gap-3 text-sm p-2 rounded-lg bg-background/50 border border-border/50">
                              <span className="font-mono text-xs font-bold text-primary shrink-0">{aId}</span>
                              <span className="text-muted-foreground line-clamp-1">{assumption?.statement}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// KPIs Section - Redesigned
function KPIsSection() {
  const { data, getAssumptionById } = useForesight();
  const kpis = data?.strategy_context?.key_performance_indicators?.critical_metrics || [];
  const [selectedKpi, setSelectedKpi] = useState<KPI | null>(null);

  if (kpis.length === 0) return null;

  const criticalKpis = kpis.filter(k => k.strategic_importance === 'Critical');
  const otherKpis = kpis.filter(k => k.strategic_importance !== 'Critical');

  return (
    <div className="space-y-8">
      {/* KPI Detail Dialog */}
      <Dialog open={!!selectedKpi} onOpenChange={() => setSelectedKpi(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">{selectedKpi?.name}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">{selectedKpi?.strategic_importance} KPI</p>
              </div>
            </div>
          </DialogHeader>

          {selectedKpi && (
            <div className="space-y-6">
              <div className="p-4 bg-secondary/20 rounded-xl border border-border/50">
                <p className="text-sm text-foreground leading-relaxed">{selectedKpi.description}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {selectedKpi.strategic_importance} KPI
                </Badge>
                {selectedKpi.evidence_strength && (
                  <Badge variant="outline" className="text-xs">
                    Evidence: {selectedKpi.evidence_strength}
                  </Badge>
                )}
                {selectedKpi.numeric_anchor && (
                  <Badge variant="outline" className="text-xs">
                    Anchor: {selectedKpi.numeric_anchor}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-primary/5 border border-primary/20 rounded-2xl shadow-sm">
                  <CardContent className="p-4">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Value</span>
                    <div className="text-3xl font-bold text-primary mt-1">{selectedKpi.current_value || 'N/A'}</div>
                  </CardContent>
                </Card>
                <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm backdrop-blur">
                  <CardContent className="p-4">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Evidence Strength</span>
                    <div className="mt-2">
                      <ConfidenceIndicator level={selectedKpi.evidence_strength} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {selectedKpi.linked_assumptions?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Linked Assumptions</h4>
                  <ScrollArea className="h-[200px] pr-4">
                    <div className="space-y-2">
                      {selectedKpi.linked_assumptions.map((aId, idx) => {
                        const assumption = getAssumptionById(aId);
                        return (
                          <Card key={idx} className="bg-muted/30 border border-border/50 rounded-xl">
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-[10px] h-5">{aId}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{assumption?.statement}</p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Critical Metrics */}
      {criticalKpis.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Critical Metrics
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {criticalKpis.map((kpi, idx) => (
              <Card
                key={kpi.kpi_id || idx}
                className="group relative overflow-hidden cursor-pointer transition-all border border-border/60 bg-card/70 rounded-2xl shadow-sm hover:shadow-md border-l-4 border-l-destructive backdrop-blur"
                onClick={() => setSelectedKpi(kpi)}
              >
                <div className="absolute right-0 top-0 h-24 w-24 bg-destructive/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />

                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4 relative z-10">
                    <h4 className="font-semibold text-lg text-foreground line-clamp-2">{kpi.name}</h4>
                    <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Current Status</span>
                    <div className="text-2xl font-bold text-foreground">
                      {kpi.current_value || '—'}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{kpi.evidence_strength} Evidence</span>
                    <Badge variant="secondary" className="text-[10px] h-5 bg-destructive/10 text-destructive-foreground hover:bg-destructive/20 border-0">
                      Critical
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Supporting Metrics */}
      {otherKpis.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Supporting Metrics
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {otherKpis.map((kpi, idx) => (
              <Card
                key={kpi.kpi_id || idx}
                className="cursor-pointer transition-colors bg-card/70 border border-border/60 rounded-2xl shadow-sm hover:border-primary/40 hover:shadow-md backdrop-blur"
                onClick={() => setSelectedKpi(kpi)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-semibold text-foreground line-clamp-2 min-h-[2.5rem]">{kpi.name}</h4>
                    {kpi.current_value && (
                      <span className="px-2 py-1 bg-primary/10 rounded text-xs font-bold text-primary shrink-0">
                        {kpi.current_value}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <Badge variant="outline" className="text-[10px] h-5 opacity-70">
                      {kpi.strategic_importance}
                    </Badge>
                    {kpi.evidence_strength && (
                      <Badge variant="secondary" className="text-[10px] h-5">
                        Evidence: {kpi.evidence_strength}
                      </Badge>
                    )}
                    {kpi.linked_assumptions?.length ? (
                      <Badge variant="outline" className="text-[10px] h-5">
                        {kpi.linked_assumptions.length} assumptions
                      </Badge>
                    ) : null}
                  </div>
                  {kpi.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {kpi.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Value Chain Section
function ValueChainSection() {
  const { data } = useForesight();
  const valueChain = data?.strategy_context?.value_chain;

  if (!valueChain) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-border/60 bg-background/70 p-2 shadow-sm">
          <GitBranch className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Value Chain</p>
          <h3 className="text-lg font-semibold text-foreground">Activities and Dependencies</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
        <Card className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/60 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-primary/70">
          <CardHeader className="pb-3 pt-5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-foreground">Primary Activities</CardTitle>
          </CardHeader>
          <CardContent>
            {valueChain.primary_activities?.length ? (
              <ul className="space-y-3 text-sm">
                {valueChain.primary_activities.map((activity, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 rounded-2xl border border-border/50 bg-background/70 px-4 py-3"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/70 shrink-0" />
                    <span className="text-foreground">{activity}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No primary activities listed.</p>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/60 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-muted-foreground/60">
          <CardHeader className="pb-3 pt-5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-foreground">Support Activities</CardTitle>
          </CardHeader>
          <CardContent>
            {valueChain.support_activities?.length ? (
              <ul className="space-y-3 text-sm">
                {valueChain.support_activities.map((activity, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 rounded-2xl border border-border/50 bg-background/70 px-4 py-3"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/60 shrink-0" />
                    <span className="text-foreground">{activity}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No support activities listed.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {valueChain.critical_dependencies && valueChain.critical_dependencies.length > 0 && (
        <Card className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/60 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-amber-500/70">
          <CardHeader className="pb-3 pt-5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2 text-foreground">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Critical Dependencies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {valueChain.critical_dependencies.slice(0, 4).map((dep, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/50 bg-background/70 px-4 py-3 text-xs">
                  <span className="font-medium text-foreground">{dep.activity}</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{dep.depends_on}</span>
                  <Badge variant="outline" className="ml-auto text-xs">{dep.linked_assumption}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Impact Pathways Section
function ImpactPathwaysSection() {
  const { data, getAssumptionById } = useForesight();
  const pathways = data?.strategy_context?.impact_pathways || [];

  if (pathways.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-md font-semibold flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        Impact Pathways ({pathways.length})
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {pathways.map((pathway) => {
          const assumption = getAssumptionById(pathway.trigger_assumption);
          return (
            <Card key={pathway.pathway_id} className="bg-card border-border/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className="text-xs font-mono">{pathway.pathway_id}</Badge>
                  <Badge
                    variant={pathway.severity >= 8 ? 'destructive' : pathway.severity >= 5 ? 'secondary' : 'outline'}
                    className="text-xs"
                  >
                    Severity: {pathway.severity}
                  </Badge>
                </div>

                <div>
                  <span className="text-xs font-medium text-muted-foreground">Trigger:</span>
                  <p className="text-sm text-foreground mt-1">{pathway.trigger_condition}</p>
                </div>

                <div>
                  <span className="text-xs font-medium text-muted-foreground">Immediate Effects:</span>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                    {pathway.immediate_effects.map((effect, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-destructive shrink-0">-</span>
                        <span>{effect}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center gap-2 text-xs pt-2 border-t border-border/50">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Time to impact: {pathway.time_to_impact}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// Assumption Clusters Section
function AssumptionClustersSection() {
  const { data } = useForesight();
  const clusters = data?.strategy_context?.assumption_dependencies?.critical_clusters || [];

  if (clusters.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-md font-semibold flex items-center gap-2">
        <LinkIcon className="h-4 w-4 text-primary" />
        Assumption Dependencies ({clusters.length} clusters)
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {clusters.map((cluster, idx) => (
          <Card key={idx} className="bg-card/70 border border-border/60 rounded-2xl shadow-sm backdrop-blur">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <span className="text-sm font-medium text-foreground">{cluster.cluster_name}</span>
                <Badge
                  variant={cluster.cascade_risk === 'High' ? 'destructive' : 'secondary'}
                  className="text-xs px-2.5 py-1 whitespace-nowrap"
                >
                  {cluster.cascade_risk} risk
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{cluster.description}</p>
              <div className="flex flex-wrap gap-1">
                {cluster.assumptions.map((assumption, aIdx) => (
                  <Badge key={aIdx} variant="outline" className="text-xs font-mono">
                    {assumption}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Building Blocks Section
function BuildingBlocksSection() {
  const { buildingBlocks } = useForesight();
  const [selectedBlock, setSelectedBlock] = useState<{ title: string; summary: string[]; confidence?: string; details?: any } | null>(null);
  const summaryBlocks = useMemo(
    () => (selectedBlock ? splitSummaryBlocks(selectedBlock.summary) : []),
    [selectedBlock]
  );

  if (!buildingBlocks) return null;

  return (
    <>
      <Dialog open={!!selectedBlock} onOpenChange={() => setSelectedBlock(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedBlock?.title}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 text-sm">
              {summaryBlocks.map((block, idx) => (
                block.type === 'list' ? (
                  <ul key={idx} className="list-disc pl-5 space-y-1 text-muted-foreground">
                    {block.items.map((item, itemIdx) => (
                      <li key={itemIdx} className="leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p key={idx} className="text-muted-foreground leading-relaxed">{block.text}</p>
                )
              ))}
              {selectedBlock?.confidence && (
                <Badge variant="secondary" className="text-xs">Confidence: {selectedBlock.confidence}</Badge>
              )}

              {selectedBlock?.details?.main_revenue_streams && (
                <div className="pt-3 border-t border-border">
                  <span className="text-xs font-medium text-foreground">Revenue Streams:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedBlock.details.main_revenue_streams.map((stream: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">{stream}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedBlock?.details?.moats && (
                <div className="pt-3 border-t border-border">
                  <span className="text-xs font-medium text-foreground">Moats:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedBlock.details.moats.map((moat: string, idx: number) => (
                      <Badge key={idx} className="text-xs bg-primary/10 text-primary border-0">{moat}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedBlock?.details?.levers && (
                <div className="pt-3 border-t border-border">
                  <span className="text-xs font-medium text-foreground">Levers:</span>
                  <div className="space-y-2 mt-1">
                    {selectedBlock.details.levers.map((lever: { name: string; description: string }, idx: number) => (
                      <div key={idx} className="p-2 bg-muted/30 rounded-lg">
                        <span className="text-xs font-medium text-foreground">{lever.name}</span>
                        <p className="text-xs text-muted-foreground">{lever.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-border/60 bg-background/70 p-2 shadow-sm">
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Building Blocks</p>
            <h3 className="text-lg font-semibold text-foreground">Strategy Foundations</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {Object.entries(buildingBlocks).slice(0, 4).map(([key, value]) => (
            <Card
              key={key}
              className="group relative overflow-hidden rounded-3xl border border-border/50 bg-background/70 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.35)] transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_24px_50px_-35px_rgba(15,23,42,0.45)] cursor-pointer"
              onClick={() => {
                const summaryArray = Array.isArray((value as any).summary) ? (value as any).summary : [(value as any).summary];
                setSelectedBlock({
                  title: formatBuildingBlock(key),
                  summary: summaryArray,
                  confidence: (value as any).confidence,
                  details: value,
                });
              }}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-border/60 transition group-hover:ring-primary/40">
                      {buildingBlockIcons[key]}
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Block</p>
                      <h4 className="text-sm font-semibold text-foreground">
                        {formatBuildingBlock(key)}
                      </h4>
                    </div>
                  </div>
                  {(value as any).confidence && (
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                      {(value as any).confidence}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {Array.isArray((value as any).summary) ? (value as any).summary[0] : (value as any).summary}
                </p>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Click for details
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}

// Signal Card for Assumption Detail
function SignalCard({ signal, type, onClick }: { signal: Signal; type: 'challenging' | 'validating'; onClick: () => void }) {
  const isChallenge = type === 'challenging';
  return (
    <Card
      className={cn(
        "mb-3 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md",
        isChallenge
          ? "border-2 border-destructive/40 hover:border-destructive/60"
          : "border-2 border-primary/40 hover:border-primary/60"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <Badge variant="outline" className={cn(
            "text-xs",
            isChallenge ? "border-destructive/50 text-destructive" : "border-primary/50 text-primary"
          )}>
            {signal.archetype}
          </Badge>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Score: {signal.outlier_flags?.combined_score?.toFixed(1) || signal.impact_score}
            </Badge>
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {signal.time_horizon}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-foreground leading-relaxed mb-3">{signal.signal_content || signal.strategic_analysis}</p>
        <div className="flex items-center gap-1 mt-3 text-xs text-primary">
          <ExternalLink className="h-3 w-3" />
          <span>View details</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Assumption Detail Modal
function AssumptionDetail({ assumption, onClose, onSignalClick }: {
  assumption: AssumptionWithSignals;
  onClose: () => void;
  onSignalClick: (signal: Signal) => void
}) {
  const [scoreSort, setScoreSort] = useState<'desc' | 'asc'>('desc');
  const health = assumption.health;
  const { borderColor, statusColor } = getHealthColor(health);
  const total = assumption.validatingSignals.length + assumption.challengingSignals.length;
  const validatingPercent = total > 0 ? Math.round((assumption.validatingSignals.length / total) * 100) : 50;
  const challengingPercent = 100 - validatingPercent;

  const sortedChallenging = useMemo(() => {
    return [...assumption.challengingSignals].sort((a, b) => {
      const diff = getSignalScore(b) - getSignalScore(a);
      return scoreSort === 'desc' ? diff : -diff;
    });
  }, [assumption.challengingSignals, scoreSort]);

  const sortedValidating = useMemo(() => {
    return [...assumption.validatingSignals].sort((a, b) => {
      const diff = getSignalScore(b) - getSignalScore(a);
      return scoreSort === 'desc' ? diff : -diff;
    });
  }, [assumption.validatingSignals, scoreSort]);

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="border-b border-border bg-card shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <Button variant="ghost" size="icon" onClick={onClose} className="mt-1">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span
                    className="font-mono font-bold text-xl px-3 py-1 rounded-md"
                    style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
                  >
                    {assumption.id}
                  </span>
                  <Badge variant="secondary" className="text-sm">{assumption.category}</Badge>
                  {health && (
                    <Badge variant={getStatusBadgeVariant(health.verification_status)} className="text-sm">
                      {health.verification_status}
                    </Badge>
                  )}
                </div>
                <h2 className="text-lg font-medium text-foreground max-w-3xl">{assumption.statement}</h2>
                {health && (
                  <p className="text-sm text-muted-foreground max-w-4xl">
                    <span className="font-semibold text-foreground">Strategic verdict:</span> {health.strategic_verdict}
                  </p>
                )}

                {assumption.supports_building_blocks?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Key building blocks:</span>
                    {assumption.supports_building_blocks.map((block) => (
                      <Badge key={block} className="text-xs bg-primary/10 text-primary border-0 flex items-center gap-1">
                        {buildingBlockIcons[block] || null}
                        {formatBuildingBlock(block)}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full bg-destructive" />
                    <span className="text-muted-foreground">{health?.negative_signals || assumption.challengingSignals.length} challenging</span>
                  </div>
                  <div className="w-40 h-2 rounded-full overflow-hidden flex border border-border">
                    <div className="bg-destructive transition-all" style={{ width: `${challengingPercent}%` }} />
                    <div className="bg-primary transition-all" style={{ width: `${validatingPercent}%` }} />
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span className="text-muted-foreground">{health?.positive_signals || assumption.validatingSignals.length} validating</span>
                  </div>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="py-6 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Health Analysis Section */}
          {health && (
            <Card className="border-2" style={{ borderColor: statusColor }}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-5 w-5" style={{ color: statusColor }} />
                    Assumption Health Analysis
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block">Net Impact</span>
                      <span className={cn(
                        "text-lg font-bold",
                        health.net_impact_score < 0 ? "text-destructive" : "text-primary"
                      )}>
                        {health.net_impact_score > 0 ? '+' : ''}{health.net_impact_score.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block">Confidence</span>
                      <span className="text-lg font-bold text-foreground">
                        {Math.round(health.confidence_score * 100)}%
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block">Signal Volume</span>
                      <span className="text-lg font-bold text-foreground">{health.signal_volume}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Strategic Verdict</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{health.strategic_verdict}</p>
                </div>

                {health.supporting_evidence_analysis && (
                  <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 space-y-1">
                    <h4 className="text-sm font-semibold text-emerald-600">Validating Evidence</h4>
                    <p className="text-sm text-emerald-900/80 leading-relaxed">{health.supporting_evidence_analysis}</p>
                  </div>
                )}

                {health.challenging_evidence_analysis && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-1">
                    <h4 className="text-sm font-semibold text-destructive">Challenging Evidence</h4>
                    <p className="text-sm text-destructive/90 leading-relaxed">{health.challenging_evidence_analysis}</p>
                  </div>
                )}

                {health.key_risk_factors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Key Risk Factors
                    </h4>
                    <ul className="space-y-1">
                      {health.key_risk_factors.map((risk, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-destructive shrink-0">-</span>
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Sorting Controls */}
          <div className="flex items-center justify-end gap-3">
            <span className="text-xs text-muted-foreground">Sort signals by combined score:</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={scoreSort === 'desc' ? 'default' : 'outline'}
                onClick={() => setScoreSort('desc')}
                className="text-xs"
              >
                High → Low
              </Button>
              <Button
                size="sm"
                variant={scoreSort === 'asc' ? 'default' : 'outline'}
                onClick={() => setScoreSort('asc')}
                className="text-xs"
              >
                Low → High
              </Button>
            </div>
          </div>

          {/* Signals Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 bg-card border border-border rounded-xl shadow-xl">
            <div className="border-b lg:border-b-0 lg:border-r border-border flex flex-col max-h-[calc(100vh-200px)]">
              <div className="px-6 py-4 border-b border-border bg-destructive/5 shrink-0">
                <h3 className="font-semibold text-destructive flex items-center gap-2 text-base">
                  <AlertTriangle className="h-5 w-5" />
                  Challenging Signals
                  <Badge variant="outline" className="ml-2 text-destructive border-destructive/30">
                    {assumption.challengingSignals.length}
                  </Badge>
                </h3>
              </div>
              <ScrollArea className="flex-1 p-6">
                {assumption.challengingSignals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <p className="text-muted-foreground text-sm">No challenging signals</p>
                  </div>
                ) : (
                  sortedChallenging.map(signal => (
                    <SignalCard key={signal.signal_id} signal={signal} type="challenging" onClick={() => onSignalClick(signal)} />
                  ))
                )}
              </ScrollArea>
            </div>

            <div className="flex flex-col max-h-[calc(100vh-200px)]">
              <div className="px-6 py-4 border-b border-border bg-primary/5 shrink-0">
                <h3 className="font-semibold text-primary flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5" />
                  Validating Signals
                  <Badge variant="outline" className="ml-2 text-primary border-primary/30">
                    {assumption.validatingSignals.length}
                  </Badge>
                </h3>
              </div>
              <ScrollArea className="flex-1 p-6">
                {assumption.validatingSignals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <p className="text-muted-foreground text-sm">No validating signals</p>
                  </div>
                ) : (
                  sortedValidating.map(signal => (
                    <SignalCard key={signal.signal_id} signal={signal} type="validating" onClick={() => onSignalClick(signal)} />
                  ))
                )}
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Core Assumptions Section
function CoreAssumptionsSection({ onAssumptionClick }: { onAssumptionClick: (a: AssumptionWithSignals) => void }) {
  const { data, coreAssumptions, allSignals } = useForesight();
  const [statusFilter, setStatusFilter] = useState<'all' | 'AT RISK' | 'MIXED' | 'VALIDATED'>('all');
  const [impactSort, setImpactSort] = useState<'desc' | 'asc' | 'id'>('desc');
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [buildingBlockFilter, setBuildingBlockFilter] = useState<string[]>([]);

  const assumptionHealthEntries = useMemo(() => {
    const rootHealth = data?.assumption_health || [];
    const nestedHealth = data?.strategy_context?.assumption_health || [];
    return [...rootHealth, ...nestedHealth];
  }, [data?.assumption_health, data?.strategy_context?.assumption_health]);

  const assumptionHealthMap = useMemo(() => {
    const map = new Map<string, AssumptionHealth>();
    assumptionHealthEntries.forEach(h => map.set(h.assumption_id, h));
    return map;
  }, [assumptionHealthEntries]);

  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    coreAssumptions.forEach(assumption => {
      if (assumption.category) types.add(assumption.category);
    });
    return Array.from(types).sort((a, b) => a.localeCompare(b));
  }, [coreAssumptions]);

  const availableBuildingBlocks = useMemo(() => {
    const blocks = new Set<string>();
    coreAssumptions.forEach(assumption => {
      (assumption.supports_building_blocks || []).forEach(block => blocks.add(block));
    });
    const order = [
      'direction_and_positioning',
      'value_creation',
      'value_defence',
      'Strategic_defence',
      'Strategic_defense',
      'key_levers',
    ];
    return Array.from(blocks).sort((a, b) => {
      const aIdx = order.indexOf(a);
      const bIdx = order.indexOf(b);
      if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
  }, [coreAssumptions]);

  const assumptionsWithSignals: AssumptionWithSignals[] = useMemo(() => {
    return coreAssumptions.map(assumption => {
      const relatedSignals = allSignals.filter(s =>
        s.related_assumption_id === assumption.id || s.assumption_id === assumption.id
      );
      return {
        ...assumption,
        challengingSignals: relatedSignals.filter(s => s.impact_direction === 'Negative'),
        validatingSignals: relatedSignals.filter(s => s.impact_direction === 'Positive'),
        health: assumptionHealthMap.get(assumption.id),
      };
    });
  }, [coreAssumptions, allSignals, assumptionHealthMap]);

  if (assumptionsWithSignals.length === 0) return null;

  const filteredAssumptions = useMemo(() => {
    return assumptionsWithSignals.filter(assumption => {
      if (statusFilter !== 'all' && assumption.health?.verification_status !== statusFilter) {
        return false;
      }

      if (typeFilter.length > 0 && !typeFilter.includes(assumption.category)) {
        return false;
      }

      if (buildingBlockFilter.length > 0) {
        const blocks = assumption.supports_building_blocks || [];
        if (!blocks.some(block => buildingBlockFilter.includes(block))) {
          return false;
        }
      }

      return true;
    });
  }, [assumptionsWithSignals, statusFilter, typeFilter, buildingBlockFilter]);

  const sortedAssumptions = useMemo(() => {
    const list = [...filteredAssumptions];
    list.sort((a, b) => {
      if (impactSort === 'id') {
        const aNum = Number.parseInt(a.id.replace(/\D+/g, ''), 10) || 0;
        const bNum = Number.parseInt(b.id.replace(/\D+/g, ''), 10) || 0;
        if (aNum !== bNum) return aNum - bNum;
        return a.id.localeCompare(b.id);
      }

      const aScore = a.health?.net_impact_score ?? 0;
      const bScore = b.health?.net_impact_score ?? 0;
      return impactSort === 'desc' ? bScore - aScore : aScore - bScore;
    });
    return list;
  }, [filteredAssumptions, impactSort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-md font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-primary" />
          Core Assumptions ({sortedAssumptions.length}/{assumptionsWithSignals.length})
        </h3>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Filter:</span>
            <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card/70 p-1">
            {[
              { value: 'all', label: 'All' },
              { value: 'AT RISK', label: 'At risk' },
              { value: 'MIXED', label: 'Mixed' },
              { value: 'VALIDATED', label: 'Validated' },
            ].map((filter) => {
              const isActive = statusFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatusFilter(filter.value as typeof statusFilter)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-medium transition",
                    isActive
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {filter.label}
                </button>
              );
            })}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 rounded-full px-3 text-[11px] font-medium">
                <span className="flex items-center gap-1">
                  Type {typeFilter.length > 0 ? `(${typeFilter.length})` : 'All'}
                  <ChevronDown className="h-3 w-3 opacity-70" />
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-xs">Type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={typeFilter.length === 0}
                onCheckedChange={() => setTypeFilter([])}
              >
                All types
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {availableTypes.map((type) => (
                <DropdownMenuCheckboxItem
                  key={type}
                  checked={typeFilter.includes(type)}
                  onCheckedChange={(checked) => {
                    setTypeFilter((prev) => (
                      checked ? [...prev, type] : prev.filter((value) => value !== type)
                    ));
                  }}
                >
                  {type}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 rounded-full px-3 text-[11px] font-medium">
                <span className="flex items-center gap-1">
                  Blocks {buildingBlockFilter.length > 0 ? `(${buildingBlockFilter.length})` : 'All'}
                  <ChevronDown className="h-3 w-3 opacity-70" />
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="text-xs">Building blocks</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={buildingBlockFilter.length === 0}
                onCheckedChange={() => setBuildingBlockFilter([])}
              >
                All blocks
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {availableBuildingBlocks.map((block) => (
                <DropdownMenuCheckboxItem
                  key={block}
                  checked={buildingBlockFilter.includes(block)}
                  onCheckedChange={(checked) => {
                    setBuildingBlockFilter((prev) => (
                      checked ? [...prev, block] : prev.filter((value) => value !== block)
                    ));
                  }}
                >
                  {formatBuildingBlock(block)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Sort:</span>
            <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card/70 p-1">
              <button
                type="button"
                onClick={() => setImpactSort('desc')}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-medium transition",
                  impactSort === 'desc'
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Impact ↓
              </button>
              <button
                type="button"
                onClick={() => setImpactSort('asc')}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-medium transition",
                  impactSort === 'asc'
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Impact ↑
              </button>
              <button
                type="button"
                onClick={() => setImpactSort('id')}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-medium transition",
                  impactSort === 'id'
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Index
              </button>
            </div>
          </div>
        </div>
      </div>
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <LinkIcon className="h-3 w-3" />
        Click to see health analysis & signals
      </span>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sortedAssumptions.length === 0 ? (
          <div className="text-sm text-muted-foreground">No assumptions match this filter.</div>
        ) : sortedAssumptions.map(assumption => {
          const health = assumption.health;
          const { borderColor, statusColor } = getHealthColor(health);
          const positiveSignals = health?.positive_signals ?? assumption.validatingSignals.length;
          const negativeSignals = health?.negative_signals ?? assumption.challengingSignals.length;
          const totalSignals = positiveSignals + negativeSignals;
          const negativePercent = totalSignals > 0 ? (negativeSignals / totalSignals) * 100 : 50;
          const positivePercent = 100 - negativePercent;
          const computedImpact = assumption.validatingSignals.reduce((sum, signal) => sum + getSignalScore(signal), 0)
            - assumption.challengingSignals.reduce((sum, signal) => sum + getSignalScore(signal), 0);
          const impactScore = health?.net_impact_score ?? computedImpact;

          return (
            <Card
              key={assumption.id}
              className="cursor-pointer transition-all hover:scale-[1.01] bg-card rounded-xl"
              style={{ borderWidth: '3px', borderColor }}
              onClick={() => onAssumptionClick(assumption)}
            >
              <CardContent className="p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm" style={{ color: statusColor }}>{assumption.id}</span>
                      {health && (
                        <Badge variant={getStatusBadgeVariant(health.verification_status)} className="text-xs">
                          {health.verification_status}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Net impact</span>
                    <div className={cn(
                      "text-xl font-semibold",
                      impactScore < 0 ? "text-destructive" : "text-emerald-500"
                    )}>
                      {impactScore > 0 ? '+' : ''}{impactScore.toFixed(2)}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-foreground leading-relaxed">{assumption.statement}</p>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant="secondary" className="px-3 py-1 text-[12px] capitalize rounded-full">
                    {assumption.category}
                  </Badge>
                </div>

                {totalSignals > 0 && (
                  <div className="pt-3 border-t border-border/50">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                      <span className="flex items-center gap-1">
                        Challenging
                        <span className="text-foreground font-medium">{negativeSignals}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        Validating
                        <span className="text-foreground font-medium">{positiveSignals}</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden flex border border-border">
                      <div
                        className="bg-destructive"
                        style={{ width: `${negativePercent}%` }}
                      />
                      <div
                        className="bg-primary"
                        style={{ width: `${positivePercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// Assumptions Definition Section
function AssumptionsDefinitionSection() {
  const { coreAssumptions } = useForesight();
  const [selectedAssumption, setSelectedAssumption] = useState<Assumption | null>(null);

  if (coreAssumptions.length === 0) return null;

  return (
    <div className="space-y-4">
      <Dialog open={!!selectedAssumption} onOpenChange={() => setSelectedAssumption(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-xl">{selectedAssumption?.id}</DialogTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedAssumption?.category} {selectedAssumption?.as_of_date ? `• As of ${selectedAssumption.as_of_date}` : ''}
                </p>
              </div>
              {selectedAssumption?.impact_severity_if_broken !== undefined && (
                <Badge
                  variant={selectedAssumption.impact_severity_if_broken >= 8 ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  Impact severity: {selectedAssumption.impact_severity_if_broken}
                </Badge>
              )}
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4 text-sm">
              {selectedAssumption?.statement && (
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <h4 className="text-xs font-semibold text-foreground mb-2">Assumption Statement</h4>
                  <p className="text-sm text-foreground leading-relaxed">{selectedAssumption.statement}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {selectedAssumption?.supports_building_blocks?.map(bb => (
                  <Badge key={bb} className="text-xs bg-primary/10 text-primary border-0">
                    {formatBuildingBlock(bb)}
                  </Badge>
                ))}
                {selectedAssumption?.external_risk_domains?.map(domain => (
                  <Badge key={domain} variant="outline" className="text-xs">
                    {domain}
                  </Badge>
                ))}
                {selectedAssumption?.evidence_strength && (
                  <Badge variant="secondary" className="text-xs">
                    Evidence: {selectedAssumption.evidence_strength}
                  </Badge>
                )}
                {selectedAssumption?.confidence_level !== undefined && (
                  <Badge variant="outline" className="text-xs">
                    Confidence: {selectedAssumption.confidence_level}%
                  </Badge>
                )}
              </div>

              {selectedAssumption?.numeric_anchor && (
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2">Numeric Anchor</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{selectedAssumption.numeric_anchor}</p>
                </div>
              )}

              {selectedAssumption?.why_it_matters && (
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2">Why It Matters</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{selectedAssumption.why_it_matters}</p>
                </div>
              )}

              {selectedAssumption?.evidence_base && (
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2">Evidence Base</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{selectedAssumption.evidence_base}</p>
                </div>
              )}

              {selectedAssumption?.historical_validity && (
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2">Historical Validity</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{selectedAssumption.historical_validity}</p>
                </div>
              )}

              {selectedAssumption?.failure_scenario && (
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2">Failure Scenario</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{selectedAssumption.failure_scenario}</p>
                </div>
              )}

              {selectedAssumption?.leading_indicators?.length ? (
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2">Leading Indicators</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    {selectedAssumption.leading_indicators.map((indicator, idx) => (
                      <li key={idx}>{indicator}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {selectedAssumption?.dependency_chain?.length ? (
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2">Dependency Chain</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAssumption.dependency_chain.map((dep, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs font-mono">
                        {dep}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {selectedAssumption?.evidence_refs?.length ? (
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2">Evidence References</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAssumption.evidence_refs.map((ref, idx) => (
                      <Badge key={idx} variant="secondary" className="text-[11px]">
                        {ref}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <h3 className="text-md font-semibold flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Core Assumptions (Definition)
        </h3>
        <span className="text-xs text-muted-foreground">{coreAssumptions.length} assumptions</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {coreAssumptions.map(assumption => (
          <Card
            key={assumption.id}
            className="bg-card/70 border border-border/60 rounded-2xl shadow-sm backdrop-blur cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
            onClick={() => setSelectedAssumption(assumption)}
          >
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">{assumption.id}</Badge>
                  <Badge variant="secondary" className="text-xs capitalize">{assumption.category}</Badge>
                </div>
                {assumption.impact_severity_if_broken !== undefined && (
                  <Badge variant={assumption.impact_severity_if_broken >= 8 ? 'destructive' : 'secondary'} className="text-xs">
                    Severity {assumption.impact_severity_if_broken}
                  </Badge>
                )}
              </div>

              <p className="text-sm text-foreground leading-relaxed line-clamp-3">{assumption.statement}</p>

              {assumption.numeric_anchor && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  <span className="font-medium text-foreground">Anchor:</span> {assumption.numeric_anchor}
                </p>
              )}

              {assumption.why_it_matters && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  <span className="font-medium text-foreground">Why it matters:</span> {assumption.why_it_matters}
                </p>
              )}

              <div className="flex flex-wrap gap-1.5">
                {assumption.supports_building_blocks?.map(bb => (
                  <Badge key={bb} className="text-[11px] bg-primary/10 text-primary border-0">
                    {formatBuildingBlock(bb)}
                  </Badge>
                ))}
                {assumption.external_risk_domains?.map(domain => (
                  <Badge key={domain} variant="outline" className="text-[11px]">
                    {domain}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                {assumption.evidence_strength && <span>Evidence: {assumption.evidence_strength}</span>}
                {assumption.confidence_level !== undefined && <span>Confidence: {assumption.confidence_level}%</span>}
                {assumption.leading_indicators?.length ? <span>{assumption.leading_indicators.length} indicators</span> : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function AssumptionsAnalysis() {
  const { threatIds, opportunityIds, warningIds } = useForesight();
  const [selectedAssumption, setSelectedAssumption] = useState<AssumptionWithSignals | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);

  return (
    <div className="space-y-6">
      {selectedAssumption && (
        <AssumptionDetail
          assumption={selectedAssumption}
          onClose={() => setSelectedAssumption(null)}
          onSignalClick={setSelectedSignal}
        />
      )}

      <SignalDetailDialog
        signal={selectedSignal}
        onClose={() => setSelectedSignal(null)}
        threatIds={threatIds}
        opportunityIds={opportunityIds}
        warningIds={warningIds}
      />

      <CoreAssumptionsSection onAssumptionClick={setSelectedAssumption} />
    </div>
  );
}

// Main Component
export function StrategyComposition() {
  const { data } = useForesight();
  const [activeTab, setActiveTab] = useState('overview');

  if (!data?.strategy_context) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Layers className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground">No Strategy Data</h3>
        <p className="text-sm text-muted-foreground mt-1">Upload a foresight data file to view strategy composition.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full flex-wrap items-center gap-2 rounded-full border border-border/60 bg-card/70 p-1 shadow-sm backdrop-blur">
          <TabsTrigger
            value="overview"
            className="rounded-full px-4 py-2 text-xs font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="objectives"
            className="rounded-full px-4 py-2 text-xs font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow"
          >
            Objectives & KPIs
          </TabsTrigger>
          <TabsTrigger
            value="assumptions"
            className="rounded-full px-4 py-2 text-xs font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow"
          >
            Assumptions
          </TabsTrigger>
          <TabsTrigger
            value="pathways"
            className="rounded-full px-4 py-2 text-xs font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow"
          >
            Pathways
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <StrategySnapshotCard />
          <BuildingBlocksSection />
          <ValueChainSection />
        </TabsContent>

        <TabsContent value="objectives" className="space-y-6 mt-6">
          <StrategicObjectivesSection />
          <KPIsSection />
        </TabsContent>

        <TabsContent value="assumptions" className="space-y-6 mt-6">
          <AssumptionsDefinitionSection />
          <AssumptionClustersSection />
        </TabsContent>

        <TabsContent value="pathways" className="space-y-6 mt-6">
          <ImpactPathwaysSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
