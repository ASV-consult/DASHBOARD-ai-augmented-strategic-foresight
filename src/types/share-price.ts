// share-price.ts — types for schema_version: "share_price_v1"

export interface SharePriceRunMeta {
  run_id: string;
  company: string;
  ticker: string;
  benchmark_ticker: string;
  benchmark_label: string;
  generated_at: string;
  react_enabled: boolean;
  react_model?: string;
  anchors_analyzed: number;
}

export interface SharePriceCompanyProfile {
  name: string;
  sector?: string;
  industry?: string;
  country?: string;
  currency?: string;
  market_cap?: number;
  website?: string;
}

export interface PriceStats {
  total_return?: number;
  annualized_return?: number;
  annualized_volatility?: number;
  max_drawdown?: number;
  cagr?: number;
  latest_close?: number;
}

export interface PriceSeriesPoint {
  date: string;
  close: number;
  ma20?: number | null;
  ma50?: number | null;
  ma200?: number | null;
  volume?: number;
  normalized?: number;
  benchmark_normalized?: number;
}

export interface PricePerformance {
  target?: PriceStats;
  benchmark?: PriceStats & { latest_close?: number };
  relative?: {
    outperformance?: number;
    outperformance_annualized?: number;
    beta?: number | null;
    correlation_to_benchmark?: number | null;
  };
  price_series?: PriceSeriesPoint[];
  peer_normalized_series?: Record<string, Array<{ date: string; normalized: number }>>;
}

export interface TrendPeriod {
  start_date: string;
  end_date: string;
  trading_days: number;
  is_latest_period?: boolean;
  regime: string;
  dominant_regime?: string;
  regime_purity?: number;
  period_return?: number;
  period_abnormal_return?: number;
  benchmark_return?: number;
  velocity?: number;
  max_drawdown_in_period?: number;
  annualized_volatility?: number;
  event_count?: number;
  period_summary?: string;
  earnings_in_period?: number;
  // Peer attribution (added by peer_attribution.py)
  market_component?: number;
  sector_component?: number;
  idiosyncratic_component?: number;
  peer_composite_return?: number;
  attribution_flavour?: 'market' | 'sector' | 'idiosyncratic' | 'mixed' | 'unknown';
  attribution_summary?: string;
  strength_score?: number;
  // L2: sub-sector decomposition of the peer move during this period
  segment_peer_returns?: Array<{
    segment: string;
    weight: number;
    peer_count: number;
    peers: string[];
    peer_returns: Record<string, number>;
    avg_return: number;
  }>;
  // L2: broad sector-index returns + triangulation flag (added by sector_overlay.py)
  sector_index_returns?: Record<string, number>;
  sector_index_avg?: number;
  triangulation?: {
    flag?: 'sector_wide_confirmed' | 'sector_wide_partial' | 'peer_set_specific' | 'company_specific' | 'mixed' | 'inconclusive';
    summary?: string;
  };
}

export interface TrendAnalysis {
  current_regime?: string;
  momentum?: Record<string, number>;
  volatility_regime?: {
    regime?: string;
    latest_20d_annualized_vol?: number;
    volatility_percentile?: number;
  };
  vs_ma200?: number;
  trend_periods?: TrendPeriod[];
  // Added by drawdown_v1 + peer_attribution pipeline
  trend_periods_relative?: TrendPeriod[];
  drawdown_cycles?: Array<{ leg_type: string; start_date: string; end_date: string; leg_return: number }>;
  trend_detection_method?: string;
  peer_attribution?: PeerAttribution;
  sector_overlay?: SectorOverlay;
}

// L2 sector-index overlay (broader-than-peers triangulation)
export interface SectorOverlay {
  region?: string;
  tags?: string[];
  indices?: string[];
  index_meta?: Record<string, { first_date?: string; last_date?: string; n_obs?: number }>;
  period_overlay?: Array<{
    start_date: string;
    end_date: string;
    sector_index_returns: Record<string, number>;
    sector_index_avg?: number;
    benchmark_return?: number;
    triangulation?: { flag?: string; summary?: string };
  }>;
  degradation_notes?: string[];
}

