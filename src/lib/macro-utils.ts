import {
  MacroActivityView,
  MacroBadgeMetric,
  MacroDashboardData,
  MacroEvidenceQuality,
  MacroMacroForce,
  MacroSegmentView,
  MacroSourceRecord,
  MacroThemeView,
} from '@/types/macro';

export type MacroStatusLabel = 'Advantaged' | 'Pressured' | 'Contested' | 'Uncertain';
export type MacroImpactDirection = 'positive' | 'neutral' | 'negative';

export interface MacroStatusTone {
  label: MacroStatusLabel;
  badgeClassName: string;
  panelClassName: string;
  accentClassName: string;
}

export interface MacroSegmentDecision {
  segmentKey: string;
  nodeKey: string;
  routeKey: string;
  title: string;
  thesis: string;
  whyItMatters: string;
  status: MacroStatusLabel;
  tone: MacroStatusTone;
  confidence: string;
  confidenceLabel: string;
  provisional: boolean;
  outlookLabel: string;
  recommendedAction: string;
  actionTitle: string;
  keyRisk: string;
  keyUpside: string;
  activityCount: number;
  activityKeys: string[];
  marketTrajectory: number;
  rightToPlay: number;
  positionSustainability: number;
  defensibility: number;
  strategicRelevance: number;
  transitionRiskLevel: string;
  topThemeKeys: string[];
  watchpoints: string[];
}

export interface MacroMapPoint {
  segmentKey: string;
  nodeKey: string;
  title: string;
  x: number;
  y: number;
  size: number;
  status: MacroStatusLabel;
  strategicRelevance: number;
}

export interface MacroHeatmapCell {
  segmentKey: string;
  segmentTitle: string;
  present: boolean;
  direction: MacroImpactDirection;
  severity: string;
  horizon: string;
  clickTarget?: string;
}

export interface MacroHeatmapRow {
  themeKey: string;
  nodeKey: string;
  title: string;
  mechanism: string;
  severity: string;
  horizon: string;
  cells: MacroHeatmapCell[];
}

export interface MacroActionItem {
  id: string;
  title: string;
  summary: string;
  urgencyLabel: string;
  urgencyScore: number;
  relatedSegmentKeys: string[];
  relatedThemeKeys: string[];
  primaryClickTarget?: string;
}

export interface MacroWatchIndicator {
  id: string;
  label: string;
  score: number;
  evidenceCount: number;
  relatedSegmentKeys: string[];
  relatedActivityKeys: string[];
  kind: 'leading' | 'trigger';
}

export interface MacroResolvedSource {
  sourceKey: string;
  title: string;
  url?: string;
  publicationDate?: string;
  sourceDomain: string;
  sourceTier: string;
  sourceQuality?: number;
}

export interface MacroPortfolioSignal {
  id: string;
  summary: string;
  kindLabel: string;
  clickTarget?: string;
  relatedSegmentKeys: string[];
}

export interface MacroEvidenceCoverageItem {
  lensKey: string;
  label: string;
  count: number;
  uniqueSources: number;
  sourceTiers: string[];
  qaStatuses: string[];
}

export interface MacroActivityEvidenceModel {
  totalPromotedItems: number;
  citationCount: number;
  sourceTiers: string[];
  openGaps: string[];
  coverage: MacroEvidenceCoverageItem[];
  sources: MacroResolvedSource[];
  unresolvedCitations: number;
  exactCitationMappingAvailable: boolean;
  derivedFromThemes: boolean;
}

export interface MacroScenarioLane {
  segmentKey: string;
  title: string;
  nodes: Array<{
    label: string;
    state: string;
  }>;
  baseCase: string;
  bullCase: string;
  bearCase: string;
  triggers: string[];
  leadingIndicators: string[];
  relatedActivities: string[];
}

export interface MacroThemeOverlayModel {
  themeKey: string;
  nodeKey: string;
  title: string;
  mechanism: string;
  summary: string;
  severity: string;
  horizon: string;
  affectedSegments: string[];
  affectedActivities: string[];
  strategicImplications: string[];
  keyEvidence: string[];
  citationsCount: number;
  evidenceCount: number;
  sources: MacroResolvedSource[];
  unresolvedCitations: number;
}

export interface MacroPortfolioModel {
  companyName: string;
  heroMetrics: MacroBadgeMetric[];
  heroThesis: string;
  portfolioStatus: MacroStatusLabel;
  portfolioTone: MacroStatusTone;
  confidenceLabel: string;
  provisional: boolean;
  keyMessages: string[];
  portfolioSignals: MacroPortfolioSignal[];
  segmentDecisions: MacroSegmentDecision[];
  mapPoints: MacroMapPoint[];
  heatmapRows: MacroHeatmapRow[];
  actions: MacroActionItem[];
  watchlist: MacroWatchIndicator[];
  scenarioLanes: MacroScenarioLane[];
  themes: MacroThemeOverlayModel[];
  totalActivities: number;
  totalOpenGaps: number;
  lowConfidenceActivities: number;
}

export interface MacroRouteLookup {
  segmentByNodeKey: Record<string, MacroSegmentView>;
  activityByNodeKey: Record<string, MacroActivityView>;
  themeByNodeKey: Record<string, MacroThemeView>;
  activityBySegmentKey: Record<string, MacroActivityView[]>;
  segmentNodeKeyBySegmentKey: Record<string, string>;
  activityNodeKeyByActivityKey: Record<string, string>;
  themeNodeKeyByThemeKey: Record<string, string>;
}

const THEME_MECHANISMS: Record<string, string> = {
  china_and_localization:
    'Shifts pricing power, qualification dynamics, and regional capex logic between China-centric and localized supply chains.',
  regulation_and_policy:
    'Changes policy support, compliance cost, and qualification requirements across the portfolio.',
  technology_substitution:
    'Redirects value pools when product platforms, chemistries, or propulsion choices change.',
  supply_chain_concentration:
    'Changes feedstock access, refining leverage, and margin resilience when critical inputs stay concentrated.',
  regional_demand_capacity_shifts:
    'Moves utilization, customer proximity, and expansion economics across regions.',
};

