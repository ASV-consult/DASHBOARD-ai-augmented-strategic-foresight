import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { ForesightData, Signal, Assumption, BuildingBlocks, Workstream } from '@/types/foresight';
import { FinancialAnalysisData } from '@/types/financial';
import { SharePriceAnalysisData } from '@/types/share-price';
import { MacroDashboardData } from '@/types/macro';
import { getSignalScore } from '@/lib/signal-utils';

interface ForesightContextType {
  data: ForesightData | null;
  setData: (data: ForesightData | null) => void;
  financialData: FinancialAnalysisData | null;
  setFinancialData: (data: FinancialAnalysisData | null) => void;
  sharePriceData: SharePriceAnalysisData | null;
  setSharePriceData: (data: SharePriceAnalysisData | null) => void;
  macroData: MacroDashboardData | null;
  setMacroData: (data: MacroDashboardData | null) => void;
  isLoaded: boolean;
  hasForesightData: boolean;
  hasFinancialData: boolean;
  hasSharePriceData: boolean;
  hasMacroData: boolean;
  resetStreams: () => void;
  // Computed helpers
  allSignals: Signal[];
  coreAssumptions: Assumption[];
  buildingBlocks: BuildingBlocks | null;
  workstreams: Workstream[];
  companyName: string;
  // Outlier categorization
  threats: Signal[];
  opportunities: Signal[];
  earlyWarnings: Signal[];
  noiseSignals: Signal[];
  threatIds: Set<string>;
  opportunityIds: Set<string>;
  warningIds: Set<string>;
  outlierScoreThreshold: number;
  setOutlierScoreThreshold: (value: number) => void;
  // Helpers
  getSignalById: (id: string) => Signal | undefined;
  getSignalsForAssumption: (assumptionId: string) => Signal[];
  getAssumptionById: (id: string) => Assumption | undefined;
}

const ForesightContext = createContext<ForesightContextType | undefined>(undefined);

