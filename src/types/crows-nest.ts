/**
 * Crow's Nest 2.0 — Stream 4 dashboard data types.
 *
 * Mirrors the JSON produced by `crows_nest_v2/derivers/build_dashboard_bundle.py`.
 *
 * Design principle: the BACKEND pre-renders verdict strings (verdict_sentence,
 * one_line_why, plain_state, etc.). React components are dumb renderers — they
 * never compose verdicts from raw numbers. See plan Part 2 (clarity directive).
 */

export type CrowsNestSchemaVersion = 'crows_nest_v2';

export type ConvictionTier = 'Stationary' | 'Drifting' | 'Vulnerable' | 'Fragile' | 'Critical';

/** Plain-language tier (rendered server-side; never derived in React). */
export type PlainTier =
  | 'holding'
  | 'mixed (mildly supportive)'
  | 'mixed'
  | 'drifting'
  | 'at risk'
  | 'drifting against'
  | 'breaking';

export interface CrowsNestMeta {
  company: string;
  ticker: string;
  cycle_date: string; // YYYY-MM-DD
  generated_at: string; // ISO datetime
}

/** L1 hero strip — verdict-first, raw numbers nested under .raw for tooltips. */
export interface CrowsNestHeadline {
  verdict_sentence: string;
  early_warning_phrase: string;
  honesty_sentence: string;
  biggest_concern_dimension_id: string | null;
  tier_changes_this_cycle: Array<{
    dimension_id: string;
    plain_change_phrase: string;
  }>;
  raw: {
    dimensions_breaking: number;
    dimensions_at_risk: number;
    dimensions_mixed: number;
    dimensions_holding: number;
    dimensions_total: number;
    critical_dimensions: string[];
    overall_brier: number | null;
  };
}

/** A single point in a per-cycle history series. */
export interface CrowsNestHistoryPoint {
  cycle_date: string;
  truth_likelihood: number;
  conviction_tier?: ConvictionTier | string;
}

export interface CrowsNestForecastPoint {
  cycle_date: string;
  truth_likelihood: number;
  ci_low: number;
  ci_high: number;
}

/** Bets-register types — system view, optional user override, computed divergence. */
export interface ProjectionClaim {
  claim: string;
  target_value?: number | string | null;
  target_metric?: string | null;
  resolution_date: string;
  as_of?: string;
  rationale?: string;
}

export interface UserAssertion extends ProjectionClaim {
  set_by: string;
  set_at: string;
}

export interface ProjectionDivergence {
  delta: number | string | null;
  severity: 'minor' | 'moderate' | 'material';
  last_evaluated: string;
  summary: string;
}

export type ResearchPriority = 'auto' | 'elevated' | 'deferred';

/** Provenance — Tier 3 "based on what?" trail. */
export interface ProjectionProvenanceArtefact {
  stream: 'strategic' | 'financial' | 'macro' | 'convergence' | string;
  kind: string; // 'core_assumption' | 'signal' | 'segment_view' | 'segment_kpi' | 'analysis_section' | ...
  ref: string;
  title: string;
  snippet: string;
}

export interface ProjectionProvenance {
  source_streams: string[];
  source_artefacts: ProjectionProvenanceArtefact[];
  primary_anchor?: string;
  confidence: 'high' | 'medium' | 'low' | string;
  notes?: string;
}

/** Tier 6 — Baseline research note (the "why this prior" backstory). */
export interface BaselineEvidence {
  source_type: 'strategic' | 'financial' | 'macro' | 'convergence' | 'external_research' | string;
  ref: string;
  snippet: string;
  implication: string;
}

export interface BaselineResearchNote {
  summary: string;
  key_evidence: BaselineEvidence[];
  what_would_move_it_up: string[];
  what_would_move_it_down: string[];
}

/** Tier 6 — Forward projection: central path + alternate scenario. */
export interface ProjectionForwardScenario {
  name?: string;
  narrative: string;
  tl_at_resolution?: number;
}

export interface ProjectionForwardCone {
  central_path: {
    direction: 'rising' | 'falling' | 'holding' | 'widening_band' | string;
    expected_tl_at_resolution: { low: number; mid: number; high: number };
    narrative: string;
  };
  alternate_scenario?: ProjectionForwardScenario | null;
}

