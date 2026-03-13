import { useRef } from 'react';
import { useForesight } from '@/contexts/ForesightContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStreamUploader } from '@/hooks/use-stream-uploader';
import { Upload, X, Building2, Calendar } from 'lucide-react';

const toDateLabel = (value?: string) => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
};

interface DashboardHeaderProps {
  onHomeClick?: () => void;
  onNavigate?: (
    view:
      | 'streams-home'
      | 'global-executive-overview'
      | 'foresight-overview'
      | 'financial-overview'
      | 'macro-overview',
  ) => void;
}

export function DashboardHeader({ onHomeClick, onNavigate }: DashboardHeaderProps) {
  const {
    data,
    financialData,
    sharePriceData,
    companyName,
    hasForesightData,
    hasFinancialData,
    hasSharePriceData,
    resetStreams,
  } = useForesight();
  const { uploadFiles } = useStreamUploader();
  const uploadInputRef = useRef<HTMLInputElement>(null);

  if (!data && !financialData && !sharePriceData) return null;

  const strategyCompany = data?.strategy_context?.company || data?.company_strategy?.company;
  const strategySnapshot =
    data?.strategy_context?.strategy_snapshot || data?.company_strategy?.strategy_snapshot;
  const financialCompany = financialData?.company_profile;

  const industry = strategyCompany?.industry || financialCompany?.industry || 'Industry';
  const asOf =
    strategyCompany?.as_of_date ||
    data?.meta?.generated_at ||
    financialData?.generated_at_utc ||
    financialData?.run_meta?.created_at ||
    sharePriceData?._meta?.generated_at;

  const summaryLine =
    strategySnapshot?.one_line_positioning ||
    financialData?.executive?.executive_thesis ||
    'Parallel strategy, financial, and risk streams ready for synthesis.';

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="px-5 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={onHomeClick}
              className="group flex min-w-0 items-center gap-3 text-left"
              title="Back to Streams Home"
            >
              <div className="rounded-lg bg-muted p-2">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="truncate text-lg font-semibold text-foreground transition group-hover:text-primary">
                  {companyName || strategyCompany?.name || financialCompany?.name || 'Company'}
                </h1>
                <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>{industry}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {toDateLabel(asOf)}
                  </span>
                  {financialCompany?.ticker && (
                    <Badge variant="outline" className="font-mono text-[11px]">
                      {financialCompany.ticker}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
            <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">{summaryLine}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge
                variant={hasForesightData ? 'default' : 'secondary'}
                className="rounded-full px-2.5 py-0.5 text-[10px]"
              >
                Strategic Foresight {hasForesightData ? 'Loaded' : 'Missing'}
              </Badge>
              <Badge
                variant={hasFinancialData ? 'default' : 'secondary'}
                className="rounded-full px-2.5 py-0.5 text-[10px]"
              >
                Financial Analysis {hasFinancialData ? 'Loaded' : 'Missing'}
              </Badge>
              <Badge
                variant={hasSharePriceData ? 'default' : 'secondary'}
                className="rounded-full px-2.5 py-0.5 text-[10px]"
              >
                Share Price {hasSharePriceData ? 'Loaded' : 'Missing'}
              </Badge>
              <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[10px]">
                Macro Risk Pending
              </Badge>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <input
              ref={uploadInputRef}
              type="file"
              accept=".json"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  void uploadFiles(e.target.files);
                }
                e.target.value = '';
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-primary/30 bg-primary/[0.06] px-3 text-xs text-primary hover:bg-primary/[0.12]"
              onClick={() => uploadInputRef.current?.click()}
              title="Upload one or multiple JSON files"
            >
              <Upload className="mr-2 h-3.5 w-3.5" />
              Upload JSON files
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={resetStreams}
              title="Clear all loaded streams"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-2">
          <Button
            size="sm"
            variant="secondary"
            className="h-7 rounded-full px-3 text-[11px]"
            onClick={() => onNavigate?.('streams-home')}
          >
            Streams Home
          </Button>
          <Button
            size="sm"
            className="h-7 rounded-full bg-sky-600 px-3 text-[11px] text-white hover:bg-sky-700"
            onClick={() => onNavigate?.('foresight-overview')}
          >
            Strategic Executive
          </Button>
          <Button
            size="sm"
            className="h-7 rounded-full bg-emerald-600 px-3 text-[11px] text-white hover:bg-emerald-700"
            onClick={() => onNavigate?.('financial-overview')}
          >
            Financial Executive
          </Button>
          <Button
            size="sm"
            className="h-7 rounded-full bg-amber-500 px-3 text-[11px] text-black hover:bg-amber-600"
            onClick={() => onNavigate?.('macro-overview')}
          >
            Macro Executive
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 rounded-full px-3 text-[11px]"
            onClick={() => onNavigate?.('global-executive-overview')}
          >
            Unified Executive
          </Button>
        </div>
      </div>
    </header>
  );
}