const SEGMENT_PLAYBOOKS: Record<
  string,
  {
    actionTitle: string;
    action: string;
    nodes: string[];
  }
> = {
  battery_materials_solutions: {
    actionTitle: 'Reset the battery platform',
    action: 'Reset the battery platform and selectively rebuild only where localization, chemistry fit, and customer traction align.',
    nodes: ['Reset', 'Selective rebuild', 'Scale outcome', 'Niche outcome'],
  },
  catalysis: {
    actionTitle: 'Defend cash and plan redeployment',
    action: 'Defend catalysis cash flows, avoid stranded reinvestment, and plan explicit redeployment paths ahead of erosion.',
    nodes: ['Defend cash', 'Gradual erosion', 'Residual niche', 'Redeployment'],
  },
  recycling: {
    actionTitle: 'Strengthen recycling resilience',
    action: "Defend feedstock access and strengthen recycling as the portfolio's clearest resilience anchor.",
    nodes: ['Defend', 'Strengthen', 'Core resilience', 'Resilience under shock'],
  },
  specialty_materials: {
    actionTitle: 'Set retain-versus-prune triggers',
    action: 'Monitor specialty materials, clarify the role of each niche, and set explicit retain-versus-prune triggers.',
    nodes: ['Monitor', 'Clarify role', 'Retain', 'Prune'],
  },
};

const STATUS_TONES: Record<MacroStatusLabel, MacroStatusTone> = {
  Advantaged: {
    label: 'Advantaged',
    badgeClassName: 'border-emerald-500/35 bg-emerald-500/12 text-emerald-700',
    panelClassName: 'border-emerald-500/20 bg-emerald-500/[0.04]',
    accentClassName: 'text-emerald-700',
  },
  Pressured: {
    label: 'Pressured',
    badgeClassName: 'border-rose-500/35 bg-rose-500/12 text-rose-700',
    panelClassName: 'border-rose-500/20 bg-rose-500/[0.04]',
    accentClassName: 'text-rose-700',
  },
  Contested: {
    label: 'Contested',
    badgeClassName: 'border-amber-500/35 bg-amber-500/12 text-amber-700',
    panelClassName: 'border-amber-500/20 bg-amber-500/[0.04]',
    accentClassName: 'text-amber-700',
  },
  Uncertain: {
    label: 'Uncertain',
    badgeClassName: 'border-slate-400/35 bg-slate-400/12 text-slate-700',
    panelClassName: 'border-slate-400/20 bg-slate-400/[0.05]',
    accentClassName: 'text-slate-700',
  },
};

export const isMacroPayload = (json: unknown): json is MacroDashboardData => {
  const payload = json as Partial<MacroDashboardData>;
  return Boolean(
    payload?.meta?.company_name &&
      payload?.entry_modes?.default_mode &&
      payload?.overview_view?.view_key &&
      Array.isArray(payload?.segment_views) &&
      Array.isArray(payload?.activity_views) &&
      Array.isArray(payload?.theme_views) &&
      payload?.executive_reading_view?.view_key,
  );
};

const normalizeMacroArtifacts = (value: string) =>
  value
    .replace(/â€“/g, '-')
    .replace(/â€”/g, '-')
    .replace(/â€˜|â€™/g, "'")
    .replace(/â€œ|â€\u009d/g, '"')
    .replace(/â€¢/g, '•')
    .replace(/â”‚/g, '|')
    .replace(/\u00a0/g, ' ');

