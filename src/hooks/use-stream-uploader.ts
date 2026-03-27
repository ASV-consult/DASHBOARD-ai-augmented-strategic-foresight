import { useCallback } from 'react';
import { useForesight } from '@/contexts/ForesightContext';
import { useToast } from '@/hooks/use-toast';
import { ForesightData } from '@/types/foresight';
import { FinancialAnalysisData } from '@/types/financial';
import { SharePriceAnalysisData } from '@/types/share-price';
import { MacroDashboardData } from '@/types/macro';
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
  return Boolean(
    payload?.price_profile &&
      Array.isArray(payload?.key_events) &&
      payload?.trend_narrative &&
      payload?._meta,
  );
};

export function useStreamUploader() {
  const { setData, setFinancialData, setSharePriceData, setMacroData } = useForesight();
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
      };
      const failedFiles: string[] = [];

      for (const file of files) {
        try {
          const raw = await file.text();
          const json = JSON.parse(raw) as unknown;
          let recognized = false;

          if (isForesightPayload(json)) {
            setData(json);
            streamCounts.foresight += 1;
            recognized = true;
            lastCompanyLabel =
              json.meta?.company ||
              json.strategy_context?.company?.name ||
              json.company_strategy?.company?.name ||
              lastCompanyLabel;
          }

          if (isFinancialPayload(json)) {
            setFinancialData(json);
            streamCounts.financial += 1;
            recognized = true;
            lastCompanyLabel = json.company_profile?.name || json.run_meta?.company || lastCompanyLabel;
          }

          if (isSharePricePayload(json)) {
            setSharePriceData(json);
            streamCounts.sharePrice += 1;
            recognized = true;
            lastCompanyLabel = json._meta?.company || lastCompanyLabel;
          }

          if (isMacroPayload(json)) {
            const normalizedMacro = normalizeMacroPayload(json) as MacroDashboardData;
            setMacroData(normalizedMacro);
            streamCounts.macro += 1;
            recognized = true;
            lastCompanyLabel = normalizedMacro.meta.company_name || lastCompanyLabel;
          }

          if (!recognized) {
            throw new Error('Unrecognized JSON schema');
          }

          successfulFiles += 1;
        } catch (err) {
          console.error(`Parse error in ${file.name}:`, err);
          failedFiles.push(file.name);
        }
      }

      if (successfulFiles > 0) {
        toast({
          title: 'Data loaded successfully',
          description:
            `Loaded ${lastCompanyLabel}. ` +
            `Processed ${successfulFiles}/${files.length} files ` +
            `(${streamCounts.foresight} foresight, ${streamCounts.financial} financial, ${streamCounts.sharePrice} share-price, ${streamCounts.macro} macro).`,
        });
      }

      if (failedFiles.length > 0) {
        toast({
          title: 'Some files could not be parsed',
          description: `Failed: ${failedFiles.slice(0, 3).join(', ')}${failedFiles.length > 3 ? '...' : ''}`,
          variant: 'destructive',
        });
      }
    },
    [setData, setFinancialData, setSharePriceData, setMacroData, toast],
  );

  return { uploadFiles };
}