export interface DriverTheme {
  theme: string;
  category?: string;
  importance_rank?: number;
  importance_score?: number;
  theme_type?: string; // "structural" | "cyclical" | "episodic"
  description?: string;
  historical_impact?: string;
  forward_looking?: string;
  monitoring_signals?: string[];
  evidence_events?: Array<{ date?: string; label?: string; impact?: string }>;
  linked_trend_regimes?: string[];
  linked_trend_periods?: string[];
  affected_segments?: string[];
}

export interface DriverMap {
  driver_themes?: DriverTheme[];
  dominant_narrative?: string;
  theme_interactions?: string[];
  regime_driver_map?: Record<string, string[]>;
  events_analyzed?: number;
}

export interface EventAttribution {
  most_probable_reason?: string;
  investor_interpretation?: string;
  confidence?: number;
  driver_breakdown?: Array<{
    driver: string;
    weight: number;
    direction: string;
    evidence_urls?: string[];
  }>;
  what_to_monitor_next?: string[];
  counter_hypotheses?: string[];
  queries?: Array<{ query: string; rationale?: string; round?: number }>;
  evidence?: Array<{ title: string; url: string; snippet?: string }>;
  relevant_results_count?: number;
  search_results_count?: number;
  // L3: sector-aware two-part explanation (populated for sector-flavour anchors)
  sector_move_explanation?: {
    peer_group_return_pp?: number;
    what_drove_peers?: string;
    catalysts?: string[];
    evidence_urls?: string[];
  };
  company_specific_explanation?: {
    idiosyncratic_return_pp?: number;
    what_aalberts_added?: string;
    catalysts?: string[];
    evidence_urls?: string[];
  };
  // Claude analyst: explicit step-by-step reasoning chain
  reasoning_chain?: string[];
  hypothesis_formed?: string;
  // NEW: model's own verdict on what the move was, separate from the triangulation math.
  move_classification?: {
    verdict?: 'company_specific_negative' | 'company_specific_positive' |
              'sector_wide_up' | 'sector_wide_down' | 'mixed' | 'macro_drift' | string;
    model_reasoning?: string;
    agreement_with_math?: 'agrees' | 'partial' | 'contradicts' | string;
    limitations_noted?: string;
  };
}

export interface SignificantEvent {
  date: string;
  close?: number;
  return_1d?: number;
  abnormal_return_1d?: number;
  z_score_60d?: number;
  volume_ratio_20d?: number;
  event_regime?: string;
  event_tags?: string[];
  event_score?: number;
  anchor_type?: string;
  anchor_title?: string;
  window_start?: string;
  window_end?: string;
  trading_days?: number;
  period_return?: number;
  period_abnormal_return?: number;
  attribution?: EventAttribution;
}

export interface PeerStat {
  ticker: string;
  name?: string;
  total_return?: number;
  annualized_return?: number;
  annualized_volatility?: number;
  max_drawdown?: number;
  correlation_to_target?: number;
}

export interface PeerComparison {
  peers?: PeerStat[];
  earnings_reaction?: {
    events_considered?: number;
    avg_return_day0?: number;
    avg_abnormal_day0?: number;
    avg_return_m1_p1?: number;
    avg_return_m3_p3?: number;
  };
}

export interface ExecutiveGuide {
  stock_story?: string;
  key_drivers?: Array<{ name: string; plain_summary: string; monitoring_threshold?: string }>;
  current_watch?: string;
}

// Forward-looking scenarios (Layer 1 of predictive framework)
export interface ForwardScenario {
  name: string;                    // "Bull Case", "Base Case", "Bear Case"
  probability_pct: number;         // 30, 45, 25
  target_price_low?: number;
  target_price_high?: number;
  triggers: string[];              // what needs to happen for this scenario
  what_confirms_it: string[];      // early signals that this scenario is playing out
  timeline?: string;               // "12-18 months"
  color?: string;                  // for dashboard rendering: "emerald", "slate", "red"
}

export interface ForwardScenarios {
  as_of_date: string;              // when scenarios were written
  current_price?: number;
  scenarios: ForwardScenario[];
  key_uncertainties?: string[];    // what the model genuinely cannot predict
  next_catalyst?: {                // nearest date that could change the picture
    date?: string;
    event?: string;
    expected_impact?: string;
  };
}

