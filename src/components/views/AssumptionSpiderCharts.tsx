import { useMemo, useState } from 'react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { AssumptionHealth, Signal } from '@/types/foresight';
import { getSignalScore } from '@/lib/signal-utils';
import { getAssumptionDisplayLabel } from '@/lib/foresight-utils';

export interface AssumptionSpiderItem {
  id: string;
  statement: string;
  category: string;
  supports_building_blocks: string[];
  health?: AssumptionHealth;
  challengingSignals: Signal[];
  validatingSignals: Signal[];
  displayLabel?: string;
}

type RadarLens = 'overview' | 'value_creation' | 'direction_and_positioning' | 'value_defence';
type RadarMode = 'building_blocks' | 'assumptions';

interface AssumptionSpiderChartsProps {
  assumptions: AssumptionSpiderItem[];
  title?: string;
  subtitle?: string;
  onAssumptionClick?: (assumption: AssumptionSpiderItem) => void;
  defaultMode?: RadarMode;
}

const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

const formatBuildingBlock = (block: string) => {
  const labels: Record<string, string> = {
    direction_and_positioning: 'Direction & Positioning',
    value_creation: 'Value Creation',
    value_defence: 'Strategic Defence',
    Strategic_defence: 'Strategic Defence',
    Strategic_defense: 'Strategic Defence',
    key_levers: 'Key Levers',
    cross_cutting: 'Cross-cutting',
    overview: 'Overview',
  };
  return labels[block] || block.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

const normalizeBuildingBlockKey = (block?: string) => {
  if (!block) return 'cross_cutting';
  if (block === 'Strategic_defence' || block === 'Strategic_defense') return 'value_defence';
  return block;
};

const colorByBlock: Record<string, string> = {
  value_creation: '#2563eb',
  direction_and_positioning: '#06b6d4',
  value_defence: '#16a34a',
  overview: '#f97316',
  cross_cutting: '#7c3aed',
};

const lensOptions: Array<{ value: RadarLens; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'value_creation', label: 'Value Creation' },
  { value: 'direction_and_positioning', label: 'Direction & Positioning' },
  { value: 'value_defence', label: 'Strategic Defence' },
];

const toNetImpact = (assumption: AssumptionSpiderItem) => {
  if (typeof assumption.health?.net_impact_score === 'number') return assumption.health.net_impact_score;
  const positive = assumption.validatingSignals.reduce((sum, signal) => sum + getSignalScore(signal), 0);
  const negative = assumption.challengingSignals.reduce((sum, signal) => sum + getSignalScore(signal), 0);
  return positive - negative;
};

const toNormalizedImpact = (assumption: AssumptionSpiderItem) => {
  const netImpact = toNetImpact(assumption);
  return clampPercent(((netImpact + 5) / 10) * 100);
};

const assumptionSignalTotals = (assumption: AssumptionSpiderItem) => {
  const positive = assumption.health?.positive_signals ?? assumption.validatingSignals.length;
  const negative = assumption.health?.negative_signals ?? assumption.challengingSignals.length;
  return {
    positive,
    negative,
    total: positive + negative,
  };
};

