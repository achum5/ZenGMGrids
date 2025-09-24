import { useState, useCallback, useEffect, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Play, RotateCcw, X, ChevronDown, Dice3, Trophy, Users, Target, TrendingUp, Calendar, Plus } from 'lucide-react';
import type { LeagueData, Team, CatTeam } from '@/types/bbgm';
import { detectSport } from '@/lib/grid-sharing';
import { getTeamOptions, getAchievementOptions, calculateCustomCellIntersection, headerConfigToCatTeam, type TeamOption, type AchievementOption, type HeaderConfig } from '@/lib/custom-grid-utils';

interface CustomGridModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayGrid: (rows: CatTeam[], cols: CatTeam[]) => void;
  leagueData: LeagueData | null;
}

interface HeaderSelection {
  type: 'team' | 'achievement' | null;
  value: string | null;
  label: string | null;
  teamData?: Team;
}

interface SearchPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selection: HeaderSelection) => void;
  title: string;
  teams: TeamOption[];
  achievements: AchievementOption[];
  sport: string;
}

// Team logo component
function TeamLogo({ teamData, size = 24 }: { teamData?: Team; size?: number }) {
  const [logoError, setLogoError] = useState(false);
  
  if (!teamData || logoError) {
    return (
      <div 
        className="flex items-center justify-center rounded-full bg-gray-700 text-gray-300 text-xs font-medium"
        style={{ width: size, height: size }}
      >
        {teamData?.abbrev?.slice(0, 2) || '??'}
      </div>
    );
  }
  
  const logoUrl = teamData.imgURLSmall || teamData.imgURL || 
    `https://basketball-gm.com/img/logos-primary/${teamData.abbrev?.toUpperCase()}.svg`;
  
  return (
    <div 
      className="flex items-center justify-center rounded-full overflow-hidden"
      style={{ width: size, height: size }}
    >
      <img
        src={logoUrl}
        alt={teamData.name}
        className="w-full h-full object-contain"
        onError={() => setLogoError(true)}
      />
    </div>
  );
}

// Achievement icon component
function AchievementIcon({ achievement, size = 24 }: { achievement: AchievementOption; size?: number }) {
  const getIcon = (label: string) => {
    if (label.includes('All-Star') || label.includes('MVP') || label.includes('Award')) return Trophy;
    if (label.includes('Leader') || label.includes('Season')) return TrendingUp;
    if (label.includes('Career') || label.includes('000+')) return Target;
    if (label.includes('decade') || label.includes('Decade')) return Calendar;
    return Trophy;
  };
  
  const IconComponent = getIcon(achievement.label);
  return <IconComponent size={size} className="text-blue-400" />;
}

