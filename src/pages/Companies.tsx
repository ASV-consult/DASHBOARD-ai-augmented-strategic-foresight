import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CompanyRow {
  id: string;
  name: string;
  ticker: string | null;
  sector: string | null;
}

interface BundleMeta {
  company_id: string;
  financial_run_id: string | null;
  financial_completed_at: string | null;
  strategic_run_id: string | null;
  strategic_completed_at: string | null;
  macro_run_id: string | null;
  macro_completed_at: string | null;
}

export default function Companies() {
  const { profile, signOut } = useAuth();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [bundles, setBundles] = useState<Record<string, BundleMeta>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const supabase = getSupabase();
    let cancelled = false;
    (async () => {
      const { data: rows } = await supabase
        .from("companies")
        .select("id, name, ticker, sector")
        .order("name");
      if (cancelled) return;
      setCompanies((rows as CompanyRow[] | null) ?? []);

      const { data: bundleRows } = await supabase
        .from("v_company_latest_bundle")
        .select(
          "company_id, financial_run_id, financial_completed_at, strategic_run_id, strategic_completed_at, macro_run_id, macro_completed_at"
        );
      if (cancelled) return;
      const map: Record<string, BundleMeta> = {};
      ((bundleRows as BundleMeta[] | null) ?? []).forEach((r) => {
        map[r.company_id] = r;
      });
      setBundles(map);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      (c.ticker ?? "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold">ASV Consult — Foresight</h1>
            {profile && (
              <p className="text-xs text-muted-foreground">
                {profile.email} · {profile.role}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <Input
            placeholder="Search company or ticker…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm"
          />
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading…" : `${filtered.length} of ${companies.length} companies`}
          </p>
        </div>

        {!loading && companies.length === 0 && (
          <div className="rounded-lg border bg-background p-6 text-sm">
            No companies yet. Ask an admin to add one from the Streamlit console, or use
            the{" "}
            <a className="underline" href="/">
              drag-and-drop preview
            </a>
            .
          </div>
        )}

        <div className="grid gap-3">
          {filtered.map((c) => {
            const b = bundles[c.id];
            const streams = [
              { label: "Financial", when: b?.financial_completed_at },
              { label: "Strategic", when: b?.strategic_completed_at },
              { label: "Macro", when: b?.macro_completed_at },
            ];
            return (
              <Link
                key={c.id}
                to={`/company/${c.id}`}
                className="group flex items-center justify-between rounded-lg border bg-background p-4 transition hover:border-primary"
              >
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <h2 className="truncate text-base font-semibold">{c.name}</h2>
                    {c.ticker && <span className="text-xs text-muted-foreground">· {c.ticker}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{c.sector ?? "—"}</p>
                </div>
                <div className="flex gap-2 text-xs">
                  {streams.map((s) => (
                    <span
                      key={s.label}
                      className={`rounded-full px-2 py-0.5 ${
                        s.when
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {s.label}
                      {s.when ? " ✓" : " —"}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
