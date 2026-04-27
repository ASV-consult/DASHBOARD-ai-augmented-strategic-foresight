/**
 * CrowsNestWhatIf — what-if scenarios view (Stream 4 sidebar item).
 *
 * MVP renders the pre-baked scenarios from the bundle's `what_if_scenarios`
 * array (each one is a Markdown report from the digital_twin.py deriver).
 *
 * Stage 2 will add an interactive form: pick a driver/theme, set an override,
 * call the backend → render the live delta JSON. For now the user sees the
 * two pre-rendered scenarios + the explanation of what the layer is for.
 */
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import { Card, CardContent } from '@/components/ui/card';
import { useForesight } from '@/contexts/ForesightContext';
import { ChevronLeft, ChevronRight, FlaskConical, Sparkles } from 'lucide-react';

interface CrowsNestWhatIfProps {
  selectedScenarioId: string | null;
  onSelectScenario: (id: string | null) => void;
}

/** Markdown rendering tuned for the digital-twin reports. */
const reportMd = (text: string): React.ReactElement => {
  const components: Components = {
    h1: ({ children }) => <h1 className="text-2xl font-semibold text-foreground mt-6 mb-3 leading-tight">{children}</h1>,
    h2: ({ children }) => <h2 className="text-base font-semibold text-foreground uppercase tracking-wide mt-5 mb-2">{children}</h2>,
    h3: ({ children }) => <h3 className="text-sm font-semibold text-foreground mt-4 mb-1.5">{children}</h3>,
    p: ({ children }) => <p className="text-sm leading-relaxed text-foreground/90 mb-3">{children}</p>,
    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
    em: ({ children }) => <em className="italic text-muted-foreground">{children}</em>,
    ul: ({ children }) => <ul className="list-disc list-inside text-sm text-foreground/90 space-y-1 mb-3 ml-2">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal list-inside text-sm text-foreground/90 space-y-1 mb-3 ml-2">{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    code: ({ children }) => (
      <code className="rounded bg-muted/40 px-1 py-0.5 font-mono text-[11px]">{children}</code>
    ),
    table: ({ children }) => (
      <div className="my-3 overflow-hidden rounded-lg border border-border/40">
        <table className="w-full text-xs">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-muted/30 text-[10px] uppercase tracking-wide">{children}</thead>,
    th: ({ children }) => <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">{children}</th>,
    td: ({ children }) => <td className="border-t border-border/30 px-2 py-1.5 text-foreground/90">{children}</td>,
    hr: () => <hr className="my-4 border-border/30" />,
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-rose-500/40 pl-3 italic text-muted-foreground my-3">
        {children}
      </blockquote>
    ),
  };
  return <ReactMarkdown components={components}>{text}</ReactMarkdown>;
};

export const CrowsNestWhatIf: React.FC<CrowsNestWhatIfProps> = ({
  selectedScenarioId,
  onSelectScenario,
}) => {
  const { crowsNestData } = useForesight();
  if (!crowsNestData) return null;

  const scenarios = crowsNestData.what_if_scenarios || [];

  // Detail view
  if (selectedScenarioId) {
    const scenario = scenarios.find((s) => s.id === selectedScenarioId);
    if (scenario) {
      return (
        <div className="space-y-5">
          <button
            onClick={() => onSelectScenario(null)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-rose-500 transition"
          >
            <ChevronLeft className="h-3 w-3" />
            back to scenarios
          </button>

          <Card className="rounded-3xl border-rose-500/30 bg-card/70 shadow-sm">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-full bg-rose-500/10 p-2">
                  <FlaskConical className="h-5 w-5 text-rose-500" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-semibold">
                    What-if scenario
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">{scenario.label}</h2>
                </div>
              </div>
              <div className="prose prose-sm max-w-none">
                {reportMd(scenario.markdown)}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // List view
  return (
    <div className="space-y-5">
      {/* Hero */}
      <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04] shadow-sm">
        <CardContent className="p-6 md:p-8 space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-rose-500/10 p-2">
              <FlaskConical className="h-5 w-5 text-rose-500" />
            </div>
            <div className="flex-1 space-y-1.5">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground leading-snug">
                Stress-test the company's bets
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A what-if scenario overrides one or more drivers (or a macro theme's scenario probabilities)
                and cascades the change through the linkage layer. The output shows which projections move,
                by how much, and whether any conviction tier flips.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scenarios list */}
      {scenarios.length === 0 ? (
        <Card className="rounded-2xl border-border/40 bg-muted/10">
          <CardContent className="p-8 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <h3 className="text-sm font-semibold text-foreground">No scenarios run yet</h3>
            <p className="mt-2 text-xs text-muted-foreground max-w-md mx-auto">
              Run <code className="rounded bg-muted/40 px-1 py-0.5 font-mono text-[10px]">digital_twin.py</code> to
              produce what-if reports. They show up here automatically once the bundle is rebuilt.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Pre-rendered scenarios
          </h3>
          {scenarios.map((s) => {
            // Pull the first paragraph of the markdown as a teaser
            const firstHeadline = s.markdown.split('\n').find((l) => l.startsWith('# ')) || `# ${s.label}`;
            const teaserMatch = s.markdown.match(/Summary[^\n]*\n+\s*([^\n]+)/i)
              || s.markdown.match(/\n\n([^\n#|]{40,200})/);
            const teaser = teaserMatch ? teaserMatch[1].replace(/\*\*/g, '').trim() : '';

            return (
              <button
                key={s.id}
                onClick={() => onSelectScenario(s.id)}
                className="group flex w-full items-start gap-4 rounded-2xl border border-rose-500/20 bg-card/50 p-5 text-left transition hover:border-rose-500/40 hover:bg-rose-500/[0.04]"
              >
                <div className="rounded-full bg-rose-500/10 p-2 shrink-0">
                  <FlaskConical className="h-4 w-4 text-rose-500" />
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <h4 className="text-base font-semibold text-foreground leading-tight">
                    {firstHeadline.replace(/^# /, '')}
                  </h4>
                  {teaser ? (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{teaser}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">click to read the full delta report</p>
                  )}
                  <div className="text-[10px] uppercase tracking-wide text-rose-600 dark:text-rose-300 pt-1">
                    open report →
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40 transition group-hover:text-rose-500 shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {/* Coming-soon block */}
      <Card className="rounded-2xl border-dashed border-border/40 bg-muted/10">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-muted-foreground/60 mt-0.5 shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="text-xs font-semibold text-foreground">Interactive what-if (coming next)</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pick a driver or macro theme, set an override value, hit Simulate. The delta report renders live
                showing which dimensions and projections move. For now, run{' '}
                <code className="rounded bg-muted/40 px-1 py-0.5 font-mono text-[10px]">digital_twin.py</code>{' '}
                with custom overrides and rebuild the bundle.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
