import { useMemo, useState } from 'react';
import { useForesight } from '@/contexts/ForesightContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SignalDetailDialog } from '@/components/SignalDetailDialog';
import { Signal } from '@/types/foresight';
import { 
  AlertTriangle, 
  TrendingUp, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseSignalSource } from '@/lib/signal-utils';

function OutlierCard({ 
  item, 
  type, 
  onSignalClick 
}: { 
  item: Signal; 
  type: 'threat' | 'opportunity' | 'warning';
  onSignalClick: (signalId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  
  const tone = {
    threat: {
      border: 'border-destructive/40',
      bar: 'bg-destructive/60',
      badge: 'bg-destructive/10 text-destructive border-destructive/30'
    },
    opportunity: {
      border: 'border-emerald-500/40',
      bar: 'bg-emerald-500/60',
      badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
    },
    warning: {
      border: 'border-amber-500/40',
      bar: 'bg-amber-500/60',
      badge: 'bg-amber-500/10 text-amber-600 border-amber-500/30'
    }
  };

  const content = item.signal_content || item.strategic_analysis || '';
  const score = item.outlier_flags?.combined_score || item.impact_score || 0;

  return (
    <Card
      className={cn(
        "bg-card/80 backdrop-blur border rounded-2xl shadow-sm hover:shadow-md transition overflow-hidden",
        tone[type].border
      )}
    >
      <div className={cn("h-1 w-full", tone[type].bar)} />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline" className="text-xs font-mono">
                {item.related_assumption_id || item.assumption_id}
              </Badge>
              <Badge className={cn("text-xs border", tone[type].badge)}>
                {type === 'threat' ? 'Threat' : type === 'opportunity' ? 'Opportunity' : 'Early Warning'}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Score: {score.toFixed(1)}
              </Badge>
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {item.time_horizon}
              </Badge>
            </div>
            <CardTitle className="text-sm font-semibold leading-tight">
              {content.slice(0, 200)}{content.length > 200 ? '...' : ''}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground line-clamp-2">{item.strategic_analysis}</p>
        
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-xs">{item.archetype}</Badge>
          {(item.affected_building_blocks || item.building_blocks || []).map(bb => (
            <Badge key={bb} className="text-xs bg-primary/10 text-primary border-0">
              {bb.replace(/_/g, ' ')}
            </Badge>
          ))}
        </div>

        {/* View Signal Details Button */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => onSignalClick(item.signal_id)}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            View full signal details
          </button>
        </div>

        {item.strategic_analysis && item.strategic_analysis.length > 100 && (
          <div className="pt-2 border-t border-border">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Full Analysis
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {expanded && (
              <p className="mt-2 text-xs text-muted-foreground whitespace-pre-line">
                {item.strategic_analysis}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OutlierForecast() {
  const {
    allSignals,
    threats,
    opportunities,
    earlyWarnings,
    threatIds,
    opportunityIds,
    warningIds,
    outlierScoreThreshold,
    setOutlierScoreThreshold
  } = useForesight();
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  
  if (allSignals.length === 0) return null;

  const early_warnings = earlyWarnings;

  // Sort by combined score
  const sortedThreats = useMemo(() => 
    [...threats].sort((a, b) => (b.outlier_flags?.combined_score || 0) - (a.outlier_flags?.combined_score || 0)), 
    [threats]
  );
  
  const sortedOpportunities = useMemo(() => 
    [...opportunities].sort((a, b) => (b.outlier_flags?.combined_score || 0) - (a.outlier_flags?.combined_score || 0)), 
    [opportunities]
  );

  const handleSignalClick = (signalId: string) => {
    const signal = allSignals.find(s => s.signal_id === signalId);
    if (signal) {
      setSelectedSignal(signal);
    }
  };

  const topThreat = sortedThreats[0];
  const topOpportunity = sortedOpportunities[0];
  const topWarning = early_warnings[0];
  const totalOutliers = threats.length + opportunities.length + early_warnings.length;

  const getTopCardTitle = (signal: Signal) => {
    const parsed = parseSignalSource(signal.source || '');
    const parsedTitle = parsed.title?.trim();
    const isDomainOnly = parsedTitle && parsed.domain && parsedTitle === parsed.domain;
    if (parsedTitle && parsedTitle.length > 6 && !isDomainOnly) {
      return parsedTitle;
    }
    return signal.signal_content || signal.strategic_analysis;
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

      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card/85 border border-border/60 rounded-2xl shadow-sm backdrop-blur">
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center gap-2 text-destructive text-xs font-semibold">
              <AlertTriangle className="h-4 w-4" />
              Threats
            </div>
            <div className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">{threats.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">High-risk negative signals</p>
          </CardContent>
        </Card>
        <Card className="bg-card/85 border border-border/60 rounded-2xl shadow-sm backdrop-blur">
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <TrendingUp className="h-4 w-4" />
              Opportunities
            </div>
            <div className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">{opportunities.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">High-leverage positive signals</p>
          </CardContent>
        </Card>
        <Card className="bg-card/85 border border-border/60 rounded-2xl shadow-sm backdrop-blur">
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center gap-2 text-amber-500 text-xs font-semibold">
              <AlertCircle className="h-4 w-4" />
              Early Warnings
            </div>
            <div className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">{early_warnings.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Watch list items</p>
          </CardContent>
        </Card>
        <Card className="bg-card/85 border border-border/60 rounded-2xl shadow-sm backdrop-blur">
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center gap-2 text-primary text-xs font-semibold">
              <Clock className="h-4 w-4" />
              Total Outliers
            </div>
            <div className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">{totalOutliers}</div>
            <p className="text-[11px] text-muted-foreground mt-1">All flagged signals</p>
          </CardContent>
        </Card>
      </div>

      {/* Spotlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {topThreat && (
          <Card
            className="bg-card/80 border border-destructive/30 rounded-2xl shadow-sm backdrop-blur cursor-pointer hover:shadow-md transition"
            onClick={() => setSelectedSignal(topThreat)}
          >
            <CardContent className="pt-4 pb-3 px-4 space-y-2">
              <div className="flex items-center gap-2 text-destructive text-xs font-semibold">
                <AlertTriangle className="h-4 w-4" /> Top Threat
              </div>
              <p className="text-sm font-semibold text-foreground line-clamp-2">
                {getTopCardTitle(topThreat)}
              </p>
              <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                <Badge variant="outline" className="font-mono text-[11px]">{topThreat.related_assumption_id || topThreat.assumption_id}</Badge>
                <Badge variant="secondary" className="text-[11px]">Score {(topThreat.outlier_flags?.combined_score || 0).toFixed(1)}</Badge>
                <Badge variant="outline" className="text-[11px] flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {topThreat.time_horizon}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
        {topOpportunity && (
          <Card
            className="bg-card/80 border border-emerald-500/30 rounded-2xl shadow-sm backdrop-blur cursor-pointer hover:shadow-md transition"
            onClick={() => setSelectedSignal(topOpportunity)}
          >
            <CardContent className="pt-4 pb-3 px-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <TrendingUp className="h-4 w-4" /> Top Opportunity
              </div>
              <p className="text-sm font-semibold text-foreground line-clamp-2">
                {getTopCardTitle(topOpportunity)}
              </p>
              <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                <Badge variant="outline" className="font-mono text-[11px]">{topOpportunity.related_assumption_id || topOpportunity.assumption_id}</Badge>
                <Badge variant="secondary" className="text-[11px]">Score {(topOpportunity.outlier_flags?.combined_score || 0).toFixed(1)}</Badge>
                <Badge variant="outline" className="text-[11px] flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {topOpportunity.time_horizon}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
        {topWarning && (
          <Card
            className="bg-card/80 border border-amber-500/30 rounded-2xl shadow-sm backdrop-blur cursor-pointer hover:shadow-md transition"
            onClick={() => setSelectedSignal(topWarning)}
          >
            <CardContent className="pt-4 pb-3 px-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-500 text-xs font-semibold">
                <AlertCircle className="h-4 w-4" /> Top Early Warning
              </div>
              <p className="text-sm font-semibold text-foreground line-clamp-2">
                {getTopCardTitle(topWarning)}
              </p>
              <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                <Badge variant="outline" className="font-mono text-[11px]">{topWarning.related_assumption_id || topWarning.assumption_id}</Badge>
                <Badge variant="secondary" className="text-[11px]">Score {(topWarning.outlier_flags?.combined_score || 0).toFixed(1)}</Badge>
                <Badge variant="outline" className="text-[11px] flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {topWarning.time_horizon}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="threats" className="w-full">
        <TabsList className="w-full justify-start bg-card/70 border border-border/60 rounded-full p-2 gap-2 shadow-sm backdrop-blur">
          <TabsTrigger value="threats" className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Threats ({threats.length})
          </TabsTrigger>
          <TabsTrigger value="opportunities" className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            Opportunities ({opportunities.length})
          </TabsTrigger>
          <TabsTrigger value="warnings" className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            Early Warnings ({early_warnings.length})
          </TabsTrigger>
        </TabsList>

        <div className="mt-3 rounded-2xl border border-border/60 bg-card/60 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground">Outlier cutoff</span>
            <div className="flex-1 min-w-[200px]">
              <input
                type="range"
                min={5}
                max={20}
                step={0.5}
                value={outlierScoreThreshold}
                onChange={(e) => setOutlierScoreThreshold(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                <span>Low sensitivity</span>
                <span>High precision</span>
              </div>
            </div>
            <div className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-semibold">
              Cutoff {outlierScoreThreshold.toFixed(1)}
            </div>
          </div>
        </div>

        <TabsContent value="threats" className="mt-3">
          <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur shadow-sm">
            <ScrollArea className="h-[calc(100vh-260px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
                {sortedThreats.map(item => (
                  <OutlierCard 
                    key={item.signal_id} 
                    item={item} 
                    type="threat" 
                    onSignalClick={handleSignalClick}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="opportunities" className="mt-3">
          <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur shadow-sm">
            <ScrollArea className="h-[calc(100vh-260px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
                {sortedOpportunities.map(item => (
                  <OutlierCard 
                    key={item.signal_id} 
                    item={item} 
                    type="opportunity" 
                    onSignalClick={handleSignalClick}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="warnings" className="mt-3">
          <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur shadow-sm">
            <ScrollArea className="h-[calc(100vh-260px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
                {early_warnings.map(item => (
                  <OutlierCard 
                    key={item.signal_id} 
                    item={item} 
                    type="warning" 
                    onSignalClick={handleSignalClick}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
