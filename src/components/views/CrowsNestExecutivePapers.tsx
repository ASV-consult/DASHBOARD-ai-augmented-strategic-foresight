/**
 * CrowsNestExecutivePapers — Phase E view.
 *
 * Per-cycle CFO read. The list view shows all cycles in reverse chronological
 * order with a one-line headline. Click a cycle → opens the full paper:
 *   - Cycle headline (group synthesis)
 *   - One section per mover (Status / Implication / Effect / Mitigation)
 *   - Cascade summary
 *   - Next-cycle pivot
 *   - Full markdown memo (renders the polished prose)
 */
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useForesight } from '@/contexts/ForesightContext';
import {
  CrowsNestExecutivePaper,
  ExecutivePaperMover,
} from '@/types/crows-nest';
import {
  ExecutivePaperV2,
  ExecutivePaperV2PerBetAssessment,
  StatusQuoCalendaredGate,
  tierBadgeClass,
  trajectorySymbol,
  v2TruthLikelihood,
  v2Tier,
} from '@/types/crows-nest-v2';
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Minus,
  Info,
  Compass,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Props {
  initialCycle?: string | null;
  onSelectProjection?: (id: string) => void;
}

export const CrowsNestExecutivePapers: React.FC<Props> = ({ initialCycle, onSelectProjection }) => {
  const { crowsNestData, crowsNestV2Data } = useForesight();
  const papersV2 = crowsNestV2Data?.executive_papers_v2 ?? [];

  const papers = (crowsNestData?.executive_papers || []).slice().sort(
    (a, b) => (b.cycle_date || '').localeCompare(a.cycle_date || ''),
  );

  const [selected, setSelected] = useState<string | null>(initialCycle || (papers[0]?.cycle_date ?? null));

  // v2-aware: when the bundle has executive_papers_v2, render them through the
  // existing paper-list / cycle-picker visual idiom (its own state).
  if (papersV2.length > 0) {
    return <ExecutivePapersV2View papers={papersV2} initialCycle={initialCycle} />;
  }

  if (!crowsNestData) {
    return (
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04]">
        <CardContent className="p-8">
          <p className="text-sm text-muted-foreground">No data loaded.</p>
        </CardContent>
      </Card>
    );
  }

  if (papers.length === 0) {
    return (
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04]">
        <CardContent className="p-8 space-y-3">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-rose-500/10 p-2">
              <FileText className="h-5 w-5 text-rose-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Executive Paper — none yet</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                Each monthly cycle produces a paper covering bets that moved {'>='}3pp + macro themes that
                shifted. Run the cycle pipeline + executive paper deriver, then regenerate the bundle:
              </p>
              <div className="mt-3 rounded-xl border border-border/40 bg-background/60 p-3 space-y-1">
                <p className="text-xs font-mono text-muted-foreground">
                  python crows_nest_v2/derivers/executive_paper/build_executive_paper.py --company umicore --cycle 2026-05-31 prep
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  # spawn agents on each mover prompt → write outputs back
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  python ... build_executive_paper.py --company umicore --cycle 2026-05-31 group
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  python ... build_executive_paper.py --company umicore --cycle 2026-05-31 apply
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const current = papers.find((p) => p.cycle_date === selected) || papers[0];
  const idx = papers.findIndex((p) => p.cycle_date === current.cycle_date);

  return (
    <div className="space-y-5">
      {/* Cycle index strip */}
      <Card className="rounded-2xl border-border/40">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Cycles:</span>
            {papers.map((p) => (
              <button
                key={p.cycle_date}
                onClick={() => setSelected(p.cycle_date)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  p.cycle_date === current.cycle_date
                    ? 'border-rose-500/50 bg-rose-500/[0.10] text-rose-700 dark:text-rose-300 font-medium'
                    : 'border-border/40 bg-background/60 text-muted-foreground hover:border-rose-500/30'
                }`}
              >
                <Calendar className="inline h-3 w-3 mr-1" />
                {p.cycle_date}
                <span className="ml-1.5 text-[10px] text-muted-foreground/70">
                  ({p.n_movers} mover{p.n_movers === 1 ? '' : 's'})
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Paper view */}
      <PaperView paper={current} onSelectProjection={onSelectProjection} />

      {/* Prev / next cycle nav */}
      <div className="flex items-center justify-between">
        <button
          disabled={idx === papers.length - 1}
          onClick={() => setSelected(papers[idx + 1]?.cycle_date || null)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft className="h-4 w-4" />
          earlier cycle
        </button>
        <button
          disabled={idx === 0}
          onClick={() => setSelected(papers[idx - 1]?.cycle_date || null)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          later cycle
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

const PaperView: React.FC<{
  paper: CrowsNestExecutivePaper;
  onSelectProjection?: (id: string) => void;
}> = ({ paper, onSelectProjection }) => {
  const gs = paper.group_synthesis;
  return (
    <div className="space-y-5">
      {/* Headline + cascade summary */}
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04] shadow-sm">
        <CardContent className="p-6 md:p-8 space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-rose-500/10 p-2">
              <FileText className="h-5 w-5 text-rose-500" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-rose-500/30 bg-rose-500/[0.06] px-2 py-0.5 font-medium text-rose-700 dark:text-rose-300">
                  cycle {paper.cycle_date}
                </span>
                <span>·</span>
                <span>{paper.n_movers} mover{paper.n_movers === 1 ? '' : 's'} {'>='}3pp</span>
              </div>
              {gs?.headline ? (
                <p className="text-base md:text-lg text-foreground/90 leading-relaxed font-serif">
                  {gs.headline}
                </p>
              ) : null}
            </div>
          </div>

          {gs?.cascade_summary ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-3 border-t border-rose-500/10">
              <CascadeChip
                label="Y3 EBIT delta"
                value={gs.cascade_summary.group_y3_ebit_delta_eur_m as string | undefined}
              />
              <CascadeChip
                label="Y3 leverage delta"
                value={gs.cascade_summary.group_y3_leverage_delta_x as string | undefined}
              />
              <CascadeChip
                label="Dividend path"
                value={gs.cascade_summary.dividend_path_at_risk as string | undefined}
              />
            </div>
          ) : null}

          {gs?.verdict ? (
            <div className="pt-3 border-t border-rose-500/10">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-semibold mb-1">
                Verdict
              </div>
              <p className="text-sm text-foreground/85 leading-relaxed">{gs.verdict}</p>
            </div>
          ) : null}

          {gs?.next_cycle_pivot ? (
            <div className="pt-3 border-t border-rose-500/10">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-semibold mb-1">
                Next-cycle pivot
              </div>
              <p className="text-sm text-foreground/85 leading-relaxed italic">{gs.next_cycle_pivot}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Movers — Status / Implication / Effect / Mitigation per mover */}
      {paper.movers && paper.movers.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            What moved this cycle
          </h3>
          {paper.movers.map((m) => (
            <MoverCard key={m.id} mover={m} onSelectProjection={onSelectProjection} />
          ))}
        </div>
      ) : null}

      {/* Full memo */}
      {paper.memo_md ? (
        <Card className="rounded-2xl border-border/40">
          <CardContent className="p-6 md:p-8">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              Full memo
            </h3>
            <div className="prose prose-sm md:prose-base max-w-none font-serif text-foreground/90 leading-relaxed">
              <ReactMarkdown>{paper.memo_md}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

const CascadeChip: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <div className="rounded-lg border border-border/40 bg-background/50 p-3">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-sm font-medium text-foreground tabular-nums mt-1">{value || '—'}</div>
  </div>
);

const MoverCard: React.FC<{
  mover: ExecutivePaperMover;
  onSelectProjection?: (id: string) => void;
}> = ({ mover, onSelectProjection }) => {
  const delta = mover.tl_delta || 0;
  const deltaTone =
    delta < -0.005
      ? 'text-rose-700 dark:text-rose-300'
      : delta > 0.005
      ? 'text-emerald-700 dark:text-emerald-300'
      : 'text-muted-foreground';
  const deltaIcon = delta < -0.005 ? TrendingDown : delta > 0.005 ? TrendingUp : Minus;
  const Icon = deltaIcon;

  return (
    <Card className="rounded-2xl border-border/40">
      <CardContent className="p-5 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <button
              onClick={() => onSelectProjection?.(mover.id)}
              className="text-left group"
            >
              <h4 className="text-base md:text-lg font-semibold text-foreground leading-tight group-hover:text-rose-700 dark:group-hover:text-rose-300 transition">
                {mover.human_title || mover.id}
              </h4>
              <div className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">{mover.id}</div>
            </button>
          </div>
          <div className={`flex items-center gap-1 ${deltaTone}`}>
            <Icon className="h-4 w-4" />
            <span className="text-base font-semibold tabular-nums">
              {Math.round((mover.tl_before || 0) * 100)}% → {Math.round((mover.tl_after || 0) * 100)}%
            </span>
            <span className="text-xs tabular-nums">
              ({delta > 0 ? '+' : ''}{Math.round(delta * 100)}pp)
            </span>
          </div>
        </div>

        {/* The 4 sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {mover.status ? (
            <Section label="Status" tone="border-border/40 bg-background/40">
              {mover.status}
            </Section>
          ) : null}
          {mover.implication ? (
            <Section label="Implication" tone="border-rose-500/30 bg-rose-500/[0.04]">
              {mover.implication}
            </Section>
          ) : null}
          {mover.effect ? (
            <Section label="Effect" tone="border-amber-500/30 bg-amber-500/[0.04]">
              {mover.effect}
            </Section>
          ) : null}
          {mover.mitigation ? (
            <Section label="Mitigation" tone="border-emerald-500/30 bg-emerald-500/[0.04]">
              {mover.mitigation}
            </Section>
          ) : null}
        </div>

        {mover.next_cycle_focus ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.04] p-3">
            <div className="text-[10px] uppercase tracking-wide text-rose-700 dark:text-rose-300 font-semibold mb-1 flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" />
              Next-cycle focus
            </div>
            <p className="text-xs text-foreground/85 leading-relaxed italic">{mover.next_cycle_focus}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

const Section: React.FC<{ label: string; tone: string; children: React.ReactNode }> = ({
  label,
  tone,
  children,
}) => (
  <div className={`rounded-xl border ${tone} p-3.5`}>
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground/80 font-semibold mb-1.5">
      {label}
    </div>
    <p className="text-xs text-foreground/85 leading-relaxed font-serif">{children}</p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// v2-aware rendering branch
// ─────────────────────────────────────────────────────────────────────────────

const ExecutivePapersV2View: React.FC<{
  papers: ExecutivePaperV2[];
  initialCycle?: string | null;
}> = ({ papers, initialCycle }) => {
  const sorted = [...papers].sort((a, b) => (b.cycle_date || '').localeCompare(a.cycle_date || ''));
  const [selected, setSelected] = useState<string | null>(
    initialCycle || (sorted[0]?.cycle_date ?? null),
  );

  const current = sorted.find((p) => p.cycle_date === selected) || sorted[0];
  const idx = sorted.findIndex((p) => p.cycle_date === current.cycle_date);

  return (
    <div className="space-y-5">
      {/* Inside-Out only header note */}
      <Card className="rounded-2xl border-amber-500/30 bg-amber-500/[0.04]">
        <CardContent className="p-3">
          <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              <strong>Currently Inside-Out only</strong> — Outside-In integration coming in a later
              phase.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Cycle index strip */}
      <Card className="rounded-2xl border-border/40">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Cycles:</span>
            {sorted.map((p) => (
              <button
                key={p.cycle_date}
                onClick={() => setSelected(p.cycle_date)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  p.cycle_date === current.cycle_date
                    ? 'border-rose-500/50 bg-rose-500/[0.10] text-rose-700 dark:text-rose-300 font-medium'
                    : 'border-border/40 bg-background/60 text-muted-foreground hover:border-rose-500/30'
                }`}
              >
                <Calendar className="inline h-3 w-3 mr-1" />
                {p.cycle_date}
                {p.per_bet_assessment?.length ? (
                  <span className="ml-1.5 text-[10px] text-muted-foreground/70">
                    ({p.per_bet_assessment.length} bet{p.per_bet_assessment.length === 1 ? '' : 's'})
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <PaperViewV2 paper={current} />

      <div className="flex items-center justify-between">
        <button
          disabled={idx === sorted.length - 1}
          onClick={() => setSelected(sorted[idx + 1]?.cycle_date || null)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft className="h-4 w-4" />
          earlier cycle
        </button>
        <button
          disabled={idx === 0}
          onClick={() => setSelected(sorted[idx - 1]?.cycle_date || null)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          later cycle
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

const PaperViewV2: React.FC<{ paper: ExecutivePaperV2 }> = ({ paper }) => (
  <div className="space-y-5">
    {/* Headline */}
    <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04] shadow-sm">
      <CardContent className="p-6 md:p-8 space-y-3">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-rose-500/10 p-2">
            <FileText className="h-5 w-5 text-rose-500" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <span className="rounded-full border border-rose-500/30 bg-rose-500/[0.06] px-2 py-0.5 font-medium text-rose-700 dark:text-rose-300">
                cycle {paper.cycle_date}
              </span>
              {paper.cycle_label ? (
                <>
                  <span>·</span>
                  <span>{paper.cycle_label}</span>
                </>
              ) : null}
              {paper.per_bet_assessment?.length ? (
                <>
                  <span>·</span>
                  <span>
                    {paper.per_bet_assessment.length} bet
                    {paper.per_bet_assessment.length === 1 ? '' : 's'} assessed
                  </span>
                </>
              ) : null}
            </div>
            {paper.headline_60_words ? (
              <p className="text-base md:text-lg text-foreground/90 leading-relaxed font-serif">
                {paper.headline_60_words}
              </p>
            ) : null}
          </div>
        </div>

        {paper.metadata?.structure_note ? (
          <div className="pt-3 border-t border-rose-500/10">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-semibold mb-1">
              Structure note
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed italic">
              {paper.metadata.structure_note}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>

    {/* Per-bet assessment */}
    {paper.per_bet_assessment?.length ? (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Per-bet assessment
        </h3>
        {paper.per_bet_assessment.map((b) => (
          <PerBetAssessmentCard key={b.bet_id} bet={b} />
        ))}
      </div>
    ) : null}

    {/* Joint distribution view */}
    {paper.joint_distribution_view_120_words ? (
      <Card className="rounded-2xl border-border/40">
        <CardContent className="p-5 md:p-6 space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Compass className="h-3 w-3" />
            Joint distribution view
          </h3>
          <p className="text-sm text-foreground/85 leading-relaxed font-serif">
            {paper.joint_distribution_view_120_words}
          </p>
        </CardContent>
      </Card>
    ) : null}

    {/* Calendared gates */}
    {paper.calendared_gates_to_watch_next_18_months?.length ? (
      <Card className="rounded-2xl border-border/40">
        <CardContent className="p-5 md:p-6 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            Calendared gates to watch (next 18 months)
            <span className="text-[10px] text-muted-foreground/70 font-normal">
              · {paper.calendared_gates_to_watch_next_18_months.length}
            </span>
          </h3>
          <ul className="space-y-1.5 rounded-xl border border-border/40 bg-background/40 overflow-hidden">
            {paper.calendared_gates_to_watch_next_18_months.map((g, i) => (
              <CalendaredGateRowV2 key={i} gate={g} />
            ))}
          </ul>
        </CardContent>
      </Card>
    ) : null}

    {/* Factual corrections */}
    {paper.factual_corrections_carried_forward?.length ? (
      <Card className="rounded-2xl border-border/40">
        <CardContent className="p-5 md:p-6 space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Info className="h-3 w-3" />
            Factual corrections carried forward
          </h3>
          <ul className="list-disc list-outside pl-5 space-y-1 text-xs text-foreground/85 leading-relaxed">
            {paper.factual_corrections_carried_forward.map((fc, i) => (
              <li key={i}>
                {typeof fc === 'string' ? fc : fc?.text || fc?.note || JSON.stringify(fc)}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    ) : null}
  </div>
);

const PerBetAssessmentCard: React.FC<{ bet: ExecutivePaperV2PerBetAssessment }> = ({ bet }) => {
  const tl = v2TruthLikelihood(bet.current_state);
  const tier = v2Tier(bet.current_state);
  const traj = trajectorySymbol(bet.current_state?.trajectory);
  const tlPct = tl !== null ? Math.round(tl * 100) : null;

  return (
    <Card className="rounded-2xl border-border/40">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="rounded-full text-[10px] font-mono">
              {bet.bet_id}
            </Badge>
            {bet.label ? (
              <h4 className="text-base md:text-lg font-semibold text-foreground leading-tight">
                {bet.label}
              </h4>
            ) : null}
            {tier ? (
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${tierBadgeClass(tier)}`}>
                {tier}
              </span>
            ) : null}
          </div>
          {tlPct !== null ? (
            <div className="flex items-center gap-1 text-rose-700 dark:text-rose-300">
              <span className="text-base font-semibold tabular-nums">TL {tlPct}%</span>
              <span className={traj.color} title={traj.label}>
                {traj.symbol}
              </span>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {bet.status_le_60_words ? (
            <Section label="Status" tone="border-border/40 bg-background/40">
              {bet.status_le_60_words}
            </Section>
          ) : null}
          {bet.implication_le_80_words ? (
            <Section label="Implication" tone="border-rose-500/30 bg-rose-500/[0.04]">
              {bet.implication_le_80_words}
            </Section>
          ) : null}
          {bet.effect_le_100_words ? (
            <Section label="Effect" tone="border-amber-500/30 bg-amber-500/[0.04]">
              {bet.effect_le_100_words}
            </Section>
          ) : null}
          {bet.mitigation_le_80_words ? (
            <Section label="Mitigation" tone="border-emerald-500/30 bg-emerald-500/[0.04]">
              {bet.mitigation_le_80_words}
            </Section>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

const CalendaredGateRowV2: React.FC<{ gate: StatusQuoCalendaredGate }> = ({ gate }) => (
  <li className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2 border-b border-border/30 last:border-0">
    <Badge variant="outline" className="rounded-full text-[10px] font-mono">
      {gate.date}
    </Badge>
    <span className="text-xs text-foreground leading-snug">{gate.gate}</span>
    <div className="flex items-center gap-1 flex-wrap justify-end">
      {(gate.affects_bets || []).map((b) => (
        <Badge key={b} variant="outline" className="rounded-full text-[10px] font-mono">
          {b}
        </Badge>
      ))}
    </div>
  </li>
);
