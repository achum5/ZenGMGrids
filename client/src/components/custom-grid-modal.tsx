import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';
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
        className="max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-slate-800"
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
        </DialogHeader>

        <div className="space-y-6 p-4">
          {/* Grid Layout */}
          <div className="grid grid-cols-4 gap-3">
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
                className="min-h-[120px]"
              />
            ))}

            {/* Grid Rows */}
            {gridState.rows.map((rowConfig, rowIndex) => (
              <>
                {/* Row Header */}
                <CustomGridHeaderSelector
                  key={`row-${rowIndex}`}
                  config={rowConfig}
                  teamOptions={teamOptions}
                  achievementOptions={achievementOptions}
                  onConfigChange={(newConfig) => handleRowConfigChange(rowIndex, newConfig)}
                  position={`row-${rowIndex}`}
                  className="min-h-[120px]"
                />

                {/* Grid Cells for this row */}
                {gridState.cols.map((_, colIndex) => (
                  <CustomGridCell
                    key={`cell-${rowIndex}-${colIndex}`}
                    playerCount={gridState.cellResults[rowIndex][colIndex]}
                    row={rowIndex}
                    col={colIndex}
                  />
                ))}
              </>
            ))}
          </div>

          {/* Grid Status */}
          <div className="bg-muted/50 dark:bg-slate-700/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium dark:text-white">Grid Status:</span>
              <div className="flex gap-2">
                <span className={`text-xs px-2 py-1 rounded ${
                  gridState.isValid 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' 
                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                }`}>
                  {gridState.isValid ? 'All cells have players' : 'Some cells have no players'}
                </span>
                {gridState.isValid && (
                  <span className={`text-xs px-2 py-1 rounded ${
                    gridState.isSolvable 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' 
                      : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                  }`}>
                    {gridState.isSolvable ? 'Grid is solvable' : 'Grid may be unsolvable'}
                  </span>
                )}
              </div>
            </div>
            
            {!gridState.isSolvable && gridState.isValid && (
              <p className="text-xs text-muted-foreground dark:text-gray-400">
                Warning: Some cells may require the same player, making the grid unsolvable. 
                Try adjusting your selections.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button
              onClick={onClose}
              variant="outline"
              className="dark:bg-slate-700 dark:hover:bg-slate-600"
              data-testid="button-cancel-custom-grid"
            >
              Cancel
            </Button>
            
            <Button
              onClick={handleCreateGrid}
              disabled={!isCreateEnabled}
              className={`transition-all duration-200 ${
                isCreateEnabled
                  ? 'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white'
                  : 'bg-gray-400 dark:bg-gray-600 text-gray-300 cursor-not-allowed'
              }`}
              data-testid="button-create-custom-grid"
            >
              Create Grid
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}