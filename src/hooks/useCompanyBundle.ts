import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useForesight } from "@/contexts/ForesightContext";
import type { ForesightData } from "@/types/foresight";
import type { FinancialAnalysisData } from "@/types/financial";
import type { SharePriceAnalysisData } from "@/types/share-price";
import type { MacroDashboardData } from "@/types/macro";

interface BundleRow {
  company_id: string;
  name: string;
  ticker: string | null;
  sector: string | null;
  financial_payload: Record<string, unknown> | null;
  financial_run_id: string | null;
  financial_completed_at: string | null;
  strategic_payload: Record<string, unknown> | null;
  strategic_run_id: string | null;
  strategic_completed_at: string | null;
  macro_payload: Record<string, unknown> | null;
  macro_run_id: string | null;
  macro_completed_at: string | null;
}

interface StreamOverrides {
  financialRunId?: string | null;
  strategicRunId?: string | null;
  macroRunId?: string | null;
}

/**
 * Fetches the latest bundle for a company (or specific historical runs per
 * stream) and pushes the payloads into ForesightContext.
 *
 * The financial stream carries both financial-analysis and share-price slices.
 * If the financial_payload contains a `share_price_analysis` key, we split it
 * into the dedicated share-price context slot. Otherwise the whole payload is
 * treated as the financial-analysis slice.
 */
export function useCompanyBundle(companyId: string | undefined, overrides: StreamOverrides = {}) {
  const {
    setData,
    setFinancialData,
    setSharePriceData,
    setMacroData,
    resetStreams,
  } = useForesight();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bundle, setBundle] = useState<BundleRow | null>(null);

  useEffect(() => {
    if (!companyId) return;
    const supabase = getSupabase();
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      const { data: base, error: baseError } = await supabase
        .from("v_company_latest_bundle")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();

      if (cancelled) return;
      if (baseError) {
        setError(baseError.message);
        setLoading(false);
        return;
      }

      let row = (base as BundleRow | null) ?? null;

      const overrideIds = [
        { id: overrides.financialRunId, key: "financial" as const },
        { id: overrides.strategicRunId, key: "strategic" as const },
        { id: overrides.macroRunId, key: "macro" as const },
      ].filter((o) => o.id);

      for (const { id, key } of overrideIds) {
        const { data: runRow, error: runError } = await supabase
          .from("stream_runs")
          .select("id, payload, completed_at")
          .eq("id", id)
          .maybeSingle();
        if (runError) {
          setError(runError.message);
          setLoading(false);
          return;
        }
        if (row && runRow) {
          row = {
            ...row,
            [`${key}_payload`]: runRow.payload,
            [`${key}_run_id`]: runRow.id,
            [`${key}_completed_at`]: runRow.completed_at,
          } as BundleRow;
        }
      }

      if (!row) {
        resetStreams();
        setBundle(null);
        setLoading(false);
        return;
      }

      setBundle(row);

      if (row.financial_payload) {
        const fp = row.financial_payload as Record<string, unknown>;
        const sp = fp.share_price_analysis as SharePriceAnalysisData | undefined;
        if (sp) {
          setSharePriceData(sp);
          const fa = (fp.financial_analysis as FinancialAnalysisData | undefined) ?? null;
          setFinancialData(fa ?? (fp as unknown as FinancialAnalysisData));
        } else {
          setFinancialData(fp as unknown as FinancialAnalysisData);
          setSharePriceData(null);
        }
      } else {
        setFinancialData(null);
        setSharePriceData(null);
      }

      setData((row.strategic_payload as ForesightData | null) ?? null);
      setMacroData((row.macro_payload as MacroDashboardData | null) ?? null);

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [companyId, overrides.financialRunId, overrides.strategicRunId, overrides.macroRunId]);

  return { loading, error, bundle };
}
