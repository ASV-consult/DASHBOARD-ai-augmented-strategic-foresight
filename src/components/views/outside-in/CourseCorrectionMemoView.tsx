/**
 * CourseCorrectionMemoView — the bridge artefact between Inside-Out and
 * Outside-In postures. Replaces the v1 Executive Paper as the 2-minute
 * manager read.
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useForesight } from '@/contexts/ForesightContext';
import { GitMerge, AlertTriangle, ListChecks, TrendingUp } from 'lucide-react';

export const CourseCorrectionMemoView: React.FC = () => {
  const { crowsNestV2Data } = useForesight();
  const cc = crowsNestV2Data?.course_correction;
  const memo = cc?.latest_memo;

  if (!memo) {
    return (
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04]">
        <CardContent className="p-8">
          <p className="text-sm text-muted-foreground">
            No Course-Correction Memo available. Run{' '}
            <code className="rounded bg-muted px-1">
              python crows_nest_v2/derivers/course_correction_memo.py --company umicore --cycle YYYY-MM-DD
            </code>{' '}
            to generate one, then rebuild the v3 dashboard bundle.
          </p>
        </CardContent>
      </Card>
    );
  }

  const meta = memo._meta;
  const fd = memo.financial_delta;
  const sp = memo.share_price_impact;

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-rose-500/30 bg-rose-500/[0.04]">
        <CardContent className="space-y-2 p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <GitMerge className="h-5 w-5 text-rose-500" />
              Course-Correction Memo
            </h2>
            {meta && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-[10px]">
                  {meta.cycle_date ?? 'no cycle'}
                </Badge>
                <span>
                  {meta.n_routing_rows_processed ?? 0} rows · {meta.n_drivers_evaluated ?? 0}{' '}
                  drivers · {meta.n_promotion_proposals ?? 0} proposals
                </span>
              </div>
            )}
          </div>
          {memo._stub_mode && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.06] p-2 text-xs">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-amber-600" />
              <p>Stub-mode memo: LLM backend was unavailable when this memo was generated.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Headline */}
      <Card className="rounded-2xl border-rose-500/40 bg-rose-500/[0.06]">
        <CardContent className="p-6">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-400">Headline</p>
          <p className="mt-1 text-base font-medium leading-snug">{memo.headline}</p>
        </CardContent>
      </Card>

      {/* Driver and Bet Cascade */}
      <Card className="rounded-2xl border-border/40">
        <CardContent className="p-5">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4" />
            Driver and Bet Cascade
          </h3>
          <ul className="space-y-1.5 text-sm">
            {memo.driver_and_bet_cascade.map((b, i) => (
              <li key={i} className="rounded-md border border-border/30 bg-background/40 p-2">{b}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Financial Delta */}
      <Card className="rounded-2xl border-border/40">
        <CardContent className="p-5">
          <h3 className="mb-2 text-sm font-semibold">Financial Delta</h3>
          <p className="mb-3 text-[11px] text-muted-foreground">
            Method: <span className="font-mono">{fd?.method ?? 'qualitative-only'}</span>
          </p>
          {fd?.table && fd.table.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/40 text-left text-[10px] uppercase text-muted-foreground">
                    <th className="px-2 py-1">Line</th>
                    <th className="px-2 py-1">FY</th>
                    <th className="px-2 py-1">Low</th>
                    <th className="px-2 py-1">High</th>
                    <th className="px-2 py-1">Rationale</th>
                  </tr>
                </thead>
                <tbody>
                  {fd.table.map((r, i) => (
                    <tr key={i} className="border-b border-border/20">
                      <td className="px-2 py-1 font-medium">{r.line}</td>
                      <td className="px-2 py-1">{r.fy}</td>
                      <td className="px-2 py-1">{r.low}</td>
                      <td className="px-2 py-1">{r.high}</td>
                      <td className="px-2 py-1 text-muted-foreground">{r.rationale}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs italic text-muted-foreground">No quantitative table this cycle.</p>
          )}
        </CardContent>
      </Card>

      {/* Share Price Impact */}
      <Card className="rounded-2xl border-border/40">
        <CardContent className="p-5">
          <h3 className="mb-2 text-sm font-semibold">Share Price Impact</h3>
          {sp?.narrative && <p className="text-sm text-foreground/90">{sp.narrative}</p>}
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs lg:grid-cols-4">
            <Item label="Range" value={sp?.range ?? 'n/a'} />
            <Item label="Method" value={sp?.method ?? 'n/a'} />
            <Item label="Confidence" value={sp?.confidence ?? 'n/a'} />
            <Item label="Sensitivity" value={sp?.sensitivity ?? 'n/a'} />
          </div>
        </CardContent>
      </Card>

      {/* Adjacency Flags */}
      {memo.adjacency_flags && memo.adjacency_flags.length > 0 && (
        <Card className="rounded-2xl border-border/40">
          <CardContent className="p-5">
            <h3 className="mb-2 text-sm font-semibold">Adjacency Flags</h3>
            <ul className="space-y-1 text-sm">
              {memo.adjacency_flags.map((b, i) => (
                <li key={i} className="rounded-md border border-amber-500/20 bg-amber-500/[0.04] p-2">{b}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Assumptions */}
      <Card className="rounded-2xl border-emerald-500/30 bg-emerald-500/[0.03]">
        <CardContent className="p-5">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <ListChecks className="h-4 w-4" />
            Assumptions Used
          </h3>
          <ul className="space-y-1 text-sm">
            {memo.assumptions_used.map((b, i) => (
              <li key={i} className="rounded-md border border-emerald-500/20 bg-background/30 p-2">{b}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* What Would Invalidate */}
      <Card className="rounded-2xl border-rose-500/30 bg-rose-500/[0.03]">
        <CardContent className="p-5">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            What Would Invalidate This
          </h3>
          <ul className="space-y-1 text-sm">
            {memo.what_would_invalidate_this.map((b, i) => (
              <li key={i} className="rounded-md border border-rose-500/20 bg-background/30 p-2">{b}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

const Item: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-md border border-border/30 bg-background/40 p-2">
    <p className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</p>
    <p className="text-foreground/90">{value}</p>
  </div>
);
