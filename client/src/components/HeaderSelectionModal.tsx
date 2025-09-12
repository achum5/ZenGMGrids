import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Search, Trophy, Users, CheckCircle } from 'lucide-react';
import type { LeagueData, Team } from '@/types/bbgm';
import { detectSport } from '@/lib/grid-sharing';
import { getAchievementOptions, type AchievementOption } from '@/lib/custom-grid-utils';
import { buildSeasonIndex, SEASON_ACHIEVEMENTS } from '@/lib/season-achievements';

// Constants for BBGM logo URLs
const BBGM_ASSET_BASE = 'https://play.basketball-gm.com';

function isBBGMDefaultLogo(logoURL: string | null | undefined): boolean {
  if (!logoURL) return false;
  return logoURL.startsWith('/img/logos-') || logoURL.startsWith('img/logos-');
}

// Build logo URL for teams, prioritizing small logos
function buildLogoURL(team: Team): string {
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
}

interface ListItem {
  type: 'team' | 'achievement';
  id: string;
  name: string;
  displayName: string;
  logoUrl?: string;
  abbrev?: string;
  pillType: 'Team' | 'Season' | 'Career';
  searchText: string;
}

interface HeaderSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leagueData: LeagueData | null;
  onSelect: (type: 'team' | 'achievement', value: string, label: string) => void;
  headerPosition: string; // e.g., "row-0", "col-1"
  triggerElementRef?: React.RefObject<HTMLElement>; // For focus restoration
}

// Simple tokenization and fuzzy search (similar to player search)
function tokenizeSearch(query: string): string[] {
  return query.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 0);
}

function matchesSearch(searchText: string, query: string): boolean {
  if (!query.trim()) return true;
  
  const tokens = tokenizeSearch(query);
  const text = searchText.toLowerCase();
  
  // Check if all tokens are found in the text (fuzzy match)
  return tokens.every(token => text.includes(token));
}

