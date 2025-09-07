import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CustomGridHeaderSelector } from './custom-grid-header-selector';
import { CustomGridCell } from './custom-grid-cell';
import type { Player, Team } from '@/types/bbgm';
import type { SeasonIndex } from '@/lib/season-achievements';
import {
  createEmptyCustomGrid,
  getTeamOptions,
  getAchievementOptions,
  updateCustomGridState,
  customGridToGenerated,
  type CustomGridState,
  type HeaderConfig,
  type TeamOption,
  type AchievementOption
} from '@/lib/custom-grid-utils';

interface CustomGridModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGrid: (rows: any[], cols: any[]) => void;
  players: Player[];
  teams: Team[];
  sport: string;
  seasonIndex?: SeasonIndex;
}

export function CustomGridModal({
  isOpen,
  onClose,
  onCreateGrid,
  players,
  teams,
  sport,
  seasonIndex
}: CustomGridModalProps) {
  const [gridState, setGridState] = useState<CustomGridState>(createEmptyCustomGrid());
  const [teamOptions, setTeamOptions] = useState<TeamOption[]>([]);
  const [achievementOptions, setAchievementOptions] = useState<AchievementOption[]>([]);

  // Initialize options when modal opens
  useEffect(() => {
    if (isOpen) {
      setTeamOptions(getTeamOptions(teams));
      setAchievementOptions(getAchievementOptions(sport, seasonIndex));
      setGridState(createEmptyCustomGrid());
    }
  }, [isOpen, teams, sport, seasonIndex]);

  // Update grid state when any configuration changes
  useEffect(() => {
    if (isOpen && players.length > 0) {
      const newState = updateCustomGridState(gridState, players, teams, seasonIndex);
      setGridState(newState);
    }
  }, [gridState.rows, gridState.cols, isOpen, players, teams, seasonIndex]);

  const handleRowConfigChange = (index: number, newConfig: HeaderConfig) => {
    const newRows = [...gridState.rows] as [HeaderConfig, HeaderConfig, HeaderConfig];
    newRows[index] = newConfig;
    setGridState(prev => ({ ...prev, rows: newRows }));
  };

  const handleColConfigChange = (index: number, newConfig: HeaderConfig) => {
    const newCols = [...gridState.cols] as [HeaderConfig, HeaderConfig, HeaderConfig];
    newCols[index] = newConfig;
    setGridState(prev => ({ ...prev, cols: newCols }));
  };

  const handleCreateGrid = () => {
    const generated = customGridToGenerated(gridState, teams, seasonIndex);
    if (generated) {
      onCreateGrid(generated.rows, generated.cols);
      onClose();
    }
  };

  const isCreateEnabled = gridState.isValid && gridState.isSolvable;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-5xl max-h-[95vh] overflow-y-auto dark:bg-slate-900/95 backdrop-blur-sm border-2 border-primary/20"
        data-testid="custom-grid-modal"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between dark:text-white">
            Create Custom Grid
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-destructive/20"
              data-testid="button-close-custom-grid"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Design your own custom grid by selecting teams and achievements for each row and column. 
            All cells must have at least one eligible player for the grid to be playable.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 p-6">
          {/* Title Section */}
          <div className="text-center border-b border-border dark:border-slate-600 pb-4">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Custom Grid Designer
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Create your perfect challenge by selecting teams and achievements
            </p>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-4 gap-4">
            {/* Top-left corner - empty */}
            <div className="aspect-square" />
            
            {/* Column Headers */}
            {gridState.cols.map((colConfig, index) => (
              <CustomGridHeaderSelector
                key={`col-${index}`}
                config={colConfig}
                teamOptions={teamOptions}
                achievementOptions={achievementOptions}
                onConfigChange={(newConfig) => handleColConfigChange(index, newConfig)}
                position={`col-${index}`}
                className="min-h-[140px]"
              />
            ))}

            {/* Grid Rows */}
            {gridState.rows.map((rowConfig, rowIndex) => [
              /* Row Header */
              <CustomGridHeaderSelector
                key={`row-${rowIndex}`}
                config={rowConfig}
                teamOptions={teamOptions}
                achievementOptions={achievementOptions}
                onConfigChange={(newConfig) => handleRowConfigChange(rowIndex, newConfig)}
                position={`row-${rowIndex}`}
                className="min-h-[140px]"
              />,

              /* Grid Cells for this row */
              ...gridState.cols.map((_, colIndex) => (
                <CustomGridCell
                  key={`cell-${rowIndex}-${colIndex}`}
                  playerCount={gridState.cellResults[rowIndex][colIndex]}
                  row={rowIndex}
                  col={colIndex}
                />
              ))
            ])}
          </div>

          {/* Grid Status */}
          <Card className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-2">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Grid Status</h3>
                <div className="flex gap-3">
                  <Badge 
                    variant={gridState.isValid ? "default" : "destructive"}
                    className="px-3 py-1 font-medium"
                  >
                    {gridState.isValid ? '✓ All cells valid' : '⚠ Missing players'}
                  </Badge>
                  {gridState.isValid && (
                    <Badge 
                      variant={gridState.isSolvable ? "default" : "secondary"}
                      className={cn(
                        "px-3 py-1 font-medium",
                        gridState.isSolvable 
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" 
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      )}
                    >
                      {gridState.isSolvable ? '✓ Solvable' : '⚡ Complex'}
                    </Badge>
                  )}
                </div>
              </div>
              
              {!gridState.isSolvable && gridState.isValid && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Heads up:</strong> Some cells may require the same player, creating an extra challenge. 
                    This grid is still playable but might be quite difficult!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-border dark:border-slate-600">
            <Button
              onClick={onClose}
              variant="outline"
              size="lg"
              className="px-8 hover:bg-muted/80 transition-all duration-200"
              data-testid="button-cancel-custom-grid"
            >
              Cancel
            </Button>
            
            <Button
              onClick={handleCreateGrid}
              disabled={!isCreateEnabled}
              size="lg"
              className={cn(
                "px-8 font-semibold transition-all duration-300 transform",
                isCreateEnabled
                  ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl hover:scale-105"
                  : "bg-gray-400 dark:bg-gray-600 text-gray-300 cursor-not-allowed"
              )}
              data-testid="button-create-custom-grid"
            >
              {isCreateEnabled ? "🎯 Create Grid" : "Complete Grid First"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}