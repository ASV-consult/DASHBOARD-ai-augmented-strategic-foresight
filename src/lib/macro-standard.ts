import {
  MacroActivityCard,
  MacroActivityView,
  MacroBundleContract,
  MacroDashboardData,
  MacroDomainCount,
  MacroEvidencePanel,
  MacroMeta,
  MacroNavigationNode,
  MacroOverviewSegmentCard,
  MacroPortfolioModel,
  MacroResearchProgress,
  MacroRouteLookup,
  MacroScoreBundle,
  MacroScoreMetric,
  MacroScoreSummary,
  MacroScorecard,
  MacroSegmentBusinessMap,
  MacroSegmentDecisionModel,
  MacroSegmentView,
  MacroSourceRecord,
  MacroSourceUsage,
  MacroSupportingTopic,
} from '@/types/macro';

type JsonValue = string | number | boolean | null | { [key: string]: JsonValue | undefined } | JsonValue[];
type JsonObject = { [key: string]: JsonValue | undefined };

type NewMacroPayload = {
  meta?: JsonObject;
  bundle_contract?: JsonObject;
  overview_view?: JsonObject;
  segment_views?: JsonObject[];
  activity_views?: JsonObject[];
  navigation_tree?: JsonObject[];
  source_index?: Record<string, JsonObject>;
};

type LegacyMacroPayload = {
  meta?: JsonObject;
  default_route?: string;
  recommended_user_flow?: string[];
  overview_view?: JsonObject;
  segment_views?: JsonObject[];
  activity_views?: JsonObject[];
  navigation_tree?: JsonObject[];
  entry_modes?: JsonObject;
  theme_views?: JsonValue[];
  executive_reading_view?: JsonObject;
  source_index?: Record<string, JsonObject>;
};

const SCORE_ORDER = ['market_trajectory', 'right_to_play', 'position_sustainability'];

const SCORE_LABELS: Record<string, string> = {
  market_trajectory: 'Market Trajectory',
  market_attractiveness: 'Market Trajectory',
  right_to_play: 'Right To Play',
  position_sustainability: 'Position Sustainability',
};

const DEFAULT_MACRO_FLOW = [
  'Start with the overview strip to separate ready coverage from pending placeholders.',
  'Open the most decision-relevant ready segment before drilling into activities.',
  'Use scorecards and memos together rather than reading scores in isolation.',
  'Validate the call with the source roll-up before treating it as decision-grade.',
];

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asObject = (value: unknown): JsonObject => (isObject(value) ? value : {});

const asArray = (value: unknown): JsonValue[] => (Array.isArray(value) ? value : []);

const asString = (value: unknown) => (typeof value === 'string' ? value : '');

const asNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

const asStringArray = (value: unknown) =>
  asArray(value)
    .map((item) => cleanMacroText(asString(item)))
    .filter(Boolean);

const ensureArray = <T>(value: T[] | undefined): T[] => value || [];

