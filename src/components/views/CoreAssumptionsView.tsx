import { AssumptionsDefinitionSection, AssumptionClustersSection } from '@/components/views/StrategyComposition';
import { ImpactPathwaysSection } from '@/components/views/ImpactPathwaysSection';

export function CoreAssumptionsView() {
  return (
    <div className="space-y-8">
      <AssumptionsDefinitionSection />

      <div className="my-8 border-t border-border/40" />

      <ImpactPathwaysSection />

      <div className="my-8 border-t border-border/40" />

      <AssumptionClustersSection />
    </div>
  );
}
