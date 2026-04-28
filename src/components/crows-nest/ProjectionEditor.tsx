/**
 * ProjectionEditor — Phase A3 inline editor.
 *
 * Opens from a projection detail page (Level 3) or the Bets Register table.
 * Lets the user override the projection's structured fields (target_value,
 * target_metric, resolution_date, claim text, rationale).
 *
 * Persistence model (PoC):
 *   - Saves to localStorage under `crowsNest_overrides_{company}` as a map
 *     of projection_id → user_assertion.
 *   - When applied via `applyOverrides()` (called by Dashboard.tsx on data load),
 *     the saved overrides get spliced into the loaded crowsNestData in memory.
 *   - The user can export the overrides as JSON and feed them to
 *     `bets_register.py --set-user` to persist to disk.
 *
 * NOTE: this is a PoC. Production version would POST to a backend that calls
 * bets_register.py directly. Architecture is identical; only the persistence
 * layer changes.
 */
import React, { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  CrowsNestProjection,
  UserAssertion,
  ProjectionDivergence,
} from '@/types/crows-nest';
import { AlertCircle, Pencil, RotateCcw, Save } from 'lucide-react';

interface ProjectionEditorProps {
  projection: CrowsNestProjection | null;
  company: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (projectionId: string, assertion: UserAssertion | null) => void;
}

const STORAGE_KEY = (company: string) => `crowsNest_overrides_${company}`;

interface StoredOverride {
  user_assertion: UserAssertion;
}

type OverrideMap = Record<string, StoredOverride>;

/** Read overrides from localStorage. */
export function readOverrides(company: string): OverrideMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(company));
    if (!raw) return {};
    return JSON.parse(raw) as OverrideMap;
  } catch {
    return {};
  }
}

/** Write overrides to localStorage. */
export function writeOverrides(company: string, map: OverrideMap): void {
  try {
    localStorage.setItem(STORAGE_KEY(company), JSON.stringify(map));
  } catch (e) {
    console.error('Failed to persist overrides:', e);
  }
}

/** Compute divergence in the browser (mirrors bets_register.py logic). */
function computeDivergenceLocal(
  systemClaim: CrowsNestProjection['system_claim'],
  userAssertion: UserAssertion | null,
): ProjectionDivergence | null {
  if (!userAssertion || !systemClaim) return null;
  const sysT = systemClaim.target_value;
  const userT = userAssertion.target_value;
  const sysDate = systemClaim.resolution_date;
  const userDate = userAssertion.resolution_date;

  let delta: number | string | null = null;
  let severity: 'minor' | 'moderate' | 'material' = 'minor';
  const summaryParts: string[] = [];

  if (typeof sysT === 'number' && typeof userT === 'number') {
    const d = userT - sysT;
    delta = Math.round(d * 10000) / 10000;
    const rel = sysT !== 0 ? Math.abs(d / sysT) : Math.abs(d);
    severity = rel >= 0.25 ? 'material' : rel >= 0.10 ? 'moderate' : 'minor';
    const isPct =
      (systemClaim.target_metric || '').includes('%') ||
      (systemClaim.target_metric || '').toLowerCase().includes('share') ||
      (sysT >= 0 && sysT <= 1.5);
    if (isPct) {
      summaryParts.push(
        `system ${(sysT * 100).toFixed(0)}% vs user ${(userT * 100).toFixed(0)}% (${d * 100 >= 0 ? '+' : ''}${(d * 100).toFixed(0)}pp)`,
      );
    } else {
      summaryParts.push(
        `system ${sysT.toLocaleString(undefined, { maximumFractionDigits: 2 })} vs user ${userT.toLocaleString(undefined, { maximumFractionDigits: 2 })} (${d >= 0 ? '+' : ''}${d.toFixed(2)})`,
      );
    }
  } else if (sysT !== userT) {
    delta = `system=${sysT} vs user=${userT}`;
    severity = 'moderate';
    summaryParts.push(`target mismatch: system='${sysT}' vs user='${userT}'`);
  }

  if (sysDate && userDate && sysDate !== userDate) {
    summaryParts.push(`resolution date ${sysDate} → ${userDate}`);
    if (severity === 'minor') severity = 'moderate';
  }

  if (summaryParts.length === 0 && delta === null) return null;

  return {
    delta,
    severity,
    last_evaluated: new Date().toISOString(),
    summary: summaryParts.length > 0 ? summaryParts.join('; ') : 'user assertion present without numeric divergence',
  };
}

