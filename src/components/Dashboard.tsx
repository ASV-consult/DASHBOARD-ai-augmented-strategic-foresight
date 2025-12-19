import { useState } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { ExecutiveOverview } from '@/components/views/ExecutiveOverview';
import { StrategyComposition } from '@/components/views/StrategyComposition';
import { CoreAssumptionsView } from '@/components/views/CoreAssumptionsView';
import { AssumptionsScoredHub } from '@/components/views/AssumptionsScoredHub';
import { SignalStream } from '@/components/views/SignalStream';
import { WorkstreamsView } from '@/components/views/WorkstreamsView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForesight } from '@/contexts/ForesightContext';
import { 
  LayoutDashboard, 
  Radio,
  Briefcase,
  Layers,
  Target
} from 'lucide-react';

export function Dashboard() {
  const { isLoaded, workstreams, data } = useForesight();
  const [activeTab, setActiveTab] = useState('overview');
  const [assumptionsSubtab, setAssumptionsSubtab] = useState<'scored' | 'synthesized'>('scored');
  const [signalSubtab, setSignalSubtab] = useState<'stream' | 'outliers'>('stream');
  const hasWorkstreams = workstreams.length > 0 || !!data?.strategic_impact_analysis;

  const handleNavigate = (tab: string) => {
    if (tab === 'outliers') {
      setActiveTab('signals');
      setSignalSubtab('outliers');
      return;
    }
    if (tab === 'synthesized') {
      setActiveTab('assumptions');
      setAssumptionsSubtab('synthesized');
      return;
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <DashboardHeader />
      
      <main className="flex-1 container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start mb-6 bg-card/70 border border-border/60 rounded-full p-2 flex-wrap h-auto gap-2 shadow-sm backdrop-blur">
            <TabsTrigger value="overview" className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow">
              <LayoutDashboard className="h-4 w-4" />
              Executive Overview
            </TabsTrigger>
            <TabsTrigger value="strategy" className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow">
              <Layers className="h-4 w-4" />
              Strategy Decomposition
            </TabsTrigger>
            <TabsTrigger value="core-assumptions" className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow">
              <Target className="h-4 w-4" />
              Core Assumptions
            </TabsTrigger>
            <TabsTrigger value="signals" className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow">
              <Radio className="h-4 w-4" />
              Signal Stream
            </TabsTrigger>
            <TabsTrigger value="assumptions" className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow">
              <Target className="h-4 w-4" />
              Assumptions Scored
            </TabsTrigger>
            {hasWorkstreams && (
              <TabsTrigger value="workstreams" className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow">
                <Briefcase className="h-4 w-4" />
                Strategic Impact
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview">
            <ExecutiveOverview onNavigate={handleNavigate} />
          </TabsContent>

          <TabsContent value="strategy">
            <StrategyComposition />
          </TabsContent>

        <TabsContent value="core-assumptions">
          <CoreAssumptionsView />
        </TabsContent>

        <TabsContent value="signals">
          <SignalStream activeTab={signalSubtab} onTabChange={setSignalSubtab} />
        </TabsContent>
          
          <TabsContent value="assumptions">
            <AssumptionsScoredHub
              activeTab={assumptionsSubtab}
              onTabChange={setAssumptionsSubtab}
            />
          </TabsContent>

          {hasWorkstreams && (
            <TabsContent value="workstreams">
              <WorkstreamsView />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}
