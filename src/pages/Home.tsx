import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Database, Upload } from "lucide-react";

export default function Home() {
  const { profile, signOut } = useAuth();

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

      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-semibold">Strategic Foresight Dashboard</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick a company from the database, or drop a JSON for a one-off view.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Link
            to="/companies"
            className="group rounded-2xl border bg-background p-8 shadow-sm transition hover:border-primary hover:shadow-md"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Database className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold">Pick from database</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Browse the companies your team has analysed. Each one shows which
              streams have data ready (Financial · Strategic · Macro).
            </p>
            <p className="mt-6 text-sm font-medium text-primary group-hover:underline">
              Open companies →
            </p>
          </Link>

          <Link
            to="/upload"
            className="group rounded-2xl border bg-background p-8 shadow-sm transition hover:border-primary hover:shadow-md"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Upload className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold">Upload a JSON</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Drop a stream bundle or run-bundle JSON for a one-off view. Useful
              for ad-hoc analyses that aren&apos;t in the database yet.
            </p>
            <p className="mt-6 text-sm font-medium text-primary group-hover:underline">
              Open uploader →
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