/** Apply stored overrides into a loaded CrowsNestData (mutates in-place). */
export function applyOverridesToBundle(
  data: { dimensions: Array<{ projections: CrowsNestProjection[] }>; bets_register?: { totals?: Record<string, number> } } | null,
  company: string,
): void {
  if (!data) return;
  const overrides = readOverrides(company);
  let withAssertion = 0;
  let materialDiv = 0;
  let elevated = 0;

  for (const dim of data.dimensions) {
    for (const p of dim.projections) {
      const ov = overrides[p.id];
      if (ov) {
        p.user_assertion = ov.user_assertion;
        p.divergence = computeDivergenceLocal(p.system_claim, ov.user_assertion);
        // Auto-elevate research priority when divergence is material
        if (p.divergence?.severity === 'material' && p.research_priority !== 'deferred') {
          p.research_priority = 'elevated';
        }
        // Update effective claim
        p.claim = ov.user_assertion.claim || p.claim;
        p.resolution_date = ov.user_assertion.resolution_date || p.resolution_date;
        withAssertion++;
        if (p.divergence?.severity === 'material') materialDiv++;
        if (p.research_priority === 'elevated') elevated++;
      } else {
        // Make sure a previously-applied override that's now removed is reverted
        if (p.user_assertion && !overrides[p.id]) {
          p.user_assertion = null;
          p.divergence = null;
          if (p.system_claim) {
            p.claim = p.system_claim.claim || p.claim;
            p.resolution_date = p.system_claim.resolution_date || p.resolution_date;
          }
        }
      }
    }
  }
  // Bump totals so the BetsRegister header updates without needing a re-fetch
  if (data.bets_register?.totals) {
    data.bets_register.totals.with_user_assertion = withAssertion;
    data.bets_register.totals.divergent_material = materialDiv;
    data.bets_register.totals.elevated_priority = elevated;
  }
}

