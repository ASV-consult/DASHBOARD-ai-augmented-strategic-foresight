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
  truthLikelihoodToHex,
  plainTierToBadgeClass,
} from '@/types/crows-nest';
import { TruthLikelihoodChart } from '@/components/crows-nest/TruthLikelihoodChart';
import { ChevronLeft, ChevronDown, ChevronUp, FileText, Target } from 'lucide-react';

interface CrowsNestProjectionViewProps {
  projectionId: string;
  onBack: () => void;
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

const DriverRow: React.FC<{
  driverId: string;
  weight: number;
  direction: 'positive' | 'negative';
}> = ({ driverId, weight, direction }) => {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg border border-border/30 bg-background/50 p-3">
      <div className="text-xs text-foreground line-clamp-1">{driverId}</div>
      <div className="flex items-center gap-2">
        <div className="w-24 h-1.5 rounded-full bg-muted/30 overflow-hidden">
          <div
            className="h-full bg-rose-500/70"
            style={{ width: `${weight * 100}%` }}
            aria-hidden="true"
          />
        </div>
        <span className="text-[10px] tabular-nums text-muted-foreground w-10 text-right">
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
        {direction === 'positive' ? 'supports bet' : 'against bet'}
      </span>
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
}) => {
  const { crowsNestData } = useForesight();
  if (!crowsNestData) return null;

  // Find projection across all dimensions
  let projection: CrowsNestProjection | undefined;
  let parentDimensionName: string | undefined;
  for (const dim of crowsNestData.dimensions) {
    const found = dim.projections.find((p) => p.id === projectionId);
    if (found) {
      projection = found;
      parentDimensionName = dim.name;
      break;
    }
  }

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
              </div>
              <h2 className="text-xl md:text-2xl font-semibold text-foreground leading-snug">
                {projection.claim}
              </h2>
              {/* The verdict — the loudest plain-language sentence on the page */}
              <div className="text-base text-foreground leading-relaxed">
                {inlineMd(projection.verdict_sentence)}
              </div>
              {projection.latest_evidence_summary ? (
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

          {/* The chart */}
          <div className="pt-4 border-t border-rose-500/10">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-2">
              Truth-likelihood over time
            </div>
            <TruthLikelihoodChart projection={projection} />
          </div>
        </CardContent>
      </Card>

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
