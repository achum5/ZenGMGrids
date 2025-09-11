import { useState, useCallback, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Grid3x3, Trash2, Play, RotateCcw, X, ArrowUpDown, Search, ChevronDown, Wand2 } from 'lucide-react';
import type { LeagueData, Team, CatTeam } from '@/types/bbgm';
import { detectSport } from '@/lib/grid-sharing';
import { getTeamOptions, getAchievementOptions, calculateCustomCellIntersection, headerConfigToCatTeam, type TeamOption, type AchievementOption, type HeaderConfig } from '@/lib/custom-grid-utils';
import { buildSeasonIndex, SEASON_ACHIEVEMENTS } from '@/lib/season-achievements';

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
  onPlayGrid: (rows: CatTeam[], cols: CatTeam[]) => void;
  leagueData: LeagueData | null;
}

type SelectorType = 'team' | 'achievement';

interface SelectorState {
  type: SelectorType | null;
  value: string | null;
  label: string | null;
}

export function CustomGridModal({ isOpen, onClose, onPlayGrid, leagueData }: CustomGridModalProps) {
  
  // State for the 6 selectors (3 rows + 3 cols)
  const [rowSelectors, setRowSelectors] = useState<SelectorState[]>([
    { type: null, value: null, label: null },
    { type: null, value: null, label: null },
    { type: null, value: null, label: null }
  ]);
  
  const [colSelectors, setColSelectors] = useState<SelectorState[]>([
    { type: null, value: null, label: null },
    { type: null, value: null, label: null },
    { type: null, value: null, label: null }
  ]);
  
  // Track which header selector is open
  const [openHeaderSelector, setOpenHeaderSelector] = useState<string | null>(null);
  
  // Search and filter state for unified combobox
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'teams' | 'achievements'>('all');
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

  const sport = leagueData ? detectSport(leagueData) : 'basketball';
  
  // Memoize expensive computations to prevent performance issues
  const teamOptions = useMemo<TeamOption[]>(() => {
    return leagueData ? getTeamOptions(leagueData.teams) : [];
  }, [leagueData?.teams]);
  
  // Build season index for achievements if needed (expensive operation)
  const seasonIndex = useMemo(() => {
    return leagueData ? buildSeasonIndex(leagueData.players, sport) : undefined;
  }, [leagueData?.players, sport]);
  
  const achievementOptions = useMemo<AchievementOption[]>(() => {
    return leagueData ? getAchievementOptions(sport, seasonIndex) : [];
  }, [sport, seasonIndex]);

  // Clear all selections
  const handleClearAll = useCallback(() => {
    setRowSelectors([
      { type: null, value: null, label: null },
      { type: null, value: null, label: null },
      { type: null, value: null, label: null }
    ]);
    setColSelectors([
      { type: null, value: null, label: null },
      { type: null, value: null, label: null },
      { type: null, value: null, label: null }
    ]);
    setCellCounts({});
    setOpenHeaderSelector(null);
    setCanUndo(false);
    setPreviousState(null);
  }, []);

  // Update selector type
  const updateSelectorType = useCallback((isRow: boolean, index: number, type: SelectorType) => {
    if (isRow) {
      setRowSelectors(prev => prev.map((selector, i) => 
        i === index ? { type, value: null, label: null } : selector
      ));
    } else {
      setColSelectors(prev => prev.map((selector, i) => 
        i === index ? { type, value: null, label: null } : selector
      ));
    }
    // Clear cell counts when type changes
    setCellCounts({});
  }, []);

  // Update selector value
  const updateSelectorValue = useCallback((isRow: boolean, index: number, type: SelectorType, value: string, label: string) => {
    if (isRow) {
      setRowSelectors(prev => prev.map((selector, i) => 
        i === index ? { type, value, label } : selector
      ));
    } else {
      setColSelectors(prev => prev.map((selector, i) => 
        i === index ? { type, value, label } : selector
      ));
    }
    // Trigger cell count calculation
    setCalculating(true);
    // Close the header selector and clear search
    setOpenHeaderSelector(null);
    setSearchQuery('');
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
      
      // Try teams first (if available), then achievements
      const optionsToTry = teamPool.length > 0 && achievementPool.length > 0 
        ? [{ type: 'team', pool: teamPool }, { type: 'achievement', pool: achievementPool }]
        : teamPool.length > 0 
        ? [{ type: 'team', pool: teamPool }]
        : achievementPool.length > 0
        ? [{ type: 'achievement', pool: achievementPool }]
        : [];

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
      // Sort by season first (season achievements before career)
      if (a.isSeason && !b.isSeason) return -1;
      if (!a.isSeason && b.isSeason) return 1;
      
      // If both are same type (season or career), sort alphabetically
      return a.label.localeCompare(b.label);
    });
    
    return { teams, achievements };
  }, [teamOptions, achievementOptions, leagueData, isSeasonAchievement]);
  
  // Filter options based on search and type filter
  const filteredOptions = useMemo(() => {
    const query = searchQuery.toLowerCase();
    
    let teams = unifiedOptions.teams;
    let achievements = unifiedOptions.achievements;
    
    // Apply search filter
    if (query) {
      teams = teams.filter(option => option.searchText.includes(query));
      achievements = achievements.filter(option => option.searchText.includes(query));
    }
    
    // Apply type filter
    if (filterType === 'teams') {
      achievements = [];
    } else if (filterType === 'achievements') {
      teams = [];
    }
    
    return { teams, achievements };
  }, [unifiedOptions, searchQuery, filterType]);
  
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
              selectedLabel: rowSelector.label
            };
            
            const colConfig: HeaderConfig = {
              type: colSelector.type,
              selectedId: colSelector.type === 'team' ? parseInt(colSelector.value) : colSelector.value,
              selectedLabel: colSelector.label
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
        const headerConfig: HeaderConfig = {
          type: rowSelector.type,
          selectedId: rowSelector.type === 'team' ? parseInt(rowSelector.value) : rowSelector.value,
          selectedLabel: rowSelector.label
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
        const headerConfig: HeaderConfig = {
          type: colSelector.type,
          selectedId: colSelector.type === 'team' ? parseInt(colSelector.value) : colSelector.value,
          selectedLabel: colSelector.label
        };
        
        const catTeam = headerConfigToCatTeam(headerConfig, leagueData.teams, seasonIndex);
        if (catTeam) {
          customCols.push(catTeam);
        }
      }
    }
    
    // Ensure we have exactly 3 rows and 3 cols
    if (customRows.length === 3 && customCols.length === 3) {
      onPlayGrid(customRows, customCols);
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

  // Render header selector
  const renderHeaderSelector = (isRow: boolean, index: number) => {
    const selector = isRow ? rowSelectors[index] : colSelectors[index];
    const headerKey = `${isRow ? 'row' : 'col'}-${index}`;
    const isOpen = openHeaderSelector === headerKey;
    
    return (
      <Popover 
        open={isOpen} 
        onOpenChange={(open) => setOpenHeaderSelector(open ? headerKey : null)}
      >
        <PopoverTrigger asChild>
          <div className="aspect-square flex flex-col items-center justify-center bg-background border rounded cursor-pointer hover:bg-muted/50 transition-colors p-0.5 sm:p-1 lg:p-2 relative group text-[8px] sm:text-xs lg:text-sm min-h-[40px] sm:min-h-[60px] lg:min-h-[80px]">
            {selector.label ? (
              // Selected state: show what was chosen
              <>
                <div className="text-center w-full h-full flex flex-col items-center justify-center">
                  {selector.type && (
                    <Badge variant="outline" className="text-[6px] sm:text-[8px] lg:text-[10px] mb-0.5 px-0.5 sm:px-1 py-0 leading-none">
                      {selector.type}
                    </Badge>
                  )}
                  <div className="text-[6px] sm:text-[8px] lg:text-xs font-medium leading-tight break-words text-center px-0.5 overflow-hidden">
                    {selector.label}
                  </div>
                </div>
                {/* X button to clear selection */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isRow) {
                      const newRowSelectors = [...rowSelectors];
                      newRowSelectors[index] = { type: null, value: null, label: '', tid: undefined, achievementId: undefined };
                      setRowSelectors(newRowSelectors);
                    } else {
                      const newColSelectors = [...colSelectors];
                      newColSelectors[index] = { type: null, value: null, label: '', tid: undefined, achievementId: undefined };
                      setColSelectors(newColSelectors);
                    }
                  }}
                  className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center text-[10px] font-bold"
                  title="Clear selection"
                  data-testid={`button-clear-${isRow ? 'row' : 'col'}-${index}`}
                >
                  ×
                </button>
              </>
            ) : (
              // Ghost state: clear invitation to select
              <div className="text-center w-full h-full flex flex-col items-center justify-center space-y-1">
                <div className="text-[9px] sm:text-[10px] font-medium text-muted-foreground leading-tight">
                  Pick Team or
                </div>
                <div className="text-[9px] sm:text-[10px] font-medium text-muted-foreground leading-tight">
                  Achievement
                </div>
              </div>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="start">
          <Command>
            {/* Header with dynamic title */}
            <div className="px-3 py-2 border-b bg-muted/30">
              <div className="font-medium text-sm">
                {selector.label ? `${isRow ? 'Row' : 'Column'} ${index + 1}: ${selector.label}` : `Configure ${isRow ? 'Row' : 'Column'} ${index + 1}`}
              </div>
            </div>
            
            {/* Search input */}
            <div className="p-2">
              <CommandInput 
                placeholder="Search teams or achievements…"
                value={searchQuery}
                onValueChange={setSearchQuery}
                className="h-9"
              />
            </div>
            
            {/* Filter chips */}
            <div className="px-2 pb-2">
              <div className="flex gap-1">
                {(['all', 'teams', 'achievements'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setFilterType(filter)}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      filterType === filter 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {filter === 'all' ? 'All' : filter === 'teams' ? 'Teams' : 'Achievements'}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Options list */}
            <CommandList className="max-h-64 overflow-y-scroll scrollbar-thin">
              <CommandEmpty>
                <div className="py-6 text-center text-sm text-muted-foreground">
                  <div>No matches—try a different team or achievement.</div>
                  <div className="mt-2 space-x-2">
                    <button
                      onClick={() => setFilterType('teams')}
                      className="text-primary hover:underline"
                    >
                      Browse Teams
                    </button>
                    <button
                      onClick={() => setFilterType('achievements')}
                      className="text-primary hover:underline"
                    >
                      Browse Achievements
                    </button>
                  </div>
                </div>
              </CommandEmpty>
              
              {/* Teams group */}
              {filteredOptions.teams.length > 0 && (
                <CommandGroup heading="Teams">
                  {filteredOptions.teams.map((team) => (
                    <CommandItem
                      key={`team-${team.id}`}
                      value={`team-${team.searchText} team`}
                      keywords={[team.searchText, 'team']}
                      onSelect={() => {
                        updateSelectorValue(isRow, index, 'team', team.id, team.label);
                      }}
                      className="flex items-center gap-2 px-3 py-2"
                    >
                      <TeamLogoIcon teamData={team.teamData} />
                      <div className="flex-1">
                        <div className="font-medium">{team.label}</div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Team
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {/* Achievements group */}
              {filteredOptions.achievements.length > 0 && (
                <CommandGroup heading="Achievements">
                  {filteredOptions.achievements.map((achievement) => (
                    <CommandItem
                      key={`achievement-${achievement.id}`}
                      value={`${achievement.searchText} achievement`}
                      keywords={[achievement.searchText, 'achievement']}
                      onSelect={() => {
                        updateSelectorValue(isRow, index, 'achievement', achievement.id, achievement.label);
                      }}
                      className="flex items-center gap-2 px-3 py-2"
                    >
                      <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-xs">
                        🏆
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{achievement.label}</div>
                      </div>
                      <Badge variant={achievement.isSeason ? "default" : "outline"} className="text-xs">
                        {achievement.isSeason ? "Season" : "Career"}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
            
            {/* Helper text */}
            <div className="px-3 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
              Season items only need the same season when paired with a Team.
            </div>
          </Command>
        </PopoverContent>
      </Popover>
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
            
            <div className="flex justify-between items-center pt-4">
              <div className="flex gap-2">
                <Button
                  onClick={handleClearAll}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear All
                </Button>
                
                {/* Autofill Split Button */}
                <div className="flex">
                  <Button
                    onClick={() => handleAutofill('all')}
                    variant="outline"
                    className="flex items-center gap-1 sm:gap-2 rounded-r-none border-r-0 flex-grow-[3] min-w-[60px] sm:min-w-[90px] text-xs sm:text-sm h-8 px-2 sm:h-10 sm:px-4"
                    disabled={!leagueData}
                    data-testid="button-autofill"
                  >
                    <Wand2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Autofill</span>
                    <span className="xs:hidden">Auto</span>
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="rounded-l-none flex-grow-[1] px-1 sm:px-2 min-w-[24px] sm:min-w-[30px] h-8 sm:h-10"
                        disabled={!leagueData}
                        data-testid="button-autofill-menu"
                      >
                        <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
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
                    className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-8 px-2 sm:h-10 sm:px-4"
                    data-testid="button-undo-autofill"
                  >
                    <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
                    Undo
                  </Button>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={onClose}
                  variant="ghost"
                  className="text-xs sm:text-sm h-8 px-3 sm:h-10 sm:px-4"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePlayGrid}
                  disabled={!isGridSolvable}
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-8 px-3 sm:h-10 sm:px-4"
                >
                  <Play className="h-3 w-3 sm:h-4 sm:w-4" />
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