export interface PivotEventMeta {
  expected_date?: string;
  kind?: string;
  headline?: string;
  watch_indicators?: string[];
}

export interface CrowsNestProjection {
  id: string;
  claim: string; // effective claim — equals user_assertion.claim when set, else system_claim.claim
  resolution_date: string; // YYYY-MM-DD

  // Bets-register layer (Phase A)
  system_claim?: ProjectionClaim | null;
  user_assertion?: UserAssertion | null;
  divergence?: ProjectionDivergence | null;
  research_priority?: ResearchPriority;
  company_view?: ProjectionClaim | null;

  // Readability layer (Tier 2 — analyst-anchored prose, replaces templated boilerplate)
  human_title?: string;
  claim_explainer?: string;
  plain_verdict?: string;
  plain_why?: string;

  // Provenance layer (Tier 3 — what the projection is based on)
  provenance?: ProjectionProvenance | null;

  // Re-anchor layer (Tier 6 — Class A/B priors + baseline research + forward projection)
  prior?: number;
  prior_class?: 'forward_looking' | 'currently_observable_persistence' | string | null;
  prior_rationale?: string;
  baseline_research_note?: BaselineResearchNote | null;
  forward_projection?: ProjectionForwardCone | null;
  pivot_event?: boolean;
  pivot_event_meta?: PivotEventMeta | null;

  // Legacy plain-language fields (kept for back-compat; UI prefers human_title/plain_verdict/plain_why)
  plain_outcome_phrase: string; // "Likely to hold" | "At risk" | "Marginal" | ...
  verdict_sentence: string;
  one_line_why: string;
  latest_evidence_summary: string;

  current: {
    truth_likelihood: number; // 0..1
    ci: [number, number];
    conviction_tier: ConvictionTier | string;
    plain_tier: PlainTier | string;
  };
  forecast_trajectory: CrowsNestForecastPoint[];
  history: Array<{ cycle_date: string; truth_likelihood: number }>;
  drivers: string[];
  sensitivity: Record<string, { weight: number; direction: 'positive' | 'negative' }>;
  evidence_card_ids: string[];
}

/** Compressed driver summary for the L2 mini-grid (4-8 per dimension, not all 156). */
export interface CrowsNestDriverIndicator {
  name?: string;
  source?: string;
  cadence?: string;
  threshold_negative?: string;
  threshold_positive?: string;
}

export interface CrowsNestDriverSummary {
  id: string;
  name: string;
  category: 'macro' | 'industry' | 'company' | 'policy' | 'technology' | 'social' | string;
  // Tier 5 readability fields
  definition?: string;
  indicators?: CrowsNestDriverIndicator[];
  current_state: {
    score: number; // -1..+1
    velocity: number;
    headline?: string;
  };
  cross_dimensions: string[]; // dimensions OTHER than this one that the driver also touches
  history: Array<{ cycle_date: string; score: number }>;
}

export interface CrowsNestDimension {
  id: string;
  name: string;
  definition: string;
  implicit_bet: string;
  asymmetric_failure_mode: string;

  // PRE-RENDERED plain-language fields
  plain_state: PlainTier | string;
  verdict_sentence: string;
  one_line_why: string;
  suggested_next_click: string;

  current: {
    truth_likelihood: number;
    conviction_tier: ConvictionTier | string;
    plain_tier: PlainTier | string;
    as_of: string;
  };
  history: Array<{
    cycle_date: string;
    aggregate_truth_likelihood?: number;
    truth_likelihood?: number;
    conviction_tier?: string;
  }>;
  forecast_trajectory: CrowsNestForecastPoint[];
  projections: CrowsNestProjection[];
  driver_summaries: CrowsNestDriverSummary[];
}

