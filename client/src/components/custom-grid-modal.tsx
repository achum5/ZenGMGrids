import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Grid3x3, Trash2, Play, RotateCcw, X, ArrowUpDown, ChevronDown, Wand2 } from 'lucide-react';
import type { LeagueData, Team, CatTeam } from '@/types/bbgm';
import { detectSport } from '@/lib/grid-sharing';
import { getTeamOptions, getAchievementOptions, calculateCustomCellIntersection, headerConfigToCatTeam, type TeamOption, type AchievementOption, type HeaderConfig } from '@/lib/custom-grid-utils';
import { getAllAchievements } from '@/lib/achievements';
import { SEASON_ACHIEVEMENTS } from '@/lib/season-achievements';
import { getCachedSeasonIndex } from '@/lib/season-index-cache';
import { StatBuilderChip } from '@/components/stat-builder-chip';
import { parseAchievementLabel, createCustomNumericalAchievement } from '@/lib/editable-achievements';

// Extract base stat name from achievement labels for clean modal display
function extractBaseStatName(label: string): string {
  const parsed = parseAchievementLabel(label);
  if (parsed.isEditable) {
    // Remove the number and return just the suffix (e.g., "20,000+ Career Points" -> "Career Points")
    return parsed.suffix.replace(/^\s*\+?\s*/, '').trim();
  }
  return label;
}

// Team logo icon component for combobox
function TeamLogoIcon({ teamData }: { teamData?: Team }) {
  const [logoError, setLogoError] = useState(false);
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  
  useEffect(() => {
    if (!teamData) {
      setCurrentLogo(null);
      return;
    }
    
    // Build logo candidates similar to TeamLogo component
    const candidates: string[] = [];
    
    // Try small logo first, then regular logo
    if (teamData.imgURLSmall) {
      candidates.push(teamData.imgURLSmall);
    }
    if (teamData.imgURL) {
      candidates.push(teamData.imgURL);
    }
    
    // Try BBGM default paths if no custom logos
    if (candidates.length === 0 && teamData.abbrev) {
      const abbrev = teamData.abbrev.toUpperCase();
      candidates.push(`https://basketball-gm.com/img/logos-primary/${abbrev}.svg`);
      candidates.push(`https://basketball-gm.com/img/logos-secondary/${abbrev}.svg`);
    }
    
    setCurrentLogo(candidates[0] || null);
    setLogoError(false);
  }, [teamData]);
  
  if (!currentLogo || logoError) {
    return (
      <div className="w-6 h-6 flex items-center justify-center text-xs">
        🏀
      </div>
    );
  }
  
  return (
    <div className="w-6 h-6 flex items-center justify-center overflow-hidden">
      <img
        src={currentLogo}
        alt={teamData?.name || 'Team logo'}
        className="w-full h-full object-contain"
        onError={() => setLogoError(true)}
      />
    </div>
  );
}

interface CustomGridModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayGrid: (rows: CatTeam[], cols: CatTeam[], rowSelectors?: any[], colSelectors?: any[]) => void;
  leagueData: LeagueData | null;
  rows: CatTeam[];
  cols: CatTeam[];
}

type SelectorType = 'team' | 'achievement';

interface SelectorState {
  type: SelectorType | null;
  value: string | null;
  label: string | null;
  customAchievement?: any; // Store custom achievement for dynamic numerical thresholds
  operator: '≥' | '≤'; // Store operator state for achievements
  customNumber?: number; // Store custom number to prevent reset
}

