import { useMemo, useState } from 'react';
import { useForesight } from '@/contexts/ForesightContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SignalDetailDialog } from '@/components/SignalDetailDialog';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  Target,
  AlertCircle,
  Radio,
} from 'lucide-react';
import { Signal } from '@/types/foresight';
import { getSignalScore } from '@/lib/signal-utils';

export function SignalStream() {
  const { allSignals, coreAssumptions, threatIds, opportunityIds, warningIds } = useForesight();
  const [search, setSearch] = useState('');
  const [assumptionFilter, setAssumptionFilter] = useState<string>('all');
  const [buildingBlockFilter, setBuildingBlockFilter] = useState<string>('all');
  const [riskDomainFilter, setRiskDomainFilter] = useState<string>('all');
  const [timeHorizonFilter, setTimeHorizonFilter] = useState<string>('all');
  const [outlierFilter, setOutlierFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);

  if (allSignals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Radio className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground">No Signals</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a foresight data file to view signals.
        </p>
      </div>
    );
  }

  const uniqueBuildingBlocks = useMemo(() => {
    const blocks = new Set<string>();
    allSignals.forEach((signal) => {
      (signal.building_blocks || signal.affected_building_blocks || []).forEach((block) => blocks.add(block));
    });
    return Array.from(blocks);
  }, [allSignals]);

  const uniqueRiskDomains = useMemo(() => {
    const domains = new Set<string>();
    allSignals.forEach((signal) => {
      (signal.risk_domains || []).forEach((domain) => domains.add(domain));
    });
    return Array.from(domains);
  }, [allSignals]);

  const uniqueTimeHorizons = useMemo(() => {
    const horizons = new Set<string>();
    allSignals.forEach((signal) => {
      if (signal.time_horizon) horizons.add(signal.time_horizon);
    });
    return Array.from(horizons);
  }, [allSignals]);

  const filteredSignals = useMemo(() => {
    return allSignals
      .filter((signal) => {
        const searchLower = search.toLowerCase();
        const content = signal.signal_content || signal.strategic_analysis || '';
        const analysis = signal.strategic_analysis || '';
        if (
          search &&
          !content.toLowerCase().includes(searchLower) &&
          !analysis.toLowerCase().includes(searchLower)
        ) {
          return false;
        }

        const assumptionId = signal.related_assumption_id || signal.assumption_id;
        if (assumptionFilter !== 'all' && assumptionId !== assumptionFilter) {
          return false;
        }

        const blocks = signal.building_blocks || signal.affected_building_blocks || [];
        if (buildingBlockFilter !== 'all' && !blocks.includes(buildingBlockFilter)) {
          return false;
        }

        if (riskDomainFilter !== 'all' && !(signal.risk_domains || []).includes(riskDomainFilter)) {
          return false;
        }

        if (timeHorizonFilter !== 'all' && signal.time_horizon !== timeHorizonFilter) {
          return false;
        }

        if (directionFilter !== 'all' && signal.impact_direction !== directionFilter) {
          return false;
        }

        if (outlierFilter !== 'all') {
          const isThreat = threatIds.has(signal.signal_id);
          const isOpportunity = opportunityIds.has(signal.signal_id);
          const isWarning = warningIds.has(signal.signal_id);

          if (outlierFilter === 'threats' && !isThreat) return false;
          if (outlierFilter === 'opportunities' && !isOpportunity) return false;
          if (outlierFilter === 'warnings' && !isWarning) return false;
          if (outlierFilter === 'none' && (isThreat || isOpportunity || isWarning)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const scoreA = getSignalScore(a);
        const scoreB = getSignalScore(b);
        return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
      });
  }, [
    allSignals,
    search,
    assumptionFilter,
    buildingBlockFilter,
    riskDomainFilter,
    timeHorizonFilter,
    directionFilter,
    outlierFilter,
    sortOrder,
    threatIds,
    opportunityIds,
    warningIds,
  ]);

  const getOutlierBadges = (signalId: string) => {
    const badges = [];
    if (threatIds.has(signalId)) {
      badges.push(
        <Badge key="threat" variant="destructive" className="text-xs">
          <AlertTriangle className="mr-1 h-3 w-3" />
          Threat
        </Badge>,
      );
    }
    if (opportunityIds.has(signalId)) {
      badges.push(
        <Badge
          key="opportunity"
          className="border-emerald-500/30 bg-emerald-500/20 text-xs text-emerald-400"
        >
          <Target className="mr-1 h-3 w-3" />
          Opportunity
        </Badge>,
      );
    }
    if (warningIds.has(signalId)) {
      badges.push(
        <Badge key="warning" className="border-amber-500/30 bg-amber-500/20 text-xs text-amber-400">
          <AlertCircle className="mr-1 h-3 w-3" />
          Early Warning
        </Badge>,
      );
    }
    return badges;
  };

  return (
    <div className="space-y-4">
      <SignalDetailDialog
        signal={selectedSignal}
        onClose={() => setSelectedSignal(null)}
        threatIds={threatIds}
        opportunityIds={opportunityIds}
        warningIds={warningIds}
      />

      <Card className="bg-card">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[200px] flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search signals..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={assumptionFilter} onValueChange={setAssumptionFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Assumption" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assumptions</SelectItem>
                {coreAssumptions.map((assumption) => (
                  <SelectItem key={assumption.id} value={assumption.id}>
                    {assumption.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Directions</SelectItem>
                <SelectItem value="Positive">Positive</SelectItem>
                <SelectItem value="Negative">Negative</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="px-3"
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            >
              Sort by score: {sortOrder === 'desc' ? 'High to Low' : 'Low to High'}
            </Button>

            <Select value={buildingBlockFilter} onValueChange={setBuildingBlockFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Building Block" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Blocks</SelectItem>
                {uniqueBuildingBlocks.map((block) => (
                  <SelectItem key={block} value={block}>
                    {block.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={riskDomainFilter} onValueChange={setRiskDomainFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Risk Domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Domains</SelectItem>
                {uniqueRiskDomains.map((domain) => (
                  <SelectItem key={domain} value={domain}>
                    {domain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={timeHorizonFilter} onValueChange={setTimeHorizonFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Time Horizon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Horizons</SelectItem>
                {uniqueTimeHorizons.map((horizon) => (
                  <SelectItem key={horizon} value={horizon}>
                    {horizon}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={outlierFilter} onValueChange={setOutlierFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Outlier Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Signals</SelectItem>
                <SelectItem value="threats">Threats Only</SelectItem>
                <SelectItem value="opportunities">Opportunities Only</SelectItem>
                <SelectItem value="warnings">Warnings Only</SelectItem>
                <SelectItem value="none">No Outlier Flag</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-3 text-sm text-muted-foreground">
            Showing {filteredSignals.length} of {allSignals.length} signals
          </div>
        </CardContent>
      </Card>

      <ScrollArea className="h-[calc(100vh-340px)]">
        <div className="space-y-3 pr-4">
          {filteredSignals.map((signal) => (
            <Card
              key={signal.signal_id}
              className="cursor-pointer bg-card transition-colors hover:bg-accent/50"
              onClick={() => setSelectedSignal(signal)}
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
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-xs font-mono">
                        {signal.related_assumption_id || signal.assumption_id}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Score: {signal.outlier_flags?.combined_score?.toFixed(1) || signal.impact_score}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {signal.archetype}
                      </Badge>
                      {getOutlierBadges(signal.signal_id)}
                    </div>
                    <p className="line-clamp-2 text-sm font-medium text-foreground">
                      {signal.signal_content || signal.strategic_analysis}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {signal.time_horizon}
                      </span>
                      <span className={signal.impact_direction === 'Positive' ? 'text-emerald-400' : 'text-destructive'}>
                        {signal.impact_direction}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
