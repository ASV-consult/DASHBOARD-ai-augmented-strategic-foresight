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
}
