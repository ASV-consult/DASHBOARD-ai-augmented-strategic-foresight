/**
 * CrowsNestStatusQuo — Phase B Status Quo Outlook view.
 *
 * The foundation document. Memo-style: serif-feel typography on the narrative,
 * data anchors as compact cards alongside. Distinct from the data-dense Bets
 * Register / Velocity Grid views.
 *
 * Layout:
 *   ┌───────────────────────────────────────────────────────────┐
 *   │ Headline card (verdict + as-of + validator chip)          │
 *   ├───────────────────────────────────────────────────────────┤
 *   │ Group path strip: rev / EBIT / FCF / leverage / dividend  │
 *   ├───────────────────────────────────────────────────────────┤
 *   │ Tabs: [ Memo ] [ Segments ] [ Dependencies ] [ Risks ]    │
 *   │   - Memo: narrative_md rendered                           │
 *   │   - Segments: per-segment trajectory cards w/ anchors     │
 *   │   - Dependencies: ranked projection list (clickable)      │
 *   │   - Risks: risks_and_mitigations cards                    │
 *   └───────────────────────────────────────────────────────────┘
 */
import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useForesight } from '@/contexts/ForesightContext';
import {
  CrowsNestStatusQuoOutlook,
  StatusQuoSegmentTrajectory,
  StatusQuoDependency,
  StatusQuoRisk,
  StatusQuoDivergenceCallout,
  truthLikelihoodToHex,
} from '@/types/crows-nest';
import {
  BookOpen,
  AlertTriangle,
  Compass,
  Layers,
  Target,
  CheckCircle2,
  XCircle,
  Calendar,
  ArrowRight,
  Info,
} from 'lucide-react';

interface Props {
  onSelectProjection: (projectionId: string) => void;
}

const fmtEUR = (v: number | null | undefined): string => {
  if (v === null || v === undefined) return '—';
  if (Math.abs(v) >= 1000) return `EUR ${(v / 1000).toFixed(1)}b`;
  return `EUR ${Math.round(v)}m`;
};

const fmtPct = (v: number | null | undefined): string => {
  if (v === null || v === undefined) return '—';
  return `${v.toFixed(1)}%`;
};

const fmtDividend = (v: number | null | undefined): string => {
  if (v === null || v === undefined) return '—';
  return `EUR ${v.toFixed(2)}`;
};

