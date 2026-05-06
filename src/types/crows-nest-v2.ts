/**
 * Crow's Nest 2.0 (v2 explicit) — dashboard bundle types.
 *
 * Mirrors the JSON produced by the v2 Crow's Nest deriver. Top-level
 * schema_version is `crows_nest_v2_dashboard_bundle`.
 *
 * IMPORTANT: This is purely additive to the legacy `crows-nest.ts` types.
 * v1 (`schema_version: "crows_nest_v2"` — confusing naming, but it's the
 * legacy bundle) and v2 (`schema_version: "crows_nest_v2_dashboard_bundle"`)
 * coexist. v1 components MUST keep working with the v1 types.
 */

export type CrowsNestV2SchemaVersion = 'crows_nest_v2_dashboard_bundle';

export type ThemePillar =
  | 'Technology'
  | 'Economic'
  | 'Political_Legal'
  | 'Environmental'
  | 'Social'
  | 'Ethical'
  | string;

export type V2Tier =
  | 'Stationary'
  | 'Stationary-with-Calendared-Test'
  | 'Vulnerable'
  | 'Erosion'
  | 'Contested'
  | 'Resilient'
  | 'Confirmed'
  | string;

export type V2Trajectory =
  | 'rising'
  | 'falling'
  | 'holding'
  | 'two-sided'
  | 'flat'
  | 'unknown'
  | string;

export interface V2CurrentState {
  /** Themes use `theme_truth_likelihood`; bets `bet_truth_likelihood`; projections `truth_likelihood`. */
  truth_likelihood?: number;
  theme_truth_likelihood?: number;
  bet_truth_likelihood?: number;
  /** Themes use `theme_tier`; bets `bet_tier`; projections `tier`. */
  tier?: V2Tier;
  theme_tier?: V2Tier;
  bet_tier?: V2Tier;
  trajectory?: V2Trajectory;
  as_of?: string;
}

export interface V2NamedWatchMetric {
  /** themes use `name`; bets/projections sometimes `metric`. */
  name?: string;
  metric?: string;
  source?: string;
  cadence?: string;
  frequency?: string;
  current_value?: string | number | null;
  current_value_2026_05?: string | number | null;
  notes?: string;
  threshold?: string;
  threshold_escalation?: string;
  threshold_deescalation?: string;
  threshold_holds?: string;
  threshold_breaks?: string;
  threshold_implications?: string;
  thresholds?: { bull?: string; bear?: string; [k: string]: string | undefined };
  velocity_per_cycle?: number | null;
  [k: string]: unknown;
}

export interface V2BaselineKeyEvidence {
  source_type?: string;
  ref?: string;
  snippet?: string;
  implication?: string;
}

export interface V2ThemeBaselineNote {
  summary?: string;
  key_evidence?: V2BaselineKeyEvidence[];
  what_would_move_it_up?: string[];
  what_would_move_it_down?: string[];
  [k: string]: unknown;
}

export interface V2ThemePropagationToBetSeed {
  /** Heterogeneous shape — themes were authored at different points. */
  bet_id?: string;
  bet_id_placeholder?: string;
  bet_label?: string;
  label?: string;
  name?: string;
  weight?: number;
  role?: string;
  channel?: string;
  rule?: string;
  reading_rule?: string;
  rationale?: string;
  directionality?: string;
  current_contribution?: number;
  transmission_mechanism?: string;
  [k: string]: unknown;
}

export interface MacroThemeV2 {
  id: string;
  title: string;
  pillar: ThemePillar;
  secondary_pillars?: ThemePillar[];
  schema_variant?: string;
  current_state: V2CurrentState;
  prior: number;
  prior_class?: string;
  prior_rationale?: string;
  thesis: string;
  definition?: string;
  named_watch_metrics: V2NamedWatchMetric[];
  /** Themes use a dict (scenario_name → probability); some legacy variants use a list. */
  scenarios: Record<string, number> | unknown[];
  baseline_research_note?: V2ThemeBaselineNote;
  propagation_to_bets_seed: V2ThemePropagationToBetSeed[];
  cross_cutting: string[];
  expected_projection_topics: string[];
}

