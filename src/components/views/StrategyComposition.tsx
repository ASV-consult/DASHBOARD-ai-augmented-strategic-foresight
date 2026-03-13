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
import { Signal, Assumption, StrategicObjective, FinancialTarget, KPI, ImpactPathway, AssumptionCluster, AssumptionHealth, PorterFiveForces, PorterForce, SwotAnalysis, SwotItem } from '@/types/foresight';
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
import { AssumptionSpiderCharts } from '@/components/views/AssumptionSpiderCharts';

const buildingBlockIcons: Record<string, React.ReactNode> = {
  direction_and_positioning: <Compass className="h-4 w-4" />,
  value_creation: <Layers className="h-4 w-4" />,
  value_defence: <Shield className="h-4 w-4" />,
  Strategic_defence: <Shield className="h-4 w-4" />,
  Strategic_defense: <Shield className="h-4 w-4" />,
  key_levers: <Zap className="h-4 w-4" />,
};

const buildingBlockLabels: Record<string, string> = {
  direction_and_positioning: 'Direction & Positioning',
  value_creation: 'Value Creation',
  value_defence: 'Strategic Defence',
  Strategic_defence: 'Strategic Defence',
  Strategic_defense: 'Strategic Defence',
  key_levers: 'Key Levers',
  cross_cutting: 'Cross-cutting',
};

const formatBuildingBlock = (block: string) => {
  return buildingBlockLabels[block] || block.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const normalizeBuildingBlockKey = (block?: string) => {
  if (!block) return 'cross_cutting';
  if (block === 'Strategic_defence' || block === 'Strategic_defense') return 'value_defence';
  return block;
};

const cleanNarrative = (text?: string) => {
  if (!text) return '';
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[(S\d+)\]/g, '')
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

const summarizeSentence = (text?: string) => {
  const cleaned = cleanNarrative(text);
  if (!cleaned) return '';
  const first = cleaned.split(/[.!?]/).find(part => part.trim().length > 0);
  return (first || cleaned).trim();
};

function splitHeadlineAndBody(raw?: string) {
  const text = (raw || '').trim();
  if (!text) return { title: '', description: '' };

  const markdownHeadline = text.match(/^\*\*(.+?)\*\*:\s*(.+)$/);
  if (markdownHeadline) {
    return {
      title: cleanNarrative(markdownHeadline[1]),
      description: cleanNarrative(markdownHeadline[2]),
    };
  }

  const plainHeadline = text.match(/^([^:]{12,140}):\s*(.+)$/);
  if (plainHeadline) {
    return {
      title: cleanNarrative(plainHeadline[1]),
      description: cleanNarrative(plainHeadline[2]),
    };
  }

  return {
    title: summarizeWords(text, 12),
    description: cleanNarrative(text),
  };
}

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

const normalizeSwotItems = (items?: Array<SwotItem | string>) => {
  if (!items) return [];
  return items.map(item => {
    if (typeof item === 'string') {
      const parsed = splitHeadlineAndBody(item);
      return { title: parsed.title, description: parsed.description };
    }
    const canonical = item.title || item.point || item.description || item.detail || item.evidence || '';
    const parsed = splitHeadlineAndBody(canonical);
    return {
      title: cleanNarrative(item.title || item.point || parsed.title || 'Item'),
      description: cleanNarrative(item.description || item.detail || item.evidence || item.point || parsed.description || ''),
      source: item.source || item.reference || item.url,
      evidence: item.evidence,
    };
  });
};

const normalizeForceName = (force: any) => force?.name || force?.force || force?.id || 'Force';
const normalizeForcePressure = (force: any) => force?.intensity || force?.rating || force?.pressure || force?.level || '';

const forceTone = (pressure?: string) => {
  if (!pressure) return 'secondary';
  const val = pressure.toLowerCase();
  if (val.includes('high') || val.includes('strong')) return 'destructive';
  if (val.includes('medium')) return 'secondary';
  if (val.includes('low')) return 'default';
  return 'secondary';
};

const forcePressureScore = (pressure?: string) => {
  const val = (pressure || '').toLowerCase();
  if (val.includes('high') || val.includes('strong')) return 90;
  if (val.includes('medium') || val.includes('moderate')) return 60;
  if (val.includes('low') || val.includes('weak')) return 30;
  return 45;
};

const formatForceKey = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
const normalizePorterForces = (fiveForces?: PorterFiveForces) => {
  if (!fiveForces) return [];

  const fromForcesField = (input: PorterFiveForces['forces']) => {
    if (!input) return [];
    if (Array.isArray(input)) return input;
    return Object.entries(input).map(([key, value]) => ({
      ...value,
      name: value?.name || value?.force || formatForceKey(key),
      description: value?.description || value?.analysis || value?.summary || value?.details,
      intensity: value?.intensity || value?.level || value?.rating || value?.pressure,
    }));
  };

  // Prefer explicit forces field; otherwise treat remaining object keys as forces
  const explicit = fromForcesField(fiveForces.forces);
  if (explicit.length > 0) return explicit;

  const ignored = new Set(['summary', 'overview', 'confidence', 'forces', 'forces_research_sources', 'base_research_sources']);
  return Object.entries(fiveForces)
    .filter(([key, val]) => !ignored.has(key) && typeof val === 'object' && val !== null)
    .map(([key, value]) => ({
      ...(value as PorterForce),
      name: (value as PorterForce)?.name || (value as PorterForce)?.force || formatForceKey(key),
      description: (value as PorterForce)?.description || (value as PorterForce)?.analysis || (value as any)?.summary || (value as any)?.details,
      intensity: (value as PorterForce)?.intensity || (value as any)?.level || (value as PorterForce)?.rating || (value as PorterForce)?.pressure,
    }));
};

const extractUrlFromText = (text?: string) => {
  if (!text) return '';
  const match = text.match(/https?:\/\/\S+/);
  if (!match) return '';
  return match[0].replace(/[),.;]+$/, '');
};