export const CrowsNestStatusQuo: React.FC<Props> = ({ onSelectProjection }) => {
  const { crowsNestData } = useForesight();
  const sq = crowsNestData?.status_quo_outlook;

  const [tab, setTab] = useState<'memo' | 'segments' | 'dependencies' | 'risks'>('memo');

  if (!sq) {
    return (
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04]">
        <CardContent className="p-8 space-y-3">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-rose-500/10 p-2">
              <BookOpen className="h-5 w-5 text-rose-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Status Quo Outlook — not yet generated</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                The Status Quo Outlook is the 3-year baseline document. Once generated, it lives at{' '}
                <code className="rounded bg-muted/40 px-1.5 py-0.5 text-xs">
                  crows_nest_v2/companies/{'{company}'}/status_quo_outlook.json
                </code>{' '}
                and renders here as a memo with segment trajectories, group path, dependencies, and risks.
              </p>
              <div className="mt-3 rounded-xl border border-border/40 bg-background/60 p-3">
                <p className="text-xs font-mono text-muted-foreground">
                  python crows_nest_v2/derivers/build_status_quo.py --company {crowsNestData?.meta.company || 'umicore'} --cycle{' '}
                  {crowsNestData?.meta.cycle_date || '2026-04-30'}
                </p>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                After generation, regenerate the bundle and re-upload to see this view populate.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <HeadlineCard outlook={sq} />
      <GroupPathStrip outlook={sq} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="rounded-full">
          <TabsTrigger value="memo" className="rounded-full text-xs">
            <BookOpen className="h-3.5 w-3.5 mr-1.5" />
            Memo
          </TabsTrigger>
          <TabsTrigger value="segments" className="rounded-full text-xs">
            <Layers className="h-3.5 w-3.5 mr-1.5" />
            Segments ({sq.trajectory_by_segment.length})
          </TabsTrigger>
          <TabsTrigger value="dependencies" className="rounded-full text-xs">
            <Target className="h-3.5 w-3.5 mr-1.5" />
            Dependencies ({sq.key_dependencies.length})
          </TabsTrigger>
          <TabsTrigger value="risks" className="rounded-full text-xs">
            <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
            Risks ({sq.risks_and_mitigations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="memo" className="mt-4">
          <MemoView outlook={sq} onSelectProjection={onSelectProjection} />
        </TabsContent>

        <TabsContent value="segments" className="mt-4">
          <SegmentsView outlook={sq} onSelectProjection={onSelectProjection} />
        </TabsContent>

        <TabsContent value="dependencies" className="mt-4">
          <DependenciesView outlook={sq} onSelectProjection={onSelectProjection} />
        </TabsContent>

        <TabsContent value="risks" className="mt-4">
          <RisksView outlook={sq} onSelectProjection={onSelectProjection} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const HeadlineCard: React.FC<{ outlook: CrowsNestStatusQuoOutlook }> = ({ outlook }) => {
  const passed = outlook.validator_report?.passed;
  const issues = outlook.validator_report?.issues || [];
  const blockers = (outlook.validator_report?.blocker_count ?? 0) > 0;

  return (
    <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04] shadow-sm">
      <CardContent className="p-6 md:p-8 space-y-3">
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-full bg-rose-500/10 p-2">
            <Compass className="h-5 w-5 text-rose-500" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground leading-snug">
                Status Quo Outlook — {outlook.company.charAt(0).toUpperCase() + outlook.company.slice(1)}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {outlook.as_of_cycle}
              </span>
              <span className="rounded-full border border-border/40 bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                {outlook.horizon_years}-year horizon
              </span>
              {passed ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/[0.06] px-2 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" />
                  validated
                </span>
              ) : blockers ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/[0.10] px-2 py-0.5 text-[10px] text-rose-700 dark:text-rose-300 font-medium">
                  <XCircle className="h-3 w-3" />
                  validator blockers ({outlook.validator_report?.blocker_count})
                </span>
              ) : (
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/[0.06] px-2 py-0.5 text-[10px] text-amber-700 dark:text-amber-300">
                        <Info className="h-3 w-3" />
                        {issues.length} validator note{issues.length === 1 ? '' : 's'}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-xs">
                      <div className="font-medium mb-1">Validator</div>
                      <div className="text-muted-foreground">{outlook.validator_report?.summary}</div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="text-sm md:text-base text-foreground/90 leading-relaxed font-serif">
              {outlook.headline}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const GroupPathStrip: React.FC<{ outlook: CrowsNestStatusQuoOutlook }> = ({ outlook }) => {
  const gp = outlook.group_path || {};

  // Pick the EUR-formatted band, prefer low/high; fall back to single value, then mid.
  const fmtBand = (
    low: number | null | undefined,
    high: number | null | undefined,
    single: number | null | undefined,
    mid: number | null | undefined,
    fmt: (v: number | null | undefined) => string,
  ): string => {
    if (low != null && high != null && low !== high) {
      return `${fmt(low)}—${fmt(high)}`;
    }
    if (single != null) return fmt(single);
    if (mid != null) return fmt(mid);
    if (low != null) return fmt(low);
    if (high != null) return fmt(high);
    return '—';
  };

  const fmtLeverage = (v: number | null | undefined): string =>
    v != null ? `${v.toFixed(1)}x` : '—';

  // Tolerant accessor — synthesizers may emit any of:
  //   ebit_eur_m_y3_low, ebit_adjusted_eur_m_y3_low, etc.
  const num = (k: string): number | null | undefined =>
    (gp[k] as number | null | undefined) ?? null;
  const firstNum = (...keys: string[]): number | null | undefined => {
    for (const k of keys) {
      const v = num(k);
      if (v !== null && v !== undefined) return v;
    }
    return null;
  };

  const cells: Array<{ label: string; y1: string; y3: string; tone: string }> = [
    {
      label: 'Revenue',
      y1: fmtEUR(firstNum('revenue_eur_m_y1', 'revenue_eur_m_y1_mid')),
      y3: fmtBand(
        firstNum('revenue_eur_m_y3_low'),
        firstNum('revenue_eur_m_y3_high'),
        firstNum('revenue_eur_m_y3'),
        firstNum('revenue_eur_m_y3_mid'),
        fmtEUR,
      ),
      tone: 'border-border/40',
    },
    {
      label: 'EBIT',
      y1: fmtEUR(firstNum('ebit_eur_m_y1', 'ebit_adjusted_eur_m_y1_mid', 'ebit_adjusted_eur_m_y1')),
      y3: fmtBand(
        firstNum('ebit_eur_m_y3_low', 'ebit_adjusted_eur_m_y3_low'),
        firstNum('ebit_eur_m_y3_high', 'ebit_adjusted_eur_m_y3_high'),
        firstNum('ebit_eur_m_y3', 'ebit_adjusted_eur_m_y3'),
        firstNum('ebit_eur_m_y3_mid', 'ebit_adjusted_eur_m_y3_mid'),
        fmtEUR,
      ),
      tone: 'border-rose-500/30',
    },
    {
      label: 'FCF (Y3)',
      y1: '',
      y3: fmtBand(
        firstNum('fcf_eur_m_y3_low'),
        firstNum('fcf_eur_m_y3_high'),
        firstNum('fcf_eur_m_y3'),
        firstNum('fcf_eur_m_y3_mid'),
        fmtEUR,
      ),
      tone: 'border-border/40',
    },
    {
      label: 'Net debt (Y3)',
      y1: '',
      y3: fmtBand(
        firstNum('net_debt_y3_low', 'net_debt_eur_m_y3_low'),
        firstNum('net_debt_y3_high', 'net_debt_eur_m_y3_high'),
        firstNum('net_debt_y3', 'net_debt_eur_m_y3'),
        firstNum('net_debt_y3_mid', 'net_debt_eur_m_y3_mid'),
        fmtEUR,
      ),
      tone: 'border-border/40',
    },
    {
      label: 'Leverage (Y3)',
      y1: '',
      y3: fmtBand(
        firstNum('leverage_y3_low'),
        firstNum('leverage_y3_high'),
        firstNum('leverage_y3'),
        firstNum('leverage_y3_mid'),
        fmtLeverage,
      ),
      tone: 'border-border/40',
    },
  ];

  // Synthesizers may emit dividend under either dividend_path or dividend_path_eur_per_share
  const dpRaw = (gp.dividend_path || gp.dividend_path_eur_per_share) as Record<string, unknown> | undefined;
  const dpVal = (key: string, ...alt: string[]): number | null => {
    if (!dpRaw) return null;
    for (const k of [key, ...alt]) {
      const v = dpRaw[k];
      if (typeof v === 'number') return v;
    }
    return null;
  };
  const dp = dpRaw
    ? {
        y0: dpVal('y0', 'y0_2025'),
        y1: dpVal('y1', 'y1_2026'),
        y2: dpVal('y2', 'y2_2027'),
        y3: dpVal('y3', 'y3_2028_mid', 'y3_2028'),
      }
    : null;

  return (
    <Card className="rounded-2xl border-border/40">
      <CardContent className="p-4 md:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Group path</h3>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            (under current projection set)
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {cells.map((c) => (
            <div key={c.label} className={`rounded-xl border ${c.tone} bg-background/50 p-3`}>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{c.label}</div>
              {c.y1 ? (
                <>
                  <div className="text-[10px] text-muted-foreground/70 mt-1">Y1</div>
                  <div className="text-sm font-semibold text-foreground tabular-nums">{c.y1}</div>
                  <div className="text-[10px] text-muted-foreground/70 mt-1">Y3</div>
                </>
              ) : null}
              <div className="text-base font-semibold text-foreground tabular-nums">{c.y3}</div>
            </div>
          ))}
        </div>

        {dp ? (
          <div className="rounded-xl border border-border/40 bg-background/50 p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
              Dividend path (per share)
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(['y0', 'y1', 'y2', 'y3'] as const).map((y) => (
                <div key={y} className="text-center">
                  <div className="text-[10px] text-muted-foreground/70 uppercase">{y}</div>
                  <div className="text-sm font-semibold text-foreground tabular-nums">{fmtDividend(dp[y])}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const MemoView: React.FC<{
  outlook: CrowsNestStatusQuoOutlook;
  onSelectProjection: (id: string) => void;
}> = ({ outlook, onSelectProjection }) => {
  // Render the markdown narrative — minimalist parser: split into sections by headers,
  // resolve P*-style citations into clickable buttons. Avoids pulling a full markdown lib.
  const validIds = useMemo(() => {
    const ids = new Set<string>();
    for (const s of outlook.trajectory_by_segment) {
      for (const id of s.depends_on_projections || []) ids.add(id);
    }
    for (const d of outlook.key_dependencies || []) ids.add(d.projection_id);
    for (const c of outlook.divergence_callouts || []) ids.add(c.projection_id);
    return ids;
  }, [outlook]);

  return (
    <Card className="rounded-2xl border-border/40">
      <CardContent className="p-6 md:p-8">
        <article className="prose prose-sm md:prose-base max-w-none font-serif text-foreground/90 leading-relaxed">
          <RenderedMarkdown
            md={outlook.narrative_md || ''}
            validIds={validIds}
            onSelectProjection={onSelectProjection}
          />
        </article>
      </CardContent>
    </Card>
  );
};

const RenderedMarkdown: React.FC<{
  md: string;
  validIds: Set<string>;
  onSelectProjection: (id: string) => void;
}> = ({ md, validIds, onSelectProjection }) => {
  const elements: React.ReactNode[] = [];
  const lines = md.split('\n');
  let buffer: string[] = [];

  const flushBuffer = (key: string) => {
    if (buffer.length === 0) return;
    elements.push(
      <p key={`p-${key}`} className="my-3 text-foreground/85">
        {linkifyProjectionIds(buffer.join(' ').trim(), validIds, onSelectProjection)}
      </p>,
    );
    buffer = [];
  };

  lines.forEach((line, i) => {
    if (/^# /.test(line)) {
      flushBuffer(String(i));
      elements.push(
        <h1 key={`h1-${i}`} className="mt-2 mb-3 text-2xl font-semibold text-foreground">
          {line.slice(2)}
        </h1>,
      );
    } else if (/^## /.test(line)) {
      flushBuffer(String(i));
      elements.push(
        <h2 key={`h2-${i}`} className="mt-6 mb-2 text-xl font-semibold text-foreground border-b border-border/30 pb-1">
          {line.slice(3)}
        </h2>,
      );
    } else if (/^### /.test(line)) {
      flushBuffer(String(i));
      elements.push(
        <h3 key={`h3-${i}`} className="mt-4 mb-2 text-base font-semibold text-foreground">
          {line.slice(4)}
        </h3>,
      );
    } else if (/^[\-*] /.test(line)) {
      flushBuffer(String(i));
      elements.push(
        <li key={`li-${i}`} className="ml-5 list-disc text-foreground/85">
          {linkifyProjectionIds(line.replace(/^[\-*]\s+/, ''), validIds, onSelectProjection)}
        </li>,
      );
    } else if (line.trim() === '') {
      flushBuffer(String(i));
    } else {
      buffer.push(line);
    }
  });
  flushBuffer('end');
  return <>{elements}</>;
};

const linkifyProjectionIds = (
  text: string,
  validIds: Set<string>,
  onSelectProjection: (id: string) => void,
): React.ReactNode => {
  // Inline simple **bold** support + projection ID linkification
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|P\d+_\d+_[a-zA-Z0-9_]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**') && tok.endsWith('**')) {
      parts.push(<strong key={`b-${i}`}>{tok.slice(2, -2)}</strong>);
    } else if (validIds.has(tok)) {
      parts.push(
        <button
          key={`pid-${i}`}
          onClick={() => onSelectProjection(tok)}
          className="rounded border border-rose-500/30 bg-rose-500/[0.06] px-1 py-0.5 text-xs font-mono text-rose-700 dark:text-rose-300 hover:bg-rose-500/[0.10] transition"
        >
          {tok}
        </button>,
      );
    } else {
      parts.push(
        <span key={`pid-stale-${i}`} className="rounded border border-border/40 bg-muted/40 px-1 py-0.5 text-xs font-mono text-muted-foreground">
          {tok}
        </span>,
      );
    }
    last = m.index + tok.length;
    i++;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
};

// ─────────────────────────────────────────────────────────────────────────────

const SegmentsView: React.FC<{
  outlook: CrowsNestStatusQuoOutlook;
  onSelectProjection: (id: string) => void;
}> = ({ outlook, onSelectProjection }) => {
  return (
    <div className="space-y-3">
      {outlook.trajectory_by_segment.map((seg) => (
        <SegmentCard key={seg.segment} segment={seg} onSelectProjection={onSelectProjection} />
      ))}
    </div>
  );
};

const SegmentCard: React.FC<{
  segment: StatusQuoSegmentTrajectory;
  onSelectProjection: (id: string) => void;
}> = ({ segment, onSelectProjection }) => {
  const a = segment.anchors || {};
  return (
    <Card className="rounded-2xl border-border/40">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-foreground">{segment.segment}</h3>
        </div>

        {/* Anchor band */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Anchor label="Y3 Revenue" lo={a.revenue_eur_m_y3_low} hi={a.revenue_eur_m_y3_high} fmt={fmtEUR} />
          <Anchor label="Y3 EBIT" lo={a.ebit_eur_m_y3_low} hi={a.ebit_eur_m_y3_high} fmt={fmtEUR} />
          <Anchor label="Y3 EBIT margin" lo={a.ebit_margin_y3_pct} hi={a.ebit_margin_y3_pct} fmt={fmtPct} />
          <Anchor label="Y3 ROCE" lo={a.roce_pct_y3} hi={a.roce_pct_y3} fmt={fmtPct} />
        </div>

        <p className="text-sm text-foreground/85 leading-relaxed font-serif">{segment.narrative}</p>

        {segment.depends_on_projections.length > 0 ? (
          <div className="pt-2 border-t border-border/30">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
              Gating projections
            </div>
            <div className="flex flex-wrap gap-1.5">
              {segment.depends_on_projections.map((pid) => (
                <button
                  key={pid}
                  onClick={() => onSelectProjection(pid)}
                  className="rounded border border-rose-500/30 bg-rose-500/[0.06] px-2 py-0.5 text-[11px] font-mono text-rose-700 dark:text-rose-300 hover:bg-rose-500/[0.10] transition"
                >
                  {pid}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {segment.divergence_aware_variant?.narrative ? (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/[0.04] p-3">
            <div className="text-[10px] uppercase tracking-wide text-rose-700 dark:text-rose-300 font-semibold mb-1">
              If user assertion holds
            </div>
            <p className="text-xs text-foreground/85 font-serif leading-relaxed">
              {segment.divergence_aware_variant.narrative}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

const Anchor: React.FC<{
  label: string;
  lo: number | null | undefined;
  hi: number | null | undefined;
  fmt: (v: number | null | undefined) => string;
}> = ({ label, lo, hi, fmt }) => {
  const same = lo === hi || hi == null;
  return (
    <div className="rounded-xl border border-border/40 bg-background/50 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-foreground tabular-nums">
        {same ? fmt(lo) : `${fmt(lo)}—${fmt(hi)}`}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const DependenciesView: React.FC<{
  outlook: CrowsNestStatusQuoOutlook;
  onSelectProjection: (id: string) => void;
}> = ({ outlook, onSelectProjection }) => {
  return (
    <Card className="rounded-2xl border-border/40">
      <CardContent className="p-5 space-y-2">
        {outlook.key_dependencies.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No key dependencies recorded.</p>
        ) : (
          <ul className="divide-y divide-border/30">
            {outlook.key_dependencies.map((d) => (
              <DependencyRow key={d.projection_id} dep={d} onSelectProjection={onSelectProjection} />
            ))}
          </ul>
        )}

        {outlook.divergence_callouts.length > 0 ? (
          <div className="mt-4 pt-4 border-t border-border/30">
            <div className="text-[11px] uppercase tracking-wide text-rose-700 dark:text-rose-300 font-semibold mb-2">
              Divergence callouts
            </div>
            <ul className="space-y-2">
              {outlook.divergence_callouts.map((c) => (
                <DivergenceCalloutRow key={c.projection_id} callout={c} onSelectProjection={onSelectProjection} />
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

const DependencyRow: React.FC<{
  dep: StatusQuoDependency;
  onSelectProjection: (id: string) => void;
}> = ({ dep, onSelectProjection }) => {
  const tl = dep.current_truth_likelihood;
  const tlColor = typeof tl === 'number' ? truthLikelihoodToHex(tl) : '#94a3b8';
  return (
    <li
      className="grid grid-cols-[auto_1fr_auto] gap-3 py-2.5 cursor-pointer hover:bg-rose-500/[0.04] rounded-md px-2"
      onClick={() => onSelectProjection(dep.projection_id)}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelectProjection(dep.projection_id);
        }}
        className="rounded border border-rose-500/30 bg-rose-500/[0.06] px-2 py-0.5 text-[11px] font-mono text-rose-700 dark:text-rose-300 hover:bg-rose-500/[0.10] transition self-start"
      >
        {dep.projection_id}
      </button>
      <div className="text-sm text-foreground/85 font-serif leading-snug">{dep.if_breaks}</div>
      <div className="self-start flex items-center gap-2">
        {typeof tl === 'number' ? (
          <span className="text-xs tabular-nums font-medium" style={{ color: tlColor }}>
            TL {Math.round(tl * 100)}%
          </span>
        ) : null}
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" />
      </div>
    </li>
  );
};

const DivergenceCalloutRow: React.FC<{
  callout: StatusQuoDivergenceCallout;
  onSelectProjection: (id: string) => void;
}> = ({ callout, onSelectProjection }) => (
  <li className="rounded-xl border border-rose-500/30 bg-rose-500/[0.04] p-3">
    <div className="flex items-start gap-2">
      <button
        onClick={() => onSelectProjection(callout.projection_id)}
        className="rounded border border-rose-500/40 bg-rose-500/[0.10] px-2 py-0.5 text-[11px] font-mono text-rose-700 dark:text-rose-300 hover:bg-rose-500/[0.16] transition"
      >
        {callout.projection_id}
      </button>
      <p className="text-sm text-foreground/85 font-serif leading-snug flex-1">{callout.delta_implication}</p>
    </div>
  </li>
);

// ─────────────────────────────────────────────────────────────────────────────

const RisksView: React.FC<{
  outlook: CrowsNestStatusQuoOutlook;
  onSelectProjection: (id: string) => void;
}> = ({ outlook, onSelectProjection }) => {
  if (outlook.risks_and_mitigations.length === 0) {
    return (
      <Card className="rounded-2xl border-border/40">
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground italic">No risks recorded.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {outlook.risks_and_mitigations.map((r, i) => (
        <RiskCard key={`risk-${i}`} risk={r} onSelectProjection={onSelectProjection} />
      ))}
    </div>
  );
};

const RiskCard: React.FC<{
  risk: StatusQuoRisk;
  onSelectProjection: (id: string) => void;
}> = ({ risk, onSelectProjection }) => {
  const likelihoodTone =
    risk.likelihood === 'high'
      ? 'border-rose-500/50 bg-rose-500/[0.10] text-rose-700 dark:text-rose-300'
      : risk.likelihood === 'medium'
      ? 'border-amber-500/50 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300'
      : 'border-emerald-500/40 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-300';

  return (
    <Card className="rounded-2xl border-border/40">
      <CardContent className="p-5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-foreground leading-snug font-serif flex-1">{risk.risk}</p>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${likelihoodTone}`}>
            {risk.likelihood}
          </span>
        </div>
        <div className="rounded-xl border border-border/40 bg-background/50 p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Mitigation</div>
          <p className="text-sm text-foreground/85 font-serif leading-snug">{risk.mitigation}</p>
        </div>
        {risk.anchor_projection_ids && risk.anchor_projection_ids.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {risk.anchor_projection_ids.map((pid) => (
              <button
                key={pid}
                onClick={() => onSelectProjection(pid)}
                className="rounded border border-rose-500/30 bg-rose-500/[0.06] px-2 py-0.5 text-[11px] font-mono text-rose-700 dark:text-rose-300 hover:bg-rose-500/[0.10] transition"
              >
                {pid}
              </button>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
