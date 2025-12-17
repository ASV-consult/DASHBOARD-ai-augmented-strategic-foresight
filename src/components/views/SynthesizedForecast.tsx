import { useMemo, useState } from 'react';
import { useForesight } from '@/contexts/ForesightContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SignalDetailDialog } from '@/components/SignalDetailDialog';
import { Assumption, AssumptionHealth, Signal } from '@/types/foresight';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Target,
  Shield,
  Clock,
  Activity,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getHealthColor, getStatusBadgeVariant } from '@/lib/foresight-utils';

type AssumptionHealthItem = Assumption & {
  positiveScore: number;
  negativeScore: number;
  netScore: number;
  status: 'strengthening' | 'weakening' | 'stable';
  healthPercent: number;
  threatCount: number;
  opportunityCount: number;
  validatingSignals: Signal[];
  challengingSignals: Signal[];
  signalCount: number;
  health?: AssumptionHealth;
};

export function SynthesizedForecast() {
  const { data, coreAssumptions, allSignals, threats, opportunities, earlyWarnings, threatIds, opportunityIds, warningIds } = useForesight();
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [statusDialog, setStatusDialog] = useState<{
    status: 'strengthening' | 'stable' | 'weakening';
    items: AssumptionHealthItem[];
  } | null>(null);
  const [assumptionDialog, setAssumptionDialog] = useState<AssumptionHealthItem | null>(null);
  
  if (!data) return null;

  const core_assumptions = coreAssumptions;
  const early_warnings = earlyWarnings;
  const selectedHealth = assumptionDialog?.health;
  const selectedColors = getHealthColor(selectedHealth);

  const assumptionHealthEntries = useMemo(() => {
    const rootHealth = data?.assumption_health || [];
    const nestedHealth = data?.strategy_context?.assumption_health || [];
    return [...rootHealth, ...nestedHealth];
  }, [data?.assumption_health, data?.strategy_context?.assumption_health]);

  const assumptionHealthMap = useMemo(() => {
    const map = new Map<string, AssumptionHealth>();
    assumptionHealthEntries.forEach(h => map.set(h.assumption_id, h));
    return map;
  }, [assumptionHealthEntries]);

  // Calculate assumption strength/weakness with clearer metrics
  const assumptionHealth = useMemo(() => {
    return core_assumptions.map(assumption => {
      const health = assumptionHealthMap.get(assumption.id);
      const signals = allSignals.filter(s => 
        s.related_assumption_id === assumption.id || s.assumption_id === assumption.id
      );
      
      const validatingSignals = signals.filter(s => s.impact_direction === 'Positive');
      const challengingSignals = signals.filter(s => s.impact_direction === 'Negative');
      
      let positiveScore = 0;
      let negativeScore = 0;
      
      signals.forEach(s => {
        const score = s.outlier_flags?.combined_score || s.impact_score || 0;
        if (s.impact_direction === 'Positive') {
          positiveScore += score;
        } else if (s.impact_direction === 'Negative') {
          negativeScore += score;
        }
      });

      const threatCount = threats.filter(t => t.related_assumption_id === assumption.id || t.assumption_id === assumption.id).length;
      const opportunityCount = opportunities.filter(o => o.related_assumption_id === assumption.id || o.assumption_id === assumption.id).length;

      const netScore = positiveScore - negativeScore;
      const totalScore = positiveScore + negativeScore;
      
      // Calculate health percentage (0-100, 50 being neutral)
      let healthPercent = 50;
      if (totalScore > 0) {
        healthPercent = Math.round((positiveScore / totalScore) * 100);
      }
      
      let status: 'strengthening' | 'weakening' | 'stable';
      if (totalScore === 0) {
        status = 'stable';
      } else if (netScore > totalScore * 0.2) {
        status = 'strengthening';
      } else if (netScore < -totalScore * 0.2) {
        status = 'weakening';
      } else {
        status = 'stable';
      }

      return {
        ...assumption,
        positiveScore,
        negativeScore,
        netScore,
        status,
        healthPercent,
        threatCount,
        opportunityCount,
        validatingSignals,
        challengingSignals,
        signalCount: signals.length,
        health,
      };
    }).sort((a, b) => Math.abs(b.netScore) - Math.abs(a.netScore));
  }, [core_assumptions, allSignals, threats, opportunities, assumptionHealthMap]);

  // Get top signals to highlight
  const topSignals = useMemo(() => {
    return [...allSignals]
      .sort((a, b) => (b.outlier_flags?.combined_score || b.impact_score || 0) - (a.outlier_flags?.combined_score || a.impact_score || 0))
      .slice(0, 6);
  }, [allSignals]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'strengthening': 
        return { 
          icon: <TrendingUp className="h-4 w-4" />, 
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/30'
        };
      case 'weakening': 
        return { 
          icon: <TrendingDown className="h-4 w-4" />, 
          color: 'text-destructive',
          bgColor: 'bg-destructive/10',
          borderColor: 'border-destructive/30'
        };
      default: 
        return { 
          icon: <Minus className="h-4 w-4" />, 
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
          borderColor: 'border-border'
        };
    }
  };

  // Calculate overall health
  const overallHealth = useMemo(() => {
    const strengthening = assumptionHealth.filter(a => a.status === 'strengthening').length;
    const weakening = assumptionHealth.filter(a => a.status === 'weakening').length;
    const total = assumptionHealth.length;
    return {
      strengthening,
      weakening,
      stable: total - strengthening - weakening,
      healthScore: total > 0 ? Math.round(((strengthening * 2 + (total - strengthening - weakening)) / (total * 2)) * 100) : 50
    };
  }, [assumptionHealth]);

  const handleSignalClick = (signalId: string) => {
    const signal = allSignals.find(s => s.signal_id === signalId);
    if (signal) {
      setSelectedSignal(signal);
    }
  };

  return (
    <div className="space-y-6">
      <SignalDetailDialog
        signal={selectedSignal}
        onClose={() => setSelectedSignal(null)}
        threatIds={threatIds}
        opportunityIds={opportunityIds}
        warningIds={warningIds}
      />

      {/* Strategic Health Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Overall Score Card */}
        <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm backdrop-blur lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Strategic Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-4">
              <div className="relative">
                <div 
                  className="w-32 h-32 rounded-full border-8 flex items-center justify-center"
                  style={{
                    borderColor: overallHealth.healthScore >= 60 
                      ? 'hsl(142, 76%, 36%)' 
                      : overallHealth.healthScore >= 40 
                        ? 'hsl(45, 93%, 47%)' 
                        : 'hsl(0, 84%, 60%)'
                  }}
                >
                  <span className="text-4xl font-bold">{overallHealth.healthScore}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Based on assumption stability and signal distribution
            </p>
          </CardContent>
        </Card>

        {/* Assumption Status Breakdown */}
        <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm backdrop-blur lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Assumption Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <button
                type="button"
                className="text-center p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 w-full shadow-sm hover:border-emerald-500/60 transition"
                onClick={() => setStatusDialog({
                  status: 'strengthening',
                  items: assumptionHealth.filter(a => a.status === 'strengthening'),
                })}
              >
                <TrendingUp className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-emerald-400">{overallHealth.strengthening}</div>
                <div className="text-xs text-muted-foreground">Strengthening</div>
                <p className="text-xs text-muted-foreground mt-1">More validating signals</p>
              </button>
              <button
                type="button"
                className="text-center p-3 rounded-2xl bg-muted border border-border w-full shadow-sm hover:border-foreground/30 transition"
                onClick={() => setStatusDialog({
                  status: 'stable',
                  items: assumptionHealth.filter(a => a.status === 'stable'),
                })}
              >
                <Minus className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <div className="text-2xl font-bold">{overallHealth.stable}</div>
                <div className="text-xs text-muted-foreground">Stable</div>
                <p className="text-xs text-muted-foreground mt-1">Balanced signals</p>
              </button>
              <button
                type="button"
                className="text-center p-3 rounded-2xl bg-destructive/10 border border-destructive/30 w-full shadow-sm hover:border-destructive/60 transition"
                onClick={() => setStatusDialog({
                  status: 'weakening',
                  items: assumptionHealth.filter(a => a.status === 'weakening'),
                })}
              >
                <TrendingDown className="h-6 w-6 text-destructive mx-auto mb-2" />
                <div className="text-2xl font-bold text-destructive">{overallHealth.weakening}</div>
                <div className="text-xs text-muted-foreground">Weakening</div>
                <p className="text-xs text-muted-foreground mt-1">More challenging signals</p>
              </button>
            </div>
            <div className="h-3 rounded-full overflow-hidden flex bg-muted border border-border/60">
              <div className="bg-emerald-500 transition-all" style={{ width: `${(overallHealth.strengthening / assumptionHealth.length) * 100}%` }} />
              <div className="bg-muted-foreground/30 transition-all" style={{ width: `${(overallHealth.stable / assumptionHealth.length) * 100}%` }} />
              <div className="bg-destructive transition-all" style={{ width: `${(overallHealth.weakening / assumptionHealth.length) * 100}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!statusDialog} onOpenChange={() => setStatusDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {statusDialog?.status === 'strengthening' && 'Strengthening assumptions'}
              {statusDialog?.status === 'stable' && 'Stable assumptions'}
              {statusDialog?.status === 'weakening' && 'Weakening assumptions'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {statusDialog?.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assumptions in this category.</p>
            ) : (
              statusDialog?.items.map(item => (
                <Card key={item.id} className="bg-card/70 border border-border/60 rounded-xl shadow-sm backdrop-blur">
                  <CardContent className="py-3">
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="font-mono text-xs">{item.id}</Badge>
                      <div className="flex-1">
                        <p className="text-sm text-foreground">{item.statement}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="text-destructive">{item.challengingSignals.length} challenging</span>
                          <span className="text-emerald-400">{item.validatingSignals.length} validating</span>
                          <span>Health: {item.healthPercent}%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!assumptionDialog} onOpenChange={(open) => { if (!open) setAssumptionDialog(null); }}>
        <DialogContent className="max-w-3xl">
          {assumptionDialog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">{assumptionDialog.id}</Badge>
                  <Badge variant="secondary" className="text-xs capitalize">{assumptionDialog.category}</Badge>
                  {selectedHealth && (
                    <Badge variant={getStatusBadgeVariant(selectedHealth.verification_status)} className="text-xs">
                      {selectedHealth.verification_status}
                    </Badge>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-foreground">{assumptionDialog.statement}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="text-destructive">{assumptionDialog.challengingSignals.length} challenging</span>
                  <span className="text-emerald-400">{assumptionDialog.validatingSignals.length} validating</span>
                  <span>{assumptionDialog.signalCount} total signals</span>
                  <span>Health: {assumptionDialog.healthPercent}%</span>
                </div>

                {selectedHealth ? (
                  <Card className="border-2" style={{ borderColor: selectedColors.borderColor }}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Activity className="h-4 w-4" style={{ color: selectedColors.statusColor }} />
                          Assumption Health Analysis
                        </CardTitle>
                        <div className="flex items-center gap-4 text-xs">
                          <div className="text-right">
                            <span className="text-muted-foreground block">Net Impact</span>
                            <span className={cn(
                              "text-base font-semibold",
                              selectedHealth.net_impact_score < 0 ? "text-destructive" : "text-emerald-500"
                            )}>
                              {selectedHealth.net_impact_score > 0 ? '+' : ''}{selectedHealth.net_impact_score.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-muted-foreground block">Confidence</span>
                            <span className="text-base font-semibold text-foreground">
                              {Math.round(selectedHealth.confidence_score * 100)}%
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-muted-foreground block">Signals</span>
                            <span className="text-base font-semibold text-foreground">{selectedHealth.signal_volume}</span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-foreground mb-2">Strategic Verdict</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{selectedHealth.strategic_verdict}</p>
                      </div>

                      {selectedHealth.supporting_evidence_analysis && (
                        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 space-y-1">
                          <h4 className="text-sm font-semibold text-emerald-600">Validating Evidence</h4>
                          <p className="text-sm text-emerald-900/80 leading-relaxed">{selectedHealth.supporting_evidence_analysis}</p>
                        </div>
                      )}

                      {selectedHealth.challenging_evidence_analysis && (
                        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-1">
                          <h4 className="text-sm font-semibold text-destructive">Challenging Evidence</h4>
                          <p className="text-sm text-destructive/90 leading-relaxed">{selectedHealth.challenging_evidence_analysis}</p>
                        </div>
                      )}

                      {selectedHealth.key_risk_factors.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                            Key Risk Factors
                          </h4>
                          <ul className="space-y-1">
                            {selectedHealth.key_risk_factors.map((risk, idx) => (
                              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-destructive shrink-0">-</span>
                                <span>{risk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-sm text-muted-foreground">
                    No assumption health analysis available for this assumption.
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm backdrop-blur">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{allSignals.length}</div>
                <div className="text-xs text-muted-foreground">Total Signals</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm backdrop-blur">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-destructive/10">
                <Shield className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <div className="text-2xl font-bold">{threats.length}</div>
                <div className="text-xs text-muted-foreground">Active Threats</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm backdrop-blur">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10">
                <Target className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{opportunities.length}</div>
                <div className="text-xs text-muted-foreground">Opportunities</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/70 border border-border/60 rounded-2xl shadow-sm backdrop-blur">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{early_warnings.length}</div>
                <div className="text-xs text-muted-foreground">Early Warnings</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assumption Health - Detailed View */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Assumption Health</h2>
            <p className="text-xs text-muted-foreground">Click signals to view details</p>
          </div>
          <ScrollArea className="h-[calc(100vh-520px)]">
            <div className="space-y-3 pr-4">
              {assumptionHealth.map(assumption => {
                const statusInfo = getStatusInfo(assumption.status);
                
                return (
                  <Card
                    key={assumption.id}
                    className={cn("bg-card/70 border rounded-2xl shadow-sm backdrop-blur cursor-pointer hover:shadow-md transition", statusInfo.borderColor)}
                    onClick={() => setAssumptionDialog(assumption)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <div className={cn("p-2 rounded-lg shrink-0", statusInfo.bgColor)}>
                          <span className={statusInfo.color}>{statusInfo.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={cn("font-mono font-bold text-sm", statusInfo.color)}>{assumption.id}</span>
                            <Badge variant="outline" className={cn("text-xs", statusInfo.color, statusInfo.borderColor)}>
                              {assumption.status}
                            </Badge>
                            {assumption.threatCount > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {assumption.threatCount} threat{assumption.threatCount > 1 ? 's' : ''}
                              </Badge>
                            )}
                            {assumption.opportunityCount > 0 && (
                              <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-0">
                                {assumption.opportunityCount} opp
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-foreground line-clamp-2">{assumption.statement}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span>{assumption.signalCount} signals</span>
                            <span>Health: {assumption.healthPercent}%</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Top Signals */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Top Impact Signals</h2>
          </div>
          <ScrollArea className="h-[calc(100vh-520px)]">
            <div className="space-y-3 pr-4">
              {topSignals.map(signal => (
                <Card 
                  key={signal.signal_id} 
                  className="bg-card/70 border border-border/60 rounded-2xl shadow-sm backdrop-blur cursor-pointer hover:bg-accent/50 hover:shadow-md transition-colors"
                  onClick={() => handleSignalClick(signal.signal_id)}
                >
                  <CardContent className="py-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 pt-0.5">
                        {signal.impact_direction === 'Positive' ? (
                          <TrendingUp className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <Badge variant="outline" className="text-xs font-mono">{signal.related_assumption_id || signal.assumption_id}</Badge>
                          <Badge variant="secondary" className="text-xs">
                            Score: {(signal.outlier_flags?.combined_score || signal.impact_score || 0).toFixed(1)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{signal.archetype}</Badge>
                        </div>
                        <p className="text-sm text-foreground line-clamp-2">
                          {signal.signal_content || signal.strategic_analysis}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {signal.time_horizon}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
