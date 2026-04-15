export interface FinancialRunMeta {
  run_id: string;
  company: string;
  ticker: string;
  created_at: string;
  created_at_pretty?: string;
  status?: string;
  preferred_year?: number;
}

export interface FinancialCompanyProfile {
  name: string;
  ticker: string;
  sector?: string;
  industry?: string;
  hq?: string;
  country?: string;
  employees?: number;
  website?: string;
  exchange?: string;
  currency?: string;
  primary_profit_metric?: string;
  long_business_summary?: string;
}

export interface FinancialTopFlag {
  flag_id?: string;
  severity?: string;
  signal_type?: string;
  category?: string;
  metric?: string;
  period?: string;
  value?: number;
  baseline?: number;
  delta?: number;
  comparator?: string;
  message?: string;
}

export interface FinancialFlag {
  message?: string;
  severity?: string;
  section?: string;
}

export interface FinancialRiskSnapshot {
  deterministic_flags_total?: number;
  high_severity_flags?: number;
  risk_signals?: number;
  medium_or_high_accounting_checks?: number;
  low_confidence_claims?: number;
  flags?: FinancialFlag[];
}

export interface FinancialExecutiveSummary {
  executive_thesis?: string;
  professional_outcome_report?: string;
  critic_verdict?: string;
  top_flag?: FinancialTopFlag;
  risk_snapshot?: FinancialRiskSnapshot;
}

export interface FinancialKpi {
  key: string;
  label: string;
  value: number;
  display_value?: string;
  subtext?: string;
  trend?: string;
  unit?: string;
  prior_year?: number | null;
  yoy_change_pct?: number | null;
  source?: string;
}

export interface FinancialTakeaway {
  headline: string;
  detail: string;
  priority?: string;
}

export interface FinancialDataTableRow {
  [key: string]: string | number | null | undefined;
}

export interface FinancialDataTable {
  name: string;
  rows: FinancialDataTableRow[];
}

export interface FinancialSectionArVsYf {
  concept?: string;
  ar_metric?: string;
  ar_value?: number | null;
  ar_unit?: string;
  yf_metric?: string;
  yf_label?: string;
  yf_value?: number | null;
  comparability?: string;
  gap_pct?: number | null;
  definition_from_ar?: string;
  bridge_explanation?: string;
  review_confidence?: string;
}

export interface FinancialAnalysisSection {
  // legacy shape
  aspect_key?: string;
  title: string;
  text?: string;
  // new richer shape (from analysis/json_builder.py)
  narrative?: string;
  flags?: FinancialFlag[];
  data_tables?: FinancialDataTable[];
  ar_vs_yf?: FinancialSectionArVsYf[];
}

export interface FinancialMarketSnapshot {
  price?: number;
  price_display?: string;
  currency?: string;
  market_cap?: number;
  market_cap_display?: string;
  enterprise_value?: number;
  enterprise_value_display?: string;
  fifty_two_week_low?: number;
  fifty_two_week_high?: number;
  fifty_two_week_change_pct?: number;
  beta?: number;
  dividend_yield_pct?: number;
  dividend_rate?: number;
  payout_ratio?: number;
  pe_ratio?: number;
  forward_pe?: number;
  ev_to_ebitda?: number;
  ev_to_revenue?: number;
  price_to_book?: number;
  price_to_sales?: number;
  shares_outstanding?: number;
  float_shares?: number;
  source?: string;
}

export interface FinancialGovernanceScores {
  audit_risk?: number;
  board_risk?: number;
  compensation_risk?: number;
  shareholder_rights_risk?: number;
  overall_risk?: number;
  source?: string;
  scale_note?: string;
}

