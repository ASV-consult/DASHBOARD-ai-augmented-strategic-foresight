/**
 * Crow's Nest v3 canonical bundle — dashboard types.
 *
 * Mirrors the JSON produced by the v3 deriver (build_canonical_bundle.py).
 * Top-level `schema_version === 'crows_nest_v3_canonical_bundle'`.
 *
 * IMPORTANT: This is purely additive to the legacy `crows-nest.ts` (v1) and
 * `crows-nest-v2.ts` (v2 + v3 outside-in carry-through) types. v1, v2, and v3
 * canonical bundles coexist; the upload hook routes each to its own slice.
 *
 * v3 canonical structure: 5 bets at the top, 48 indicators underneath. Each
 * indicator has a deeply-researched `current_state_assessment` (where it is
 * now) plus a `forward_projection` (where it's going) — the dashboard renders
 * these as a two-panel view.
 */

export type CrowsNestV3SchemaVersion = 'crows_nest_v3_canonical_bundle';

export type V3SystemClaim = {
  /** Bets use `claim`; indicators use `statement`. */
  claim?: string;
  statement?: string;
  target_value?: string;
  target_metric?: string;
  metric_unit?: string;
  horizon_date?: string;
  resolves_true_if?: string;
  resolves_false_if?: string;
  as_of?: string;
  rationale?: string;
  source?: string;
  [k: string]: unknown;
};

export type V3UserAssertion = {
  claim?: string;
  statement?: string;
  target_value?: string;
  target_metric?: string;
  set_by?: string;
  set_at?: string;
  rationale?: string;
  [k: string]: unknown;
};

export type V3Divergence = {
  delta?: number | string;
  severity?: string;
  last_evaluated?: string;
  [k: string]: unknown;
};

export type V3IntermediateGate = {
  name: string;
  date: string;
  what_must_be_true?: string;
  [k: string]: unknown;
};

export type V3BaselineFinancialAnchor = {
  fy2025_revenue_eur_m?: number;
  fy2025_ebita_eur_m?: number;
  fy2025_ebita_margin_pct?: number;
  fy2025_capital_employed_eur_bn?: number;
  source?: string;
  [k: string]: unknown;
};

export type V3DerivedCurrentState = {
  truth_likelihood?: number | null;
  tier?: string | null;
  trajectory?: string | null;
  confidence_interval?: { low?: string | number; high?: string | number } | string | null;
  as_of?: string | null;
  derivation_note?: string;
  [k: string]: unknown;
};

export type V3BetMetadata = {
  as_of?: string;
  structure_version?: string;
  anti_drift_notes?: string[];
  [k: string]: unknown;
};

export interface BetV3 {
  schema_version?: string;
  bet_id: string;
  name: string;
  segment: string;
  company?: string;
  system_claim: V3SystemClaim;
  user_assertion?: V3UserAssertion | null;
  company_view?: V3SystemClaim | null;
  divergence?: V3Divergence | null;
  research_priority?: string;
  resolution_date?: string;
  intermediate_gate?: V3IntermediateGate;
  two_sided_test?: string[];
  current_state?: V3DerivedCurrentState;
  /** Indicator IDs (e.g. ["B1.I1", "B1.I2", ...]) */
  indicators?: string[];
  baseline_financial_anchor?: V3BaselineFinancialAnchor;
  position_components?: string[];
  history?: unknown[];
  research_log?: unknown[];
  open_research_questions?: unknown[];
  metadata?: V3BetMetadata;
}

/* ─────────────────────────── Indicator types ─────────────────────────── */

export type V3DataSource = {
  name: string;
  url?: string;
  what_it_provides?: string;
  access?: string;
  license?: string;
  [k: string]: unknown;
};

export type V3DataSourceList = {
  primary?: V3DataSource[];
  secondary?: V3DataSource[];
  tertiary?: V3DataSource[];
  [k: string]: unknown;
};

export type V3CurrentObservedValue = {
  value?: string | number | null;
  as_of?: string | null;
  source_reference?: string | null;
  research_question?: string | null;
  [k: string]: unknown;
};

/**
 * Trajectory readings are heterogeneous across indicators — fields like
 * `nmc_total_pct`, `lfp_pct`, `high_nickel_pct`, `low_nickel_pct`, etc. are
 * each indicator's domain-specific numeric fields. We keep the shape open and
 * the renderer auto-detects the primary numeric metric by name.
 */
export type V3TrajectoryReading = {
  as_of?: string;
  date?: string;
  region?: string;
  source?: string;
  note?: string;
  /** Catch-all for indicator-specific numeric metrics (lfp_pct, nmc_total_pct, etc.) */
  [k: string]: unknown;
};