export function ForesightProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ForesightData | null>(null);
  const [financialData, setFinancialData] = useState<FinancialAnalysisData | null>(null);
  const [sharePriceData, setSharePriceData] = useState<SharePriceAnalysisData | null>(null);
  const [macroData, setMacroData] = useState<MacroDashboardData | null>(null);
  const [outlierScoreThreshold, setOutlierScoreThreshold] = useState(5);

  // Extract signals from the new schema
  const allSignals = useMemo(() => {
    if (!data) return [];
    // v2.1 schema uses all_signals
    if (data.all_signals && data.all_signals.length > 0) {
      return data.all_signals;
    }
    // Legacy schema uses all_signals_view
    if (data.all_signals_view && data.all_signals_view.length > 0) {
      return data.all_signals_view;
    }
    return [];
  }, [data]);

  // Extract assumptions
  const coreAssumptions = useMemo(() => {
    if (!data) return [];
    // v2.1 schema
    if (data.strategy_context?.core_assumptions) {
      return data.strategy_context.core_assumptions;
    }
    // Legacy schema
    if (data.company_strategy?.core_assumptions) {
      return data.company_strategy.core_assumptions;
    }
    return [];
  }, [data]);

  // Extract building blocks
  const buildingBlocks = useMemo(() => {
    if (!data) return null;
    // v2.1 schema
    if (data.strategy_context?.building_blocks) {
      return data.strategy_context.building_blocks;
    }
    // Legacy schema
    if (data.company_strategy?.building_blocks) {
      return data.company_strategy.building_blocks;
    }
    return null;
  }, [data]);

  // Extract workstreams
  const workstreams = useMemo(() => {
    if (!data) return [];
    return data.workstreams || [];
  }, [data]);

  // Company name
  const companyName = useMemo(() => {
    if (data?.meta?.company) return data.meta.company;
    if (data?.strategy_context?.company?.name) return data.strategy_context.company.name;
    if (data?.company_strategy?.company?.name) return data.company_strategy.company.name;
    if (financialData?.company_profile?.name) return financialData.company_profile.name;
    if (financialData?.run_meta?.company) return financialData.run_meta.company;
    if (sharePriceData?._meta?.company) return sharePriceData._meta.company;
    if (macroData?.meta?.company_name) return macroData.meta.company_name;
    return '';
  }, [data, financialData, macroData, sharePriceData]);

  // Categorize signals into outlier quadrants based on v2.1 spec
  const { threats, opportunities, earlyWarnings, noiseSignals, threatIds, opportunityIds, warningIds } = useMemo(() => {
    const threats: Signal[] = [];
    const opportunities: Signal[] = [];
    const earlyWarnings: Signal[] = [];
    const noiseSignals: Signal[] = [];
    const warningThreshold = outlierScoreThreshold;

    allSignals.forEach(signal => {
      const flags = signal.outlier_flags;
      const direction = signal.impact_direction;
      const score = getSignalScore(signal);

      const isEarlyWarning =
        (flags?.is_early_warning && score >= warningThreshold) ||
        (score >= warningThreshold &&
          (signal.time_horizon?.toLowerCase().includes('long') ||
            signal.time_horizon?.toLowerCase().includes('medium')));

      // Early Warnings take precedence when flagged or time-horizon indicates watchlist
      if (isEarlyWarning) {
        earlyWarnings.push(signal);
      }
      // Threats / Opportunities based on dynamic cutoff
      else if (direction === 'Negative' && score >= outlierScoreThreshold) {
        threats.push(signal);
      }
      else if (direction === 'Positive' && score >= outlierScoreThreshold) {
        opportunities.push(signal);
      }
      // Noise/Context (Gray): everything else
      else {
        noiseSignals.push(signal);
      }
    });

    // Sort by combined score desc
    const sortByScore = (a: Signal, b: Signal) => getSignalScore(b) - getSignalScore(a);
    
    threats.sort(sortByScore);
    opportunities.sort(sortByScore);
    earlyWarnings.sort(sortByScore);
    noiseSignals.sort(sortByScore);

    return {
      threats,
      opportunities,
      earlyWarnings,
      noiseSignals,
      threatIds: new Set(threats.map(t => t.signal_id)),
      opportunityIds: new Set(opportunities.map(o => o.signal_id)),
      warningIds: new Set(earlyWarnings.map(w => w.signal_id)),
    };
  }, [allSignals, outlierScoreThreshold]);

  // Helper functions
  const getSignalById = (id: string) => allSignals.find(s => s.signal_id === id);

  const getSignalsForAssumption = (assumptionId: string) => 
    allSignals.filter(s => s.related_assumption_id === assumptionId || s.assumption_id === assumptionId);

  const getAssumptionById = (id: string) => coreAssumptions.find(a => a.id === id);

  const resetStreams = () => {
    setData(null);
    setFinancialData(null);
    setSharePriceData(null);
    setMacroData(null);
  };

  const value: ForesightContextType = {
    data,
    setData,
    financialData,
    setFinancialData,
    sharePriceData,
    setSharePriceData,
    macroData,
    setMacroData,
    isLoaded: data !== null || financialData !== null || sharePriceData !== null || macroData !== null,
    hasForesightData: data !== null,
    hasFinancialData: financialData !== null,
    hasSharePriceData: sharePriceData !== null,
    hasMacroData: macroData !== null,
    resetStreams,
    allSignals,
    coreAssumptions,
    buildingBlocks,
    workstreams,
    companyName,
    threats,
    opportunities,
    earlyWarnings,
    noiseSignals,
    threatIds,
    opportunityIds,
    warningIds,
    outlierScoreThreshold,
    setOutlierScoreThreshold,
    getSignalById,
    getSignalsForAssumption,
    getAssumptionById,
  };

  return (
    <ForesightContext.Provider value={value}>
      {children}
    </ForesightContext.Provider>
  );
}

export function useForesight() {
  const context = useContext(ForesightContext);
  if (context === undefined) {
    throw new Error('useForesight must be used within a ForesightProvider');
  }
  return context;
}
