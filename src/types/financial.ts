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
  employees?: number;
  website?: string;
  exchange?: string;
  currency?: string;
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

export interface FinancialRiskSnapshot {
  deterministic_flags_total?: number;
  high_severity_flags?: number;
  risk_signals?: number;
  medium_or_high_accounting_checks?: number;
  low_confidence_claims?: number;
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
}

export interface FinancialTakeaway {
  headline: string;
  detail: string;
  priority?: string;
}

export interface FinancialAnalysisSection {
  aspect_key: string;
  title: string;
  text: string;
}

export interface FinancialMarketSnapshot {
  price?: number;
  price_display?: string;
  market_cap?: number;
  market_cap_display?: string;
  enterprise_value?: number;
  enterprise_value_display?: string;
  fifty_two_week_low?: number;
  fifty_two_week_high?: number;
  fifty_two_week_change_pct?: number;
  beta?: number;
  dividend_yield_pct?: number;
  pe_ratio?: number;
  ev_to_ebitda?: number;
  price_to_book?: number;
}

export interface FinancialGovernanceScores {
  audit_risk?: number;
  board_risk?: number;
  compensation_risk?: number;
  shareholder_rights_risk?: number;
  overall_risk?: number;
}

export interface FinancialCharts {
  years: string[];
  revenue_b?: number[];
  gross_profit_b?: number[];
  operating_income_m?: number[];
  ebitda_m?: number[];
  net_income_m?: number[];
  operating_cash_flow_m?: number[];
  free_cash_flow_m?: number[];
  capex_m?: number[];
  gross_margin_pct?: number[];
  operating_margin_pct?: number[];
  ebitda_margin_pct?: number[];
  net_margin_pct?: number[];
}

export interface FinancialHistoricalRow {
  metric: string;
  unit: string;
  values: Array<number | null>;
}

export interface FinancialHistoricalTable {
  years: string[];
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

export interface FinancialAnalysisData {
  schema_version: string;
  generated_at_utc: string;
  run_meta: FinancialRunMeta;
  company_profile: FinancialCompanyProfile;
  executive?: FinancialExecutiveSummary;
  kpis?: FinancialKpi[];
  key_takeaways?: FinancialTakeaway[];
  analysis_sections?: FinancialAnalysisSection[];
  market_snapshot?: FinancialMarketSnapshot;
  governance_scores?: FinancialGovernanceScores;
  financial_charts?: FinancialCharts;
  historical_table?: FinancialHistoricalTable;
  ratio_cards?: FinancialRatioCards;
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
