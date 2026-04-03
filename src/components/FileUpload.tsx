import { useCallback, useRef } from 'react';
import { Upload, FileJson } from 'lucide-react';
import { useForesight } from '@/contexts/ForesightContext';
import { useToast } from '@/hooks/use-toast';
import { ForesightData } from '@/types/foresight';
import { useStreamUploader } from '@/hooks/use-stream-uploader';

export function FileUpload() {
  const { setData } = useForesight();
  const { toast } = useToast();
  const { uploadFiles } = useStreamUploader();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = useCallback(
    async (incoming: FileList | File[]) => {
      await uploadFiles(incoming);
    },
    [uploadFiles],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (e.dataTransfer.files?.length) {
        void handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        void handleFiles(e.target.files);
      }
      e.target.value = '';
    },
    [handleFiles],
  );

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openFilePicker();
      }
    },
    [openFilePicker],
  );

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div
        className="relative flex aspect-video w-full max-w-xl cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card transition-colors hover:bg-accent/50"
        onClick={openFilePicker}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".json"
          multiple
          onChange={handleChange}
          className="sr-only"
        />
        <div className="pointer-events-none flex flex-col items-center gap-4">
          <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
            <FileJson className="h-12 w-12 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground">Upload Stream Data</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Drag and drop one or more stream JSON files, or click to browse.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Upload className="h-4 w-4" />
            <span>Supports foresight, financial, share-price, and macro dashboard schemas</span>
          </div>
        </div>

        <div className="flex w-full justify-center border-t border-border pt-4">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              import('@/data/sample-data.json').then((module) => {
                setData(module.default as unknown as ForesightData);
                toast({
                  title: 'Sample data loaded',
                  description: 'Loaded sample strategic foresight stream.',
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
