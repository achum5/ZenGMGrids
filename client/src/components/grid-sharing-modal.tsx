import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Download, Upload, Check, Clipboard } from 'lucide-react';
import { useToast } from '@/lib/hooks/use-toast';
import type { CatTeam, LeagueData } from '@/types/bbgm';
import { exportGrid, importGrid, generateGridCode, parseGridCode, detectSport, type SharedGrid } from '@/lib/grid-sharing';

interface GridSharingModalProps {
  isOpen: boolean;
  onClose: () => void;
  rows: CatTeam[];
  cols: CatTeam[];
  leagueData: LeagueData | null;
  onImportGrid: (rows: CatTeam[], cols: CatTeam[]) => void;
}

export function GridSharingModal({
  isOpen,
  onClose,
  rows,
  cols,
  leagueData,
  onImportGrid,
}: GridSharingModalProps) {
  const { toast } = useToast();
  const [importCode, setImportCode] = useState('');
  const [copied, setCopied] = useState(false);

  const sport = leagueData ? detectSport(leagueData) : 'basketball';

  // Generate current grid code
  const currentGridCode = rows.length > 0 && cols.length > 0 
    ? generateGridCode(exportGrid(rows, cols, sport))
    : '';

  const handleCopyCode = async () => {
    if (!currentGridCode) return;
    
    try {
      await navigator.clipboard.writeText(currentGridCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please manually copy the code below.",
        variant: "destructive",
      });
    }
  };

  const handlePasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setImportCode(text);
    } catch (error) {
      toast({
        title: "Paste failed",
        description: "Unable to read from clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleImportCode = () => {
    if (!importCode.trim() || !leagueData) return;

    const sharedGrid = parseGridCode(importCode.trim());
    if (!sharedGrid) {
      toast({
        title: "Invalid grid code",
        description: "The code you entered is not valid.",
        variant: "destructive",
      });
      return;
    }

    const result = importGrid(sharedGrid, leagueData);
    if (!result) {
      toast({
        title: "Import failed",
        description: "This grid is not compatible with your current league file.",
        variant: "destructive",
      });
      return;
    }

    onImportGrid(result.rows, result.cols);
    onClose();
    setImportCode('');
  };

  const gridInfo = rows.length > 0 && cols.length > 0 ? (
    <div className="text-sm text-muted-foreground space-y-1">
      <div><strong>Rows:</strong> {rows.map(r => r.label).join(', ')}</div>
      <div><strong>Cols:</strong> {cols.map(c => c.label).join(', ')}</div>
      <div><strong>Sport:</strong> {sport.charAt(0).toUpperCase() + sport.slice(1)}</div>
    </div>
  ) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share Grid</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Export Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Current Grid
            </h3>
            
            {currentGridCode ? (
              <div className="space-y-3">
                {gridInfo}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Grid Code:</label>
                  <div className="flex gap-2">
                    <Textarea
                      value={currentGridCode}
                      readOnly
                      rows={3}
                      className="font-mono text-xs"
                    />
                    <Button
                      onClick={handleCopyCode}
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Share this code with friends who have the same league file to play the same grid.
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Generate a grid first to export it.
              </p>
            )}
          </div>

          <hr />

          {/* Import Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Shared Grid
            </h3>
            
            {leagueData ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Paste Grid Code:</label>
                  <div className="flex gap-2">
                    <Textarea
                      value={importCode}
                      onChange={(e) => setImportCode(e.target.value)}
                      placeholder="Paste the grid code here..."
                      rows={3}
                      className="font-mono text-xs"
                    />
                    <Button
                      onClick={handlePasteCode}
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                    >
                      <Clipboard className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button 
                  onClick={handleImportCode}
                  disabled={!importCode.trim()}
                  className="w-full"
                >
                  Import Grid
                </Button>
                <p className="text-sm text-muted-foreground">
                  This will replace your current grid with the shared one. Make sure you have the same league file for best results.
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Upload a league file first to import grids.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}