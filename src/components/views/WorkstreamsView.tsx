import { useState, useMemo, useEffect } from 'react';
import { useForesight } from '@/contexts/ForesightContext';
import { StrategicImpactWorkstreams } from '@/components/views/StrategicImpactWorkstreams';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SignalDetailDialog } from '@/components/SignalDetailDialog';
import { SignalCard } from '@/components/SignalCard';
import { Workstream, Signal } from '@/types/foresight';
import { getSignalScore, sortByScore, parseSignalSource } from '@/lib/signal-utils';
import { getSafeExternalUrl } from '@/lib/utils';
import {
  Briefcase,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight,
  ExternalLink,
  Target,
  FileText,
  Radio
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function WorkstreamsView() {
  const {
    data,
    workstreams,
    allSignals,
    threatIds,
    opportunityIds,
    warningIds,
  } = useForesight();

  const [selectedWorkstream, setSelectedWorkstream] = useState<Workstream | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [showAllSupportingSignals, setShowAllSupportingSignals] = useState(false);

  useEffect(() => {
    // Reset supporting signals expansion when switching/closing workstream
    setShowAllSupportingSignals(false);
  }, [selectedWorkstream?.id]);

  if (data?.strategic_impact_analysis) {
    return <StrategicImpactWorkstreams />;
  }

  // Find supporting signals for a workstream
  const getSupportingSignals = (ws: Workstream): Signal[] => {
    const clusterId = ws.detailed_analysis?.cluster_id || ws.recommendation?.cluster_id;
    const rationale = ws.detailed_analysis?.rationale || '';
    const issue = ws.detailed_analysis?.executive_summary?.issue || '';
    
    // Extract mentioned assumption IDs from rationale and issue
    const assumptionMatches = (rationale + ' ' + issue).match(/A\d+/g) || [];
    const uniqueAssumptions = [...new Set(assumptionMatches)];
    
    // Filter signals that match mentioned assumptions
    const signals = allSignals.filter(s => {
      const signalAssumption = s.related_assumption_id || s.assumption_id;
      return signalAssumption && uniqueAssumptions.includes(signalAssumption);
    });
    
    return sortByScore(signals);
  };

  if (workstreams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground">No Workstreams</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a foresight data file to view recommended workstreams.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SignalDetailDialog
        signal={selectedSignal}
        onClose={() => setSelectedSignal(null)}
        threatIds={threatIds}
        opportunityIds={opportunityIds}
        warningIds={warningIds}
      />

      {/* Workstream Deep Dive Dialog */}
      <Dialog open={!!selectedWorkstream} onOpenChange={() => setSelectedWorkstream(null)}>
        <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col rounded-2xl border border-border/60 bg-card/95 backdrop-blur">
          {selectedWorkstream && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {selectedWorkstream.detailed_analysis?.customized_title || 
                   selectedWorkstream.recommendation?.project_title}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">
                    {selectedWorkstream.recommendation?.product_name || 
                     selectedWorkstream.detailed_analysis?.workstream_name}
                  </Badge>
                  {selectedWorkstream.detailed_analysis?.cluster_id && (
                    <Badge variant="outline" className="font-mono">
                      {selectedWorkstream.detailed_analysis.cluster_id}
                    </Badge>
                  )}
                </div>
              </DialogHeader>
              
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-6 py-4 min-h-[60vh]">
                  {/* Executive Summary */}
                  {selectedWorkstream.detailed_analysis?.executive_summary && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Executive Summary
                      </h3>
                      
                      <div className="grid grid-cols-1 gap-3">
                        <Card className="bg-destructive/5 border border-destructive/20 rounded-2xl shadow-sm">
                          <CardContent className="p-4">
                            <h4 className="text-xs font-semibold text-destructive mb-1">Issue</h4>
                            <p className="text-sm text-foreground">
                              {selectedWorkstream.detailed_analysis.executive_summary.issue}
                            </p>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-amber-500/5 border border-amber-500/20 rounded-2xl shadow-sm">
                          <CardContent className="p-4">
                            <h4 className="text-xs font-semibold text-amber-600 mb-1">Impact</h4>
                            <p className="text-sm text-foreground">
                              {selectedWorkstream.detailed_analysis.executive_summary.impact}
                            </p>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl shadow-sm">
                          <CardContent className="p-4">
                            <h4 className="text-xs font-semibold text-emerald-600 mb-1">Recommendation</h4>
                            <p className="text-sm text-foreground">
                              {selectedWorkstream.detailed_analysis.executive_summary.recommendation}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}

                  {/* Rationale */}
                  {selectedWorkstream.detailed_analysis?.rationale && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2">Rationale</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {selectedWorkstream.detailed_analysis.rationale}
                      </p>
                    </div>
                  )}

                  {/* Phases Timeline */}
                  {selectedWorkstream.detailed_analysis?.phases && 
                   selectedWorkstream.detailed_analysis.phases.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                        <Clock className="h-4 w-4 text-primary" />
                        Implementation Phases
                      </h3>
                      
                    <div className="space-y-4">
                      {selectedWorkstream.detailed_analysis.phases.map((phase, idx) => (
                        <div key={idx} className="relative pl-8 pb-4 border-l-2 border-primary/30 last:border-l-0 last:pb-0">
                          <div className="absolute left-1 top-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <span className="text-[10px] font-bold text-primary-foreground leading-none">{idx + 1}</span>
                          </div>
                            
                            <Card className="bg-card/70 border border-border/60 rounded-xl shadow-sm backdrop-blur">
                              <CardContent className="p-4">
                                <h4 className="font-semibold text-sm text-foreground mb-2">
                                  {phase.name}
                                </h4>
                                
                                {phase.actions && phase.actions.length > 0 && (
                                  <div className="mb-3">
                                    <h5 className="text-xs font-medium text-muted-foreground mb-1">Actions:</h5>
                                    <ul className="space-y-1">
                                      {phase.actions.map((action, actionIdx) => (
                                        <li key={actionIdx} className="text-xs text-foreground flex items-start gap-2">
                                          <ChevronRight className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                                          <span>{action}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                
                                {phase.deliverable && (
                                  <div className="pt-2 border-t border-border">
                                    <h5 className="text-xs font-medium text-muted-foreground mb-1">Deliverable:</h5>
                                    <p className="text-xs text-foreground">{phase.deliverable}</p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Risks */}
                  {selectedWorkstream.detailed_analysis?.risks && 
                   selectedWorkstream.detailed_analysis.risks.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Risks
                      </h3>
                      
                      <div className="space-y-2">
                        {selectedWorkstream.detailed_analysis.risks.map((risk, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20"
                          >
                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-foreground">{risk}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Supporting Signals */}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                      <Radio className="h-4 w-4 text-primary" />
                      Supporting Signals
                    </h3>
                    
                    {(() => {
                      const signals = getSupportingSignals(selectedWorkstream);
                      if (signals.length === 0) {
                        return (
                          <p className="text-sm text-muted-foreground">
                            No directly linked signals found for this workstream.
                          </p>
                        );
                      }
                      
                      const visible = showAllSupportingSignals ? signals : signals.slice(0, 5);
                      const remaining = Math.max(signals.length - visible.length, 0);

                      return (
                        <div className="space-y-2">
                          {visible.map(signal => {
                            const displaySignal = { ...signal, source: signal.signal_content || signal.source };
                            return (
                              <SignalCard
                                key={signal.signal_id}
                                signal={displaySignal}
                                compact
                                onClick={() => setSelectedSignal(signal)}
                              />
                            );
                          })}
                          {remaining > 0 && (
                            <button
                              className="text-xs text-primary hover:underline w-full text-center"
                              onClick={() => setShowAllSupportingSignals(true)}
                            >
                              Show {remaining} more signal{remaining > 1 ? 's' : ''}
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Evidence Links */}
                  {selectedWorkstream.supporting_evidence && 
                   selectedWorkstream.supporting_evidence.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                        <ExternalLink className="h-4 w-4 text-primary" />
                        Evidence Links
                      </h3>
                      
                      <div className="space-y-2">
                        {selectedWorkstream.supporting_evidence.map((evidence, idx) => {
                          const { title, url: rawUrl, domain } = parseSignalSource(evidence.source || evidence.url || '');
                          const url = getSafeExternalUrl(rawUrl);
                          return (
                            <a
                              key={idx}
                              href={url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                            >
                              <ExternalLink className="h-4 w-4 text-primary shrink-0" />
                              <span className="text-sm text-foreground truncate">{title}</span>
                              {domain && (
                                <Badge variant="outline" className="text-[10px] shrink-0">
                                  {domain}
                                </Badge>
                              )}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Workstream Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workstreams.map(ws => (
          <Card 
            key={ws.id}
            className="bg-card/70 border border-border/60 rounded-2xl shadow-sm backdrop-blur hover:shadow-md hover:border-primary/40 transition-all cursor-pointer"
            onClick={() => setSelectedWorkstream(ws)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base font-semibold line-clamp-2">
                  {ws.detailed_analysis?.customized_title || 
                   ws.recommendation?.project_title ||
                   ws.id}
                </CardTitle>
                <Briefcase className="h-5 w-5 text-primary shrink-0" />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge variant="secondary" className="text-xs">
                  {ws.recommendation?.product_name || ws.detailed_analysis?.workstream_name}
                </Badge>
                {ws.detailed_analysis?.cluster_id && (
                  <Badge variant="outline" className="text-xs font-mono">
                    {ws.detailed_analysis.cluster_id}
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {/* Issue preview */}
              {ws.detailed_analysis?.executive_summary?.issue && (
                <div className="p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                  <p className="text-xs text-foreground line-clamp-2">
                    {ws.detailed_analysis.executive_summary.issue}
                  </p>
                </div>
              )}
              
              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {ws.detailed_analysis?.phases && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {ws.detailed_analysis.phases.length} phases
                  </span>
                )}
                {ws.detailed_analysis?.risks && (
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {ws.detailed_analysis.risks.length} risks
                  </span>
                )}
              </div>
              
              <Button variant="ghost" size="sm" className="w-full text-xs rounded-full">
                View Details
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
