/**
 * CrowsNestProjectionView — Stream 4 Level 3 (the substance view).
 *
 * Three blocks (per plan Part 2):
 *   1. Projection card — verdict, claim, resolution, truth-likelihood + chart
 *   2. Driver breakdown table — drivers feeding this projection with sensitivity weights
 *   3. Evidence cards — top-3 expanded by default, rest collapsed
 */
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import { Card, CardContent } from '@/components/ui/card';
import { useForesight } from '@/contexts/ForesightContext';
import {
  CrowsNestProjection,
  CrowsNestEvidenceCard,
  ProjectionProvenance,
  BaselineResearchNote,
  ProjectionForwardCone,
  truthLikelihoodToHex,
  plainTierToBadgeClass,
} from '@/types/crows-nest';
import { TruthLikelihoodChart } from '@/components/crows-nest/TruthLikelihoodChart';
import { ChevronLeft, ChevronDown, ChevronUp, FileText, Target, Pencil, AlertCircle, RotateCcw, BookText } from 'lucide-react';
import { divergenceSeverityBadgeClass } from '@/types/crows-nest';

const PROV_STREAM_LABEL: Record<string, string> = {
  strategic: 'Strategic',
  financial: 'Financial',
  macro: 'Macro',
  convergence: 'Convergence',
};

const PROV_STREAM_TONE: Record<string, string> = {
  strategic: 'border-sky-500/40 bg-sky-500/[0.08] text-sky-700 dark:text-sky-300',
  financial: 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300',
  macro: 'border-amber-500/40 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300',
  convergence: 'border-violet-500/40 bg-violet-500/[0.08] text-violet-700 dark:text-violet-300',
};

// =============================================================================
// Baseline Research Panel — "Why this prior" backstory, evidence-cited
// =============================================================================
const SOURCE_TONE: Record<string, string> = {
  strategic: 'border-sky-500/40 bg-sky-500/[0.08] text-sky-700 dark:text-sky-300',
  financial: 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300',
  macro: 'border-amber-500/40 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300',
  convergence: 'border-violet-500/40 bg-violet-500/[0.08] text-violet-700 dark:text-violet-300',
  external_research: 'border-slate-500/40 bg-slate-500/[0.08] text-slate-700 dark:text-slate-300',
};

const SOURCE_LABEL: Record<string, string> = {
  strategic: 'Strategic',
  financial: 'Financial',
  macro: 'Macro',
  convergence: 'Convergence',
  external_research: 'External',
};

interface BaselineResearchPanelProps {
  projection: CrowsNestProjection;
  note: BaselineResearchNote;
}