export interface BetIntermediateGate {
  name: string;
  date: string;
  what_resolves: string;
}

export interface BetPositionComponentRef {
  id: string;
  kind: string;
  role?: string;
}

export interface BetTransmissionMechanism {
  channel: string;
  reading_rule?: string;
  [k: string]: unknown;
}

export interface BetThemeDependency {
  theme_id: string;
  theme_label?: string;
  weight: number;
  role?: string;
  theme_prior?: number;
  theme_trajectory?: string;
  transmission_mechanisms?: BetTransmissionMechanism[];
}

export interface BetScenario {
  name: string;
  probability: number;
  narrative: string;
  key_anchors_FY2028?: unknown;
  what_makes_this_path_break?: string;
  [k: string]: unknown;
}

export interface BetBaselineResearchNote {
  claim_under_test?: string;
  what_is_known_today?: string;
  contradictions_in_evidence?: string;
  open_questions?: string[];
  research_priority?: string;
  [k: string]: unknown;
}

export interface BetMetadata {
  as_of?: string;
  adjudication_notes?: string[];
  bet_to_bet_dependencies?: unknown[];
  cross_segment_TL_bleed_from_other_bets?: unknown[];
  cross_segment_TL_bleed_to_other_bets?: unknown[];
  factual_corrections?: string[];
  [k: string]: unknown;
}

export interface StrategicBet {
  id: string;
  label: string;
  segment: string;
  resolution_date: string;
  intermediate_gates: BetIntermediateGate[];
  current_state: V2CurrentState;
  prior: number;
  prior_class?: string;
  prior_rationale?: string;
  thesis_resolves_true: string;
  thesis_resolves_false: string;
  position_components_loaded: BetPositionComponentRef[];
  theme_dependencies: BetThemeDependency[];
  scenarios: BetScenario[];
  named_watch_metrics: V2NamedWatchMetric[];
  expected_projection_topics?: string[];
  falsification_criteria: string[];
  breakage_shape: string;
  baseline_research_note?: BetBaselineResearchNote;
  metadata?: BetMetadata;
}

export interface ProjectionMeasurable {
  metric: string;
  data_source?: string;
  frequency?: string;
  current_value_or_range?: string;
  threshold_for_resolution_true?: string;
  threshold_for_resolution_false?: string;
  [k: string]: unknown;
}

export interface ProjectionPropagatesToBet {
  bet_id: string;
  weight: number;
  channel?: string;
}

export interface ProjectionV2 {
  id: string;
  theme_id: string;
  topic: string;
  claim_under_test: string;
  measurable: ProjectionMeasurable;
  resolution_date: string;
  current_state: V2CurrentState;
  prior: number;
  prior_class?: string;
  prior_rationale?: string;
  propagates_to_bets: ProjectionPropagatesToBet[];
  candidate_sources?: string[];
  open_research_questions?: string[];
}

/** Position map — a component is one sourced fact about Umicore's position. */
export interface PositionCitation {
  stream?: string;
  ref?: string;
  snippet?: string;
  [k: string]: unknown;
}

export type PositionKind =
  | 'segment_position'
  | 'site_footprint'
  | 'offtake_book'
  | 'strategic_commitment'
  | 'balance_sheet_position'
  | 'governance_constraint'
  | 'technology_position'
  | 'capability_position'
  | string;

export interface PositionComponent {
  id: string;
  kind: PositionKind;
  label: string;
  concrete_facts: Record<string, unknown>;
  the_decision_umicore_made: string;
  citations: PositionCitation[];
  what_it_exposes_to: string[];
  downstream_dependencies: string[];
  notes?: string;
}

export interface PositionMapV2 {
  schema_version?: string;
  company?: string;
  as_of?: string;
  generated_at?: string;
  summary?: string;
  factual_corrections_flagged?: string[];
  components: PositionComponent[];
}

