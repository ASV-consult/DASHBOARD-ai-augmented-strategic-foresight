import { Signal } from '@/types/foresight';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  Target,
  AlertCircle
} from 'lucide-react';
import { parseSignalSource } from '@/lib/signal-utils';
import { getSafeExternalUrl } from '@/lib/utils';

interface SignalDetailDialogProps {
  signal: Signal | null;
  onClose: () => void;
  threatIds?: Set<string>;
  opportunityIds?: Set<string>;
  warningIds?: Set<string>;
}

export function SignalDetailDialog({ 
  signal, 
  onClose,
  threatIds = new Set(),
  opportunityIds = new Set(),
  warningIds = new Set()
}: SignalDetailDialogProps) {
  if (!signal) return null;

  const parsedSource = parseSignalSource(signal.source || '');
  const linkUrl = getSafeExternalUrl(signal.source_url) || getSafeExternalUrl(parsedSource.url);
  const linkLabel = parsedSource.title || parsedSource.domain || 'Open article';
  const linkDomain = parsedSource.domain;

  const getOutlierBadges = (signalId: string) => {
    const badges = [];
    if (threatIds.has(signalId)) {
      badges.push(<Badge key="threat" variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Threat</Badge>);
    }
    if (opportunityIds.has(signalId)) {
      badges.push(<Badge key="opportunity" className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30"><Target className="h-3 w-3 mr-1" />Opportunity</Badge>);
    }
    if (warningIds.has(signalId)) {
      badges.push(<Badge key="warning" className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30"><AlertCircle className="h-3 w-3 mr-1" />Early Warning</Badge>);
    }
    return badges;
  };

  return (
    <Dialog open={!!signal} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            {signal.impact_direction === 'Positive' ? (
              <div className="p-2 rounded-full bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
            ) : (
              <div className="p-2 rounded-full bg-destructive/10">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
            )}
            <DialogTitle className="text-lg">Signal Details</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-5">
          {/* Signal Content */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm leading-relaxed">{signal.signal_content || signal.strategic_analysis}</p>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="font-mono">{signal.related_assumption_id || signal.assumption_id}</Badge>
            <Badge variant="secondary">Score: {signal.outlier_flags?.combined_score?.toFixed(1) || signal.impact_score}</Badge>
            <Badge variant="outline">{signal.archetype}</Badge>
            <Badge variant={signal.impact_direction === 'Positive' ? 'default' : 'destructive'}>
              {signal.impact_direction}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {signal.time_horizon}
            </Badge>
            {getOutlierBadges(signal.signal_id)}
          </div>

          {/* Related Assumption */}
          {signal.strategy_trace?.primary_assumption && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Primary Assumption</h4>
              <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
                {signal.strategy_trace.primary_assumption}
              </p>
            </div>
          )}

          {/* Strategic Analysis */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Strategic Analysis</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{signal.strategic_analysis}</p>
          </div>

          {/* Building Blocks & Risk Domains */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Building Blocks</h4>
              <div className="flex flex-wrap gap-1.5">
                {(signal.building_blocks || signal.affected_building_blocks || signal.strategy_trace?.building_blocks || []).map(bb => (
                  <Badge key={bb} className="text-xs bg-primary/10 text-primary border-0">
                    {bb.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Risk Domains</h4>
              <div className="flex flex-wrap gap-1.5">
                {(signal.risk_domains || signal.strategy_trace?.risk_domains || []).map(rd => (
                  <Badge key={rd} variant="outline" className="text-xs">{rd}</Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Source Link */}
          {linkUrl && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-auto w-full justify-start whitespace-normal"
            >
              <a
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-start gap-2 min-w-0 whitespace-normal py-1"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 text-left text-sm font-medium break-words whitespace-normal">{linkLabel}</span>
                {linkDomain && (
                  <Badge variant="outline" className="ml-auto mt-0.5 text-[10px] whitespace-nowrap">
                    {linkDomain}
                  </Badge>
                )}
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
