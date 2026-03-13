import { useMemo, useState, type ReactNode } from 'react';
import { useForesight } from '@/contexts/ForesightContext';
import {
  StrategicImpactAnalysisPayload,
  StrategicImpactBreakpoint,
  StrategicImpactEvidenceLinks,
  StrategicImpactMove,
  StrategicImpactObjective,
  StrategicImpactPathwayLit,
  StrategicImpactTruthTableEntry,
  Signal,
} from '@/types/foresight';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SignalDetailDialog } from '@/components/SignalDetailDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { parseSignalSource } from '@/lib/signal-utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowRight,
  AlertTriangle,
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Filter,
  Flame,
  Layers,
  Link2,
  List,
  PackageCheck,
  ShieldAlert,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const statusVariantMap: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  off_track_risk: 'destructive',
  high_risk: 'destructive',
  strongly_negative: 'destructive',
  most_negative_net_impact: 'destructive',
  net_negative: 'secondary',
  mildly_negative: 'secondary',
  at_risk: 'destructive',
  mixed: 'outline',
  validated: 'default',
  validated_directionally: 'outline',
  opportunity_with_volatility: 'default',
};

const horizonLabels: Record<string, string> = {
  '0-90_days': '0-90 days',
  '3-12_months': '3-12 months',
  '12-24_months': '12-24 months',
};

const activationLabelMap: Record<string, string> = {
  strongly_activated: 'Strongly activated',
  activated: 'Activated',
  elevated: 'Elevated',
  watch: 'Watchlist',
};

const strategicConclusionSectionOrder = [
  'executive_summary',
  'current_state_diagnosis',
  'future_relevance_analysis',
  'bull_bear_synthesis',
  'strategic_recommendation',
];

const strategicConclusionSectionTriggers = [
  'executive_summary',
  'current_state_diagnosis',
  'future_relevance_analysis',
  'strategic_recommendation',
];

const strategicConclusionLegacyOrder = [
  'executive_conclusion',
  'short_term_implication',
  'what_is_breaking',
  'what_does_not_need_to_change',
  'what_must_change',
  'macro_verdict',
  'final_verdict',
  'board_level_implication',
  'devils_advocate',
];

const formatLabel = (value?: string) => (value || '').replace(/_/g, ' ');

function StatusPill({
  label,
  variant = 'outline',
  className,
}: {
  label: string;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
  className?: string;
}) {
  return (
    <Badge
      variant={variant}
      className={cn(
        "px-3 py-1 text-[11px] font-semibold tracking-wide whitespace-nowrap",
        className
      )}
    >
      {label}
    </Badge>
  );
}

const normalizeSignalIds = (signalIds?: StrategicImpactEvidenceLinks['signal_ids']) => {
  if (!signalIds) return [];
  if (Array.isArray(signalIds)) return signalIds;
  const seen = new Set<string>();
  const orderedKeys = ['threats', 'opportunities', 'watchlist'];
  const pushIds = (ids?: string[]) => {
    ids?.forEach(id => {
      if (!seen.has(id)) {
        seen.add(id);
      }
    });
  };
  orderedKeys.forEach(key => pushIds(signalIds[key]));
  Object.keys(signalIds)
    .filter(key => !orderedKeys.includes(key))
    .forEach(key => pushIds(signalIds[key]));
  return Array.from(seen);
};

const getSignalTitle = (signal?: Signal | null) =>
  signal?.signal_content || signal?.strategic_analysis || signal?.source || signal?.signal_id || 'Signal';

const slugifyHeading = (text: string, counter: Map<string, number>) => {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const count = counter.get(base) || 0;
  counter.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
};

const extractText = (children: ReactNode) => {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(extractText).join('');
  return '';
};

const buildConclusionMarkdown = (
  conclusion: Record<string, unknown>,
  orderedKeys: string[],
  skipKeys?: Set<string>,
) => {
  const seen = new Set<string>();
  const blocks: string[] = [];
  orderedKeys.forEach(key => {
    if (seen.has(key) || skipKeys?.has(key)) return;
    const value = conclusion[key];
    if (typeof value === 'string' && value.trim()) {
      blocks.push(value);
      seen.add(key);
    }
  });
  Object.entries(conclusion).forEach(([key, value]) => {
    if (seen.has(key) || skipKeys?.has(key)) return;
    if (typeof value === 'string' && value.trim()) {
      blocks.push(value);
    }
  });
  return blocks.join('\n\n');
};

const buildEvidenceContext = (objective?: StrategicImpactObjective, breakpoint?: StrategicImpactBreakpoint) => {
  const assumptions = new Set<string>();
  const pathways = new Set<string>();
  const objectives = new Set<string>();

  objective?.impact_pathways_lit?.forEach(path => {
    if (path.pathway_id) pathways.add(path.pathway_id);
  });
  if (objective?.objective_id) objectives.add(objective.objective_id);

  breakpoint?.linked_pathways?.forEach(path => {
    if (path.pathway_id) pathways.add(path.pathway_id);
  });
  breakpoint?.why_happening?.forEach(reason => {
    if (reason.assumption_id) assumptions.add(reason.assumption_id);
    if (reason.pathway_id) pathways.add(reason.pathway_id);
  });

  return { assumptions, pathways, objectives };
};

function AssumptionBadge({
  id,
  label,
  active,
  onClick,
  className,
}: {
  id: string;
  label?: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button type="button" onClick={onClick} className={cn('text-left', className)}>
      <Badge variant={active ? 'default' : 'outline'} className="text-xs font-mono">
        {label ? `${id}: ${label}` : id}
      </Badge>
    </button>
  );
}

function PathwayBadge({
  id,
  label,
  active,
  onClick,
  className,
}: {
  id: string;
  label?: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button type="button" onClick={onClick} className={cn('text-left', className)}>
      <Badge variant={active ? 'default' : 'outline'} className="text-xs font-mono">
        {label ? `${id}: ${label}` : id}
      </Badge>
    </button>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <FileText className="h-10 w-10 text-muted-foreground mb-3" />
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-lg">{description}</p>
    </div>
  );
}