/** Cross-reference matrices — many-to-many propagation between themes/bets/projections. */
export interface CrossReferenceMatrices {
  /** theme_id → { bet_id: weight } */
  theme_to_bet: Record<string, Record<string, number>>;
  /** bet_id → { other_bet_id: weight } */
  bet_to_bet: Record<string, Record<string, number>>;
  /** projection_id → { bet_id: weight } */
  projection_to_bet: Record<string, Record<string, number>>;
  /** theme_id → projection_id[] */
  theme_to_projection: Record<string, string[]>;
}

export interface CrossReference {
  schema_version?: string;
  as_of?: string;
  company?: string;
  counts?: { themes: number; bets: number; projections: number };
  matrices: CrossReferenceMatrices;
  aggregation_rules?: Record<string, unknown>;
  validation?: { passed: boolean; issues: unknown[] };
}

/** Status Quo Outlook v2 — the bet-anchored status quo memo bundled in the v2 bundle. */
export interface StatusQuoBetAnchoredOutlook {
  bet_id: string;
  label: string;
  tl: number;
  tier: V2Tier;
  trajectory: V2Trajectory;
  prior: number;
  narrative_60_100_words: string;
  what_breaks_30_words: string;
  [k: string]: unknown;
}

export interface StatusQuoJointDistributionRisk {
  scenario: string;
  probability_estimate: number;
  impact_one_sentence: string;
  [k: string]: unknown;
}

export interface StatusQuoCalendaredGate {
  date: string;
  gate: string;
  affects_bets: string[];
  [k: string]: unknown;
}

export interface StatusQuoOutlookV2 {
  schema_version?: string;
  company?: string;
  ticker?: string;
  as_of_cycle: string;
  horizon_years?: number;
  structure_version?: string;
  headline: string;
  bet_anchored_outlook: StatusQuoBetAnchoredOutlook[];
  joint_distribution_risks: StatusQuoJointDistributionRisk[];
  calendared_gates_FY2026_FY2028?: StatusQuoCalendaredGate[];
  factual_corrections_carried_forward?: Array<string | { text?: string; note?: string }>;
  narrative_md?: string;
  [k: string]: unknown;
}

/** Executive Paper v2 — the per-bet assessment cycle memo. */
export interface ExecutivePaperV2PerBetAssessment {
  bet_id: string;
  label?: string;
  current_state?: V2CurrentState;
  status_le_60_words?: string;
  implication_le_80_words?: string;
  effect_le_100_words?: string;
  mitigation_le_80_words?: string;
  [k: string]: unknown;
}

export interface ExecutivePaperV2Metadata {
  as_of?: string;
  authored_by?: string;
  structure_note?: string;
  [k: string]: unknown;
}

export interface ExecutivePaperV2 {
  schema_version?: string;
  company?: string;
  cycle_date: string;
  cycle_label?: string;
  structure_version?: string;
  headline_60_words: string;
  per_bet_assessment: ExecutivePaperV2PerBetAssessment[];
  joint_distribution_view_120_words?: string;
  calendared_gates_to_watch_next_18_months?: StatusQuoCalendaredGate[];
  factual_corrections_carried_forward?: Array<string | { text?: string; note?: string }>;
  metadata?: ExecutivePaperV2Metadata;
  [k: string]: unknown;
}

/** Top-level v2 bundle ingested by the dashboard. */
export interface CrowsNestV2Data {
  schema_version: CrowsNestV2SchemaVersion;
  company: string;
  as_of: string;
  counts: { themes: number; bets: number; projections: number };
  themes: MacroThemeV2[];
  bets: StrategicBet[];
  projections: ProjectionV2[];
  position_map: PositionMapV2;
  cross_reference: CrossReference;
  /** Optional v2 bet-anchored status quo memo. */
  status_quo_outlook_v2?: StatusQuoOutlookV2;
  /** Optional v2 executive paper cycles. */
  executive_papers_v2?: ExecutivePaperV2[];
  /** v3 additive section — Outside-In radar (Watching drivers, bet candidates, coverage gaps, STEEPLE watch) */
  outside_in?: OutsideInSection;
  /** v3 additive section — Course-Correction Memo (the bridge artefact between Inside-Out and Outside-In) */
  course_correction?: CourseCorrectionSection;
}