const BaselineResearchPanel: React.FC<BaselineResearchPanelProps> = ({ projection, note }) => {
  const priorClass = projection.prior_class === 'currently_observable_persistence'
    ? 'Persistence (Class B)'
    : projection.prior_class === 'forward_looking'
      ? 'Forward-looking event (Class A)'
      : 'Unclassified';
  const priorClassTone = projection.prior_class === 'currently_observable_persistence'
    ? 'border-emerald-500/40 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-300'
    : 'border-sky-500/40 bg-sky-500/[0.06] text-sky-700 dark:text-sky-300';

  const prior = projection.prior ?? projection.current.truth_likelihood;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Baseline research
        </h3>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${priorClassTone}`}>
          {priorClass}
        </span>
        <span className="rounded-full border border-rose-500/40 bg-rose-500/[0.06] px-2 py-0.5 text-[10px] text-rose-700 dark:text-rose-300 tabular-nums">
          prior {Math.round(prior * 100)}%
        </span>
      </div>

      {/* Why this prior */}
      {projection.prior_rationale ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.03] p-4 mb-3">
          <div className="text-[10px] uppercase tracking-wide text-rose-700 dark:text-rose-300 font-semibold mb-1">
            Why this prior
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed font-serif">{projection.prior_rationale}</p>
        </div>
      ) : null}

      {/* Summary paragraph */}
      {note.summary ? (
        <div className="rounded-xl border border-border/40 bg-background/40 p-4 mb-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">
            Backstory
          </div>
          <p className="text-sm text-foreground/85 leading-relaxed font-serif">{note.summary}</p>
        </div>
      ) : null}

      {/* Key evidence */}
      {note.key_evidence && note.key_evidence.length > 0 ? (
        <div className="rounded-xl border border-border/40 bg-background/40 p-4 mb-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">
            Key evidence ({note.key_evidence.length})
          </div>
          <ul className="space-y-2.5">
            {note.key_evidence.map((e, i) => (
              <li key={i} className="text-xs leading-snug">
                <div className="flex items-baseline gap-1.5 mb-0.5 flex-wrap">
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-wide ${SOURCE_TONE[e.source_type] || 'border-border/40 bg-background/60 text-muted-foreground'}`}
                  >
                    {SOURCE_LABEL[e.source_type] || e.source_type}
                  </span>
                  <span className="text-muted-foreground/70 text-[10px] font-mono">{e.ref}</span>
                </div>
                <div className="text-foreground italic">"{e.snippet}"</div>
                {e.implication ? (
                  <div className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                    → {e.implication}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* What would move it */}
      {(note.what_would_move_it_up?.length || note.what_would_move_it_down?.length) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {note.what_would_move_it_up?.length ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-4">
              <div className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300 font-semibold mb-2">
                What would move it up ↑
              </div>
              <ul className="space-y-1.5">
                {note.what_would_move_it_up.map((t, i) => (
                  <li key={i} className="text-xs text-foreground/85 leading-snug list-disc list-inside">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {note.what_would_move_it_down?.length ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-4">
              <div className="text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-300 font-semibold mb-2">
                What would move it down ↓
              </div>
              <ul className="space-y-1.5">
                {note.what_would_move_it_down.map((t, i) => (
                  <li key={i} className="text-xs text-foreground/85 leading-snug list-disc list-inside">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

// =============================================================================
// Forward Projection Panel — central path + alternate scenario narratives
// =============================================================================
interface ForwardProjectionPanelProps {
  projection: CrowsNestProjection;
  forward: ProjectionForwardCone;
}

const ForwardProjectionPanel: React.FC<ForwardProjectionPanelProps> = ({ projection, forward }) => {
  const cp = forward.central_path;
  const alt = forward.alternate_scenario;
  const expected = cp?.expected_tl_at_resolution;

  const directionTone = cp.direction === 'rising'
    ? 'text-emerald-700 dark:text-emerald-300'
    : cp.direction === 'falling'
      ? 'text-rose-700 dark:text-rose-300'
      : cp.direction === 'widening_band'
        ? 'text-amber-700 dark:text-amber-300'
        : 'text-muted-foreground';

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Forward projection
        </h3>
        <span className="text-[10px] text-muted-foreground/70">
          where the analyst expects this to land by {projection.resolution_date}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Central path */}
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.04] p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-wide text-rose-700 dark:text-rose-300 font-semibold">
              Central path
            </div>
            <span className={`text-[10px] uppercase font-medium ${directionTone}`}>
              {cp.direction}
            </span>
          </div>
          <p className="text-sm text-foreground/85 leading-relaxed font-serif mb-3">
            {cp.narrative || '—'}
          </p>
          {expected ? (
            <div className="rounded-lg border border-border/30 bg-background/50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                Expected TL at resolution
              </div>
              <div className="flex items-center gap-2 tabular-nums">
                <span className="text-sm text-foreground/70">
                  low {Math.round(expected.low * 100)}%
                </span>
                <span className="text-base font-semibold text-foreground">
                  · mid {Math.round(expected.mid * 100)}%
                </span>
                <span className="text-sm text-foreground/70">
                  · high {Math.round(expected.high * 100)}%
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Alternate scenario */}
        {alt ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-300 font-semibold">
                Alternate scenario
              </div>
              {typeof alt.tl_at_resolution === 'number' ? (
                <span className="text-[10px] tabular-nums text-amber-700 dark:text-amber-300">
                  TL → {Math.round(alt.tl_at_resolution * 100)}%
                </span>
              ) : null}
            </div>
            {alt.name ? (
              <div className="text-xs font-medium text-foreground mb-1.5">{alt.name}</div>
            ) : null}
            <p className="text-sm text-foreground/85 leading-relaxed font-serif">
              {alt.narrative || '—'}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border/30 bg-muted/10 p-4 flex items-center justify-center text-xs text-muted-foreground italic">
            No alternate scenario recorded.
          </div>
        )}
      </div>
    </div>
  );
};

const ProvenancePanel: React.FC<{ provenance: ProjectionProvenance }> = ({ provenance }) => {
  const conf = provenance.confidence;
  const confTone =
    conf === 'high'
      ? 'border-emerald-500/40 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-300'
      : conf === 'low'
      ? 'border-amber-500/40 bg-amber-500/[0.06] text-amber-700 dark:text-amber-300'
      : 'border-border/40 bg-background/50 text-muted-foreground';

  // Group artefacts by stream
  const byStream: Record<string, typeof provenance.source_artefacts> = {};
  for (const a of provenance.source_artefacts) {
    (byStream[a.stream] = byStream[a.stream] || []).push(a);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Based on
        </h3>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${confTone}`}>
          {conf} confidence
        </span>
        {provenance.source_streams.map((s) => (
          <span
            key={s}
            className={`rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-wide ${PROV_STREAM_TONE[s] || 'border-border/40 bg-background/60 text-muted-foreground'}`}
          >
            {PROV_STREAM_LABEL[s] || s}
          </span>
        ))}
      </div>
      <div className="space-y-3">
        {Object.entries(byStream).map(([stream, arts]) => (
          <div key={stream} className="rounded-xl border border-border/30 bg-background/40 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <BookText className="h-3.5 w-3.5 text-muted-foreground" />
              <span
                className={`rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-wide ${PROV_STREAM_TONE[stream] || 'border-border/40 bg-background/60 text-muted-foreground'}`}
              >
                {PROV_STREAM_LABEL[stream] || stream}
              </span>
              <span className="text-[10px] text-muted-foreground/70">
                {arts.length} artefact{arts.length === 1 ? '' : 's'}
              </span>
            </div>
            <ul className="space-y-2">
              {arts.map((a, i) => (
                <li key={i} className="text-xs leading-snug">
                  <div className="flex items-baseline gap-1.5 mb-0.5">
                    <span className="text-muted-foreground/70 text-[9px] uppercase tracking-wide font-medium">
                      {a.kind}
                    </span>
                    <span className="text-muted-foreground/50 text-[9px]">·</span>
                    <span className="text-muted-foreground font-mono text-[10px]">{a.ref}</span>
                  </div>
                  <div className="font-medium text-foreground">{a.title}</div>
                  <div className="text-muted-foreground italic mt-0.5 text-[11px] leading-relaxed">
                    "{a.snippet}"
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {provenance.notes ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/[0.04] p-3 text-xs text-amber-700 dark:text-amber-300 italic">
            <span className="font-medium not-italic">Note:</span> {provenance.notes}
          </div>
        ) : null}
      </div>
    </div>
  );
};

interface CrowsNestProjectionViewProps {
  projectionId: string;
  onBack: () => void;
  onOpenEditor?: (projectionId: string) => void;
}

const inlineMd = (text: string): React.ReactElement => {
  const components: Components = {
    p: ({ children }) => <span>{children}</span>,
    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
  };
  return <ReactMarkdown components={components}>{text}</ReactMarkdown>;
};

const blockMd = (text: string): React.ReactElement => {
  const components: Components = {
    p: ({ children }) => <p className="text-sm leading-relaxed text-foreground/90 mb-2">{children}</p>,
    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    ul: ({ children }) => <ul className="list-disc list-inside text-sm text-foreground/90 space-y-1 mb-2">{children}</ul>,
    li: ({ children }) => <li>{children}</li>,
  };
  return <ReactMarkdown components={components}>{text}</ReactMarkdown>;
};

interface DriverSummary {
  id: string;
  name?: string;
  category?: string;
  definition?: string;
  indicators?: Array<{ name?: string; source?: string; cadence?: string; threshold_negative?: string; threshold_positive?: string }>;
  current_state?: { score?: number; velocity?: number; headline?: string };
}

const DriverRow: React.FC<{
  driverId: string;
  weight: number;
  direction: 'positive' | 'negative';
  driver?: DriverSummary;
}> = ({ driverId, weight, direction, driver }) => {
  const [expanded, setExpanded] = useState(false);
  const name = driver?.name || driverId;
  const category = driver?.category;
  const definition = driver?.definition;
  const headline = driver?.current_state?.headline;
  const indicators = driver?.indicators || [];
  const score = driver?.current_state?.score ?? 0;
  const scoreTone =
    score > 0.2 ? 'text-emerald-600' : score < -0.2 ? 'text-rose-600' : 'text-muted-foreground';
  const hasDetail = Boolean(definition || headline || indicators.length);

  return (
    <div className="rounded-lg border border-border/30 bg-background/50 overflow-hidden">
      <button
        onClick={() => hasDetail && setExpanded(!expanded)}
        className={`w-full grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 p-3 text-left ${hasDetail ? 'cursor-pointer hover:bg-muted/20' : 'cursor-default'} transition`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm text-foreground font-medium line-clamp-1">{name}</div>
            {category ? (
              <span className="text-[9px] uppercase tracking-wide rounded border border-border/40 bg-muted/40 px-1.5 py-0.5 text-muted-foreground">
                {category}
              </span>
            ) : null}
          </div>
          {headline ? (
            <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{headline}</div>
          ) : (
            <div className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">{driverId}</div>
          )}
        </div>
        <span className={`text-[10px] tabular-nums font-medium ${scoreTone}`}>
          {score >= 0 ? '+' : ''}
          {score.toFixed(1)}
        </span>
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 rounded-full bg-muted/30 overflow-hidden">
            <div className="h-full bg-rose-500/70" style={{ width: `${weight * 100}%` }} aria-hidden="true" />
          </div>
          <span className="text-[10px] tabular-nums text-muted-foreground w-9 text-right">
            {Math.round(weight * 100)}%
          </span>
        </div>
        <span
          className={`text-[10px] uppercase tracking-wide rounded-full border px-2 py-0.5 ${
            direction === 'positive'
              ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-300'
              : 'border-amber-500/40 text-amber-600 dark:text-amber-300'
          }`}
        >
          {direction === 'positive' ? 'supports' : 'against'}
        </span>
      </button>

      {hasDetail && expanded ? (
        <div className="border-t border-border/30 bg-muted/10 p-3 space-y-2">
          {definition ? (
            <p className="text-xs text-foreground/85 leading-relaxed">{definition}</p>
          ) : null}
          {indicators.length > 0 ? (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground/80 font-semibold mb-1">
                Monitored indicators
              </div>
              <ul className="space-y-1">
                {indicators.map((ind, i) => (
                  <li key={i} className="text-[11px] leading-snug">
                    <span className="font-medium text-foreground">{ind.name}</span>
                    {ind.source ? (
                      <span className="text-muted-foreground"> · {ind.source}</span>
                    ) : null}
                    {ind.cadence ? (
                      <span className="text-muted-foreground/70"> · {ind.cadence}</span>
                    ) : null}
                    {ind.threshold_negative ? (
                      <div className="text-amber-700 dark:text-amber-300 italic mt-0.5">
                        Bearish trip: {ind.threshold_negative}
                      </div>
                    ) : null}
                    {ind.threshold_positive ? (
                      <div className="text-emerald-700 dark:text-emerald-300 italic mt-0.5">
                        Bullish trip: {ind.threshold_positive}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="text-[9px] font-mono text-muted-foreground/50 pt-1 border-t border-border/20">
            {driverId}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const EvidenceCardBlock: React.FC<{
  card: CrowsNestEvidenceCard;
  defaultExpanded?: boolean;
}> = ({ card, defaultExpanded = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const sig = card.score?.computed_signal ?? 0;
  const isNegative = sig < 0;
  const colorClass = isNegative
    ? 'border-amber-500/30 bg-amber-500/[0.04]'
    : sig > 0
    ? 'border-emerald-500/30 bg-emerald-500/[0.04]'
    : 'border-border/40 bg-background/50';

  return (
    <div className={`rounded-xl border ${colorClass} p-4`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 text-left"
      >
        <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="text-sm font-medium text-foreground line-clamp-2">{card.headline}</div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
            <span>{card.date_observed}</span>
            <span className="text-muted-foreground/40">·</span>
            <span>{card.primary_driver}</span>
            <span className="text-muted-foreground/40">·</span>
            <span>{card.source.name}</span>
            {sig !== 0 ? (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className={isNegative ? 'text-amber-600' : 'text-emerald-600'}>
                  signal {sig > 0 ? '+' : ''}{sig.toFixed(1)}
                </span>
              </>
            ) : null}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {expanded ? (
        <div className="mt-3 pl-7 space-y-3 border-t border-border/30 pt-3">
          {card.deep_read?.what_actually_happened ? (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
                What happened
              </div>
              {blockMd(card.deep_read.what_actually_happened)}
            </div>
          ) : null}
          {card.deep_read?.why_it_matters_for_driver ? (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
                Why it matters
              </div>
              {blockMd(card.deep_read.why_it_matters_for_driver)}
            </div>
          ) : null}
          {card.deep_read?.adjacency_implications ? (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
                Other things this touches
              </div>
              {blockMd(card.deep_read.adjacency_implications)}
            </div>
          ) : null}
          {card.deep_read?.counterfactual ? (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
                Counterfactual
              </div>
              {blockMd(card.deep_read.counterfactual)}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export const CrowsNestProjectionView: React.FC<CrowsNestProjectionViewProps> = ({
  projectionId,
  onBack,
  onOpenEditor,
}) => {
  const { crowsNestData } = useForesight();
  if (!crowsNestData) return null;

  // Find projection across all dimensions
  let projection: CrowsNestProjection | undefined;
  let parentDimensionName: string | undefined;
  let driverSummaryByIdLocal: Record<string, DriverSummary> = {};
  for (const dim of crowsNestData.dimensions) {
    const found = dim.projections.find((p) => p.id === projectionId);
    if (found) {
      projection = found;
      parentDimensionName = dim.name;
      // Index this dimension's driver_summaries for the Driver section
      for (const ds of dim.driver_summaries || []) {
        driverSummaryByIdLocal[ds.id] = ds as DriverSummary;
      }
      break;
    }
  }
  const driverSummaryById = driverSummaryByIdLocal;

  if (!projection) {
    return (
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04]">
        <CardContent className="p-8">
          <p className="text-sm text-muted-foreground">Projection not found.</p>
          <button onClick={onBack} className="mt-3 text-xs text-rose-500 hover:underline">
            ← Back
          </button>
        </CardContent>
      </Card>
    );
  }

  const tl = projection.current.truth_likelihood;
  const color = truthLikelihoodToHex(tl);
  const tier = projection.current.plain_tier || projection.plain_outcome_phrase;
  const badgeClass = plainTierToBadgeClass(tier);

  // Pull the evidence cards
  const allCards = crowsNestData.evidence_cards || {};
  const cardIds = projection.evidence_card_ids?.length
    ? projection.evidence_card_ids
    : // Fallback: scan all cards by primary_driver match
      Object.values(allCards)
        .filter((c) => projection!.drivers.includes(c.primary_driver))
        .sort((a, b) => (b.date_observed || '').localeCompare(a.date_observed || ''))
        .slice(0, 8)
        .map((c) => c.id);
  const cards = cardIds.map((id) => allCards[id]).filter(Boolean);

  // Sensitivity entries sorted by weight desc
  const sensitivityEntries = Object.entries(projection.sensitivity || {}).sort(
    (a, b) => (b[1].weight ?? 0) - (a[1].weight ?? 0),
  );

  return (
    <div className="space-y-5">
      {/* Back link */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-rose-500 transition"
      >
        <ChevronLeft className="h-3 w-3" />
        back to {parentDimensionName || 'dimension'}
      </button>

      {/* === Block 1: Projection card with chart === */}
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04] shadow-sm">
        <CardContent className="p-6 md:p-8 space-y-5">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-rose-500/10 p-2">
              <Target className="h-5 w-5 text-rose-500" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${badgeClass}`}>
                  {tier}
                </span>
                <span className="text-xs text-muted-foreground">
                  resolves {projection.resolution_date}
                </span>
                {projection.user_assertion ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/[0.08] px-2 py-0.5 text-[10px] text-rose-700 dark:text-rose-300">
                    <Pencil className="h-2.5 w-2.5" />
                    your override
                  </span>
                ) : null}
                {onOpenEditor ? (
                  <button
                    onClick={() => onOpenEditor(projection.id)}
                    className="ml-auto inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-background/60 px-2.5 py-0.5 text-[11px] text-rose-700 dark:text-rose-300 hover:bg-rose-500/[0.08] transition"
                    title="Override or edit this projection"
                  >
                    <Pencil className="h-3 w-3" />
                    {projection.user_assertion ? 'edit override' : 'override'}
                  </button>
                ) : null}
              </div>
              {/* Human title — primary headline */}
              <h2 className="text-xl md:text-2xl font-semibold text-foreground leading-snug">
                {projection.human_title || projection.claim}
              </h2>
              {/* Formal claim — secondary, smaller */}
              {projection.human_title ? (
                <div className="text-sm text-muted-foreground leading-snug font-mono">
                  {projection.claim}
                </div>
              ) : null}
              {/* Plain explainer — tells the reader what's actually being measured + why */}
              {projection.claim_explainer ? (
                <p className="text-sm text-foreground/85 leading-relaxed pt-1">
                  {projection.claim_explainer}
                </p>
              ) : null}
              {/* Plain verdict — analyst-anchored read (replaces templated boilerplate) */}
              <div className="text-base text-foreground leading-relaxed pt-1">
                {projection.plain_verdict || inlineMd(projection.verdict_sentence)}
              </div>
              {/* Plain why — what's driving the read */}
              {projection.plain_why ? (
                <div className="text-sm text-muted-foreground leading-relaxed italic">
                  {projection.plain_why}
                </div>
              ) : null}
              {projection.latest_evidence_summary && !projection.plain_verdict ? (
                <div className="text-sm text-muted-foreground leading-relaxed pt-1">
                  {projection.latest_evidence_summary}
                </div>
              ) : null}
            </div>
            <div className="text-right shrink-0">
              <div
                className="text-3xl font-semibold tabular-nums"
                style={{ color }}
              >
                {Math.round(tl * 100)}%
              </div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                likely to hold
              </div>
            </div>
          </div>

          {/* === Divergence callout — only when system_claim and user_assertion differ === */}
          {projection.divergence ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.06] p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${divergenceSeverityBadgeClass(projection.divergence.severity)}`}>
                      Divergence: {projection.divergence.severity}
                    </span>
                    <span className="text-xs text-foreground">{projection.divergence.summary}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {projection.system_claim ? (
                      <div className="rounded-lg border border-border/40 bg-background/60 p-3">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">System view</div>
                        <div className="text-xs text-foreground leading-snug">{projection.system_claim.claim}</div>
                        {projection.system_claim.rationale ? (
                          <div className="text-[11px] italic text-muted-foreground mt-1.5 leading-relaxed">{projection.system_claim.rationale}</div>
                        ) : null}
                      </div>
                    ) : null}
                    {projection.user_assertion ? (
                      <div className="rounded-lg border border-rose-500/30 bg-rose-500/[0.04] p-3">
                        <div className="text-[10px] uppercase tracking-wide text-rose-700 dark:text-rose-300 font-semibold mb-1">Your assertion</div>
                        <div className="text-xs text-foreground leading-snug">{projection.user_assertion.claim}</div>
                        {projection.user_assertion.rationale ? (
                          <div className="text-[11px] italic text-foreground/80 mt-1.5 leading-relaxed">{projection.user_assertion.rationale}</div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {projection.research_priority === 'elevated' ? (
                    <div className="text-[11px] text-rose-700 dark:text-rose-300 italic pt-1">
                      ↑ This projection has been auto-elevated in the research queue. The next research cycle will run in <strong>confirm_assertion</strong> mode to investigate which view holds up.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {/* The chart */}
          <div className="pt-4 border-t border-rose-500/10">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-2">
              Truth-likelihood over time
            </div>
            <TruthLikelihoodChart projection={projection} />
          </div>
        </CardContent>
      </Card>

      {/* === Baseline research (Tier 6) — why this prior, anchored to evidence === */}
      {projection.baseline_research_note ? (
        <BaselineResearchPanel
          projection={projection}
          note={projection.baseline_research_note}
        />
      ) : null}

      {/* === Forward projection (Tier 6) — central path + alternate scenario === */}
      {projection.forward_projection ? (
        <ForwardProjectionPanel
          projection={projection}
          forward={projection.forward_projection}
        />
      ) : null}

      {/* === Provenance: what is this projection based on? === */}
      {projection.provenance ? <ProvenancePanel provenance={projection.provenance} /> : null}

      {/* === Block 2: Driver breakdown === */}
      {sensitivityEntries.length > 0 ? (
        <div>
          <div className="mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              What's driving this bet
            </h3>
            <p className="mt-1 text-xs text-muted-foreground/80">
              {sensitivityEntries.length} drivers feed this projection. The bar shows how much each one weighs in.
            </p>
          </div>
          <div className="space-y-2">
            {sensitivityEntries.map(([driverId, sens]) => (
              <DriverRow
                key={driverId}
                driverId={driverId}
                weight={sens.weight ?? 0}
                direction={sens.direction || 'negative'}
                driver={driverSummaryById[driverId]}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* === Block 3: Evidence cards === */}
      {cards.length > 0 ? (
        <div>
          <div className="mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              The evidence behind this read
            </h3>
            <p className="mt-1 text-xs text-muted-foreground/80">
              {cards.length} cards sorted by recency. Top 3 expanded; click any to expand its full deep-read.
            </p>
          </div>
          <div className="space-y-3">
            {cards.map((card, idx) => (
              <EvidenceCardBlock key={card.id} card={card} defaultExpanded={idx < 3} />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border/30 bg-muted/10 p-6 text-sm text-muted-foreground">
          No evidence cards on file for this projection yet.
        </div>
      )}
    </div>
  );
};
