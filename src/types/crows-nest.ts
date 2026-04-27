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

export interface CrowsNestProjection {
  id: string;
  claim: string;
  resolution_date: string; // YYYY-MM-DD

  // PRE-RENDERED plain-language fields
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
export interface CrowsNestDriverSummary {
  id: string;
  name: string;
  category: 'macro' | 'industry' | 'company' | 'policy' | 'technology' | 'social' | string;
  current_state: {
    score: number; // -1..+1
    velocity: number;
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