/* ──── Structured Watch / monitoring section ─────────────────────────
   Sits at top level inside the share price JSON alongside
   `executive_guide` and `forward_scenarios`. Each watch item is a
   specific signal to monitor with bull/bear thresholds, linked
   scenarios and drivers, and a source/cadence stamp.
   Schema defined in execution/part1/convergence/watch_models.py. */

export type WatchCategory =
  | 'earnings_event'
  | 'commodity_price'
  | 'corporate_action'
  | 'partnership_risk'
  | 'regulatory'
  | 'macro'
  | 'industry_structural'
  | 'competitor_action'
  | 'operational'
  | 'technology';

export type WatchDirection =
  | 'bull_positive'
  | 'bear_positive'
  | 'symmetric'
  | 'bidirectional';

export type WatchHorizon = 'near_term' | 'ongoing' | 'medium_term';
export type WatchUrgency = 'high' | 'medium' | 'low';

export type WatchStatus =
  | 'upcoming'
  | 'active'
  | 'approaching'
  | 'fired_bull'
  | 'fired_bear'
  | 'dormant';

export type WatchSourceType =
  | 'market_data'
  | 'company_release'
  | 'news'
  | 'regulatory_body'
  | 'industry_body'
  | 'analyst_report';

export type WatchCadence =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'scheduled_event'
  | 'as_available';

export interface WatchThresholds {
  bull?: string | null;
  bear?: string | null;
  bull_level?: number | null;
  bear_level?: number | null;
  unit?: string | null;
}

export interface WatchImpact {
  bull?: string | null;
  bear?: string | null;
  per_unit_move?: string | null;
  notes?: string | null;
}

export interface WatchSource {
  type: WatchSourceType;
  provider?: string | null;
  cadence: WatchCadence;
  reference?: string | null;
}

export interface WatchItem {
  id: string;
  title: string;
  category: WatchCategory;
  direction: WatchDirection;
  horizon: WatchHorizon;
  urgency: WatchUrgency;
  status: WatchStatus;

  summary: string;
  why_it_matters: string;
  what_to_look_for: string[];

  scheduled_date?: string | null;
  thresholds: WatchThresholds;
  current_value?: number | null;
  current_status_note?: string | null;

  impact_estimate?: WatchImpact | null;

  linked_scenarios: string[];
  linked_drivers: string[];

  source: WatchSource;
  last_checked?: string | null;
  verification?: string | null;
}

export interface Watch {
  as_of: string;
  summary: string;
  items: WatchItem[];
}

// Peer attribution + segment coverage (lives under trend_analysis.peer_attribution)
export interface PeerAttribution {
  peers_used?: string[];
  peers_attempted?: string[];
  peers_dropped_low_comparability?: Array<{
    ticker: string;
    name?: string;
    comparability?: string;
    reason?: string;
  }>;
  segment_weights?: Record<string, number>;
  segment_coverage?: Record<string, { weight: number; peers: string[]; peer_count: number }>;
  target_segment_mix?: Record<string, { revenue_eur: number; share_pct: number }>;
  coverage_confidence?: 'high' | 'medium' | 'low';
  coverage_notes?: string[];
  composite_series?: Array<{ date: string; close: number }>;
  sources?: { industry_analysis?: string; financial_bundle?: string };
  degradation_notes?: string[];
}

// Root export — name kept as SharePriceAnalysisData so ForesightContext needs no change
export interface SharePriceAnalysisData {
  schema_version: string; // "share_price_v1"
  run_meta: SharePriceRunMeta;
  company_profile?: SharePriceCompanyProfile;
  analysis_period?: { start_date: string; end_date: string; trading_days: number };
  price_performance?: PricePerformance;
  trend_analysis?: TrendAnalysis;
  driver_map?: DriverMap;
  peer_comparison?: PeerComparison;
  significant_events?: SignificantEvent[];
  executive_guide?: ExecutiveGuide;
  forward_scenarios?: ForwardScenarios;
  watch?: Watch;
}