/** Active macro theme (Stage D). */
export interface CrowsNestMacroTheme {
  id: string;
  theme: string;
  pillar: 'Social' | 'Technology' | 'Economic' | 'Environmental' | 'Political_Legal' | 'Ethical' | string;
  status: 'emerging' | 'active' | 'mature' | 'archived' | string;
  current_state: {
    trajectory: 'rising' | 'holding' | 'falling' | 'two-sided' | string;
    headline: string;
    theme_truth_likelihood?: number;
    theme_tier?: string;
  };
  scenario_probabilities: Record<string, number>;
  indicators: Array<{
    name: string;
    current_value: string | number | null;
    threshold: string | null;
    velocity_per_cycle?: number | null;
    source: string;
  }>;
  propagation_matrix: Array<{
    company: string;
    driver_id: string;
    rule: string;
    current_contribution: number;
  }>;
  chronology: Array<{
    date: string;
    event: string;
    card_id?: string;
  }>;
  deep_read: {
    what_is_actually_happening: string;
    current_assessed_state: string;
  };

  // Tier-6 parity (Phase G)
  prior_class?: 'forward_looking' | 'currently_observable_persistence' | string | null;
  prior?: number;
  prior_rationale?: string;
  theme_truth_likelihood?: number;
  theme_tier?: string;
  baseline_research_note?: BaselineResearchNote | null;
  forward_projection?: ProjectionForwardCone | null;
}

/** A single evidence card. */
export interface CrowsNestEvidenceCard {
  id: string;
  primary_driver: string;
  date_observed: string;
  headline: string;
  source: {
    name: string;
    type?: string;
    url?: string | null;
    quality?: number;
  };
  deep_read: {
    what_actually_happened?: string;
    why_it_matters_for_driver?: string;
    adjacency_implications?: string;
    counterfactual?: string;
  };
  score: {
    direction: number; // -1, 0, 1
    magnitude: number; // 1, 2, 3
    confidence: number; // 1..5
    computed_signal: number;
  };
}

export interface CrowsNestCalibration {
  overall_brier: number | null;
  n_forecasts: number;
  by_lead_bucket: Array<{
    lead_bucket: string;
    n_forecasts: number;
    avg_brier: number;
  }>;
  by_vector: Array<{
    vector: string;
    n_forecasts: number;
    avg_brier: number;
  }>;
  earliest_correctly_confident: Array<{
    vector: string;
    forecast_cycle: string;
    lead_quarters: number;
    truth_likelihood: number;
    tier?: string;
    brier: number;
  }>;
}

export interface CrowsNestWhatIfScenario {
  id: string;
  label: string;
  markdown: string;
}

/** Bets-register top-level slice (Phase A). */
export interface CrowsNestBetsRegister {
  divergent_projections: Array<{
    projection_id: string;
    dimension_id: string;
    system_claim: ProjectionClaim | null;
    user_assertion: UserAssertion | null;
    divergence: ProjectionDivergence | null;
    research_priority: ResearchPriority;
  }>;
  research_queue_top20: Array<{
    projection_id: string;
    dimension_id: string;
    claim: string;
    research_priority: ResearchPriority;
    divergence_severity: 'minor' | 'moderate' | 'material' | null;
    truth_likelihood: number;
    tl_distance_from_neutral: number;
    conviction_tier: string;
    resolution_date: string;
    user_overridden: boolean;
  }>;
  totals: {
    all_projections: number;
    with_user_assertion: number;
    divergent_material: number;
    elevated_priority: number;
  };
}

/** Status Quo Outlook (Phase B) — the 3-year baseline document. */
export interface StatusQuoSegmentTrajectory {
  segment: string;
  narrative: string;
  anchors: {
    revenue_eur_m_y3_low?: number | null;
    revenue_eur_m_y3_high?: number | null;
    ebit_eur_m_y3_low?: number | null;
    ebit_eur_m_y3_high?: number | null;
    ebit_margin_y3_pct?: number | null;
    roce_pct_y3?: number | null;
    [k: string]: number | string | null | undefined;
  };
  depends_on_projections: string[];
  divergence_aware_variant?: {
    narrative?: string;
    shifted_anchors?: Record<string, number | null>;
  } | null;
}