export function CustomGridModal({ isOpen, onClose, onPlayGrid, leagueData, rows, cols }: CustomGridModalProps) {
  
  // State for the 6 selectors (3 rows + 3 cols)
  const [rowSelectors, setRowSelectors] = useState<SelectorState[]>([
    { type: null, value: null, label: null, customAchievement: null, operator: '≥', customNumber: undefined },
    { type: null, value: null, label: null, customAchievement: null, operator: '≥', customNumber: undefined },
    { type: null, value: null, label: null, customAchievement: null, operator: '≥', customNumber: undefined }
  ]);
  
  const [colSelectors, setColSelectors] = useState<SelectorState[]>([
    { type: null, value: null, label: null, customAchievement: null, operator: '≥', customNumber: undefined },
    { type: null, value: null, label: null, customAchievement: null, operator: '≥', customNumber: undefined },
    { type: null, value: null, label: null, customAchievement: null, operator: '≥', customNumber: undefined }
  ]);
  
  const sport = leagueData ? detectSport(leagueData) : 'basketball';
  
  // Memoize expensive computations to prevent performance issues
  const teamOptions = useMemo<TeamOption[]>(() => {
    return leagueData ? getTeamOptions(leagueData.teams) : [];
  }, [leagueData?.teams]);
  
  // Use cached season index for achievements (replaces expensive local rebuild)
  const seasonIndex = useMemo(() => {
    return leagueData ? getCachedSeasonIndex(leagueData.players, sport) : undefined;
  }, [leagueData?.players, sport]);

  useEffect(() => {
    if (isOpen) {
      const catTeamToSelectorState = (catTeam: CatTeam): SelectorState => {
        if (catTeam.type === 'team') {
          return {
            type: 'team',
            value: catTeam.tid !== undefined ? catTeam.tid.toString() : null,
            label: catTeam.label,
            operator: '≥',
            customAchievement: null,
            customNumber: undefined,
          };
        } else if (catTeam.type === 'achievement' && catTeam.achievementId) {
          let operator: '≥' | '≤' = '≥';
          let customAchievement = null;
          let customNumber: number | undefined = undefined;

          if (catTeam.achievementId.includes('_custom_')) {
            const parts = catTeam.achievementId.split('_custom_');
            const baseId = parts[0];
            const customPart = parts[1];
            const customParts = customPart.split('_');
            const value = parseFloat(customParts[0]);
            customNumber = value;
            const operatorStr = customParts[1] as 'gte' | 'lte';
            operator = operatorStr === 'lte' ? '≤' : '≥';

            if (leagueData) {
              const achievements = getAllAchievements(sport as any, seasonIndex, leagueData.leagueYears);
              const realAchievement = achievements.find((ach: any) => ach.id === baseId);
              if (realAchievement) {
                customAchievement = createCustomNumericalAchievement(realAchievement, value, sport, operator);
              }
            }
            
            return {
              type: 'achievement',
              value: baseId,
              label: catTeam.label,
              operator,
              customAchievement,
              customNumber,
            };
          }

          return {
            type: 'achievement',
            value: catTeam.achievementId,
            label: catTeam.label,
            operator: '≥',
            customAchievement: null,
            customNumber: undefined,
          };
        }
        return { type: null, value: null, label: null, operator: '≥', customAchievement: null, customNumber: undefined };
      };

      if (rows.length === 3 && cols.length === 3) {
        setRowSelectors(rows.map(catTeamToSelectorState));
        setColSelectors(cols.map(catTeamToSelectorState));
      } else {
        // Reset if the grid is not fully formed
        handleClearAll();
      }
    }
  }, [isOpen, rows, cols, leagueData, sport, seasonIndex]);
  
  const [hideZeroResults, setHideZeroResults] = useState(false);
  
  // Loading state for cell count calculations
  const [calculating, setCalculating] = useState(false);
  
  // Cell intersection counts
  const [cellCounts, setCellCounts] = useState<Record<string, number>>({});
  
  // Option counts for popover (team/achievement -> eligible player count)
  const [optionCounts, setOptionCounts] = useState<Record<string, number>>({});
  
  // Undo functionality for autofill
  const [canUndo, setCanUndo] = useState(false);
  const [previousState, setPreviousState] = useState<{
    rowSelectors: SelectorState[];
    colSelectors: SelectorState[];
  } | null>(null);
  
  const achievementOptions = useMemo<AchievementOption[]>(() => {
    console.log('🔧 [MEMO] Recalculating achievement options...');
    return leagueData ? getAchievementOptions(sport, seasonIndex, leagueData.leagueYears) : [];
  }, [sport, seasonIndex, leagueData?.leagueYears, "v2"]); // Cache bust with version v2

  // Handler for when achievement numbers are edited
  const handleAchievementNumberChange = useCallback((
    selectorType: 'row' | 'col',
    index: number,
    newNumber: number,
    newLabel: string,
    operator?: '≥' | '≤'
  ) => {
    const updateSelector = (selectors: SelectorState[]) => {
      const newSelectors = [...selectors];
      const currentSelector = newSelectors[index];
      
      if (currentSelector.type === 'achievement' && leagueData) {
        // Find the original achievement
        const originalAchievement = achievementOptions.find(ach => ach.id === currentSelector.value);
        
        if (originalAchievement) {
          // Get the real achievement object from the achievements system
          const achievements = getAllAchievements(sport as any, seasonIndex, leagueData.leagueYears);
          const realAchievement = achievements.find((ach: any) => ach.id === originalAchievement.id);
          
          if (realAchievement) {
            // Preserve current operator if not provided (when changing numbers)
            const currentOperator = operator || currentSelector.operator || '≥';
            
            // Create custom achievement with new threshold using the real achievement
            const customAchievement = createCustomNumericalAchievement(realAchievement, newNumber, sport, currentOperator);
            
            // Update the selector with custom achievement (preserve original label)
            newSelectors[index] = {
              ...currentSelector,
              customAchievement,
              operator: currentOperator,  // Store operator in selector state
              customNumber: newNumber
              // Keep original label unchanged - header stays customizable
            };
            
            // Trigger recalculation
            setCalculating(true);
          }
        }
      }
      
      return newSelectors;
    };
    
    if (selectorType === 'row') {
      setRowSelectors(updateSelector);
    } else {
      setColSelectors(updateSelector);
    }
  }, [leagueData, achievementOptions, sport, seasonIndex]);

  // Handler for when achievement operators are changed (≥ ↔ ≤)
  const handleAchievementOperatorChange = useCallback((
    selectorType: 'row' | 'col',
    index: number,
    operator: '≥' | '≤'
  ) => {
    const updateSelector = (selectors: SelectorState[]) => {
      const newSelectors = [...selectors];
      const currentSelector = newSelectors[index];
      
      if (currentSelector.type === 'achievement' && leagueData) {
        const originalAchievement = achievementOptions.find(ach => ach.id === currentSelector.value);
        if (originalAchievement) {
          const achievements = getAllAchievements(sport as any, seasonIndex, leagueData.leagueYears);
          const realAchievement = achievements.find((ach: any) => ach.id === originalAchievement.id);

          if (realAchievement) {
            // Determine the number to use. Prioritize customNumber if it exists.
            let numberToUse: number;
            if (currentSelector.customNumber !== undefined && currentSelector.customNumber !== null) {
              numberToUse = currentSelector.customNumber;
            } else {
              // Otherwise, parse from the original label for the first time.
              const parsed = parseAchievementLabel(originalAchievement.label, sport);
              numberToUse = parsed.isEditable ? parsed.number : 0;
            }

            // Create a new custom achievement with the determined number and new operator
            const customAchievement = createCustomNumericalAchievement(realAchievement, numberToUse, sport, operator);
            
            newSelectors[index] = {
              ...currentSelector,
              customAchievement,
              operator,
              customNumber: numberToUse, // Persist the number
            };
          }
        }
      }
      
      return newSelectors;
    };
    
    if (selectorType === 'row') {
      setRowSelectors(updateSelector);
    } else {
      setColSelectors(updateSelector);
    }
    
    // Trigger cell count recalculation
    setCalculating(true);
  }, [leagueData, achievementOptions, sport, seasonIndex]);

  // Clear all selections
  const handleClearAll = useCallback(() => {
    setRowSelectors([
      { type: null, value: null, label: null, customAchievement: null, operator: '≥', customNumber: undefined },
      { type: null, value: null, label: null, customAchievement: null, operator: '≥', customNumber: undefined },
      { type: null, value: null, label: null, customAchievement: null, operator: '≥', customNumber: undefined }
    ]);
    setColSelectors([
      { type: null, value: null, label: null, customAchievement: null, operator: '≥', customNumber: undefined },
      { type: null, value: null, label: null, customAchievement: null, operator: '≥', customNumber: undefined },
      { type: null, value: null, label: null, customAchievement: null, operator: '≥', customNumber: undefined }
    ]);
    setCellCounts({});
    setCanUndo(false);
    setPreviousState(null);
  }, []);

  // Update selector type
  const updateSelectorType = useCallback((isRow: boolean, index: number, type: SelectorType) => {
    const newState: SelectorState = { type, value: null, label: null, customAchievement: null, operator: '≥' as const, customNumber: undefined };
    if (isRow) {
      setRowSelectors(prev => prev.map((selector, i) => i === index ? newState : selector));
    } else {
      setColSelectors(prev => prev.map((selector, i) => i === index ? newState : selector));
    }
    setCellCounts({});
  }, []);

  // Update selector value
  const updateSelectorValue = useCallback((isRow: boolean, index: number, type: SelectorType, value: string, label: string) => {
    const newState: SelectorState = { type, value, label, operator: '≥' as const, customAchievement: null, customNumber: undefined };
    if (isRow) {
      setRowSelectors(prev => prev.map((selector, i) => i === index ? newState : selector));
    } else {
      setColSelectors(prev => prev.map((selector, i) => i === index ? newState : selector));
    }
    setCalculating(true);
  }, []);

  // Clear individual selector
  const clearSelector = useCallback((isRow: boolean, index: number) => {
    const newState: SelectorState = { type: null, value: null, label: null, customAchievement: null, operator: '≥' as const, customNumber: undefined };
    if (isRow) {
      setRowSelectors(prev => prev.map((selector, i) => i === index ? newState : selector));
    } else {
      setColSelectors(prev => prev.map((selector, i) => i === index ? newState : selector));
    }
    setCalculating(true);
  }, []);

  // Helper function to determine if an achievement is season-specific
  const isSeasonAchievement = useCallback((achievementId: string) => {
    return SEASON_ACHIEVEMENTS.some(sa => sa.id === achievementId);
  }, []);

  // Autofill empty headers with intelligent choices
  const handleAutofill = useCallback((mode: 'all' | 'teams' | 'achievements') => {
    if (!leagueData) return;

    // Save current state for undo
    setPreviousState({
      rowSelectors: [...rowSelectors],
      colSelectors: [...colSelectors]
    });

    // Get currently selected IDs to avoid duplicates
    const usedTeamIds = new Set<number>();
    const usedAchievementIds = new Set<string>();
    
    [...rowSelectors, ...colSelectors].forEach(selector => {
      if (selector.type === 'team' && selector.value) {
        usedTeamIds.add(parseInt(selector.value));
      } else if (selector.type === 'achievement' && selector.value) {
        usedAchievementIds.add(selector.value);
      }
    });

    // Get available options excluding already used ones
    const availableTeams = teamOptions.filter(team => !usedTeamIds.has(team.id));
    const availableAchievements = achievementOptions.filter(ach => !usedAchievementIds.has(ach.id));

    // Find empty slots
    const emptySlots: Array<{ isRow: boolean, index: number }> = [];
    rowSelectors.forEach((selector, index) => {
      if (!selector.type) emptySlots.push({ isRow: true, index });
    });
    colSelectors.forEach((selector, index) => {
      if (!selector.type) emptySlots.push({ isRow: false, index });
    });

    if (emptySlots.length === 0) {
      return;
    }

    // Prepare selection pools based on mode
    let teamPool = mode === 'achievements' ? [] : [...availableTeams];
    let achievementPool = mode === 'teams' ? [] : [...availableAchievements];

    // Shuffle pools for randomness
    teamPool.sort(() => Math.random() - 0.5);
    achievementPool.sort(() => Math.random() - 0.5);

    // Fill slots with validation
    const newRowSelectors = [...rowSelectors];
    const newColSelectors = [...colSelectors];
    let filledCount = 0;

    for (const slot of emptySlots) {
      let filled = false;
      
      // For 'all' mode, randomly choose order for each slot to create mix
      // For specific modes, use only the requested type
      let optionsToTry: Array<{ type: string, pool: any[] }> = [];
      
      if (mode === 'all' && teamPool.length > 0 && achievementPool.length > 0) {
        // Randomly choose order for each slot to create team/achievement mix
        const useTeamFirst = Math.random() < 0.5;
        optionsToTry = useTeamFirst 
          ? [{ type: 'team', pool: teamPool }, { type: 'achievement', pool: achievementPool }]
          : [{ type: 'achievement', pool: achievementPool }, { type: 'team', pool: teamPool }];
      } else if (teamPool.length > 0) {
        optionsToTry = [{ type: 'team', pool: teamPool }];
      } else if (achievementPool.length > 0) {
        optionsToTry = [{ type: 'achievement', pool: achievementPool }];
      }

      for (const { type, pool } of optionsToTry) {
        if (filled || pool.length === 0) continue;

        // Try options from the pool
        for (let i = 0; i < pool.length; i++) {
          const option = pool[i];
          
          // Create test configuration
          const testSelectors = slot.isRow ? [...newRowSelectors] : [...newColSelectors];
          testSelectors[slot.index] = {
            type: type as SelectorType,
            value: type === 'team' ? option.id.toString() : option.id.toString(),
            label: option.label
          };

          // Simulate the configuration to check if it creates any 0-result cells
          let hasZeroResults = false;
          
          // Check all potential intersections with current + test configuration
          const testRowSelectors = slot.isRow ? testSelectors : newRowSelectors;
          const testColSelectors = slot.isRow ? newColSelectors : testSelectors;
          
          for (let rowIndex = 0; rowIndex < 3; rowIndex++) {
            for (let colIndex = 0; colIndex < 3; colIndex++) {
              const rowSel = testRowSelectors[rowIndex];
              const colSel = testColSelectors[colIndex];
              
              if (rowSel.type && rowSel.value && colSel.type && colSel.value) {
                const rowConfig: HeaderConfig = {
                  type: rowSel.type,
                  selectedId: rowSel.type === 'team' ? parseInt(rowSel.value) : rowSel.value,
                  selectedLabel: rowSel.label
                };
                
                const colConfig: HeaderConfig = {
                  type: colSel.type,
                  selectedId: colSel.type === 'team' ? parseInt(colSel.value) : colSel.value,
                  selectedLabel: colSel.label
                };
                
                const count = calculateCustomCellIntersection(
                  rowConfig,
                  colConfig,
                  leagueData.players,
                  leagueData.teams,
                  seasonIndex
                );
                
                if (count === 0) {
                  hasZeroResults = true;
                  break;
                }
              }
            }
            if (hasZeroResults) break;
          }

          // If this option doesn't create zero-result cells, use it
          if (!hasZeroResults) {
            if (slot.isRow) {
              newRowSelectors[slot.index] = {
                type: type as SelectorType,
                value: type === 'team' ? option.id.toString() : option.id.toString(),
                label: option.label
              };
            } else {
              newColSelectors[slot.index] = {
                type: type as SelectorType,
                value: type === 'team' ? option.id.toString() : option.id.toString(),
                label: option.label
              };
            }
            
            // Remove used option from pool
            pool.splice(i, 1);
            filled = true;
            filledCount++;
            break;
          }
        }
        if (filled) break;
      }
    }

    // Apply the changes
    setRowSelectors(newRowSelectors);
    setColSelectors(newColSelectors);
    setCalculating(true);

    if (filledCount > 0) {
      setCanUndo(true);
    }
  }, [leagueData, rowSelectors, colSelectors, teamOptions, achievementOptions, seasonIndex]);

  // Undo last autofill operation
  const handleUndo = useCallback(() => {
    if (!previousState || !canUndo) return;
    
    setRowSelectors(previousState.rowSelectors);
    setColSelectors(previousState.colSelectors);
    setCanUndo(false);
    setPreviousState(null);
  }, [previousState, canUndo]);
  
  // Create unified options list for combobox
  const unifiedOptions = useMemo(() => {
    const teams = teamOptions.map(team => ({
      type: 'team' as const,
      id: team.id.toString(),
      label: team.label,
      searchText: team.label.toLowerCase(),
      teamData: leagueData?.teams.find(t => t.tid === team.id), // Add team data for logo access
    }));
    
    const achievements = achievementOptions.map(achievement => ({
      type: 'achievement' as const,
      id: achievement.id.toString(), 
      label: achievement.label,
      searchText: achievement.label.toLowerCase(),
      isSeason: isSeasonAchievement(achievement.id), // Add season/career categorization
    }))
    .sort((a, b) => {
      // Sort by career first (career achievements before season)
      if (!a.isSeason && b.isSeason) return -1; // Career first
      if (a.isSeason && !b.isSeason) return 1;   // Season second
      
      // If both are same type (season or career), sort alphabetically
      return a.label.localeCompare(b.label);
    });
    
    return { teams, achievements };
  }, [teamOptions, achievementOptions, leagueData, isSeasonAchievement]);
  
  // No filtering options needed anymore since popup is removed
  
  // Check if all selectors are filled
  const allSelectorsComplete = rowSelectors.every(s => s.type && s.value) && 
                              colSelectors.every(s => s.type && s.value);
  
  // Calculate cell counts when selectors change
  useEffect(() => {
    if (!leagueData || calculating === false) return;
    
    const timer = setTimeout(() => {
      const newCellCounts: Record<string, number> = {};
      
      for (let rowIndex = 0; rowIndex < 3; rowIndex++) {
        for (let colIndex = 0; colIndex < 3; colIndex++) {
          const rowSelector = rowSelectors[rowIndex];
          const colSelector = colSelectors[colIndex];
          
          if (rowSelector.type && rowSelector.value && colSelector.type && colSelector.value) {
            // Convert to HeaderConfig format
            const rowConfig: HeaderConfig = {
              type: rowSelector.type,
              selectedId: rowSelector.type === 'team' ? parseInt(rowSelector.value) : rowSelector.value,
              selectedLabel: rowSelector.label,
              customAchievement: rowSelector.customAchievement,
              operator: rowSelector.operator
            };
            
            const colConfig: HeaderConfig = {
              type: colSelector.type,
              selectedId: colSelector.type === 'team' ? parseInt(colSelector.value) : colSelector.value,
              selectedLabel: colSelector.label,
              customAchievement: colSelector.customAchievement,
              operator: colSelector.operator
            };
            
            // Calculate intersection
            const count = calculateCustomCellIntersection(
              rowConfig,
              colConfig,
              leagueData.players,
              leagueData.teams,
              seasonIndex
            );
            
            newCellCounts[getCellKey(rowIndex, colIndex)] = count;
          }
        }
      }
      
      setCellCounts(newCellCounts);
      setCalculating(false);
    }, 300); // Small delay to avoid too many calculations
    
    return () => clearTimeout(timer);
  }, [rowSelectors, colSelectors, leagueData, calculating, seasonIndex]);

  // Check if grid is solvable (all cells have at least 1 eligible player)
  const isGridSolvable = allSelectorsComplete && 
                        Object.values(cellCounts).every(count => count >= 1) &&
                        Object.keys(cellCounts).length === 9;

  // Handle Play Grid
  const handlePlayGrid = useCallback(() => {
    if (!isGridSolvable || !leagueData) return;

    // Convert selectors to CatTeam format
    const customRows: CatTeam[] = [];
    const customCols: CatTeam[] = [];
    
    // Convert row selectors
    for (let i = 0; i < 3; i++) {
      const rowSelector = rowSelectors[i];
      if (rowSelector.type && rowSelector.value && rowSelector.label) {
        let customAchievement = rowSelector.customAchievement;
        
        // Check if this is an achievement with a toggled operator that needs a custom achievement
        if (rowSelector.type === 'achievement' && rowSelector.operator && !customAchievement) {
          // Find the original achievement
          const originalAchievement = achievementOptions.find(ach => ach.id === rowSelector.value);
          if (originalAchievement) {
            // Get the real achievement object
            const achievements = getAllAchievements(sport as any, seasonIndex, leagueData.leagueYears);
            const realAchievement = achievements.find((ach: any) => ach.id === originalAchievement.id);
            
            if (realAchievement) {
              // Parse the current number from the label
              const parsed = parseAchievementLabel(rowSelector.label, sport);
              if (parsed.isEditable) {
                // Create custom achievement with the toggled operator
                customAchievement = createCustomNumericalAchievement(realAchievement, parsed.number, sport, rowSelector.operator);
              }
            }
          }
        }
        
        const headerConfig: HeaderConfig = {
          type: rowSelector.type,
          selectedId: rowSelector.type === 'team' ? parseInt(rowSelector.value) : rowSelector.value,
          selectedLabel: rowSelector.label,
          customAchievement
        };
        
        const catTeam = headerConfigToCatTeam(headerConfig, leagueData.teams, seasonIndex);
        if (catTeam) {
          customRows.push(catTeam);
        }
      }
    }
    
    // Convert column selectors
    for (let i = 0; i < 3; i++) {
      const colSelector = colSelectors[i];
      if (colSelector.type && colSelector.value && colSelector.label) {
        let customAchievement = colSelector.customAchievement;
        
        // Check if this is an achievement with a toggled operator that needs a custom achievement
        if (colSelector.type === 'achievement' && colSelector.operator && !customAchievement) {
          // Find the original achievement
          const originalAchievement = achievementOptions.find(ach => ach.id === colSelector.value);
          if (originalAchievement) {
            // Get the real achievement object
            const achievements = getAllAchievements(sport as any, seasonIndex, leagueData.leagueYears);
            const realAchievement = achievements.find((ach: any) => ach.id === originalAchievement.id);
            
            if (realAchievement) {
              // Parse the current number from the label
              const parsed = parseAchievementLabel(colSelector.label, sport);
              if (parsed.isEditable) {
                // Create custom achievement with the toggled operator
                customAchievement = createCustomNumericalAchievement(realAchievement, parsed.number, sport, colSelector.operator);
              }
            }
          }
        }
        
        const headerConfig: HeaderConfig = {
          type: colSelector.type,
          selectedId: colSelector.type === 'team' ? parseInt(colSelector.value) : colSelector.value,
          selectedLabel: colSelector.label,
          customAchievement
        };
        
        const catTeam = headerConfigToCatTeam(headerConfig, leagueData.teams, seasonIndex);
        if (catTeam) {
          customCols.push(catTeam);
        }
      }
    }
    
    // Ensure we have exactly 3 rows and 3 cols
    if (customRows.length === 3 && customCols.length === 3) {
      onPlayGrid(customRows, customCols, rowSelectors, colSelectors);
    }
  }, [isGridSolvable, leagueData, rowSelectors, colSelectors, seasonIndex, onPlayGrid]);

  // Get cell key for intersection
  const getCellKey = (rowIndex: number, colIndex: number) => `${rowIndex}-${colIndex}`;

  // Get cell count display
  const getCellDisplay = (rowIndex: number, colIndex: number) => {
    const rowSelector = rowSelectors[rowIndex];
    const colSelector = colSelectors[colIndex];
    
    if (!rowSelector.type || !rowSelector.value || !colSelector.type || !colSelector.value) {
      return '—';
    }
    
    const cellKey = getCellKey(rowIndex, colIndex);
    const count = cellCounts[cellKey];
    
    if (calculating) {
      return '...';
    }
    
    return count !== undefined ? (count > 500 ? '500+' : count.toString()) : '—';
  };


  // Build team logo URL
  const buildTeamLogoURL = (team: Team): string => {
    // Constants for BBGM logo URLs
    const BBGM_ASSET_BASE = 'https://play.basketball-gm.com';
    
    function isBBGMDefaultLogo(logoURL: string | null | undefined): boolean {
      if (!logoURL) return false;
      return logoURL.startsWith('/img/logos-') || logoURL.startsWith('img/logos-');
    }

    // 1. If explicit small logo URL is provided and it's custom (not BBGM default), use it
    if (team.imgURLSmall && !isBBGMDefaultLogo(team.imgURLSmall)) {
      return team.imgURLSmall;
    }
    
    // 2. If explicit regular logo URL is provided and it's custom, use it  
    if (team.imgURL && !isBBGMDefaultLogo(team.imgURL)) {
      return team.imgURL;
    }
    
    // 3. If BBGM default small logo path is provided, convert to absolute URL
    if (team.imgURLSmall && isBBGMDefaultLogo(team.imgURLSmall)) {
      const cleanPath = team.imgURLSmall.startsWith('/') ? team.imgURLSmall.substring(1) : team.imgURLSmall;
      return `${BBGM_ASSET_BASE}/${cleanPath}`;
    }
    
    // 4. If BBGM default logo path is provided, convert to absolute URL
    if (team.imgURL && isBBGMDefaultLogo(team.imgURL)) {
      const cleanPath = team.imgURL.startsWith('/') ? team.imgURL.substring(1) : team.imgURL;
      return `${BBGM_ASSET_BASE}/${cleanPath}`;
    }
    
    // 5. Build BBGM default URL from abbreviation
    if (team.abbrev) {
      const abbrev = team.abbrev.toUpperCase();
      return `${BBGM_ASSET_BASE}/img/logos-primary/${abbrev}.svg`;
    }
    
    // 6. Fallback empty string
    return '';
  };

  // Get teams and achievements for dropdown
  const getDropdownItems = () => {
    if (!leagueData) return { teams: [], achievementSections: [] };

    // Get teams with logos
    const teams = leagueData.teams
      ?.filter(team => !team.disabled)
      ?.map(team => ({
        id: team.tid.toString(),
        name: `${team.region || team.abbrev} ${team.name}`.trim(),
        logoUrl: buildTeamLogoURL(team),
        type: 'team' as const
      }))
      ?.sort((a, b) => a.name.localeCompare(b.name)) || [];

    // Get all available achievements
    const sport = detectSport(leagueData);
    const seasonIndex = getCachedSeasonIndex(leagueData.players, sport);
    const achievementOptions = getAchievementOptions(sport, seasonIndex, leagueData.leagueYears);
    
    // Create a map for quick lookup
    const achievementMap = new Map(achievementOptions.map(a => [a.id, a.label]));
    
    // Get dynamic decade achievements
    const debutDecades: Array<{id: string, name: string}> = [];
    const playedDecades: Array<{id: string, name: string}> = [];
    
    achievementOptions.forEach(achievement => {
      if (achievement.id.includes('debutedIn')) {
        debutDecades.push({id: achievement.id, name: achievement.label});
      } else if (achievement.id.includes('playedIn') && !achievement.id.includes('playedInThreeDecades')) {
        playedDecades.push({id: achievement.id, name: achievement.label});
      }
    });
    
    // Sort decades
    debutDecades.sort((a, b) => a.name.localeCompare(b.name));
    playedDecades.sort((a, b) => a.name.localeCompare(b.name));

    // Build structured achievement sections based on sport
    let achievementSections = [];
    
    if (sport === 'football') {
      achievementSections = [
        {
          title: "Honors & Awards",
          achievements: [
            'FBAllStar', 'FBMVP', 'FBDPOY', 'FBOffROY', 'FBDefROY', 'FBFinalsMVP', 'FBAllLeague', 'FBAllRookie', 'FBChampion', 'isHallOfFamer'
          ].filter(id => achievementMap.has(id)).map(id => ({id, name: achievementMap.get(id)!}))
        },
        {
          title: "Career Milestones",
          achievements: [
            'career300PassTDs', 'FBCareer50kPassYds', 'career12kRushYds', 'career100RushTDs', 'career12kRecYds', 'career100RecTDs', 'career100Sacks', 'career20Ints'
          ].filter(id => achievementMap.has(id)).map(id => ({id, name: achievementMap.get(id)!}))
        },
        {
          title: "Single-Season — Passing",
          achievements: [
            'FBSeason4kPassYds', 'FBSeason30PassTD'
          ].filter(id => achievementMap.has(id)).map(id => ({id, name: achievementMap.get(id)!}))
        },
        {
          title: "Single-Season — Rushing",
          achievements: [
            'FBSeason1200RushYds', 'FBSeason12RushTD'
          ].filter(id => achievementMap.has(id)).map(id => ({id, name: achievementMap.get(id)!}))
        },
        {
          title: "Single-Season — Receiving",
          achievements: [
            'FBSeason1300RecYds', 'FBSeason10RecTD', 'FBSeason100Receptions'
          ].filter(id => achievementMap.has(id)).map(id => ({id, name: achievementMap.get(id)!}))
        },
        {
          title: "Single-Season — Defense",
          achievements: [
            'FBSeason15Sacks', 'FBSeason140Tackles', 'FBSeason5Interceptions', 'FBSeason15TFL'
          ].filter(id => achievementMap.has(id)).map(id => ({id, name: achievementMap.get(id)!}))
        },
        {
          title: "Single-Season — Combined",
          achievements: [
            'FBSeason1600Scrimmage', 'FBSeason2000AllPurpose'
          ].filter(id => achievementMap.has(id)).map(id => ({id, name: achievementMap.get(id)!}))
        },
        {
          title: "Longevity & Journey",
          achievements: [
            'played10PlusSeasons', 'played15PlusSeasons', 'playedAtAge40Plus', 'playedInThreeDecades', 'played5PlusFranchises'
          ].filter(id => achievementMap.has(id)).map(id => ({id, name: achievementMap.get(id)!}))
        },
        {
          title: "Debut Decade",
          achievements: debutDecades
        },
        {
          title: "Played In Decades",
          achievements: playedDecades
        },
        {
          title: "Draft", 
          achievements: [
            'isPick1Overall', 'isFirstRoundPick', 'isSecondRoundPick', 'isUndrafted'
          ].filter(id => achievementMap.has(id)).map(id => ({id, name: achievementMap.get(id)!}))
        }
      ].filter(section => section.achievements.length > 0); // Only include sections with achievements
    } else if (sport === 'hockey') {
      achievementSections = [
        {
          title: "Honors & Awards",
          achievements: [
            'HKAllStar', 'HKMVP', 'HKDefenseman', 'HKROY', 'HKChampion', 'HKPlayoffsMVP', 'HKFinalsMVP', 'HKAllRookie', 'HKAllLeague', 'HKAllStarMVP', 'HKAssistsLeader', 'isHallOfFamer'
          ].filter(id => achievementMap.has(id)).map(id => ({id, name: achievementMap.get(id)!}))
        },
        {
          title: "Career Milestones",
          achievements: [
            'career500Goals', 'career1000Points', 'career500Assists', 'career200Wins', 'career50Shutouts', 'played10PlusSeasons', 'played15PlusSeasons', 'playedAtAge40Plus', 'playedInThreeDecades', 'played5PlusFranchises'
          ].filter(id => achievementMap.has(id)).map(id => ({id, name: achievementMap.get(id)!}))
        },
        {
          title: "Single-Season — Scoring",
          achievements: [
            'HKSeason40Goals', 'HKSeason60Assists', 'HKSeason90Points', 'HKSeason20PowerPlay', 'HKSeason3SHGoals', 'HKSeason7GWGoals'
          ].filter(id => achievementMap.has(id)).map(id => ({id, name: achievementMap.get(id)!}))
        },
        {
          title: "Single-Season — Physical",
          achievements: [
            'HKSeason250Shots', 'HKSeason150Hits', 'HKSeason100Blocks', 'HKSeason60Takeaways', 'HKSeason70PIM'
          ].filter(id => achievementMap.has(id)).map(id => ({id, name: achievementMap.get(id)!}))
        },
        {
          title: "Single-Season — Efficiency",
          achievements: [
            'HKSeason25Plus', 'HKSeason55FaceoffPct', 'HKSeason22TOI'
          ].filter(id => achievementMap.has(id)).map(id => ({id, name: achievementMap.get(id)!}))
        },
        {
          title: "Single-Season — Goaltending",
          achievements: [
            'HKSeason920SavePct', 'HKSeason260GAA', 'HKSeason6Shutouts', 'HKSeason2000Saves', 'HKSeason60Starts'
          ].filter(id => achievementMap.has(id)).map(id => ({id, name: achievementMap.get(id)!}))
        },
        {
          title: "Debut Decade",
          achievements: debutDecades
        },
        {
          title: "Played In Decades",
          achievements: playedDecades
        },
        {
          title: "Draft", 
          achievements: [
            'isPick1Overall', 'isFirstRoundPick', 'isSecondRoundPick', 'isUndrafted', 'draftedTeen'
          ].filter(id => achievementMap.has(id)).map(id => ({id, name: achievementMap.get(id)!}))
        }
      ].filter(section => section.achievements.length > 0); // Only include sections with achievements
    } else if (sport === 'baseball') {
      achievementSections = [
        {
          title: "Honors & Awards",
          achievements: [
            'BBAllStar', 'BBMVP', 'BBROY', 'BBChampion', 'BBAllRookie', 'BBAllLeague', 'BBPlayoffsMVP', 'isHallOfFamer'
          ].filter(id => achievementMap.has(id)).map(id => ({id, name: achievementMap.get(id)!}))
        },
        {
          title: "Career Milestones — Batting",
          achievements: [
            'career3000Hits', 'career500HRs', 'career1500RBIs', 'career400SBs', 'career1800Runs', 'played10PlusSeasons', 'played15PlusSeasons', 'playedAtAge40Plus', 'playedInThreeDecades', 'played5PlusFranchises'
          ].filter(id => achievementMap.has(id)).map(id => ({id, name: achievementMap.get(id)!}))
        },
        {
          title: "Career Milestones — Pitching",
          achievements: [
            'career300Wins', 'career3000Ks', 'career300Saves'
          ].filter(id => achievementMap.has(id)).map(id => ({id, name: achievementMap.get(id)!}))
        },
        {
          title: "Debut Decade",
          achievements: debutDecades
        },
        {
          title: "Played In Decades",
          achievements: playedDecades
        },
        {
          title: "Draft", 
          achievements: [
            'isPick1Overall', 'isFirstRoundPick', 'isSecondRoundPick', 'isUndrafted', 'draftedTeen'
          ].filter(id => achievementMap.has(id)).map(id => ({id, name: achievementMap.get(id)!}))
        }
      ].filter(section => section.achievements.length > 0); // Only include sections with achievements
    } else {
      // Basketball achievements (existing structure)
      achievementSections = [
        {
          title: "Honors & Awards",
          achievements: [
            'MVP', 'ROY', 'SMOY', 'DPOY', 'MIP', 'FinalsMVP', 'AllLeagueAny', 'AllDefAny', 'AllRookieAny', 'AllStar', 'Champion', 'isHallOfFamer', 'threePointContestWinner', 'dunkContestWinner', 'royLaterMVP'
          ].filter(id => achievementMap.has(id)).map(id => ({id, name: achievementMap.get(id)!}))
        },
        {
          title: "League Leaders (Season Titles)",
          achievements: [
            'PointsLeader', 'ReboundsLeader', 'AssistsLeader', 'StealsLeader', 'BlocksLeader'
          ].filter(id => achievementMap.has(id)).map(id => ({id, name: achievementMap.get(id)!}))
        },
        {
          title: "Career Milestones",
          achievements: [
            'career20kPoints', 'career5kAssists', 'career2kSteals', 'career1500Blocks', 'career2kThrees'
          ].filter(id => achievementMap.has(id)).map(id => ({id, name: achievementMap.get(id)!}))
        },
        {
          title: "Single-Season Milestones — Volume & Combos",
          achievements: [
            'Season2000Points', 'Season30PPG', 'Season200_3PM', 'Season250ThreePM', 'Season300_3PM', 'Season700Assists', 'Season10APG', 'Season800Rebounds', 'Season12RPG', 'Season150Steals', 'Season2SPG', 'Season150Blocks', 'Season2_5BPG', 'Season200Stocks', 'Season25_10', 'Season25_5_5', 'Season20_10_5', 'Season1_1_1'
          ].filter(id => achievementMap.has(id)).map(id => ({id, name: achievementMap.get(id)!}))
        },
        {
          title: "Single-Season — Efficiency & Workload",
          achievements: [
            'Season50_40_90', 'Season40_3PT200_3PA', 'Season90FT250FTA', 'Season60eFG500FGA', 'Season60TS20PPG', 'Season36MPG', 'Season70Games'
          ].filter(id => achievementMap.has(id)).map(id => ({id, name: achievementMap.get(id)!}))
        },
        {
          title: "Longevity & Journey",
          achievements: [
            'played10PlusSeasons', 'played15PlusSeasons', 'playedAtAge40Plus', 'playedInThreeDecades', 'played5PlusFranchises'
          ].filter(id => achievementMap.has(id)).map(id => ({id, name: achievementMap.get(id)!}))
        },
        {
          title: "Debut Decade",
          achievements: debutDecades
        },
        {
          title: "Played In Decades",
          achievements: playedDecades
        },
        {
          title: "Draft", 
          achievements: [
            'isPick1Overall', 'isFirstRoundPick', 'isSecondRoundPick', 'isUndrafted', 'draftedTeen'
          ].filter(id => achievementMap.has(id)).map(id => ({id, name: achievementMap.get(id)!}))
        }
      ].filter(section => section.achievements.length > 0); // Only include sections with achievements
    }

    return { teams, achievementSections };
  };

  // Render header selector with tabbed dropdown
  const renderHeaderSelector = (isRow: boolean, index: number) => {
    const selector = isRow ? rowSelectors[index] : colSelectors[index];
    const { teams, achievementSections } = getDropdownItems();
    
    return (
      <div className="relative">
        <div 
          className="aspect-square flex flex-col items-center justify-center bg-background border rounded transition-colors p-0.5 sm:p-1 lg:p-2 relative group text-[8px] sm:text-xs lg:text-sm min-h-[40px] sm:min-h-[60px] lg:min-h-[80px]"
          data-testid={`header-${isRow ? 'row' : 'col'}-${index}`}
        >
            {selector.label ? (
              <div className="text-center w-full h-full flex flex-col items-center justify-center relative">
                {/* Red X button in top right corner - clears selection */}
                <button 
                  onClick={() => clearSelector(isRow, index)}
                  className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors z-20 shadow-sm"
                  title="Clear selection"
                >
                  <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </button>
                {/* Make entire box clickable */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="absolute inset-0 w-full h-full bg-transparent cursor-pointer hover:bg-muted/20 transition-colors rounded" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    side="bottom" 
                    align="end" 
                    sideOffset={4}
                    className="w-[min(90vw,20rem)] sm:w-80 p-0"
                    avoidCollisions={true}
                    collisionPadding={16}
                  >
                    <Tabs defaultValue="teams" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 m-2 mb-0">
                        <TabsTrigger value="teams" className="text-xs">Teams</TabsTrigger>
                        <TabsTrigger value="achievements" className="text-xs">Achievements</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="teams" className="mt-0">
                        <div className="max-h-[35vh] sm:max-h-80 overflow-y-auto p-0">
                          {teams.map(team => (
                            <DropdownMenuItem
                              key={team.id}
                              onSelect={() => updateSelectorValue(isRow, index, 'team', team.id, team.name)}
                              className="px-3 py-2 text-sm cursor-pointer flex items-center gap-2"
                              data-testid={`team-option-${team.id}`}
                            >
                              <img
                                src={team.logoUrl}
                                alt={`${team.name} logo`}
                                className="w-4 h-4 object-contain flex-shrink-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              <span className="truncate">{team.name}</span>
                            </DropdownMenuItem>
                          ))}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="achievements" className="mt-0">
                        <div className="max-h-[35vh] sm:max-h-80 overflow-y-auto p-0">
                          {achievementSections.map((section, sectionIndex) => (
                            <div key={sectionIndex}>
                              <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide bg-muted/50">
                                {section.title}
                              </div>
                              {section.achievements.map(achievement => (
                                <DropdownMenuItem
                                  key={achievement.id}
                                  onSelect={() => updateSelectorValue(isRow, index, 'achievement', achievement.id, achievement.name)}
                                  className="px-3 py-2 text-sm cursor-pointer"
                                  data-testid={`achievement-option-${achievement.id}`}
                                >
                                  <span className="truncate">{achievement.name}</span>
                                </DropdownMenuItem>
                              ))}
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Content display - positioned above clickable area with higher z-index */}
                <div className="flex items-center gap-1 mb-0.5 relative z-10 pointer-events-none">
                  {selector.type && (
                    <Badge variant="outline" className="text-[6px] sm:text-[8px] lg:text-[10px] px-0.5 sm:px-1 py-0 leading-none">
                      {selector.type}
                    </Badge>
                  )}
                </div>
                
                <div className="text-[6px] sm:text-[8px] lg:text-xs font-medium leading-tight break-words text-center px-0.5 overflow-hidden relative z-10">
                  {selector.type === 'achievement' ? (
                    <div className="pointer-events-auto">
                      <StatBuilderChip
                        label={
                          // ALWAYS show clean editable format in modal with CORRECT operator
                          (() => {
                            if (selector.customAchievement) {
                              // Extract number from custom achievement and create clean format
                              const parsed = parseAchievementLabel(selector.customAchievement.label, sport);
                              if (parsed.isEditable && parsed.number !== undefined) {
                                // Use the operator from selector state, not from parsed label
                                const currentOperator = selector.operator || '≥';
                                const formattedNumber = parsed.number.toLocaleString();
                                const symbol = currentOperator === '≤' ? '≤' : '+';
                                const cleanSuffix = parsed.suffix.replace(/^\+?\s*/, '').replace(/^or less\s+/, '');
                                return `${formattedNumber}${symbol} ${cleanSuffix}`;
                              }
                            }
                            // Use original selector label as fallback
                            return selector.label || '';
                          })()
                        }
                        sport={sport}
                        onNumberChange={(newNumber, newLabel, operator) => 
                          handleAchievementNumberChange(
                            isRow ? 'row' : 'col', 
                            index, 
                            newNumber, 
                            newLabel,
                            operator
                          )
                        }
                        onOperatorChange={(operator) =>
                          handleAchievementOperatorChange(
                            isRow ? 'row' : 'col',
                            index,
                            operator
                          )
                        }
                        operator={selector.operator || '≥'}
                      />
                    </div>
                  ) : (
                    selector.label
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="text-center w-full h-full flex flex-col items-center justify-center space-y-1">
                  <div className="text-[9px] sm:text-[10px] font-medium text-muted-foreground leading-tight">
                    Click to Select
                  </div>
                  <div className="text-[9px] sm:text-[10px] font-medium text-muted-foreground leading-tight">
                    Team or Achievement
                  </div>
                </div>
                {/* Dropdown trigger for empty cells */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="absolute inset-0 w-full h-full bg-transparent cursor-pointer hover:bg-muted/20 transition-colors rounded" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    side="bottom" 
                    align="end" 
                    sideOffset={4}
                    className="w-[min(90vw,20rem)] sm:w-80 p-0"
                    avoidCollisions={true}
                    collisionPadding={16}
                  >
                    <Tabs defaultValue="teams" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 m-2 mb-0">
                        <TabsTrigger value="teams" className="text-xs">Teams</TabsTrigger>
                        <TabsTrigger value="achievements" className="text-xs">Achievements</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="teams" className="mt-0">
                        <div className="max-h-[35vh] sm:max-h-80 overflow-y-auto p-0">
                          {teams.map(team => (
                            <DropdownMenuItem
                              key={team.id}
                              onSelect={() => updateSelectorValue(isRow, index, 'team', team.id, team.name)}
                              className="px-3 py-2 text-sm cursor-pointer flex items-center gap-2"
                              data-testid={`team-option-${team.id}`}
                            >
                              <img
                                src={team.logoUrl}
                                alt={`${team.name} logo`}
                                className="w-4 h-4 object-contain flex-shrink-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              <span className="truncate">{team.name}</span>
                            </DropdownMenuItem>
                          ))}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="achievements" className="mt-0">
                        <div className="max-h-[35vh] sm:max-h-80 overflow-y-auto p-0">
                          {achievementSections.map((section, sectionIndex) => (
                            <div key={sectionIndex}>
                              <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide bg-muted/50">
                                {section.title}
                              </div>
                              {section.achievements.map(achievement => (
                                <DropdownMenuItem
                                  key={achievement.id}
                                  onSelect={() => updateSelectorValue(isRow, index, 'achievement', achievement.id, achievement.name)}
                                  className="px-3 py-2 text-sm cursor-pointer"
                                  data-testid={`achievement-option-${achievement.id}`}
                                >
                                  <span className="truncate">{achievement.name}</span>
                                </DropdownMenuItem>
                              ))}
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      );
    };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-[96vw] sm:w-[90vw] sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-2 sm:p-4 lg:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3x3 className="h-5 w-5" />
            Create Custom Grid
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2 sm:space-y-4 lg:space-y-6">
          {/* Interactive Grid */}
          <div className="space-y-2 sm:space-y-4">
            <div className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground">
              Click on the headers to select teams or achievements for each row and column.
            </div>
            
            <div className="bg-muted/30 p-1 sm:p-2 lg:p-4 rounded-lg overflow-hidden">
              <div className="grid grid-cols-4 gap-0.5 sm:gap-1 lg:gap-2 w-full mx-auto" style={{ maxWidth: 'calc(100vw - 3rem)' }}>
                {/* Top-left empty cell */}
                <div className="aspect-square"></div>
                
                {/* Column headers */}
                {colSelectors.map((_, index) => (
                  <div key={`col-header-${index}`}>
                    {renderHeaderSelector(false, index)}
                  </div>
                ))}
                
                {/* Grid rows */}
                {rowSelectors.map((_, rowIndex) => (
                  [
                    // Row header
                    <div key={`row-header-${rowIndex}`}>
                      {renderHeaderSelector(true, rowIndex)}
                    </div>,
                    
                    // Row cells
                    ...colSelectors.map((_, colIndex) => (
                      <div key={`cell-${rowIndex}-${colIndex}`} className="aspect-square flex items-center justify-center bg-background border rounded text-[8px] sm:text-xs lg:text-sm font-medium min-h-[40px] sm:min-h-[60px] lg:min-h-[80px]">
                        {getCellDisplay(rowIndex, colIndex)}
                      </div>
                    ))
                  ]
                ))}
              </div>
            </div>
          </div>

          {/* Status and Actions */}
          <div className="space-y-2 sm:space-y-3">
            {allSelectorsComplete && (
              <div className="text-center text-xs sm:text-sm">
                {isGridSolvable ? (
                  <span className="text-green-600 dark:text-green-400">
                    ✅ Grid is solvable! All cells have at least 1 eligible player.
                  </span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">
                    ❌ Grid has unsolvable cells. Please adjust your selections.
                  </span>
                )}
              </div>
            )}
            
            {/* Action Buttons - Organized Layout */}
            <div className="border-t pt-4 mt-4">
              {/* Utility Actions Row */}
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mb-3">
                <Button
                  onClick={handleClearAll}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 h-9"
                  data-testid="button-clear-all"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear All
                </Button>
                
                {/* Autofill Split Button */}
                <div className="flex">
                  <Button
                    onClick={() => handleAutofill('all')}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 rounded-r-none border-r-0 h-9 min-w-[80px]"
                    disabled={!leagueData}
                    data-testid="button-autofill"
                  >
                    <Wand2 className="h-4 w-4" />
                    <span className="hidden xs:inline">Autofill</span>
                    <span className="xs:hidden">Auto</span>
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-l-none px-2 h-9 min-w-[32px]"
                        disabled={!leagueData}
                        data-testid="button-autofill-menu"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => handleAutofill('teams')}
                        data-testid="item-autofill-teams"
                      >
                        Autofill Teams Only
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleAutofill('achievements')}
                        data-testid="item-autofill-achievements"
                      >
                        Autofill Achievements Only
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                {/* Undo Button */}
                {canUndo && (
                  <Button
                    onClick={handleUndo}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 h-9"
                    data-testid="button-undo-autofill"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Undo
                  </Button>
                )}
              </div>
              
              {/* Primary Actions Row */}
              <div className="flex gap-3 justify-center sm:justify-end">
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="sm"
                  className="h-9 px-4"
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePlayGrid}
                  disabled={!isGridSolvable}
                  size="sm"
                  className="flex items-center gap-2 h-9 px-4 min-w-[100px]"
                  data-testid="button-play-grid"
                >
                  <Play className="h-4 w-4" />
                  Play Grid
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}