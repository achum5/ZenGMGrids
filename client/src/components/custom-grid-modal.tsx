import { useState, useCallback, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Grid3x3, Trash2, Play, RotateCcw, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { LeagueData, Team, CatTeam } from '@/types/bbgm';
import { detectSport } from '@/lib/grid-sharing';
import { getTeamOptions, getAchievementOptions, calculateCustomCellIntersection, headerConfigToCatTeam, type TeamOption, type AchievementOption, type HeaderConfig } from '@/lib/custom-grid-utils';
import { buildSeasonIndex } from '@/lib/season-achievements';

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
  const { toast } = useToast();
  
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
  
  // Loading state for cell count calculations
  const [calculating, setCalculating] = useState(false);
  
  // Cell intersection counts
  const [cellCounts, setCellCounts] = useState<Record<string, number>>({});

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
  const updateSelectorValue = useCallback((isRow: boolean, index: number, value: string, label: string) => {
    if (isRow) {
      setRowSelectors(prev => prev.map((selector, i) => 
        i === index ? { ...selector, value, label } : selector
      ));
    } else {
      setColSelectors(prev => prev.map((selector, i) => 
        i === index ? { ...selector, value, label } : selector
      ));
    }
    // Trigger cell count calculation
    setCalculating(true);
    // Close the header selector
    setOpenHeaderSelector(null);
  }, []);

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
      toast({
        title: "Custom Grid Started!",
        description: "Your custom grid is now ready to play.",
      });
    } else {
      toast({
        title: "Grid Creation Failed",
        description: "Could not convert all selections to valid grid constraints.",
        variant: "destructive"
      });
    }
  }, [isGridSolvable, leagueData, rowSelectors, colSelectors, seasonIndex, onPlayGrid, toast]);

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
    
    const displayText = selector.label || 
      (selector.type ? `Select ${selector.type}...` : 'Click to select');
    
    return (
      <Popover 
        open={isOpen} 
        onOpenChange={(open) => setOpenHeaderSelector(open ? headerKey : null)}
      >
        <PopoverTrigger asChild>
          <div className="aspect-square flex flex-col items-center justify-center bg-background border rounded text-xs p-1 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="text-center leading-tight">
              {selector.type && (
                <Badge variant="outline" className="text-xs mb-1 scale-75">
                  {selector.type}
                </Badge>
              )}
              <div className="break-words max-w-full">
                {selector.label ? (
                  <span className="font-medium">{selector.label}</span>
                ) : (
                  <span className="text-muted-foreground flex items-center justify-center">
                    <Plus className="h-3 w-3" />
                  </span>
                )}
              </div>
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="start">
          <div className="space-y-3">
            <div className="font-medium">
              Configure {isRow ? 'Row' : 'Column'} {index + 1}
            </div>
            
            {/* Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select 
                value={selector.type || ''} 
                onValueChange={(value: SelectorType) => updateSelectorType(isRow, index, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="achievement">Achievement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Value Selection */}
            {selector.type && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {selector.type === 'team' ? 'Team' : 'Achievement'}
                </label>
                <Select 
                  value={selector.value || ''} 
                  onValueChange={(value) => {
                    const options = selector.type === 'team' ? teamOptions : achievementOptions;
                    const selectedOption = options.find(opt => opt.id.toString() === value);
                    if (selectedOption) {
                      updateSelectorValue(isRow, index, value, selectedOption.label);
                    }
                  }}
                  disabled={!leagueData}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${selector.type}...`} />
                  </SelectTrigger>
                  <SelectContent>
                    {selector.type === 'team' 
                      ? teamOptions.map(option => (
                          <SelectItem key={option.id} value={option.id.toString()}>
                            {option.label}
                          </SelectItem>
                        ))
                      : achievementOptions.map(option => (
                          <SelectItem key={option.id} value={option.id.toString()}>
                            {option.label}
                          </SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3x3 className="h-5 w-5" />
            Create Custom Grid
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Interactive Grid */}
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Click on the headers to select teams or achievements for each row and column.
            </div>
            
            <div className="bg-muted/30 p-6 rounded-lg">
              <div className="grid grid-cols-4 gap-3 max-w-lg mx-auto">
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
                      <div key={`cell-${rowIndex}-${colIndex}`} className="aspect-square flex items-center justify-center bg-background border rounded text-sm font-medium">
                        {getCellDisplay(rowIndex, colIndex)}
                      </div>
                    ))
                  ]
                ))}
              </div>
            </div>
          </div>

          {/* Status and Actions */}
          <div className="space-y-3">
            {allSelectorsComplete && (
              <div className="text-center text-sm">
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
              <Button
                onClick={handleClearAll}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear All
              </Button>
              
              <div className="flex gap-2">
                <Button
                  onClick={onClose}
                  variant="ghost"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePlayGrid}
                  disabled={!isGridSolvable}
                  className="flex items-center gap-2"
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