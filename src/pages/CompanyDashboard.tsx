import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ForesightProvider, useForesight } from "@/contexts/ForesightContext";
import { Dashboard } from "@/components/Dashboard";
import { useCompanyBundle } from "@/hooks/useCompanyBundle";
import { useStreamRuns } from "@/hooks/useStreamRuns";
import { RunSelector } from "@/components/RunSelector";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

type Stream = "financial" | "strategic" | "macro";

function CompanyDashboardContent() {
  const { id } = useParams<{ id: string }>();
  const { profile, signOut } = useAuth();

  const [overrides, setOverrides] = useState<Record<Stream, string | null>>({
    financial: null,
    strategic: null,
    macro: null,
  });

  const { loading, error, bundle } = useCompanyBundle(id, {
    financialRunId: overrides.financial,
    strategicRunId: overrides.strategic,
    macroRunId: overrides.macro,
  });
  const { runs, loading: runsLoading } = useStreamRuns(id);
  const { isLoaded } = useForesight();

  const onChange = (stream: Stream, runId: string | null) =>
    setOverrides((prev) => ({ ...prev, [stream]: runId }));

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading bundle…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-2">
          <h1 className="text-xl font-semibold">Could not load company</h1>
          <p className="text-sm text-destructive">{error}</p>
          <Link to="/companies" className="text-sm underline">
            Back to companies
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2">
          <div className="flex items-center gap-3">
            <Link to="/companies" className="text-sm text-muted-foreground hover:underline">
              ← Companies
            </Link>
            <div>
              <h1 className="text-base font-semibold">{bundle?.name ?? "Unknown company"}</h1>
              <p className="text-xs text-muted-foreground">
                {bundle?.ticker ?? "—"} · {profile?.email}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-3">
          <RunSelector
            runs={runsLoading ? [] : runs}
            value={overrides}
            onChange={onChange}
          />
        </div>
      </header>

      {isLoaded ? (
        <Dashboard />
      ) : (
        <div className="mx-auto max-w-2xl p-8 text-center text-sm text-muted-foreground">
          No stream data yet for this company. Trigger a run from the Streamlit console;
          the dashboard will pick it up automatically.
        </div>
      )}
    </div>
  );
}

export default function CompanyDashboardPage() {
  return (
    <ForesightProvider>
      <CompanyDashboardContent />
    </ForesightProvider>
  );
}
