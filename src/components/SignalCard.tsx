import { Signal } from '@/types/foresight';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  ExternalLink,
  AlertTriangle,
  Target,
  AlertCircle
} from 'lucide-react';
import { cn, getSafeExternalUrl } from '@/lib/utils';
import { parseSignalSource, getSignalScore } from '@/lib/signal-utils';
import { useForesight } from '@/contexts/ForesightContext';

interface SignalCardProps {
  signal: Signal;
  onClick?: () => void;
  compact?: boolean;
  showCategory?: boolean;
}

export function SignalCard({ signal, onClick, compact = false, showCategory = true }: SignalCardProps) {
  const { threatIds, opportunityIds, warningIds } = useForesight();
  const parsedSource = parseSignalSource(signal.source || '');
  const linkUrl = getSafeExternalUrl(signal.source_url) || getSafeExternalUrl(parsedSource.url);
  let linkDomain = parsedSource.domain;
  if (!linkDomain && linkUrl) {
    try {
      linkDomain = new URL(linkUrl).hostname.replace('www.', '');
    } catch {
      linkDomain = null;
    }
  }
  const title = parsedSource.title;
  const score = getSignalScore(signal);
  const category = threatIds.has(signal.signal_id)
    ? 'threat'
    : opportunityIds.has(signal.signal_id)
      ? 'opportunity'
      : warningIds.has(signal.signal_id)
        ? 'warning'
        : 'noise';
  
  const categoryStyles = {
    threat: {
      border: 'border-destructive/40 hover:border-destructive/60',
      badge: 'bg-destructive/10 text-destructive border-destructive/30',
      icon: <AlertTriangle className="h-3 w-3" />,
      label: 'Threat'
    },
    opportunity: {
      border: 'border-emerald-500/40 hover:border-emerald-500/60',
      badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
      icon: <Target className="h-3 w-3" />,
      label: 'Opportunity'
    },
    warning: {
      border: 'border-amber-500/40 hover:border-amber-500/60',
      badge: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
      icon: <AlertCircle className="h-3 w-3" />,
      label: 'Early Warning'
    },
    noise: {
      border: 'border-border hover:border-border/80',
      badge: 'bg-muted text-muted-foreground border-border',
      icon: null,
      label: null
    }
  };

  const style = categoryStyles[category];

  return (
    <Card 
      className={cn(
        "bg-card cursor-pointer transition-all hover:shadow-md",
        style.border,
        compact ? "border" : "border-2"
      )}
      onClick={onClick}
    >
      <CardContent className={cn("space-y-2", compact ? "p-3" : "p-4")}>
        {/* Header with badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-xs font-mono">
            {signal.related_assumption_id || signal.assumption_id}
          </Badge>
          
          {/* Combined Score Badge - prominent when available */}
          <Badge 
            variant="secondary" 
            className={cn(
              "text-xs font-semibold",
              score >= 7 ? "bg-destructive/20 text-destructive" :
              score >= 5 ? "bg-amber-500/20 text-amber-600" :
              "bg-muted text-muted-foreground"
            )}
          >
            {score.toFixed(1)}
          </Badge>
          
          <Badge variant="outline" className="text-xs">{signal.archetype}</Badge>
          
          {showCategory && style.label && (
            <Badge className={cn("text-xs border", style.badge)}>
              {style.icon}
              <span className="ml-1">{style.label}</span>
            </Badge>
          )}
        </div>
        
        {/* Title - parsed from source */}
        <h4 className={cn(
          "font-semibold text-foreground leading-tight",
          compact ? "text-sm line-clamp-2" : "text-sm line-clamp-3"
        )}>
          {title || signal.signal_content?.slice(0, 100)}
        </h4>
        
        {/* Content - only once */}
        {!compact && signal.signal_content && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {signal.signal_content}
          </p>
        )}
        
        {/* Footer with metadata */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              {signal.impact_direction === 'Positive' ? (
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              ) : signal.impact_direction === 'Negative' ? (
                <TrendingDown className="h-3 w-3 text-destructive" />
              ) : null}
              <span className={
                signal.impact_direction === 'Positive' ? 'text-emerald-500' :
                signal.impact_direction === 'Negative' ? 'text-destructive' :
                'text-muted-foreground'
              }>
                {signal.impact_direction}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {signal.time_horizon}
            </span>
          </div>
          
          {/* Source link */}
          {linkUrl && (
            <a 
              href={linkUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              {linkDomain || 'Source'}
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