export interface FinancialCharts {
  years: Array<string | number>;
  // AR series (primary)
  revenue_m?: Array<number | null>;
  revenue_b?: Array<number | null>;
  ebita_m?: Array<number | null>;
  ebitda_m?: Array<number | null>;
  net_profit_m?: Array<number | null>;
  fcf_m?: Array<number | null>;
  net_debt_m?: Array<number | null>;
  working_capital_m?: Array<number | null>;
  capex_m?: Array<number | null>;
  ebita_margin_pct?: Array<number | null>;
  // Margin series (derived / YF)
  gross_margin_pct?: Array<number | null>;
  operating_margin_pct?: Array<number | null>;
  ebitda_margin_pct?: Array<number | null>;
  ebitda_margin_pct_yf?: Array<number | null>;
  net_margin_pct?: Array<number | null>;
  // YF parallel series
  revenue_m_yf?: Array<number | null>;
  revenue_b_yf?: Array<number | null>;
  ebitda_m_yf?: Array<number | null>;
  net_profit_m_yf?: Array<number | null>;
  fcf_m_yf?: Array<number | null>;
  capex_m_yf?: Array<number | null>;
  // Legacy
  gross_profit_b?: Array<number | null>;
  operating_income_m?: Array<number | null>;
  net_income_m?: Array<number | null>;
  operating_cash_flow_m?: Array<number | null>;
  free_cash_flow_m?: Array<number | null>;
  source?: string;
}

export interface FinancialHistoricalRow {
  metric: string;
  unit: string;
  values: Array<number | null>;
  values_by_year?: Record<string, number | null>;
  source?: string;
  // YF parallel series
  yf_values?: Array<number | null>;
  yf_values_by_year?: Record<string, number | null>;
  yf_metric_key?: string;
}

export interface FinancialHistoricalTable {
  years: Array<string | number>;
  rows: FinancialHistoricalRow[];
}

export interface FinancialRatioCard {
  label: string;
  value: number;
  kind?: string;
}

export interface FinancialRatioCards {
  dupont?: {
    net_margin_pct?: number;
    asset_turnover?: number;
    financial_leverage?: number;
    roe_pct?: number;
  };
  profitability_returns?: FinancialRatioCard[];
  liquidity_solvency?: FinancialRatioCard[];
  efficiency?: FinancialRatioCard[];
  valuation_governance?: FinancialRatioCard[];
}

export interface FinancialScenarioRow {
  name: string;
  revenue_growth_pct?: number;
  projected_revenue?: number;
  ebitda_margin_pct?: number;
  projected_ebitda?: number;
  projected_debt_to_ebitda?: number;
  ev_ebitda_multiple?: number;
  implied_equity_value?: number;
  implied_upside_pct?: number;
}

export interface FinancialScenarioAnalysis {
  summary?: string;
  horizon?: string;
  rows: FinancialScenarioRow[];
}

export interface FinancialPeerValue {
  ticker: string;
  value: number;
  currency?: string;
}

export interface FinancialStatementMetric {
  metric_code: string;
  label: string;
  value: number;
  unit: string;
  status?: string;
  yoy_change?: number | null;
  yoy_change_pct?: number | null;
  peer_median?: number | null;
  currency_comparable?: boolean;
}

export interface FinancialStatementHighlight {
  metric_code?: string;
  label?: string;
  value?: number;
  unit?: string;
  status?: string;
  direction?: string;
  peer_median?: number | null;
  peer_gap?: number | null;
  relative_gap?: number | null;
  peer_values?: FinancialPeerValue[];
  excluded_due_currency?: string[];
  currency_sensitive?: boolean;
  currency_comparable?: boolean;
  comparison_note?: string | null;
}

export interface FinancialEvidence {
  file?: string;
  doc_year?: number;
  score?: number;
  vector_score?: number;
  sparse_score?: number;
  recency_boost?: number;
  preview?: string;
}

export interface FinancialStatementSection {
  title: string;
  summary?: string;
  expert_assessment?: string;
  question?: string;
  metrics?: FinancialStatementMetric[];
  top_risks?: FinancialStatementHighlight[];
  top_strengths?: FinancialStatementHighlight[];
  currency_limited_metrics?: string[];
  evidence?: FinancialEvidence[];
}

export interface FinancialStatementLabMetric {
  metric_name: string;
  target_value: number;
  peer_median?: number;
  status?: string;
  abs_gap?: number;
  relative_gap?: number;
  direction?: string;
  peer_count?: number;
  peer_values?: FinancialPeerValue[];
  comparator?: string;
  source_payload_key?: string;
}

export interface FinancialStatementLab {
  summary?: string;
  currency_context?: {
    target_ticker?: string;
    target_currency?: string;
    requires_normalization?: boolean;
    mixed_currency_peers?: string[];
    missing_currency_peers?: string[];
    notes?: string[];
  };
  statements?: {
    income_statement?: FinancialStatementSection;
    balance_sheet?: FinancialStatementSection;
    cash_flow?: FinancialStatementSection;
  };
  returns_dimension_metrics?: FinancialStatementLabMetric[];
  liquidity_dimension_metrics?: FinancialStatementLabMetric[];
}