export function AssumptionSpiderCharts({
  assumptions,
  title = 'Assumptions Comparison Spider',
  subtitle = 'Compare building blocks and individual assumption score footprint. Higher score expands wider on the spider.',
  onAssumptionClick,
  defaultMode = 'assumptions',
}: AssumptionSpiderChartsProps) {
  const [radarLens, setRadarLens] = useState<RadarLens>('overview');
  const [radarMode, setRadarMode] = useState<RadarMode>(defaultMode);
  const [selectedAssumption, setSelectedAssumption] = useState<AssumptionSpiderItem | null>(null);

  const lensAssumptions = useMemo(() => {
    if (radarLens === 'overview') return assumptions;
    return assumptions.filter((assumption) => {
      const primaryBlock = normalizeBuildingBlockKey(assumption.supports_building_blocks?.[0]);
      return primaryBlock === radarLens;
    });
  }, [assumptions, radarLens]);

  const radarGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        block: string;
        label: string;
        assumptionCount: number;
        netImpactTotal: number;
        confidenceTotal: number;
        signalVolumeTotal: number;
        downsideTotal: number;
        stabilityTotal: number;
      }
    >();

    assumptions.forEach((assumption) => {
      const block = normalizeBuildingBlockKey(assumption.supports_building_blocks?.[0]);
      const key = block.replace(/[^a-zA-Z0-9_]/g, '_');
      const existing = groups.get(block) || {
        key,
        block,
        label: formatBuildingBlock(block),
        assumptionCount: 0,
        netImpactTotal: 0,
        confidenceTotal: 0,
        signalVolumeTotal: 0,
        downsideTotal: 0,
        stabilityTotal: 0,
      };

      const { positive, negative, total } = assumptionSignalTotals(assumption);
      const downside = total > 0 ? (negative / total) * 100 : 50;
      const stability = total > 0 ? (1 - Math.abs(positive - negative) / total) * 100 : 50;
      const confidence =
        typeof assumption.health?.confidence_score === 'number'
          ? assumption.health.confidence_score * 100
          : 50;

      existing.assumptionCount += 1;
      existing.netImpactTotal += toNetImpact(assumption);
      existing.confidenceTotal += confidence;
      existing.signalVolumeTotal += assumption.health?.signal_volume ?? total;
      existing.downsideTotal += downside;
      existing.stabilityTotal += stability;
      groups.set(block, existing);
    });

    const rows = Array.from(groups.values());
    const maxSignalVolume = Math.max(
      ...rows.map((row) => row.signalVolumeTotal / Math.max(row.assumptionCount, 1)),
      1,
    );

    return rows
      .map((row) => {
        const count = Math.max(row.assumptionCount, 1);
        const avgNetImpact = row.netImpactTotal / count;
        const avgSignalVolume = row.signalVolumeTotal / count;
        return {
          key: row.key,
          block: row.block,
          label: row.label,
          assumptionCount: row.assumptionCount,
          confidence: clampPercent(row.confidenceTotal / count),
          signalDensity: clampPercent((avgSignalVolume / maxSignalVolume) * 100),
          netImpact: clampPercent(((avgNetImpact + 5) / 10) * 100),
          downsidePressure: clampPercent(row.downsideTotal / count),
          stability: clampPercent(row.stabilityTotal / count),
        };
      })
      .filter((row) => row.assumptionCount > 0);
  }, [assumptions]);

  const overallBenchmark = useMemo(() => {
    if (radarGroups.length === 0) return null;
    const weightedAverage = (selector: (row: (typeof radarGroups)[number]) => number) => {
      const totalWeight = radarGroups.reduce((sum, row) => sum + row.assumptionCount, 0);
      if (totalWeight === 0) return 0;
      const weighted = radarGroups.reduce((sum, row) => sum + selector(row) * row.assumptionCount, 0);
      return weighted / totalWeight;
    };

    return {
      key: 'overview_benchmark',
      block: 'overview',
      label: 'Overall Benchmark',
      assumptionCount: assumptions.length,
      confidence: weightedAverage((row) => row.confidence),
      signalDensity: weightedAverage((row) => row.signalDensity),
      netImpact: weightedAverage((row) => row.netImpact),
      downsidePressure: weightedAverage((row) => row.downsidePressure),
      stability: weightedAverage((row) => row.stability),
    };
  }, [assumptions.length, radarGroups]);

  const displayGroups = useMemo(() => {
    const orderedBlocks = ['value_creation', 'direction_and_positioning', 'value_defence'];
    const ordered = orderedBlocks
      .map((block) => radarGroups.find((row) => row.block === block))
      .filter(Boolean) as typeof radarGroups;

    if (radarLens === 'overview') return ordered;
    const selected = ordered.find((row) => row.block === radarLens);
    if (!selected) return [];
    return overallBenchmark ? [selected, overallBenchmark] : [selected];
  }, [radarGroups, radarLens, overallBenchmark]);

  const legendGroups = useMemo(() => {
    const orderedBlocks = ['value_creation', 'direction_and_positioning', 'value_defence'];
    const ordered = orderedBlocks
      .map((block) => radarGroups.find((row) => row.block === block))
      .filter(Boolean) as typeof radarGroups;

    if (radarLens !== 'overview' && overallBenchmark) {
      return [...ordered, overallBenchmark];
    }
    return ordered;
  }, [radarGroups, radarLens, overallBenchmark]);

  const buildingBlockRadarData = useMemo(() => {
    const dimensions = [
      { metric: 'Confidence', selector: (group: (typeof displayGroups)[number]) => group.confidence },
      { metric: 'Signal Density', selector: (group: (typeof displayGroups)[number]) => group.signalDensity },
      { metric: 'Net Impact', selector: (group: (typeof displayGroups)[number]) => group.netImpact },
      { metric: 'Downside Pressure', selector: (group: (typeof displayGroups)[number]) => group.downsidePressure },
      { metric: 'Stability', selector: (group: (typeof displayGroups)[number]) => group.stability },
    ];

    return dimensions.map((dimension) => {
      const row: Record<string, string | number> = { metric: dimension.metric };
      displayGroups.forEach((group) => {
        row[group.key] = Math.round(dimension.selector(group));
      });
      return row;
    });
  }, [displayGroups]);

  const assumptionScoreRows = useMemo(() => {
    return [...lensAssumptions]
      .map((assumption) => {
        const { positive, negative, total } = assumptionSignalTotals(assumption);
        const score = toNormalizedImpact(assumption);
        return {
          assumption,
          score,
          positive,
          negative,
          total,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [lensAssumptions]);

  const assumptionScoreRadarData = useMemo(() => {
    return assumptionScoreRows.map((row) => ({
      metric: row.assumption.id,
      label:
        row.assumption.displayLabel || getAssumptionDisplayLabel(row.assumption.id, row.assumption.statement, 4),
      score: Math.round(row.score),
    }));
  }, [assumptionScoreRows]);

  const assumptionScoreRowMap = useMemo(() => {
    return new Map(assumptionScoreRows.map((row) => [row.assumption.id, row]));
  }, [assumptionScoreRows]);

  const activeLensLabel =
    lensOptions.find((option) => option.value === radarLens)?.label || 'Overview';

  const currentAssumptionCount =
    radarMode === 'building_blocks' ? lensAssumptions.length : assumptionScoreRows.length;

  return (
    <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm">
      <Dialog open={!!selectedAssumption} onOpenChange={(open) => !open && setSelectedAssumption(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {selectedAssumption?.id}
              </Badge>
              <span>Assumption Spider Detail</span>
            </DialogTitle>
          </DialogHeader>
          {selectedAssumption && (
            <div className="space-y-4 text-sm">
              <p className="text-foreground">{selectedAssumption.statement}</p>
              <p className="text-xs text-muted-foreground">
                {selectedAssumption.displayLabel || getAssumptionDisplayLabel(selectedAssumption.id, selectedAssumption.statement, 4)}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">Score footprint</p>
                  <p className="text-lg font-semibold text-foreground">
                    {Math.round(toNormalizedImpact(selectedAssumption))}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">Positive signals</p>
                  <p className="text-lg font-semibold text-emerald-600">
                    {assumptionSignalTotals(selectedAssumption).positive}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">Negative signals</p>
                  <p className="text-lg font-semibold text-destructive">
                    {assumptionSignalTotals(selectedAssumption).negative}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(selectedAssumption.supports_building_blocks || []).map((block) => (
                  <Badge key={block} variant="secondary" className="text-xs">
                    {formatBuildingBlock(block)}
                  </Badge>
                ))}
                <Badge variant="outline" className="text-xs capitalize">
                  Type: {selectedAssumption.category}
                </Badge>
              </div>
              {onAssumptionClick && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    onAssumptionClick(selectedAssumption);
                  }}
                >
                  Open Full Assumption Detail
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CardContent className="p-4 sm:p-5">
        <div className="space-y-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Assumption visual
              </p>
              <CardTitle className="mt-2 text-lg">{title}</CardTitle>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={radarMode === 'building_blocks' ? 'default' : 'outline'}
                className="h-8 rounded-full px-3 text-[11px]"
                onClick={() => setRadarMode('building_blocks')}
              >
                Blocks
              </Button>
              <Button
                type="button"
                size="sm"
                variant={radarMode === 'assumptions' ? 'default' : 'outline'}
                className="h-8 rounded-full px-3 text-[11px]"
                onClick={() => setRadarMode('assumptions')}
              >
                Assumption scores
              </Button>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px]">
                In view {currentAssumptionCount}
              </Badge>
            </div>
          </div>

          <div className="rounded-[26px] border border-border/50 bg-background/72 p-3 sm:p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                {lensOptions.map((option) => {
                  const isActive = radarLens === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRadarLens(option.value)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-[11px] font-medium transition',
                        isActive
                          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                          : 'border-border/60 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px]">
                Lens {activeLensLabel}
              </Badge>
            </div>

            <div className="mt-4 min-w-0 space-y-4">
            {radarMode === 'building_blocks' ? (
              <>
                {displayGroups.length < 1 ? (
                  <p className="rounded-2xl border border-border/50 bg-background/72 p-6 text-sm text-muted-foreground">
                    No scored assumptions available for this view.
                  </p>
                ) : (
                  <div className="h-[540px] w-full rounded-[26px] border border-border/50 bg-background/72 p-2 xl:h-[620px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={buildingBlockRadarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="metric" />
                        <PolarRadiusAxis domain={[0, 100]} tickCount={6} />
                        <Tooltip />
                        {displayGroups.map((group) => {
                          const color = colorByBlock[group.block] || colorByBlock.cross_cutting;
                          return (
                            <Radar
                              key={group.key}
                              name={group.label}
                              dataKey={group.key}
                              stroke={color}
                              fill={color}
                              fillOpacity={radarLens === group.block ? 0.34 : 0.18}
                              strokeWidth={radarLens === group.block ? 3 : 2}
                            />
                          );
                        })}
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            ) : (
              <>
                {assumptionScoreRows.length < 1 ? (
                  <p className="rounded-2xl border border-border/50 bg-background/72 p-6 text-sm text-muted-foreground">
                    No assumptions match this lens.
                  </p>
                ) : (
                  <div className="h-[620px] w-full rounded-[26px] border border-border/50 bg-background/72 p-2 xl:h-[700px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={assumptionScoreRadarData}>
                        <PolarGrid />
                        <PolarAngleAxis
                          dataKey="metric"
                          tick={(tickProps: any) => {
                            const assumptionId = String(tickProps?.payload?.value || '');
                            const scoreRow = assumptionScoreRowMap.get(assumptionId);
                            const label = String(
                              tickProps?.payload?.payload?.label ||
                                scoreRow?.assumption.displayLabel ||
                                assumptionId,
                            );
                            return (
                              <text
                                x={tickProps.x}
                                y={tickProps.y}
                                textAnchor="middle"
                                className="cursor-pointer fill-muted-foreground text-[11px] transition hover:fill-foreground"
                                onClick={() => {
                                  if (scoreRow) {
                                    setSelectedAssumption(scoreRow.assumption);
                                  }
                                }}
                              >
                                {(() => {
                                  const match = label.match(/^(.*)\(([^)]+)\)$/);
                                  const titlePart = (match?.[1] || label).trim();
                                  const idPart = match?.[2]?.trim();
                                  const compactTitle =
                                    titlePart.length > 28 ? `${titlePart.slice(0, 25).trim()}...` : titlePart;
                                  return (
                                    <>
                                      <tspan x={tickProps.x} dy="-2">
                                        {compactTitle}
                                      </tspan>
                                      {idPart ? (
                                        <tspan x={tickProps.x} dy="12" className="fill-slate-500 text-[10px]">
                                          ({idPart})
                                        </tspan>
                                      ) : null}
                                    </>
                                  );
                                })()}
                              </text>
                            );
                          }}
                        />
                        <PolarRadiusAxis domain={[0, 100]} tickCount={6} />
                        <Tooltip />
                        <Radar
                          name="Assumption score footprint"
                          dataKey="score"
                          stroke="#2563eb"
                          fill="#2563eb"
                          fillOpacity={0.25}
                          strokeWidth={2.5}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="rounded-[26px] border border-primary/25 bg-background p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Assumption drill-down
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        Click any assumption to inspect statement, score and signal mix
                      </p>
                    </div>
                    <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px]">
                      {assumptionScoreRows.length} mapped assumptions
                    </Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {assumptionScoreRows.map((row) => (
                      <button
                        key={row.assumption.id}
                        type="button"
                        className="rounded-2xl border border-border/60 bg-background p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
                        onClick={() => setSelectedAssumption(row.assumption)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className="font-mono">{row.assumption.id}</Badge>
                          <span className="rounded-full border border-primary/30 px-2 py-0.5 text-xs font-semibold text-primary">
                            Score {Math.round(row.score)}
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-semibold leading-5 text-foreground">
                          {row.assumption.displayLabel || getAssumptionDisplayLabel(row.assumption.id, row.assumption.statement, 4)}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.assumption.statement}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div className="rounded-xl border border-emerald-500/30 px-3 py-2">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Positive</p>
                            <p className="mt-1 text-lg font-semibold text-emerald-600">{row.positive}</p>
                          </div>
                          <div className="rounded-xl border border-destructive/25 px-3 py-2">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Negative</p>
                            <p className="mt-1 text-lg font-semibold text-destructive">{row.negative}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Total signals {row.total}</span>
                          <span className="font-medium text-foreground">Open detail</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            </div>

            <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              {radarMode === 'building_blocks' ? (
                <div className="flex flex-wrap gap-2">
                  {legendGroups.map((group) => {
                    const color = colorByBlock[group.block] || colorByBlock.cross_cutting;
                    return (
                      <button
                        key={group.key}
                        type="button"
                        className={cn(
                          'inline-flex items-center gap-2 rounded-full border-2 bg-background px-3 py-1 text-[11px] text-foreground',
                          radarLens === group.block && 'shadow-sm',
                        )}
                        style={{ borderColor: color }}
                        onClick={() => {
                          if (group.block === 'overview') {
                            setRadarLens('overview');
                            return;
                          }
                          if (
                            group.block === 'value_creation' ||
                            group.block === 'direction_and_positioning' ||
                            group.block === 'value_defence'
                          ) {
                            setRadarLens(group.block);
                          }
                        }}
                      >
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <span>{group.label}</span>
                        <span className="text-muted-foreground">({group.assumptionCount})</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Switch the lens to isolate one building block, then click an assumption label or card to inspect its score and signal mix.
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
