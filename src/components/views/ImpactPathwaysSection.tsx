import { Zap, Clock, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useForesight } from '@/contexts/ForesightContext';

export function ImpactPathwaysSection() {
    const { data } = useForesight();
    const pathways = data?.strategy_context?.impact_pathways || [];

    if (pathways.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-md font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Impact Pathways ({pathways.length})
                </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {pathways.map((pathway, idx) => (
                    <Card key={pathway.pathway_id || idx} className="bg-card border-border/50">
                        <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-2">
                                <CardTitle className="text-base font-mono">{pathway.pathway_id || 'Unknown ID'}</CardTitle>
                                <div className="flex flex-wrap items-center gap-2">
                                    {pathway.severity !== undefined && (
                                        <Badge variant={pathway.severity >= 8 ? "destructive" : "secondary"}>
                                            Severity {pathway.severity}
                                        </Badge>
                                    )}
                                    {pathway.time_to_impact && (
                                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {pathway.time_to_impact}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            {pathway.trigger_assumption && (
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Trigger Assumption</span>
                                    <Badge variant="outline" className="text-xs font-mono">{pathway.trigger_assumption}</Badge>
                                </div>
                            )}
                            <div className="space-y-1">
                                <span className="text-xs text-muted-foreground uppercase tracking-wide">Trigger</span>
                                <p className="font-medium text-foreground">{pathway.trigger_condition || 'No trigger condition specified'}</p>
                            </div>

                            <div className="space-y-1">
                                <span className="text-xs text-muted-foreground uppercase tracking-wide">Effect</span>
                                <ul className="list-disc pl-4 space-y-1">
                                    {(pathway.immediate_effects || []).length > 0 ? (
                                        (pathway.immediate_effects || []).map((effect, idx) => (
                                            <li key={idx} className="text-muted-foreground">{effect}</li>
                                        ))
                                    ) : (
                                        <li className="text-muted-foreground italic">No immediate effects listed</li>
                                    )}
                                </ul>
                            </div>

                            {(pathway.affected_building_blocks || []).length > 0 && (
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Affected building blocks</span>
                                    <div className="flex flex-wrap gap-2">
                                        {pathway.affected_building_blocks.map((block, idx) => (
                                            <Badge key={idx} variant="secondary" className="text-[11px] capitalize">
                                                {block.replace(/_/g, ' ')}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(pathway.cascade_to_assumptions || []).length > 0 && (
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Cascade to assumptions</span>
                                    <div className="flex flex-wrap gap-2">
                                        {pathway.cascade_to_assumptions.map((assumption, idx) => (
                                            <Badge key={idx} variant="outline" className="text-[11px] font-mono">
                                                {assumption}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(pathway.strategic_response_options || []).length > 0 && (
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Strategic response options</span>
                                    <ul className="space-y-1">
                                        {pathway.strategic_response_options.map((option, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                                                <ChevronRight className="h-3 w-3 mt-0.5 text-primary" />
                                                <span>{option}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