export type V3TrajectoryReadings = {
  readings?: V3TrajectoryReading[];
  trend_direction?: string | null;
  research_question?: string | null;
  [k: string]: unknown;
};

export type V3SourceReference = {
  name: string;
  url?: string;
  what_it_provides?: string;
  as_of?: string | null;
  [k: string]: unknown;
};

export type V3CurrentStateAssessment = {
  value?: string | null;
  /** "Tier 1", "Tier 2 triangulated", "Tier 2 with uncertainty", null. */
  tier?: string | null;
  /** "high", "medium", "medium-low", "low" */
  confidence?: string | null;
  as_of?: string | null;
  method?: string | null;
  method_detail?: string | null;
  source_references?: V3SourceReference[];
  uncertainty_drivers?: string[];
  what_would_upgrade_to_tier_1?: string | null;
  [k: string]: unknown;
};

export type V3IntermediateMilestone = {
  date: string;
  value?: string;
  rationale?: string;
  [k: string]: unknown;
};

export type V3CentralPath = {
  value_at_horizon?: string;
  intermediate_milestones?: V3IntermediateMilestone[];
  confidence_interval?: { low?: string | number; high?: string | number };
  [k: string]: unknown;
};

export type V3InflectionEvent = {
  date?: string;
  event?: string;
  expected_impact_on_indicator?: string;
  probability_estimate?: string;
  source_for_event_date?: string;
  [k: string]: unknown;
};

export type V3ForwardProjection = {
  horizon_date?: string;
  central_path?: V3CentralPath;
  rationale?: string;
  calendared_inflection_events?: V3InflectionEvent[];
  what_would_invalidate_central_path?: string[];
  method?: string;
  confidence?: string;
  method_detail?: string;
  [k: string]: unknown;
};

export type V3FalsificationThreshold = {
  event?: string;
  magnitude?: string;
  rationale?: string;
  [k: string]: unknown;
};

export type V3FeedsIntoBetResolution = {
  weight_in_bet?: number;
  rationale?: string;
  [k: string]: unknown;
};

export type V3IndicatorMetadata = {
  as_of?: string;
  structure_version?: string;
  research_priority?: string;
  migrated_from?: string;
  last_deep_research_pass?: string;
  tier_1_upgrade_note?: string;
  [k: string]: unknown;
};

export interface IndicatorV3 {
  schema_version?: string;
  indicator_id: string;
  bet_id: string;
  topic: string;
  system_claim: V3SystemClaim;
  user_assertion?: V3UserAssertion | null;
  divergence?: V3Divergence | null;
  data_sources?: V3DataSourceList;
  cadence?: string;
  current_observed_value?: V3CurrentObservedValue;
  current_state_assessment?: V3CurrentStateAssessment;
  trajectory?: V3TrajectoryReadings;
  forward_projection?: V3ForwardProjection;
  open_sweep_search_terms?: string[];
  falsification_thresholds?: V3FalsificationThreshold[];
  /** Macro driver IDs this indicator informs (e.g. ["T1", "T6"]) */
  informs_macro_drivers?: string[];
  feeds_into_bet_resolution?: V3FeedsIntoBetResolution;
  current_state?: V3DerivedCurrentState;
  history?: unknown[];
  research_log?: unknown[];
  evidence_log?: unknown[];
  metadata?: V3IndicatorMetadata;
}

/* ────────────────────── Top-level bundle ────────────────────── */

export interface CrowsNestV3Counts {
  bets?: number;
  indicators?: number;
  deeply_researched_indicators?: number;
  [k: string]: number | undefined;
}

export interface CrowsNestV3Data {
  schema_version: CrowsNestV3SchemaVersion;
  company: string;
  as_of: string;
  counts?: CrowsNestV3Counts;
  bets: BetV3[];
  indicators: IndicatorV3[];
  /** Forward-compatible: macro_drivers, status_quo, executive_papers may also be bundled. */
  macro_drivers?: unknown[];
  status_quo?: unknown;
  executive_papers?: unknown[];
}

/**
 * Type guard — used by the upload hook to dispatch payloads.
 *
 * The schema_version match is the load-bearing check. Defence-in-depth shape
 * checks are deliberately lenient — we accept partial bundles so the dashboard
 * never silently rejects a slightly-incomplete v3 payload.
 */
export function isCrowsNestV3Payload(value: unknown): value is CrowsNestV3Data {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v.schema_version !== 'crows_nest_v3_canonical_bundle') return false;
  return true;
}

/* ───────────────────── Color helpers (v3 specific) ───────────────────── */