function SummaryPage({
  impactData,
  companyName,
  asOfDate,
  strategyIntent,
}: {
  impactData: StrategicImpactAnalysisPayload;
  companyName: string;
  asOfDate: string;
  strategyIntent: string;
}) {
  const diagnosis = impactData.executive_diagnosis;
  const diagnosisAny = (diagnosis || {}) as Record<string, unknown>;
  const objectives = impactData.objective_scoreboard?.objectives || [];
  const breakpoints = impactData.breakpoints || [];
  const [showAllSummary, setShowAllSummary] = useState(false);
  const summaryParagraphs = diagnosis?.summary_paragraphs || [];
  const visibleSummary = showAllSummary ? summaryParagraphs : summaryParagraphs.slice(0, 2);
  const bottomLineVerdict =
    diagnosis?.bottom_line_verdict ||
    (typeof diagnosisAny.verdict === 'string' ? diagnosisAny.verdict : '');
  const diagnosticConclusion = diagnosis?.diagnostic_conclusion;
  const suspicion = !Array.isArray(diagnosis?.state_of_suspicion) ? diagnosis?.state_of_suspicion : undefined;
  const suspicionList = Array.isArray(diagnosis?.state_of_suspicion) ? diagnosis.state_of_suspicion : [];
  const insideOutFindings = diagnosis?.inside_out_findings || [];
  const outsideInFindings = diagnosis?.outside_in_findings || [];
  const hardDataAnchors = Array.isArray(diagnosisAny.hard_data_anchors)
    ? (diagnosisAny.hard_data_anchors as Array<{ metric?: string; value?: string; source?: string }>)
    : [];
  const systemicCascadeSummary =
    typeof diagnosisAny.systemic_cascade_summary === 'string' ? diagnosisAny.systemic_cascade_summary : '';
  const hasStructuredDiagnosis =
    !!bottomLineVerdict ||
    !!diagnosticConclusion ||
    !!suspicion?.core_concern ||
    !!suspicion?.why_now ||
    suspicionList.length > 0;
  const hasFindings = insideOutFindings.length > 0 || outsideInFindings.length > 0;
  const assumptionHealth = impactData.objective_scoreboard?.assumption_health_summary;
  const hardDataFlags = impactData.objective_scoreboard?.hard_data_flags || [];
  const mergedHardDataFlags =
    hardDataFlags.length > 0
      ? hardDataFlags
      : hardDataAnchors.map(anchor => ({
          metric_or_signal: anchor.metric || 'Hard data anchor',
          value: anchor.value || '',
          why_it_matters: anchor.source || '',
        }));

  return (
    <div className="space-y-6">
      <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
        <CardContent className="p-6 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className="text-xs">
              {companyName || 'Company'}
            </Badge>
            {asOfDate ? (
              <Badge variant="outline" className="text-xs">
                As of {asOfDate}
              </Badge>
            ) : null}
          </div>
          <h2 className="text-lg font-semibold text-foreground">Strategic intent</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {strategyIntent || 'No strategy intent available in this payload.'}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Executive diagnosis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {summaryParagraphs.length > 0 ? (
            <>
              {visibleSummary.map((paragraph, idx) => (
                <p key={idx} className="leading-relaxed">
                  {paragraph}
                </p>
              ))}
              {summaryParagraphs.length > 2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setShowAllSummary(prev => !prev)}
                >
                  {showAllSummary ? 'Show less' : 'Show more'}
                </Button>
              )}
            </>
          ) : hasStructuredDiagnosis ? (
            <div className="space-y-4">
              {bottomLineVerdict && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    Bottom-line verdict
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">{bottomLineVerdict}</p>
                </div>
              )}
              {(suspicion?.core_concern || suspicion?.why_now || suspicionList.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {suspicion?.core_concern && (
                    <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Core concern
                      </p>
                      <p className="text-sm text-foreground mt-1">{suspicion.core_concern}</p>
                    </div>
                  )}
                  {suspicion?.why_now && (
                    <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why now</p>
                      <p className="text-sm text-foreground mt-1">{suspicion.why_now}</p>
                    </div>
                  )}
                  {suspicionList.length > 0 && (
                    <div className="p-3 rounded-xl bg-muted/30 border border-border/50 md:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        State of suspicion
                      </p>
                      <ul className="mt-2 space-y-1">
                        {suspicionList.map((point, idx) => (
                          <li key={`suspicion-${idx}`} className="text-sm text-foreground flex items-start gap-2">
                            <ChevronRight className="h-3 w-3 mt-1 text-primary" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {diagnosticConclusion && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    Diagnostic conclusion
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">{diagnosticConclusion}</p>
                </div>
              )}
              {systemicCascadeSummary && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    Systemic cascade summary
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">{systemicCascadeSummary}</p>
                </div>
              )}
            </div>
          ) : (
            <p>No executive summary paragraphs provided.</p>
          )}
        </CardContent>
      </Card>

      {hasFindings ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Inside-out findings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {insideOutFindings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No inside-out findings provided.</p>
              ) : (
                insideOutFindings.map((finding, idx) => (
                  <div key={`inside-${idx}`} className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2">
                    {finding.finding && <p className="text-sm font-semibold text-foreground">{finding.finding}</p>}
                    {finding.hard_data_anchors && finding.hard_data_anchors.length > 0 && (
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {finding.hard_data_anchors.map(anchor => (
                          <li key={anchor} className="flex items-start gap-2">
                            <ChevronRight className="h-3 w-3 mt-0.5 text-primary" />
                            <span>{anchor}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {finding.implication && <p className="text-xs text-muted-foreground">{finding.implication}</p>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-primary" />
                Outside-in findings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {outsideInFindings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No outside-in findings provided.</p>
              ) : (
                outsideInFindings.map((finding, idx) => (
                  <div key={`outside-${idx}`} className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2">
                    {finding.finding && <p className="text-sm font-semibold text-foreground">{finding.finding}</p>}
                    {finding.implication && <p className="text-xs text-muted-foreground">{finding.implication}</p>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Impact chains
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(diagnosis?.dominant_feedback_loops || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No feedback loops provided.</p>
              ) : (
                diagnosis?.dominant_feedback_loops?.map(loop => (
                  <div key={loop.loop_id} className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">{loop.title}</p>
                    {loop.nodes && loop.nodes.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {loop.nodes.map((node, idx) => (
                          <div key={`${loop.loop_id}-${node.id}`} className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs font-mono">
                              {node.label}
                            </Badge>
                            {idx < loop.nodes.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">{loop.chain_text}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-primary" />
                Constraints
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3">
              {(diagnosis?.constraints || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No constraints defined.</p>
              ) : (
                diagnosis?.constraints?.map(constraint => (
                  <div key={constraint.constraint_id} className="p-3 rounded-xl bg-muted/30 border border-border/50">
                    <p className="text-sm font-semibold text-foreground">{constraint.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{constraint.description}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="h-4 w-4 text-primary" />
              Top breakpoints
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {breakpoints.slice(0, 3).length === 0 ? (
              <p className="text-sm text-muted-foreground">No breakpoints listed.</p>
            ) : (
              breakpoints.slice(0, 3).map((breakpoint, idx) => {
                const breakpointId = breakpoint.breakpoint_id || breakpoint.id || `BP-${idx + 1}`;
                const breakpointTitle =
                  breakpoint.title || breakpoint.name || breakpoint.breakpoint_id || breakpoint.id || 'Breakpoint';
                return (
                  <div key={breakpointId} className="flex items-start gap-2">
                  <Badge variant="outline" className="text-xs font-mono">
                    {breakpointId}
                  </Badge>
                  <span className="text-sm text-foreground">{breakpointTitle}</span>
                </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              {assumptionHealth ? 'Assumption health summary' : 'Objectives at risk'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {assumptionHealth ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {typeof assumptionHealth.validated === 'number' && (
                    <Badge variant="secondary" className="text-xs">
                      Validated: {assumptionHealth.validated}
                    </Badge>
                  )}
                  {typeof assumptionHealth.mixed === 'number' && (
                    <Badge variant="outline" className="text-xs">
                      Mixed: {assumptionHealth.mixed}
                    </Badge>
                  )}
                  {typeof assumptionHealth.at_risk === 'number' && (
                    <Badge variant="destructive" className="text-xs">
                      At risk: {assumptionHealth.at_risk}
                    </Badge>
                  )}
                </div>
                {assumptionHealth.interpretation && (
                  <p className="text-xs text-muted-foreground">{assumptionHealth.interpretation}</p>
                )}
              </div>
            ) : objectives.slice(0, 3).length === 0 ? (
              <p className="text-sm text-muted-foreground">No objectives listed.</p>
            ) : (
              objectives.slice(0, 3).map(objective => (
                <div key={objective.objective_id} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-foreground">{objective.objective_title}</span>
                  {objective.status?.label && (
                    <StatusPill
                      label={formatLabel(objective.status.label)}
                      variant={statusVariantMap[objective.status.label] || 'outline'}
                      className="shrink-0"
                    />
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-primary" />
                {mergedHardDataFlags.length > 0 ? 'Hard data anchors' : 'Upside points'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
            {mergedHardDataFlags.length > 0 ? (
              mergedHardDataFlags.slice(0, 3).map((flag, idx) => (
                <div key={`${flag.metric_or_signal || 'flag'}-${idx}`} className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{flag.metric_or_signal || 'Metric'}</p>
                  {flag.value && <p className="text-xs text-muted-foreground">{flag.value}</p>}
                  {flag.why_it_matters && <p className="text-xs text-muted-foreground">{flag.why_it_matters}</p>}
                </div>
              ))
            ) : (diagnosis?.validated_upside_points || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No validated upside points provided.</p>
            ) : (
              diagnosis?.validated_upside_points?.map(point => (
                <div key={point.id} className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{point.title}</p>
                  {point.description && <p className="text-xs text-muted-foreground">{point.description}</p>}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MechanicsPage({
  impactData,
  allSignals,
  assumptionLabelMap,
  pathwayLabelMap,
}: {
  impactData: StrategicImpactAnalysisPayload;
  allSignals: Signal[];
  assumptionLabelMap: Map<string, string>;
  pathwayLabelMap: Map<string, string>;
}) {
  const objectives = impactData.objective_scoreboard?.objectives || [];
  const truthTable = impactData.assumption_truth_table;
  const breakpoints = impactData.breakpoints || [];
  const pathwaySummary = impactData.pathway_activation_summary || [];
  const assumptionHealth = impactData.objective_scoreboard?.assumption_health_summary;
  const assumptionHealthGroups = [
    {
      label: 'Foundational & Healthy',
      tone: 'secondary' as const,
      items: assumptionHealth?.foundational_and_healthy || [],
    },
    {
      label: 'Critical & At Risk',
      tone: 'destructive' as const,
      items: assumptionHealth?.critical_and_at_risk || [],
    },
    {
      label: 'Mixed / Conditional',
      tone: 'outline' as const,
      items: assumptionHealth?.mixed_or_conditional || [],
    },
  ];
  const clusterRiskSummary = impactData.objective_scoreboard?.cluster_risk_summary || [];
  const hardDataFlags = impactData.objective_scoreboard?.hard_data_flags || [];
  const foundationalPillars = truthTable?.foundational_pillars || [];
  const criticalAtRisk = truthTable?.critical_at_risk_pillars || [];
  const mixedAmbiguous = truthTable?.mixed_or_ambiguous || [];
  const dataBlindSpots = truthTable?.data_blind_spots || [];
  const validatedExternalRealities = truthTable?.validated_external_realities || [];
  const failingFragileMechanisms = truthTable?.failing_or_fragile_mechanisms || [];
  const hasRunBundleScoreboard =
    !!assumptionHealth || clusterRiskSummary.length > 0 || hardDataFlags.length > 0;
  const hasRunBundleTruthTable =
    foundationalPillars.length > 0 ||
    criticalAtRisk.length > 0 ||
    mixedAmbiguous.length > 0 ||
    dataBlindSpots.length > 0 ||
    validatedExternalRealities.length > 0 ||
    failingFragileMechanisms.length > 0;

  const [activeAssumption, setActiveAssumption] = useState<string | null>(null);
  const [activePathway, setActivePathway] = useState<string | null>(null);
  const [selectedObjective, setSelectedObjective] = useState<StrategicImpactObjective | null>(null);
  const [selectedAssumption, setSelectedAssumption] = useState<{
    entry: StrategicImpactTruthTableEntry;
    bucket: 'danger' | 'holding';
  } | null>(null);

  const assumptionToPathways = useMemo(() => {
    const map = new Map<string, Set<string>>();
    breakpoints.forEach(bp => {
      const linked = (bp.linked_pathways || [])
        .map(path => path.pathway_id)
        .filter(Boolean) as string[];
      bp.why_happening?.forEach(reason => {
        if (!reason.assumption_id) return;
        const set = map.get(reason.assumption_id) || new Set<string>();
        linked.forEach(pathwayId => set.add(pathwayId));
        if (reason.pathway_id) set.add(reason.pathway_id);
        map.set(reason.assumption_id, set);
      });
    });
    return map;
  }, [breakpoints]);

  const pathwayToAssumptions = useMemo(() => {
    const map = new Map<string, Set<string>>();
    breakpoints.forEach(bp => {
      const assumptions = (bp.why_happening || [])
        .map(reason => reason.assumption_id)
        .filter(Boolean) as string[];
      (bp.linked_pathways || []).forEach(pathway => {
        if (!pathway.pathway_id) return;
        const set = map.get(pathway.pathway_id) || new Set<string>();
        assumptions.forEach(id => set.add(id));
        map.set(pathway.pathway_id, set);
      });
    });
    return map;
  }, [breakpoints]);

  const derivedPathways = useMemo(() => {
    const map = new Map<string, StrategicImpactPathwayLit>();
    const add = (path?: StrategicImpactPathwayLit) => {
      if (!path?.pathway_id) return;
      const existing = map.get(path.pathway_id);
      if (!existing) {
        map.set(path.pathway_id, path);
        return;
      }
      map.set(path.pathway_id, {
        ...existing,
        short_description: existing.short_description || path.short_description,
        activation_strength: existing.activation_strength || path.activation_strength,
      });
    };
    objectives.forEach(objective => {
      objective.impact_pathways_lit?.forEach(add);
    });
    breakpoints.forEach(bp => {
      bp.linked_pathways?.forEach(add);
    });
    return Array.from(map.values());
  }, [objectives, breakpoints]);

  const filteredObjectives = useMemo(() => {
    return objectives.filter(objective => {
      if (activePathway) {
        const hasPathway = objective.impact_pathways_lit?.some(path => path.pathway_id === activePathway);
        if (!hasPathway) return false;
      }
      if (activeAssumption) {
        const pathwaySet = assumptionToPathways.get(activeAssumption);
        if (pathwaySet && pathwaySet.size > 0) {
          const matches = objective.impact_pathways_lit?.some(path => pathwaySet.has(path.pathway_id));
          if (!matches) return false;
        } else {
          const haystack = `${objective.objective_title} ${objective.diagnosis || ''} ${objective.strategic_consequence || ''}`;
          if (!haystack.includes(activeAssumption)) return false;
        }
      }
      return true;
    });
  }, [objectives, activeAssumption, activePathway, assumptionToPathways]);

  const filterAssumptions = (entries: StrategicImpactTruthTableEntry[]) => {
    return entries.filter(entry => {
      if (activeAssumption && entry.assumption_id !== activeAssumption) return false;
      if (activePathway) {
        const set = pathwayToAssumptions.get(activePathway);
        if (set && set.size > 0 && !set.has(entry.assumption_id)) return false;
      }
      return true;
    });
  };

  const groupedPathways = useMemo(() => {
    if (pathwaySummary.length > 0) {
      return pathwaySummary.map(group => ({
        title: formatLabel(group.status),
        pathways: group.pathways || [],
      }));
    }
    const groups = new Map<string, StrategicImpactPathwayLit[]>();
    derivedPathways.forEach(path => {
      const key = path.activation_strength || 'lit';
      const existing = groups.get(key) || [];
      existing.push(path);
      groups.set(key, existing);
    });
    return Array.from(groups.entries()).map(([key, pathways]) => ({
      title: activationLabelMap[key] || formatLabel(key) || 'Lit pathways',
      pathways,
    }));
  }, [pathwaySummary, derivedPathways]);

  const visiblePathwayGroups = groupedPathways
    .map(group => {
      let filtered = group.pathways;
      if (activePathway) {
        filtered = filtered.filter(path => path.pathway_id === activePathway);
      }
      if (activeAssumption) {
        const set = assumptionToPathways.get(activeAssumption);
        if (set && set.size > 0) {
          filtered = filtered.filter(path => set.has(path.pathway_id));
        }
      }
      return { ...group, pathways: filtered };
    })
    .filter(group => group.pathways.length > 0);

  const hasLegacyTruthTable =
    (truthTable?.danger_zone || []).length > 0 || (truthTable?.holding_and_option_creating || []).length > 0;
  const showLegacyFilters = objectives.length > 0 || hasLegacyTruthTable || visiblePathwayGroups.length > 0;

  const openObjective = (objective: StrategicImpactObjective) => {
    setSelectedObjective(objective);
  };

  const selectedObjectiveSignalIds = selectedObjective
    ? normalizeSignalIds(selectedObjective.evidence_links?.signal_ids)
    : [];

  const getAssumptionLabel = (id: string) => assumptionLabelMap.get(id);
  const getPathwayLabel = (id: string) => pathwayLabelMap.get(id);
  const getCascadeVariant = (risk?: string) => {
    const value = (risk || '').toLowerCase();
    if (value.includes('high')) return 'destructive';
    if (value.includes('medium')) return 'secondary';
    return 'outline';
  };

  const renderPathwayChip = (pathwayId: string) => (
    <PathwayBadge
      id={pathwayId}
      label={getPathwayLabel(pathwayId)}
      active={activePathway === pathwayId}
      onClick={() => setActivePathway(prev => (prev === pathwayId ? null : pathwayId))}
      className="mr-1 mb-1"
    />
  );

  return (
    <div className="space-y-6">
      <Sheet
        open={!!selectedAssumption}
        onOpenChange={open => {
          if (!open) setSelectedAssumption(null);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {selectedAssumption?.entry.assumption_id || 'Assumption'}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {selectedAssumption?.bucket === 'danger' ? 'Danger zone' : 'Holding & options'}
              </Badge>
              {selectedAssumption?.entry.status && (
                <StatusPill
                  label={formatLabel(selectedAssumption.entry.status)}
                  variant={statusVariantMap[selectedAssumption.entry.status] || 'outline'}
                />
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 text-sm text-muted-foreground mt-4">
            {selectedAssumption?.entry.short_description && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</p>
                <p className="text-sm text-foreground">{selectedAssumption.entry.short_description}</p>
              </div>
            )}
            {selectedAssumption?.entry.why_high_impact && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why high impact</p>
                <p className="text-sm text-foreground">{selectedAssumption.entry.why_high_impact}</p>
              </div>
            )}
            {selectedAssumption?.entry.why_it_creates_options && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Why it creates options
                </p>
                <p className="text-sm text-foreground">{selectedAssumption.entry.why_it_creates_options}</p>
              </div>
            )}
            {!selectedAssumption?.entry.why_high_impact &&
              !selectedAssumption?.entry.why_it_creates_options &&
              !selectedAssumption?.entry.short_description && (
                <p className="text-sm text-muted-foreground">No additional details provided.</p>
              )}
          </div>
        </SheetContent>
      </Sheet>

      {showLegacyFilters && (
        <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
          <CardContent className="p-4 flex flex-wrap items-center gap-3 text-xs">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {activeAssumption || activePathway ? (
              <>
                {activeAssumption && (
                  <Badge variant="secondary" className="text-xs">
                    Assumption: {activeAssumption}
                  </Badge>
                )}
                {activePathway && (
                  <Badge variant="secondary" className="text-xs">
                    Pathway: {activePathway}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setActiveAssumption(null);
                    setActivePathway(null);
                  }}
                >
                  Clear filters
                </Button>
              </>
            ) : (
              <span className="text-muted-foreground">Click an assumption or pathway to filter.</span>
            )}
          </CardContent>
        </Card>
      )}

      {hasRunBundleScoreboard && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Assumption health summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {assumptionHealth ? (
                <>
                  {(
                    typeof assumptionHealth.validated === 'number' ||
                    typeof assumptionHealth.mixed === 'number' ||
                    typeof assumptionHealth.at_risk === 'number'
                  ) && (
                    <div className="flex flex-wrap items-center gap-2">
                      {typeof assumptionHealth.validated === 'number' && (
                        <Badge variant="secondary" className="text-xs">
                          Validated: {assumptionHealth.validated}
                        </Badge>
                      )}
                      {typeof assumptionHealth.mixed === 'number' && (
                        <Badge variant="outline" className="text-xs">
                          Mixed: {assumptionHealth.mixed}
                        </Badge>
                      )}
                      {typeof assumptionHealth.at_risk === 'number' && (
                        <Badge variant="destructive" className="text-xs">
                          At risk: {assumptionHealth.at_risk}
                        </Badge>
                      )}
                    </div>
                  )}
                  {assumptionHealthGroups.some(group => group.items.length > 0) && (
                    <div className="space-y-2">
                      {assumptionHealthGroups.map(group => {
                        if (group.items.length === 0) return null;
                        return (
                          <div key={group.label} className="rounded-xl border border-border/50 bg-muted/20 p-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-foreground">{group.label}</p>
                              <Badge variant={group.tone} className="text-[10px]">
                                {group.items.length}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {group.items[0]?.assumption || 'No assumption statement provided'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {assumptionHealth.interpretation && (
                    <p className="text-xs text-muted-foreground">{assumptionHealth.interpretation}</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No assumption health summary provided.</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-primary" />
                Cluster risk summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {clusterRiskSummary.length === 0 ? (
                <p className="text-sm text-muted-foreground">No cluster risk summary provided.</p>
              ) : (
                clusterRiskSummary.map((cluster, idx) => (
                  <div key={`${cluster.cluster || 'cluster'}-${idx}`} className="p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{cluster.cluster || 'Cluster'}</p>
                      {cluster.cascade_risk && (
                        <Badge variant={getCascadeVariant(cluster.cascade_risk)} className="text-[10px] uppercase">
                          {cluster.cascade_risk}
                        </Badge>
                      )}
                      {cluster.status && (
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {cluster.status}
                        </Badge>
                      )}
                    </div>
                    {cluster.why && <p className="text-xs text-muted-foreground mt-2">{cluster.why}</p>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Flame className="h-4 w-4 text-primary" />
                Hard data flags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {hardDataFlags.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hard data flags provided.</p>
              ) : (
                hardDataFlags.map((flag, idx) => (
                  <div key={`${flag.metric_or_signal || 'flag'}-${idx}`} className="p-3 rounded-xl bg-muted/30 border border-border/50">
                    <p className="text-sm font-semibold text-foreground">{flag.metric_or_signal || 'Metric'}</p>
                    {flag.value && <p className="text-xs text-muted-foreground mt-1">{flag.value}</p>}
                    {flag.why_it_matters && (
                      <p className="text-xs text-muted-foreground mt-2">{flag.why_it_matters}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {objectives.length > 0 && (
        <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <List className="h-4 w-4 text-primary" />
              Objectives scorecard
            </CardTitle>
            {impactData.objective_scoreboard?.overview && (
              <p className="text-xs text-muted-foreground mt-1">{impactData.objective_scoreboard.overview}</p>
            )}
          </CardHeader>
          <CardContent>
            {filteredObjectives.length === 0 ? (
              <p className="text-sm text-muted-foreground">No objectives match the current filters.</p>
            ) : (
              <div className="overflow-auto rounded-lg border border-border/50">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Objective</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Diagnosis</TableHead>
                      <TableHead>Lit pathways</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredObjectives.map(objective => (
                      <TableRow
                        key={objective.objective_id}
                        className="cursor-pointer hover:bg-muted/30"
                        onClick={() => openObjective(objective)}
                      >
                        <TableCell className="font-medium">{objective.objective_title}</TableCell>
                        <TableCell>
                          {objective.status?.label ? (
                            <StatusPill
                              label={formatLabel(objective.status.label)}
                              variant={statusVariantMap[objective.status.label] || 'outline'}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">n/a</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {objective.status?.severity ? formatLabel(objective.status.severity) : 'n/a'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-normal break-words">
                          {objective.diagnosis || 'No diagnosis provided.'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap">
                            {(objective.impact_pathways_lit || []).length === 0 ? (
                              <span className="text-xs text-muted-foreground">None</span>
                            ) : (
                              objective.impact_pathways_lit?.map(pathway => (
                                <div
                                  key={pathway.pathway_id}
                                  onClick={event => event.stopPropagation()}
                                  className="mr-1 mb-1"
                                >
                                  {renderPathwayChip(pathway.pathway_id)}
                                </div>
                              ))
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Sheet open={!!selectedObjective} onOpenChange={() => setSelectedObjective(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          {selectedObjective && (
            <div className="flex h-full flex-col gap-4">
              <SheetHeader>
                <SheetTitle>{selectedObjective.objective_title}</SheetTitle>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedObjective.status?.label && (
                    <StatusPill
                      label={formatLabel(selectedObjective.status.label)}
                      variant={statusVariantMap[selectedObjective.status.label] || 'outline'}
                    />
                  )}
                  {selectedObjective.status?.severity && (
                    <Badge variant="outline" className="text-xs">
                      Severity: {formatLabel(selectedObjective.status.severity)}
                    </Badge>
                  )}
                </div>
              </SheetHeader>
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4 text-sm">
                  {selectedObjective.diagnosis && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Diagnosis</h4>
                      <p className="text-sm text-foreground mt-1">{selectedObjective.diagnosis}</p>
                    </div>
                  )}
                  {selectedObjective.strategic_consequence && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Strategic consequence
                      </h4>
                      <p className="text-sm text-foreground mt-1">{selectedObjective.strategic_consequence}</p>
                    </div>
                  )}
                  {selectedObjective.key_risk_modes && selectedObjective.key_risk_modes.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Risk modes</h4>
                      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {selectedObjective.key_risk_modes.map(mode => (
                          <li key={mode} className="flex items-start gap-2">
                            <ChevronRight className="h-3 w-3 mt-0.5 text-primary" />
                            <span>{mode}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedObjectiveSignalIds.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Evidence links
                      </h4>
                      <div className="mt-2 space-y-2">
                        {selectedObjectiveSignalIds.map(signalId => {
                          const signal = allSignals.find(item => item.signal_id === signalId);
                          const { title, url, domain } = parseSignalSource(signal?.source || '');
                          return (
                            <div key={signalId} className="flex items-center gap-2 text-xs">
                              <Badge variant="outline" className="font-mono">
                                {signalId}
                              </Badge>
                              <span className="text-muted-foreground truncate">{title || getSignalTitle(signal)}</span>
                              {url && (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-auto inline-flex items-center gap-1 text-primary"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  {domain || 'Source'}
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {hasRunBundleTruthTable && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-primary" />
                Validated external realities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {validatedExternalRealities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No validated external realities provided.</p>
              ) : (
                validatedExternalRealities.map((entry, idx) => (
                  <div key={`validated-${idx}`} className="p-3 rounded-xl bg-muted/30 border border-border/50">
                    <p className="text-sm font-semibold text-foreground">
                      {entry.assumption_statement || 'Assumption'}
                    </p>
                    {entry.truth_status && (
                      <Badge variant="secondary" className="text-[10px] mt-2">
                        {entry.truth_status}
                      </Badge>
                    )}
                    {entry.implication && <p className="text-xs text-muted-foreground mt-2">{entry.implication}</p>}
                    {entry.strategic_implication && (
                      <p className="text-xs text-muted-foreground mt-1">{entry.strategic_implication}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-primary" />
                Failing or fragile mechanisms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {failingFragileMechanisms.length === 0 ? (
                <p className="text-sm text-muted-foreground">No fragile mechanisms provided.</p>
              ) : (
                failingFragileMechanisms.map((entry, idx) => (
                  <div key={`fragile-${idx}`} className="p-3 rounded-xl bg-muted/30 border border-border/50">
                    <p className="text-sm font-semibold text-foreground">
                      {entry.assumption_statement || 'Assumption'}
                    </p>
                    {entry.truth_status && (
                      <Badge variant="destructive" className="text-[10px] mt-2">
                        {entry.truth_status}
                      </Badge>
                    )}
                    {entry.strategic_implication && (
                      <p className="text-xs text-muted-foreground mt-2">{entry.strategic_implication}</p>
                    )}
                    {entry.evidence_basis && entry.evidence_basis.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {entry.evidence_basis.slice(0, 2).map(point => (
                          <li key={point} className="flex items-start gap-2">
                            <ChevronRight className="h-3 w-3 mt-0.5 text-primary" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-primary" />
                Foundational pillars
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {foundationalPillars.length === 0 ? (
                <p className="text-sm text-muted-foreground">No foundational pillars provided.</p>
              ) : (
                foundationalPillars.map((entry, idx) => (
                  <div key={`foundation-${idx}`} className="p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <p className="text-sm font-semibold text-foreground">
                        {entry.assumption || entry.short_description || 'Assumption'}
                      </p>
                      {entry.status && (
                        <StatusPill
                          label={formatLabel(entry.status)}
                          variant={statusVariantMap[entry.status] || 'outline'}
                        />
                      )}
                    </div>
                    {entry.board_interpretation && (
                      <p className="text-xs text-muted-foreground">{entry.board_interpretation}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-primary" />
                Critical at-risk pillars
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {criticalAtRisk.length === 0 ? (
                <p className="text-sm text-muted-foreground">No critical at-risk pillars provided.</p>
              ) : (
                criticalAtRisk.map((entry, idx) => (
                  <div key={`risk-${idx}`} className="p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <p className="text-sm font-semibold text-foreground">
                        {entry.assumption || entry.short_description || 'Assumption'}
                      </p>
                      {entry.status && (
                        <StatusPill
                          label={formatLabel(entry.status)}
                          variant={statusVariantMap[entry.status] || 'destructive'}
                        />
                      )}
                      {entry.evidence_direction && (
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {entry.evidence_direction}
                        </Badge>
                      )}
                    </div>
                    {entry.hard_data && entry.hard_data.length > 0 && (
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {entry.hard_data.map(point => (
                          <li key={point} className="flex items-start gap-2">
                            <ChevronRight className="h-3 w-3 mt-0.5 text-primary" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Mixed or ambiguous
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mixedAmbiguous.length === 0 ? (
                <p className="text-sm text-muted-foreground">No mixed/ambiguous pillars provided.</p>
              ) : (
                mixedAmbiguous.map((entry, idx) => (
                  <div key={`mixed-${idx}`} className="p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <p className="text-sm font-semibold text-foreground">
                        {entry.assumption || entry.short_description || 'Assumption'}
                      </p>
                      {entry.status && (
                        <StatusPill
                          label={formatLabel(entry.status)}
                          variant={statusVariantMap[entry.status] || 'outline'}
                        />
                      )}
                    </div>
                    {entry.board_interpretation && (
                      <p className="text-xs text-muted-foreground">{entry.board_interpretation}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-primary" />
                Data blind spots
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {dataBlindSpots.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data blind spots listed.</p>
              ) : (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {dataBlindSpots.map(spot => (
                    <li key={spot} className="flex items-start gap-2">
                      <ChevronRight className="h-3 w-3 mt-0.5 text-primary" />
                      <span>{spot}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {hasLegacyTruthTable && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-primary" />
                Assumption danger zone
              </CardTitle>
            </CardHeader>
              <CardContent className="space-y-3">
                {filterAssumptions(truthTable?.danger_zone || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No assumptions in danger zone.</p>
                ) : (
                  filterAssumptions(truthTable?.danger_zone || []).map(entry => (
                    <div
                      role="button"
                      tabIndex={0}
                      key={entry.assumption_id}
                      className="w-full text-left p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/40 transition cursor-pointer"
                      onClick={() => setSelectedAssumption({ entry, bucket: 'danger' })}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedAssumption({ entry, bucket: 'danger' });
                        }
                      }}
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <AssumptionBadge
                          id={entry.assumption_id}
                          label={entry.short_description || getAssumptionLabel(entry.assumption_id)}
                          active={activeAssumption === entry.assumption_id}
                          onClick={event => {
                            event.stopPropagation();
                            setActiveAssumption(prev => (prev === entry.assumption_id ? null : entry.assumption_id));
                          }}
                        />
                        {entry.status && (
                          <StatusPill
                            label={formatLabel(entry.status)}
                            variant={statusVariantMap[entry.status] || 'destructive'}
                            className="shrink-0"
                          />
                        )}
                      </div>
                      {entry.why_high_impact && <p className="text-xs text-muted-foreground">{entry.why_high_impact}</p>}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

          <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-primary" />
                Holding and option creating
              </CardTitle>
            </CardHeader>
              <CardContent className="space-y-3">
                {filterAssumptions(truthTable?.holding_and_option_creating || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No option-creating assumptions listed.</p>
                ) : (
                  filterAssumptions(truthTable?.holding_and_option_creating || []).map(entry => (
                    <div
                      role="button"
                      tabIndex={0}
                      key={entry.assumption_id}
                      className="w-full text-left p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/40 transition cursor-pointer"
                      onClick={() => setSelectedAssumption({ entry, bucket: 'holding' })}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedAssumption({ entry, bucket: 'holding' });
                        }
                      }}
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <AssumptionBadge
                          id={entry.assumption_id}
                          label={entry.short_description || getAssumptionLabel(entry.assumption_id)}
                          active={activeAssumption === entry.assumption_id}
                          onClick={event => {
                            event.stopPropagation();
                            setActiveAssumption(prev => (prev === entry.assumption_id ? null : entry.assumption_id));
                          }}
                        />
                        {entry.status && (
                          <StatusPill
                            label={formatLabel(entry.status)}
                            variant={statusVariantMap[entry.status] || 'outline'}
                            className="shrink-0"
                          />
                        )}
                      </div>
                      {entry.why_it_creates_options && (
                        <p className="text-xs text-muted-foreground">{entry.why_it_creates_options}</p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

        </div>
      )}

      {visiblePathwayGroups.length > 0 && (
        <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              Pathway activation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {visiblePathwayGroups.map(group => (
              <div key={group.title}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{group.title}</p>
                <div className="flex flex-wrap gap-2">
                  {group.pathways.map(pathway => (
                    <PathwayBadge
                      key={pathway.pathway_id}
                      id={pathway.pathway_id}
                      label={pathway.short_description || getPathwayLabel(pathway.pathway_id)}
                      active={activePathway === pathway.pathway_id}
                      onClick={() => setActivePathway(prev => (prev === pathway.pathway_id ? null : pathway.pathway_id))}
                    />
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DecisionAgendaPage({
  impactData,
  allSignals,
  assumptionLabelMap,
  pathwayLabelMap,
}: {
  impactData: StrategicImpactAnalysisPayload;
  allSignals: Signal[];
  assumptionLabelMap: Map<string, string>;
  pathwayLabelMap: Map<string, string>;
}) {
  const breakpoints = impactData.breakpoints || [];
  const sequencing = impactData.sequencing_plan;
  const [expandedDevil, setExpandedDevil] = useState<string | null>(null);
  const [pinnedMoves, setPinnedMoves] = useState<Map<string, StrategicImpactMove>>(new Map());
  const [expandedEvidence, setExpandedEvidence] = useState<Set<string>>(new Set());

  const togglePinnedMove = (move: StrategicImpactMove, breakpointId: string) => {
    setPinnedMoves(prev => {
      const next = new Map(prev);
      const key = `${breakpointId}:${move.move_id}`;
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.set(key, move);
      }
      return next;
    });
  };

  const exportPinned = (format: 'json' | 'csv') => {
    if (pinnedMoves.size === 0) return;
    const rows = Array.from(pinnedMoves.entries()).map(([key, move]) => {
      const [breakpointId] = key.split(':');
      return {
        breakpoint_id: breakpointId,
        move_id: move.move_id,
        title: move.title,
        description: move.description || '',
        time_horizon: move.time_horizon || '',
      };
    });
    const content =
      format === 'json'
        ? JSON.stringify(rows, null, 2)
        : ['breakpoint_id,move_id,title,description,time_horizon']
            .concat(
              rows.map(row =>
                [
                  row.breakpoint_id,
                  row.move_id,
                  `"${row.title.replace(/"/g, '""')}"`,
                  `"${row.description.replace(/"/g, '""')}"`,
                  row.time_horizon,
                ].join(','),
              ),
            )
            .join('\n');
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agenda_moves.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getAssumptionLabel = (id: string) => assumptionLabelMap.get(id);
  const getPathwayLabel = (id: string) => pathwayLabelMap.get(id);

  const renderEvidenceSignals = (signalIds?: StrategicImpactEvidenceLinks['signal_ids']) => {
    const normalizedSignalIds = normalizeSignalIds(signalIds);
    if (normalizedSignalIds.length === 0) return null;
    return (
      <div className="space-y-2">
        {normalizedSignalIds.map(signalId => {
          const signal = allSignals.find(item => item.signal_id === signalId);
          const { title, url, domain } = parseSignalSource(signal?.source || '');
          return (
            <div key={signalId} className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className="font-mono">
                {signalId}
              </Badge>
              <span className="text-muted-foreground truncate">{title || getSignalTitle(signal)}</span>
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto inline-flex items-center gap-1 text-primary"
                >
                  <ExternalLink className="h-3 w-3" />
                  {domain || 'Source'}
                </a>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center gap-3 text-xs">
          <span className="text-muted-foreground">Pinned moves:</span>
          <Badge variant="secondary" className="text-xs">
            {pinnedMoves.size} selected
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={pinnedMoves.size === 0}
            onClick={() => exportPinned('json')}
          >
            Export JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={pinnedMoves.size === 0}
            onClick={() => exportPinned('csv')}
          >
            Export CSV
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {breakpoints.length === 0 ? (
          <EmptyState title="No breakpoints" description="No breakpoint data provided in this payload." />
        ) : (
          breakpoints.map((breakpoint, index) => {
            const groupedMoves = (breakpoint.moves || []).reduce(
              (acc, move) => {
                const label = horizonLabels[move.time_horizon || ''] || formatLabel(move.time_horizon || 'Other');
                acc[label] = acc[label] || [];
                acc[label].push(move);
                return acc;
              },
              {} as Record<string, StrategicImpactMove[]>,
            );
            const breakpointId = breakpoint.breakpoint_id || breakpoint.id || `BP-${index + 1}`;
            const breakpointTitle =
              breakpoint.title || breakpoint.name || breakpoint.breakpoint_id || breakpoint.id || 'Breakpoint';
            const hasWhy = (breakpoint.why_happening || []).length > 0;
            const trigger = breakpoint.trigger;
            const hasImpact = (breakpoint.impact_on_strategy || []).length > 0;
            const hasWhatBreaks = (breakpoint.what_breaks || []).length > 0;
            const impactLabel = hasWhatBreaks && !hasImpact ? 'What breaks' : 'Impact on strategy';
            const breakpointSignalIds = normalizeSignalIds(breakpoint.evidence_links?.signal_ids);

            return (
              <Card key={breakpointId} className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{breakpointTitle}</CardTitle>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs font-mono">
                          {breakpointId}
                        </Badge>
                        {breakpoint.type && (
                          <Badge variant="secondary" className="text-xs">
                            {formatLabel(breakpoint.type)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      Why happening
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {hasWhy ? (
                        breakpoint.why_happening?.map((reason, idx) => {
                          if (reason.assumption_id) {
                            return (
                              <AssumptionBadge
                                key={`${breakpointId}-${idx}`}
                                id={reason.assumption_id}
                                label={reason.assumption_short_description || getAssumptionLabel(reason.assumption_id)}
                              />
                            );
                          }
                          if (reason.pathway_id) {
                            return (
                              <PathwayBadge
                                key={`${breakpointId}-${idx}`}
                                id={reason.pathway_id}
                                label={reason.pathway_short_description || getPathwayLabel(reason.pathway_id)}
                              />
                            );
                          }
                          if (reason.evidence_summary) {
                            return (
                              <Badge key={`${breakpointId}-${idx}`} variant="outline" className="text-xs">
                                {reason.evidence_summary}
                              </Badge>
                            );
                          }
                          return null;
                        })
                      ) : trigger ? (
                        <p className="text-xs text-muted-foreground">{trigger}</p>
                      ) : (
                        <span className="text-xs text-muted-foreground">No drivers listed.</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      {impactLabel}
                    </p>
                    {hasImpact ? (
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {breakpoint.impact_on_strategy?.map((impact, idx) => (
                          <li key={`${breakpointId}-impact-${idx}`} className="flex items-start gap-2">
                            <ChevronRight className="h-3 w-3 mt-0.5 text-primary" />
                            <span>{impact}</span>
                          </li>
                        ))}
                      </ul>
                    ) : hasWhatBreaks ? (
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {breakpoint.what_breaks?.map((impact, idx) => (
                          <li key={`${breakpointId}-break-${idx}`} className="flex items-start gap-2">
                            <ChevronRight className="h-3 w-3 mt-0.5 text-primary" />
                            <span>{impact}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground">No impact statements provided.</p>
                    )}
                  </div>

                  {breakpoint.irreversible_damage_risk && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        Irreversible damage risk
                      </p>
                      <p className="text-xs text-muted-foreground">{breakpoint.irreversible_damage_risk}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      Recommended moves
                    </p>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {Object.entries(groupedMoves).length === 0 ? (
                        <p className="text-xs text-muted-foreground">No moves defined.</p>
                      ) : (
                        Object.entries(groupedMoves).map(([label, moves]) => (
                          <div key={`${breakpointId}-${label}`} className="space-y-2">
                            <Badge variant="outline" className="text-xs">
                              {label}
                            </Badge>
                            <div className="space-y-2">
                              {moves.map(move => {
                                const key = `${breakpointId}:${move.move_id}`;
                                const isPinned = pinnedMoves.has(key);
                                return (
                                  <div key={move.move_id} className="p-3 rounded-xl bg-muted/30 border border-border/50">
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <p className="text-sm font-medium text-foreground">{move.title}</p>
                                        {move.description && (
                                          <p className="text-xs text-muted-foreground mt-1">{move.description}</p>
                                        )}
                                      </div>
                                      <Button
                                        variant={isPinned ? 'default' : 'outline'}
                                        size="sm"
                                        className="text-[11px] h-7"
                                        onClick={() => togglePinnedMove(move, breakpointId)}
                                      >
                                        {isPinned ? 'Pinned' : 'Pin'}
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {breakpoint.devils_advocate && (
                    <Collapsible
                      open={expandedDevil === breakpointId}
                      onOpenChange={() => setExpandedDevil(prev => (prev === breakpointId ? null : breakpointId))}
                    >
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs flex items-center gap-2">
                          <ChevronDown className="h-3 w-3" />
                          Devil's advocate
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 space-y-2 text-sm text-muted-foreground">
                        {breakpoint.devils_advocate.counter_case && (
                          <p>{breakpoint.devils_advocate.counter_case}</p>
                        )}
                        {breakpoint.devils_advocate.what_to_test && breakpoint.devils_advocate.what_to_test.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              What to test
                            </p>
                            <ul className="space-y-1">
                              {breakpoint.devils_advocate.what_to_test.map(item => (
                                <li key={item} className="flex items-start gap-2">
                                  <ChevronRight className="h-3 w-3 mt-0.5 text-primary" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {breakpointSignalIds.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Evidence links
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[11px]"
                          onClick={() =>
                            setExpandedEvidence(prev => {
                              const next = new Set(prev);
                              if (next.has(breakpointId)) {
                                next.delete(breakpointId);
                              } else {
                                next.add(breakpointId);
                              }
                              return next;
                            })
                          }
                        >
                          {expandedEvidence.has(breakpointId) ? 'Hide signals' : 'See signals'}
                        </Button>
                      </div>
                      {expandedEvidence.has(breakpointId) ? (
                        renderEvidenceSignals(breakpointSignalIds)
                      ) : (
                        <p className="text-xs text-muted-foreground">Signals hidden</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Sequencing plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {(
              [
                { label: '0-90 days', items: sequencing?.next_0_90_days || [] },
                { label: '3-12 months', items: sequencing?.next_3_12_months || [] },
                { label: '12-24 months', items: sequencing?.next_12_24_months || [] },
              ] as const
            ).map(column => (
              <div key={column.label} className="space-y-3">
                <Badge variant="outline" className="text-xs">
                  {column.label}
                </Badge>
                {column.items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No actions listed.</p>
                ) : (
                  column.items.map(item => (
                    <div key={item.id} className="p-3 rounded-xl bg-muted/30 border border-border/50">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EvidencePaperPage({
  impactData,
  allSignals,
  assumptionLabelMap,
  pathwayLabelMap,
  threatIds,
  opportunityIds,
  warningIds,
}: {
  impactData: StrategicImpactAnalysisPayload;
  allSignals: Signal[];
  assumptionLabelMap: Map<string, string>;
  pathwayLabelMap: Map<string, string>;
  threatIds: Set<string>;
  opportunityIds: Set<string>;
  warningIds: Set<string>;
}) {
  const [activeTab, setActiveTab] = useState('paper');
  const [search, setSearch] = useState('');
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const diagnosisAny = (impactData.executive_diagnosis || {}) as Record<string, unknown>;
  const diagnosisHardDataAnchors = Array.isArray(diagnosisAny.hard_data_anchors)
    ? (diagnosisAny.hard_data_anchors as Array<{ metric?: string; value?: string; source?: string }>)
    : [];
  const riskConfirmationStatus = impactData.objective_scoreboard?.risk_confirmation_status || {};

  const evidenceRows = useMemo(() => {
    const rows = new Map<
      string,
      {
        signal: Signal | undefined;
        signal_id: string;
        assumptions: Set<string>;
        pathways: Set<string>;
        objectives: Set<string>;
      }
    >();

    const addRow = (
      signalId: string,
      context: ReturnType<typeof buildEvidenceContext>,
      signal?: Signal,
    ) => {
      const existing =
        rows.get(signalId) || {
          signal,
          signal_id: signalId,
          assumptions: new Set<string>(),
          pathways: new Set<string>(),
          objectives: new Set<string>(),
        };
      context.assumptions.forEach(id => existing.assumptions.add(id));
      context.pathways.forEach(id => existing.pathways.add(id));
      context.objectives.forEach(id => existing.objectives.add(id));
      if (!existing.signal) existing.signal = signal;
      rows.set(signalId, existing);
    };

    impactData.objective_scoreboard?.objectives?.forEach(objective => {
      normalizeSignalIds(objective.evidence_links?.signal_ids).forEach(signalId => {
        const signal = allSignals.find(item => item.signal_id === signalId);
        addRow(signalId, buildEvidenceContext(objective), signal);
      });
    });

    impactData.breakpoints?.forEach(breakpoint => {
      normalizeSignalIds(breakpoint.evidence_links?.signal_ids).forEach(signalId => {
        const signal = allSignals.find(item => item.signal_id === signalId);
        addRow(signalId, buildEvidenceContext(undefined, breakpoint), signal);
      });
    });

    return Array.from(rows.values());
  }, [impactData, allSignals]);

  const filteredRows = evidenceRows.filter(row => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const title = getSignalTitle(row.signal);
    const source = row.signal?.source || '';
    return (
      row.signal_id.toLowerCase().includes(term) ||
      title.toLowerCase().includes(term) ||
      source.toLowerCase().includes(term)
    );
  });

  const topSignalsFallback = useMemo(() => {
    return [...allSignals]
      .sort((a, b) => (b.combined_score || b.outlier_flags?.combined_score || b.impact_score || 0) - (a.combined_score || a.outlier_flags?.combined_score || a.impact_score || 0))
      .slice(0, 10);
  }, [allSignals]);

  const strategicConclusion =
    impactData.strategic_impact_analysis?.strategic_conclusion || impactData.strategic_conclusion;
  const structuredSections = (() => {
    if (!strategicConclusion || typeof strategicConclusion === 'string') return [];
    const conclusionRecord = strategicConclusion as Record<string, unknown>;
    const hasStructuredTrigger = strategicConclusionSectionTriggers.some(key => {
      const value = conclusionRecord[key];
      return typeof value === 'string' && value.trim();
    });
    if (!hasStructuredTrigger) return [];
    return strategicConclusionSectionOrder
      .map(key => {
        const value = conclusionRecord[key];
        if (typeof value !== 'string' || !value.trim()) return null;
        return { key, content: value };
      })
      .filter(Boolean) as Array<{ key: string; content: string }>;
  })();

  const structuredKeys = new Set(structuredSections.map(section => section.key));
  const extraMarkdown =
    structuredSections.length > 0 && strategicConclusion && typeof strategicConclusion !== 'string'
      ? buildConclusionMarkdown(
          strategicConclusion as Record<string, unknown>,
          strategicConclusionLegacyOrder,
          structuredKeys,
        )
      : '';

  const markdown = (() => {
    if (!strategicConclusion) return '';
    if (typeof strategicConclusion === 'string') return strategicConclusion;
    if (structuredSections.length > 0) {
      const structuredMarkdown = structuredSections.map(section => section.content).join('\n\n');
      return [structuredMarkdown, extraMarkdown].filter(Boolean).join('\n\n');
    }
    return buildConclusionMarkdown(
      strategicConclusion as Record<string, unknown>,
      [...strategicConclusionSectionOrder, ...strategicConclusionLegacyOrder],
    );
  })();

  const summarySection = structuredSections.find(section => section.key === 'executive_summary');
  const analysisSections = structuredSections.filter(
    section => section.key === 'current_state_diagnosis' || section.key === 'future_relevance_analysis',
  );
  const remainingSections = structuredSections.filter(
    section =>
      section.key !== 'executive_summary' &&
      section.key !== 'current_state_diagnosis' &&
      section.key !== 'future_relevance_analysis',
  );

  const toc = useMemo(() => {
    const items: Array<{ id: string; text: string; depth: number }> = [];
    const counter = new Map<string, number>();
    const regex = /^(#{1,6})\s+(.+)$/gm;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(markdown)) !== null) {
      const depth = match[1].length;
      const text = match[2].trim();
      const id = slugifyHeading(text, counter);
      items.push({ id, text, depth });
    }
    return items;
  }, [markdown]);

  const headingCounter = new Map<string, number>();

  const markdownComponents = {
    h1: ({ children }: { children: ReactNode }) => {
      const text = extractText(children);
      const id = slugifyHeading(text, headingCounter);
      return (
        <h1 id={id} className="text-2xl font-semibold text-foreground mb-4">
          {children}
        </h1>
      );
    },
    h2: ({ children }: { children: ReactNode }) => {
      const text = extractText(children);
      const id = slugifyHeading(text, headingCounter);
      return (
        <h2 id={id} className="text-xl font-semibold text-foreground mt-6 mb-3">
          {children}
        </h2>
      );
    },
    h3: ({ children }: { children: ReactNode }) => {
      const text = extractText(children);
      const id = slugifyHeading(text, headingCounter);
      return (
        <h3 id={id} className="text-lg font-semibold text-foreground mt-5 mb-2">
          {children}
        </h3>
      );
    },
    p: ({ children }: { children: ReactNode }) => (
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{children}</p>
    ),
    ul: ({ children }: { children: ReactNode }) => (
      <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground mb-4">{children}</ul>
    ),
    ol: ({ children }: { children: ReactNode }) => (
      <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground mb-4">{children}</ol>
    ),
    li: ({ children }: { children: ReactNode }) => <li className="text-sm text-muted-foreground">{children}</li>,
    strong: ({ children }: { children: ReactNode }) => <strong className="text-foreground">{children}</strong>,
    hr: () => <Separator className="my-6" />,
  };

  const renderMarkdown = (content: string) => (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {content}
    </ReactMarkdown>
  );

  const renderLinkList = (ids: string[], map: Map<string, string>) => {
    return ids.length === 0
      ? 'n/a'
      : ids
          .map(id => (map.get(id) ? `${id}: ${map.get(id)}` : id))
          .join(', ');
  };

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      <SignalDetailDialog
        signal={selectedSignal}
        onClose={() => setSelectedSignal(null)}
        threatIds={threatIds}
        opportunityIds={opportunityIds}
        warningIds={warningIds}
      />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap items-center gap-2 rounded-full border border-border/60 bg-card/70 p-1">
          <TabsTrigger value="evidence" className="rounded-full px-4 py-2 text-xs">
            Evidence
          </TabsTrigger>
          <TabsTrigger value="paper" className="rounded-full px-4 py-2 text-xs">
            Executive paper
          </TabsTrigger>
        </TabsList>

      <TabsContent value="evidence" className="space-y-4 mt-6">
        {evidenceRows.length === 0 ? (
          <div className="space-y-4">
            {diagnosisHardDataAnchors.length === 0 &&
            Object.keys(riskConfirmationStatus).length === 0 &&
            topSignalsFallback.length === 0 ? (
              <EmptyState
                title="No signal links attached in this payload"
                description="Provide signal_id mappings to enable click-through."
              />
            ) : (
              <>
                {diagnosisHardDataAnchors.length > 0 && (
                  <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Flame className="h-4 w-4 text-primary" />
                        Hard data anchors from diagnosis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {diagnosisHardDataAnchors.map((anchor, idx) => (
                        <div key={`anchor-${idx}`} className="rounded-xl border border-border/50 bg-muted/20 p-3">
                          <p className="text-sm font-medium text-foreground">{anchor.metric || 'Metric'}</p>
                          {anchor.value && <p className="text-xs text-muted-foreground mt-1">{anchor.value}</p>}
                          {anchor.source && <p className="text-xs text-muted-foreground mt-1">{anchor.source}</p>}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {Object.keys(riskConfirmationStatus).length > 0 && (
                  <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-primary" />
                        Risk confirmation status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {Object.entries(riskConfirmationStatus).map(([key, value]) => (
                        <div key={key} className="rounded-xl border border-border/50 bg-muted/20 p-3">
                          <p className="text-xs font-semibold text-foreground">{formatLabel(key)}</p>
                          <p className="text-xs text-muted-foreground mt-1">{value}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {topSignalsFallback.length > 0 && (
                  <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <List className="h-4 w-4 text-primary" />
                        High-impact signals (fallback)
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Evidence links were not mapped in this payload, so this shows top-scoring signals instead.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {topSignalsFallback.map(signal => (
                        <button
                          key={signal.signal_id}
                          type="button"
                          className="w-full text-left rounded-xl border border-border/50 bg-background/70 p-3 hover:border-primary/40 hover:bg-primary/5 transition"
                          onClick={() => setSelectedSignal(signal)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {signal.signal_id}
                            </Badge>
                            <Badge
                              variant={signal.impact_direction === 'Negative' ? 'destructive' : 'secondary'}
                              className="text-[10px]"
                            >
                              {(signal.combined_score || signal.outlier_flags?.combined_score || signal.impact_score || 0).toFixed(1)}
                            </Badge>
                          </div>
                          <p className="text-sm text-foreground mt-2 line-clamp-2">{getSignalTitle(signal)}</p>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Evidence signals</h3>
                <p className="text-xs text-muted-foreground">
                  Click a signal to open the source link and view the strategic rationale.
                </p>
              </div>
              <Input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search signals, titles, sources"
                className="max-w-xs text-sm"
              />
            </div>

            <div className="overflow-auto rounded-xl border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Signal</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Polarity</TableHead>
                    <TableHead>Linked context</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map(row => {
                    const signal = row.signal;
                    const title = getSignalTitle(signal);
                    const parsedSource = parseSignalSource(signal?.source || '');
                    const url = signal?.source_url || parsedSource.url;
                    const date = signal?.published_date || signal?.date_detected || '';
                    const linkedAssumptions = Array.from(row.assumptions);
                    const linkedPathways = Array.from(row.pathways);
                    const linkedObjectives = Array.from(row.objectives);

                    return (
                      <TableRow
                        key={row.signal_id}
                        className="cursor-pointer hover:bg-muted/30"
                        onClick={() => {
                          if (signal) setSelectedSignal(signal);
                        }}
                      >
                        <TableCell className="font-mono text-xs">{row.signal_id}</TableCell>
                        <TableCell className="text-xs max-w-[240px] truncate">{title}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {parsedSource.domain || parsedSource.title || 'n/a'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{date || 'n/a'}</TableCell>
                        <TableCell className="text-xs text-primary truncate">
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1"
                              onClick={event => event.stopPropagation()}
                            >
                              <ExternalLink className="h-3 w-3" />
                              {parsedSource.domain || 'Open'}
                            </a>
                          ) : (
                            'n/a'
                          )}
                        </TableCell>
                        <TableCell>
                          {signal?.impact_direction ? (
                            <Badge
                              variant={signal.impact_direction === 'Negative' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {signal.impact_direction}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">n/a</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[260px] truncate">
                          {[
                            linkedAssumptions.length ? `A: ${renderLinkList(linkedAssumptions, assumptionLabelMap)}` : '',
                            linkedPathways.length ? `IP: ${renderLinkList(linkedPathways, pathwayLabelMap)}` : '',
                            linkedObjectives.length ? `OBJ: ${linkedObjectives.join(', ')}` : '',
                          ]
                            .filter(Boolean)
                            .join(' | ') || 'n/a'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Why it matters
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {selectedSignal?.strategic_analysis ||
                  selectedSignal?.relevance_explanation ||
                  selectedSignal?.impact_assessment ||
                  'Select a signal to view the strategic rationale.'}
              </CardContent>
            </Card>
          </>
        )}
      </TabsContent>

      <TabsContent value="paper" className="space-y-4 mt-6">
        {markdown.trim().length === 0 ? (
          <EmptyState
            title="No strategic conclusion text"
            description="No executive paper content provided in this payload."
          />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[240px_1fr] gap-6">
            {toc.length > 0 ? (
              <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm h-fit">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <List className="h-4 w-4 text-primary" />
                    Contents
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  {toc.map(item => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => scrollToHeading(item.id)}
                      className={cn('block text-left hover:text-foreground', item.depth > 2 && 'pl-4')}
                    >
                      {item.text}
                    </button>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            <div className="space-y-6">
              {structuredSections.length > 0 ? (
                <>
                  {summarySection ? (
                    <Card
                      className={cn(
                        'bg-card/70 border border-border/60 rounded-2xl shadow-sm',
                        'border-primary/30 bg-primary/5',
                      )}
                    >
                      <CardContent className="p-8">{renderMarkdown(summarySection.content)}</CardContent>
                    </Card>
                  ) : null}

                  {analysisSections.length > 0 ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      {analysisSections.map(section => (
                        <Card
                          key={section.key}
                          className="bg-card/70 border border-border/60 rounded-2xl shadow-sm"
                        >
                          <CardContent className="p-6">{renderMarkdown(section.content)}</CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : null}

                  {remainingSections.map(section => (
                    <Card
                      key={section.key}
                      className="bg-card/70 border border-border/60 rounded-2xl shadow-sm"
                    >
                      <CardContent className="p-6">{renderMarkdown(section.content)}</CardContent>
                    </Card>
                  ))}

                  {extraMarkdown.trim().length > 0 ? (
                    <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
                      <CardContent className="p-6">{renderMarkdown(extraMarkdown)}</CardContent>
                    </Card>
                  ) : null}
                </>
              ) : (
                <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
                  <CardContent className="p-8">{renderMarkdown(markdown)}</CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </TabsContent>
      </Tabs>
    </>
  );
}

export function StrategicImpactWorkstreams() {
  const { data, allSignals, threatIds, opportunityIds, warningIds } = useForesight();
  const impactData = data?.strategic_impact_analysis;

  if (!impactData) {
    return (
      <EmptyState
        title="No strategic impact analysis"
        description="Upload a payload that includes the strategic impact analysis sections to view this workspace."
      />
    );
  }

  const companyName =
    impactData.meta?.company_name || data?.strategy_context?.company?.name || data?.meta?.company || 'Company';
  const asOfDate = impactData.meta?.as_of_date || data?.strategy_context?.company?.as_of_date || '';
  const strategyIntent =
    impactData.meta?.strategy_intent || data?.strategy_context?.strategy_snapshot?.one_line_positioning || '';

  const assumptionLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    const add = (id?: string, label?: string) => {
      if (!id || !label) return;
      if (!map.has(id)) map.set(id, label);
    };
    impactData.assumption_truth_table?.danger_zone?.forEach(entry => add(entry.assumption_id, entry.short_description));
    impactData.assumption_truth_table?.holding_and_option_creating?.forEach(entry =>
      add(entry.assumption_id, entry.short_description),
    );
    impactData.breakpoints?.forEach(bp => {
      bp.why_happening?.forEach(reason => add(reason.assumption_id, reason.assumption_short_description));
    });
    return map;
  }, [impactData]);

  const pathwayLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    const add = (id?: string, label?: string) => {
      if (!id || !label) return;
      if (!map.has(id)) map.set(id, label);
    };
    impactData.objective_scoreboard?.objectives?.forEach(objective => {
      objective.impact_pathways_lit?.forEach(path => add(path.pathway_id, path.short_description));
    });
    impactData.breakpoints?.forEach(bp => {
      bp.linked_pathways?.forEach(path => add(path.pathway_id, path.short_description));
      bp.why_happening?.forEach(reason => add(reason.pathway_id, reason.pathway_short_description));
    });
    return map;
  }, [impactData]);

  const [activeTab, setActiveTab] = useState('evidence');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-center -mt-1">
          <TabsList className="w-fit items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-2 shadow-sm">
            <TabsTrigger value="summary" className="rounded-full px-4 py-2 text-xs font-medium">
              Summary
            </TabsTrigger>
            <TabsTrigger value="mechanics" className="rounded-full px-4 py-2 text-xs font-medium">
              Mechanics
            </TabsTrigger>
            <TabsTrigger value="decision" className="rounded-full px-4 py-2 text-xs font-medium">
              Decision agenda
            </TabsTrigger>
            <TabsTrigger value="evidence" className="rounded-full px-4 py-2 text-xs font-medium">
              Evidence & paper
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="summary" className="mt-6">
          <SummaryPage impactData={impactData} companyName={companyName} asOfDate={asOfDate} strategyIntent={strategyIntent} />
        </TabsContent>

        <TabsContent value="mechanics" className="mt-6">
          <MechanicsPage
            impactData={impactData}
            allSignals={allSignals}
            assumptionLabelMap={assumptionLabelMap}
            pathwayLabelMap={pathwayLabelMap}
          />
        </TabsContent>

        <TabsContent value="decision" className="mt-6">
          <DecisionAgendaPage
            impactData={impactData}
            allSignals={allSignals}
            assumptionLabelMap={assumptionLabelMap}
            pathwayLabelMap={pathwayLabelMap}
          />
        </TabsContent>

        <TabsContent value="evidence" className="mt-6">
          <EvidencePaperPage
            impactData={impactData}
            allSignals={allSignals}
            assumptionLabelMap={assumptionLabelMap}
            pathwayLabelMap={pathwayLabelMap}
            threatIds={threatIds}
            opportunityIds={opportunityIds}
            warningIds={warningIds}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
