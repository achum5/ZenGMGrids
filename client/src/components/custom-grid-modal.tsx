import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
// Import sport icon images
import basketballIcon from '@/assets/basketball.png';
import footballIcon from '@/assets/football.png';
import hockeyIcon from '@/assets/hockey.png';
import baseballIcon from '@/assets/baseball.png';
import { CustomGridHeaderSelector } from './custom-grid-header-selector';
import { CustomGridCell } from './custom-grid-cell';
import type { Team, Player, CatTeam, LeagueData } from '@/types/bbgm';
import type { SeasonIndex } from '@/lib/season-achievements';
import {
  createEmptyCustomGrid,
  getTeamOptions,
  getAchievementOptions,
  updateCustomGridState,
  customGridToGenerated,
  type CustomGridState,
  type HeaderConfig
} from '@/lib/custom-grid-utils';

interface CustomGridModalProps {
  isOpen: boolean;
  onClose: () => void;
  leagueData: LeagueData;
  onCreateGrid: (rows: CatTeam[], cols: CatTeam[]) => void;
}

type AutoFillMode = 'mixed' | 'teams' | 'achievements';

export function CustomGridModal({
  isOpen,
  onClose,
  leagueData,
  onCreateGrid
}: CustomGridModalProps) {
  const { teams, players, sport, seasonIndex } = leagueData;
  const [gridState, setGridState] = useState<CustomGridState>(createEmptyCustomGrid());
  const [autoFillMode, setAutoFillMode] = useState<AutoFillMode>('mixed');
  
  const teamOptions = getTeamOptions(teams);
  const achievementOptions = getAchievementOptions(sport || 'basketball', seasonIndex);

  // Update grid state when configurations change
  const updateGrid = useCallback((newState: CustomGridState) => {
    const updatedState = updateCustomGridState(newState, players, teams, seasonIndex);
    setGridState(updatedState);
  }, [players, teams, seasonIndex]);

  const handleHeaderChange = useCallback((
    axis: 'rows' | 'cols',
    index: number,
    newConfig: HeaderConfig
  ) => {
    const newState = { ...gridState };
    newState[axis][index] = newConfig;
    updateGrid(newState);
  }, [gridState, updateGrid]);

  const handleClearAll = useCallback(() => {
    updateGrid(createEmptyCustomGrid());
  }, [updateGrid]);

  const handleAutoFill = useCallback(async () => {
    // Count what's already filled
    const filledRows = gridState.rows.filter(row => row.selectedId !== null).length;
    const filledCols = gridState.cols.filter(col => col.selectedId !== null).length;
    const totalFilled = filledRows + filledCols;
    
    // Determine how many of each type to generate
    let teamsNeeded = 0;
    let achievementsNeeded = 0;
    
    if (autoFillMode === 'mixed') {
      // Use existing grid generation logic to determine optimal mix
      const remaining = 6 - totalFilled;
      if (remaining <= 0) return;
      
      // Randomly determine split like the original generator
      const numAchievements = Math.random() < 0.5 ? 2 : 3;
      const numTeams = 6 - numAchievements;
      
      // Adjust for what's already filled
      const currentTeams = gridState.rows.filter(r => r.type === 'team').length + 
                          gridState.cols.filter(c => c.type === 'team').length;
      const currentAchievements = gridState.rows.filter(r => r.type === 'achievement').length + 
                                 gridState.cols.filter(c => c.type === 'achievement').length;
      
      teamsNeeded = Math.max(0, numTeams - currentTeams);
      achievementsNeeded = Math.max(0, numAchievements - currentAchievements);
      
      // If we have excess, prefer the one we have less of
      const excess = teamsNeeded + achievementsNeeded - remaining;
      if (excess > 0) {
        if (currentTeams < currentAchievements) {
          achievementsNeeded = Math.max(0, achievementsNeeded - excess);
        } else {
          teamsNeeded = Math.max(0, teamsNeeded - excess);
        }
      }
    } else if (autoFillMode === 'teams') {
      teamsNeeded = 6 - totalFilled;
    } else { // achievements
      achievementsNeeded = 6 - totalFilled;
    }

    const newState = { ...gridState };
    
    // Get available options (exclude already selected)
    const usedTeamIds = [...gridState.rows, ...gridState.cols]
      .filter(item => item.type === 'team')
      .map(item => item.selectedId as number);
    const usedAchievementIds = [...gridState.rows, ...gridState.cols]
      .filter(item => item.type === 'achievement')
      .map(item => item.selectedId as string);
    
    const availableTeams = teamOptions.filter(t => !usedTeamIds.includes(t.id));
    const availableAchievements = achievementOptions.filter(a => !usedAchievementIds.includes(a.id));
    
    // Shuffle for randomness
    const shuffledTeams = [...availableTeams].sort(() => Math.random() - 0.5);
    const shuffledAchievements = [...availableAchievements].sort(() => Math.random() - 0.5);
    
    // Fill empty slots
    const emptySlots: { axis: 'rows' | 'cols', index: number }[] = [];
    for (let i = 0; i < 3; i++) {
      if (!newState.rows[i].selectedId) emptySlots.push({ axis: 'rows', index: i });
      if (!newState.cols[i].selectedId) emptySlots.push({ axis: 'cols', index: i });
    }
    
    // Shuffle empty slots for randomness
    const shuffledSlots = [...emptySlots].sort(() => Math.random() - 0.5);
    
    let teamIndex = 0;
    let achievementIndex = 0;
    
    for (const slot of shuffledSlots) {
      if (teamsNeeded > 0 && teamIndex < shuffledTeams.length) {
        const team = shuffledTeams[teamIndex];
        newState[slot.axis][slot.index] = {
          type: 'team',
          selectedId: team.id,
          selectedLabel: team.label
        };
        teamIndex++;
        teamsNeeded--;
      } else if (achievementsNeeded > 0 && achievementIndex < shuffledAchievements.length) {
        const achievement = shuffledAchievements[achievementIndex];
        newState[slot.axis][slot.index] = {
          type: 'achievement',
          selectedId: achievement.id,
          selectedLabel: achievement.label
        };
        achievementIndex++;
        achievementsNeeded--;
      }
    }
    
    updateGrid(newState);
  }, [gridState, updateGrid, autoFillMode, teamOptions, achievementOptions]);

  const handleCreateGrid = useCallback(() => {
    const generated = customGridToGenerated(gridState, teams, seasonIndex);
    if (generated) {
      onCreateGrid(generated.rows, generated.cols);
      onClose();
    }
  }, [gridState, teams, seasonIndex, onCreateGrid, onClose]);

  const canCreateGrid = gridState.isValid && gridState.isSolvable;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full max-h-[90vh] overflow-hidden p-0 dark:bg-slate-800">
        <DialogHeader className="px-6 py-4 border-b border-border dark:border-slate-700">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold dark:text-white">
              Create Custom Grid
            </DialogTitle>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              data-testid="button-close-custom-grid"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 overflow-auto">
          {/* Grid Container matching current design */}
          <div className="max-w-4xl mx-auto mb-6">
            <div className="bg-border/60 dark:bg-slate-600/90 rounded-2xl p-[2px] md:p-[3px] overflow-hidden">
              <div className="grid grid-cols-4 gap-[2px] md:gap-[3px] w-full">
                
                {/* Sport icon in top-left corner (like score position) */}
                <div className="aspect-square flex items-center justify-center bg-secondary dark:bg-slate-700 rounded-tl-2xl overflow-hidden">
                  <img 
                    src={
                      sport === 'basketball' ? basketballIcon :
                      sport === 'football' ? footballIcon :
                      sport === 'hockey' ? hockeyIcon :
                      sport === 'baseball' ? baseballIcon :
                      basketballIcon // fallback
                    }
                    alt={`${sport || 'Sport'} icon`} 
                    className="w-8 h-8 object-contain"
                  />
                </div>
                
                {/* Column Headers */}
                {gridState.cols.map((col, colIndex) => (
                  <CustomGridHeaderSelector
                    key={`col-${colIndex}`}
                    config={col}
                    teamOptions={teamOptions}
                    achievementOptions={achievementOptions}
                    onConfigChange={(newConfig) => handleHeaderChange('cols', colIndex, newConfig)}
                    position={`col-${colIndex}`}
                  />
                ))}

                {/* Grid Rows */}
                {gridState.rows.map((row, rowIndex) => [
                  // Row Header
                  <CustomGridHeaderSelector
                    key={`row-${rowIndex}`}
                    config={row}
                    teamOptions={teamOptions}
                    achievementOptions={achievementOptions}
                    onConfigChange={(newConfig) => handleHeaderChange('rows', rowIndex, newConfig)}
                    position={`row-${rowIndex}`}
                  />,
                  
                  // Grid Cells for this row
                  ...gridState.cols.map((col, colIndex) => (
                    <CustomGridCell
                      key={`cell-${rowIndex}-${colIndex}`}
                      playerCount={gridState.cellResults[rowIndex][colIndex]}
                      rowIndex={rowIndex}
                      colIndex={colIndex}
                      className={cn(
                        // Corner radius based on position in the 3x3 grid
                        rowIndex === 0 && colIndex === 0 && 'rounded-tl-lg',
                        rowIndex === 0 && colIndex === 2 && 'rounded-tr-2xl',
                        rowIndex === 2 && colIndex === 0 && 'rounded-bl-2xl',
                        rowIndex === 2 && colIndex === 2 && 'rounded-br-2xl'
                      )}
                    />
                  ))
                ])}
              </div>
            </div>
          </div>

          {/* Bottom Buttons */}
          <div className="flex items-center justify-between gap-4">
            {/* Clear All - Left */}
            <Button
              onClick={handleClearAll}
              variant="outline"
              className="dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white"
              data-testid="button-clear-all"
            >
              Clear All
            </Button>

            {/* Auto Fill - Center with Dropdown */}
            <div className="flex items-center">
              <Button
                onClick={handleAutoFill}
                variant="secondary"
                className="rounded-r-none dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white px-6"
                data-testid="button-auto-fill"
              >
                Auto Fill
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    className="rounded-l-none border-l border-border dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white px-2"
                    data-testid="button-auto-fill-dropdown"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="center" 
                  className="dark:bg-slate-700 dark:border-slate-600"
                  data-testid="dropdown-auto-fill-options"
                >
                  <DropdownMenuItem
                    onClick={() => setAutoFillMode('mixed')}
                    className={cn(
                      "dark:hover:bg-slate-600 cursor-pointer",
                      autoFillMode === 'mixed' && "bg-primary/10 dark:bg-primary/20"
                    )}
                    data-testid="option-mixed"
                  >
                    Mixed (default)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setAutoFillMode('teams');
                      // Need to pass the mode directly since state update is async
                      setTimeout(() => {
                        const newState = { ...gridState };
                        // Auto fill logic for teams only
                        const filledRows = newState.rows.filter(row => row.selectedId !== null).length;
                        const filledCols = newState.cols.filter(col => col.selectedId !== null).length;
                        const totalFilled = filledRows + filledCols;
                        const teamsNeeded = 6 - totalFilled;
                        
                        if (teamsNeeded > 0) {
                          const usedTeamIds = [...newState.rows, ...newState.cols]
                            .filter(item => item.type === 'team')
                            .map(item => item.selectedId as number);
                          const availableTeams = teamOptions.filter(t => !usedTeamIds.includes(t.id));
                          const shuffledTeams = [...availableTeams].sort(() => Math.random() - 0.5);
                          
                          const emptySlots: { axis: 'rows' | 'cols', index: number }[] = [];
                          for (let i = 0; i < 3; i++) {
                            if (newState.rows[i].selectedId === null) emptySlots.push({ axis: 'rows', index: i });
                            if (newState.cols[i].selectedId === null) emptySlots.push({ axis: 'cols', index: i });
                          }
                          
                          let teamIndex = 0;
                          for (const slot of emptySlots.slice(0, Math.min(teamsNeeded, shuffledTeams.length))) {
                            const team = shuffledTeams[teamIndex];
                            if (team) {
                              newState[slot.axis][slot.index] = {
                                type: 'team',
                                selectedId: team.id,
                                selectedLabel: team.label
                              };
                              teamIndex++;
                            }
                          }
                          
                          updateGrid(newState);
                        }
                      }, 0);
                    }}
                    className={cn(
                      "dark:hover:bg-slate-600 cursor-pointer",
                      autoFillMode === 'teams' && "bg-primary/10 dark:bg-primary/20"
                    )}
                    data-testid="option-teams"
                  >
                    Auto Fill In Teams
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setAutoFillMode('achievements');
                      // Need to pass the mode directly since state update is async
                      setTimeout(() => {
                        const newState = { ...gridState };
                        // Auto fill logic for achievements only
                        const filledRows = newState.rows.filter(row => row.selectedId !== null).length;
                        const filledCols = newState.cols.filter(col => col.selectedId !== null).length;
                        const totalFilled = filledRows + filledCols;
                        const achievementsNeeded = 6 - totalFilled;
                        
                        if (achievementsNeeded > 0) {
                          const usedAchievementIds = [...newState.rows, ...newState.cols]
                            .filter(item => item.type === 'achievement')
                            .map(item => item.selectedId as string);
                          const availableAchievements = achievementOptions.filter(a => !usedAchievementIds.includes(a.id));
                          const shuffledAchievements = [...availableAchievements].sort(() => Math.random() - 0.5);
                          
                          const emptySlots: { axis: 'rows' | 'cols', index: number }[] = [];
                          for (let i = 0; i < 3; i++) {
                            if (newState.rows[i].selectedId === null) emptySlots.push({ axis: 'rows', index: i });
                            if (newState.cols[i].selectedId === null) emptySlots.push({ axis: 'cols', index: i });
                          }
                          
                          let achievementIndex = 0;
                          for (const slot of emptySlots.slice(0, Math.min(achievementsNeeded, shuffledAchievements.length))) {
                            const achievement = shuffledAchievements[achievementIndex];
                            if (achievement) {
                              newState[slot.axis][slot.index] = {
                                type: 'achievement',
                                selectedId: achievement.id,
                                selectedLabel: achievement.label
                              };
                              achievementIndex++;
                            }
                          }
                          
                          updateGrid(newState);
                        }
                      }, 0);
                    }}
                    className={cn(
                      "dark:hover:bg-slate-600 cursor-pointer",
                      autoFillMode === 'achievements' && "bg-primary/10 dark:bg-primary/20"
                    )}
                    data-testid="option-achievements"
                  >
                    Auto Fill In Achievements
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Create Grid - Right */}
            <Button
              onClick={handleCreateGrid}
              disabled={!canCreateGrid}
              className={cn(
                "dark:text-white",
                canCreateGrid
                  ? "bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
                  : "bg-gray-400 cursor-not-allowed dark:bg-gray-600"
              )}
              data-testid="button-create-grid"
            >
              Create Grid
            </Button>
          </div>

          {/* Validation Status */}
          {!gridState.isValid && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Fill all headers to enable grid creation
            </div>
          )}
          {gridState.isValid && !gridState.isSolvable && (
            <div className="mt-4 text-center text-sm text-destructive">
              Grid is unsolvable - some cells require the same unique player
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}