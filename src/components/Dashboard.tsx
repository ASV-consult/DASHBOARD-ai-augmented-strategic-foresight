import { useState } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { ExecutiveOverview } from '@/components/views/ExecutiveOverview';
import { StrategyComposition, AssumptionsAnalysis } from '@/components/views/StrategyComposition';
import { OutlierForecast } from '@/components/views/OutlierForecast';
import { SynthesizedForecast } from '@/components/views/SynthesizedForecast';
import { SignalStream } from '@/components/views/SignalStream';
import { WorkstreamsView } from '@/components/views/WorkstreamsView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForesight } from '@/contexts/ForesightContext';
import { 
  LayoutDashboard, 
  AlertTriangle, 
  Activity, 
  Radio,
  Briefcase,
  Layers,
  Target
} from 'lucide-react';

export function Dashboard() {
  const { isLoaded, workstreams } = useForesight();
  const [activeTab, setActiveTab] = useState('overview');
  const hasWorkstreams = workstreams.length > 0;

  const handleNavigate = (tab: string) => {
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
              Strategy Composition
            </TabsTrigger>
            <TabsTrigger value="signals" className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow">
              <Radio className="h-4 w-4" />
              Signal Stream
            </TabsTrigger>
            <TabsTrigger value="assumptions" className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow">
              <Target className="h-4 w-4" />
              Assumptions Scored
            </TabsTrigger>
            <TabsTrigger value="outliers" className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow">
              <AlertTriangle className="h-4 w-4" />
              Outlier Forecast
            </TabsTrigger>
            <TabsTrigger value="synthesized" className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow">
              <Activity className="h-4 w-4" />
              Synthesized Forecast
            </TabsTrigger>
            {hasWorkstreams && (
              <TabsTrigger value="workstreams" className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow">
                <Briefcase className="h-4 w-4" />
                Workstreams
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview">
            <ExecutiveOverview onNavigate={handleNavigate} />
          </TabsContent>

          <TabsContent value="strategy">
            <StrategyComposition />
          </TabsContent>

          <TabsContent value="signals">
            <SignalStream />
          </TabsContent>
          
          <TabsContent value="assumptions">
            <AssumptionsAnalysis />
          </TabsContent>

          <TabsContent value="outliers">
            <OutlierForecast />
          </TabsContent>
          
          <TabsContent value="synthesized">
            <SynthesizedForecast />
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
