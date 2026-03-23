import { AssumptionsDefinitionSection, AssumptionClustersSection } from '@/components/views/StrategyComposition';

export function CoreAssumptionsView() {
  return (
    <div className="space-y-8">
      <AssumptionsDefinitionSection />

      <div className="my-8 border-t border-border/40" />

      <AssumptionClustersSection />
    </div>
  );
}