/** ─────────────────── v3 Outside-In + Course-Correction types ─────────────────── */

export interface WatchingDriverIndicator {
  id: string;
  topic?: string;
  testable?: string;
  cadence?: string;
  current_value?: string;
  horizon?: string;
}

export interface WatchingDriverHistoryEntry {
  cycle_date: string;
  n_evidence_rows: number;
  cycle_score: number;
  directional_breakdown: { '+': number; '-': number; o: number };
  prior_tl_before: number | null;
  prior_tl_after: number;
  delta: number;
  evidence_row_guids: string[];
}

export interface WatchingDriverV3 {
  id: string;
  name: string;
  pillar: string;
  tier: string;
  thesis: string;
  system_claim: { claim?: string; horizon_date?: string; rationale?: string; as_of?: string; source?: string };
  current_observed_value?: { narrative?: string; as_of?: string; source_references?: string[]; [k: string]: unknown };
  trajectory?: { readings?: Array<{ date: string; what_happened: string; shift?: string }>; trend_direction?: string; research_question?: string };
  data_sources?: { primary?: unknown[]; secondary?: unknown[]; tertiary?: unknown[] };
  open_sweep_search_terms?: string[];
  falsification_thresholds?: Array<{ event: string; magnitude: string; rationale: string }>;
  promotion_criteria?: { what_would_make_this_active?: string; linked_bet_candidates?: string[] };
  indicators?: WatchingDriverIndicator[];
  current_state?: { truth_likelihood?: number | null; tier?: string; trajectory?: string; as_of?: string; derivation_note?: string };
  umicore_translation_hypothesis?: string;
  history?: WatchingDriverHistoryEntry[];
}

export interface BetCandidateV3 {
  id: string;
  name: string;
  tier: string;
  thesis_one_paragraph: string;
  trigger_drivers: Array<{ driver_id: string; name: string; channel: string }>;
  tipping_conditions?: { primary_trigger_AND_logic?: Array<{ condition: string; rationale: string; current_status: string; watch_items?: string[] }>; secondary_supportive_signals?: string[]; promotion_logic?: string };
  umicore_specific_levers_and_assets?: { existing_assets_supporting_candidate?: string[]; gaps_to_close_for_promotion?: string[]; competitive_landscape?: { incumbent_competitors?: string[]; challenger_pressure_from?: string[]; trader_pressure_from?: string[]; umicore_relative_position?: string } };
  estimated_financial_impact_framework?: { approach_note?: string; baseline_anchor?: Record<string, unknown>; service_revenue_model_assumptions_to_test?: string[]; two_sided_outcomes?: { upside_case?: string; downside_case?: string; base_case?: string }; valuation_framework_pointer?: string };
  what_makes_this_a_candidate_not_a_bet_today?: string[];
}

export interface CoverageGapsV3 {
  schema_version?: string;
  scope_basis?: string;
  pillar_coverage_assessment?: Record<string, { active_drivers?: string[]; coverage?: string; note?: string; remaining_subgaps?: string[] }>;
  summary_by_pillar?: Record<string, { active?: string[]; watching?: string[]; coverage?: string; remaining_subgaps?: string[] }>;
  explicit_deferrals?: Record<string, { decision?: string; decided_at?: string; by?: string; rationale?: string; unauthored_candidates?: string[] }>;
  open_sweep_seed_terms_for_unauthored_pillars?: string[];
}

