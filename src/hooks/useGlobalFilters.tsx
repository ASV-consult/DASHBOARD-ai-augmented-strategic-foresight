// Global filters hook for filtering across views

interface GlobalFiltersState {
  directionFilter: 'all' | 'Positive' | 'Negative' | 'Neutral';
  horizonFilter: 'all' | string;
  archetypeFilter: 'all' | string;
  buildingBlockFilter: 'all' | string;
  assumptionFilter: 'all' | string;
  setDirectionFilter: (value: 'all' | 'Positive' | 'Negative' | 'Neutral') => void;
  setHorizonFilter: (value: 'all' | string) => void;
  setArchetypeFilter: (value: 'all' | string) => void;
  setBuildingBlockFilter: (value: 'all' | string) => void;
  setAssumptionFilter: (value: 'all' | string) => void;
  resetFilters: () => void;
}

// Simple state management without zustand for now
import { useState, useCallback, createContext, useContext, ReactNode } from 'react';

const initialFilters = {
  directionFilter: 'all' as const,
  horizonFilter: 'all' as const,
  archetypeFilter: 'all' as const,
  buildingBlockFilter: 'all' as const,
  assumptionFilter: 'all' as const,
};

interface GlobalFiltersContextValue {
  filters: typeof initialFilters;
  setFilter: (key: keyof typeof initialFilters, value: string) => void;
  resetFilters: () => void;
}

const GlobalFiltersContext = createContext<GlobalFiltersContextValue | undefined>(undefined);

export function GlobalFiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState(initialFilters);

  const setFilter = useCallback((key: keyof typeof initialFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  return (
    <GlobalFiltersContext.Provider value={{ filters, setFilter, resetFilters }}>
      {children}
    </GlobalFiltersContext.Provider>
  );
}

export function useGlobalFilters() {
  const context = useContext(GlobalFiltersContext);
  if (!context) {
    throw new Error('useGlobalFilters must be used within GlobalFiltersProvider');
  }
  return context;
}