export interface StatusQuoGroupPath {
  // Single-value forms
  revenue_eur_m_y1?: number | null;
  revenue_eur_m_y3?: number | null;
  ebit_eur_m_y1?: number | null;
  ebit_eur_m_y3?: number | null;
  fcf_eur_m_y3?: number | null;
  net_debt_y3?: number | null;
  leverage_y3?: number | null;
  // Band forms (preferred — synthesizers may emit low/high/mid)
  revenue_ex_metal_eur_m_y1?: number | null;
  revenue_ex_metal_eur_m_y3?: number | null;
  ebit_eur_m_y3_low?: number | null;
  ebit_eur_m_y3_high?: number | null;
  ebit_eur_m_y3_mid?: number | null;
  ebitda_eur_m_y3_low?: number | null;
  ebitda_eur_m_y3_high?: number | null;
  fcf_eur_m_y3_low?: number | null;
  fcf_eur_m_y3_high?: number | null;
  fcf_eur_m_y3_mid?: number | null;
  cumulative_fcf_3yr_eur_m_low?: number | null;
  cumulative_fcf_3yr_eur_m_high?: number | null;
  net_debt_y3_low?: number | null;
  net_debt_y3_high?: number | null;
  net_debt_y3_mid?: number | null;
  leverage_y3_low?: number | null;
  leverage_y3_high?: number | null;
  leverage_y3_mid?: number | null;
  dividend_path?: {
    y0?: number | null;
    y1?: number | null;
    y2?: number | null;
    y3?: number | null;
  };
  dividend_path_basis?: string | null;
  [k: string]: unknown;
}

export interface StatusQuoDependency {
  projection_id: string;
  if_breaks: string;
  current_truth_likelihood?: number | null;
}

export interface StatusQuoDivergenceCallout {
  projection_id: string;
  system_target?: number | string | null;
  user_assertion_target?: number | string | null;
  delta_implication: string;
}

export interface StatusQuoRisk {
  risk: string;
  likelihood: 'low' | 'medium' | 'high' | string;
  mitigation: string;
  anchor_projection_ids?: string[];
}

export interface StatusQuoValidatorIssue {
  severity: 'blocker' | 'warning' | 'info' | string;
  category: string;
  description: string;
  anchor?: string;
}

export interface StatusQuoValidatorReport {
  passed: boolean;
  issues: StatusQuoValidatorIssue[];
  revisions_applied: number;
  summary?: string;
  blocker_count?: number;
  warning_count?: number;
}

export interface CrowsNestStatusQuoOutlook {
  schema_version: 'status_quo_v1';
  company: string;
  ticker?: string | null;
  as_of_cycle: string;
  horizon_years: number;
  generated_at?: string;
  headline: string;
  trajectory_by_segment: StatusQuoSegmentTrajectory[];
  group_path: StatusQuoGroupPath;
  key_dependencies: StatusQuoDependency[];
  divergence_callouts: StatusQuoDivergenceCallout[];
  risks_and_mitigations: StatusQuoRisk[];
  narrative_md: string;
  validator_report: StatusQuoValidatorReport;
}

/** Top-level bundle that the dashboard ingests. */
export interface CrowsNestData {
  schema_version: CrowsNestSchemaVersion;
  meta: CrowsNestMeta;
  headline: CrowsNestHeadline;
  dimensions: CrowsNestDimension[];
  macro_themes: CrowsNestMacroTheme[];
  evidence_cards: Record<string, CrowsNestEvidenceCard>;
  calibration: CrowsNestCalibration;
  what_if_scenarios: CrowsNestWhatIfScenario[];
  bets_register?: CrowsNestBetsRegister;
  status_quo_outlook?: CrowsNestStatusQuoOutlook | null;
}

/** Type guard — used by the upload hook to dispatch payload to the right slot. */
export function isCrowsNestPayload(value: unknown): value is CrowsNestData {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v.schema_version !== 'crows_nest_v2') return false;
  if (typeof v.meta !== 'object' || v.meta === null) return false;
  if (typeof v.headline !== 'object' || v.headline === null) return false;
  if (!Array.isArray(v.dimensions)) return false;
  return true;
}

/** Color mapping for the velocity grid + chart. Truth-likelihood 0..1 → tailwind class. */
export function truthLikelihoodToColor(tl: number): string {
  if (tl >= 0.65) return 'bg-emerald-500';
  if (tl >= 0.55) return 'bg-emerald-300';
  if (tl >= 0.45) return 'bg-slate-400';
  if (tl >= 0.35) return 'bg-amber-500';
  if (tl >= 0.20) return 'bg-orange-500';
  return 'bg-red-500';
}