const titleCase = (value: string) =>
  cleanMacroText(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const cleanMacroText = (value?: string | null) =>
  (value || '')
    .replace(/Ã¢â‚¬â€œ/g, '-')
    .replace(/Ã¢â‚¬â€/g, '-')
    .replace(/Ã¢â‚¬Ëœ|Ã¢â‚¬â„¢/g, "'")
    .replace(/Ã¢â‚¬Å“|Ã¢â‚¬\u009d/g, '"')
    .replace(/â€¦/g, '...')
    .replace(/â€™/g, "'")
    .replace(/â€œ|â€/g, '"')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const cleanMarkdown = (value?: string | null) =>
  (value || '')
    .replace(/Ã¢â‚¬â€œ/g, '-')
    .replace(/Ã¢â‚¬â€/g, '-')
    .replace(/Ã¢â‚¬Ëœ|Ã¢â‚¬â„¢/g, "'")
    .replace(/Ã¢â‚¬Å“|Ã¢â‚¬\u009d/g, '"')
    .replace(/â€¦/g, '...')
    .replace(/â€™/g, "'")
    .replace(/â€œ|â€/g, '"')
    .replace(/\r\n/g, '\n')
    .trim();

const sourceCitationPattern = /\[([A-Za-z0-9]+(?:[_:-][A-Za-z0-9]+){2,})\]/g;

export const prepareMacroMarkdown = (value?: string | null) =>
  cleanMarkdown(value)
    .replace(/\n{3,}/g, '\n\n')
    .replace(/([^\n])\n(#{1,6}\s)/g, '$1\n\n$2')
    .replace(/([^\n])\n((?:[-*+]|\d+\.)\s)/g, '$1\n\n$2')
    .replace(sourceCitationPattern, (_match, sourceKey: string) => `\`${sourceKey}\``)
    .trim();

const cleanTextArray = (value: unknown) => Array.from(new Set(asStringArray(value)));

const compactSentence = (value?: string | null, fallback = '') => {
  const cleaned = cleanMacroText(value);
  if (!cleaned) return fallback;
  const match = cleaned.match(/.+?[.!?](?:\s|$)/);
  return cleanMacroText(match?.[0] ?? cleaned);
};

export const compactJoin = (values: string[], emptyFallback = 'None') => {
  const uniqueValues = Array.from(new Set(values.map((value) => cleanMacroText(value)).filter(Boolean)));
  if (!uniqueValues.length) return emptyFallback;
  if (uniqueValues.length === 1) return uniqueValues[0];
  if (uniqueValues.length === 2) return `${uniqueValues[0]} and ${uniqueValues[1]}`;
  return `${uniqueValues.slice(0, -1).join(', ')}, and ${uniqueValues[uniqueValues.length - 1]}`;
};

export const formatMacroConfidence = (value?: string | null) => {
  switch (cleanMacroText(value).toLowerCase()) {
    case 'high':
      return 'High confidence';
    case 'medium':
      return 'Medium confidence';
    case 'low':
      return 'Low confidence';
    case 'pending':
      return 'Pending';
    default:
      return cleanMacroText(value) || 'Not specified';
  }
};

const mean = (values: Array<number | null | undefined>) => {
  const numbers = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (!numbers.length) return null;
  return Number((numbers.reduce((sum, value) => sum + value, 0) / numbers.length).toFixed(1));
};

const normalizeScoreMetric = (rawMetric: unknown): MacroScoreMetric | null => {
  const metric = asObject(rawMetric);
  const metricKey = cleanMacroText(asString(metric.metric_key));
  if (!metricKey) return null;
  return {
    metric_key: metricKey,
    label: cleanMacroText(asString(metric.label)) || SCORE_LABELS[metricKey] || titleCase(metricKey),
    score: asNumber(metric.score),
    score_label: cleanMacroText(asString(metric.score_label)) || null,
    max_score: asNumber(metric.max_score) ?? undefined,
    average_score: asNumber(metric.average_score),
  };
};

const buildScoreLookup = (
  metrics: MacroScoreMetric[],
  compatScores: JsonObject | undefined,
  confidence?: string | null,
): MacroScoreBundle => {
  const metricScore = (key: string) => {
    const direct = metrics.find((metric) => metric.metric_key === key)?.score;
    if (direct !== undefined) return direct ?? null;
    if (key === 'market_trajectory') return asNumber(compatScores?.market_attractiveness);
    return asNumber(compatScores?.[key]);
  };

  const marketTrajectory = metricScore('market_trajectory');
  const rightToPlay = metricScore('right_to_play');
  const positionSustainability = metricScore('position_sustainability');

  return {
    market_trajectory: marketTrajectory,
    market_attractiveness: marketTrajectory,
    right_to_play: rightToPlay,
    position_sustainability: positionSustainability,
    confidence: cleanMacroText(confidence) || null,
  };
};

const emptyMetrics = (scoreFramework?: MacroBundleContract['score_framework']) =>
  (scoreFramework?.metric_order || SCORE_ORDER).map((metricKey) => ({
    metric_key: metricKey,
    label: SCORE_LABELS[metricKey] || titleCase(metricKey),
    score: null,
    score_label: null,
    max_score: scoreFramework?.scale?.max || 5,
  }));

const normalizeScorecard = (
  rawScorecard: unknown,
  scoreFramework?: MacroBundleContract['score_framework'],
): MacroScorecard => {
  const scorecard = asObject(rawScorecard);
  const rawMetrics = asArray(scorecard.metrics).map(normalizeScoreMetric).filter(Boolean) as MacroScoreMetric[];
  const metrics = rawMetrics.length ? rawMetrics : emptyMetrics(scoreFramework);
  const compatScores = asObject(scorecard.compat_scores);
  const confidence = cleanMacroText(asString(scorecard.confidence)) || null;

  return {
    framework_key:
      cleanMacroText(asString(scorecard.framework_key)) || cleanMacroText(scoreFramework?.framework_key) || undefined,
    source: cleanMacroText(asString(scorecard.source)) || undefined,
    confidence,
    metrics,
    compat_scores: {
      market_attractiveness: asNumber(compatScores.market_attractiveness),
      right_to_play: asNumber(compatScores.right_to_play),
      position_sustainability: asNumber(compatScores.position_sustainability),
    },
    rationale: cleanMacroText(asString(scorecard.rationale)) || null,
    citation_source_keys: cleanTextArray(scorecard.citation_source_keys),
    score_lookup: buildScoreLookup(metrics, compatScores, confidence),
  };
};

const normalizeResearchProgress = (rawProgress: unknown): MacroResearchProgress | undefined => {
  const progress = asObject(rawProgress);
  const planned = asNumber(progress.planned_mission_count);
  const completed = asNumber(progress.completed_mission_count);
  const completedKeys = cleanTextArray(progress.completed_mission_keys);
  const pendingKeys = cleanTextArray(progress.pending_mission_keys);
  if (planned === null && completed === null && !completedKeys.length && !pendingKeys.length) return undefined;

  return {
    planned_mission_count: planned ?? undefined,
    completed_mission_count: completed ?? undefined,
    completed_mission_keys: completedKeys,
    pending_mission_keys: pendingKeys,
  };
};

const normalizeBadge = (rawBadge: unknown) => {
  const badge = asObject(rawBadge);
  const label = cleanMacroText(asString(badge.label));
  if (!label) return undefined;
  return {
    label,
    tone: cleanMacroText(asString(badge.tone)) || undefined,
  };
};

const normalizeSourceRecord = (sourceKey: string, rawSource: unknown): MacroSourceRecord | null => {
  const source = asObject(rawSource);
  const normalizedKey = cleanMacroText(sourceKey || asString(source.source_key));
  if (!normalizedKey) return null;

  const usedBy = asObject(source.used_by);
  const usage: MacroSourceUsage = {
    segments: cleanTextArray(usedBy.segments),
    activities: cleanTextArray(usedBy.activities),
    topics: cleanTextArray(usedBy.topics),
    missions: cleanTextArray(usedBy.missions),
  };

  return {
    source_key: normalizedKey,
    title: cleanMacroText(asString(source.title)) || normalizedKey,
    url: cleanMacroText(asString(source.url)) || null,
    publication_date: cleanMacroText(asString(source.publication_date)) || null,
    source_domain: cleanMacroText(asString(source.source_domain)) || null,
    source_tier: cleanMacroText(asString(source.source_tier)) || null,
    source_quality: asNumber(source.source_quality),
    collection_method: cleanMacroText(asString(source.collection_method)) || null,
    trust_score: asNumber(source.trust_score),
    excerpt_preview: cleanMacroText(asString(source.excerpt_preview)) || null,
    note: cleanMacroText(asString(source.note)) || null,
    used_by:
      usage.segments?.length || usage.activities?.length || usage.topics?.length || usage.missions?.length
        ? usage
        : undefined,
  };
};

const normalizeSourceIndex = (rawSourceIndex: unknown) =>
  Object.entries(asObject(rawSourceIndex)).reduce<Record<string, MacroSourceRecord>>((acc, [key, value]) => {
    const normalized = normalizeSourceRecord(key, value);
    if (normalized) acc[normalized.source_key] = normalized;
    return acc;
  }, {});

const normalizeOverviewSegmentCard = (rawCard: unknown): MacroOverviewSegmentCard | null => {
  const card = asObject(rawCard);
  const segmentKey = cleanMacroText(asString(card.segment_key));
  const title = cleanMacroText(asString(card.title));
  if (!segmentKey || !title) return null;

  return {
    segment_key: segmentKey,
    title,
    availability: cleanMacroText(asString(card.availability)) || undefined,
    coverage_status: cleanMacroText(asString(card.coverage_status)) || undefined,
    short_description: cleanMacroText(asString(card.short_description)) || null,
    status_badge: normalizeBadge(card.status_badge),
    outlook_badge: normalizeBadge(card.outlook_badge),
    recommended_action: cleanMacroText(asString(card.recommended_action)) || null,
    key_risk: cleanMacroText(asString(card.key_risk)) || null,
    key_upside: cleanMacroText(asString(card.key_upside)) || null,
    activity_count: asNumber(card.activity_count) ?? undefined,
    activity_keys: cleanTextArray(card.activity_keys),
    research_progress: normalizeResearchProgress(card.research_progress),
    click_target: cleanMacroText(asString(card.click_target)) || null,
  };
};

const normalizeOverviewView = (rawOverview: unknown): MacroDashboardData['overview_view'] => {
  const overview = asObject(rawOverview);
  return {
    view_key: cleanMacroText(asString(overview.view_key)) || 'overview',
    view_type: cleanMacroText(asString(overview.view_type)) || 'overview',
    title: cleanMacroText(asString(overview.title)) || 'Macro Decision Strip',
    summary: cleanMacroText(asString(overview.summary)) || null,
    portfolio_progress: {
      segments_ready: asNumber(asObject(overview.portfolio_progress).segments_ready) ?? undefined,
      segments_total: asNumber(asObject(overview.portfolio_progress).segments_total) ?? undefined,
      activities_ready: asNumber(asObject(overview.portfolio_progress).activities_ready) ?? undefined,
      activities_total: asNumber(asObject(overview.portfolio_progress).activities_total) ?? undefined,
      missions_completed: asNumber(asObject(overview.portfolio_progress).missions_completed) ?? undefined,
      missions_planned: asNumber(asObject(overview.portfolio_progress).missions_planned) ?? undefined,
    },
    segment_cards: asArray(overview.segment_cards)
      .map(normalizeOverviewSegmentCard)
      .filter(Boolean) as MacroOverviewSegmentCard[],
  };
};

const normalizeSourceMix = (rawMix: unknown) => {
  const sourceMix = asObject(rawMix);
  const tiers = Object.entries(asObject(sourceMix.tiers)).reduce<Record<string, number>>((acc, [key, value]) => {
    const count = asNumber(value);
    if (count !== null) acc[cleanMacroText(key)] = count;
    return acc;
  }, {});
  const domains = asArray(sourceMix.domains)
    .map((entry) => {
      const item = asObject(entry);
      const domain = cleanMacroText(asString(item.domain));
      const count = asNumber(item.count);
      if (!domain || count === null) return null;
      return { domain, count };
    })
    .filter(Boolean) as MacroDomainCount[];

  if (!Object.keys(tiers).length && !domains.length) return undefined;
  return {
    tiers: Object.keys(tiers).length ? tiers : undefined,
    domains,
  };
};

const normalizeEvidencePanel = (rawPanel: unknown): MacroEvidencePanel | undefined => {
  const panel = asObject(rawPanel);
  const topSources = asArray(panel.top_sources)
    .map((rawSource) => {
      const source = asObject(rawSource);
      const sourceKey = cleanMacroText(asString(source.source_key));
      const title = cleanMacroText(asString(source.title));
      if (!sourceKey && !title) return null;
      return {
        source_key: sourceKey || title,
        title: title || sourceKey,
        url: cleanMacroText(asString(source.url)) || null,
        source_domain: cleanMacroText(asString(source.source_domain)) || null,
        source_tier: cleanMacroText(asString(source.source_tier)) || null,
        publication_date: cleanMacroText(asString(source.publication_date)) || null,
        trust_score: asNumber(source.trust_score),
        note: cleanMacroText(asString(source.note)) || null,
      };
    })
    .filter(Boolean);

  const coverageLabels = Object.entries(asObject(panel.coverage_labels)).reduce<Record<string, number>>((acc, [key, value]) => {
    const count = asNumber(value);
    if (count !== null) acc[cleanMacroText(key)] = count;
    return acc;
  }, {});

  const sourceTierBreakdown = Object.entries(asObject(panel.source_tier_breakdown)).reduce<Record<string, number>>(
    (acc, [key, value]) => {
      const count = asNumber(value);
      if (count !== null) acc[cleanMacroText(key)] = count;
      return acc;
    },
    {},
  );

  const topDomains = asArray(panel.top_domains)
    .map((rawDomain) => {
      const item = asObject(rawDomain);
      const domain = cleanMacroText(asString(item.domain));
      const count = asNumber(item.count);
      if (!domain || count === null) return null;
      return { domain, count };
    })
    .filter(Boolean) as MacroDomainCount[];

  const citedSourceKeys = cleanTextArray(panel.cited_source_keys);

  if (
    !citedSourceKeys.length &&
    !topSources.length &&
    asNumber(panel.cited_source_count) === null &&
    asNumber(panel.supporting_source_count) === null &&
    asNumber(panel.mission_count) === null &&
    !Object.keys(coverageLabels).length &&
    !Object.keys(sourceTierBreakdown).length &&
    !topDomains.length
  ) {
    return undefined;
  }

  return {
    cited_source_keys: citedSourceKeys,
    cited_source_count: asNumber(panel.cited_source_count) ?? undefined,
    supporting_source_count: asNumber(panel.supporting_source_count) ?? undefined,
    mission_count: asNumber(panel.mission_count) ?? undefined,
    coverage_labels: Object.keys(coverageLabels).length ? coverageLabels : undefined,
    source_tier_breakdown: Object.keys(sourceTierBreakdown).length ? sourceTierBreakdown : undefined,
    top_domains: topDomains,
    latest_publication_date: cleanMacroText(asString(panel.latest_publication_date)) || null,
    top_sources: topSources,
  };
};

const normalizeWrittenAnalysis = (rawAnalysis: unknown) => {
  const analysis = asObject(rawAnalysis);
  const summary = cleanMacroText(asString(analysis.summary)) || null;
  const confidence = cleanMacroText(asString(analysis.confidence)) || null;
  const keyTakeaways = cleanTextArray(analysis.key_takeaways);
  const watchpoints = cleanTextArray(analysis.watchpoints);
  const markdown = cleanMarkdown(asString(analysis.markdown)) || null;

  if (!summary && !confidence && !keyTakeaways.length && !watchpoints.length && !markdown) return undefined;

  return {
    summary,
    confidence,
    key_takeaways: keyTakeaways,
    watchpoints,
    markdown,
  };
};

const buildSegmentScoreSummary = (
  segmentKey: string,
  activityCards: MacroActivityCard[],
  activityViews: MacroActivityView[],
): MacroScoreSummary => {
  const relatedCards = activityCards.filter((card) => card.activity_key);
  const relatedActivities = activityViews.filter((activity) => activity.segment_key === segmentKey);
  const allScores = relatedCards.map((card) => card.scorecard?.score_lookup).filter(Boolean) as MacroScoreBundle[];
  if (!allScores.length) {
    return {
      available: false,
      metrics: SCORE_ORDER.map((metricKey) => ({
        metric_key: metricKey,
        label: SCORE_LABELS[metricKey] || titleCase(metricKey),
        average_score: null,
      })),
      activity_count: relatedActivities.length || relatedCards.length,
    };
  }

  return {
    available: true,
    activity_count: relatedActivities.length || relatedCards.length,
    metrics: SCORE_ORDER.map((metricKey) => ({
      metric_key: metricKey,
      label: SCORE_LABELS[metricKey] || titleCase(metricKey),
      average_score: mean(allScores.map((score) => score[metricKey as keyof MacroScoreBundle] as number | null)),
    })),
  };
};

const buildSegmentScoreMatrix = (activityCards: MacroActivityCard[]) => ({
  columns: SCORE_ORDER.map((metricKey) => ({
    metric_key: metricKey,
    label: SCORE_LABELS[metricKey] || titleCase(metricKey),
  })),
  rows: activityCards.map((card) => ({
    activity_key: card.activity_key,
    activity_name: card.title,
    scores:
      card.scorecard?.metrics.filter((metric) => SCORE_ORDER.includes(metric.metric_key)) ||
      SCORE_ORDER.map((metricKey) => ({
        metric_key: metricKey,
        label: SCORE_LABELS[metricKey] || titleCase(metricKey),
        score: null,
        score_label: null,
      })),
    confidence: card.scorecard?.confidence || null,
  })),
});

const buildSourceMixFromEvidence = (panel?: MacroEvidencePanel) => {
  if (!panel) return undefined;
  return normalizeSourceMix({
    tiers: panel.source_tier_breakdown,
    domains: panel.top_domains,
  });
};

const normalizeActivityCard = (
  rawCard: unknown,
  scoreFramework?: MacroBundleContract['score_framework'],
): MacroActivityCard | null => {
  const card = asObject(rawCard);
  const activityKey = cleanMacroText(asString(card.activity_key));
  const title = cleanMacroText(asString(card.title));
  if (!activityKey || !title) return null;

  return {
    activity_key: activityKey,
    title,
    availability: cleanMacroText(asString(card.availability)) || undefined,
    coverage_status: cleanMacroText(asString(card.coverage_status)) || undefined,
    summary: cleanMacroText(asString(card.summary)) || null,
    recommended_action: cleanMacroText(asString(card.recommended_action)) || null,
    key_risk: cleanMacroText(asString(card.key_risk)) || null,
    key_upside: cleanMacroText(asString(card.key_upside)) || null,
    scorecard: normalizeScorecard(card.scorecard, scoreFramework),
    click_target: cleanMacroText(asString(card.click_target)) || null,
  };
};

const normalizeSegmentBusinessMap = (rawBusinessMap: unknown): MacroSegmentBusinessMap | undefined => {
  const businessMap = asObject(rawBusinessMap);
  const activities = asArray(businessMap.activities)
    .map((rawActivity) => {
      const activity = asObject(rawActivity);
      const activityKey = cleanMacroText(asString(activity.activity_key));
      const activityName = cleanMacroText(asString(activity.activity_name));
      if (!activityKey || !activityName) return null;
      return {
        activity_key: activityKey,
        activity_name: activityName,
        click_target: cleanMacroText(asString(activity.click_target)) || null,
      };
    })
    .filter(Boolean);

  const products = cleanTextArray(businessMap.products_or_services);
  const summary = cleanMacroText(asString(businessMap.summary)) || null;
  if (!summary && !products.length && !activities.length) return undefined;

  return {
    summary,
    products_or_services: products,
    activities,
  };
};

const normalizeNewSegmentView = (
  rawSegment: unknown,
  scoreFramework: MacroBundleContract['score_framework'] | undefined,
  activityViews: MacroActivityView[],
): MacroSegmentView | null => {
  const segment = asObject(rawSegment);
  const segmentKey = cleanMacroText(asString(segment.segment_key));
  const title = cleanMacroText(asString(segment.title));
  if (!segmentKey || !title) return null;

  const activityCards = asArray(segment.activity_cards)
    .map((card) => normalizeActivityCard(card, scoreFramework))
    .filter(Boolean) as MacroActivityCard[];

  const scoreSummary =
    (() => {
      const rawScoreSummary = asObject(segment.score_summary);
      const metrics = asArray(rawScoreSummary.metrics)
        .map(normalizeScoreMetric)
        .filter(Boolean) as MacroScoreMetric[];
      if (metrics.length || rawScoreSummary.available !== undefined || rawScoreSummary.activity_count !== undefined) {
        return {
          available: typeof rawScoreSummary.available === 'boolean' ? rawScoreSummary.available : metrics.some((metric) => metric.average_score !== null),
          activity_count: asNumber(rawScoreSummary.activity_count) ?? activityCards.length,
          metrics,
        };
      }
      return buildSegmentScoreSummary(segmentKey, activityCards, activityViews);
    })();

  const writtenAnalysis = normalizeWrittenAnalysis(segment.written_analysis);
  const companyAnalysis = normalizeWrittenAnalysis(segment.company_analysis);
  const evidencePanel = normalizeEvidencePanel(segment.evidence_panel);
  const researchProgress = normalizeResearchProgress(segment.research_progress);

  return {
    view_key: cleanMacroText(asString(segment.view_key)) || `segment/${segmentKey}`,
    view_type: cleanMacroText(asString(segment.view_type)) || 'segment',
    segment_key: segmentKey,
    title,
    availability: cleanMacroText(asString(segment.availability)) || undefined,
    coverage_status: cleanMacroText(asString(segment.coverage_status)) || undefined,
    research_progress: researchProgress,
    business_map: normalizeSegmentBusinessMap(segment.business_map),
    decision_summary: {
      recommended_action: cleanMacroText(asString(asObject(segment.decision_summary).recommended_action)) || null,
      key_risk: cleanMacroText(asString(asObject(segment.decision_summary).key_risk)) || null,
      key_upside: cleanMacroText(asString(asObject(segment.decision_summary).key_upside)) || null,
      short_description: cleanMacroText(asString(asObject(segment.decision_summary).short_description)) || null,
      why_now: cleanMacroText(asString(asObject(segment.decision_summary).why_now)) || null,
      status_badge: normalizeBadge(asObject(segment.decision_summary).status_badge),
      outlook_badge: normalizeBadge(asObject(segment.decision_summary).outlook_badge),
    },
    score_summary: scoreSummary,
    activity_cards: activityCards,
    written_analysis: writtenAnalysis,
    company_analysis: companyAnalysis,
    visuals: {
      activity_score_matrix:
        (() => {
          const rawMatrix = asObject(asObject(segment.visuals).activity_score_matrix);
          const rows = asArray(rawMatrix.rows)
            .map((rawRow) => {
              const row = asObject(rawRow);
              const activityKey = cleanMacroText(asString(row.activity_key));
              const activityName = cleanMacroText(asString(row.activity_name));
              if (!activityKey || !activityName) return null;
              return {
                activity_key: activityKey,
                activity_name: activityName,
                scores: asArray(row.scores).map(normalizeScoreMetric).filter(Boolean) as MacroScoreMetric[],
                confidence: cleanMacroText(asString(row.confidence)) || null,
              };
            })
            .filter(Boolean);
          if (rows.length) {
            return {
              columns:
                asArray(rawMatrix.columns).map(normalizeScoreMetric).filter(Boolean) as Array<Pick<MacroScoreMetric, 'metric_key' | 'label'>>,
              rows,
            };
          }
          return buildSegmentScoreMatrix(activityCards);
        })(),
      research_progress: {
        planned:
          asNumber(asObject(asObject(segment.visuals).research_progress).planned) ??
          researchProgress?.planned_mission_count,
        completed:
          asNumber(asObject(asObject(segment.visuals).research_progress).completed) ??
          researchProgress?.completed_mission_count,
      },
      source_mix: normalizeSourceMix(asObject(segment.visuals).source_mix) || buildSourceMixFromEvidence(evidencePanel),
    },
    evidence_panel: evidencePanel,
    artifact_refs: asObject(segment.artifact_refs),
  };
};

const normalizeSupportingTopic = (rawTopic: unknown): MacroSupportingTopic | null => {
  const topic = asObject(rawTopic);
  const missionKey = cleanMacroText(asString(topic.mission_key));
  const topicKey = cleanMacroText(asString(topic.topic_key));
  const topicName = cleanMacroText(asString(topic.topic_name));
  if (!missionKey && !topicKey && !topicName) return null;

  return {
    mission_key: missionKey || undefined,
    topic_key: topicKey || undefined,
    topic_name: topicName || undefined,
    mission_name: cleanMacroText(asString(topic.mission_name)) || undefined,
    coverage_label: cleanMacroText(asString(topic.coverage_label)) || undefined,
    confidence: cleanMacroText(asString(topic.confidence)) || null,
    question: cleanMacroText(asString(topic.question)) || null,
    trusted_interpretation: cleanMacroText(asString(topic.trusted_interpretation)) || null,
    what_sources_say: cleanTextArray(topic.what_sources_say),
    linked_activity_keys: cleanTextArray(topic.linked_activity_keys),
  };
};

const normalizeNewActivityView = (
  rawActivity: unknown,
  scoreFramework: MacroBundleContract['score_framework'] | undefined,
): MacroActivityView | null => {
  const activity = asObject(rawActivity);
  const activityKey = cleanMacroText(asString(activity.activity_key));
  const segmentKey = cleanMacroText(asString(activity.segment_key));
  const title = cleanMacroText(asString(activity.title));
  if (!activityKey || !segmentKey || !title) return null;

  const scorecard = normalizeScorecard(activity.scorecard, scoreFramework);
  const researchProgress = normalizeResearchProgress(activity.research_progress);
  const evidencePanel = normalizeEvidencePanel(activity.evidence_panel);
  const writtenAnalysis = normalizeWrittenAnalysis(activity.written_analysis);
  const supportingTopics = asObject(activity.supporting_topics);

  return {
    view_key: cleanMacroText(asString(activity.view_key)) || `activity/${activityKey}`,
    view_type: cleanMacroText(asString(activity.view_type)) || 'activity',
    activity_key: activityKey,
    segment_key: segmentKey,
    title,
    availability: cleanMacroText(asString(activity.availability)) || undefined,
    coverage_status: cleanMacroText(asString(activity.coverage_status)) || undefined,
    research_progress: researchProgress,
    business_map: {
      description: cleanMacroText(asString(asObject(activity.business_map).description)) || null,
      products: cleanTextArray(asObject(activity.business_map).products),
      services: cleanTextArray(asObject(activity.business_map).services),
      end_markets: cleanTextArray(asObject(activity.business_map).end_markets),
      geographies: cleanTextArray(asObject(activity.business_map).geographies),
      business_model_notes: cleanMacroText(asString(asObject(activity.business_map).business_model_notes)) || null,
    },
    decision_guidance: {
      recommended_action: cleanMacroText(asString(asObject(activity.decision_guidance).recommended_action)) || null,
      key_risk: cleanMacroText(asString(asObject(activity.decision_guidance).key_risk)) || null,
      key_upside: cleanMacroText(asString(asObject(activity.decision_guidance).key_upside)) || null,
      why_now: cleanMacroText(asString(asObject(activity.decision_guidance).why_now)) || null,
    },
    scorecard,
    written_analysis: writtenAnalysis,
    supporting_topics: {
      completed: asArray(supportingTopics.completed).map(normalizeSupportingTopic).filter(Boolean) as MacroSupportingTopic[],
      pending: asArray(supportingTopics.pending).map(normalizeSupportingTopic).filter(Boolean) as MacroSupportingTopic[],
    },
    visuals: {
      score_bars: (() => {
        const scoreBars = asArray(asObject(activity.visuals).score_bars)
          .map(normalizeScoreMetric)
          .filter(Boolean) as MacroScoreMetric[];
        return scoreBars.length ? scoreBars : scorecard.metrics;
      })(),
      topic_coverage: {
        completed:
          asNumber(asObject(asObject(activity.visuals).topic_coverage).completed) ??
          asArray(supportingTopics.completed).length,
        pending:
          asNumber(asObject(asObject(activity.visuals).topic_coverage).pending) ??
          asArray(supportingTopics.pending).length,
      },
      source_mix: normalizeSourceMix(asObject(activity.visuals).source_mix) || buildSourceMixFromEvidence(evidencePanel),
    },
    evidence_panel: evidencePanel,
    artifact_refs: asObject(activity.artifact_refs),
  };
};

const normalizeNavigationNode = (rawNode: unknown): MacroNavigationNode | null => {
  const node = asObject(rawNode);
  const nodeKey = cleanMacroText(asString(node.node_key));
  const label = cleanMacroText(asString(node.label));
  if (!nodeKey || !label) return null;
  return {
    node_key: nodeKey,
    label,
    node_type: cleanMacroText(asString(node.node_type)) || 'group',
    status: cleanMacroText(asString(node.status)) || undefined,
    children: asArray(node.children).map(normalizeNavigationNode).filter(Boolean) as MacroNavigationNode[],
  };
};

const buildNavigationTree = (
  overviewViewKey: string,
  segmentViews: MacroSegmentView[],
  activityViews: MacroActivityView[],
) => [
  {
    node_key: overviewViewKey,
    label: 'Overview',
    node_type: 'overview',
    children: [],
  },
  {
    node_key: 'segments',
    label: 'Business Segments',
    node_type: 'group',
    children: segmentViews.map((segment) => ({
      node_key: segment.view_key,
      label: segment.title,
      node_type: 'segment',
      status: segment.availability || segment.coverage_status || undefined,
      children: activityViews
        .filter((activity) => activity.segment_key === segment.segment_key)
        .map((activity) => ({
          node_key: activity.view_key,
          label: activity.title,
          node_type: 'activity',
          status: activity.availability || activity.coverage_status || undefined,
          children: [],
        })),
    })),
  },
];

const deriveReadingRoute = (segmentViews: MacroSegmentView[], activityViews: MacroActivityView[], defaultRoute: string) => {
  const readableSegment =
    segmentViews.find(
      (segment) =>
        cleanMacroText(segment.availability).toLowerCase() === 'ready' &&
        (segment.written_analysis?.markdown || segment.written_analysis?.summary),
    ) || segmentViews.find((segment) => segment.written_analysis?.markdown || segment.written_analysis?.summary);
  if (readableSegment) return readableSegment.view_key;

  const readableActivity =
    activityViews.find(
      (activity) =>
        cleanMacroText(activity.availability).toLowerCase() === 'ready' &&
        (activity.written_analysis?.markdown || activity.written_analysis?.summary),
    ) || activityViews.find((activity) => activity.written_analysis?.markdown || activity.written_analysis?.summary);
  return readableActivity?.view_key || defaultRoute;
};

const normalizeMeta = (rawMeta: unknown): MacroMeta => {
  const meta = asObject(rawMeta);
  return {
    run_id: cleanMacroText(asString(meta.run_id)) || undefined,
    company_name: cleanMacroText(asString(meta.company_name)) || 'Company',
    ticker: cleanMacroText(asString(meta.ticker)) || undefined,
    bundle_version: cleanMacroText(asString(meta.bundle_version)) || undefined,
    generated_on: cleanMacroText(asString(meta.generated_on)) || undefined,
    analysis_as_of: cleanMacroText(asString(meta.analysis_as_of)) || undefined,
    source_run_status: cleanMacroText(asString(meta.source_run_status)) || undefined,
    presentation_version: cleanMacroText(asString(meta.presentation_version)) || undefined,
  };
};

const normalizeBundleContract = (rawContract: unknown, overviewViewKey: string): MacroBundleContract => {
  const contract = asObject(rawContract);
  const scale = asObject(asObject(contract.score_framework).scale);
  return {
    default_route: cleanMacroText(asString(contract.default_route)) || overviewViewKey,
    supported_views: cleanTextArray(contract.supported_views),
    score_framework: {
      framework_key: cleanMacroText(asString(asObject(contract.score_framework).framework_key)) || undefined,
      metric_order: cleanTextArray(asObject(contract.score_framework).metric_order),
      scale: {
        min: asNumber(scale.min) ?? 1,
        max: asNumber(scale.max) ?? 5,
      },
      labels: asObject(asObject(contract.score_framework).labels) as Record<string, Record<string, string>>,
      score_source_priority: cleanTextArray(asObject(contract.score_framework).score_source_priority),
      notes: cleanTextArray(asObject(contract.score_framework).notes),
    },
  };
};

const normalizeNewPayload = (payload: NewMacroPayload): MacroDashboardData => {
  const meta = normalizeMeta(payload.meta);
  const overviewView = normalizeOverviewView(payload.overview_view);
  const bundleContract = normalizeBundleContract(payload.bundle_contract, overviewView.view_key);
  const scoreFramework = bundleContract.score_framework;
  const activityViews = ensureArray(payload.activity_views)
    .map((activity) => normalizeNewActivityView(activity, scoreFramework))
    .filter(Boolean) as MacroActivityView[];
  const segmentViews = ensureArray(payload.segment_views)
    .map((segment) => normalizeNewSegmentView(segment, scoreFramework, activityViews))
    .filter(Boolean) as MacroSegmentView[];
  const sourceIndex = normalizeSourceIndex(payload.source_index);
  const navigationTree =
    ensureArray(payload.navigation_tree).map(normalizeNavigationNode).filter(Boolean) as MacroNavigationNode[];

  const normalizedOverview = {
    ...overviewView,
    segment_cards:
      overviewView.segment_cards.length ||
      segmentViews.length
        ? overviewView.segment_cards.length
          ? overviewView.segment_cards
          : segmentViews.map((segment) => ({
              segment_key: segment.segment_key,
              title: segment.title,
              availability: segment.availability,
              coverage_status: segment.coverage_status,
              short_description: segment.decision_summary?.short_description || segment.written_analysis?.summary || null,
              status_badge: segment.decision_summary?.status_badge,
              outlook_badge: segment.decision_summary?.outlook_badge,
              recommended_action: segment.decision_summary?.recommended_action || null,
              key_risk: segment.decision_summary?.key_risk || null,
              key_upside: segment.decision_summary?.key_upside || null,
              activity_count: segment.activity_cards?.length || activityViews.filter((item) => item.segment_key === segment.segment_key).length,
              activity_keys:
                segment.activity_cards?.map((item) => item.activity_key) ||
                activityViews.filter((item) => item.segment_key === segment.segment_key).map((item) => item.activity_key),
              research_progress: segment.research_progress,
              click_target: segment.view_key,
            }))
        : [],
  };

  const defaultRoute = bundleContract.default_route || normalizedOverview.view_key;

  return {
    flavor: 'new',
    meta,
    bundle_contract: bundleContract,
    default_route: defaultRoute,
    reading_route: deriveReadingRoute(segmentViews, activityViews, defaultRoute),
    recommended_user_flow: DEFAULT_MACRO_FLOW,
    overview_view: {
      ...normalizedOverview,
      portfolio_progress: {
        segments_ready:
          normalizedOverview.portfolio_progress?.segments_ready ??
          normalizedOverview.segment_cards.filter((card) => cleanMacroText(card.availability).toLowerCase() === 'ready').length,
        segments_total: normalizedOverview.portfolio_progress?.segments_total ?? normalizedOverview.segment_cards.length,
        activities_ready:
          normalizedOverview.portfolio_progress?.activities_ready ??
          activityViews.filter((activity) => cleanMacroText(activity.availability).toLowerCase() === 'ready').length,
        activities_total: normalizedOverview.portfolio_progress?.activities_total ?? activityViews.length,
        missions_completed: normalizedOverview.portfolio_progress?.missions_completed,
        missions_planned: normalizedOverview.portfolio_progress?.missions_planned,
      },
    },
    segment_views: segmentViews,
    activity_views: activityViews,
    navigation_tree:
      navigationTree.length ? navigationTree : buildNavigationTree(normalizedOverview.view_key, segmentViews, activityViews),
    source_index: Object.keys(sourceIndex).length ? sourceIndex : undefined,
    portfolio_analysis: normalizeWrittenAnalysis((payload as JsonObject).portfolio_analysis),
    executive_analysis: normalizeWrittenAnalysis((payload as JsonObject).executive_analysis),
  };
};

const legacyScorecardFromScores = (rawScores: JsonObject): MacroScorecard => {
  const market = asNumber(rawScores.market_attractiveness);
  const rightToPlay = asNumber(rawScores.right_to_play);
  const sustainability = asNumber(rawScores.position_sustainability);
  const confidence = cleanMacroText(asString(rawScores.confidence)) || null;
  const metrics = [
    {
      metric_key: 'market_trajectory',
      label: SCORE_LABELS.market_trajectory,
      score: market,
      score_label: null,
      max_score: 5,
    },
    {
      metric_key: 'right_to_play',
      label: SCORE_LABELS.right_to_play,
      score: rightToPlay,
      score_label: null,
      max_score: 5,
    },
    {
      metric_key: 'position_sustainability',
      label: SCORE_LABELS.position_sustainability,
      score: sustainability,
      score_label: null,
      max_score: 5,
    },
  ];

  return {
    framework_key: 'legacy_macro_score_bundle',
    source: 'legacy_bundle',
    confidence,
    metrics,
    compat_scores: {
      market_attractiveness: market,
      right_to_play: rightToPlay,
      position_sustainability: sustainability,
    },
    rationale: null,
    citation_source_keys: [],
    score_lookup: {
      market_trajectory: market,
      market_attractiveness: market,
      right_to_play: rightToPlay,
      position_sustainability: sustainability,
      confidence,
    },
  };
};

const collectLegacyEvidenceKeys = (evidence: JsonObject) => cleanTextArray(evidence.citations);

const topSourcesFromKeys = (keys: string[], sourceIndex: Record<string, MacroSourceRecord>) =>
  keys
    .map((key) => sourceIndex[key])
    .filter(Boolean)
    .slice(0, 8)
    .map((source) => ({
      source_key: source.source_key,
      title: source.title,
      url: source.url,
      source_domain: source.source_domain,
      source_tier: source.source_tier,
      publication_date: source.publication_date,
      trust_score: source.trust_score,
      note: source.note,
    }));

const normalizeLegacyActivityView = (
  rawActivity: unknown,
  sourceIndex: Record<string, MacroSourceRecord>,
): MacroActivityView | null => {
  const activity = asObject(rawActivity);
  const activityKey = cleanMacroText(asString(activity.activity_key));
  const segmentKey = cleanMacroText(asString(activity.parent_segment_key));
  const title = cleanMacroText(asString(activity.title));
  if (!activityKey || !segmentKey || !title) return null;

  const modules = asObject(activity.modules);
  const businessFootprint = asObject(modules.business_footprint);
  const marketClock = asObject(modules.market_clock);
  const defensibility = asObject(modules.defensibility_test);
  const scenarioBox = asObject(modules.scenario_box);
  const evidence = asObject(modules.evidence_quality);
  const citationKeys = collectLegacyEvidenceKeys(evidence);
  const scorecard = legacyScorecardFromScores(asObject(activity.scores));
  const watchpoints = Array.from(
    new Set([
      ...cleanTextArray(scenarioBox.leading_indicators),
      ...cleanTextArray(scenarioBox.triggers),
      ...cleanTextArray(scenarioBox.what_changes_the_judgment),
    ]),
  );

  return {
    view_key: cleanMacroText(asString(activity.view_key)) || `activity/${activityKey}`,
    view_type: cleanMacroText(asString(activity.view_type)) || 'activity',
    activity_key: activityKey,
    segment_key: segmentKey,
    title,
    availability: 'ready',
    coverage_status: cleanMacroText(asString(scorecard.confidence)).toLowerCase() === 'low' ? 'partial' : 'ready',
    business_map: {
      description:
        cleanMacroText(asString(asObject(modules.activity_snapshot).summary)) ||
        cleanMacroText(asString(activity.short_description)) ||
        null,
      products: cleanTextArray(businessFootprint.products_services),
      services: [],
      end_markets: cleanTextArray(businessFootprint.end_markets),
      geographies: cleanTextArray(businessFootprint.key_geographies),
      business_model_notes: cleanMacroText(asString(businessFootprint.value_chain_position)) || null,
    },
    decision_guidance: {
      recommended_action:
        compactSentence(asString(defensibility.summary)) ||
        compactSentence(asString(marketClock.summary)) ||
        'Use this activity as a diagnostic workspace.',
      key_risk:
        compactSentence(asString(asArray(defensibility.failure_modes)[0])) ||
        compactSentence(asString(scenarioBox.bear_case)) ||
        'Key downside is still being clarified.',
      key_upside:
        compactSentence(asString(asArray(defensibility.must_be_true)[0])) ||
        compactSentence(asString(scenarioBox.bull_case)) ||
        'Key upside is still being clarified.',
      why_now:
        compactSentence(asString(asObject(modules.activity_snapshot).why_it_matters)) ||
        compactSentence(asString(marketClock.summary)) ||
        null,
    },
    scorecard,
    written_analysis: {
      summary:
        cleanMacroText(asString(asObject(modules.activity_snapshot).why_it_matters)) ||
        cleanMacroText(asString(defensibility.summary)) ||
        cleanMacroText(asString(marketClock.summary)) ||
        null,
      confidence: scorecard.confidence,
      key_takeaways: cleanTextArray(asObject(modules.what_matters_now).points),
      watchpoints,
      markdown: null,
    },
    supporting_topics: {
      completed: [],
      pending: [],
    },
    visuals: {
      score_bars: scorecard.metrics,
      topic_coverage: {
        completed: 0,
        pending: 0,
      },
      source_mix: normalizeSourceMix({
        tiers: Object.fromEntries(cleanTextArray(evidence.source_tiers).map((tier) => [tier, 1])),
      }),
    },
    evidence_panel: {
      cited_source_keys: citationKeys,
      cited_source_count: asNumber(evidence.citation_count) ?? citationKeys.length,
      supporting_source_count: undefined,
      mission_count: undefined,
      top_sources: topSourcesFromKeys(citationKeys, sourceIndex),
    },
    artifact_refs: {},
  };
};

const mergeTierBreakdown = (activities: MacroActivityView[]) =>
  activities.reduce<Record<string, number>>((acc, activity) => {
    Object.entries(activity.evidence_panel?.source_tier_breakdown || {}).forEach(([key, value]) => {
      acc[key] = (acc[key] || 0) + value;
    });
    return acc;
  }, {});

const normalizeLegacySegmentView = (
  rawSegment: unknown,
  relatedActivities: MacroActivityView[],
): MacroSegmentView | null => {
  const segment = asObject(rawSegment);
  const segmentKey = cleanMacroText(asString(segment.segment_key));
  const title = cleanMacroText(asString(segment.title));
  if (!segmentKey || !title) return null;

  const businessMap = asObject(segment.business_map);
  const segmentSummary = asObject(segment.segment_summary);
  const segmentJudgment = asObject(segment.segment_judgment);
  const subactivityCards = asArray(segment.subactivity_cards);
  const activityCards = subactivityCards
    .map((rawCard) => {
      const card = asObject(rawCard);
      const activityKey = cleanMacroText(asString(card.activity_key));
      const activityTitle = cleanMacroText(asString(card.title));
      if (!activityKey || !activityTitle) return null;
      return {
        activity_key: activityKey,
        title: activityTitle,
        availability: 'ready',
        coverage_status: 'ready',
        summary:
          cleanMacroText(asString(card.compact_summary)) ||
          cleanMacroText(asString(card.short_description)) ||
          null,
        recommended_action: null,
        key_risk: null,
        key_upside: null,
        scorecard: legacyScorecardFromScores(asObject(card.scores)),
        click_target: cleanMacroText(asString(card.click_target)) || null,
      };
    })
    .filter(Boolean) as MacroActivityCard[];

  const scoreSummary = buildSegmentScoreSummary(segmentKey, activityCards, relatedActivities);

  return {
    view_key: cleanMacroText(asString(segment.view_key)) || `segment/${segmentKey}`,
    view_type: cleanMacroText(asString(segment.view_type)) || 'segment',
    segment_key: segmentKey,
    title,
    availability: 'ready',
    coverage_status: 'ready',
    business_map: {
      summary: cleanMacroText(asString(segment.short_description)) || null,
      products_or_services: (() => {
        const directProducts = cleanTextArray(businessMap.products);
        return directProducts.length
          ? directProducts
          : cleanTextArray(asObject(asObject(segment.modules).business_map).products_services);
      })(),
      activities:
        activityCards.map((card) => ({
          activity_key: card.activity_key,
          activity_name: card.title,
          click_target: card.click_target,
        })),
    },
    decision_summary: {
      recommended_action:
        compactSentence(asString(segmentJudgment.summary)) || 'Use this segment as a comparison layer.',
      key_risk:
        compactSentence(asString(asArray(asObject(asObject(segment.modules).what_matters_now).points)[0])) ||
        'Key downside is still being clarified.',
      key_upside:
        compactSentence(asString(segmentSummary.why_it_matters)) || 'Key upside is still being clarified.',
      short_description: cleanMacroText(asString(segmentSummary.one_liner)) || cleanMacroText(asString(segment.short_description)) || null,
      why_now: cleanMacroText(asString(segmentSummary.why_it_matters)) || null,
      status_badge: {
        label: cleanMacroText(asString(segmentJudgment.transition_risk_level)) ? 'Transitioning' : 'Active',
        tone: cleanMacroText(asString(segmentJudgment.transition_risk_level)).toLowerCase() === 'high' ? 'warning' : 'neutral',
      },
      outlook_badge: {
        label: scoreSummary.available ? 'Comparable' : 'Partial',
        tone: scoreSummary.available ? 'positive' : 'warning',
      },
    },
    score_summary: scoreSummary,
    activity_cards: activityCards,
    written_analysis: {
      summary:
        cleanMacroText(asString(segmentSummary.one_liner)) ||
        cleanMacroText(asString(segment.short_description)) ||
        null,
      confidence: null,
      key_takeaways: cleanTextArray(asObject(asObject(segment.modules).what_matters_now).points),
      watchpoints: [],
      markdown: null,
    },
    visuals: {
      activity_score_matrix: buildSegmentScoreMatrix(activityCards),
      source_mix: normalizeSourceMix({
        tiers: mergeTierBreakdown(relatedActivities),
      }),
    },
    evidence_panel: {
      cited_source_keys: Array.from(
        new Set(relatedActivities.flatMap((activity) => activity.evidence_panel?.cited_source_keys || [])),
      ),
      cited_source_count: Array.from(
        new Set(relatedActivities.flatMap((activity) => activity.evidence_panel?.cited_source_keys || [])),
      ).length,
      supporting_source_count: undefined,
      mission_count: undefined,
      top_sources: Array.from(
        new Map(
          relatedActivities
            .flatMap((activity) => activity.evidence_panel?.top_sources || [])
            .map((source) => [source.source_key, source]),
        ).values(),
      ).slice(0, 8),
    },
    artifact_refs: {},
  };
};

const normalizeLegacyPayload = (payload: LegacyMacroPayload): MacroDashboardData => {
  const meta = normalizeMeta(payload.meta);
  const sourceIndex = normalizeSourceIndex(payload.source_index);
  const activityViews = ensureArray(payload.activity_views)
    .map((activity) => normalizeLegacyActivityView(activity, sourceIndex))
    .filter(Boolean) as MacroActivityView[];
  const segmentViews = ensureArray(payload.segment_views)
    .map((segment) => {
      const segmentKey = cleanMacroText(asString(asObject(segment).segment_key));
      const relatedActivities = activityViews.filter((activity) => activity.segment_key === segmentKey);
      return normalizeLegacySegmentView(segment, relatedActivities);
    })
    .filter(Boolean) as MacroSegmentView[];

  const overview = asObject(payload.overview_view);
  const overviewViewKey = cleanMacroText(asString(overview.view_key)) || cleanMacroText(payload.default_route) || 'overview';
  const overviewView = {
    view_key: overviewViewKey,
    view_type: cleanMacroText(asString(overview.view_type)) || 'overview',
    title: cleanMacroText(asString(overview.title)) || `${meta.company_name} Macro Dashboard`,
    summary:
      cleanMacroText(asString(overview.summary)) ||
      `Legacy macro bundle loaded with ${segmentViews.length} segments and ${activityViews.length} activities.`,
    portfolio_progress: {
      segments_ready: segmentViews.length,
      segments_total: segmentViews.length,
      activities_ready: activityViews.length,
      activities_total: activityViews.length,
    },
    segment_cards: segmentViews.map((segment) => ({
      segment_key: segment.segment_key,
      title: segment.title,
      availability: segment.availability,
      coverage_status: segment.coverage_status,
      short_description: segment.decision_summary?.short_description || segment.written_analysis?.summary || null,
      status_badge: segment.decision_summary?.status_badge,
      outlook_badge: segment.decision_summary?.outlook_badge,
      recommended_action: segment.decision_summary?.recommended_action || null,
      key_risk: segment.decision_summary?.key_risk || null,
      key_upside: segment.decision_summary?.key_upside || null,
      activity_count: segment.activity_cards?.length || 0,
      activity_keys: segment.activity_cards?.map((item) => item.activity_key) || [],
      click_target: segment.view_key,
    })),
  };

  const defaultRoute = cleanMacroText(payload.default_route) || overviewView.view_key;

  return {
    flavor: 'legacy',
    meta,
    bundle_contract: {
      default_route: defaultRoute,
      supported_views: ['overview', 'segment', 'activity'],
      score_framework: {
        framework_key: 'legacy_macro_score_bundle',
        metric_order: SCORE_ORDER,
        scale: { min: 1, max: 5 },
      },
    },
    default_route: defaultRoute,
    reading_route: deriveReadingRoute(segmentViews, activityViews, defaultRoute),
    recommended_user_flow:
      (() => {
        const flow = ensureArray(payload.recommended_user_flow).map((value) => cleanMacroText(value)).filter(Boolean);
        return flow.length ? flow : DEFAULT_MACRO_FLOW;
      })(),
    overview_view: overviewView,
    segment_views: segmentViews,
    activity_views: activityViews,
    navigation_tree: (() => {
      const navigationTree = ensureArray(payload.navigation_tree).map(normalizeNavigationNode).filter(Boolean) as MacroNavigationNode[];
      return navigationTree.length
        ? navigationTree
        : buildNavigationTree(overviewView.view_key, segmentViews, activityViews);
    })(),
    source_index: Object.keys(sourceIndex).length ? sourceIndex : undefined,
  };
};

const isNormalizedMacroPayload = (json: unknown): json is MacroDashboardData => {
  const payload = asObject(json);
  return Boolean(
    cleanMacroText(asString(payload.flavor)) &&
      cleanMacroText(asString(asObject(payload.meta).company_name)) &&
      Array.isArray(payload.segment_views) &&
      Array.isArray(payload.activity_views),
  );
};

const isNewMacroPayload = (json: unknown): json is NewMacroPayload => {
  const payload = asObject(json);
  return Boolean(
    cleanMacroText(asString(asObject(payload.meta).company_name)) &&
      isObject(payload.bundle_contract) &&
      isObject(payload.overview_view) &&
      Array.isArray(payload.segment_views) &&
      Array.isArray(payload.activity_views) &&
      Array.isArray(payload.navigation_tree),
  );
};

const isLegacyMacroPayload = (json: unknown): json is LegacyMacroPayload => {
  const payload = asObject(json);
  return Boolean(
    cleanMacroText(asString(asObject(payload.meta).company_name)) &&
      isObject(payload.overview_view) &&
      Array.isArray(payload.segment_views) &&
      Array.isArray(payload.activity_views) &&
      (isObject(payload.entry_modes) || Array.isArray(payload.theme_views) || isObject(payload.executive_reading_view)),
  );
};

export const isMacroPayload = (json: unknown): boolean =>
  isNormalizedMacroPayload(json) || isNewMacroPayload(json) || isLegacyMacroPayload(json);

export const normalizeMacroPayload = (json: unknown): MacroDashboardData => {
  if (isNormalizedMacroPayload(json)) {
    return json;
  }
  if (isNewMacroPayload(json)) {
    return normalizeNewPayload(json);
  }
  if (isLegacyMacroPayload(json)) {
    return normalizeLegacyPayload(json);
  }
  throw new Error('Unrecognized macro payload');
};

const buildNodeLookup = (nodes: MacroNavigationNode[]) =>
  nodes.reduce<Record<string, MacroNavigationNode>>((acc, node) => {
    acc[node.node_key] = node;
    Object.assign(acc, buildNodeLookup(node.children));
    return acc;
  }, {});

export const getRouteLookup = (data: MacroDashboardData): MacroRouteLookup => ({
  segmentByNodeKey: Object.fromEntries(data.segment_views.map((segment) => [segment.view_key, segment])),
  activityByNodeKey: Object.fromEntries(data.activity_views.map((activity) => [activity.view_key, activity])),
  activityBySegmentKey: data.activity_views.reduce<Record<string, MacroActivityView[]>>((acc, activity) => {
    acc[activity.segment_key] ||= [];
    acc[activity.segment_key].push(activity);
    return acc;
  }, {}),
  segmentNodeKeyBySegmentKey: Object.fromEntries(data.segment_views.map((segment) => [segment.segment_key, segment.view_key])),
  activityNodeKeyByActivityKey: Object.fromEntries(data.activity_views.map((activity) => [activity.activity_key, activity.view_key])),
  nodeByNodeKey: buildNodeLookup(data.navigation_tree),
});

const getCardScore = (segment: MacroSegmentView | undefined, activities: MacroActivityView[], metricKey: keyof MacroScoreBundle) => {
  const summaryMetric = segment?.score_summary?.metrics?.find((metric) => metric.metric_key === metricKey);
  if (summaryMetric?.average_score !== undefined) return summaryMetric.average_score ?? null;
  return mean(activities.map((activity) => activity.scorecard?.score_lookup[metricKey]).filter((v): v is number => typeof v === 'number'));
};

const buildSegmentDecisionModel = (
  card: MacroOverviewSegmentCard,
  segment: MacroSegmentView | undefined,
  activities: MacroActivityView[],
): MacroSegmentDecisionModel => {
  const summary =
    card.short_description ||
    segment?.decision_summary?.short_description ||
    segment?.written_analysis?.summary ||
    'Segment narrative is not yet available.';
  const availability = cleanMacroText(card.availability || segment?.availability).toLowerCase() || 'pending';
  return {
    segmentKey: card.segment_key,
    nodeKey: segment?.view_key || card.click_target || `segment/${card.segment_key}`,
    title: card.title,
    availability: availability || 'pending',
    coverageStatus: cleanMacroText(card.coverage_status || segment?.coverage_status) || 'pending',
    summary,
    recommendedAction:
      card.recommended_action ||
      segment?.decision_summary?.recommended_action ||
      (availability === 'ready' ? 'Open the segment memo and validate the call.' : 'Complete research coverage.'),
    keyRisk:
      card.key_risk ||
      segment?.decision_summary?.key_risk ||
      'The evidence base is still incomplete for a cleaner portfolio comparison.',
    keyUpside:
      card.key_upside ||
      segment?.decision_summary?.key_upside ||
      'More complete synthesis could materially improve decision quality.',
    statusLabel:
      card.status_badge?.label ||
      segment?.decision_summary?.status_badge?.label ||
      (availability === 'ready' ? 'Active' : 'Pending'),
    outlookLabel:
      card.outlook_badge?.label ||
      segment?.decision_summary?.outlook_badge?.label ||
      titleCase(card.coverage_status || segment?.coverage_status || availability),
    activityCount: card.activity_count || segment?.activity_cards?.length || activities.length,
    activityKeys: card.activity_keys?.length ? card.activity_keys : activities.map((activity) => activity.activity_key),
    ready: availability === 'ready',
    marketTrajectory: getCardScore(segment, activities, 'market_trajectory'),
    rightToPlay: getCardScore(segment, activities, 'right_to_play'),
    positionSustainability: getCardScore(segment, activities, 'position_sustainability'),
  };
};

export const buildMacroPortfolioModel = (data: MacroDashboardData): MacroPortfolioModel => {
  const lookup = getRouteLookup(data);
  const baselineCards = data.overview_view.segment_cards.filter(
    (card) => !card.segment_key.startsWith('crow_nest'),
  );
  const segmentDecisions = baselineCards.map((card) =>
    buildSegmentDecisionModel(card, data.segment_views.find((segment) => segment.segment_key === card.segment_key), lookup.activityBySegmentKey[card.segment_key] || []),
  );

  const readySegments = segmentDecisions.filter((segment) => segment.ready);
  const pendingSegments = segmentDecisions.filter((segment) => !segment.ready);
  const companyName = data.meta.company_name;

  let heroThesis = cleanMacroText(data.overview_view.summary);
  if (!heroThesis) {
    if (readySegments.length === 1 && pendingSegments.length) {
      heroThesis = `${companyName} currently has decision-grade macro coverage only for ${readySegments[0].title}; ${compactJoin(
        pendingSegments.map((segment) => segment.title),
      )} remain placeholder or partial coverage until more missions are complete.`;
    } else if (readySegments.length > 1) {
      heroThesis = `${companyName} currently has decision-grade macro coverage across ${readySegments.length} of ${segmentDecisions.length} segments, with the most immediate decisions concentrated in ${compactJoin(
        readySegments.map((segment) => segment.title),
      )}.`;
    } else {
      heroThesis = `${companyName} macro coverage is still being assembled and should be treated as a progress view rather than a complete portfolio judgment.`;
    }
  }

  return {
    companyName,
    heroThesis,
    segmentDecisions,
  };
};

const sortSources = (sources: MacroSourceRecord[]) =>
  sources.slice().sort((left, right) => {
    const tierOrder = (value?: string | null) => {
      const normalized = cleanMacroText(value).toLowerCase();
      if (normalized === 'company' || normalized === 'primary') return 3;
      if (normalized === 'regulator' || normalized === 'statistical' || normalized === 'academic') return 2;
      if (normalized === 'secondary' || normalized === 'seed') return 1;
      return 0;
    };

    return (
      tierOrder(right.source_tier) - tierOrder(left.source_tier) ||
      (right.trust_score || 0) - (left.trust_score || 0) ||
      (right.source_quality || 0) - (left.source_quality || 0)
    );
  });

const mergeSources = (sourceLists: MacroSourceRecord[][]) =>
  sortSources(
    Array.from(
      new Map(
        sourceLists
          .flat()
          .filter(Boolean)
          .map((source) => [cleanMacroText(source.source_key || source.title), source]),
      ).values(),
    ),
  );

const deriveMissionCount = (activities: MacroActivityView[]) => {
  const missionCount = activities.reduce(
    (sum, item) => sum + (item.evidence_panel?.mission_count || 0),
    0,
  );
  return missionCount > 0 ? missionCount : undefined;
};

const resolvePanelSources = (data: MacroDashboardData, panel?: MacroEvidencePanel) => {
  const byKey = Object.values(data.source_index || {}).reduce<Record<string, MacroSourceRecord>>((acc, source) => {
    acc[source.source_key] = source;
    return acc;
  }, {});

  const citedSources = ensureArray(panel?.cited_source_keys).map((key) => byKey[key]).filter(Boolean);
  const topSources = ensureArray(panel?.top_sources)
    .map((source) => byKey[source.source_key] || normalizeSourceRecord(source.source_key, source))
    .filter(Boolean) as MacroSourceRecord[];

  return mergeSources([citedSources, topSources]);
};

const sourcesByUsage = (data: MacroDashboardData, matcher: (usage: MacroSourceUsage | undefined) => boolean) =>
  sortSources(Object.values(data.source_index || {}).filter((source) => matcher(source.used_by)));

const deriveTierBreakdown = (sources: MacroSourceRecord[]) =>
  sources.reduce<Record<string, number>>((acc, source) => {
    const tier = cleanMacroText(source.source_tier) || 'unknown';
    acc[tier] = (acc[tier] || 0) + 1;
    return acc;
  }, {});

const deriveTopDomains = (sources: MacroSourceRecord[]) =>
  Array.from(
    sources.reduce<Map<string, number>>((acc, source) => {
      const domain = cleanMacroText(source.source_domain);
      if (domain) {
        acc.set(domain, (acc.get(domain) || 0) + 1);
      }
      return acc;
    }, new Map()).entries(),
  )
    .map(([domain, count]) => ({ domain, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);

const deriveLatestPublicationDate = (sources: MacroSourceRecord[]) => {
  const datedSources = sources
    .map((source) => ({
      raw: source.publication_date || null,
      parsed: source.publication_date ? Date.parse(source.publication_date) : Number.NaN,
    }))
    .filter((item) => item.raw && !Number.isNaN(item.parsed))
    .sort((left, right) => right.parsed - left.parsed);
  return datedSources[0]?.raw || null;
};

export const getActivityEvidence = (data: MacroDashboardData, activity: MacroActivityView) => {
  const activityPanel = activity.evidence_panel;
  const scorecardSources = ensureArray(activity.scorecard?.citation_source_keys).map(
    (key) => data.source_index?.[key],
  ).filter(Boolean) as MacroSourceRecord[];
  const usageSources = sourcesByUsage(
    data,
    (usage) =>
      ensureArray(usage?.activities).includes(activity.activity_key) ||
      ensureArray(usage?.segments).includes(activity.segment_key),
  );
  const sources = mergeSources([resolvePanelSources(data, activityPanel), scorecardSources, usageSources]);
  const citedSourceKeys =
    activityPanel?.cited_source_keys?.length
      ? activityPanel.cited_source_keys
      : activity.scorecard?.citation_source_keys || [];

  return {
    panel: {
      cited_source_keys: citedSourceKeys,
      cited_source_count:
        activityPanel?.cited_source_count ?? citedSourceKeys.length,
      supporting_source_count: activityPanel?.supporting_source_count ?? sources.length,
      mission_count: activityPanel?.mission_count,
      coverage_labels: activityPanel?.coverage_labels,
      source_tier_breakdown:
        activityPanel?.source_tier_breakdown || (sources.length ? deriveTierBreakdown(sources) : undefined),
      top_domains: activityPanel?.top_domains || deriveTopDomains(sources),
      latest_publication_date: activityPanel?.latest_publication_date || deriveLatestPublicationDate(sources),
      top_sources:
        activityPanel?.top_sources?.length
          ? activityPanel.top_sources
          : sources.slice(0, 8).map((source) => ({
              source_key: source.source_key,
              title: source.title,
              url: source.url,
              source_domain: source.source_domain,
              source_tier: source.source_tier,
              publication_date: source.publication_date,
              trust_score: source.trust_score,
              note: source.note,
            })),
    },
    sources,
  };
};

export const getSegmentEvidence = (data: MacroDashboardData, segment: MacroSegmentView) => {
  const relatedActivities = data.activity_views.filter((activity) => activity.segment_key === segment.segment_key);
  const segmentSources = resolvePanelSources(data, segment.evidence_panel);
  const activitySources = relatedActivities.flatMap((activity) => getActivityEvidence(data, activity).sources);
  const usageSources = sourcesByUsage(
    data,
    (usage) =>
      ensureArray(usage?.segments).includes(segment.segment_key) ||
      relatedActivities.some((activity) => ensureArray(usage?.activities).includes(activity.activity_key)),
  );
  const sources = mergeSources([segmentSources, activitySources, usageSources]);
  const citedSourceKeys = Array.from(
    new Set([
      ...(segment.evidence_panel?.cited_source_keys || []),
      ...relatedActivities.flatMap((activity) => activity.evidence_panel?.cited_source_keys || []),
    ]),
  );

  return {
    panel: {
      cited_source_keys: citedSourceKeys,
      cited_source_count: segment.evidence_panel?.cited_source_count ?? citedSourceKeys.length,
      supporting_source_count:
        segment.evidence_panel?.supporting_source_count ??
        Math.max(
          segment.evidence_panel?.supporting_source_count || 0,
          ...relatedActivities.map((activity) => activity.evidence_panel?.supporting_source_count || 0),
          sources.length,
        ),
      mission_count:
        segment.evidence_panel?.mission_count ??
        deriveMissionCount(relatedActivities),
      coverage_labels: segment.evidence_panel?.coverage_labels,
      source_tier_breakdown:
        segment.evidence_panel?.source_tier_breakdown || (sources.length ? deriveTierBreakdown(sources) : undefined),
      top_domains: segment.evidence_panel?.top_domains || deriveTopDomains(sources),
      latest_publication_date: segment.evidence_panel?.latest_publication_date || deriveLatestPublicationDate(sources),
      top_sources:
        segment.evidence_panel?.top_sources?.length
          ? segment.evidence_panel.top_sources
          : sources.slice(0, 8).map((source) => ({
              source_key: source.source_key,
              title: source.title,
              url: source.url,
              source_domain: source.source_domain,
              source_tier: source.source_tier,
              publication_date: source.publication_date,
              trust_score: source.trust_score,
              note: source.note,
            })),
    },
    sources,
  };
};

export const getSegmentSummary = (segment: MacroSegmentView) =>
  segment.decision_summary?.short_description ||
  segment.written_analysis?.summary ||
  segment.business_map?.summary ||
  'Segment narrative is still being assembled.';

export const getActivitySummary = (activity: MacroActivityView) =>
  activity.written_analysis?.summary ||
  activity.decision_guidance?.why_now ||
  activity.business_map?.description ||
  'Activity narrative is still being assembled.';

export const isReadyNode = (availability?: string | null) => cleanMacroText(availability).toLowerCase() === 'ready';
