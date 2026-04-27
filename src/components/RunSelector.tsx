import { useMemo } from "react";
import type { StreamRunSummary } from "@/hooks/useStreamRuns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RunSelectorProps {
  runs: StreamRunSummary[];
  value: Record<"financial" | "strategic" | "macro", string | null>;
  onChange: (stream: "financial" | "strategic" | "macro", runId: string | null) => void;
}

const STREAMS: Array<"financial" | "strategic" | "macro"> = ["financial", "strategic", "macro"];

function fmt(ts: string | null): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toISOString().slice(0, 10);
  } catch {
    return ts;
  }
}

export function RunSelector({ runs, value, onChange }: RunSelectorProps) {
  const byStream = useMemo(() => {
    const out: Record<string, StreamRunSummary[]> = { financial: [], strategic: [], macro: [] };
    for (const r of runs) if (out[r.stream]) out[r.stream].push(r);
    return out;
  }, [runs]);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-background p-3">
      {STREAMS.map((stream) => {
        const list = byStream[stream] ?? [];
        const current = value[stream] ?? "latest";
        return (
          <div key={stream} className="min-w-[220px] space-y-1">
            <div className="text-xs font-medium uppercase text-muted-foreground">{stream}</div>
            <Select
              value={current}
              onValueChange={(v) => onChange(stream, v === "latest" ? null : v)}
              disabled={list.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={list.length ? "Select run" : "No runs"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest{list[0] ? ` (${fmt(list[0].completed_at)})` : ""}</SelectItem>
                {list.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {fmt(r.completed_at)}
                    {r.run_label ? ` · ${r.run_label}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}
