import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Upload, Link } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface UploadSectionProps {
  onFileUpload: (file: File) => void;
  onUrlUpload: (url: string) => void;
  isImporting: boolean;
  importProgress: number;
}

export function UploadSection({ onFileUpload, onUrlUpload, isImporting, importProgress }: UploadSectionProps) {
  const [url, setUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const handleUrlSubmit = () => {
    if (url) {
      onUrlUpload(url);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import League</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isImporting ? (
          <div className="space-y-2">
            <Progress value={importProgress} />
            <p className="text-sm text-center text-muted-foreground">
              Importing league... ({importProgress}%)</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Button onClick={() => fileInputRef.current?.click()} className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                Upload File (.json, .json.gz)
              </Button>
              <Input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".json,.json.gz"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">OR</span>
              <Separator className="flex-1" />
            </div>
            <div className="flex w-full items-center space-x-2">
              <Input
                type="url"
                placeholder="Enter league file URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
              />
              <Button onClick={handleUrlSubmit}>
                <Link className="mr-2 h-4 w-4" />
                Import
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