export interface SteepleWatchPayload {
  [pillar: string]: {
    active: Array<{ id: string; name: string; thesis?: string; tier: string; current_state?: unknown }>;
    watching: Array<{ id: string; name: string; thesis?: string; system_claim?: string; tier: string; horizon_date?: string; n_indicators?: number; n_falsification_thresholds?: number; current_state?: unknown; umicore_translation_hypothesis?: string }>;
  };
}

export interface PromotionProposal {
  driver_id: string;
  current_state_at_proposal?: unknown;
  supporting_aggregate?: unknown;
  proposal: string;
  rationale: string;
  review_action_required: string;
}

export interface OutsideInLatestCycle {
  company: string;
  cycle_date: string;
  cycle_started_at: string;
  cycle_completed_at?: string;
  since_ts?: string | null;
  n_routing_rows_processed: number;
  n_promotion_proposals?: number;
  drivers: Array<{ driver_id: string; name?: string; pillar?: string; history_entry: WatchingDriverHistoryEntry; promotion_proposed: boolean }>;
  active_targets_summary?: Array<{ target_id: string; n_evidence_rows: number; cycle_score: number; directional_breakdown: { '+': number; '-': number; o: number }; summed_score?: number; evidence_row_guids?: string[] }>;
}

export interface OutsideInSection {
  schema_version: string;
  as_of: string;
  pillar_coverage_assessment?: Record<string, unknown>;
  steeple_watch: SteepleWatchPayload;
  watching_drivers: WatchingDriverV3[];
  bet_candidates: BetCandidateV3[];
  coverage_gaps?: CoverageGapsV3;
  promotion_proposals?: PromotionProposal[];
  latest_cycle?: OutsideInLatestCycle;
  recent_routing_sample?: Array<{ ts: string; guid: string; title: string; pub_date_text?: string; target_id: string; confidence: string; signal_direction: string; magnitude: string; rationale: string }>;
  counts: {
    active_drivers: number;
    watching_drivers: number;
    bet_candidates: number;
    promotion_proposals_open: number;
    recent_routing_rows: number;
  };
}

export interface CourseCorrectionMemoBody {
  headline: string;
  driver_and_bet_cascade: string[];
  financial_delta?: { table?: Array<{ line?: string; fy?: string; low?: string; high?: string; rationale?: string }>; method?: string | null };
  share_price_impact?: { narrative?: string; range?: string | null; method?: string | null; confidence?: string; sensitivity?: string };
  adjacency_flags: string[];
  assumptions_used: string[];
  what_would_invalidate_this: string[];
  _meta?: { company?: string; cycle_date?: string; generated_at?: string; model?: string; n_routing_rows_processed?: number; n_promotion_proposals?: number; n_drivers_evaluated?: number };
  _stub_mode?: boolean;
}

export interface CourseCorrectionSection {
  schema_version: string;
  latest_memo?: CourseCorrectionMemoBody | null;
  all_memos?: CourseCorrectionMemoBody[];
}

/** Type guard — used by the upload hook to dispatch payloads.
 *
 * The schema_version match is the load-bearing check; the array/object checks
 * are defence-in-depth. We accept partial bundles (e.g. position_map missing)
 * so the dashboard never silently rejects a slightly-incomplete v2 bundle.
 *
 * v3 bundles are a superset of v2 (carry-through pattern) and are accepted here
 * with the same data-flow; the v3-only fields (outside_in, course_correction)
 * are optional and read by the v3 views directly.
 */
export function isCrowsNestV2Payload(value: unknown): value is CrowsNestV2Data {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (
    v.schema_version !== 'crows_nest_v2_dashboard_bundle' &&
    v.schema_version !== 'crows_nest_v3_dashboard_bundle'
  )
    return false;
  // Defence-in-depth: warn but accept if any of the arrays are missing/empty.
  return true;
}

/** ────────────────────── color helpers (v2 specific) ────────────────────── */

