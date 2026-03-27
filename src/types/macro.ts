export type MacroEntryMode = 'dashboard' | 'reading';

export interface MacroMeta {
  run_id?: string;
  company_name: string;
  ticker?: string;
  bundle_version?: string;
  generated_on?: string;
  analysis_as_of?: string;
  source_run_status?: string;
  presentation_version?: string;
}

export interface MacroScoreFramework {
  framework_key?: string;
  metric_order?: string[];
  scale?: {
    min?: number;
    max?: number;
  };
  labels?: Record<string, Record<string, string>>;
  score_source_priority?: string[];
  notes?: string[];
}

export interface MacroBundleContract {
  default_route: string;
  supported_views?: string[];
  score_framework?: MacroScoreFramework;
}

export interface MacroBadgeMetric {
  label: string;
  value: number | string;
}

export interface MacroBadge {
  label: string;
  tone?: string;
}

export interface MacroResearchProgress {
  planned_mission_count?: number;
  completed_mission_count?: number;
  completed_mission_keys?: string[];
  pending_mission_keys?: string[];
}

export interface MacroPortfolioProgress {
  segments_ready?: number;
  segments_total?: number;
  activities_ready?: number;
  activities_total?: number;
  missions_completed?: number;
  missions_planned?: number;
}

export interface MacroScoreMetric {
  metric_key: string;
  label: string;
  score?: number | null;
  score_label?: string | null;
  max_score?: number;
  average_score?: number | null;
}

export interface MacroScoreBundle {
  market_trajectory: number | null;
  right_to_play: number | null;
  position_sustainability: number | null;
  market_attractiveness?: number | null;
  confidence?: string | null;
}

export interface MacroScorecard {
  framework_key?: string;
  source?: string;
  confidence?: string | null;
  metrics: MacroScoreMetric[];
  compat_scores?: {
    market_attractiveness?: number | null;
    right_to_play?: number | null;
    position_sustainability?: number | null;
  };
  rationale?: string | null;
  citation_source_keys?: string[];
  score_lookup: MacroScoreBundle;
}

export interface MacroOverviewSegmentCard {
  segment_key: string;
  title: string;
  availability?: string;
  coverage_status?: string;
  short_description?: string | null;
  status_badge?: MacroBadge | null;
  outlook_badge?: MacroBadge | null;
  recommended_action?: string | null;
  key_risk?: string | null;
  key_upside?: string | null;
  activity_count?: number;
  activity_keys?: string[];
  research_progress?: MacroResearchProgress;
  click_target?: string | null;
}

export interface MacroOverviewView {
  view_key: string;
  view_type: string;
  title: string;
  summary?: string | null;
  portfolio_progress?: MacroPortfolioProgress;
  segment_cards: MacroOverviewSegmentCard[];
}

export interface MacroSegmentActivityLink {
  activity_key: string;
  activity_name: string;
  click_target?: string | null;
}

export interface MacroSegmentBusinessMap {
  summary?: string | null;
  products_or_services?: string[];
  activities?: MacroSegmentActivityLink[];
}

export interface MacroDecisionSummary {
  recommended_action?: string | null;
  key_risk?: string | null;
  key_upside?: string | null;
  short_description?: string | null;
  why_now?: string | null;
  status_badge?: MacroBadge | null;
  outlook_badge?: MacroBadge | null;
}

export interface MacroScoreSummary {
  available?: boolean;
  metrics?: MacroScoreMetric[];
  activity_count?: number;
}

export interface MacroActivityCard {
  activity_key: string;
  title: string;
  availability?: string;
  coverage_status?: string;
  summary?: string | null;
  recommended_action?: string | null;
  key_risk?: string | null;
  key_upside?: string | null;
  scorecard?: MacroScorecard;
  click_target?: string | null;
}

export interface MacroWrittenAnalysis {
  summary?: string | null;
  confidence?: string | null;
  key_takeaways?: string[];
  watchpoints?: string[];
  markdown?: string | null;
}

export interface MacroDomainCount {
  domain: string;
  count: number;
}

export interface MacroSourceMix {
  tiers?: Record<string, number>;
  domains?: MacroDomainCount[];
}

export interface MacroScoreMatrix {
  columns: Array<Pick<MacroScoreMetric, 'metric_key' | 'label'>>;
  rows: Array<{
    activity_key: string;
    activity_name: string;
    scores: MacroScoreMetric[];
    confidence?: string | null;
  }>;
}

export interface MacroSegmentVisuals {
  activity_score_matrix?: MacroScoreMatrix;
  research_progress?: {
    planned?: number;
    completed?: number;
  };
  source_mix?: MacroSourceMix;
}

export interface MacroEvidenceTopSource {
  source_key: string;
  title: string;
  url?: string | null;
  source_domain?: string | null;
  source_tier?: string | null;
  publication_date?: string | null;
  trust_score?: number | null;
  note?: string | null;
}