const SCRAPE_NOISE_PATTERNS = [
  /!\[[^\]]*\]\(/i,
  /skip to content/i,
  /\bmenu\s*\[\]\(/i,
  /featured featured/i,
  /wp-content\/uploads/i,
  /the great healthcare plan/i,
];

export const cleanMacroText = (value?: string) =>
  normalizeMacroArtifacts(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

export const isLikelyMacroScrapeNoise = (value?: string) => {
  const cleaned = cleanMacroText(value);
  if (!cleaned) return false;

  let score = 0;
  for (const pattern of SCRAPE_NOISE_PATTERNS) {
    if (pattern.test(cleaned)) score += 1;
  }

  const urls = cleaned.match(/https?:\/\/\S+/gi) || [];
  if (urls.length >= 2) score += 1;
  if (urls.length >= 1 && cleaned.length > 240) score += 1;
  if ((cleaned.match(/the white house/gi) || []).length >= 2) score += 1;

  return score >= 2;
};

const sanitizeMacroText = (value?: string) => {
  const cleaned = cleanMacroText(value);
  if (!cleaned || isLikelyMacroScrapeNoise(cleaned)) return '';
  return cleaned;
};

const sanitizeMacroList = (values?: Array<string | null | undefined>) =>
  Array.from(new Set((values || []).map((value) => sanitizeMacroText(value || '')).filter(Boolean)));

export const compactJoin = (values: string[], emptyFallback = 'None') => {
  const uniqueValues = Array.from(new Set(values.map((value) => cleanMacroText(value)).filter(Boolean)));
  if (!uniqueValues.length) return emptyFallback;
  if (uniqueValues.length === 1) return uniqueValues[0];
  if (uniqueValues.length === 2) return `${uniqueValues[0]} and ${uniqueValues[1]}`;
  return `${uniqueValues.slice(0, -1).join(', ')}, and ${uniqueValues[uniqueValues.length - 1]}`;
};

const mean = (values: number[]) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const firstSentence = (value?: string) => {
  const cleaned = sanitizeMacroText(value);
  if (!cleaned) return '';
  const match = cleaned.match(/.+?[.!?](?:\s|$)/);
  return cleanMacroText(match?.[0] ?? cleaned);
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const lowerIncludesEntity = (text: string, entity: string) =>
  new RegExp(`\\b${escapeRegExp(entity.toLowerCase())}\\b`, 'i').test(text.toLowerCase());

const isTextTooSpecific = (text: string, affectedSegments: string[], affectedActivities: string[]) => {
  const cleaned = cleanMacroText(text);
  if (!cleaned) return false;
  const activityMentions = affectedActivities.filter((item) => lowerIncludesEntity(cleaned, item)).length;
  const segmentMentions = affectedSegments.filter((item) => lowerIncludesEntity(cleaned, item)).length;
  return affectedActivities.length >= 3 && activityMentions <= 1 && segmentMentions === 0;
};

const getKnownEntities = (data: MacroDashboardData) => [
  data.meta.company_name,
  ...data.segment_views.map((segment) => segment.title),
  ...data.activity_views.map((activity) => activity.title),
];

const containsForeignEntity = (text: string, allowedEntities: string[], allEntities: string[]) => {
  const cleaned = cleanMacroText(text);
  if (!cleaned) return false;
  return allEntities.some(
    (entity) => !allowedEntities.includes(entity) && lowerIncludesEntity(cleaned, entity),
  );
};

export const getSafeNarrative = ({
  text,
  fallback,
  allowedEntities,
  allEntities,
  affectedSegments = [],
  affectedActivities = [],
}: {
  text?: string;
  fallback: string;
  allowedEntities: string[];
  allEntities: string[];
  affectedSegments?: string[];
  affectedActivities?: string[];
}) => {
  const cleaned = sanitizeMacroText(text);
  const fallbackText = sanitizeMacroText(fallback) || cleanMacroText(fallback);
  if (!cleaned) return fallbackText;
  if (containsForeignEntity(cleaned, allowedEntities, allEntities)) {
    return fallbackText;
  }
  if (isTextTooSpecific(cleaned, affectedSegments, affectedActivities)) {
    return fallbackText;
  }
  return cleaned;
};

export const formatMacroConfidence = (value?: string) => {
  const normalized = cleanMacroText(value).toLowerCase();
  switch (normalized) {
    case 'high':
      return 'High confidence';
    case 'medium':
      return 'Medium confidence';
    default:
      return 'Low confidence';
  }
};

const getAggregateConfidence = (levels: string[]) => {
  const normalized = levels.map((value) => cleanMacroText(value).toLowerCase()).filter(Boolean);
  if (!normalized.length) return 'low';
  if (normalized.every((value) => value === 'high')) return 'high';
  if (normalized.some((value) => value === 'low')) return 'low';
  return 'medium';
};

const levelsOrFallback = (labels: string[]) =>
  labels.map((value) => cleanMacroText(value).toLowerCase()).filter(Boolean);

const getAggregateOutlook = (labels: string[]) => {
  const normalized = levelsOrFallback(labels);
  if (normalized.includes('deteriorating')) return 'Deteriorating';
  if (normalized.includes('uncertain')) return 'Unclear';
  if (normalized.every((value) => value === 'improving')) return 'Improving';
  if (normalized.includes('improving')) return 'Mixed';
  return 'Stable';
};

const getStatusTone = (status: MacroStatusLabel) => STATUS_TONES[status];

const getTransitionRiskWeight = (value?: string) => {
  const normalized = cleanMacroText(value).toLowerCase();
  if (normalized === 'high') return 3;
  if (normalized === 'moderate' || normalized === 'medium') return 2;
  return 1;
};

const getEvidenceGapCount = (evidence?: MacroEvidenceQuality) => evidence?.open_gaps?.length ?? 0;

const getThemeMechanism = (themeKey?: string, fallback?: string) => {
  const normalizedKey = cleanMacroText(themeKey);
  if (normalizedKey && THEME_MECHANISMS[normalizedKey]) return THEME_MECHANISMS[normalizedKey];
  return firstSentence(fallback) || 'Changes business economics through timing, regulation, supply, and technology shifts.';
};

const formatLensLabel = (value: string) =>
  cleanMacroText(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const buildSourceLookup = (data: MacroDashboardData) =>
  Object.values(data.source_index || {}).reduce<Record<string, MacroSourceRecord>>((acc, source) => {
    if (source?.source_key) {
      acc[cleanMacroText(source.source_key)] = source;
    }
    return acc;
  }, {});

const sourceTierWeight = (tier?: string | null) => {
  const normalized = cleanMacroText(tier || '').toLowerCase();
  if (normalized === 'primary') return 3;
  if (normalized === 'secondary') return 2;
  if (normalized === 'tertiary') return 1;
  return 0;
};

const toResolvedSource = (source: MacroSourceRecord): MacroResolvedSource => ({
  sourceKey: cleanMacroText(source.source_key),
  title: cleanMacroText(source.title) || cleanMacroText(source.source_domain || '') || 'Source',
  url: cleanMacroText(source.url || '') || undefined,
  publicationDate: cleanMacroText(source.publication_date || '') || undefined,
  sourceDomain: cleanMacroText(source.source_domain || '') || 'Unknown domain',
  sourceTier: cleanMacroText(source.source_tier || '') || 'Unknown tier',
  sourceQuality: typeof source.source_quality === 'number' ? source.source_quality : undefined,
});

const resolveMacroSources = (data: MacroDashboardData, citationKeys?: string[]) => {
  const lookup = buildSourceLookup(data);
  const uniqueKeys = Array.from(new Set((citationKeys || []).map((key) => cleanMacroText(key)).filter(Boolean)));
  const resolved: MacroResolvedSource[] = [];
  let unresolvedCount = 0;

  for (const key of uniqueKeys) {
    const source = lookup[key];
    if (!source) {
      unresolvedCount += 1;
      continue;
    }
    resolved.push(toResolvedSource(source));
  }

  const deduped = Array.from(
    resolved.reduce<Map<string, MacroResolvedSource>>((acc, source) => {
      acc.set(`${source.url || source.title}::${source.sourceDomain}`, source);
      return acc;
    }, new Map()).values(),
  ).sort(
    (left, right) =>
      sourceTierWeight(right.sourceTier) - sourceTierWeight(left.sourceTier) ||
      (right.sourceQuality ?? 0) - (left.sourceQuality ?? 0),
  );

  return { sources: deduped, unresolvedCount };
};

const getRelatedThemeViews = (data: MacroDashboardData, activity: MacroActivityView) =>
  Array.from(
    new Map(
      (activity.modules?.macro_force_map?.forces || [])
        .map((force) =>
          data.theme_views.find(
            (theme) =>
              theme.view_key === force.click_target ||
              theme.route_key === force.click_target ||
              theme.theme_key === force.theme_key,
          ),
        )
        .filter((theme): theme is MacroThemeView => Boolean(theme))
        .map((theme) => [theme.theme_key, theme]),
    ).values(),
  );

const getActivityCitationSet = (data: MacroDashboardData, activity: MacroActivityView) => {
  const directCitations = (activity.modules?.evidence_quality?.citations || [])
    .map((citation) => cleanMacroText(citation))
    .filter(Boolean);
  if (directCitations.length) {
    return {
      citationKeys: directCitations,
      exactCitationMappingAvailable: true,
      derivedFromThemes: false,
    };
  }

  const derivedCitations = Array.from(
    new Set(
      getRelatedThemeViews(data, activity)
        .flatMap((theme) => theme.citations || [])
        .map((citation) => cleanMacroText(citation))
        .filter(Boolean),
    ),
  );

  return {
    citationKeys: derivedCitations,
    exactCitationMappingAvailable: false,
    derivedFromThemes: derivedCitations.length > 0,
  };
};

const getEvidenceCoverage = (evidence?: MacroEvidenceQuality): MacroEvidenceCoverageItem[] =>
  Object.entries(evidence?.coverage_by_lens || {})
    .map(([lensKey, lens]) => ({
      lensKey,
      label: formatLensLabel(lensKey),
      count: lens?.count ?? 0,
      uniqueSources: lens?.unique_sources ?? 0,
      sourceTiers: sanitizeMacroList(lens?.source_tiers),
      qaStatuses: sanitizeMacroList(lens?.qa_statuses),
    }))
    .sort((left, right) => right.count - left.count || right.uniqueSources - left.uniqueSources);

const buildRouteLookup = (data: MacroDashboardData): MacroRouteLookup => {
  const segmentByNodeKey = Object.fromEntries(data.segment_views.map((view) => [view.view_key, view]));
  const activityByNodeKey = Object.fromEntries(data.activity_views.map((view) => [view.view_key, view]));
  const themeByNodeKey = Object.fromEntries(data.theme_views.map((view) => [view.view_key, view]));

  const activityBySegmentKey = data.activity_views.reduce<Record<string, MacroActivityView[]>>((acc, activity) => {
    acc[activity.parent_segment_key] ||= [];
    acc[activity.parent_segment_key].push(activity);
    return acc;
  }, {});

  const segmentNodeKeyBySegmentKey = data.segment_views.reduce<Record<string, string>>((acc, segment) => {
    acc[segment.segment_key] = segment.view_key;
    return acc;
  }, {});

  const activityNodeKeyByActivityKey = data.activity_views.reduce<Record<string, string>>((acc, activity) => {
    acc[activity.activity_key] = activity.view_key;
    return acc;
  }, {});

  const themeNodeKeyByThemeKey = data.theme_views.reduce<Record<string, string>>((acc, theme) => {
    acc[theme.theme_key] = theme.view_key;
    return acc;
  }, {});

  return {
    segmentByNodeKey,
    activityByNodeKey,
    themeByNodeKey,
    activityBySegmentKey,
    segmentNodeKeyBySegmentKey,
    activityNodeKeyByActivityKey,
    themeNodeKeyByThemeKey,
  };
};

const pickKeyRisk = (activities: MacroActivityView[]) => {
  for (const activity of activities) {
    const candidate =
      firstSentence(activity.modules?.defensibility_test?.failure_modes?.[0]) ||
      firstSentence(activity.modules?.scenario_box?.bear_case) ||
      firstSentence(activity.modules?.market_clock?.key_headwinds?.[0]);
    if (candidate) return candidate;
  }
  return 'Structural downside could accelerate if the key assumptions fail faster than the asset base can adjust.';
};

const pickKeyUpside = (activities: MacroActivityView[]) => {
  for (const activity of activities) {
    const candidate =
      firstSentence(activity.modules?.scenario_box?.bull_case) ||
      firstSentence(activity.modules?.defensibility_test?.must_be_true?.[0]) ||
      firstSentence(activity.modules?.defensibility_test?.current_advantages?.[0]);
    if (candidate) return candidate;
  }
  return 'Upside exists if the segment wins the right regional and customer positions before the market resets again.';
};

const buildSegmentDecision = (
  data: MacroDashboardData,
  segment: MacroSegmentView,
  activities: MacroActivityView[],
): MacroSegmentDecision => {
  const allEntities = getKnownEntities(data);
  const allowedEntities = [data.meta.company_name, segment.title, ...activities.map((activity) => activity.title)];
  const marketTrajectory = mean(activities.map((activity) => activity.scores.market_attractiveness));
  const rightToPlay = mean(activities.map((activity) => activity.scores.right_to_play));
  const positionSustainability = mean(activities.map((activity) => activity.scores.position_sustainability));
  const defensibility = mean([rightToPlay, positionSustainability]);
  const confidence = getAggregateConfidence(activities.map((activity) => activity.scores.confidence || 'low'));
  const transitionRiskLevel = cleanMacroText(segment.segment_judgment?.transition_risk_level || 'medium').toLowerCase();
  const outlookLabel = getAggregateOutlook(activities.map((activity) => activity.scores.outlook_label || 'uncertain'));
  const hasDeterioratingActivity = activities.some(
    (activity) => cleanMacroText(activity.scores.outlook_label).toLowerCase() === 'deteriorating',
  );

  let status: MacroStatusLabel;
  if (transitionRiskLevel === 'high' || hasDeterioratingActivity || marketTrajectory < 2.8 || defensibility < 2.8) {
    status = 'Pressured';
  } else if (defensibility >= 3.4 && marketTrajectory >= 3) {
    status = 'Advantaged';
  } else if (confidence === 'low' && marketTrajectory <= 3.1 && defensibility <= 3.1) {
    status = 'Uncertain';
  } else {
    status = 'Contested';
  }

  const playbook = SEGMENT_PLAYBOOKS[segment.segment_key];
  const topThemeKeys = segment.major_macro_forces
    .slice()
    .sort((left, right) => (left.importance_rank ?? 99) - (right.importance_rank ?? 99))
    .map((force) => force.theme_key || '')
    .filter(Boolean)
    .slice(0, 3);

  const watchpoints = Array.from(
    new Set(
      activities.flatMap((activity) => [
        ...(activity.modules?.scenario_box?.leading_indicators ?? []),
        ...(activity.modules?.scenario_box?.what_changes_the_judgment ?? []),
      ]),
    ),
  ).slice(0, 4);

  const topForceSeverities = segment.major_macro_forces.map((force) => cleanMacroText(force.severity).toLowerCase());
  const highSeverityCount = topForceSeverities.filter((severity) => severity === 'high').length;
  const strategicRelevance = Math.min(
    98,
    Math.round(
      42 +
        segment.subactivity_cards.length * 12 +
        marketTrajectory * 7 +
        defensibility * 6 +
        getTransitionRiskWeight(transitionRiskLevel) * 4 +
        highSeverityCount * 3,
    ),
  );

  const thesis = getSafeNarrative({
    text: segment.segment_summary?.one_liner || segment.short_description,
    fallback: segment.short_description || 'This segment matters because it sits at a meaningful strategic crossroads.',
    allowedEntities,
    allEntities,
  });

  const whyItMatters = getSafeNarrative({
    text: segment.segment_summary?.why_it_matters || segment.modules?.segment_snapshot?.why_it_matters,
    fallback: 'This segment matters because it changes how the portfolio balances resilience, transition pressure, and optionality.',
    allowedEntities,
    allEntities,
  });

  return {
    segmentKey: segment.segment_key,
    nodeKey: segment.view_key,
    routeKey: segment.route_key,
    title: segment.title,
    thesis,
    whyItMatters,
    status,
    tone: getStatusTone(status),
    confidence,
    confidenceLabel: formatMacroConfidence(confidence),
    provisional: confidence === 'low',
    outlookLabel,
    recommendedAction:
      playbook?.action ||
      (status === 'Pressured'
        ? 'Defend cash and avoid discretionary exposure until the downside path is clearer.'
        : status === 'Advantaged'
          ? 'Defend and strengthen the current position before the advantage diffuses.'
          : status === 'Uncertain'
            ? 'Clarify the role, tighten triggers, and avoid over-reading low-confidence signals.'
            : 'Reset the posture around the few areas where the segment can still win economically.'),
    actionTitle:
      playbook?.actionTitle ||
      (status === 'Pressured'
        ? 'Defend the current cash engine'
        : status === 'Advantaged'
          ? 'Strengthen the current anchor'
          : status === 'Uncertain'
            ? 'Clarify the role and triggers'
            : 'Selectively rebuild the position'),
    keyRisk: pickKeyRisk(activities),
    keyUpside: pickKeyUpside(activities),
    activityCount: segment.subactivity_cards.length,
    activityKeys: activities.map((activity) => activity.activity_key),
    marketTrajectory,
    rightToPlay,
    positionSustainability,
    defensibility,
    strategicRelevance,
    transitionRiskLevel,
    topThemeKeys,
    watchpoints,
  };
};

const getPortfolioStatus = (segments: MacroSegmentDecision[]): MacroStatusLabel => {
  const counts = segments.reduce<Record<MacroStatusLabel, number>>(
    (acc, segment) => {
      acc[segment.status] += 1;
      return acc;
    },
    { Advantaged: 0, Pressured: 0, Contested: 0, Uncertain: 0 },
  );

  if (counts.Pressured >= 2) return 'Pressured';
  if (counts.Advantaged >= 2 && counts.Pressured === 0) return 'Advantaged';
  if (counts.Uncertain >= 2 && counts.Advantaged === 0) return 'Uncertain';
  return 'Contested';
};

const buildHeroThesis = (companyName: string, segments: MacroSegmentDecision[]) => {
  const resilient = segments.filter((segment) => segment.status === 'Advantaged').map((segment) => segment.title);
  const pressured = segments.filter((segment) => segment.status === 'Pressured').map((segment) => segment.title);
  const options = segments
    .filter((segment) => segment.status === 'Contested' || segment.status === 'Uncertain')
    .map((segment) => segment.title);

  if (resilient.length && pressured.length) {
    return `${companyName} is managing an uneven macro portfolio: ${compactJoin(
      resilient,
    )} provide the clearest resilience, ${compactJoin(pressured)} need active defense, and ${compactJoin(
      options,
      'the remaining segments',
    )} should be treated as selective options until evidence improves.`;
  }

  return `${companyName} is managing a contested portfolio with uneven structural clocks, so leadership should compare segments first and keep judgments trigger-based rather than score-led.`;
};

const buildKeyMessages = (
  segments: MacroSegmentDecision[],
  lowConfidenceActivities: number,
  totalActivities: number,
) => {
  const resilient = segments.find((segment) => segment.status === 'Advantaged');
  const pressured = segments.find((segment) => segment.status === 'Pressured');
  const optionSet = segments.filter((segment) => segment.status === 'Contested' || segment.status === 'Uncertain');

  const messages: string[] = [];

  if (resilient) {
    messages.push(
      `${resilient.title} is the clearest resilience anchor if ${cleanMacroText(
        resilient.watchpoints[0] || 'feedstock and execution hold',
      ).toLowerCase()}.`,
    );
  }

  if (pressured) {
    messages.push(`${pressured.title} still matters, but it needs explicit defense and redeployment discipline.`);
  }

  if (optionSet.length) {
    messages.push(
      `${compactJoin(optionSet.map((segment) => segment.title))} should be managed as selective options until the evidence base improves.`,
    );
  }

  messages.push(
    `The current view is provisional: ${lowConfidenceActivities}/${totalActivities} activities are low confidence, so management should rely on watchpoints and triggers, not precise portfolio averages.`,
  );

  return messages.slice(0, 3);
};

const getHeatmapDirection = (force: MacroMacroForce): MacroImpactDirection => {
  const raw = cleanMacroText(force.impact_direction || force.direction).toLowerCase();
  if (raw === 'positive') return 'positive';
  if (raw === 'negative') return 'negative';
  return 'neutral';
};

const buildThemeOverlayModel = (
  data: MacroDashboardData,
  theme: MacroThemeView,
  segments: MacroSegmentView[],
  activities: MacroActivityView[],
): MacroThemeOverlayModel => {
  const allEntities = getKnownEntities(data);
  const { sources, unresolvedCount } = resolveMacroSources(data, theme.citations || []);
  const mechanism = getThemeMechanism(theme.theme_key, theme.why_it_matters || theme.what_is_changing);
  const summary = getSafeNarrative({
    text: theme.what_is_changing,
    fallback:
      theme.why_it_matters ||
      sources
        .map((source) => cleanMacroText(`${source.title} (${source.sourceDomain})`))
        .slice(0, 2)
        .join('; ') ||
      mechanism,
    allowedEntities: [data.meta.company_name, theme.title, ...(theme.affected_segments ?? []), ...(theme.affected_activities ?? [])],
    allEntities,
    affectedSegments: theme.affected_segments,
    affectedActivities: theme.affected_activities,
  });

  const matchingForces = segments.flatMap((segment) =>
    segment.major_macro_forces.filter((force) => force.theme_key === theme.theme_key),
  );

  const severity =
    matchingForces.find((force) => cleanMacroText(force.severity).toLowerCase() === 'high')?.severity ||
    matchingForces[0]?.severity ||
    'medium';
  const horizon = matchingForces[0]?.time_horizon || 'medium_term';

  const fallbackEvidence = matchingForces
    .map((force) => force.subtheme_label || force.summary || '')
    .map((item) => firstSentence(item))
    .filter(Boolean);
  const sourceFallbackEvidence = sources
    .map((source) => cleanMacroText(`${source.title} (${source.sourceDomain})`))
    .filter(Boolean);
  const sanitizedEvidence = sanitizeMacroList(theme.key_evidence)
    .map((item) => firstSentence(item))
    .filter(Boolean);

  const activityTitles = new Set(activities.map((activity) => activity.title));
  const segmentTitles = new Set(segments.map((segment) => segment.title));

  return {
    themeKey: theme.theme_key,
    nodeKey: theme.view_key,
    title: theme.title,
    mechanism,
    summary,
    severity: cleanMacroText(severity) || 'medium',
    horizon: cleanMacroText(horizon) || 'medium_term',
    affectedSegments: (theme.affected_segments || []).filter((item) => segmentTitles.has(item)),
    affectedActivities: (theme.affected_activities || []).filter((item) => activityTitles.has(item)),
    strategicImplications: sanitizeMacroList(theme.strategic_implications),
    keyEvidence:
      sanitizedEvidence.slice(0, 3).length
        ? sanitizedEvidence.slice(0, 3)
        : fallbackEvidence.slice(0, 3).length
          ? fallbackEvidence.slice(0, 3)
          : sourceFallbackEvidence.slice(0, 3),
    citationsCount: theme.citations?.length ?? 0,
    evidenceCount: sanitizedEvidence.length || fallbackEvidence.length || sourceFallbackEvidence.length,
    sources,
    unresolvedCitations: unresolvedCount,
  };
};

const buildHeatmapRows = (
  data: MacroDashboardData,
  decisions: MacroSegmentDecision[],
  themes: MacroThemeOverlayModel[],
): MacroHeatmapRow[] =>
  themes.map((theme) => {
    const cells = decisions.map<MacroHeatmapCell>((decision) => {
      const segment = data.segment_views.find((item) => item.segment_key === decision.segmentKey);
      const force = segment?.major_macro_forces.find((item) => item.theme_key === theme.themeKey);
      return {
        segmentKey: decision.segmentKey,
        segmentTitle: decision.title,
        present: Boolean(force),
        direction: force ? getHeatmapDirection(force) : 'neutral',
        severity: cleanMacroText(force?.severity) || 'n/a',
        horizon: cleanMacroText(force?.time_horizon) || 'n/a',
        clickTarget: force?.click_target || theme.nodeKey,
      };
    });

    return {
      themeKey: theme.themeKey,
      nodeKey: theme.nodeKey,
      title: theme.title,
      mechanism: theme.mechanism,
      severity: theme.severity,
      horizon: theme.horizon,
      cells,
    };
  });

const normalizeIndicatorLabel = (value: string) => cleanMacroText(value).replace(/[.:]$/, '');

const buildWatchlist = (activities: MacroActivityView[]) => {
  const registry = new Map<
    string,
    {
      label: string;
      score: number;
      evidenceCount: number;
      relatedSegmentKeys: Set<string>;
      relatedActivityKeys: Set<string>;
      kind: 'leading' | 'trigger';
    }
  >();

  const register = (
    label: string,
    activity: MacroActivityView,
    weight: number,
    kind: 'leading' | 'trigger',
  ) => {
    const normalized = normalizeIndicatorLabel(label);
    if (!normalized) return;
    const current = registry.get(normalized) || {
      label: normalized,
      score: 0,
      evidenceCount: 0,
      relatedSegmentKeys: new Set<string>(),
      relatedActivityKeys: new Set<string>(),
      kind,
    };
    current.score += weight;
    current.evidenceCount += 1;
    current.relatedSegmentKeys.add(activity.parent_segment_key);
    current.relatedActivityKeys.add(activity.activity_key);
    if (kind === 'leading') current.kind = 'leading';
    registry.set(normalized, current);
  };

  for (const activity of activities) {
    for (const item of activity.modules?.scenario_box?.leading_indicators ?? []) {
      register(item, activity, 3, 'leading');
    }
    for (const item of activity.modules?.scenario_box?.what_changes_the_judgment ?? []) {
      register(item, activity, 2, 'trigger');
    }
    for (const item of activity.modules?.scenario_box?.triggers ?? []) {
      register(item, activity, 2, 'trigger');
    }
  }

  return Array.from(registry.values())
    .sort((left, right) => right.score - left.score || right.evidenceCount - left.evidenceCount)
    .slice(0, 5)
    .map<MacroWatchIndicator>((item) => ({
      id: item.label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      label: item.label,
      score: item.score,
      evidenceCount: item.evidenceCount,
      relatedSegmentKeys: Array.from(item.relatedSegmentKeys),
      relatedActivityKeys: Array.from(item.relatedActivityKeys),
      kind: item.kind,
    }));
};

const buildScenarioLanes = (decisions: MacroSegmentDecision[], lookup: MacroRouteLookup) =>
  decisions.map<MacroScenarioLane>((decision) => {
    const activities = lookup.activityBySegmentKey[decision.segmentKey] || [];
    const playbook = SEGMENT_PLAYBOOKS[decision.segmentKey];
    const nodes = (playbook?.nodes || ['Now', '5Y', '10Y', '15Y']).map((state, index) => ({
      label: ['Now', '5Y', '10Y', '15Y'][index],
      state,
    }));

    return {
      segmentKey: decision.segmentKey,
      title: decision.title,
      nodes,
      baseCase: compactJoin(
        activities
          .map((activity) => firstSentence(activity.modules?.scenario_box?.base_case))
          .filter(Boolean)
          .slice(0, 2),
        'Base case still forming',
      ),
      bullCase: compactJoin(
        activities
          .map((activity) => firstSentence(activity.modules?.scenario_box?.bull_case))
          .filter(Boolean)
          .slice(0, 2),
        'Bull case still forming',
      ),
      bearCase: compactJoin(
        activities
          .map((activity) => firstSentence(activity.modules?.scenario_box?.bear_case))
          .filter(Boolean)
          .slice(0, 2),
        'Bear case still forming',
      ),
      triggers: Array.from(
        new Set(activities.flatMap((activity) => activity.modules?.scenario_box?.triggers ?? [])),
      ).slice(0, 5),
      leadingIndicators: Array.from(
        new Set(activities.flatMap((activity) => activity.modules?.scenario_box?.leading_indicators ?? [])),
      ).slice(0, 5),
      relatedActivities: activities.map((activity) => activity.title),
    };
  });

const buildActions = (
  decisions: MacroSegmentDecision[],
  themes: MacroThemeOverlayModel[],
  watchlist: MacroWatchIndicator[],
): MacroActionItem[] => {
  const segmentActions = decisions.map<MacroActionItem>((decision) => {
    const urgencyScore =
      decision.strategicRelevance +
      (decision.status === 'Pressured' ? 18 : decision.status === 'Contested' ? 12 : decision.status === 'Uncertain' ? 8 : 10) +
      (decision.provisional ? 4 : 0);

    return {
      id: `segment-${decision.segmentKey}`,
      title: decision.actionTitle,
      summary: `${decision.title}: ${decision.recommendedAction}`,
      urgencyLabel: urgencyScore >= 88 ? 'Act now' : urgencyScore >= 78 ? 'Prioritize next' : 'Keep on watch',
      urgencyScore,
      relatedSegmentKeys: [decision.segmentKey],
      relatedThemeKeys: decision.topThemeKeys,
      primaryClickTarget: decision.nodeKey,
    };
  });

  const crossCutTheme = themes
    .slice()
    .sort((left, right) => right.affectedSegments.length - left.affectedSegments.length)[0];

  const crossCutWatch = watchlist[0];

  if (crossCutTheme) {
    segmentActions.push({
      id: `theme-${crossCutTheme.themeKey}`,
      title: `Track ${crossCutTheme.title} as a portfolio filter`,
      summary: `${crossCutTheme.title} is a cross-cutting pressure because it changes ${crossCutTheme.mechanism
        .replace(/\.$/, '')
        .toLowerCase()}.`,
      urgencyLabel: 'Portfolio lens',
      urgencyScore: 76,
      relatedSegmentKeys: crossCutTheme.affectedSegments
        .map((title) =>
          decisions.find((decision) => decision.title === title)?.segmentKey || '',
        )
        .filter(Boolean),
      relatedThemeKeys: [crossCutTheme.themeKey],
      primaryClickTarget: crossCutTheme.nodeKey,
    });
  }

  if (crossCutWatch) {
    segmentActions.push({
      id: `watch-${crossCutWatch.id}`,
      title: `Monitor ${crossCutWatch.label.toLowerCase()}`,
      summary: `${crossCutWatch.label} is one of the clearest change indicators across ${crossCutWatch.relatedSegmentKeys.length} segments.`,
      urgencyLabel: crossCutWatch.kind === 'leading' ? 'Leading indicator' : 'Decision trigger',
      urgencyScore: 70,
      relatedSegmentKeys: crossCutWatch.relatedSegmentKeys,
      relatedThemeKeys: [],
    });
  }

  return segmentActions
    .sort((left, right) => right.urgencyScore - left.urgencyScore)
    .slice(0, 5);
};

const slugify = (value: string) =>
  cleanMacroText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const buildPortfolioSignals = (
  data: MacroDashboardData,
  decisions: MacroSegmentDecision[],
  themes: MacroThemeOverlayModel[],
): MacroPortfolioSignal[] =>
  sanitizeMacroList(data.overview_view.portfolio_signals).map((signal, index) => {
    const relatedActivity = data.activity_views.find((activity) => lowerIncludesEntity(signal, activity.title));
    const relatedSegment = decisions.find((decision) => lowerIncludesEntity(signal, decision.title));
    const relatedTheme = themes.find((theme) => lowerIncludesEntity(signal, theme.title));

    return {
      id: `signal-${slugify(signal) || index}`,
      summary: signal,
      kindLabel: relatedActivity
        ? 'Activity signal'
        : relatedSegment
          ? 'Segment signal'
          : relatedTheme
            ? 'Theme signal'
            : 'Portfolio signal',
      clickTarget: relatedActivity?.view_key || relatedSegment?.nodeKey || relatedTheme?.nodeKey,
      relatedSegmentKeys: Array.from(
        new Set([
          ...(relatedActivity ? [relatedActivity.parent_segment_key] : []),
          ...(relatedSegment ? [relatedSegment.segmentKey] : []),
          ...(relatedTheme
            ? relatedTheme.affectedSegments
                .map((title) => decisions.find((decision) => decision.title === title)?.segmentKey || '')
                .filter(Boolean)
            : []),
        ]),
      ),
    };
  });

export const getRouteLookup = buildRouteLookup;

export const buildMacroPortfolioModel = (data: MacroDashboardData): MacroPortfolioModel => {
  const lookup = buildRouteLookup(data);
  const segmentDecisions = data.segment_views.map((segment) =>
    buildSegmentDecision(data, segment, lookup.activityBySegmentKey[segment.segment_key] || []),
  );

  const portfolioStatus = getPortfolioStatus(segmentDecisions);
  const totalActivities = data.activity_views.length;
  const totalOpenGaps = data.activity_views.reduce(
    (sum, activity) => sum + getEvidenceGapCount(activity.modules?.evidence_quality),
    0,
  );
  const lowConfidenceActivities = data.activity_views.filter(
    (activity) => getAggregateConfidence([activity.scores.confidence || 'low']) === 'low',
  ).length;
  const provisional = lowConfidenceActivities > 0;
  const companyName = data.meta.company_name;
  const themes = data.theme_views.map((theme) =>
    buildThemeOverlayModel(data, theme, data.segment_views, data.activity_views),
  );
  const watchlist = buildWatchlist(data.activity_views);
  const portfolioSignals = buildPortfolioSignals(data, segmentDecisions, themes);

  return {
    companyName,
    heroMetrics: data.overview_view.hero_metrics || [],
    heroThesis: buildHeroThesis(companyName, segmentDecisions),
    portfolioStatus,
    portfolioTone: getStatusTone(portfolioStatus),
    confidenceLabel: provisional
      ? `Low confidence: ${lowConfidenceActivities}/${totalActivities} activities remain provisional and most lenses are thinly sourced.`
      : 'Confidence is stable across the current evidence set.',
    provisional,
    keyMessages: buildKeyMessages(segmentDecisions, lowConfidenceActivities, totalActivities),
    portfolioSignals,
    segmentDecisions,
    mapPoints: segmentDecisions.map<MacroMapPoint>((decision) => ({
      segmentKey: decision.segmentKey,
      nodeKey: decision.nodeKey,
      title: decision.title,
      x: 10 + ((decision.marketTrajectory - 1) / 4) * 80,
      y: 10 + ((decision.defensibility - 1) / 4) * 80,
      size: 50 + (decision.strategicRelevance / 100) * 52,
      status: decision.status,
      strategicRelevance: decision.strategicRelevance,
    })),
    heatmapRows: buildHeatmapRows(data, segmentDecisions, themes),
    actions: buildActions(segmentDecisions, themes, watchlist),
    watchlist,
    scenarioLanes: buildScenarioLanes(segmentDecisions, lookup),
    themes,
    totalActivities,
    totalOpenGaps,
    lowConfidenceActivities,
  };
};

export const getMacroThemeSummary = (theme: MacroThemeOverlayModel) =>
  cleanMacroText(theme.summary) || cleanMacroText(theme.mechanism);

export const getActivityNarrative = (
  data: MacroDashboardData,
  activity: MacroActivityView,
  fallback: string,
) =>
  getSafeNarrative({
    text:
      activity.modules?.activity_snapshot?.why_it_matters ||
      activity.modules?.defensibility_test?.summary ||
      activity.modules?.market_clock?.summary,
    fallback,
    allowedEntities: [data.meta.company_name, activity.title],
    allEntities: getKnownEntities(data),
  });

export const getMacroForceNarrative = (
  data: MacroDashboardData,
  force: MacroMacroForce,
  segment: MacroSegmentView,
  activities: MacroActivityView[],
) =>
  getSafeNarrative({
    text: force.summary || force.why_it_matters,
    fallback: getThemeMechanism(force.theme_key, force.subtheme_label || force.summary),
    allowedEntities: [data.meta.company_name, segment.title, ...activities.map((activity) => activity.title)],
    allEntities: getKnownEntities(data),
  });

export const getActivityEvidenceModel = (
  data: MacroDashboardData,
  activity: MacroActivityView,
): MacroActivityEvidenceModel => {
  const evidence = activity.modules?.evidence_quality;
  const citationSet = getActivityCitationSet(data, activity);
  const { sources, unresolvedCount } = resolveMacroSources(data, citationSet.citationKeys);

  return {
    totalPromotedItems: evidence?.total_promoted_items ?? 0,
    citationCount: evidence?.citation_count ?? citationSet.citationKeys.length,
    sourceTiers: sanitizeMacroList(evidence?.source_tiers),
    openGaps: sanitizeMacroList(evidence?.open_gaps),
    coverage: getEvidenceCoverage(evidence),
    sources,
    unresolvedCitations: unresolvedCount,
    exactCitationMappingAvailable: citationSet.exactCitationMappingAvailable,
    derivedFromThemes: citationSet.derivedFromThemes,
  };
};
