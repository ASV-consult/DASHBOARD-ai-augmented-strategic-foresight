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
import { useForesight } from '@/contexts/ForesightContext';
import {
  CrowsNestExecutivePaper,
  ExecutivePaperMover,
} from '@/types/crows-nest';
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Props {
  initialCycle?: string | null;
  onSelectProjection?: (id: string) => void;
}

export const CrowsNestExecutivePapers: React.FC<Props> = ({ initialCycle, onSelectProjection }) => {
  const { crowsNestData } = useForesight();
  const papers = (crowsNestData?.executive_papers || []).slice().sort(
    (a, b) => (b.cycle_date || '').localeCompare(a.cycle_date || ''),
  );

  const [selected, setSelected] = useState<string | null>(initialCycle || (papers[0]?.cycle_date ?? null));

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
