import { AssumptionsDefinitionSection, AssumptionClustersSection } from '@/components/views/StrategyComposition';

export function CoreAssumptionsView() {
  return (
    <div className="space-y-6">
      <AssumptionsDefinitionSection />
      <AssumptionClustersSection />
    </div>
  );
}
