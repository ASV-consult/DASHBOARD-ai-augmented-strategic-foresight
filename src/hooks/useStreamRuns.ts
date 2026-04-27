import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

export interface StreamRunSummary {
  id: string;
  stream: string;
  status: string;
  run_label: string | null;
  completed_at: string | null;
  created_at: string;
}

export function useStreamRuns(companyId: string | undefined) {
  const [runs, setRuns] = useState<StreamRunSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    const supabase = getSupabase();
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("stream_runs")
        .select("id, stream, status, run_label, completed_at, created_at")
        .eq("company_id", companyId)
        .eq("status", "succeeded")
        .order("completed_at", { ascending: false })
        .limit(50);
      if (!cancelled) {
        setRuns((data as StreamRunSummary[] | null) ?? []);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  return { runs, loading };
}