/** Tier 1 → emerald; Tier 2 triangulated → amber; Tier 2 with uncertainty → orange; null/empty → slate. */
export function tierBadgeClassV3(tier: string | null | undefined): string {
  if (!tier) return 'border-slate-400/40 bg-slate-400/[0.06] text-slate-700 dark:text-slate-300';
  const t = tier.toLowerCase();
  if (t.includes('tier 1') || t === 'tier-1' || t === 'tier_1') {
    return 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300';
  }
  if (t.includes('tier 2') && t.includes('uncertain')) {
    return 'border-orange-500/40 bg-orange-500/[0.08] text-orange-700 dark:text-orange-300';
  }
  if (t.includes('tier 2') || t === 'tier-2' || t === 'tier_2') {
    return 'border-amber-500/40 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300';
  }
  return 'border-slate-400/40 bg-slate-400/[0.06] text-slate-700 dark:text-slate-300';
}

/** Confidence: high → emerald; medium → amber; low → rose; null → slate. */
export function confidenceBadgeClassV3(confidence: string | null | undefined): string {
  if (!confidence) return 'border-slate-400/40 bg-slate-400/[0.06] text-slate-700 dark:text-slate-300';
  const c = confidence.toLowerCase();
  if (c === 'high' || c.startsWith('high')) {
    return 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300';
  }
  if (c === 'medium' || c.startsWith('medium')) {
    return 'border-amber-500/40 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300';
  }
  if (c === 'low' || c.startsWith('low')) {
    return 'border-rose-500/40 bg-rose-500/[0.08] text-rose-700 dark:text-rose-300';
  }
  return 'border-slate-400/40 bg-slate-400/[0.06] text-slate-700 dark:text-slate-300';
}

/**
 * Macro driver chip colors (T1..T6 — Umicore canonical).
 *  T1 Technology → blue
 *  T2 Economic   → amber
 *  T3 Political_Legal → rose
 *  T4 Political_Legal → amber (variant)
 *  T5 Environmental   → emerald
 *  T6 Social          → violet
 */
export function macroDriverChipClassV3(driverId: string | null | undefined): string {
  if (!driverId) return 'border-slate-400/40 bg-slate-400/[0.06] text-slate-700 dark:text-slate-300';
  const d = driverId.toUpperCase();
  if (d === 'T1') return 'border-blue-500/40 bg-blue-500/[0.08] text-blue-700 dark:text-blue-300';
  if (d === 'T2') return 'border-amber-500/40 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300';
  if (d === 'T3') return 'border-rose-500/40 bg-rose-500/[0.08] text-rose-700 dark:text-rose-300';
  if (d === 'T4') return 'border-amber-500/40 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300';
  if (d === 'T5') return 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300';
  if (d === 'T6') return 'border-violet-500/40 bg-violet-500/[0.08] text-violet-700 dark:text-violet-300';
  return 'border-slate-400/40 bg-slate-400/[0.06] text-slate-700 dark:text-slate-300';
}

/**
 * Pick the primary numeric trajectory metric from a list of readings.
 *
 * Trajectory readings carry indicator-specific numeric fields (e.g. `lfp_pct`,
 * `nmc_total_pct`). We auto-detect by scanning known field names in order of
 * preference. Returns the chosen field name and the cleaned series, or null
 * if no numeric series can be extracted.
 */
const TRAJECTORY_FIELD_PREFERENCE = [
  'lfp_pct',
  'nmc_total_pct',
  'high_nickel_pct',
  'low_nickel_pct',
  'value_pct',
  'value',
  'pct',
  'share_pct',
  'demand_mt',
  'supply_mt',
  'price_usd',
  'volume',
];

const NON_METRIC_KEYS = new Set(['as_of', 'date', 'region', 'source', 'note']);

export interface TrajectorySeriesPoint {
  x: string;
  y: number;
  raw: V3TrajectoryReading;
}

export interface TrajectorySeries {
  field: string;
  fieldLabel: string;
  points: TrajectorySeriesPoint[];
}