// Search picker component
function SearchPicker({ isOpen, onClose, onSelect, title, teams, achievements, sport }: SearchPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'teams' | 'achievements'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Filter and search logic
  const filteredItems = useMemo(() => {
    let items: (TeamOption | AchievementOption)[] = [];
    
    if (activeFilter === 'all' || activeFilter === 'teams') {
      items = [...items, ...teams];
    }
    if (activeFilter === 'all' || activeFilter === 'achievements') {
      items = [...items, ...achievements];
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.label.toLowerCase().includes(query)
      );
    }
    
    return items;
  }, [teams, achievements, searchQuery, activeFilter]);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            handleSelect(filteredItems[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);
  
  // Reset selected index when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [activeFilter, searchQuery]);
  
  const handleSelect = (item: TeamOption | AchievementOption) => {
    if (typeof item.id === 'number') {
      // Team selection - find the corresponding team data
      const teamData = teams.find(t => t.id === item.id)?.teamData;
      onSelect({
        type: 'team',
        value: `team-${item.id}`,
        label: item.label,
        teamData
      });
    } else {
      // Achievement selection
      onSelect({
        type: 'achievement',
        value: `achievement-${item.id}`,
        label: item.label
      });
    }
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#11161C] border border-[#1E2630] rounded-xl shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="p-6 border-b border-[#1E2630]">
          <h3 className="text-lg font-semibold text-[#E6EDF3] mb-2">{title}</h3>
          
          {/* Search input */}
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search teams, awards, or stats…"
            className="mb-4 bg-[#0B0F14] border-[#1E2630] text-[#E6EDF3] placeholder-[#A6B0BB]"
            autoFocus
          />
          
          {/* Filter pills */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                activeFilter === 'all'
                  ? 'bg-[#4FB2FF] text-white'
                  : 'bg-[#243244] text-[#F0F4F8] hover:bg-[#2A3A4A]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter('teams')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                activeFilter === 'teams'
                  ? 'bg-[#4FB2FF] text-white'
                  : 'bg-[#243244] text-[#F0F4F8] hover:bg-[#2A3A4A]'
              }`}
            >
              Teams
            </button>
            <button
              onClick={() => setActiveFilter('achievements')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                activeFilter === 'achievements'
                  ? 'bg-[#4FB2FF] text-white'
                  : 'bg-[#243244] text-[#F0F4F8] hover:bg-[#2A3A4A]'
              }`}
            >
              Achievements
            </button>
          </div>
        </div>
        
        {/* Results */}
        <ScrollArea className="max-h-96 p-2">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-[#A6B0BB]">
              <div className="text-4xl mb-2">🔍</div>
              <p>No matches. Try a different term or browse categories.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item, index) => (
                <button
                  key={`${typeof item.id === 'number' ? 'team' : 'achievement'}-${item.id}`}
                  onClick={() => handleSelect(item)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    index === selectedIndex
                      ? 'bg-[#243244] text-[#E6EDF3]'
                      : 'text-[#A6B0BB] hover:bg-[#1A1F26] hover:text-[#E6EDF3]'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {'abbrev' in item ? (
                      <TeamLogo teamData={item.teamData} size={24} />
                    ) : (
                      <AchievementIcon achievement={item} size={24} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.label}</div>
                  </div>
                  <div className="flex-shrink-0">
                    <Badge variant="secondary" className="text-xs bg-[#1E2630] text-[#A6B0BB]">
                      {typeof item.id === 'number' ? 'Team' : 'Award'}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

// Header tile component
function HeaderTile({ 
  selection, 
  onEdit, 
  onClear, 
  position, 
  locked = false 
}: { 
  selection: HeaderSelection; 
  onEdit: () => void; 
  onClear: () => void; 
  position: string;
  locked?: boolean;
}) {
  const isEmpty = !selection.type || !selection.value;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onEdit}
            className={`
              relative min-h-[120px] w-full rounded-xl border transition-all
              ${isEmpty 
                ? 'border-[#1E2630] bg-[#0B0F14] hover:border-[#2A3A4A] hover:bg-[#11161C]' 
                : 'border-[#1E2630] bg-[#11161C] hover:border-[#2A3A4A]'
              }
              focus:outline-none focus:ring-2 focus:ring-[#4FB2FF] focus:ring-offset-2 focus:ring-offset-[#0B0F14]
              group
            `}
            aria-label={isEmpty ? `${position}: None` : `${position}: ${selection.label}`}
          >
            {isEmpty ? (
              <div className="flex flex-col items-center justify-center h-full p-4 text-[#A6B0BB] group-hover:text-[#E6EDF3]">
                <Plus size={24} className="mb-2" />
                <span className="text-sm font-medium text-center">
                  + Add Team or Achievement
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-4">
                <div className="mb-3">
                  {selection.type === 'team' && selection.teamData ? (
                    <TeamLogo teamData={selection.teamData} size={32} />
                  ) : (
                    <Trophy size={32} className="text-blue-400" />
                  )}
                </div>
                <div className="text-sm font-medium text-[#E6EDF3] text-center leading-tight">
                  {selection.label}
                </div>
                {locked && (
                  <div className="absolute top-2 left-2">
                    <div className="w-4 h-4 rounded bg-yellow-500 flex items-center justify-center">
                      <div className="w-2 h-2 bg-yellow-900 rounded-sm" />
                    </div>
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Clear header"
                >
                  <X size={16} className="text-[#A6B0BB] hover:text-[#E6EDF3]" />
                </button>
              </div>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          {isEmpty ? `Click to set ${position.toLowerCase()}` : selection.label}
          {locked && <div className="text-xs text-yellow-400 mt-1">Locked: Randomize won't change this header</div>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function CustomGridModal({ isOpen, onClose, onPlayGrid, leagueData }: CustomGridModalProps) {
  // State for the 6 header selections
  const [rowHeaders, setRowHeaders] = useState<HeaderSelection[]>([
    { type: null, value: null, label: null },
    { type: null, value: null, label: null },
    { type: null, value: null, label: null }
  ]);
  
  const [colHeaders, setColHeaders] = useState<HeaderSelection[]>([
    { type: null, value: null, label: null },
    { type: null, value: null, label: null },
    { type: null, value: null, label: null }
  ]);
  
  const [locks, setLocks] = useState<Record<string, boolean>>({});
  const [pickerState, setPickerState] = useState<{
    isOpen: boolean;
    position: string;
    isRow: boolean;
    index: number;
  }>({ isOpen: false, position: '', isRow: false, index: -1 });
  
  const sport = leagueData ? detectSport(leagueData) : 'basketball';
  
  const teamOptions = useMemo(() => {
    return leagueData ? getTeamOptions(leagueData.teams) : [];
  }, [leagueData]);
  
  const achievementOptions = useMemo(() => {
    return leagueData ? getAchievementOptions(sport) : [];
  }, [leagueData, sport]);
  
  // Calculate progress
  const filledRows = rowHeaders.filter(h => h.type).length;
  const filledCols = colHeaders.filter(h => h.type).length;
  const isGridComplete = filledRows === 3 && filledCols === 3;
  
  // Handle header selection
  const handleHeaderSelect = (selection: HeaderSelection) => {
    const { isRow, index } = pickerState;
    
    if (isRow) {
      setRowHeaders(prev => {
        const newHeaders = [...prev];
        newHeaders[index] = selection;
        return newHeaders;
      });
    } else {
      setColHeaders(prev => {
        const newHeaders = [...prev];
        newHeaders[index] = selection;
        return newHeaders;
      });
    }
  };
  
  // Handle clear header
  const handleClearHeader = (isRow: boolean, index: number) => {
    if (isRow) {
      setRowHeaders(prev => {
        const newHeaders = [...prev];
        newHeaders[index] = { type: null, value: null, label: null };
        return newHeaders;
      });
    } else {
      setColHeaders(prev => {
        const newHeaders = [...prev];
        newHeaders[index] = { type: null, value: null, label: null };
        return newHeaders;
      });
    }
    // Remove lock
    const lockKey = `${isRow ? 'row' : 'col'}-${index}`;
    setLocks(prev => ({ ...prev, [lockKey]: false }));
  };
  
  // Handle clear all
  const handleClearAll = () => {
    setRowHeaders([
      { type: null, value: null, label: null },
      { type: null, value: null, label: null },
      { type: null, value: null, label: null }
    ]);
    setColHeaders([
      { type: null, value: null, label: null },
      { type: null, value: null, label: null },
      { type: null, value: null, label: null }
    ]);
    setLocks({});
  };
  
  // Handle randomize
  const handleRandomize = () => {
    const allOptions = [...teamOptions, ...achievementOptions];
    
    // Randomize unlocked headers
    setRowHeaders(prev => prev.map((header, index) => {
      const lockKey = `row-${index}`;
      if (locks[lockKey]) return header; // Skip locked headers
      
      const randomOption = allOptions[Math.floor(Math.random() * allOptions.length)];
      if ('abbrev' in randomOption) {
        return {
          type: 'team' as const,
          value: `team-${randomOption.id}`,
          label: randomOption.name,
          teamData: randomOption.teamData
        };
      } else {
        return {
          type: 'achievement' as const,
          value: `achievement-${randomOption.id}`,
          label: randomOption.name
        };
      }
    }));
    
    setColHeaders(prev => prev.map((header, index) => {
      const lockKey = `col-${index}`;
      if (locks[lockKey]) return header; // Skip locked headers
      
      const randomOption = allOptions[Math.floor(Math.random() * allOptions.length)];
      if ('abbrev' in randomOption) {
        return {
          type: 'team' as const,
          value: `team-${randomOption.id}`,
          label: randomOption.name,
          teamData: randomOption.teamData
        };
      } else {
        return {
          type: 'achievement' as const,
          value: `achievement-${randomOption.id}`,
          label: randomOption.name
        };
      }
    }));
  };
  
  // Toggle lock
  const toggleLock = (isRow: boolean, index: number) => {
    const lockKey = `${isRow ? 'row' : 'col'}-${index}`;
    setLocks(prev => ({ ...prev, [lockKey]: !prev[lockKey] }));
  };
  
  // Handle play grid
  const handlePlayGrid = () => {
    if (!isGridComplete || !leagueData) return;
    
    const rows: CatTeam[] = [];
    const cols: CatTeam[] = [];
    
    // Convert headers to CatTeam format
    rowHeaders.forEach(header => {
      if (header.type === 'team' && header.teamData) {
        rows.push({
          type: 'team',
          team: header.teamData,
          name: header.teamData.name
        });
      } else if (header.type === 'achievement' && header.value) {
        const achievementId = header.value.replace('achievement-', '');
        rows.push({
          type: 'achievement',
          achievement: achievementId,
          name: header.label || achievementId
        });
      }
    });
    
    colHeaders.forEach(header => {
      if (header.type === 'team' && header.teamData) {
        cols.push({
          type: 'team',
          team: header.teamData,
          name: header.teamData.name
        });
      } else if (header.type === 'achievement' && header.value) {
        const achievementId = header.value.replace('achievement-', '');
        cols.push({
          type: 'achievement',
          achievement: achievementId,
          name: header.label || achievementId
        });
      }
    });
    
    if (rows.length === 3 && cols.length === 3) {
      onPlayGrid(rows, cols);
    }
  };
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] bg-[#0B0F14] border-[#1E2630] text-[#E6EDF3] p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Create Custom Grid</h2>
              <p className="text-[#A6B0BB]">Choose 3 row headers and 3 column headers.</p>
            </div>
            <Badge 
              variant="secondary" 
              className="bg-[#243244] text-[#F0F4F8] font-medium"
            >
              Rows {filledRows}/3 • Columns {filledCols}/3
            </Badge>
          </div>
          
          {/* Grid Preview */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {/* Top-left corner */}
            <div className="aspect-square min-h-[120px]" />
            
            {/* Column headers */}
            {colHeaders.map((header, index) => (
              <HeaderTile
                key={`col-${index}`}
                selection={header}
                onEdit={() => setPickerState({
                  isOpen: true,
                  position: `Column ${String.fromCharCode(65 + index)}`,
                  isRow: false,
                  index
                })}
                onClear={() => handleClearHeader(false, index)}
                position={`Column ${String.fromCharCode(65 + index)}`}
                locked={locks[`col-${index}`]}
              />
            ))}
            
            {/* Row headers and body cells */}
            {rowHeaders.map((header, rowIndex) => (
              <>
                <HeaderTile
                  key={`row-${rowIndex}`}
                  selection={header}
                  onEdit={() => setPickerState({
                    isOpen: true,
                    position: `Row ${rowIndex + 1}`,
                    isRow: true,
                    index: rowIndex
                  })}
                  onClear={() => handleClearHeader(true, rowIndex)}
                  position={`Row ${rowIndex + 1}`}
                  locked={locks[`row-${rowIndex}`]}
                />
                {/* Body cells */}
                {[0, 1, 2].map(colIndex => (
                  <div 
                    key={`cell-${rowIndex}-${colIndex}`}
                    className="aspect-square min-h-[120px] rounded-xl border border-[#1E2630] bg-[#0B0F14] flex items-center justify-center"
                  >
                    <span className="text-[#A6B0BB] text-2xl">—</span>
                  </div>
                ))}
              </>
            ))}
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="border-[#1E2630] bg-[#11161C] text-[#E6EDF3] hover:bg-[#1A1F26]">
                    Presets <ChevronDown size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#11161C] border-[#1E2630]">
                  <DropdownMenuItem className="text-[#E6EDF3] hover:bg-[#1A1F26]">Teams Only</DropdownMenuItem>
                  <DropdownMenuItem className="text-[#E6EDF3] hover:bg-[#1A1F26]">Awards Only</DropdownMenuItem>
                  <DropdownMenuItem className="text-[#E6EDF3] hover:bg-[#1A1F26]">Mixed Starters</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRandomize}
                className="border-[#1E2630] bg-[#11161C] text-[#E6EDF3] hover:bg-[#1A1F26]"
              >
                <Dice3 size={16} className="mr-2" />
                Randomize
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearAll}
                className="text-[#A6B0BB] hover:text-[#E6EDF3] hover:bg-[#1A1F26]"
              >
                <RotateCcw size={16} className="mr-2" />
                Clear All
              </Button>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={onClose} className="text-[#A6B0BB] hover:text-[#E6EDF3] hover:bg-[#1A1F26]">
                Cancel
              </Button>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button 
                        onClick={handlePlayGrid}
                        disabled={!isGridComplete}
                        className="bg-[#4FB2FF] hover:bg-[#3A9DE8] text-white disabled:bg-[#243244] disabled:text-[#A6B0BB]"
                      >
                        <Play size={16} className="mr-2" />
                        Play Grid
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {!isGridComplete && (
                    <TooltipContent>
                      Set 3 row headers and 3 column headers to start
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Search Picker */}
      <SearchPicker
        isOpen={pickerState.isOpen}
        onClose={() => setPickerState(prev => ({ ...prev, isOpen: false }))}
        onSelect={handleHeaderSelect}
        title={`Select header — ${pickerState.position}`}
        teams={teamOptions}
        achievements={achievementOptions}
        sport={sport}
      />
    </>
  );
}