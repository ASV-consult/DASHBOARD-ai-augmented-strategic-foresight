import { useCallback } from 'react';
import { useForesight } from '@/contexts/ForesightContext';
import { useToast } from '@/hooks/use-toast';
import { ForesightData } from '@/types/foresight';
import { FinancialAnalysisData } from '@/types/financial';
import { SharePriceAnalysisData } from '@/types/share-price';
import { MacroDashboardData } from '@/types/macro';
import { CrowsNestData, isCrowsNestPayload } from '@/types/crows-nest';
import { isMacroPayload, normalizeMacroPayload } from '@/lib/macro-utils';

const isForesightPayload = (json: unknown): json is ForesightData => {
  const payload = json as Partial<ForesightData>;
  const hasV21 = Boolean(payload?.meta?.version && payload?.strategy_context && Array.isArray(payload?.all_signals));
  const hasLegacy = Boolean(
    payload?.company_strategy?.core_assumptions &&
      Array.isArray(payload?.all_signals_view) &&
      payload?.strategic_deep_dive,
  );
  return hasV21 || hasLegacy;
};

const isFinancialPayload = (json: unknown): json is FinancialAnalysisData => {
  const payload = json as Partial<FinancialAnalysisData>;
  return Boolean(
    payload?.schema_version &&
      payload?.run_meta &&
      payload?.company_profile &&
      Array.isArray(payload?.kpis) &&
      payload?.financial_charts,
  );
};

const isSharePricePayload = (json: unknown): json is SharePriceAnalysisData => {
  const payload = json as Partial<SharePriceAnalysisData>;
  return (
    payload?.schema_version === 'share_price_v1' &&
    Boolean(payload?.run_meta?.ticker) &&
    Boolean(payload?.price_performance)
  );
};

export function useStreamUploader() {
  const { setData, setFinancialData, setSharePriceData, setMacroData, setCrowsNestData } = useForesight();
  const { toast } = useToast();

  const uploadFiles = useCallback(
    async (incoming: FileList | File[]) => {
      const files = Array.from(incoming).filter(
        (file) =>
          file.type === 'application/json' ||
          file.type === 'text/json' ||
          file.name.toLowerCase().endsWith('.json'),
      );

      if (!files.length) {
        toast({
          title: 'No JSON files detected',
          description: 'Select one or more valid JSON files.',
          variant: 'destructive',
        });
        return;
      }

      let successfulFiles = 0;
      let lastCompanyLabel = 'Unknown';
      const streamCounts = {
        foresight: 0,
        financial: 0,
        sharePrice: 0,
        macro: 0,
        crowsNest: 0,
      };
      const failedFiles: string[] = [];
      let nextForesightData: ForesightData | null = null;
      let nextFinancialData: FinancialAnalysisData | null = null;
      let nextSharePriceData: SharePriceAnalysisData | null = null;
      let nextMacroData: MacroDashboardData | null = null;
      let nextCrowsNestData: CrowsNestData | null = null;

      for (const file of files) {
        try {
          const raw = await file.text();
          const json = JSON.parse(raw) as unknown;
          let recognized = false;

          if (isForesightPayload(json)) {
            nextForesightData = json;
            streamCounts.foresight += 1;
            recognized = true;
            lastCompanyLabel =
              json.meta?.company ||
              json.strategy_context?.company?.name ||
              json.company_strategy?.company?.name ||
              lastCompanyLabel;
          }

          if (isFinancialPayload(json)) {
            nextFinancialData = json;
            streamCounts.financial += 1;
            recognized = true;
            lastCompanyLabel = json.company_profile?.name || json.run_meta?.company || lastCompanyLabel;
          }

          if (isSharePricePayload(json)) {
            nextSharePriceData = json;
            streamCounts.sharePrice += 1;
            recognized = true;
            lastCompanyLabel = json.run_meta?.company || json.company_profile?.name || lastCompanyLabel;
          }

          if (isMacroPayload(json)) {
            const normalizedMacro = normalizeMacroPayload(json) as MacroDashboardData;
            nextMacroData = normalizedMacro;
            streamCounts.macro += 1;
            recognized = true;
            lastCompanyLabel = normalizedMacro.meta.company_name || lastCompanyLabel;
          }

          if (isCrowsNestPayload(json)) {
            nextCrowsNestData = json;
            streamCounts.crowsNest += 1;
            recognized = true;
            lastCompanyLabel = json.meta?.company || lastCompanyLabel;
          }

          if (!recognized) {
            // Diagnostic — surface what we saw vs what we expected
            const obj = (json && typeof json === 'object') ? json as Record<string, unknown> : {};
            const sv = obj.schema_version;
            const keys = Object.keys(obj).slice(0, 6).join(', ');
            console.error(
              `Parse error in ${file.name}: unrecognized JSON schema. ` +
              `schema_version="${sv}", top-level keys=[${keys}]. ` +
              `Expected one of: foresight (v2.1 or legacy), financial (schema_version + run_meta), ` +
              `share-price (schema_version="share_price_v1"), macro (flavor + meta.company_name + segment_views), ` +
              `crow's-nest (schema_version="crows_nest_v2").`
            );
            throw new Error(`Unrecognized schema (schema_version="${sv}", keys=[${keys}])`);
          }

          successfulFiles += 1;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`Parse error in ${file.name}:`, err);
          failedFiles.push(`${file.name} — ${msg}`);
        }
      }

      if (successfulFiles > 0) {
        if (nextForesightData) setData(nextForesightData);
        if (nextFinancialData) setFinancialData(nextFinancialData);
        if (nextSharePriceData) setSharePriceData(nextSharePriceData);
        if (nextMacroData) setMacroData(nextMacroData);
        if (nextCrowsNestData) setCrowsNestData(nextCrowsNestData);

        toast({
          title: 'Data loaded successfully',
          description:
            `Loaded ${lastCompanyLabel}. ` +
            `Processed ${successfulFiles}/${files.length} files ` +
            `(${streamCounts.foresight} foresight, ${streamCounts.financial} financial, ${streamCounts.sharePrice} share-price, ${streamCounts.macro} macro, ${streamCounts.crowsNest} crow's nest).`,
        });
      }

      if (failedFiles.length > 0) {
        toast({
          title: 'Some files could not be parsed',
          description:
            `${failedFiles.slice(0, 2).join(' / ')}` +
            `${failedFiles.length > 2 ? ` (+${failedFiles.length - 2} more)` : ''}` +
            `. Open the browser console for the full diagnostic.`,
          variant: 'destructive',
        });
      }
    },
    [setData, setFinancialData, setSharePriceData, setMacroData, setCrowsNestData, toast],
  );

  return { uploadFiles };
}
