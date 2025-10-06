import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
      console.log('Clipboard access failed');
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
      <Card className="mb-8">
        <CardContent className="p-8">
          <Tabs defaultValue="file" className="w-full">
            <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-6 bg-transparent p-0 h-auto">
              <TabsTrigger 
                value="file" 
                data-testid="tab-file" 
                className="
                  h-12 px-2 py-3 rounded-xl font-semibold cursor-pointer
                  bg-primary text-primary-foreground border-0
                  hover:bg-primary/90 active:bg-primary/80 active:scale-[0.98]
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
                  disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-primary
                  transition-all duration-200 ease-out
                  data-[state=active]:bg-primary data-[state=active]:text-primary-foreground
                  data-[state=inactive]:bg-transparent data-[state=inactive]:text-primary data-[state=inactive]:border-2 data-[state=inactive]:border-primary
                  data-[state=inactive]:hover:bg-primary/10
                  shadow-sm
                  text-xs xs:text-sm sm:text-base lg:text-base
                "
              >
                Upload a ZenGM League File
              </TabsTrigger>
              <TabsTrigger 
                value="url" 
                data-testid="tab-url" 
                className="
                  h-12 px-2 py-3 rounded-xl font-semibold cursor-pointer
                  bg-primary text-primary-foreground border-0
                  hover:bg-primary/90 active:bg-primary/80 active:scale-[0.98]
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
                  disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-primary
                  transition-all duration-200 ease-out
                  data-[state=active]:bg-primary data-[state=active]:text-primary-foreground
                  data-[state=inactive]:bg-transparent data-[state=inactive]:text-primary data-[state=inactive]:border-2 data-[state=inactive]:border-primary
                  data-[state=inactive]:hover:bg-primary/10
                  text-xs xs:text-sm sm:text-base lg:text-base
                "
              >
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
            </TabsContent>
          </Tabs>
          
          
        </CardContent>
      </Card>
    </div>
  );
}
