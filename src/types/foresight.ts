// Core types for the strategic foresight data model v2.1

export interface Meta {
  generated_at: string;
  company: string;
  version: string;
}

export interface Company {
  name: string;
  industry: string;
  as_of_date: string;
}

export interface StrategySnapshot {
  one_line_positioning: string;
  strategy_summary: string;
  time_horizon: string;
  confidence: string;
  key_sources?: Array<{ type: string; reference: string }>;
}

export interface StrategicObjective {
  objective: string;
  target_date: string;
  confidence: string;
  linked_assumptions: string[];
  evidence_refs: string[];
  evidence_strength: string;
  objective_id: string;
}

export interface FinancialTarget {
  metric: string;
  target: string;
  timeframe: string;
  evidence_refs: string[];
  evidence_strength: string;
  linked_assumptions: string[];
  numeric_anchor: string;
}

export interface KPI {
  name: string;
  description: string;
  current_value: string;
  strategic_importance: string;
  linked_assumptions: string[];
  evidence_refs: string[];
  evidence_strength: string;
  numeric_anchor: string;
  reconciled_from_baseline?: boolean;
  kpi_id: string;
}

export interface CriticalDependency {
  activity: string;
  depends_on: string;
  linked_assumption: string;
}

export interface ValueChain {
  primary_activities: string[];
  support_activities: string[];
  critical_dependencies: CriticalDependency[];
}

export interface ImpactPathway {
  pathway_id: string;
  trigger_assumption: string;
  trigger_condition: string;
  immediate_effects: string[];
  affected_building_blocks: string[];
  cascade_to_assumptions: string[];
  strategic_response_options: string[];
  time_to_impact: string;
  severity: number;
}

export interface AssumptionCluster {
  cluster_name: string;
  assumptions: string[];
  description: string;
  cascade_risk: string;
}

export interface AssumptionHealth {
  assumption_id: string;
  statement: string;
  verification_status: 'AT RISK' | 'MIXED' | 'VALIDATED' | 'UNKNOWN';
  strategic_verdict: string;
  supporting_evidence_analysis?: string;
  challenging_evidence_analysis?: string;
  key_risk_factors: string[];
  confidence_score: number;
  net_impact_score: number;
  signal_volume: number;
  positive_signals: number;
  negative_signals: number;
}

export interface Assumption {
  id: string;
  statement: string;
  category: string;
  supports_building_blocks: string[];
  external_risk_domains: string[];
  numeric_anchor?: string;
  evidence_refs?: string[];
  evidence_strength?: string;
  as_of_date?: string;
  why_it_matters?: string;
  confidence_level?: number;
  evidence_base?: string;
  historical_validity?: string;
  failure_scenario?: string;
  leading_indicators?: string[];
  dependency_chain?: string[];
  impact_severity_if_broken?: number;
}

export interface BuildingBlockContent {
  summary: string | string[];
  confidence?: string;
  main_revenue_streams?: string[];
  main_cost_drivers?: string[];
  moats?: string[];
  levers?: Array<{ name: string; description: string }>;
  most_sensitive_areas?: string[];
}

export interface BuildingBlocks {
  direction_and_positioning: BuildingBlockContent;
  value_creation: BuildingBlockContent;
  value_defence: BuildingBlockContent;
  key_levers: BuildingBlockContent;
  core_assumptions_overview: BuildingBlockContent;
}

export interface StrategyContext {
  company: Company;
  strategy_snapshot: StrategySnapshot;
  strategic_objectives: {
    primary_goals: StrategicObjective[];
    financial_targets: FinancialTarget[];
  };
  key_performance_indicators: {
    critical_metrics: KPI[];
  };
  value_chain: ValueChain;
  building_blocks: BuildingBlocks;
  core_assumptions: Assumption[];
  assumption_health?: AssumptionHealth[];
  impact_pathways: ImpactPathway[];
  assumption_dependencies: {
    critical_clusters: AssumptionCluster[];
  };
}

export interface OutlierFlags {
  is_high_risk_negative: boolean;
  is_high_leverage_positive: boolean;
  is_early_warning: boolean;
  triggered_pathways: string[];
  combined_score: number;
}

export interface StrategyTrace {
  primary_assumption: string;
  secondary_assumptions: string[];
  building_blocks: string[];
  linked_kpis: string[];
  linked_objectives: string[];
  risk_domains: string[];
}

