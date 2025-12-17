import { Signal } from '@/types/foresight';

// Parse source string to extract title and URL
// Format is often: "Title - URL" or "Title (Publisher) - URL" or just URL
export function parseSignalSource(source: string): { title: string; url: string | null; domain: string | null } {
  if (!source) return { title: '', url: null, domain: null };
  
  // Try to extract URL using regex
  const urlMatch = source.match(/\(?(https?:\/\/[^\s\)]+)\)?/);
  const url = urlMatch ? urlMatch[1] : null;
  
  // Extract domain from URL
  let domain: string | null = null;
  if (url) {
    try {
      domain = new URL(url).hostname.replace('www.', '');
    } catch {
      domain = null;
    }
  }
  
  // Extract title - everything before the URL or the last " - " separator
  let title = source;
  if (url) {
    // Remove the URL part
    title = source.replace(/\s*\(?\s*https?:\/\/[^\s\)]+\s*\)?\s*/g, '').trim();
    // Clean up trailing separators
    title = title.replace(/\s*[-–—]\s*$/, '').trim();
  }
  
  // If title is empty or just whitespace, use domain or original source
  if (!title || title.length < 3) {
    title = domain || source;
  }
  
  return { title, url, domain };
}

// Get the combined score with fallback
export function getSignalScore(signal: Signal): number {
  // Check for combined_score at top level first (new format)
  if (typeof signal.combined_score === 'number') {
    return signal.combined_score;
  }
  // Check in outlier_flags (legacy format)
  if (signal.outlier_flags?.combined_score !== undefined) {
    return signal.outlier_flags.combined_score;
  }
  // Fallback to impact_score
  return signal.impact_score || 0;
}

// Categorize signals into threats, opportunities, early warnings based on combined_score thresholds
export function categorizeSignal(
  signal: Signal,
  threatThreshold = 5,
  opportunityThreshold = 5,
  warningThreshold = 3
): 'threat' | 'opportunity' | 'warning' | 'noise' {
  const score = getSignalScore(signal);
  const direction = signal.impact_direction;
  const flags = signal.outlier_flags;
  
  // Use explicit flags if available
  if (flags?.is_high_risk_negative && direction === 'Negative') {
    return 'threat';
  }
  if (flags?.is_high_leverage_positive && direction === 'Positive') {
    return 'opportunity';
  }
  if (flags?.is_early_warning) {
    return 'warning';
  }
  
  // Fallback to score-based categorization
  if (direction === 'Negative' && score >= threatThreshold) {
    return 'threat';
  }
  if (direction === 'Positive' && score >= opportunityThreshold) {
    return 'opportunity';
  }
  if (score >= warningThreshold && (signal.time_horizon?.toLowerCase().includes('long') || signal.time_horizon?.toLowerCase().includes('medium'))) {
    return 'warning';
  }
  
  return 'noise';
}

// Sort signals by combined score (descending)
export function sortByScore(signals: Signal[]): Signal[] {
  return [...signals].sort((a, b) => getSignalScore(b) - getSignalScore(a));
}

// Get top N signals by score
export function getTopSignals(signals: Signal[], n: number): Signal[] {
  return sortByScore(signals).slice(0, n);
}

// Group signals by assumption
export function groupSignalsByAssumption(signals: Signal[]): Map<string, Signal[]> {
  const grouped = new Map<string, Signal[]>();
  signals.forEach(signal => {
    const assumptionId = signal.related_assumption_id || signal.assumption_id;
    if (assumptionId) {
      const existing = grouped.get(assumptionId) || [];
      existing.push(signal);
      grouped.set(assumptionId, existing);
    }
  });
  return grouped;
}

// Group signals by building block
export function groupSignalsByBuildingBlock(signals: Signal[]): Map<string, Signal[]> {
  const grouped = new Map<string, Signal[]>();
  signals.forEach(signal => {
    const blocks = signal.affected_building_blocks || signal.building_blocks || signal.strategy_trace?.building_blocks || [];
    blocks.forEach(block => {
      const existing = grouped.get(block) || [];
      existing.push(signal);
      grouped.set(block, existing);
    });
  });
  return grouped;
}

// Format building block name
export function formatBuildingBlock(block: string): string {
  const labels: Record<string, string> = {
    direction_and_positioning: 'Direction & Positioning',
    value_creation: 'Value Creation',
    value_defence: 'Strategic Defence',
    Strategic_defence: 'Strategic Defence',
    key_levers: 'Key Levers',
    value_chain: 'Value Chain',
  };
  return labels[block] || block.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Calculate assumption sensitivity (most signals, highest scores)
export function getAssumptionSensitivity(
  signals: Signal[],
  assumptionId: string
): { total: number; threats: number; opportunities: number; avgScore: number } {
  const related = signals.filter(
    s => s.related_assumption_id === assumptionId || s.assumption_id === assumptionId
  );
  
  const threats = related.filter(s => s.impact_direction === 'Negative').length;
  const opportunities = related.filter(s => s.impact_direction === 'Positive').length;
  const avgScore = related.length > 0 
    ? related.reduce((sum, s) => sum + getSignalScore(s), 0) / related.length 
    : 0;
  
  return { total: related.length, threats, opportunities, avgScore };
}
