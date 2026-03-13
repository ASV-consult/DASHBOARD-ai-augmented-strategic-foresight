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

export interface AssumptionSpiderItem {
  id: string;
  statement: string;
  category: string;
  supports_building_blocks: string[];
  health?: AssumptionHealth;
  challengingSignals: Signal[];
  validatingSignals: Signal[];
}

type RadarLens = 'overview' | 'value_creation' | 'direction_and_positioning' | 'value_defence';
type RadarMode = 'building_blocks' | 'assumptions';

interface AssumptionSpiderChartsProps {
  assumptions: AssumptionSpiderItem[];
  title?: string;
  subtitle?: string;
  onAssumptionClick?: (assumption: AssumptionSpiderItem) => void;
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
}: AssumptionSpiderChartsProps) {
  const [radarLens, setRadarLens] = useState<RadarLens>('overview');
  const [radarMode, setRadarMode] = useState<RadarMode>('building_blocks');
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
        <div className="grid gap-5 xl:grid-cols-[270px_minmax(0,1fr)] xl:items-start">
          <div className="space-y-4 rounded-[26px] border border-border/50 bg-background/72 p-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Assumption visual
              </p>
              <CardTitle className="mt-2 text-lg">{title}</CardTitle>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {lensOptions.map((option) => {
                const isActive = radarLens === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRadarLens(option.value)}
                    className={cn(
                      'rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition',
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border/60 bg-card/80 text-muted-foreground hover:border-primary/40 hover:text-foreground',
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border border-border/50 bg-card/78 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Spider mode
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={radarMode === 'building_blocks' ? 'default' : 'outline'}
                  className="h-8 rounded-full px-3 text-[11px]"
                  onClick={() => setRadarMode('building_blocks')}
                >
                  Building Blocks
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={radarMode === 'assumptions' ? 'default' : 'outline'}
                  className="h-8 rounded-full px-3 text-[11px]"
                  onClick={() => setRadarMode('assumptions')}
                >
                  Assumption Scores
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border/50 bg-card/78 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Lens</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{activeLensLabel}</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-card/78 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">In view</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{currentAssumptionCount}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card/78 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {radarMode === 'building_blocks' ? 'Building block legend' : 'How to read this'}
              </p>
              {radarMode === 'building_blocks' ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {legendGroups.map((group) => {
                    const color = colorByBlock[group.block] || colorByBlock.cross_cutting;
                    return (
                      <button
                        key={group.key}
                        type="button"
                        className={cn(
                          'inline-flex items-center gap-2 rounded-full border-2 bg-background/85 px-3 py-1 text-[11px] text-foreground',
                          radarLens === group.block && 'bg-primary/10',
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
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <p>Switch the lens to isolate one building block.</p>
                  <p>Click any assumption label or card to inspect its score and signal mix.</p>
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 space-y-4">
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
                                {assumptionId}
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

                <div className="rounded-2xl border border-border/50 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Click any assumption to inspect statement, score and signal mix
                  </p>
                  <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {assumptionScoreRows.map((row) => (
                      <button
                        key={row.assumption.id}
                        type="button"
                        className="rounded-xl border border-border/60 bg-background/80 p-3 text-left transition hover:border-primary/40"
                        onClick={() => setSelectedAssumption(row.assumption)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className="font-mono">{row.assumption.id}</Badge>
                          <span className="text-xs font-semibold text-primary">{Math.round(row.score)}</span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs text-foreground">{row.assumption.statement}</p>
                        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span>Signals: {row.total}</span>
                          <span className="text-emerald-600">+{row.positive}</span>
                          <span className="text-destructive">-{row.negative}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