export interface Signal {
  signal_id: string;
  related_assumption_id?: string;
  assumption_id?: string;
  archetype: string;
  impact_score: number;
  impact_direction: 'Positive' | 'Negative' | 'Neutral';
  confidence: string;
  scope: string;
  reversibility: string;
  time_horizon: string;
  affected_building_blocks?: string[];
  building_blocks?: string[];
  building_block_labels?: string[];
  risk_domains?: string[];
  risk_domain_labels?: string[];
  strategic_analysis: string;
  strategy_trace?: StrategyTrace;
  outlier_flags?: OutlierFlags;
  combined_score?: number;
  published_date?: string | null;
  recency_bucket?: string;
  date_confidence?: string;
  // Content fields
  signal_content?: string;
  source?: string;
  source_url?: string;
  source_type?: string;
  source_quality?: string;
  date_detected?: string;
  impact_assessment?: string;
  relevance_explanation?: string;
  metrics?: Array<{
    name: string;
    raw_value: string;
    period: string;
    unit: string;
  }>;
}

export interface SignalClusterSummary {
  cluster_id: string;
  cluster_label: string;
  signal_count: number;
  polarity_split: { positive: number; negative: number };
  top_archetypes: Array<{ archetype: string; count: number }>;
  affected_building_blocks: Array<{ block: string; count: number }>;
  affected_assumptions: Array<{ assumption_id: string; count: number }>;
  avg_combined_score: number;
  max_combined_score: number;
}

export interface SignalCluster {
  cluster_id: string;
  cluster_label: string;
  summary: SignalClusterSummary;
  signals: Signal[];
}

// Workstream types - updated to match actual JSON structure
export interface WorkstreamPhase {
  name: string;
  actions: string[];
  deliverable: string;
}

export interface WorkstreamRecommendation {
  cluster_id: string;
  recommended_product_id: string;
  product_name: string;
  project_title: string;
  rationale?: string | null;
  owner?: string | null;
  success_metric?: string | null;
  phases?: WorkstreamPhase[];
}

export interface WorkstreamExecutiveSummary {
  issue: string;
  impact: string;
  recommendation: string;
}

export interface WorkstreamDetailedAnalysis {
  workstream_id: string;
  workstream_name: string;
  customized_title: string;
  rationale: string;
  executive_summary: WorkstreamExecutiveSummary;
  phases: WorkstreamPhase[];
  risks: string[];
  cluster_id: string;
}

// Legacy workstream analysis types (for backwards compatibility)
export interface AffectedAssumption {
  id: string;
  reason: string;
  status: 'challenged' | 'validated' | 'unclear';
}

export interface WorkstreamAlternative {
  name: string;
  pros: string;
  cons: string;
}

export interface RiskMitigation {
  risk: string;
  mitigation: string;
}

export interface LegacyWorkstreamDetailedAnalysis {
  strategic_impact: {
    affected_assumptions: AffectedAssumption[];
    impact_on_building_blocks: string[];
    kpi_implication_hypotheses: string[];
  };
  recommended_workstreams?: {
    primary: {
      name: string;
      objective: string;
      rationale: string;
      owner_role: string;
      measure_of_success: string;
    };
    alternatives: WorkstreamAlternative[];
  };
  risks_and_mitigations?: RiskMitigation[];
  evidence_trace?: string;
  validation_plan?: string;
}

export interface SupportingEvidence {
  source?: string;
  url?: string;
  signal_id?: string;
}

export interface Workstream {
  id: string;
  recommendation: WorkstreamRecommendation;
  detailed_analysis: WorkstreamDetailedAnalysis;
  supporting_evidence?: SupportingEvidence[];
}

export interface ValidationReport {
  total_workstreams: number;
  integrity_check: string;
}

export interface StrategicImpactMeta {
  document_type?: string;
  company_name?: string;
  as_of_date?: string;
  strategy_intent?: string;
}

export interface StrategicImpactNode {
  type: string;
  id: string;
  label: string;
}

export interface StrategicImpactFeedbackLoop {
  loop_id: string;
  title: string;
  chain_text?: string;
  nodes?: StrategicImpactNode[];
}

export interface StrategicImpactUpsidePoint {
  id: string;
  title: string;
  description?: string;
  note_on_uncertainty?: string;
}

export interface StrategicImpactConstraint {
  constraint_id: string;
  name: string;
  description?: string;
}

export interface StrategicImpactExecutiveDiagnosis {
  summary_paragraphs?: string[];
  dominant_feedback_loops?: StrategicImpactFeedbackLoop[];
  validated_upside_points?: StrategicImpactUpsidePoint[];
  constraints?: StrategicImpactConstraint[];
}

export interface StrategicImpactPathwayLit {
  pathway_id: string;
  short_description?: string;
  activation_strength?: string;
}

export interface StrategicImpactObjectiveStatus {
  label?: string;
  severity?: string;
  pattern?: string;
}

export type StrategicImpactSignalIdMap = Record<string, string[]>;