export function tierBadgeClass(tier: string | undefined): string {
  if (!tier) return 'border-slate-400/40 bg-slate-400/[0.06] text-slate-700 dark:text-slate-300';
  const t = tier.toLowerCase();
  if (t === 'vulnerable')
    return 'border-rose-500/40 bg-rose-500/[0.08] text-rose-700 dark:text-rose-300';
  if (t === 'erosion' || t === 'contested')
    return 'border-amber-500/40 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300';
  if (t === 'stationary-with-calendared-test')
    return 'border-amber-500/40 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300';
  if (t === 'resilient' || t === 'confirmed')
    return 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300';
  if (t === 'stationary')
    return 'border-slate-400/40 bg-slate-400/[0.08] text-slate-700 dark:text-slate-300';
  return 'border-slate-400/40 bg-slate-400/[0.06] text-slate-700 dark:text-slate-300';
}

export function pillarBadgeClass(pillar: string | undefined): string {
  if (!pillar) return 'border-slate-400/40 bg-slate-400/[0.06] text-slate-700 dark:text-slate-300';
  const p = pillar.toLowerCase();
  if (p === 'technology')
    return 'border-blue-500/40 bg-blue-500/[0.08] text-blue-700 dark:text-blue-300';
  if (p === 'economic')
    return 'border-amber-500/40 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300';
  if (p === 'political_legal' || p === 'political/legal' || p === 'political')
    return 'border-rose-500/40 bg-rose-500/[0.08] text-rose-700 dark:text-rose-300';
  if (p === 'environmental')
    return 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300';
  if (p === 'social')
    return 'border-violet-500/40 bg-violet-500/[0.08] text-violet-700 dark:text-violet-300';
  if (p === 'ethical')
    return 'border-fuchsia-500/40 bg-fuchsia-500/[0.08] text-fuchsia-700 dark:text-fuchsia-300';
  return 'border-slate-400/40 bg-slate-400/[0.06] text-slate-700 dark:text-slate-300';
}

export function trajectorySymbol(trajectory: string | undefined): { symbol: string; color: string; label: string } {
  if (!trajectory) return { symbol: '→', color: 'text-slate-500', label: 'unknown' };
  const t = trajectory.toLowerCase();
  if (t === 'rising' || t.startsWith('rising')) return { symbol: '▲', color: 'text-emerald-600', label: 'rising' };
  if (t === 'falling' || t.startsWith('falling')) return { symbol: '▼', color: 'text-rose-600', label: 'falling' };
  if (t === 'two-sided' || t.includes('two-sided')) return { symbol: '↕', color: 'text-amber-600', label: 'two-sided' };
  if (t === 'holding' || t.startsWith('holding') || t === 'flat')
    return { symbol: '→', color: 'text-slate-500', label: 'holding' };
  return { symbol: '→', color: 'text-slate-500', label: trajectory };
}

/** Friendly label for a position-map kind. */
export function positionKindLabel(kind: string): string {
  switch (kind) {
    case 'segment_position':
      return 'Segment Positions';
    case 'site_footprint':
      return 'Site Footprint';
    case 'offtake_book':
      return 'Offtake Book';
    case 'strategic_commitment':
      return 'Strategic Commitments';
    case 'balance_sheet_position':
      return 'Balance Sheet';
    case 'governance_constraint':
      return 'Governance Constraints';
    case 'technology_position':
      return 'Technology Positions';
    case 'capability_position':
      return 'Capabilities';
    default:
      return kind.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  }
}

/** Pull the active TL value from any v2 current_state, regardless of the field name. */
export function v2TruthLikelihood(state: V2CurrentState | undefined): number | null {
  if (!state) return null;
  const v =
    state.truth_likelihood ??
    state.theme_truth_likelihood ??
    state.bet_truth_likelihood ??
    null;
  return typeof v === 'number' ? v : null;
}

/** Same with the tier. */
export function v2Tier(state: V2CurrentState | undefined): string | null {
  if (!state) return null;
  return (state.tier || state.theme_tier || state.bet_tier || null) as string | null;
}