export interface FinancialDiscrepancyAnnualComparison {
  year: string;
  yahoo_value?: number | null;
  reported_value?: number | null;
  gap?: number | null;
  gap_pct?: number | null;
  status?: string;
}

export interface FinancialDiscrepancyRow {
  metric_key: string;
  statement?: string;
  status?: string;
  yahoo_value?: number;
  reported_value_estimate?: number;
  gap_pct_estimate?: number;
  verification_priority?: string;
  next_check?: string;
  evidence_files?: string[];
  possible_explanations?: string[];
  annual_comparison?: FinancialDiscrepancyAnnualComparison[];
}

export interface FinancialDiscrepancyBridge {
  summary?: string;
  overall_assessment?: string;
  annual_report_metric_store?: {
    summary?: string;
    method?: string;
    target_ticker?: string;
    metrics?: Record<string, unknown>;
    coverage_by_metric?: Record<string, unknown>;
  };
  rows?: FinancialDiscrepancyRow[];
}

export interface FinancialAccountingCheck {
  check_id: string;
  severity: string;
  status: string;
  message: string;
  recommendation?: string;
  keyword_hit_count?: number;
}

export interface FinancialAccountingQuality {
  summary?: string;
  checks?: FinancialAccountingCheck[];
}

export interface FinancialVerificationRow {
  claim_id: string;
  claim_text: string;
  confidence_level: string;
  confidence_score: number;
  evidence_count?: number;
}

export interface FinancialVerification {
  low_confidence_count?: number;
  claim_confidence_rows?: FinancialVerificationRow[];
}

export interface FinancialActionItem {
  owner: string;
  action: string;
  rationale?: string;
  urgency?: string;
}

export interface FinancialMonitoringIndicator {
  metric: string;
  why: string;
  trigger?: string;
}

export interface FinancialChallengeLoop {
  verdict?: string;
  contradictions?: string[];
  weak_causality?: string[];
  missing_risks?: string[];
  revision_actions?: string[];
  revised_outcome_focus?: string;
}

export interface FinancialChallengeResearchItem {
  action?: string;
  research_findings?: string;
  recommended_update?: string;
  confidence?: string;
  monitoring_indicator?: FinancialMonitoringIndicator;
  evidence?: FinancialEvidence[];
}

export interface FinancialChallengeFollowup {
  summary?: string;
  method?: string;
  research_items?: FinancialChallengeResearchItem[];
}

export interface FinancialPeerFxContext {
  peer_count?: number;
  approved_peers?: string[];
  requires_fx_normalization?: boolean;
  mixed_currency_peers?: string[];
  missing_currency_peers?: string[];
  notes?: string[];
}

export interface FinancialSectorIntelligence {
  pack?: string;
  detected_sector?: string;
  detected_industry?: string;
  focus_metrics?: string[];
  why_it_matters?: string | null;
}

export interface FinancialMetricTrendYoY {
  year: string;
  previous_year: string;
  yoy_change: number;
  yoy_change_pct: number;
}

export interface FinancialMetricTrend {
  label?: string;
  years?: string[];
  series?: Record<string, number>;
  earliest_year?: string;
  latest_year?: string;
  earliest_value?: number;
  latest_value?: number;
  delta?: number;
  delta_pct?: number;
  trend?: string;
  cagr?: number;
  yoy?: FinancialMetricTrendYoY[];
  reversal_count?: number;
}

export interface FinancialMultiYearContext {
  summary?: string;
  window_years?: number[];
  highlights?: string[];
  metric_trends?: Record<string, FinancialMetricTrend>;
}

/* ──── Metric-bridge (schema: metric_bridge_v1) ──────────────────────────
   Groups AR metrics into families (ebitda, ebita, ...) with named variants
   (statutory, adjusted, before_exceptionals, ...) and per-variant series.
   Replaces the single-value flat bridge row with structured variants + a
   reconciliation walk. See Annual_report_Reader/METRIC_BRIDGE_SCHEMA.md. */

