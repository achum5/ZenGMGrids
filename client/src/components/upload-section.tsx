/**
 * This component handles league file imports from a local file or a URL.
 * It uses a streaming pipeline to process arbitrarily large files without
 * buffering them entirely into memory, preventing browser crashes.
 *
 * The pipeline is as follows:
 * 1. Source: A ReadableStream is created from a File (byteSources.fromLocalFile)
 *    or a URL (byteSources.fromURL).
 * 2. Progress: The stream is piped through a TransformStream (progress.createProgressStream)
 *    that counts bytes and reports progress.
 * 3. Decompression: If the file is gzipped (.gz), it's piped through a decompression
 *    stream (decompress.maybeGunzip), which uses the browser's native DecompressionStream
 *    or a fallback Web Worker with fflate.
 * 4. Parsing: The raw byte stream is decoded into text and piped to a WritableStream
 *    (jsonStream.createJsonParsingStream) that uses 'clarinet' to parse the JSON
 *    incrementally. It emits only the data structures required by the application
 *    (players, teams, etc.), avoiding the creation of a large single object in memory.
 * 5. Processing: The emitted objects are collected and passed to the parent component
 *    via the onLeagueData callback.
 *
 * An AbortController is used to allow cancellation of the entire pipeline at any stage.
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileUp, Link, AlertCircle, Clipboard } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';
import { fromLocalFile, fromURL } from '@/lib/io/import/byteSources';
import { createProgressStream, ProgressReport } from '@/lib/io/import/progress';
import { maybeGunzip } from '@/lib/io/import/decompress';
import { createJsonParsingStream } from '@/lib/io/import/jsonStream';

interface UploadSectionProps {
  onLeagueData: (data: { players: any[]; teams: any[]; meta: any }) => void;
  onImportError: (error: string) => void;
}

type ImportState = 'idle' | 'importing' | 'success' | 'error' | 'cancelled';

export function UploadSection({ onLeagueData, onImportError }: UploadSectionProps) {
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');
  const [importState, setImportState] = useState<ImportState>('idle');
  const [progress, setProgress] = useState<ProgressReport | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isProcessing = importState === 'importing';

  const handleImport = useCallback(async (
    getSource: () => Promise<{ stream: ReadableStream<Uint8Array>, totalBytes?: number }>,
    isGzip: boolean
  ) => {
    setImportState('importing');
    setProgress(null);
    setUrlError('');

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const collectedData = {
      players: [] as any[],
      teams: [] as any[],
      meta: {} as any,
    };

    try {
      const { stream, totalBytes } = await getSource();

      const progressStream = createProgressStream(totalBytes, setProgress);
      const gunzipStream = maybeGunzip(stream, isGzip);
      const jsonParser = await createJsonParsingStream({
        onMetaData: (meta) => {
          collectedData.meta = meta;
        },
        onPlayer: (player) => {
          collectedData.players.push(player);
        },
        onTeam: (team) => {
          collectedData.teams.push(team);
        },
        onComplete: () => {
          if (signal.aborted) return;
          onLeagueData(collectedData);
          setImportState('success');
        },
      });

      await gunzipStream
        .pipeThrough(progressStream)
        .pipeThrough(new TextDecoderStream())
        .pipeTo(jsonParser, { signal });

    } catch (error: any) {
      if (error.name === 'AbortError') {
        setImportState('cancelled');
        onImportError('Import canceled.');
      } else {
        setImportState('error');
        onImportError(error.message || 'An unknown import error occurred.');
      }
    } finally {
      abortControllerRef.current = null;
      setTimeout(() => {
        setImportState('idle');
        setProgress(null);
      }, 2000);
    }
  }, [onLeagueData, onImportError]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const isGzip = file.name.endsWith('.gz');
      handleImport(() => Promise.resolve(fromLocalFile(file)), isGzip);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      const isGzip = file.name.endsWith('.gz');
      handleImport(() => Promise.resolve(fromLocalFile(file)), isGzip);
    }
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) {
      setUrlError('Please enter a URL');
      return;
    }
    try {
      new URL(urlInput); // Validate
      const isGzip = urlInput.endsWith('.gz');
      handleImport(() => fromURL(urlInput.trim(), abortControllerRef.current!.signal), isGzip);
    } catch (error) {
      setUrlError('Please enter a valid URL');
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrlInput(text);
      setUrlError('');
    } catch (error) {
      // Ignore
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatEta = (seconds?: number) => {
    if (seconds === undefined || seconds > 3600 * 24) return '--:--';
    return new Date(seconds * 1000).toISOString().substr(14, 5);
  };

  return (
    <div className="text-center">
      <Card className="mb-8">
        <CardContent className="p-8">
          <Tabs defaultValue="file" className="w-full">
            <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-6 bg-transparent p-0 h-auto">
              <TabsTrigger value="file" data-testid="tab-file" disabled={isProcessing} className="...">
                Upload a ZenGM League File
              </TabsTrigger>
              <TabsTrigger value="url" data-testid="tab-url" disabled={isProcessing} className="...">
                Load a ZenGM League from URL
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="file">
              <div 
                className="upload-dropzone border-2 border-dashed border-border rounded-lg p-12 mb-6 mt-12 hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                data-testid="upload-dropzone"
              >
                <div className="flex flex-col items-center space-y-4">
                  <FileUp className="h-12 w-12 text-muted-foreground" />
                  <h3 className="text-lg font-semibold text-foreground">Upload a ZenGM League</h3>
                  <input
                    type="file"
                    id="file-input"
                    accept=".json,.gz"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={isProcessing}
                    data-testid="input-file"
                  />
                  <Button
                    onClick={() => document.getElementById('file-input')?.click()}
                    disabled={isProcessing}
                    className="bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90 text-primary-foreground ml-[1px]"
                    data-testid="button-upload"
                  >
                    {isProcessing ? (
                      <>
                        <Upload className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Choose League File'
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="url">
              <div className="border-2 border-dashed border-border rounded-lg p-12 mb-6 mt-12">
                <div className="flex flex-col items-center space-y-4">
                  <Link className="h-12 w-12 text-muted-foreground" />
                  <h3 className="text-lg font-semibold text-foreground">Load a ZenGM League from URL</h3>
                  <div className="w-full max-w-md space-y-2">
                    <div className="flex gap-2">
                      <Input
                        type="url"
                        placeholder="https://..."
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        disabled={isProcessing}
                        data-testid="input-url"
                        onKeyDown={(e) => e.key === 'Enter' && !isProcessing && handleUrlSubmit()}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handlePaste}
                        disabled={isProcessing}
                        data-testid="button-paste"
                        title="Paste from clipboard"
                      >
                        <Clipboard className="h-4 w-4" />
                      </Button>
                    </div>
                    {urlError && (
                      <div className="flex items-center text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {urlError}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleUrlSubmit}
                    disabled={isProcessing || !urlInput.trim()}
                    className="bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90 text-primary-foreground"
                    data-testid="button-load-url"
                  >
                    {isProcessing ? (
                      <>
                        <Upload className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load League'
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          {importState !== 'idle' && (
            <div className="mt-4 space-y-2">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                {importState === 'importing' && 'Importing...'}
                {importState === 'success' && 'Success! Grid is ready.'}
                {importState === 'cancelled' && 'Import cancelled.'}
                {importState === 'error' && 'An error occurred.'}
              </div>
              <Progress value={progress?.totalBytes ? progress.percent : undefined} className="w-full h-2" />
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <span>
                    {progress?.totalBytes
                      ? `${formatBytes(progress.processedBytes)} / ${formatBytes(progress.totalBytes)}`
                      : `${formatBytes(progress?.processedBytes || 0)}`}
                  </span>
                  <span className="font-mono">
                    {formatBytes(progress?.bytesPerSecond || 0)}/s
                  </span>
                  {progress?.totalBytes && (
                    <span className="font-mono">
                      ETA: {formatEta(progress.etaSeconds)}
                    </span>
                  )}
                </div>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={handleCancel} disabled={!isProcessing}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
