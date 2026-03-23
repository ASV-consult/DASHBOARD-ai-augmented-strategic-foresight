export type MacroEntryMode = 'dashboard' | 'reading';

export interface MacroMeta {
  run_id?: string;
  company_name: string;
  ticker?: string;
  presentation_version?: string;
}

export interface MacroEntryModes {
  default_mode: MacroEntryMode;
  available_modes: MacroEntryMode[];
  dashboard_entry_view: string;
  reading_entry_view: string;
}

export interface MacroBadgeMetric {
  label: string;
  value: number | string;
}

export interface MacroScoreBundle {
  market_attractiveness: number;
  right_to_play: number;
  position_sustainability: number;
  confidence?: string;
  outlook_label?: string;
}

export interface MacroOverviewThemeCard {
  theme_key: string;
  title: string;
  summary?: string;
  click_target: string;
}

export interface MacroOverviewSegmentCard {
  segment_key: string;
  title: string;
  short_description: string;
  click_target: string;
  activity_count: number;
  top_macro_forces: string[];
}

export interface MacroOverviewModule {
  title: string;
  summary?: string;
  metrics?: MacroBadgeMetric[];
  cards?: Array<{
    title: string;
    summary?: string;
    click_target?: string;
  }>;
  points?: string[];
}

export interface MacroOverviewView {
  view_key: string;
  view_type: string;
  title: string;
  summary?: string;
  hero_metrics?: MacroBadgeMetric[];
  segment_cards: MacroOverviewSegmentCard[];
  portfolio_signals: string[];
  top_macro_themes: MacroOverviewThemeCard[];
  reading_mode_target?: string;
  module_order?: string[];
  modules?: Record<string, MacroOverviewModule>;
}

export interface MacroSegmentSummary {
  one_liner?: string;
  why_it_matters?: string;
}

export interface MacroBusinessMap {
  products?: string[];
  end_markets?: string[];
  key_geographies?: string[];
}

export interface MacroSegmentJudgment {
  summary?: string;
  transition_risk_level?: string;
}

export interface MacroMacroForce {
  theme_key?: string;
  title?: string;
  theme?: string;
  subtheme_label?: string;
  subtheme?: string;
  impact_direction?: string;
  direction?: string;
  importance_rank?: number;
  severity?: string;
  time_horizon?: string;
  summary?: string;
  why_it_matters?: string;
  affected_activities?: string[];
  click_target?: string;
}

export interface MacroSubactivityCard {
  activity_key: string;
  title: string;
  short_description: string;
  compact_summary?: string;
  key_products?: string[];
  key_geographies?: string[];
  click_target: string;
  scores: MacroScoreBundle;
}

export interface MacroDeepResearchHighlight {
  activity_key: string;
  title: string;
  market_outlook?: string;
  right_to_play?: string;
  watchpoints?: string[];
  click_target: string;
  judgment_stack?: MacroScoreBundle;
}

export interface MacroSegmentModules {
  what_matters_now?: {
    title: string;
    points: string[];
  };
  segment_snapshot?: {
    title: string;
    summary?: string;
    activity_count?: number;
    why_it_matters?: string;
  };
  business_map?: {
    title: string;
    products_services?: string[];
    end_markets?: string[];
    key_geographies?: string[];
  };
  activity_index?: {
    title: string;
    cards: MacroSubactivityCard[];
  };
  macro_force_map?: {
    title: string;
    forces: MacroMacroForce[];
  };
  deep_research_highlights?: {
    title: string;
    cards: MacroDeepResearchHighlight[];
  };
  segment_judgment?: {
    title: string;
    summary?: string;
    transition_risk_level?: string;
  };
}

export interface MacroSegmentView {
  view_key: string;
  route_key: string;
  view_type: string;
  segment_key: string;
  title: string;
  short_description?: string;
  header_badges?: MacroBadgeMetric[];
  segment_summary?: MacroSegmentSummary;
  business_map?: MacroBusinessMap;
  subactivity_cards: MacroSubactivityCard[];
  major_macro_forces: MacroMacroForce[];
  deep_research_highlights?: MacroDeepResearchHighlight[];
  segment_judgment?: MacroSegmentJudgment;
  module_order?: string[];
  modules?: MacroSegmentModules;
}