export function HeaderSelectionModal({ 
  open, 
  onOpenChange, 
  leagueData, 
  onSelect, 
  headerPosition,
  triggerElementRef 
}: HeaderSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'teams' | 'achievements'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  
  const listRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset state when opening/closing
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setActiveFilter('all');
      setSelectedIndex(0);
      // Focus search input when opened
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [open]);

  const sport = useMemo(() => leagueData ? detectSport(leagueData) : 'basketball', [leagueData]);

  // Build season index for achievements if needed
  const seasonIndex = useMemo(() => {
    return leagueData ? buildSeasonIndex(leagueData.players, sport) : undefined;
  }, [leagueData?.players, sport]);

  // Build unified list items using raw team and achievement data
  const allItems = useMemo<ListItem[]>(() => {
    const teams: ListItem[] = leagueData?.teams 
      ? leagueData.teams
          .filter(team => !team.disabled)
          .map(team => {
            const logoUrl = buildLogoURL(team);
            const fullName = `${team.region || team.abbrev} ${team.name}`.trim();
            return {
              type: 'team' as const,
              id: team.tid.toString(),
              name: fullName,
              displayName: fullName,
              logoUrl,
              abbrev: team.abbrev,
              pillType: 'Team' as const,
              searchText: [
                team.region || '',
                team.name || '',
                team.abbrev || '',
                fullName
              ].filter(Boolean).join(' ').toLowerCase()
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name))
      : [];

    // Get achievement options and determine if they are season-based
    const achievementOptions = leagueData ? getAchievementOptions(sport, seasonIndex) : [];
    const achievements: ListItem[] = achievementOptions.map(achievement => {
      // Check if this is a season achievement based on the achievement ID
      const isSeasonAchievement = SEASON_ACHIEVEMENTS.some(sa => sa.id === achievement.id);
      
      return {
        type: 'achievement' as const,
        id: achievement.id,
        name: achievement.label,
        displayName: achievement.label,
        pillType: isSeasonAchievement ? 'Season' as const : 'Career' as const,
        searchText: achievement.label.toLowerCase()
      };
    });

    // Sort achievements: Career first, then Season, then alphabetically within each group
    achievements.sort((a, b) => {
      if (a.pillType === 'Career' && b.pillType === 'Season') return -1;
      if (a.pillType === 'Season' && b.pillType === 'Career') return 1;
      return a.name.localeCompare(b.name);
    });

    return [...teams, ...achievements];
  }, [leagueData?.teams, sport, seasonIndex, leagueData]);

  // Filter items based on search and filter
  const filteredItems = useMemo(() => {
    let items = allItems;

    // Apply filter
    if (activeFilter === 'teams') {
      items = items.filter(item => item.type === 'team');
    } else if (activeFilter === 'achievements') {
      items = items.filter(item => item.type === 'achievement');
    }

    // Apply search
    if (searchQuery.trim()) {
      items = items.filter(item => matchesSearch(item.searchText, searchQuery));
    }

    return items;
  }, [allItems, activeFilter, searchQuery]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      switch (e.key) {
        case 'Escape':
          handleClose();
          break;
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
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, filteredItems, selectedIndex, onOpenChange]);

  // Reset selected index when filtered items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && filteredItems.length > 0) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, filteredItems]);

  const handleSelect = (item: ListItem) => {
    onSelect(item.type, item.id, item.name);
    handleClose();
  };

  const handleClose = () => {
    onOpenChange(false);
    // Restore focus to the trigger element for accessibility
    setTimeout(() => {
      triggerElementRef?.current?.focus();
    }, 100);
  };

  const getTitle = () => {
    if (!headerPosition) return 'Configure Header';
    const [type, index] = headerPosition.split('-');
    const position = type === 'row' ? 'Row' : 'Column';
    return `Configure ${position} ${parseInt(index) + 1}`;
  };

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/20 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      style={{ pointerEvents: 'auto' }}
    >
      <div 
        className="w-80 max-h-96 bg-background border rounded-lg shadow-xl flex flex-col" 
        onClick={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto', position: 'relative' }}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b p-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">{getTitle()}</h2>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleClose}
              data-testid="close-panel"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          {/* Search Bar */}
          <div className="relative mb-3">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search teams or achievements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-8 text-sm"
              data-testid="search-input"
            />
          </div>
          
          {/* Filter Chips */}
          <div className="flex gap-1">
            {(['all', 'teams', 'achievements'] as const).map((filter) => (
              <Button
                key={filter}
                variant={activeFilter === filter ? 'default' : 'outline'}
                size="sm"
                className="h-6 px-2 text-xs capitalize"
                onClick={() => setActiveFilter(filter)}
                data-testid={`filter-${filter}`}
              >
                {filter}
              </Button>
            ))}
          </div>
        </div>

        {/* Scrollable List */}
        <div 
          ref={listRef}
          className="flex-1 overflow-y-auto"
          data-radix-scroll-lock-ignore
        >
          {filteredItems.length === 0 ? (
            <div className="flex items-center justify-center h-16 text-muted-foreground text-sm">
              No results. Try a different search or filter.
            </div>
          ) : (
            <div className="p-2">
              {/* Teams Section */}
              {filteredItems.some(item => item.type === 'team') && (
                <div className="mb-3">
                  <div className="px-1 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Teams
                  </div>
                  <div className="space-y-0.5">
                    {filteredItems
                      .filter(item => item.type === 'team')
                      .map((item, globalIndex) => {
                        const itemIndex = filteredItems.indexOf(item);
                        const isSelected = selectedIndex === itemIndex;
                        
                        return (
                          <button
                            key={item.id}
                            data-index={itemIndex}
                            className={`w-full flex items-center gap-2 p-1.5 rounded text-left transition-colors hover:bg-muted ${
                              isSelected ? 'bg-muted ring-1 ring-primary' : ''
                            }`}
                            onClick={() => handleSelect(item)}
                            data-testid={`team-option-${item.id}`}
                          >
                            {isSelected && (
                              <CheckCircle className="h-3 w-3 text-primary flex-shrink-0" />
                            )}
                            <img
                              src={item.logoUrl}
                              alt={`${item.name} logo`}
                              className="w-4 h-4 object-contain flex-shrink-0"
                              onError={(e) => {
                                // Hide broken images
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-xs truncate">{item.displayName}</div>
                              {item.abbrev && (
                                <div className="text-xs text-muted-foreground">{item.abbrev}</div>
                              )}
                            </div>
                            <Badge variant="outline" className="flex-shrink-0 text-xs h-4">
                              {item.pillType}
                            </Badge>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Achievements Section */}
              {filteredItems.some(item => item.type === 'achievement') && (
                <div className="mb-3">
                  <div className="px-1 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Achievements
                  </div>
                  <div className="space-y-0.5">
                    {filteredItems
                      .filter(item => item.type === 'achievement')
                      .map((item) => {
                        const itemIndex = filteredItems.indexOf(item);
                        const isSelected = selectedIndex === itemIndex;
                        
                        return (
                          <button
                            key={item.id}
                            data-index={itemIndex}
                            className={`w-full flex items-center gap-2 p-1.5 rounded text-left transition-colors hover:bg-muted ${
                              isSelected ? 'bg-muted ring-1 ring-primary' : ''
                            }`}
                            onClick={() => handleSelect(item)}
                            data-testid={`achievement-option-${item.id}`}
                          >
                            {isSelected && (
                              <CheckCircle className="h-3 w-3 text-primary flex-shrink-0" />
                            )}
                            <Trophy className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-xs truncate">{item.displayName}</div>
                            </div>
                            <Badge 
                              variant={item.pillType === 'Season' ? 'default' : 'secondary'}
                              className="flex-shrink-0 text-xs h-4"
                            >
                              {item.pillType}
                            </Badge>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}