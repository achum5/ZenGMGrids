import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Grid3x3, Trash2, Play, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { LeagueData, Team, CatTeam } from '@/types/bbgm';
import { detectSport } from '@/lib/grid-sharing';
import { getTeamOptions, getAchievementOptions, calculateCustomCellIntersection, type TeamOption, type AchievementOption, type HeaderConfig } from '@/lib/custom-grid-utils';
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
  
  // Loading state for cell count calculations
  const [calculating, setCalculating] = useState(false);
  
  // Cell intersection counts
  const [cellCounts, setCellCounts] = useState<Record<string, number>>({});

  const sport = leagueData ? detectSport(leagueData) : 'basketball';
  
  // Get available teams and achievements
  const teamOptions: TeamOption[] = leagueData ? getTeamOptions(leagueData.teams) : [];
  
  // Build season index for achievements if needed
  const seasonIndex = leagueData ? buildSeasonIndex(leagueData.players, sport) : undefined;
  const achievementOptions: AchievementOption[] = leagueData ? getAchievementOptions(sport, seasonIndex) : [];

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
    // This will be implemented in the validation integration task
    toast({
      title: "Play Grid functionality coming soon",
      description: "Grid creation logic will be implemented next.",
    });
  }, [isGridSolvable, leagueData, toast]);

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3x3 className="h-5 w-5" />
            Create Custom Grid
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Selectors Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rows Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Rows</h3>
              {rowSelectors.map((selector, index) => (
                <div key={`row-${index}`} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    Row {index + 1}
                  </div>
                  
                  {/* Type Toggle */}
                  <Select 
                    value={selector.type || ''} 
                    onValueChange={(value: SelectorType) => updateSelectorType(true, index, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team">Team</SelectItem>
                      <SelectItem value="achievement">Achievement</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Value Dropdown */}
                  {selector.type && (
                    <Select 
                      value={selector.value || ''} 
                      onValueChange={(value) => {
                        const options = selector.type === 'team' ? teamOptions : achievementOptions;
                        const selectedOption = options.find(opt => opt.id.toString() === value);
                        if (selectedOption) {
                          updateSelectorValue(true, index, value, selectedOption.label);
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
                  )}
                </div>
              ))}
            </div>

            {/* Columns Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Columns</h3>
              {colSelectors.map((selector, index) => (
                <div key={`col-${index}`} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    Column {index + 1}
                  </div>
                  
                  {/* Type Toggle */}
                  <Select 
                    value={selector.type || ''} 
                    onValueChange={(value: SelectorType) => updateSelectorType(false, index, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team">Team</SelectItem>
                      <SelectItem value="achievement">Achievement</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Value Dropdown */}
                  {selector.type && (
                    <Select 
                      value={selector.value || ''} 
                      onValueChange={(value) => {
                        const options = selector.type === 'team' ? teamOptions : achievementOptions;
                        const selectedOption = options.find(opt => opt.id.toString() === value);
                        if (selectedOption) {
                          updateSelectorValue(false, index, value, selectedOption.label);
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
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Live Preview Grid */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Preview</h3>
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
                {/* Top-left empty cell */}
                <div className="aspect-square"></div>
                
                {/* Column headers */}
                {colSelectors.map((selector, index) => (
                  <div key={`col-header-${index}`} className="aspect-square flex items-center justify-center bg-background border rounded text-xs p-1 text-center">
                    {selector.label || `Col ${index + 1}`}
                  </div>
                ))}
                
                {/* Grid rows */}
                {rowSelectors.map((rowSelector, rowIndex) => (
                  [
                    // Row header
                    <div key={`row-header-${rowIndex}`} className="aspect-square flex items-center justify-center bg-background border rounded text-xs p-1 text-center">
                      {rowSelector.label || `Row ${rowIndex + 1}`}
                    </div>,
                    
                    // Row cells
                    ...colSelectors.map((_, colIndex) => (
                      <div key={`cell-${rowIndex}-${colIndex}`} className="aspect-square flex items-center justify-center bg-background border rounded text-xs">
                        {getCellDisplay(rowIndex, colIndex)}
                      </div>
                    ))
                  ]
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
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
      </DialogContent>
    </Dialog>
  );
}