export const ProjectionEditor: React.FC<ProjectionEditorProps> = ({
  projection,
  company,
  open,
  onOpenChange,
  onSaved,
}) => {
  // Form state — initialised on each projection change
  const [claim, setClaim] = useState('');
  const [targetValue, setTargetValue] = useState<string>('');
  const [targetMetric, setTargetMetric] = useState('');
  const [resolutionDate, setResolutionDate] = useState('');
  const [rationale, setRationale] = useState('');
  const [hasOverride, setHasOverride] = useState(false);

  useEffect(() => {
    if (!projection) return;
    const existing = projection.user_assertion;
    const seed = existing || projection.system_claim;
    if (seed) {
      setClaim(seed.claim || '');
      setTargetValue(seed.target_value !== null && seed.target_value !== undefined ? String(seed.target_value) : '');
      setTargetMetric(seed.target_metric || '');
      setResolutionDate(seed.resolution_date || projection.resolution_date || '');
      setRationale((existing as UserAssertion | null | undefined)?.rationale || '');
      setHasOverride(Boolean(existing));
    }
  }, [projection]);

  if (!projection) return null;

  const sys = projection.system_claim;
  const div = projection.divergence;

  const handleSave = () => {
    // Coerce target_value to number when possible
    const tv = targetValue.trim();
    let coercedValue: number | string | null = null;
    if (tv) {
      const n = Number(tv);
      coercedValue = isNaN(n) ? tv : n;
    }
    const assertion: UserAssertion = {
      claim,
      target_value: coercedValue,
      target_metric: targetMetric || null,
      resolution_date: resolutionDate,
      set_by: 'analyst@dashboard',
      set_at: new Date().toISOString(),
      rationale,
    };
    const overrides = readOverrides(company);
    overrides[projection.id] = { user_assertion: assertion };
    writeOverrides(company, overrides);
    onSaved?.(projection.id, assertion);
    onOpenChange(false);
  };

  const handleClear = () => {
    const overrides = readOverrides(company);
    delete overrides[projection.id];
    writeOverrides(company, overrides);
    onSaved?.(projection.id, null);
    onOpenChange(false);
  };

  const handleResetForm = () => {
    if (!projection.system_claim) return;
    setClaim(projection.system_claim.claim || '');
    setTargetValue(
      projection.system_claim.target_value !== null && projection.system_claim.target_value !== undefined
        ? String(projection.system_claim.target_value)
        : '',
    );
    setTargetMetric(projection.system_claim.target_metric || '');
    setResolutionDate(projection.system_claim.resolution_date || '');
    setRationale('');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-2">
          <SheetTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-rose-500" />
            Override projection
          </SheetTitle>
          <SheetDescription>
            <span className="font-mono text-xs">{projection.id}</span>
          </SheetDescription>
        </SheetHeader>

        {/* System claim card — read-only reference */}
        {sys ? (
          <div className="mt-5 rounded-xl border border-border/40 bg-muted/20 p-4">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">
              System claim (the system's view — for comparison)
            </div>
            <div className="text-sm text-foreground leading-snug mb-2">{sys.claim}</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Target:</span>{' '}
                <span className="font-mono">{sys.target_value !== null && sys.target_value !== undefined ? String(sys.target_value) : '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Resolves:</span>{' '}
                <span className="font-mono">{sys.resolution_date || '—'}</span>
              </div>
            </div>
            {sys.rationale ? (
              <div className="mt-2 pt-2 border-t border-border/30 text-[11px] text-muted-foreground italic leading-relaxed">
                {sys.rationale}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Editable form */}
        <div className="mt-4 space-y-4">
          <div className="text-[10px] uppercase tracking-wide text-rose-700 dark:text-rose-300 font-semibold">
            Your assertion
          </div>

          <div className="space-y-2">
            <Label htmlFor="claim">Claim (the falsifiable statement)</Label>
            <Textarea
              id="claim"
              value={claim}
              onChange={(e) => setClaim(e.target.value)}
              rows={3}
              placeholder="e.g. LFP/LMFP < 30% of Western BEV registrations by 2027-12-31"
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="target_value">Target value</Label>
              <Input
                id="target_value"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="0.30 or 70 or 1.5"
                className="text-sm font-mono"
              />
              <div className="text-[10px] text-muted-foreground">
                Numeric where possible. Percentages as fraction (0.30 = 30%).
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resolution_date">Resolution date</Label>
              <Input
                id="resolution_date"
                type="date"
                value={resolutionDate}
                onChange={(e) => setResolutionDate(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_metric">Target metric (what's being measured)</Label>
            <Input
              id="target_metric"
              value={targetMetric}
              onChange={(e) => setTargetMetric(e.target.value)}
              placeholder="e.g. LFP/LMFP share of Western BEV registrations"
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rationale">Why does this differ from the system view?</Label>
            <Textarea
              id="rationale"
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              rows={4}
              placeholder="Explain the company's belief or your own — what evidence supports this view?"
              className="text-sm"
            />
            <div className="text-[10px] text-muted-foreground">
              The next research cycle (confirm_assertion mode) will use this rationale to direct evidence-gathering.
            </div>
          </div>

          {/* Live divergence preview */}
          {div ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.04] p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-wide text-rose-700 dark:text-rose-300 font-semibold mb-0.5">
                    Current divergence (severity: {div.severity})
                  </div>
                  <div className="text-xs text-foreground">{div.summary}</div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <SheetFooter className="mt-6 flex-col-reverse sm:flex-row gap-2">
          {hasOverride ? (
            <Button variant="outline" onClick={handleClear} className="text-rose-600 border-rose-500/30">
              <RotateCcw className="h-4 w-4 mr-1" />
              Clear override
            </Button>
          ) : null}
          <Button variant="outline" onClick={handleResetForm} disabled={!sys}>
            Reset to system claim
          </Button>
          <Button onClick={handleSave} disabled={!claim.trim()} className="bg-rose-500 hover:bg-rose-600 text-white">
            <Save className="h-4 w-4 mr-1" />
            Save assertion
          </Button>
        </SheetFooter>

        <div className="mt-4 text-[10px] text-muted-foreground italic">
          Overrides save to your browser's local storage. Use the export button on the Bets Register page to push them back to the system on disk.
        </div>
      </SheetContent>
    </Sheet>
  );
};
