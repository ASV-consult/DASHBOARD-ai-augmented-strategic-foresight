import { useCallback } from 'react';
import { Upload, FileJson } from 'lucide-react';
import { useForesight } from '@/contexts/ForesightContext';
import { useToast } from '@/hooks/use-toast';
import { ForesightData } from '@/types/foresight';

export function FileUpload() {
  const { setData } = useForesight();
  const { toast } = useToast();

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string) as ForesightData;

        // Validate v2.1 schema structure
        const isV21 = json.meta?.version && json.strategy_context && json.all_signals;
        // Validate legacy schema structure
        const isLegacy = json.company_strategy?.core_assumptions && json.all_signals_view && json.strategic_deep_dive;

        if (!isV21 && !isLegacy) {
          throw new Error('Invalid JSON structure - must be v2.1 or legacy schema');
        }

        setData(json);

        const companyName = json.meta?.company || json.strategy_context?.company?.name || json.company_strategy?.company?.name || 'Unknown';
        const signalCount = json.all_signals?.length || json.all_signals_view?.length || 0;
        const workstreamCount = json.workstreams?.length || 0;

        toast({
          title: "Data loaded successfully",
          description: `Loaded ${companyName} foresight data: ${signalCount} signals${workstreamCount > 0 ? `, ${workstreamCount} workstream(s)` : ''}`,
        });
      } catch (err) {
        console.error('Parse error:', err);
        toast({
          title: "Error parsing file",
          description: "Please ensure the JSON file has the correct structure (v2.1 gtm_run_bundle or legacy format)",
          variant: "destructive",
        });
      }
    };

    reader.readAsText(file);
  }, [setData, toast]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/json') {
      handleFile(file);
    }
  }, [handleFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div
        className="relative flex flex-col items-center justify-center w-full max-w-xl aspect-video border-2 border-dashed border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer rounded-lg"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".json"
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center gap-4 pointer-events-none">
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <FileJson className="h-12 w-12 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground">Upload Foresight Data</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Drag and drop your gtm_run_bundle.json file or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Quick edit: live reload check — this line is safe to remove.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Upload className="h-4 w-4" />
            <span>JSON format (v2.1 schema supported)</span>
          </div>
        </div>

        <div className="pt-4 border-t border-border w-full flex justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              import('@/data/sample-data.json').then(module => {
                setData(module.default as unknown as ForesightData);
                toast({
                  title: "Sample data loaded",
                  description: "Loaded sample strategy context with assumption health data.",
                });
              });
            }}
            className="text-sm text-primary hover:underline"
          >
            Load Sample Data
          </button>
        </div>
      </div>
    </div>

  );
}
