import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileUp, Link, AlertCircle, Clipboard } from 'lucide-react';
import { useState } from 'react';

interface UploadSectionProps {
  onFileUpload: (file: File) => void;
  onUrlUpload: (url: string) => void;
  isProcessing: boolean;
}

export function UploadSection({ onFileUpload, onUrlUpload, isProcessing }: UploadSectionProps) {
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
      <Card className="mb-8 border-0 shadow-none bg-transparent">
        <CardContent className="p-8">
          <div className="space-y-8">
            {/* File Upload Section */}
            <div 
              className="upload-dropzone border-2 border-dashed border-border rounded-lg p-12 hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all"
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
            
            {/* URL Upload Section */}
            <div className="border-2 border-dashed border-border rounded-lg p-12">
              <div className="flex flex-col items-center space-y-4">
                <Link className="h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground">Load a ZenGM League from URL</h3>
                <div className="w-full max-w-md space-y-2">
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
        </CardContent>
      </Card>
    </div>
  );
}