export function extractTrajectorySeries(readings: V3TrajectoryReading[] | undefined): TrajectorySeries | null {
  if (!readings || readings.length === 0) return null;

  // Build a frequency map of numeric fields across readings.
  const numericFieldCounts: Record<string, number> = {};
  for (const r of readings) {
    for (const [k, v] of Object.entries(r)) {
      if (NON_METRIC_KEYS.has(k)) continue;
      if (typeof v === 'number' && Number.isFinite(v)) {
        numericFieldCounts[k] = (numericFieldCounts[k] || 0) + 1;
      }
    }
  }
  if (Object.keys(numericFieldCounts).length === 0) return null;

  // Choose the field: preference list first, then most-frequent numeric field.
  let chosen: string | null = null;
  for (const pref of TRAJECTORY_FIELD_PREFERENCE) {
    if (numericFieldCounts[pref]) {
      chosen = pref;
      break;
    }
  }
  if (!chosen) {
    const sorted = Object.entries(numericFieldCounts).sort((a, b) => b[1] - a[1]);
    chosen = sorted[0]?.[0] ?? null;
  }
  if (!chosen) return null;

  // Build the series, dropping rows that lack the chosen field.
  const points: TrajectorySeriesPoint[] = [];
  for (const r of readings) {
    const x = r.as_of ?? r.date ?? '';
    const v = r[chosen];
    if (typeof v === 'number' && Number.isFinite(v)) {
      points.push({ x: String(x), y: v, raw: r });
    }
  }
  if (points.length === 0) return null;

  // Sort by x ascending (string compare works for YYYY / YYYY-MM / YYYY-MM-DD).
  points.sort((a, b) => a.x.localeCompare(b.x));

  return {
    field: chosen,
    fieldLabel: chosen.replace(/_/g, ' '),
    points,
  };
}

/* ─── Multi-region trajectory series ─── */

export interface RegionSeries {
  name: string;
  points: { x: string; y: number }[];
}

/**
 * Multi-region variant. When readings carry a `region` field, group them by
 * region and return one series per region, all on the same primary metric.
 * Returns null if no `region` field is found (fall back to extractTrajectorySeries).
 */
export interface MultiRegionTrajectorySeries {
  field: string;
  fieldLabel: string;
  /** Sorted unique years across all regions */
  years: string[];
  regions: RegionSeries[];
  /** Recharts-friendly pivot: [{ x, RegionA, RegionB, ... }] */
  pivoted: Record<string, string | number | null>[];
}

export function extractMultiRegionTrajectorySeries(
  readings: V3TrajectoryReading[] | undefined,
): MultiRegionTrajectorySeries | null {
  if (!readings || readings.length === 0) return null;

  // Only activate when at least one reading has a `region` field.
  const hasRegion = readings.some((r) => typeof r.region === 'string' && r.region.trim() !== '');
  if (!hasRegion) return null;

  // Pick the primary metric using the same preference logic.
  const numericFieldCounts: Record<string, number> = {};
  for (const r of readings) {
    for (const [k, v] of Object.entries(r)) {
      if (NON_METRIC_KEYS.has(k)) continue;
      if (typeof v === 'number' && Number.isFinite(v)) {
        numericFieldCounts[k] = (numericFieldCounts[k] || 0) + 1;
      }
    }
  }
  if (Object.keys(numericFieldCounts).length === 0) return null;

  let chosen: string | null = null;
  for (const pref of TRAJECTORY_FIELD_PREFERENCE) {
    if (numericFieldCounts[pref]) { chosen = pref; break; }
  }
  if (!chosen) {
    const sorted = Object.entries(numericFieldCounts).sort((a, b) => b[1] - a[1]);
    chosen = sorted[0]?.[0] ?? null;
  }
  if (!chosen) return null;

  // Group by region.
  const byRegion: Record<string, { x: string; y: number }[]> = {};
  const yearSet = new Set<string>();

  for (const r of readings) {
    const regionName = (typeof r.region === 'string' ? r.region : 'Unknown').trim();
    const x = String(r.as_of ?? r.date ?? '');
    const v = r[chosen];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    if (!byRegion[regionName]) byRegion[regionName] = [];
    byRegion[regionName].push({ x, y: v });
    yearSet.add(x);
  }

  const regionNames = Object.keys(byRegion);
  if (regionNames.length === 0) return null;

  // Sort each region's series by year.
  for (const name of regionNames) {
    byRegion[name].sort((a, b) => a.x.localeCompare(b.x));
  }

  const years = Array.from(yearSet).sort((a, b) => a.localeCompare(b));

  // Build recharts pivot: each entry = { x: year, Region1: val, Region2: val, ... }
  const pivoted: Record<string, string | number | null>[] = years.map((yr) => {
    const row: Record<string, string | number | null> = { x: yr };
    for (const name of regionNames) {
      const pt = byRegion[name].find((p) => p.x === yr);
      row[name] = pt?.y ?? null;
    }
    return row;
  });

  return {
    field: chosen,
    fieldLabel: chosen.replace(/_/g, ' '),
    years,
    regions: regionNames.map((name) => ({ name, points: byRegion[name] })),
    pivoted,
  };
}
