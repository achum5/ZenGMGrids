import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileUp, Link, AlertCircle, Clipboard, Settings } from 'lucide-react';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UploadSectionProps {
  onFileUpload: (file: File) => void;
  onUrlUpload: (url: string) => void;
  isProcessing: boolean;
  uploadProgress?: {
    message: string;
    loaded?: number;
    total?: number;
  } | null;
  parsingMethod?: 'auto' | 'traditional' | 'streaming' | 'mobile-streaming';
  onParsingMethodChange?: (method: 'auto' | 'traditional' | 'streaming' | 'mobile-streaming') => void;
}

export function UploadSection({ onFileUpload, onUrlUpload, isProcessing, uploadProgress, parsingMethod = 'auto', onParsingMethodChange }: UploadSectionProps) {
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrlInput(text);
      setUrlError('');
    } catch (error) {
      // Fallback or ignore if clipboard access fails
  
    }
  };

  const handleUrlSubmit = () => {
    setUrlError('');
    if (!urlInput.trim()) {
      setUrlError('Please enter a URL');
      return;
    }
    
    try {
      new URL(urlInput); // Validate URL format
      onUrlUpload(urlInput.trim());
    } catch (error) {
      setUrlError('Please enter a valid URL');
    }
  };
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  return (
    <div className="text-center">
      <Card className="border-0 shadow-none bg-transparent">
        <CardContent className="">
          {/* Upload Method Toggle */}
          {onParsingMethodChange && (
            <div className="flex items-center justify-center gap-3 translate-y-[-1rem]">
              <span className="text-sm font-medium text-muted-foreground">Upload Method:</span>
              <Select 
                value={parsingMethod} 
                onValueChange={onParsingMethodChange}
                disabled={isProcessing}
              >
                <SelectTrigger className="w-auto max-w-full" data-testid="select-parsing-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto" data-testid="option-auto">
                    Auto (Recommended)
                  </SelectItem>
                  <SelectItem value="traditional" data-testid="option-traditional">
                    Traditional
                  </SelectItem>
                  <SelectItem value="streaming" data-testid="option-streaming">
                    Streaming (desktop only)
                  </SelectItem>
                  <SelectItem value="mobile-streaming" data-testid="option-mobile-streaming">
                    Mobile Streaming (beta)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* File Upload Section */}
            <div 
              className="upload-dropzone border-2 border-dashed border-border rounded-lg p-8 hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all"
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
                  accept=".json,.gz,.bbgm,.fbgm,.hgm,.bgm,.zgmh,.zgmb"
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
            
            {/* Progress Bar - Mobile Only (between sections) */}
            {uploadProgress && (
              <div className="md:hidden space-y-2 px-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">{uploadProgress.message}</span>
                  {uploadProgress.loaded !== undefined && uploadProgress.total !== undefined && (
                    <span className="text-primary font-bold">
                      {((uploadProgress.loaded / uploadProgress.total) * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                {uploadProgress.loaded !== undefined && uploadProgress.total !== undefined && (
                  <div className="w-full bg-secondary/50 rounded-full h-3 overflow-hidden shadow-lg">
                    <div
                      className="h-3 rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] loading-bar-solid-blue"
                      style={{
                        width: `${(uploadProgress.loaded / uploadProgress.total) * 100}%`
                      }}
                    />
                  </div>
                )}
              </div>
            )}
            
            {/* URL Upload Section */}
            <div className="border-2 border-dashed border-border rounded-lg p-8">
              <div className="flex flex-col items-center space-y-4">
                <Link className="h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground">Load a ZenGM League from URL</h3>
                <div className="w-full space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      placeholder=""
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
          </div>
          
          {/* Progress Bar - Desktop Only (below sections) */}
          {uploadProgress && (
            <div className="hidden md:block mt-6 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium">{uploadProgress.message}</span>
                {uploadProgress.loaded !== undefined && uploadProgress.total !== undefined && (
                  <span className="text-primary font-bold">
                    {((uploadProgress.loaded / uploadProgress.total) * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              {uploadProgress.loaded !== undefined && uploadProgress.total !== undefined && (
                <div className="w-full bg-secondary/50 rounded-full h-3 overflow-hidden shadow-lg">
                  <div
                    className="h-3 rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] loading-bar-solid-blue"
                    style={{
                      width: `${(uploadProgress.loaded / uploadProgress.total) * 100}%`
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