const extractSourceId = (text?: string) => {
  if (!text) return undefined;
  const match = text.match(/\bS\d+\b/);
  return match ? match[0] : undefined;
};

const normalizeResearchSources = (sources?: Array<{ source_id?: string; title?: string; url?: string; source?: string; reference?: string }>) => {
  if (!sources || sources.length === 0) return [];
  return sources.map((item) => {
    const url = item.url || extractUrlFromText(item.source) || extractUrlFromText(item.reference);
    const title = item.title || item.source || item.reference || item.url || 'Source';
    const id = item.source_id || extractSourceId(item.reference) || extractSourceId(item.title) || extractSourceId(item.source);
    return { id, title, url };
  });
};

const categorizePorterForces = (forces: PorterForce[]) => {
  const remaining = [...forces];
  const matchCategory = (force: PorterForce) => {
    const name = normalizeForceName(force).toLowerCase();
    if (name.includes('rivalry') || name.includes('industry')) return 'rivalry';
    if (name.includes('buyer') || name.includes('customer')) return 'buyers';
    if (name.includes('supplier')) return 'suppliers';
    if (name.includes('substitute')) return 'substitutes';
    if (name.includes('entrant') || name.includes('entry') || name.includes('new')) return 'entrants';
    return 'others';
  };

  const buckets: Record<string, PorterForce | undefined> = {
    rivalry: undefined,
    buyers: undefined,
    suppliers: undefined,
    entrants: undefined,
    substitutes: undefined,
  };
  const others: PorterForce[] = [];

  remaining.forEach(force => {
    const cat = matchCategory(force);
    if (cat === 'others') {
      others.push(force);
      return;
    }
    if (!buckets[cat]) {
      buckets[cat] = force;
    } else {
      others.push(force);
    }
  });

  return { ...buckets, others };
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
            <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
              Strategy Snapshot
            </CardTitle>
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

      {/* Financial Targets - Hero Cards */}
      {financialTargets.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Financial Targets
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {financialTargets.map((target, idx) => (
              <Card
                key={idx}
                className="relative overflow-hidden border-none shadow-md bg-gradient-to-br from-card to-secondary/10 hover:shadow-lg transition-all"
              >
                <div className="absolute -right-4 -top-4 opacity-[0.03]">
                  <DollarSign className="h-32 w-32" />
                </div>
                <CardContent className="p-6 relative z-10">
                  <div className="flex flex-col h-full justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{target.metric}</p>
                      <h4 className="text-2xl font-semibold text-foreground mt-2">{target.target}</h4>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant="outline"
                          className="text-xs bg-background/50 backdrop-blur-sm border-primary/20 text-primary"
                        >
                          {target.timeframe}
                        </Badge>
                        <ConfidenceIndicator level={target.evidence_strength} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
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
      <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center gap-3 text-xs">
          <span className="text-muted-foreground">How to read this view:</span>
          <Badge variant="destructive" className="text-[11px]">
            {criticalKpis.length} critical KPIs
          </Badge>
          <Badge variant="outline" className="text-[11px]">
            {otherKpis.length} supporting KPIs
          </Badge>
          <span className="text-muted-foreground">
            Open any KPI card for full definition, anchors, and evidence context.
          </span>
        </CardContent>
      </Card>

      {/* KPI Detail Dialog */}
      <Dialog open={!!selectedKpi} onOpenChange={() => setSelectedKpi(null)}>
        <DialogContent className="max-w-2xl">
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
              {selectedKpi.description && (
                <div className="p-4 bg-secondary/20 rounded-xl border border-border/50">
                  <p className="text-sm text-foreground leading-relaxed">{selectedKpi.description}</p>
                </div>
              )}

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

              {(selectedKpi.current_value || selectedKpi.numeric_anchor || selectedKpi.evidence_strength) && (
                <div className="space-y-3">
                  {selectedKpi.current_value && (
                    <Card className="bg-primary/5 border border-primary/20 rounded-2xl shadow-sm">
                      <CardContent className="p-5">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Value</span>
                        <div className="text-3xl font-bold text-primary mt-2 leading-tight break-words">{selectedKpi.current_value}</div>
                      </CardContent>
                    </Card>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedKpi.numeric_anchor && (
                      <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm backdrop-blur">
                        <CardContent className="p-4">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Numeric Anchor</span>
                          <div className="text-lg font-semibold text-foreground mt-1">{selectedKpi.numeric_anchor}</div>
                        </CardContent>
                      </Card>
                    )}
                    {selectedKpi.evidence_strength && (
                      <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm backdrop-blur">
                        <CardContent className="p-4">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Evidence Strength</span>
                          <div className="mt-2">
                            <ConfidenceIndicator level={selectedKpi.evidence_strength} />
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}

              {false && selectedKpi.linked_assumptions?.length > 0 && (
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

                <CardContent className="p-5 space-y-4 overflow-hidden min-h-[230px] flex flex-col">
                  <div className="flex items-start justify-between gap-4 relative z-10">
                    <h4 className="font-semibold text-lg text-foreground line-clamp-2 break-words">{kpi.name}</h4>
                    <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Current Status</span>
                    <div className="text-xl font-bold text-foreground break-words line-clamp-2 leading-snug">
                      {kpi.current_value || 'N/A'}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground mt-auto">
                    {kpi.evidence_strength ? (
                      <span>Evidence {kpi.evidence_strength}</span>
                    ) : (
                      <span className="text-muted-foreground">Evidence N/A</span>
                    )}
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

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {otherKpis.map((kpi, idx) => (
              <Card
                key={kpi.kpi_id || idx}
                className="group cursor-pointer transition-all bg-card/80 border border-border/60 rounded-3xl shadow-[0_16px_40px_-30px_rgba(15,23,42,0.4)] hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_24px_50px_-28px_rgba(59,130,246,0.35)]"
                onClick={() => setSelectedKpi(kpi)}
              >
                <CardContent className="p-6 space-y-4 overflow-hidden min-h-[300px] flex flex-col">
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Supporting metric</p>
                    <h4 className="text-base font-semibold text-foreground leading-snug break-words">
                      {kpi.name}
                    </h4>
                  </div>
                  {kpi.current_value && (
                    <div className="bg-primary/5 border border-primary/30 rounded-2xl p-4">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Current</span>
                      <div className="text-xl font-semibold text-primary break-words leading-snug mt-1">
                        {kpi.current_value}
                      </div>
                    </div>
                  )}
                  {kpi.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed break-words">
                      {kpi.description}
                    </p>
                  )}
                  <div className="flex flex-col gap-2 text-[11px] uppercase tracking-wide mt-auto">
                    <Badge
                      variant="outline"
                      className="text-[11px] h-auto px-4 py-2 opacity-90 rounded-full whitespace-normal break-words text-left"
                    >
                      {kpi.strategic_importance}
                    </Badge>
                    {kpi.evidence_strength && (
                      <Badge
                        variant="secondary"
                        className="text-[11px] h-auto px-4 py-2 rounded-full whitespace-normal break-words text-left"
                      >
                        Evidence {kpi.evidence_strength}
                      </Badge>
                    )}
                  </div>
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



// Competitive Analysis Section with interactivity
function CompetitiveAnalysisSection() {
  const { data } = useForesight();
  const fiveForces = data?.strategy_context?.porter_five_forces || data?.strategy_context?.porter_5_forces;
  const swot = data?.strategy_context?.swot_analysis;
  const forces = useMemo(() => normalizePorterForces(fiveForces), [fiveForces]);
  const forceBuckets = useMemo(() => categorizePorterForces(forces), [forces]);
  const baseSources = data?.strategy_context?.base_research_sources || [];
  const forcesSources = data?.strategy_context?.forces_research_sources || (fiveForces as any)?.forces_research_sources || [];
  const researchSources = useMemo(() => {
    const preferredList = forcesSources.length > 0 ? forcesSources : baseSources;
    const normalized = normalizeResearchSources([
      ...preferredList,
      ...(swot?.source ? [{ source: swot.source }] : []),
    ]);
    const seen = new Set<string>();
    return normalized.filter((source) => {
      const key = source.url || source.title;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [baseSources, forcesSources, swot?.source]);
  const sourceMap = useMemo(() => {
    const map = new Map<string, { title: string; url?: string }>();
    normalizeResearchSources(baseSources).forEach((source) => {
      if (source.id) map.set(source.id, source);
    });
    normalizeResearchSources(forcesSources).forEach((source) => {
      if (source.id && !map.has(source.id)) map.set(source.id, source);
    });
    return map;
  }, [baseSources, forcesSources]);

  const [selectedForce, setSelectedForce] = useState<PorterForce | null>(null);
  const [selectedSwot, setSelectedSwot] = useState<{ category: string, item: SwotItem | string } | null>(null);
  const [showSources, setShowSources] = useState(false);
  const [expandedSwot, setExpandedSwot] = useState<Record<string, boolean>>({
    Strengths: false,
    Weaknesses: false,
    Opportunities: false,
    Threats: false,
  });

  const renderWithSources = (text?: string, options?: { stopPropagation?: boolean }) => {
    if (!text) return null;
    const regex = /\[(S\d+)\]/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const [full, sourceId] = match;
      const start = match.index;
      if (start > lastIndex) {
        parts.push(text.slice(lastIndex, start));
      }
      const source = sourceMap.get(sourceId);
      const linkProps = options?.stopPropagation
        ? { onClick: (event: React.MouseEvent) => event.stopPropagation() }
        : {};
      parts.push(
        source?.url ? (
          <a
            key={`${sourceId}-${start}`}
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="text-primary font-semibold hover:underline"
            {...linkProps}
          >
            {full}
          </a>
        ) : (
          <span key={`${sourceId}-${start}`} className="text-primary font-semibold">
            {full}
          </span>
        )
      );
      lastIndex = start + full.length;
    }

    if (parts.length === 0) return text;
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return <>{parts}</>;
  };

  const fiveForcesOverview = fiveForces?.overview || fiveForces?.summary;
  const swotSummary = swot?.summary || swot?.strategic_implication;
  const hasFiveForces = !!(fiveForces && (forces.length > 0 || fiveForcesOverview));
  const hasSwot = swot && (
    normalizeSwotItems(swot.strengths).length > 0 ||
    normalizeSwotItems(swot.weaknesses).length > 0 ||
    normalizeSwotItems(swot.opportunities).length > 0 ||
    normalizeSwotItems(swot.threats).length > 0
  );

  const forceDistribution = useMemo(() => {
    const stats = { high: 0, medium: 0, low: 0, unknown: 0 };
    forces.forEach((force) => {
      const pressure = normalizeForcePressure(force).toLowerCase();
      if (pressure.includes('high') || pressure.includes('strong')) stats.high += 1;
      else if (pressure.includes('medium') || pressure.includes('moderate')) stats.medium += 1;
      else if (pressure.includes('low') || pressure.includes('weak')) stats.low += 1;
      else stats.unknown += 1;
    });
    return stats;
  }, [forces]);

  const forceRows = useMemo(
    () => {
      const rows = [
        { title: 'Threat of New Entrants', force: forceBuckets.entrants },
        { title: 'Supplier Power', force: forceBuckets.suppliers },
        { title: 'Industry Rivalry', force: forceBuckets.rivalry },
        { title: 'Buyer Power', force: forceBuckets.buyers },
        { title: 'Threat of Substitutes', force: forceBuckets.substitutes },
      ];

      const canonicalRows = rows.filter((item) => item.force);
      const additionalRows = forceBuckets.others.map((force) => ({
        title: normalizeForceName(force),
        force,
      }));

      return [...canonicalRows, ...additionalRows].sort((a, b) => {
        const aScore = forcePressureScore(normalizeForcePressure(a.force));
        const bScore = forcePressureScore(normalizeForcePressure(b.force));
        if (aScore !== bScore) return bScore - aScore;
        return a.title.localeCompare(b.title);
      });
    },
    [forceBuckets],
  );

  if (!hasSwot && !hasFiveForces) {
    return (
      <Card className="bg-card/70 border border-border/60 rounded-3xl shadow-sm">
        <CardContent className="p-6 text-sm text-muted-foreground">
          No SWOT or Porter's Five Forces data provided in this bundle.
        </CardContent>
      </Card>
    );
  }

  const getSwotDisplay = (item: SwotItem | string) => {
    if (typeof item === 'string') {
      const parsed = splitHeadlineAndBody(item);
      return { title: parsed.title, description: parsed.description, evidence: '', source: '', implication: '' };
    }
    const canonical = item.title || item.point || item.description || item.detail || item.evidence || '';
    const parsed = splitHeadlineAndBody(canonical);
    return {
      title: cleanNarrative(item.title || item.point || parsed.title || 'Item'),
      description: cleanNarrative(item.description || item.detail || item.evidence || item.point || parsed.description || ''),
      evidence: cleanNarrative(item.evidence || ''),
      source: cleanNarrative(item.source || item.reference || item.url || ''),
      implication: cleanNarrative(item.implication || ''),
    };
  };

  const swotStrengths = normalizeSwotItems(swot?.strengths);
  const swotWeaknesses = normalizeSwotItems(swot?.weaknesses);
  const swotOpportunities = normalizeSwotItems(swot?.opportunities);
  const swotThreats = normalizeSwotItems(swot?.threats);

  const renderForceDrivers = (force: PorterForce) => {
    const description = force.description || force.analysis;
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Force summary</p>
          <p className="text-sm text-foreground mt-1">
            {summarizeSentence(description) || 'No detailed summary provided.'}
          </p>
        </div>

        {description && (
          <p className="text-sm text-muted-foreground">
            {renderWithSources(description)}
          </p>
        )}

        {Array.isArray(force.drivers) && force.drivers.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Drivers</h4>
            <ul className="list-disc pl-4 space-y-1 text-sm">
              {force.drivers.map((d, i) => <li key={i}>{renderWithSources(d)}</li>)}
            </ul>
          </div>
        )}

        {Array.isArray(force.mitigation) && force.mitigation.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Mitigations</h4>
            <ul className="list-disc pl-4 space-y-1 text-sm">
              {force.mitigation.map((m, i) => <li key={i} className="text-emerald-500">{renderWithSources(m)}</li>)}
            </ul>
          </div>
        )}
        {Array.isArray(force.signals) && force.signals.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Signals</h4>
            <ul className="list-disc pl-4 space-y-1 text-sm">
              {force.signals.map((s, i) => <li key={i} className="text-blue-500">{renderWithSources(s)}</li>)}
            </ul>
          </div>
        )}

        {Array.isArray(force.threats) && force.threats.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Threats</h4>
            <ul className="list-disc pl-4 space-y-1 text-sm">
              {force.threats.map((threat, i) => <li key={i} className="text-destructive">{renderWithSources(threat)}</li>)}
            </ul>
          </div>
        )}

        {Array.isArray(force.opportunities) && force.opportunities.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Opportunities</h4>
            <ul className="list-disc pl-4 space-y-1 text-sm">
              {force.opportunities.map((opportunity, i) => (
                <li key={i} className="text-emerald-600">{renderWithSources(opportunity)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Porter Detail Dialog */}
      <Dialog open={!!selectedForce} onOpenChange={(open) => !open && setSelectedForce(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedForce && normalizeForceName(selectedForce)}
              {selectedForce && normalizeForcePressure(selectedForce) && (
                <Badge variant={forceTone(normalizeForcePressure(selectedForce!))} className="ml-2">
                  {normalizeForcePressure(selectedForce!)}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {selectedForce && renderForceDrivers(selectedForce)}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* SWOT Detail Dialog */}
      <Dialog open={!!selectedSwot} onOpenChange={(open) => !open && setSelectedSwot(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="capitalize flex items-center gap-2">
              {selectedSwot?.category} Analysis
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedSwot && (() => {
              const { title, description, evidence, source, implication } = getSwotDisplay(selectedSwot.item);
              return (
                <>
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                    <h3 className="font-semibold text-lg">{title}</h3>
                  </div>
                  {description && (
                    <div className="rounded-xl border border-border/50 bg-background/80 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Detail</p>
                      <p className="text-sm text-foreground leading-relaxed mt-1">
                        {renderWithSources(description)}
                      </p>
                    </div>
                  )}
                  {implication && (
                    <div className="text-xs bg-background/70 p-3 rounded border border-border/40">
                      <span className="font-semibold text-muted-foreground">Implication:</span>{' '}
                      <span className="text-sm text-foreground">{renderWithSources(implication)}</span>
                    </div>
                  )}
                  {evidence && (
                    <div className="text-xs bg-card p-3 rounded border border-border/40">
                      <span className="font-semibold">Evidence:</span> {renderWithSources(evidence)}
                    </div>
                  )}
                  {source && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <LinkIcon className="h-3 w-3" />
                      Source: {source}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {hasFiveForces && (
        <Card className="bg-card/70 border border-border/60 rounded-3xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Porter's Five Forces
            </CardTitle>
            {fiveForcesOverview && (
              <CardDescription className="text-sm text-muted-foreground">
                {renderWithSources(fiveForcesOverview)}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">How to read this</p>
              <p className="text-sm text-foreground mt-1">
                Each force shows how strongly it pressures margin and strategic freedom: High means urgent structural pressure,
                Medium means active management needed, Low means currently limited pressure.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="destructive" className="text-[11px]">
                High: {forceDistribution.high}
              </Badge>
              <Badge variant="secondary" className="text-[11px]">
                Medium: {forceDistribution.medium}
              </Badge>
              <Badge variant="outline" className="text-[11px]">
                Low: {forceDistribution.low}
              </Badge>
              {forceDistribution.unknown > 0 && (
                <Badge variant="outline" className="text-[11px]">
                  Unrated: {forceDistribution.unknown}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {forceRows.map(({ title, force }) => {
                const pressure = normalizeForcePressure(force) || 'Unrated';
                const pressureScore = forcePressureScore(pressure);
                const pressureClass =
                  pressureScore >= 85
                    ? 'bg-destructive'
                    : pressureScore >= 55
                      ? 'bg-amber-500'
                      : pressureScore >= 35
                        ? 'bg-emerald-500'
                        : 'bg-slate-400';

                return (
                  <button
                    key={`${title}-${normalizeForceName(force)}`}
                    type="button"
                    className={cn(
                      "rounded-2xl border border-border/50 bg-background/70 p-4 text-left transition",
                      "hover:border-primary/50 hover:bg-primary/5",
                      selectedForce === force && "border-primary/60 bg-primary/10",
                    )}
                    onClick={() => force && setSelectedForce(force)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      <Badge variant={forceTone(pressure)} className="text-[10px] capitalize">
                        {pressure}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground min-h-[34px]">
                      {summarizeSentence(force?.description || force?.analysis) || 'Open details for full assessment'}
                    </p>
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
                        <span>Pressure intensity</span>
                        <span>{pressureScore}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                        <div className={cn("h-full rounded-full", pressureClass)} style={{ width: `${pressureScore}%` }} />
                      </div>
                    </div>
                    <p className="mt-3 text-[11px] font-medium text-primary">Click to open full analysis</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {hasSwot && (
        <Card className="bg-card/70 border border-border/60 rounded-3xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              SWOT
            </CardTitle>
            {swotSummary && (
              <CardDescription className="text-sm text-muted-foreground">
                {renderWithSources(swotSummary)}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {swotSummary && (
              <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Strategic takeaway</p>
                <p className="text-sm text-foreground mt-1">{summarizeWords(swotSummary, 24)}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SwotQuadrant
                title="Strengths"
                items={swotStrengths}
                icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
                onItemClick={(item) => setSelectedSwot({ category: 'Strength', item })}
                tone="positive"
                expanded={expandedSwot.Strengths}
                onToggle={() => setExpandedSwot(prev => ({ ...prev, Strengths: !prev.Strengths }))}
              />
              <SwotQuadrant
                title="Weaknesses"
                items={swotWeaknesses}
                icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}
                onItemClick={(item) => setSelectedSwot({ category: 'Weakness', item })}
                tone="warning"
                expanded={expandedSwot.Weaknesses}
                onToggle={() => setExpandedSwot(prev => ({ ...prev, Weaknesses: !prev.Weaknesses }))}
              />
              <SwotQuadrant
                title="Opportunities"
                items={swotOpportunities}
                icon={<Target className="h-4 w-4 text-blue-500" />}
                onItemClick={(item) => setSelectedSwot({ category: 'Opportunity', item })}
                tone="opportunity"
                expanded={expandedSwot.Opportunities}
                onToggle={() => setExpandedSwot(prev => ({ ...prev, Opportunities: !prev.Opportunities }))}
              />
              <SwotQuadrant
                title="Threats"
                items={swotThreats}
                icon={<Shield className="h-4 w-4 text-destructive" />}
                onItemClick={(item) => setSelectedSwot({ category: 'Threat', item })}
                tone="negative"
                expanded={expandedSwot.Threats}
                onToggle={() => setExpandedSwot(prev => ({ ...prev, Threats: !prev.Threats }))}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {researchSources.length > 0 && (
        <Card className="bg-card/70 border border-border/60 rounded-3xl shadow-sm">
          <CardHeader className="pb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-primary" />
                Research sources
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Articles referenced in the competitive analysis.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setShowSources(prev => !prev)}
            >
              {showSources ? 'Hide sources' : `Show sources (${researchSources.length})`}
              <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform", showSources && "rotate-180")} />
            </Button>
          </CardHeader>
          {showSources && (
            <CardContent className="space-y-2">
              {researchSources.map((source, idx) => (
                <div key={`${source.id || source.url || source.title}-${idx}`} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <ExternalLink className="h-3.5 w-3.5 mt-0.5 text-primary" />
                  {source.id && (
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {source.id}
                    </Badge>
                  )}
                  {source.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {source.title}
                    </a>
                  ) : (
                    <span>{source.title}</span>
                  )}
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}

function SwotQuadrant({
  title,
  items,
  icon,
  onItemClick,
  tone = 'neutral',
  expanded = false,
  onToggle,
}: {
  title: string;
  items: (SwotItem | string)[];
  icon: React.ReactNode;
  onItemClick: (item: SwotItem | string) => void;
  tone?: 'positive' | 'negative' | 'neutral' | 'opportunity' | 'warning';
  expanded?: boolean;
  onToggle?: () => void;
}) {
  if (!items || items.length === 0) return null;
  const toneBorder =
    tone === 'positive' ? 'border-emerald-400/50'
    : tone === 'opportunity' ? 'border-blue-400/50'
    : tone === 'warning' ? 'border-orange-400/50'
    : tone === 'negative' ? 'border-destructive/50'
    : 'border-border/40';
  const toneBg =
    tone === 'positive' ? 'bg-emerald-500/5'
    : tone === 'opportunity' ? 'bg-blue-500/5'
    : tone === 'warning' ? 'bg-orange-500/5'
    : tone === 'negative' ? 'bg-destructive/5'
    : 'bg-background/50';
  const visibleItems = expanded ? items : items.slice(0, 3);
  return (
    <div className={cn("space-y-3 rounded-2xl p-4 border", toneBorder, toneBg)}>
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
          {icon} {title}
        </h4>
        <Badge variant="outline" className="text-[10px]">
          {items.length}
        </Badge>
      </div>
      <ul className="grid grid-cols-1 gap-2">
        {visibleItems.map((item, idx) => {
          const parsed = typeof item === 'string'
            ? splitHeadlineAndBody(item)
            : splitHeadlineAndBody(item.title || item.point || item.description || item.detail || item.evidence || '');
          const display = parsed.title || parsed.description || 'Untitled';
          return (
            <li
              key={idx}
              className="text-xs text-muted-foreground bg-card/60 p-3 rounded-lg border border-border/30 cursor-pointer hover:bg-primary/5 hover:border-primary/40 transition-all"
              onClick={() => onItemClick(item)}
            >
              <p className="text-foreground font-medium line-clamp-2">{summarizeWords(display, 10)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Click to expand full evidence</p>
            </li>
          );
        })}
      </ul>
      {items.length > 3 && (
        <Button variant="ghost" size="sm" className="h-7 px-3 text-[11px]" onClick={onToggle}>
          {expanded ? 'Show fewer points' : `Show all points (${items.length})`}
        </Button>
      )}
    </div>
  );
}

// Assumption Clusters Section
export function AssumptionClustersSection() {
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
                <span className="text-sm font-medium text-foreground">{cluster.cluster_name || 'Unnamed Cluster'}</span>
                <Badge
                  variant={cluster.cascade_risk === 'High' ? 'destructive' : 'secondary'}
                  className="text-xs px-2.5 py-1 whitespace-nowrap"
                >
                  {cluster.cascade_risk || 'Unknown'} risk
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{cluster.description || 'No description available.'}</p>
              <div className="flex flex-wrap gap-1">
                {(cluster.assumptions || []).map((assumption, aIdx) => (
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
            <h3 className="text-lg font-semibold text-foreground">Strategic Building Blocks</h3>
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

  const filteredAssumptions = useMemo(() => {
    return assumptionsWithSignals.filter(assumption => {
      if (statusFilter !== 'all' && assumption.health?.verification_status !== statusFilter) {
        return false;
      }

      if (typeFilter.length > 0 && !typeFilter.includes(assumption.category)) {
        return false;
      }
      return true;
    });
  }, [assumptionsWithSignals, statusFilter, typeFilter]);

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

  const assumptionById = useMemo(() => {
    const map = new Map<string, AssumptionWithSignals>();
    assumptionsWithSignals.forEach((assumption) => map.set(assumption.id, assumption));
    return map;
  }, [assumptionsWithSignals]);

  const spiderAssumptions = useMemo(() => {
    return filteredAssumptions.map((assumption) => ({
      id: assumption.id,
      statement: assumption.statement,
      category: assumption.category,
      supports_building_blocks: assumption.supports_building_blocks,
      health: assumption.health,
      challengingSignals: assumption.challengingSignals,
      validatingSignals: assumption.validatingSignals,
    }));
  }, [filteredAssumptions]);

  if (assumptionsWithSignals.length === 0) return null;

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
                Impact High-Low
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
                Impact Low-High
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

      <AssumptionSpiderCharts
        assumptions={spiderAssumptions}
        title="Assumptions Comparison Spider"
        subtitle="Toggle between building blocks and individual assumption score footprint. Higher score expands wider; click assumptions for detail."
        onAssumptionClick={(assumption) => {
          const fullAssumption = assumptionById.get(assumption.id);
          if (fullAssumption) {
            onAssumptionClick(fullAssumption);
          }
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sortedAssumptions.length === 0 ? (
          <div className="text-sm text-muted-foreground">No assumptions match this view and filter set.</div>
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
export function AssumptionsDefinitionSection() {
  const { coreAssumptions, data } = useForesight();
  const [selectedAssumption, setSelectedAssumption] = useState<Assumption | null>(null);

  if (coreAssumptions.length === 0) return null;

  const assumptionHealthEntries = [
    ...(data?.strategy_context?.assumption_health || []),
    ...(data?.assumption_health || []),
  ];
  const assumptionHealthMap = new Map(
    assumptionHealthEntries.map(entry => [entry.assumption_id, entry.verification_status])
  );

  const canonicalBlock = (block?: string) => {
    if (!block) return 'cross_cutting';
    if (block === 'Strategic_defence' || block === 'Strategic_defense') return 'value_defence';
    return block;
  };

  const groupedByBlock = coreAssumptions.reduce((acc, assumption) => {
    const key = canonicalBlock(assumption.supports_building_blocks?.[0]);
    const list = acc.get(key) || [];
    list.push(assumption);
    acc.set(key, list);
    return acc;
  }, new Map<string, Assumption[]>());
  const orderedColumns = ['value_creation', 'direction_and_positioning', 'value_defence'] as const;
  const columnData = orderedColumns.map((block) => ({
    block,
    assumptions: groupedByBlock.get(block) || [],
  }));
  const otherBlocks = Array.from(groupedByBlock.entries()).filter(
    ([block]) => !orderedColumns.includes(block as typeof orderedColumns[number]),
  );

  return (
    <div className="space-y-4">
      <Dialog open={!!selectedAssumption} onOpenChange={() => setSelectedAssumption(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-xl">{selectedAssumption?.id}</DialogTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedAssumption?.category} {selectedAssumption?.as_of_date ? `| As of ${selectedAssumption.as_of_date}` : ''}
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
          Core Assumption Support Map
        </h3>
        <span className="text-xs text-muted-foreground">{coreAssumptions.length} assumptions</span>
      </div>

      <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
        <CardContent className="p-4 text-xs text-muted-foreground">
          These assumptions are selected because they are load-bearing for strategy execution, observable through signals,
          and linked to concrete risk domains. Open any card to inspect full evidence and failure modes.
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {columnData.map(({ block, assumptions }) => (
          <Card key={block} className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="text-primary">{buildingBlockIcons[block] || <Layers className="h-4 w-4" />}</span>
                  {formatBuildingBlock(block)}
                </CardTitle>
                <Badge variant="outline" className="text-[11px]">
                  {assumptions.length} assumptions
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3">
              {assumptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No assumptions mapped to this level in current output.</p>
              ) : (
                assumptions.map(assumption => {
                  const status = assumptionHealthMap.get(assumption.id);
                  return (
                    <button
                      key={assumption.id}
                      type="button"
                      className="text-left rounded-xl border border-border/50 bg-background/70 p-3 hover:border-primary/40 hover:bg-primary/5 transition"
                      onClick={() => setSelectedAssumption(assumption)}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">{assumption.id}</Badge>
                        <Badge variant="secondary" className="text-xs capitalize">{assumption.category}</Badge>
                        {status && (
                          <Badge variant={getStatusBadgeVariant(status)} className="text-[10px]">
                            {status}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground mt-2">{summarizeWords(assumption.statement, 18)}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        <span className="font-semibold text-foreground">Chosen because:</span>{' '}
                        {summarizeWords(
                          assumption.why_it_matters ||
                            `It supports ${formatBuildingBlock(block)} and protects against key strategic risks.`,
                          20,
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        <span className="font-semibold text-foreground">Coverage:</span>{' '}
                        {(assumption.external_risk_domains || []).slice(0, 3).join(', ') || 'Cross-cutting strategic dependency'}
                      </p>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {otherBlocks.length > 0 && (
        <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Other linked blocks</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {otherBlocks.map(([block, assumptions]) => (
              <Badge key={block} variant="outline" className="text-xs">
                {formatBuildingBlock(block)}: {assumptions.length}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}
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
            value="competitive"
            className="rounded-full px-4 py-2 text-xs font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow"
          >
            SWOT & 5 Forces
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <StrategySnapshotCard />
          <BuildingBlocksSection />
          <ValueChainSection />
        </TabsContent>

        <TabsContent value="objectives" className="space-y-6 mt-6">
          <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
            <CardContent className="p-4 text-xs text-muted-foreground">
              Start with strategic goals to understand intent and time horizon, then validate whether KPI coverage is
              sufficient to monitor execution risk. Detailed rationale stays behind each card click.
            </CardContent>
          </Card>
          <StrategicObjectivesSection />
          <KPIsSection />
        </TabsContent>



        <TabsContent value="competitive" className="space-y-6 mt-6">
          <CompetitiveAnalysisSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