export interface FinancialMetricVariant {
  variant: string;                 // "statutory" | "adjusted" | "before_exceptionals" | ...
  label: string;                   // display label
  label_in_ar: string;             // original metric name as it appears in the report
  series: Record<string, number | null>;
  focus_year_value?: number | null;
  source?: string;
  confidence?: string;
}

export interface FinancialMetricYfComparable {
  value_focus_year?: number | null;
  series?: Record<string, number | null>;
  variant_matched?: string | null;
  residual_gap_pct?: number | null;
  residual_gap_explanation?: string;
}

export interface FinancialMetricWalkComponent {
  label: string;
  amount: number;
}

export interface FinancialMetricWalk {
  from_variant: string;
  to_variant: string;
  focus_year?: number;
  delta: number;
  reason: string;
  confidence?: string;
  components?: FinancialMetricWalkComponent[];
}

export interface FinancialMetricFamily {
  family_key: string;
  canonical_label: string;
  currency?: string;
  unit?: string;
  variants: Record<string, FinancialMetricVariant>;
  yf_comparable?: FinancialMetricYfComparable | null;
  reconciliation_walks?: FinancialMetricWalk[];
  analyst_notes?: string;
  analyst_confidence?: string;
  primary_for_trend?: string;
  primary_for_peers?: string;
}

export interface FinancialMetricBridgeCoverage {
  families_with_multiple_variants?: string[];
  families_single_variant?: string[];
  families_yf_missing?: string[];
}

export interface FinancialMetricBridge {
  schema_version: string;
  generated_by: string;
  families: Record<string, FinancialMetricFamily>;
  coverage?: FinancialMetricBridgeCoverage;
}

export interface FinancialBridgeRow {
  concept?: string;
  ar_metric?: string;
  ar_value?: number | null;
  ar_unit?: string;
  yf_metric?: string;
  yf_label?: string;
  yf_value?: number | null;
  comparability?: string;
  gap_pct?: number | null;
  definition_from_ar?: string;
  bridge_explanation?: string;
  review_confidence?: string;
}

export interface FinancialSegment {
  segment: string;
  is_reconciling_item?: boolean;
  revenue?: number | null;
  revenue_yoy?: number | null;
  revenue_mix_pct?: number | null;
  ebita?: number | null;
  ebita_margin?: number | null;
  ebita_mix_pct?: number | null;
  organic_growth?: number | null;
}

export interface FinancialGuidance {
  target_period?: string;
  metric?: string;
  segment?: string;
  target_display?: string;
  is_qualitative?: boolean;
  actual_value?: number | null;
  status?: string;
  guidance_text?: string;
}

export interface FinancialAnalysisData {
  schema_version: string;
  generated_at_utc: string;
  run_meta: FinancialRunMeta;
  company_profile: FinancialCompanyProfile;
  executive_summary?: string;
  executive?: FinancialExecutiveSummary;
  kpis?: FinancialKpi[];
  key_takeaways?: FinancialTakeaway[];
  analysis_sections?: FinancialAnalysisSection[];
  market_snapshot?: FinancialMarketSnapshot;
  governance_scores?: FinancialGovernanceScores;
  financial_charts?: FinancialCharts;
  historical_table?: FinancialHistoricalTable;
  ratio_cards?: FinancialRatioCards;
  // New top-level sections from analysis/json_builder.py
  ar_vs_yf_bridge?: FinancialBridgeRow[];
  metric_bridge?: FinancialMetricBridge;
  segment_analysis?: FinancialSegment[];
  guidance_tracking?: FinancialGuidance[];
  // Legacy optional sections
  statement_lab?: FinancialStatementLab;
  scenario_analysis?: FinancialScenarioAnalysis;
  discrepancy_bridge?: FinancialDiscrepancyBridge;
  accounting_quality?: FinancialAccountingQuality;
  verification?: FinancialVerification;
  action_plan?: FinancialActionItem[];
  monitoring_indicators?: FinancialMonitoringIndicator[];
  challenge_loop?: FinancialChallengeLoop;
  challenge_followup?: FinancialChallengeFollowup;
  sector_intelligence?: FinancialSectorIntelligence;
  peer_fx_context?: FinancialPeerFxContext;
  multi_year_context?: FinancialMultiYearContext;
}
