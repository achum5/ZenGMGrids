import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
// Import sport icon images
import basketballIcon from '@/assets/basketball.png';
import footballIcon from '@/assets/football.png';
import hockeyIcon from '@/assets/hockey.png';
import baseballIcon from '@/assets/baseball.png';
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
          <DialogTitle className="dark:text-white">
            Create Custom Grid
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Grid Card - Exact copy of normal grid layout */}
          <Card>
            <CardContent className="p-3 md:p-6">
              <div className="max-w-4xl mx-auto">
                <div className="bg-border/60 dark:bg-slate-600/90 rounded-2xl p-[2px] md:p-[3px] overflow-hidden">
                  <div className="grid grid-cols-4 gap-[2px] md:gap-[3px] w-full">
                    {/* Sport icon corner */}
                    <div className="aspect-square flex flex-col items-center justify-center bg-secondary dark:bg-slate-700 rounded-tl-2xl overflow-hidden">
                      <img 
                        src={
                          sport === 'football' ? footballIcon :
                          sport === 'hockey' ? hockeyIcon :
                          sport === 'baseball' ? baseballIcon :
                          basketballIcon
                        }
                        alt={`${sport} icon`}
                        className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 object-contain"
                      />
                    </div>
                    
                    {/* Column Headers */}
                    {gridState.cols.map((colConfig, index) => (
                      <CustomGridHeaderSelector
                        key={`col-${index}`}
                        config={colConfig}
                        teamOptions={teamOptions}
                        achievementOptions={achievementOptions}
                        onConfigChange={(newConfig) => handleColConfigChange(index, newConfig)}
                        position={`col-${index}`}
                        className={`aspect-square bg-secondary dark:bg-slate-700 p-2 md:p-3 overflow-hidden ${
                          index === gridState.cols.length - 1 ? 'rounded-tr-2xl' : ''
                        }`}
                      />
                    ))}

                    {/* Grid Rows */}
                    {gridState.rows.map((rowConfig, rowIndex) => [
                      // Row Header
                      <CustomGridHeaderSelector
                        key={`row-${rowIndex}`}
                        config={rowConfig}
                        teamOptions={teamOptions}
                        achievementOptions={achievementOptions}
                        onConfigChange={(newConfig) => handleRowConfigChange(rowIndex, newConfig)}
                        position={`row-${rowIndex}`}
                        className={`aspect-square bg-secondary dark:bg-slate-700 p-2 md:p-3 overflow-hidden ${
                          rowIndex === gridState.rows.length - 1 ? 'rounded-bl-2xl' : ''
                        }`}
                      />,

                      // Grid Cells for this row
                      ...gridState.cols.map((_, colIndex) => {
                        const isBottomRight = rowIndex === gridState.rows.length - 1 && colIndex === gridState.cols.length - 1;
                        return (
                          <CustomGridCell
                            key={`cell-${rowIndex}-${colIndex}`}
                            playerCount={gridState.cellResults[rowIndex][colIndex]}
                            row={rowIndex}
                            col={colIndex}
                            className={isBottomRight ? 'rounded-br-2xl' : ''}
                          />
                        );
                      })
                    ])}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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