export interface StrategicImpactEvidenceLinks {
  signal_ids?: string[] | StrategicImpactSignalIdMap;
  note?: string;
}

export interface StrategicImpactObjective {
  objective_id: string;
  objective_title: string;
  status?: StrategicImpactObjectiveStatus;
  diagnosis?: string;
  impact_pathways_lit?: StrategicImpactPathwayLit[];
  strategic_consequence?: string;
  key_risk_modes?: string[];
  evidence_links?: StrategicImpactEvidenceLinks;
  signal_placeholders?: {
    not_provided_in_text?: boolean;
    note?: string;
  };
}

export interface StrategicImpactObjectiveScoreboard {
  overview?: string;
  objectives?: StrategicImpactObjective[];
}

export interface StrategicImpactBreakpointWhy {
  assumption_id?: string;
  assumption_short_description?: string;
  assumption_health?: string;
  pathway_id?: string;
  pathway_short_description?: string;
  notes?: string;
  evidence_summary?: string;
}

export interface StrategicImpactMove {
  move_id: string;
  title: string;
  description?: string;
  time_horizon?: string;
}

export interface StrategicImpactBreakpoint {
  breakpoint_id: string;
  title: string;
  type?: string;
  why_happening?: StrategicImpactBreakpointWhy[];
  impact_on_strategy?: string[];
  moves?: StrategicImpactMove[];
  linked_pathways?: StrategicImpactPathwayLit[];
  devils_advocate?: {
    counter_case?: string;
    what_to_test?: string[];
  };
  evidence_links?: StrategicImpactEvidenceLinks;
}

export interface StrategicImpactTruthTableEntry {
  assumption_id: string;
  short_description?: string;
  status?: string;
  why_high_impact?: string;
  why_it_creates_options?: string;
}

export interface StrategicImpactTruthTable {
  danger_zone?: StrategicImpactTruthTableEntry[];
  holding_and_option_creating?: StrategicImpactTruthTableEntry[];
}

export interface StrategicImpactSequencingItem {
  id: string;
  title: string;
  description?: string;
}

export interface StrategicImpactSequencingPlan {
  next_0_90_days?: StrategicImpactSequencingItem[];
  next_3_12_months?: StrategicImpactSequencingItem[];
  next_12_24_months?: StrategicImpactSequencingItem[];
}

export interface StrategicImpactConclusion {
  executive_conclusion?: string;
  what_is_breaking?: string;
  what_does_not_need_to_change?: string;
  what_must_change?: string;
  board_level_implication?: string;
  devils_advocate?: string;
}

export interface StrategicImpactAnalysisPayload {
  meta?: StrategicImpactMeta;
  executive_diagnosis?: StrategicImpactExecutiveDiagnosis;
  objective_scoreboard?: StrategicImpactObjectiveScoreboard;
  breakpoints?: StrategicImpactBreakpoint[];
  assumption_truth_table?: StrategicImpactTruthTable;
  sequencing_plan?: StrategicImpactSequencingPlan;
  pathway_activation_summary?: Array<{
    status: string;
    pathways: StrategicImpactPathwayLit[];
  }>;
  strategic_impact_analysis?: {
    strategic_conclusion?: StrategicImpactConclusion;
  };
  strategic_conclusion?: StrategicImpactConclusion;
}

// Main data interface for v2.1 schema
export interface ForesightData {
  meta: Meta;
  strategy_context: StrategyContext;
  signal_clusters?: SignalCluster[];
  all_signals: Signal[];
  workstreams: Workstream[];
  validation_report?: ValidationReport;
  assumption_health?: AssumptionHealth[];
  strategic_impact_analysis?: StrategicImpactAnalysisPayload;
  // Legacy fields for backwards compatibility
  company_strategy?: {
    company: Company;
    strategy_snapshot: StrategySnapshot;
    building_blocks: BuildingBlocks;
    core_assumptions: Assumption[];
  };
  all_signals_view?: Signal[];
  strategic_deep_dive?: {
    threats: DeepDiveItem[];
    opportunities: DeepDiveItem[];
    early_warnings: DeepDiveItem[];
  };
}

// Legacy types for backwards compatibility
export interface DeepDiveItem {
  signal_id: string;
  related_assumption_id: string;
  archetype: string;
  impact_score: number;
  severity: string;
  impact_direction: string;
  time_horizon: string;
  affected_building_blocks: string[];
  strategic_analysis: string;
  strategy_trace: StrategyTrace;
  outlier_flags: OutlierFlags;
  content: string;
  mitigation_plan?: string;
  expansion_strategy?: string;
  monitoring_strategy?: string;
  risk_level?: string;
}