export interface MacroFiveForce {
  level?: string;
  summary?: string;
  key_players?: string[];
}

export interface MacroScenarioBox {
  title?: string;
  base_case?: string;
  bull_case?: string;
  bear_case?: string;
  triggers?: string[];
  leading_indicators?: string[];
  what_changes_the_judgment?: string[];
}

export interface MacroEvidenceLens {
  count?: number;
  source_tiers?: string[];
  unique_sources?: number;
  qa_statuses?: string[];
}

export interface MacroEvidenceQuality {
  title?: string;
  total_promoted_items?: number;
  source_tiers?: string[];
  coverage_by_lens?: Record<string, MacroEvidenceLens>;
  open_gaps?: string[];
  citation_count?: number;
  citations?: string[];
}

export interface MacroActivityModules {
  judgment_stack?: MacroScoreBundle;
  what_matters_now?: {
    title: string;
    points: string[];
  };
  activity_snapshot?: {
    title: string;
    summary?: string;
    why_it_matters?: string;
    why_separate?: string;
  };
  business_footprint?: {
    title: string;
    products_services?: string[];
    end_markets?: string[];
    customer_types?: string[];
    key_geographies?: string[];
    value_chain_position?: string;
    relevant_players?: string[];
  };
  market_clock?: {
    title: string;
    current_stage?: string;
    speed_of_change?: string;
    growth_profile?: string;
    key_demand_drivers?: string[];
    key_headwinds?: string[];
    inflection_points?: string[];
    summary?: string;
  };
  five_forces?: {
    title: string;
    competitive_rivalry?: MacroFiveForce;
    supplier_power?: MacroFiveForce;
    customer_power?: MacroFiveForce;
    threat_of_substitutes?: MacroFiveForce;
    threat_of_new_entry?: MacroFiveForce;
    overall_structure_judgment?: string;
  };
  defensibility_test?: {
    title: string;
    defensibility_score?: number;
    current_advantages?: string[];
    structural_weaknesses?: string[];
    must_be_true?: string[];
    failure_modes?: string[];
    summary?: string;
  };
  macro_force_map?: {
    title: string;
    forces: MacroMacroForce[];
  };
  scenario_box?: MacroScenarioBox;
  evidence_quality?: MacroEvidenceQuality;
}

export interface MacroActivityView {
  view_key: string;
  route_key: string;
  view_type: string;
  activity_key: string;
  parent_segment_key: string;
  title: string;
  short_description?: string;
  scores: MacroScoreBundle;
  module_order?: string[];
  modules?: MacroActivityModules;
}

export interface MacroThemeView {
  view_key: string;
  route_key: string;
  view_type: string;
  theme_key: string;
  title: string;
  what_is_changing?: string;
  why_it_matters?: string;
  affected_segments?: string[];
  affected_activities?: string[];
  strategic_implications?: string[];
  key_evidence?: string[];
  citations?: string[];
}

export interface MacroReadingSectionItem {
  title: string;
  summary?: string;
  click_target?: string;
}

export interface MacroReadingSection {
  section_key: string;
  title: string;
  paragraphs?: string[];
  items?: MacroReadingSectionItem[];
}

export interface MacroReadingView {
  view_key: string;
  view_type: string;
  title: string;
  summary?: string;
  sections: MacroReadingSection[];
}

export interface MacroNavigationNode {
  node_key: string;
  label: string;
  node_type: string;
  children: MacroNavigationNode[];
}

export interface MacroSourceRecord {
  source_key: string;
  title: string;
  url?: string;
  publication_date?: string | null;
  source_domain?: string;
  source_tier?: string;
  source_quality?: number;
}

export interface MacroDashboardData {
  meta: MacroMeta;
  entry_modes: MacroEntryModes;
  default_route: string;
  recommended_user_flow: string[];
  overview_view: MacroOverviewView;
  segment_views: MacroSegmentView[];
  activity_views: MacroActivityView[];
  theme_views: MacroThemeView[];
  executive_reading_view: MacroReadingView;
  navigation_tree: MacroNavigationNode[];
  view_registry: Record<string, string>;
  source_index?: Record<string, MacroSourceRecord>;
}