export interface MacroEvidencePanel {
  cited_source_keys?: string[];
  cited_source_count?: number;
  supporting_source_count?: number;
  mission_count?: number;
  coverage_labels?: Record<string, number>;
  source_tier_breakdown?: Record<string, number>;
  top_domains?: MacroDomainCount[];
  latest_publication_date?: string | null;
  top_sources?: MacroEvidenceTopSource[];
}

export interface MacroSegmentView {
  view_key: string;
  view_type: string;
  segment_key: string;
  title: string;
  availability?: string;
  coverage_status?: string;
  research_progress?: MacroResearchProgress;
  business_map?: MacroSegmentBusinessMap;
  decision_summary?: MacroDecisionSummary;
  score_summary?: MacroScoreSummary;
  activity_cards?: MacroActivityCard[];
  written_analysis?: MacroWrittenAnalysis;
  visuals?: MacroSegmentVisuals;
  evidence_panel?: MacroEvidencePanel;
  artifact_refs?: Record<string, unknown>;
}

export interface MacroActivityBusinessMap {
  description?: string | null;
  products?: string[];
  services?: string[];
  end_markets?: string[];
  geographies?: string[];
  business_model_notes?: string | null;
}

export interface MacroActivityDecisionGuidance {
  recommended_action?: string | null;
  key_risk?: string | null;
  key_upside?: string | null;
  why_now?: string | null;
}

export interface MacroSupportingTopic {
  mission_key?: string;
  topic_key?: string;
  topic_name?: string;
  mission_name?: string;
  coverage_label?: string;
  confidence?: string | null;
  question?: string | null;
  trusted_interpretation?: string | null;
  what_sources_say?: string[];
  linked_activity_keys?: string[];
}

export interface MacroSupportingTopics {
  completed?: MacroSupportingTopic[];
  pending?: MacroSupportingTopic[];
}

export interface MacroActivityVisuals {
  score_bars?: MacroScoreMetric[];
  topic_coverage?: {
    completed?: number;
    pending?: number;
  };
  source_mix?: MacroSourceMix;
}

export interface MacroActivityView {
  view_key: string;
  view_type: string;
  activity_key: string;
  segment_key: string;
  title: string;
  availability?: string;
  coverage_status?: string;
  research_progress?: MacroResearchProgress;
  business_map?: MacroActivityBusinessMap;
  decision_guidance?: MacroActivityDecisionGuidance;
  scorecard?: MacroScorecard;
  written_analysis?: MacroWrittenAnalysis;
  supporting_topics?: MacroSupportingTopics;
  visuals?: MacroActivityVisuals;
  evidence_panel?: MacroEvidencePanel;
  artifact_refs?: Record<string, unknown>;
}

export interface MacroNavigationNode {
  node_key: string;
  label: string;
  node_type: string;
  status?: string;
  children: MacroNavigationNode[];
}

export interface MacroSourceUsage {
  segments?: string[];
  activities?: string[];
  topics?: string[];
  missions?: string[];
}

export interface MacroSourceRecord {
  source_key: string;
  title: string;
  url?: string | null;
  publication_date?: string | null;
  source_domain?: string | null;
  source_tier?: string | null;
  source_quality?: number | null;
  collection_method?: string | null;
  trust_score?: number | null;
  excerpt_preview?: string | null;
  note?: string | null;
  used_by?: MacroSourceUsage;
}

export interface MacroDashboardData {
  flavor: 'new' | 'legacy';
  meta: MacroMeta;
  bundle_contract?: MacroBundleContract;
  default_route: string;
  reading_route: string;
  recommended_user_flow: string[];
  overview_view: MacroOverviewView;
  segment_views: MacroSegmentView[];
  activity_views: MacroActivityView[];
  navigation_tree: MacroNavigationNode[];
  source_index?: Record<string, MacroSourceRecord>;
}

export interface MacroRouteLookup {
  segmentByNodeKey: Record<string, MacroSegmentView>;
  activityByNodeKey: Record<string, MacroActivityView>;
  activityBySegmentKey: Record<string, MacroActivityView[]>;
  segmentNodeKeyBySegmentKey: Record<string, string>;
  activityNodeKeyByActivityKey: Record<string, string>;
  nodeByNodeKey: Record<string, MacroNavigationNode>;
}

export interface MacroSegmentDecisionModel {
  segmentKey: string;
  nodeKey: string;
  title: string;
  availability: string;
  coverageStatus: string;
  summary: string;
  recommendedAction: string;
  keyRisk: string;
  keyUpside: string;
  statusLabel: string;
  outlookLabel: string;
  activityCount: number;
  activityKeys: string[];
  ready: boolean;
  marketTrajectory: number | null;
  rightToPlay: number | null;
  positionSustainability: number | null;
}

export interface MacroPortfolioModel {
  companyName: string;
  heroThesis: string;
  segmentDecisions: MacroSegmentDecisionModel[];
}
