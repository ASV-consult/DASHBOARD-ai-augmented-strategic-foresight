export interface SharePriceEvent {
  date: string;
  event_type: string;
  return_1d?: number | null;
  abnormal_return_1d?: number | null;
  explanation?: string;
  confidence?: number;
  market_lesson?: string;
}

export interface SharePriceProfile {
  total_return?: number | null;
  cagr?: number | null;
  annualized_volatility?: number | null;
  max_drawdown?: number | null;
  current_regime?: string;
  current_price?: number | null;
  '52w_high'?: number | null;
  '52w_low'?: number | null;
}

export interface SharePriceTrendNarrative {
  long_term?: string;
  medium_term?: string;
  recent?: string;
}

export interface SharePriceEarningsPattern {
  summary?: string;
  avg_day0_reaction?: number | null;
  avg_abnormal_day0?: number | null;
  market_tendency?: string;
}

export interface SharePricePeerContext {
  summary?: string;
  relative_performance_12m?: number | null;
  key_divergences?: string[];
}

export interface SharePriceMeta {
  run_id?: string;
  company?: string;
  ticker?: string;
  model?: string;
  iterations_used?: number;
  tool_calls?: number;
  generated_at?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export interface SharePriceAnalysisData {
  executive_summary?: string;
  price_profile?: SharePriceProfile;
  key_events?: SharePriceEvent[];
  trend_narrative?: SharePriceTrendNarrative;
  earnings_pattern?: SharePriceEarningsPattern;
  peer_context?: SharePricePeerContext;
  risk_factors?: string[];
  monitoring_priorities?: string[];
  _meta?: SharePriceMeta;
}
