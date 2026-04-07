import { useEffect, useMemo, useState } from 'react';
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
import { cn, getSafeExternalUrl } from '@/lib/utils';
import {
  formatConfidenceShorthand,
  getAssumptionDisplayLabel,
  getHealthColor,
  getStatusBadgeVariant,
} from '@/lib/foresight-utils';
import { getSignalScore, parseSignalSource } from '@/lib/signal-utils';
import { SignalDetailDialog } from '@/components/SignalDetailDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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

const buildingBlockDescriptions: Record<string, string> = {
  direction_and_positioning: 'Stand out and win in your chosen market.',
  value_creation: 'Build and capture value.',
  value_defence: 'Secure unique value against market threats.',
  Strategic_defence: 'Secure unique value against market threats.',
  Strategic_defense: 'Secure unique value against market threats.',
  key_levers: 'Execution levers that accelerate or unlock the strategy.',
  cross_cutting: 'Cross-cutting strategic support.',
};

const buildingBlockToneStyles: Record<
  string,
  { card: string; icon: string; accent: string; badge: string }
> = {
  direction_and_positioning: {
    card: 'border-border/60 hover:border-border/90',
    icon: 'bg-sky-500/10 text-sky-600 group-hover:ring-sky-400/50',
    accent: '',
    badge: 'border-border/60 text-muted-foreground',
  },
  value_creation: {
    card: 'border-border/60 hover:border-border/90',
    icon: 'bg-blue-500/10 text-blue-600 group-hover:ring-blue-400/50',
    accent: '',
    badge: 'border-border/60 text-muted-foreground',
  },
  value_defence: {
    card: 'border-border/60 hover:border-border/90',
    icon: 'bg-emerald-500/10 text-emerald-600 group-hover:ring-emerald-400/50',
    accent: '',
    badge: 'border-border/60 text-muted-foreground',
  },
  key_levers: {
    card: 'border-orange-300/60 hover:border-orange-400/70',
    icon: 'bg-orange-500/10 text-orange-600 group-hover:ring-orange-400/50',
    accent: '',
    badge: 'border-orange-400/40 text-orange-700',
  },
  cross_cutting: {
    card: 'border-border/60 hover:border-border/90',
    icon: 'bg-slate-500/10 text-slate-600 group-hover:ring-slate-400/50',
    accent: '',
    badge: 'border-border/60 text-muted-foreground',
  },
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
  if (val.includes('medium-high') || val.includes('medium–high')) return 'destructive';
  if (val.includes('high') || val.includes('strong')) return 'destructive';
  if (val.includes('medium') || val.includes('moderate')) return 'secondary';
  if (val.includes('low')) return 'default';
  return 'secondary';
};

const forcePressureScore = (pressure?: string) => {
  const val = (pressure || '').toLowerCase();
  if (val === 'medium-high' || val === 'medium–high' || val === 'medium high') return 75;
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
      description: value?.description || value?.analysis || value?.summary || (value as any)?.details,
      intensity: value?.intensity || (value as any)?.level || value?.rating || value?.pressure,
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

  const buckets: { rivalry?: PorterForce; buyers?: PorterForce; suppliers?: PorterForce; entrants?: PorterForce; substitutes?: PorterForce } = {};
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

  return { ...buckets, others } as { rivalry?: PorterForce; buyers?: PorterForce; suppliers?: PorterForce; entrants?: PorterForce; substitutes?: PorterForce; others: PorterForce[] };
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
              {formatConfidenceShorthand(snapshot.confidence)}
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
    <div className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/70 px-2.5 py-1">
      <div className={cn("h-2 w-2 rounded-full", getColor())} />
      <span className="text-xs text-muted-foreground capitalize">{formatConfidenceShorthand(level)}</span>
    </div>
  );
}