/** Same mapping but returning a hex color, useful for inline SVG / recharts. */
export function truthLikelihoodToHex(tl: number): string {
  if (tl >= 0.65) return '#10b981'; // emerald-500
  if (tl >= 0.55) return '#6ee7b7'; // emerald-300
  if (tl >= 0.45) return '#94a3b8'; // slate-400
  if (tl >= 0.35) return '#f59e0b'; // amber-500
  if (tl >= 0.20) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
}

/** Plain-tier (server-rendered) → tailwind text+border class for the badge. */
export function plainTierToBadgeClass(tier: string): string {
  if (tier === 'holding') return 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300';
  if (tier === 'mixed (mildly supportive)') return 'border-emerald-300/40 bg-emerald-300/[0.06] text-emerald-700/80 dark:text-emerald-200';
  if (tier === 'mixed') return 'border-slate-400/40 bg-slate-400/[0.08] text-slate-700 dark:text-slate-300';
  if (tier === 'drifting') return 'border-amber-500/40 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300';
  if (tier === 'at risk') return 'border-orange-500/40 bg-orange-500/[0.08] text-orange-700 dark:text-orange-300';
  if (tier === 'drifting against' || tier === 'drifting against the bet')
    return 'border-orange-600/40 bg-orange-600/[0.08] text-orange-700 dark:text-orange-300';
  if (tier === 'breaking') return 'border-red-500/40 bg-red-500/[0.08] text-red-700 dark:text-red-300';
  return 'border-slate-400/40 bg-slate-400/[0.08] text-slate-700 dark:text-slate-300';
}

/** Divergence-severity → tailwind classes for the badge. */
export function divergenceSeverityBadgeClass(severity: 'minor' | 'moderate' | 'material' | null | undefined): string {
  if (severity === 'material') return 'border-rose-500/50 bg-rose-500/[0.10] text-rose-700 dark:text-rose-300 font-medium';
  if (severity === 'moderate') return 'border-amber-500/50 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300';
  if (severity === 'minor') return 'border-slate-400/40 bg-slate-400/[0.06] text-slate-700 dark:text-slate-300';
  return 'border-border/40 bg-background/50 text-muted-foreground';
}

/** Research priority → label + tailwind. */
export function researchPriorityBadge(priority: ResearchPriority | undefined): { label: string; className: string } {
  if (priority === 'elevated')
    return { label: 'Elevated', className: 'border-rose-500/50 bg-rose-500/[0.10] text-rose-700 dark:text-rose-300' };
  if (priority === 'deferred')
    return { label: 'Deferred', className: 'border-slate-400/40 bg-slate-400/[0.06] text-slate-600 dark:text-slate-400' };
  return { label: 'Auto', className: 'border-border/40 bg-background/50 text-muted-foreground' };
}

/** Trend marker — derived from the most recent two history points. */
export function trendMarker(history: Array<{ truth_likelihood?: number; aggregate_truth_likelihood?: number }>): {
  symbol: string;
  label: string;
  color: string;
} {
  if (!history || history.length < 2) return { symbol: '→', label: 'flat', color: 'text-slate-500' };
  const get = (h: { truth_likelihood?: number; aggregate_truth_likelihood?: number }) =>
    h.aggregate_truth_likelihood ?? h.truth_likelihood ?? 0.5;
  const prev = get(history[history.length - 2]);
  const curr = get(history[history.length - 1]);
  const delta = curr - prev;
  if (delta >= 0.07) return { symbol: '▲', label: 'rising', color: 'text-emerald-600' };
  if (delta >= 0.02) return { symbol: '↗', label: 'mildly rising', color: 'text-emerald-500' };
  if (delta <= -0.07) return { symbol: '▼', label: 'falling fast', color: 'text-red-600' };
  if (delta <= -0.02) return { symbol: '↘', label: 'falling', color: 'text-orange-500' };
  return { symbol: '→', label: 'flat', color: 'text-slate-500' };
}
