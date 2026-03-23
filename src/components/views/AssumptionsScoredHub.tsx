import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssumptionsAnalysis } from '@/components/views/StrategyComposition';
import { SynthesizedForecast } from '@/components/views/SynthesizedForecast';
import { Activity, Target } from 'lucide-react';

type AssumptionsSubtab = 'scored' | 'synthesized';

interface AssumptionsScoredHubProps {
  activeTab: AssumptionsSubtab;
  onTabChange: (value: AssumptionsSubtab) => void;
  focusAssumptionId?: string | null;
  onFocusAssumptionConsumed?: () => void;
}

export function AssumptionsScoredHub({
  activeTab,
  onTabChange,
  focusAssumptionId,
  onFocusAssumptionConsumed,
}: AssumptionsScoredHubProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={value => onTabChange(value as AssumptionsSubtab)}
      className="w-full"
    >
      <TabsList className="w-full justify-start mb-6 bg-card/70 border border-border/60 rounded-full p-2 flex-wrap h-auto gap-2 shadow-sm backdrop-blur">
        <TabsTrigger value="scored" className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium">
          <Target className="h-4 w-4" />
          Assumptions Scored
        </TabsTrigger>
        <TabsTrigger value="synthesized" className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium">
          <Activity className="h-4 w-4" />
          Synthesized Forecast
        </TabsTrigger>
      </TabsList>

      <TabsContent value="scored">
        <AssumptionsAnalysis
          focusAssumptionId={focusAssumptionId}
          onFocusAssumptionConsumed={onFocusAssumptionConsumed}
        />
      </TabsContent>
      <TabsContent value="synthesized">
        <SynthesizedForecast />
      </TabsContent>
    </Tabs>
  );
}