// Strategic Objectives Section - Redesigned
// Strategic Objectives Section - Redesigned
function StrategicObjectivesSection() {
  const { data } = useForesight();
  const objectives = data?.strategy_context?.strategic_objectives;
  const criticalDependencies = data?.strategy_context?.value_chain?.critical_dependencies || [];
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);

  const primaryGoals = objectives?.primary_goals || [];
  const financialTargets = objectives?.financial_targets || [];

  if (primaryGoals.length === 0 && financialTargets.length === 0) {
    return (
      <Card className="rounded-3xl border border-border/60 bg-card/70 shadow-sm">
        <CardContent className="space-y-2 p-5 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Strategic goals</p>
          <p>Work in progress. Goal detail, rationale, and dependencies will appear here once the output layer includes them consistently.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Strategic Goals
          </h3>
          <Badge variant="secondary" className="rounded-full px-3">
            {primaryGoals.length} goals
          </Badge>
        </div>

        {primaryGoals.length === 0 ? (
          <Card className="rounded-3xl border border-dashed border-border/70 bg-background/70 shadow-sm">
            <CardContent className="p-5 text-sm text-muted-foreground">
              Work in progress. Strategic goal cards will be populated once the output includes a stable goal layer.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {primaryGoals.map((goal, idx) => {
              const isExpanded = expandedGoal === goal.objective_id;
              const goalDependencies = criticalDependencies
                .filter((dependency) => (goal.linked_assumptions || []).includes(dependency.linked_assumption))
                .slice(0, 4);

              return (
                <Card
                  key={goal.objective_id || idx}
                  className={cn(
                    'overflow-hidden rounded-3xl border bg-card/75 shadow-sm transition-all',
                    isExpanded ? 'border-primary/45 bg-primary/5' : 'border-border/60 hover:border-primary/35',
                  )}
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => setExpandedGoal(isExpanded ? null : goal.objective_id)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          'mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl',
                          isExpanded ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary',
                        )}>
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                Strategic goal
                              </p>
                              <h4 className="mt-2 text-base font-semibold leading-normal text-foreground">
                                {goal.objective}
                              </h4>
                            </div>
                            <ChevronRight className={cn('mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform', isExpanded && 'rotate-90')} />
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <Badge variant="outline" className="rounded-full px-3 py-1">
                              <Clock className="mr-1 h-3 w-3" />
                              {goal.target_date || 'Target date pending'}
                            </Badge>
                            <ConfidenceIndicator level={goal.confidence} />
                            <ConfidenceIndicator level={goal.evidence_strength} />
                            <Badge variant="outline" className="rounded-full px-3 py-1 border-dashed">
                              {goalDependencies.length > 0 ? `${goalDependencies.length} dependencies` : 'Dependencies WIP'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </button>

                  {isExpanded && (
                    <CardContent className="grid gap-4 border-t border-border/50 bg-background/60 p-5 lg:grid-cols-3">
                      <div className="rounded-2xl border border-border/50 bg-background/85 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Goal origin</p>
                        <p className="mt-2 text-sm text-foreground">
                          {goal.evidence_refs?.length
                            ? goal.evidence_refs.join(', ')
                            : 'Placeholder: origin trace for this goal still needs to be added to the output.'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border/50 bg-background/85 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Reasoning</p>
                        <p className="mt-2 text-sm text-foreground">
                          {goal.evidence_strength
                            ? `Current evidence label: ${goal.evidence_strength}. Goal rationale will be expanded in a later model/output iteration.`
                            : 'Placeholder: rationale for this goal is still work in progress.'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border/50 bg-background/85 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Dependencies</p>
                        {goalDependencies.length > 0 ? (
                          <div className="mt-2 space-y-2 text-sm">
                            {goalDependencies.map((dependency, dependencyIdx) => (
                              <div key={`${dependency.activity}-${dependencyIdx}`} className="rounded-xl border border-border/40 bg-background/80 p-3">
                                <p className="font-medium text-foreground">{dependency.activity}</p>
                                <p className="mt-1 text-muted-foreground">
                                  This strategic goal currently depends on {dependency.depends_on}.
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-foreground">
                            Placeholder: goal-specific dependencies still need to be modeled explicitly.
                          </p>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

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
  const { data } = useForesight();
  const kpis = data?.strategy_context?.key_performance_indicators?.critical_metrics || [];
  const [selectedKpi, setSelectedKpi] = useState<KPI | null>(null);

  const criticalKpis = kpis.filter(k => k.strategic_importance === 'Critical');

  return (
    <div className="space-y-8">
      <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center gap-3 text-xs">
          <span className="text-muted-foreground">Focus:</span>
          <Badge variant="destructive" className="text-[11px]">
            {criticalKpis.length} critical KPIs
          </Badge>
          <span className="text-muted-foreground">
            Only critical KPIs are shown here. Supporting metrics remain hidden for now while this section is still being refined.
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

              <div className="rounded-xl border border-dashed border-border/60 bg-background/70 p-3 text-sm text-muted-foreground">
                Work in progress: KPI traceability and fuller reasoning will be added here once the output provides a more stable KPI rationale layer.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card className="rounded-3xl border border-dashed border-destructive/30 bg-destructive/[0.04] shadow-sm">
        <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
          <Badge variant="outline" className="rounded-full border-destructive/30 bg-background/80 px-4 py-1 text-[11px] tracking-[0.18em] text-destructive">
            WORK IN PROGRESS
          </Badge>
          <p className="text-lg font-semibold text-foreground">Critical KPI layer is still being narrowed.</p>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Only the decision-critical KPI set will remain here. Traceability and rationale are still being refined.
          </p>
        </CardContent>
      </Card>

      {criticalKpis.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Critical KPIs
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
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Current status</span>
                    <div className="text-xl font-bold text-foreground break-words line-clamp-2 leading-snug">
                      {kpi.current_value || 'Placeholder'}
                    </div>
                  </div>

                  <div className="rounded-xl border border-dashed border-border/60 bg-background/70 p-3 text-xs text-muted-foreground">
                    Work in progress: the final KPI set will focus on the most decision-critical monitoring points only.
                  </div>

                  <div className="pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground mt-auto">
                    {kpi.evidence_strength ? (
                      <span>{formatConfidenceShorthand(kpi.evidence_strength)}</span>
                    ) : (
                      <span className="text-muted-foreground">Confidence pending</span>
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
      ) : (
        <Card className="rounded-2xl border border-dashed border-border/70 bg-background/70 shadow-sm">
          <CardContent className="p-4 text-sm text-muted-foreground">
            Critical KPIs will be surfaced here once the KPI layer is narrowed to the decision-critical set.
          </CardContent>
        </Card>
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
          <h3 className="text-lg font-semibold text-foreground">Primary and support activities</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
        <Card className="relative overflow-hidden rounded-3xl border border-sky-300/35 bg-card/80 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)] before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-sky-500/80">
          <CardHeader className="pb-3 pt-5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-foreground">Primary Activities</CardTitle>
          </CardHeader>
          <CardContent>
            {valueChain.primary_activities?.length ? (
              <ul className="space-y-3 text-sm">
                {valueChain.primary_activities.map((activity, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 rounded-2xl border border-sky-300/25 bg-background/78 px-4 py-3"
                  >
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-[11px] font-semibold text-sky-700">
                      {idx + 1}
                    </span>
                    <span className="text-foreground">{activity}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No primary activities listed.</p>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-3xl border border-emerald-300/35 bg-card/80 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)] before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-emerald-500/80">
          <CardHeader className="pb-3 pt-5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-foreground">Support Activities</CardTitle>
          </CardHeader>
          <CardContent>
            {valueChain.support_activities?.length ? (
              <ul className="space-y-3 text-sm">
                {valueChain.support_activities.map((activity, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 rounded-2xl border border-emerald-300/25 bg-background/78 px-4 py-3"
                  >
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-semibold text-emerald-700">
                      {idx + 1}
                    </span>
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
        source?.url && getSafeExternalUrl(source.url) ? (
          <a
            key={`${sourceId}-${start}`}
            href={getSafeExternalUrl(source.url)!}
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
    const stats = { high: 0, mediumHigh: 0, medium: 0, low: 0, unknown: 0 };
    forces.forEach((force) => {
      const pressure = normalizeForcePressure(force).toLowerCase();
      if (pressure.includes('medium-high') || pressure.includes('medium–high') || pressure === 'medium high') stats.mediumHigh += 1;
      else if (pressure.includes('high') || pressure.includes('strong')) stats.high += 1;
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
              />
              <SwotQuadrant
                title="Weaknesses"
                items={swotWeaknesses}
                icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}
                onItemClick={(item) => setSelectedSwot({ category: 'Weakness', item })}
                tone="warning"
              />
              <SwotQuadrant
                title="Opportunities"
                items={swotOpportunities}
                icon={<Target className="h-4 w-4 text-blue-500" />}
                onItemClick={(item) => setSelectedSwot({ category: 'Opportunity', item })}
                tone="opportunity"
              />
              <SwotQuadrant
                title="Threats"
                items={swotThreats}
                icon={<Shield className="h-4 w-4 text-destructive" />}
                onItemClick={(item) => setSelectedSwot({ category: 'Threat', item })}
                tone="negative"
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
}: {
  title: string;
  items: (SwotItem | string)[];
  icon: React.ReactNode;
  onItemClick: (item: SwotItem | string) => void;
  tone?: 'positive' | 'negative' | 'neutral' | 'opportunity' | 'warning';
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
        {items.map((item, idx) => {
          const parsed = typeof item === 'string'
            ? splitHeadlineAndBody(item)
            : splitHeadlineAndBody(item.title || item.point || item.description || item.detail || item.evidence || '');
          const description =
            typeof item === 'string'
              ? parsed.description
              : cleanNarrative(item.description || item.detail || item.evidence || parsed.description || '');
          const display = parsed.title || parsed.description || 'Untitled';
          return (
            <li
              key={idx}
              className="cursor-pointer rounded-xl border border-border/30 bg-card/60 p-3 text-xs text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5"
              onClick={() => onItemClick(item)}
            >
              <p className="text-sm font-medium leading-5 text-foreground">{display}</p>
              {description ? (
                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{description}</p>
              ) : (
                <p className="mt-1 text-[11px] text-muted-foreground">Click to expand full evidence</p>
              )}
            </li>
          );
        })}
      </ul>
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
                <Badge variant="outline" className="text-xs px-2.5 py-1 whitespace-nowrap">
                  {(cluster.assumptions || []).length} assumptions
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
              {selectedBlock?.details?.blockKey && (
                <div className="rounded-xl border border-border/50 bg-background/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Why this block matters</p>
                  <p className="mt-1 text-sm text-foreground">
                    {buildingBlockDescriptions[selectedBlock.details.blockKey] || 'Description pending.'}
                  </p>
                </div>
              )}
              {selectedBlock?.confidence && (
                <Badge variant="secondary" className="text-xs">{formatConfidenceShorthand(selectedBlock.confidence)}</Badge>
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
          {Object.entries(buildingBlocks).slice(0, 4).map(([key, value]) => {
            const toneKey = key === 'key_levers' ? 'key_levers' : normalizeBuildingBlockKey(key);
            const blockTone = buildingBlockToneStyles[toneKey] || buildingBlockToneStyles.cross_cutting;
            const summaryArray = Array.isArray((value as any).summary) ? (value as any).summary : [(value as any).summary];

            return (
              <Card
                key={key}
                className={cn(
                  'group relative overflow-hidden rounded-3xl border bg-card/80 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.35)] transition-all hover:-translate-y-1 hover:shadow-[0_24px_50px_-35px_rgba(15,23,42,0.45)] cursor-pointer',
                  blockTone.card,
                  blockTone.accent,
                )}
                onClick={() => {
                  setSelectedBlock({
                    title: formatBuildingBlock(key),
                    summary: summaryArray,
                    confidence: (value as any).confidence,
                    details: { ...(value as any), blockKey: key },
                  });
                }}
              >
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ring-border/60 transition',
                        blockTone.icon,
                      )}>
                        {buildingBlockIcons[key]}
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {key === 'key_levers' ? 'Lever' : 'Building block'}
                        </p>
                        <h4 className="text-sm font-semibold text-foreground">
                          {formatBuildingBlock(key)}
                        </h4>
                      </div>
                    </div>
                    {(value as any).confidence && (
                      <Badge variant="outline" className={cn('text-[10px] uppercase tracking-wide', blockTone.badge)}>
                        {formatConfidenceShorthand((value as any).confidence)}
                      </Badge>
                    )}
                  </div>
                  <p className="rounded-2xl border border-border/40 bg-background/80 px-3 py-2 text-sm font-medium text-foreground">
                    {buildingBlockDescriptions[key] || 'Description pending.'}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {summaryArray[0]}
                  </p>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Click for details
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}

// Signal Card for Assumption Detail
function SignalCard({ signal, type, onClick }: { signal: Signal; type: 'challenging' | 'validating'; onClick: () => void }) {
  const isChallenge = type === 'challenging';
  const parsedSource = parseSignalSource(signal.source || '');
  const sourceLabel = parsedSource.title || parsedSource.domain || signal.source || 'Source not provided';
  const signalHeadline = cleanNarrative(signal.signal_content || signal.strategic_analysis || 'Signal detail unavailable.');
  const signalContext = cleanNarrative(
    signal.signal_content && signal.strategic_analysis && signal.signal_content !== signal.strategic_analysis
      ? signal.strategic_analysis
      : ''
  );
  const combinedScore = signal.outlier_flags?.combined_score ?? signal.impact_score ?? getSignalScore(signal);
  return (
    <Card
      className={cn(
        "mb-3 cursor-pointer rounded-2xl transition-all hover:scale-[1.01] hover:shadow-md",
        isChallenge
          ? "border-2 border-destructive/40 hover:border-destructive/60"
          : "border-2 border-primary/40 hover:border-primary/60"
      )}
      onClick={onClick}
    >
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn(
                "text-xs",
                isChallenge ? "border-destructive/50 text-destructive" : "border-primary/50 text-primary"
              )}>
                {isChallenge ? 'Challenging signal' : 'Validating signal'}
              </Badge>
              <Badge variant="outline" className="text-xs font-mono">
                {signal.related_assumption_id || signal.assumption_id}
              </Badge>
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {signal.time_horizon || 'Horizon n/a'}
              </Badge>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-6 text-foreground break-words">
                {signalHeadline}
              </p>
              {signalContext ? (
                <p className="mt-2 text-sm leading-6 text-muted-foreground break-words">
                  {signalContext}
                </p>
              ) : null}
            </div>
          </div>
          <div className="shrink-0 rounded-2xl border border-border/60 bg-background/80 px-3 py-2 text-right">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Score</p>
            <p className={cn(
              "mt-1 text-lg font-semibold",
              isChallenge ? "text-destructive" : "text-emerald-600"
            )}>
              {combinedScore.toFixed(1)}
            </p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
          <div className="min-w-0 rounded-2xl border border-border/50 bg-background/75 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Source</p>
            <p className="mt-1 text-xs leading-5 text-foreground break-words whitespace-normal">{sourceLabel}</p>
            {parsedSource.domain ? <p className="mt-1 text-[11px] text-muted-foreground break-all">{parsedSource.domain}</p> : null}
          </div>
          <div className="rounded-2xl border border-border/50 bg-background/75 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Signal reading</p>
            <p className={cn("mt-1 text-sm font-medium", isChallenge ? "text-destructive" : "text-emerald-600")}>
              {signal.impact_direction || (isChallenge ? 'Negative pressure' : 'Positive support')}
            </p>
            <p className="mt-3 flex items-center gap-1 text-xs text-primary">
              <ExternalLink className="h-3 w-3" />
              Open signal detail
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SignalBrowserRow({ signal, type, onClick }: { signal: Signal; type: 'challenging' | 'validating'; onClick: () => void }) {
  const isChallenge = type === 'challenging';
  const parsedSource = parseSignalSource(signal.source || '');
  const sourceLabel = parsedSource.title || parsedSource.domain || signal.source || 'Source not provided';
  const signalHeadline = cleanNarrative(signal.signal_content || signal.strategic_analysis || 'Signal detail unavailable.');
  const signalContext = cleanNarrative(
    signal.signal_content && signal.strategic_analysis && signal.signal_content !== signal.strategic_analysis
      ? signal.strategic_analysis
      : ''
  );
  const combinedScore = signal.outlier_flags?.combined_score ?? signal.impact_score ?? getSignalScore(signal);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md",
        isChallenge ? "border-destructive/25 hover:border-destructive/45" : "border-primary/25 hover:border-primary/45"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", isChallenge ? "bg-destructive" : "bg-emerald-500")} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn(
              "text-[11px]",
              isChallenge ? "border-destructive/40 text-destructive" : "border-primary/40 text-primary"
            )}>
              {isChallenge ? 'Challenging' : 'Validating'}
            </Badge>
            <Badge variant="outline" className="text-[11px] font-mono">
              {signal.related_assumption_id || signal.assumption_id}
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              {signal.time_horizon || 'Horizon n/a'}
            </Badge>
          </div>
          <p className="mt-3 text-sm font-semibold leading-6 text-foreground line-clamp-3">
            {signalHeadline}
          </p>
          {signalContext ? (
            <p className="mt-2 text-xs leading-5 text-muted-foreground line-clamp-2">
              {signalContext}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="max-w-full break-words">{sourceLabel}</span>
            <span className={cn("font-medium", isChallenge ? "text-destructive" : "text-emerald-600")}>
              {signal.impact_direction || (isChallenge ? 'Negative pressure' : 'Positive support')}
            </span>
          </div>
        </div>
        <div className="shrink-0 rounded-xl border border-border/60 bg-background/85 px-3 py-2 text-right">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Score</p>
          <p className={cn("mt-1 text-lg font-semibold", isChallenge ? "text-destructive" : "text-emerald-600")}>
            {combinedScore.toFixed(1)}
          </p>
        </div>
      </div>
    </button>
  );
}

// Assumption Detail Modal
function AssumptionDetail({ assumption, onClose, onSignalClick }: {
  assumption: AssumptionWithSignals;
  onClose: () => void;
  onSignalClick: (signal: Signal) => void
}) {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [signalFilter, setSignalFilter] = useState<'all' | 'challenging' | 'validating'>('all');
  const health = assumption.health;
  const { statusColor } = getHealthColor(health);
  const assumptionLabel = getAssumptionDisplayLabel(assumption.id, assumption.statement);
  const total = assumption.validatingSignals.length + assumption.challengingSignals.length;
  const validatingPercent = total > 0 ? Math.round((assumption.validatingSignals.length / total) * 100) : 50;
  const challengingPercent = 100 - validatingPercent;
  const challengingCount = health?.negative_signals ?? assumption.challengingSignals.length;
  const validatingCount = health?.positive_signals ?? assumption.validatingSignals.length;

  const sortedChallenging = useMemo(() => {
    return [...assumption.challengingSignals].sort((a, b) => {
      return getSignalScore(b) - getSignalScore(a);
    });
  }, [assumption.challengingSignals]);

  const sortedValidating = useMemo(() => {
    return [...assumption.validatingSignals].sort((a, b) => {
      return getSignalScore(b) - getSignalScore(a);
    });
  }, [assumption.validatingSignals]);

  const feedSignals = useMemo(() => {
    const merged = [
      ...sortedChallenging.map((signal) => ({ signal, type: 'challenging' as const })),
      ...sortedValidating.map((signal) => ({ signal, type: 'validating' as const })),
    ];

    merged.sort((a, b) => getSignalScore(b.signal) - getSignalScore(a.signal));

    if (signalFilter === 'all') return merged;
    return merged.filter((entry) => entry.type === signalFilter);
  }, [sortedChallenging, sortedValidating, signalFilter]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="border-b border-border bg-card shadow-md">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <Button variant="ghost" size="icon" onClick={onClose} className="mt-1">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span
                    className="rounded-md px-3 py-1 font-mono text-xl font-bold"
                    style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
                  >
                    {assumption.id}
                  </span>
                  <Badge variant="secondary" className="text-sm">{assumption.category}</Badge>
                  {health ? (
                    <Badge variant={getStatusBadgeVariant(health.verification_status)} className="text-sm">
                      {health.verification_status}
                    </Badge>
                  ) : null}
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Assumption detail
                  </p>
                  <h2 className="mt-2 max-w-4xl text-xl font-semibold text-foreground">{assumptionLabel}</h2>
                  <div className="mt-3 max-w-5xl rounded-2xl border border-border/60 bg-background/80 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Full assumption wording
                    </p>
                    <p className="mt-2 text-sm leading-7 text-foreground">
                      {assumption.statement}
                    </p>
                  </div>
                </div>

                {assumption.supports_building_blocks?.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Key building blocks:</span>
                    {assumption.supports_building_blocks.map((block) => (
                      <Badge key={block} className="flex items-center gap-1 border-0 bg-primary/10 text-xs text-primary">
                        {buildingBlockIcons[block] || null}
                        {formatBuildingBlock(block)}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                <div className="max-w-3xl rounded-2xl border border-border/60 bg-background/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Signal mix</p>
                      <p className="mt-1 text-sm text-foreground">
                        Structured view of the evidence currently linked to this assumption.
                      </p>
                    </div>
                    <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-wide">
                      {total} linked signals
                    </Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="h-3 w-3 rounded-full bg-destructive" />
                      <span className="text-muted-foreground">{challengingCount} challenging</span>
                    </div>
                    <div className="flex-1 rounded-full border border-border bg-background">
                      <div className="flex h-2.5 overflow-hidden rounded-full">
                        <div className="bg-destructive transition-all" style={{ width: `${challengingPercent}%` }} />
                        <div className="bg-primary transition-all" style={{ width: `${validatingPercent}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="h-3 w-3 rounded-full bg-primary" />
                      <span className="text-muted-foreground">{validatingCount} validating</span>
                    </div>
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

      <div className="px-4 py-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <Collapsible open={showFullDescription} onOpenChange={setShowFullDescription}>
            <Card className="rounded-3xl border border-border/60 bg-card/80 shadow-sm">
              <CollapsibleTrigger asChild>
                <button type="button" className="w-full text-left">
                  <CardHeader className="pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-base">Context and rationale</CardTitle>
                        <CardDescription className="mt-1 text-sm">
                          Open the supporting rationale, evidence base, historical validity, and failure scenario behind this assumption.
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-2 text-xs font-medium text-foreground">
                        <span>{showFullDescription ? 'Hide context' : 'Open context'}</span>
                        <ChevronDown className={cn('h-4 w-4 transition-transform', showFullDescription ? 'rotate-180' : '')} />
                      </div>
                    </div>
                  </CardHeader>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-border/50 bg-background/80 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Why it matters</p>
                    <p className="mt-2 text-sm text-foreground">
                      {assumption.why_it_matters || 'Placeholder: fuller strategic rationale still needs to be added to the output.'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-background/80 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Evidence base</p>
                    <p className="mt-2 text-sm text-foreground">
                      {assumption.evidence_base || 'Placeholder: evidence base still needs to be expanded.'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-background/80 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Historical validity</p>
                    <p className="mt-2 text-sm text-foreground">
                      {assumption.historical_validity || 'Placeholder: historical validity is not yet available.'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-background/80 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Failure scenario</p>
                    <p className="mt-2 text-sm text-foreground">
                      {assumption.failure_scenario || 'Placeholder: failure scenario is still work in progress.'}
                    </p>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {health ? (
            <Card className="overflow-hidden rounded-3xl border-2 shadow-sm" style={{ borderColor: statusColor }}>
              <CardHeader className="border-b border-border/60 bg-card/80 pb-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5" style={{ color: statusColor }} />
                      <CardTitle className="text-lg">Assumption Health Analysis</CardTitle>
                      <Badge variant={getStatusBadgeVariant(health.verification_status)} className="text-[11px]">
                        {health.verification_status}
                      </Badge>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Clear read on the current assumption posture: overall verdict, what supports it, what pushes back, and where the key risk sits.
                    </p>
                  </div>

                  <div className="grid min-w-[280px] grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-border/60 bg-background/90 p-3 text-right">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Net impact</p>
                      <p
                        className={cn(
                          'mt-2 text-2xl font-semibold',
                          health.net_impact_score < 0 ? 'text-destructive' : 'text-emerald-600',
                        )}
                      >
                        {health.net_impact_score > 0 ? '+' : ''}
                        {health.net_impact_score.toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/90 p-3 text-right">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Confidence</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {Math.round(health.confidence_score * 100)}%
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/90 p-3 text-right">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Signal volume</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{health.signal_volume}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 p-5">
                <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
                  <div className="rounded-2xl border border-border/60 bg-background/90 p-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" style={{ color: statusColor }} />
                      <h4 className="text-sm font-semibold text-foreground">Strategic verdict</h4>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-foreground">{health.strategic_verdict}</p>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-background/90 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Signal balance
                        </p>
                        <p className="mt-1 text-sm text-foreground">
                          {health.negative_signals} challenging vs {health.positive_signals} validating
                        </p>
                      </div>
                      <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px]">
                        {health.signal_volume} total
                      </Badge>
                    </div>
                    <div className="mt-4">
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Negative pressure</span>
                        <span>{Math.round(challengingPercent)}%</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-border/60">
                        <div className="h-full rounded-full bg-destructive" style={{ width: `${challengingPercent}%` }} />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Positive support</span>
                        <span>{Math.round(validatingPercent)}%</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-border/60">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${validatingPercent}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-500/35 bg-background/90 p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <h4 className="text-sm font-semibold text-emerald-700">Validating evidence</h4>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-foreground">
                      {health.supporting_evidence_analysis || 'No validating evidence summary available yet.'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-destructive/35 bg-background/90 p-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <h4 className="text-sm font-semibold text-destructive">Challenging evidence</h4>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-foreground">
                      {health.challenging_evidence_analysis || 'No challenging evidence summary available yet.'}
                    </p>
                  </div>
                </div>

                {health.key_risk_factors.length > 0 ? (
                  <div className="rounded-2xl border border-border/60 bg-background/90 p-4">
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Key risk factors
                    </h4>
                    <div className="grid gap-2 md:grid-cols-2">
                      {health.key_risk_factors.map((risk, idx) => (
                        <div key={idx} className="rounded-xl border border-destructive/20 px-3 py-3">
                          <div className="flex items-start gap-2">
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-destructive" />
                            <p className="text-sm leading-6 text-foreground">{risk}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-3xl border border-border/60 bg-card/90 shadow-sm">
            <CardHeader className="gap-5 border-b border-border/60 pb-5">
              <div>
                <CardTitle className="text-lg">Evidence signals</CardTitle>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setSignalFilter('all')}
                  className={cn(
                    "rounded-2xl border bg-background/85 p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm",
                    signalFilter === 'all' ? "border-foreground/30 ring-1 ring-foreground/10" : "border-border/60"
                  )}
                >
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total linked signals</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{total}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setSignalFilter('challenging')}
                  className={cn(
                    "rounded-2xl border bg-background/85 p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm",
                    signalFilter === 'challenging' ? "border-destructive/45 ring-1 ring-destructive/15" : "border-destructive/25"
                  )}
                >
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Challenging</p>
                  <p className="mt-2 text-2xl font-semibold text-destructive">{assumption.challengingSignals.length}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setSignalFilter('validating')}
                  className={cn(
                    "rounded-2xl border bg-background/85 p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm",
                    signalFilter === 'validating' ? "border-primary/45 ring-1 ring-primary/15" : "border-primary/25"
                  )}
                >
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Validating</p>
                  <p className="mt-2 text-2xl font-semibold text-primary">{assumption.validatingSignals.length}</p>
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-5">
              <div className="rounded-2xl border border-border/60 bg-background/90">
                <ScrollArea className="h-[72vh] px-5 py-5">
                  {feedSignals.length === 0 ? (
                    <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 text-center">
                      <p className="text-sm text-muted-foreground">No signals available in this view.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {feedSignals.map(({ signal, type }) => (
                        <SignalBrowserRow
                          key={`${type}-${signal.signal_id}`}
                          signal={signal}
                          type={type}
                          onClick={() => onSignalClick(signal)}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Legacy Assumption Detail Modal
function LegacyAssumptionDetail({ assumption, onClose, onSignalClick }: {
  assumption: AssumptionWithSignals;
  onClose: () => void;
  onSignalClick: (signal: Signal) => void
}) {
  const [scoreSort, setScoreSort] = useState<'desc' | 'asc'>('desc');
  const [showFullDescription, setShowFullDescription] = useState(false);
  const health = assumption.health;
  const { borderColor, statusColor } = getHealthColor(health);
  const assumptionLabel = getAssumptionDisplayLabel(assumption.id, assumption.statement);
  const total = assumption.validatingSignals.length + assumption.challengingSignals.length;
  const validatingPercent = total > 0 ? Math.round((assumption.validatingSignals.length / total) * 100) : 50;
  const challengingPercent = 100 - validatingPercent;
  const challengingCount = health?.negative_signals ?? assumption.challengingSignals.length;
  const validatingCount = health?.positive_signals ?? assumption.validatingSignals.length;

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
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Assumption detail
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-foreground max-w-4xl">{assumptionLabel}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground max-w-4xl">
                    Use the sections below to open the full assumption wording, review the verdict, and inspect the supporting signals.
                  </p>
                </div>

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

                <div className="mt-3 max-w-3xl rounded-2xl border border-border/60 bg-background/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="h-3 w-3 rounded-full bg-destructive" />
                      <span className="text-muted-foreground">{challengingCount} challenging</span>
                    </div>
                    <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-wide">
                      {total} linked signals
                    </Badge>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="h-3 w-3 rounded-full bg-primary" />
                      <span className="text-muted-foreground">{validatingCount} validating</span>
                    </div>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full border border-border bg-background">
                    <div className="flex h-full">
                      <div className="bg-destructive transition-all" style={{ width: `${challengingPercent}%` }} />
                      <div className="bg-primary transition-all" style={{ width: `${validatingPercent}%` }} />
                    </div>
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
          <Collapsible open={showFullDescription} onOpenChange={setShowFullDescription}>
            <Card className="rounded-3xl border border-border/60 bg-card/80 shadow-sm">
              <CollapsibleTrigger asChild>
                <button type="button" className="w-full text-left">
                  <CardHeader className="pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-base">Full assumption description</CardTitle>
                        <CardDescription className="mt-1 text-sm">
                          Keep the main view focused on the verdict and signals, and open this section when you want the full wording and rationale.
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-2 text-xs font-medium text-foreground">
                        <span>{showFullDescription ? 'Hide full framing' : 'Open full framing'}</span>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", showFullDescription ? "rotate-180" : "")} />
                      </div>
                    </div>
                  </CardHeader>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-border/50 bg-background/80 p-4 lg:col-span-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Full statement</p>
                    <p className="mt-2 text-sm leading-7 text-foreground">{assumption.statement}</p>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-background/80 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Why it matters</p>
                    <p className="mt-2 text-sm text-foreground">
                      {assumption.why_it_matters || 'Placeholder: fuller strategic rationale still needs to be added to the output.'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-background/80 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Evidence base</p>
                    <p className="mt-2 text-sm text-foreground">
                      {assumption.evidence_base || 'Placeholder: evidence base still needs to be expanded.'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-background/80 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Historical validity</p>
                    <p className="mt-2 text-sm text-foreground">
                      {assumption.historical_validity || 'Placeholder: historical validity is not yet available.'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-background/80 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Failure scenario</p>
                    <p className="mt-2 text-sm text-foreground">
                      {assumption.failure_scenario || 'Placeholder: failure scenario is still work in progress.'}
                    </p>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Health Analysis Section */}
          {health && (
            <Card className="overflow-hidden rounded-3xl border-2 shadow-sm" style={{ borderColor: statusColor }}>
              <CardHeader className="border-b border-border/60 bg-card/80 pb-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5" style={{ color: statusColor }} />
                      <CardTitle className="text-lg">Assumption Health Analysis</CardTitle>
                      <Badge variant={getStatusBadgeVariant(health.verification_status)} className="text-[11px]">
                        {health.verification_status}
                      </Badge>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Clear read on the current assumption posture: overall verdict, what supports it, what pushes back, and where the key risk sits.
                    </p>
                  </div>

                  <div className="grid min-w-[280px] grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-border/60 bg-background/90 p-3 text-right">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Net impact</p>
                      <p
                        className={cn(
                          'mt-2 text-2xl font-semibold',
                          health.net_impact_score < 0 ? 'text-destructive' : 'text-emerald-600',
                        )}
                      >
                        {health.net_impact_score > 0 ? '+' : ''}
                        {health.net_impact_score.toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/90 p-3 text-right">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Confidence</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {Math.round(health.confidence_score * 100)}%
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/90 p-3 text-right">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Signal volume</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{health.signal_volume}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 p-5">
                <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
                  <div className="rounded-2xl border border-border/60 bg-background/90 p-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" style={{ color: statusColor }} />
                      <h4 className="text-sm font-semibold text-foreground">Strategic verdict</h4>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-foreground">{health.strategic_verdict}</p>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-background/90 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Signal balance
                        </p>
                        <p className="mt-1 text-sm text-foreground">
                          {health.negative_signals} challenging vs {health.positive_signals} validating
                        </p>
                      </div>
                      <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px]">
                        {health.signal_volume} total
                      </Badge>
                    </div>
                    <div className="mt-4">
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Negative pressure</span>
                        <span>{Math.round(challengingPercent)}%</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-border/60">
                        <div className="h-full rounded-full bg-destructive" style={{ width: `${challengingPercent}%` }} />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Positive support</span>
                        <span>{Math.round(validatingPercent)}%</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-border/60">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${validatingPercent}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-500/35 bg-background/90 p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <h4 className="text-sm font-semibold text-emerald-700">Validating evidence</h4>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-foreground">
                      {health.supporting_evidence_analysis || 'No validating evidence summary available yet.'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-destructive/35 bg-background/90 p-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <h4 className="text-sm font-semibold text-destructive">Challenging evidence</h4>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-foreground">
                      {health.challenging_evidence_analysis || 'No challenging evidence summary available yet.'}
                    </p>
                  </div>
                </div>

                {health.key_risk_factors.length > 0 && (
                  <div className="rounded-2xl border border-border/60 bg-background/90 p-4">
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Key risk factors
                    </h4>
                    <div className="grid gap-2 md:grid-cols-2">
                      {health.key_risk_factors.map((risk, idx) => (
                        <div key={idx} className="rounded-xl border border-destructive/20 px-3 py-3">
                          <div className="flex items-start gap-2">
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-destructive" />
                            <p className="text-sm leading-6 text-foreground">{risk}</p>
                          </div>
                        </div>
                      ))}
                    </div>
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
function CoreAssumptionsSection({
  onAssumptionClick,
  focusAssumptionId,
}: {
  onAssumptionClick: (a: AssumptionWithSignals) => void;
  focusAssumptionId?: string | null;
}) {
  const { data, coreAssumptions, allSignals } = useForesight();
  const [statusFilter, setStatusFilter] = useState<'all' | 'AT RISK' | 'MIXED' | 'VALIDATED'>('all');
  const [impactSort, setImpactSort] = useState<'desc' | 'asc' | 'id'>('desc');
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [showSpider, setShowSpider] = useState(false);
  const [groupMode, setGroupMode] = useState<'building_blocks' | 'dependency_clusters'>('building_blocks');
  const [clusterFilter, setClusterFilter] = useState<string>('all');
  const clusters = data?.strategy_context?.assumption_dependencies?.critical_clusters || [];

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
      if (clusterFilter !== 'all') {
        const selectedCluster = clusters.find((cluster) => cluster.cluster_name === clusterFilter);
        if (!selectedCluster || !(selectedCluster.assumptions || []).includes(assumption.id)) {
          return false;
        }
      }
      return true;
    });
  }, [assumptionsWithSignals, statusFilter, typeFilter, clusterFilter, clusters]);

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

  useEffect(() => {
    if (!focusAssumptionId) return;
    const focusedAssumption = assumptionById.get(focusAssumptionId);
    if (focusedAssumption) {
      onAssumptionClick(focusedAssumption);
    }
  }, [focusAssumptionId, assumptionById, onAssumptionClick]);

  const spiderAssumptions = useMemo(() => {
    return filteredAssumptions.map((assumption) => ({
      id: assumption.id,
      statement: assumption.statement,
      displayLabel: getAssumptionDisplayLabel(assumption.id, assumption.statement, 4),
      category: assumption.category,
      supports_building_blocks: assumption.supports_building_blocks,
      health: assumption.health,
      challengingSignals: assumption.challengingSignals,
      validatingSignals: assumption.validatingSignals,
    }));
  }, [filteredAssumptions]);

  const groupedAssumptions = useMemo(() => {
    const canonicalBlock = (block?: string) => {
      if (!block) return 'cross_cutting';
      if (block === 'Strategic_defence' || block === 'Strategic_defense') return 'value_defence';
      return block;
    };

    const groups = sortedAssumptions.reduce((acc, assumption) => {
      const key = canonicalBlock(assumption.supports_building_blocks?.[0]);
      const list = acc.get(key) || [];
      list.push(assumption);
      acc.set(key, list);
      return acc;
    }, new Map<string, AssumptionWithSignals[]>());

    return [
      { key: 'value_creation', label: 'Value Creation', assumptions: groups.get('value_creation') || [] },
      {
        key: 'direction_and_positioning',
        label: 'Direction & Positioning',
        assumptions: groups.get('direction_and_positioning') || [],
      },
      { key: 'value_defence', label: 'Strategic Defence', assumptions: groups.get('value_defence') || [] },
    ];
  }, [sortedAssumptions]);

  const clusterGroups = useMemo(() => {
    const visibleClusters =
      clusterFilter === 'all'
        ? clusters
        : clusters.filter((cluster) => cluster.cluster_name === clusterFilter);

    return visibleClusters.map((cluster) => ({
      ...cluster,
      assumptions: sortedAssumptions.filter((assumption) => (cluster.assumptions || []).includes(assumption.id)),
    }));
  }, [clusters, sortedAssumptions, clusterFilter]);

  if (assumptionsWithSignals.length === 0) return null;

  const renderAssumptionCard = (assumption: AssumptionWithSignals) => {
    const health = assumption.health;
    const { borderColor, statusColor } = getHealthColor(health);
    const positiveSignals = health?.positive_signals ?? assumption.validatingSignals.length;
    const negativeSignals = health?.negative_signals ?? assumption.challengingSignals.length;
    const totalSignals = positiveSignals + negativeSignals;
    const negativePercent = totalSignals > 0 ? (negativeSignals / totalSignals) * 100 : 50;
    const positivePercent = 100 - negativePercent;
    const computedImpact =
      assumption.validatingSignals.reduce((sum, signal) => sum + getSignalScore(signal), 0) -
      assumption.challengingSignals.reduce((sum, signal) => sum + getSignalScore(signal), 0);
    const impactScore = health?.net_impact_score ?? computedImpact;

    return (
      <Card
        key={assumption.id}
        className="cursor-pointer rounded-xl bg-card transition-all hover:scale-[1.01]"
        style={{ borderWidth: '3px', borderColor }}
        onClick={() => onAssumptionClick(assumption)}
      >
        <CardContent className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold" style={{ color: statusColor }}>{assumption.id}</span>
                {health && (
                  <Badge variant={getStatusBadgeVariant(health.verification_status)} className="text-xs">
                    {health.verification_status}
                  </Badge>
                )}
              </div>
              <p className="text-sm font-semibold text-foreground">
                {getAssumptionDisplayLabel(assumption.id, assumption.statement, 4)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Net impact</span>
              <div className={cn('text-xl font-semibold', impactScore < 0 ? 'text-destructive' : 'text-emerald-500')}>
                {impactScore > 0 ? '+' : ''}
                {impactScore.toFixed(2)}
              </div>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">{assumption.statement}</p>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Type</span>
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-[12px] capitalize">
              {assumption.category}
            </Badge>
          </div>

          {totalSignals > 0 && (
            <div className="border-t border-border/50 pt-3">
              <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  Challenging
                  <span className="font-medium text-foreground">{negativeSignals}</span>
                </span>
                <span className="flex items-center gap-1">
                  Validating
                  <span className="font-medium text-foreground">{positiveSignals}</span>
                </span>
              </div>
              <div className="flex h-1.5 overflow-hidden rounded-full border border-border">
                <div className="bg-destructive" style={{ width: `${negativePercent}%` }} />
                <div className="bg-primary" style={{ width: `${positivePercent}%` }} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border/60 bg-card/70 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-md font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            Core Assumptions ({sortedAssumptions.length}/{assumptionsWithSignals.length})
          </h3>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-full px-4 text-[11px]"
            onClick={() => setShowSpider((prev) => !prev)}
          >
            {showSpider ? 'Hide spider view' : 'Show spider view'}
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">View:</span>
            <div className="flex items-center gap-1 rounded-full border border-border/60 bg-background/80 p-1">
              {[
                { value: 'building_blocks', label: 'Strategic blocks' },
                { value: 'dependency_clusters', label: 'Dependency clusters' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGroupMode(option.value as typeof groupMode)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-medium transition",
                    groupMode === option.value
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Filter:</span>
            <div className="flex items-center gap-1 rounded-full border border-border/60 bg-background/80 p-1">
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
            <div className="flex items-center gap-1 rounded-full border border-border/60 bg-background/80 p-1">
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

        {clusters.length > 0 ? (
          <div className="mt-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">Dependency filter:</span>
              <button
                type="button"
                onClick={() => setClusterFilter('all')}
                className={cn(
                  'rounded-full border px-3 py-1 text-[11px] transition',
                  clusterFilter === 'all'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border/60 bg-background/80 text-muted-foreground hover:text-foreground',
                )}
              >
                All clusters
              </button>
              {clusters.map((cluster) => (
                <button
                  key={cluster.cluster_name}
                  type="button"
                  onClick={() => setClusterFilter(cluster.cluster_name)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-[11px] transition',
                    clusterFilter === cluster.cluster_name
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border/60 bg-background/80 text-muted-foreground hover:text-foreground',
                  )}
                >
                  {cluster.cluster_name}
                </button>
              ))}
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Use dependency clusters to sort assumptions by the dependency groups they belong to.
            </p>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <LinkIcon className="h-3 w-3" />
            Open any assumption to move into the full detail view with scoring and linked signals.
          </span>
        </div>
      </div>

      {showSpider ? (
        <AssumptionSpiderCharts
          assumptions={spiderAssumptions}
          title="Assumption score comparison"
          subtitle="The spider is available as a secondary visual. The primary view below stays organized by strategic building-block logic."
          defaultMode="assumptions"
          onAssumptionClick={(assumption) => {
            const fullAssumption = assumptionById.get(assumption.id);
            if (fullAssumption) {
              onAssumptionClick(fullAssumption);
            }
          }}
        />
      ) : null}

      {sortedAssumptions.length === 0 ? (
        <div className="text-sm text-muted-foreground">No assumptions match this view and filter set.</div>
      ) : groupMode === 'dependency_clusters' ? (
        clusterGroups.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {clusterGroups.map((cluster) => (
              <Card key={cluster.cluster_name} className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm">{cluster.cluster_name || 'Dependency cluster'}</CardTitle>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {cluster.description || 'Cluster description not provided yet.'}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[11px]">
                      {cluster.assumptions.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {cluster.assumptions.length > 0 ? (
                    cluster.assumptions.map(renderAssumptionCard)
                  ) : (
                    <p className="text-sm text-muted-foreground">No assumptions match this dependency cluster and filter set.</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="rounded-2xl border border-dashed border-border/70 bg-background/70 shadow-sm">
            <CardContent className="p-4 text-sm text-muted-foreground">
              Dependency cluster grouping is not available in the current output.
            </CardContent>
          </Card>
        )
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {groupedAssumptions.map((group) => (
            <Card key={group.key} className="rounded-2xl border border-border/60 bg-card/70 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm">{group.label}</CardTitle>
                  <Badge variant="outline" className="text-[11px]">
                    {group.assumptions.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.assumptions.length > 0 ? group.assumptions.map(renderAssumptionCard) : (
                  <p className="text-sm text-muted-foreground">No assumptions currently mapped to this block.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
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
    </div>
  );
}

export function AssumptionsAnalysis({
  focusAssumptionId,
  onFocusAssumptionConsumed,
}: {
  focusAssumptionId?: string | null;
  onFocusAssumptionConsumed?: () => void;
}) {
  const { threatIds, opportunityIds, warningIds } = useForesight();
  const [selectedAssumption, setSelectedAssumption] = useState<AssumptionWithSignals | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);

  useEffect(() => {
    if (!focusAssumptionId) return;
    onFocusAssumptionConsumed?.();
  }, [focusAssumptionId, onFocusAssumptionConsumed]);

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

      <CoreAssumptionsSection
        onAssumptionClick={setSelectedAssumption}
        focusAssumptionId={focusAssumptionId}
      />
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
