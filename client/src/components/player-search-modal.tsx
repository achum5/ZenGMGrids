import { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, X } from 'lucide-react';
import type { SearchablePlayer, Player } from '@/types/bbgm';

interface PlayerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlayer: (player: Player) => void;
  searchablePlayers: SearchablePlayer[];
  byPid: Record<number, Player>;
  cellDescription: string;
  usedPids: Set<number>;
  currentCellKey: string | null;
}

export function PlayerSearchModal({
  isOpen,
  onClose,
  onSelectPlayer,
  searchablePlayers,
  byPid,
  cellDescription,
  usedPids,
  currentCellKey,
}: PlayerSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [inputRef, setInputRef] = useState<HTMLInputElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Diacritic-insensitive folding (same as in bbgm-parser)
  const fold = (s: string): string => {
    return s.normalize('NFKD')
      .toLowerCase()
      .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
      .replace(/'/g, '') // Remove apostrophes for search matching
      .replace(/[-]/g, ' '); // Convert hyphens to spaces for flexible search
  };

  // Get career year range for a player
  // Career years are now pre-calculated in SearchablePlayer

  // Filter players based on search query - show all players but mark used ones
  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) {
      return searchablePlayers.slice(0, 100); // Show first 100 players when no search
    }

    const queryFolded = fold(searchQuery.trim());
    // Also create a version with spaces converted to hyphens for bidirectional matching
    const queryWithHyphens = queryFolded.replace(/ /g, '-');
    
    const matches = searchablePlayers.filter(sp => {
      // Check original folded versions
      const matchesOriginal = sp.firstFolded.includes(queryFolded) || 
                             sp.lastFolded.includes(queryFolded) ||
                             sp.nameFolded.includes(queryFolded);
      
      // Check hyphenated versions (for when user types spaces but name has hyphens)
      const matchesHyphenated = sp.firstFolded.includes(queryWithHyphens) || 
                               sp.lastFolded.includes(queryWithHyphens) ||
                               sp.nameFolded.includes(queryWithHyphens);
      
      return matchesOriginal || matchesHyphenated;
    });

    return matches.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 100);
  }, [searchablePlayers, searchQuery]);

  // Reset search when modal opens or cell changes and focus input
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setActiveIndex(0); // Always start with first item selected
      // Focus input on next tick
      setTimeout(() => {
        if (inputRef) {
          inputRef.focus();
        }
      }, 0);
    }
  }, [isOpen, currentCellKey, inputRef]);

  // Auto-select first item when search results change
  useEffect(() => {
    if (filteredPlayers.length > 0) {
      setActiveIndex(0); // Always highlight the first player
    } else {
      setActiveIndex(-1);
    }
  }, [filteredPlayers]);

  const handleSelectPlayer = (searchablePlayer: SearchablePlayer) => {
    const player = byPid[searchablePlayer.pid];
    if (player && !usedPids.has(player.pid)) {
      onSelectPlayer(player);
      onClose();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const newIndex = Math.min(activeIndex + 1, filteredPlayers.length - 1);
      setActiveIndex(newIndex);
      scrollToActiveItem(newIndex);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const newIndex = Math.max(activeIndex - 1, -1);
      setActiveIndex(newIndex);
      scrollToActiveItem(newIndex);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      // If there's an active selection, use it
      if (activeIndex >= 0 && filteredPlayers[activeIndex]) {
        const selectedPlayer = filteredPlayers[activeIndex];
        if (selectedPlayer && !usedPids.has(selectedPlayer.pid)) {
          handleSelectPlayer(selectedPlayer);
        }
      }
      // If there's exactly one result and no active selection, select it
      else if (filteredPlayers.length === 1) {
        const selectedPlayer = filteredPlayers[0];
        if (selectedPlayer && !usedPids.has(selectedPlayer.pid)) {
          handleSelectPlayer(selectedPlayer);
        }
      }
    }
  };

  const scrollToActiveItem = (index: number) => {
    if (index >= 0 && scrollAreaRef.current) {
      const activeElement = document.getElementById(`player-option-${filteredPlayers[index]?.pid}`);
      if (activeElement && scrollAreaRef.current) {
        // Use direct scrolling on mobile to avoid keyboard conflicts
        const isMobile = window.innerWidth <= 768 || 'ontouchstart' in window;
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
        
        if (scrollContainer && isMobile) {
          // Calculate position relative to scroll container
          const containerRect = scrollContainer.getBoundingClientRect();
          const elementRect = activeElement.getBoundingClientRect();
          const relativeTop = elementRect.top - containerRect.top + scrollContainer.scrollTop;
          const relativeBottom = relativeTop + elementRect.height;
          
          // Scroll only if element is not fully visible
          if (relativeTop < scrollContainer.scrollTop) {
            scrollContainer.scrollTop = relativeTop - 10; // Add small margin
          } else if (relativeBottom > scrollContainer.scrollTop + scrollContainer.clientHeight) {
            scrollContainer.scrollTop = relativeBottom - scrollContainer.clientHeight + 10;
          }
        } else {
          // Use smooth scrolling on desktop
          activeElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
          });
        }
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-md max-h-[80vh] sm:max-h-[80vh] max-h-[75vh] flex flex-col p-0"
        onKeyDown={handleKeyDown}
        data-testid="modal-player-search"
        style={{
          // Prevent viewport issues on mobile with keyboard
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <DialogHeader className="border-b border-border p-4">
          <DialogTitle className="text-lg font-semibold">Search Player</DialogTitle>
          <p className="text-sm text-muted-foreground text-left mt-2">
            {cellDescription}
          </p>
        </DialogHeader>

        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              ref={setInputRef}
              type="text"
              placeholder="Type player name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveIndex(-1);
              }}
              className="pl-10"
              autoFocus
              data-testid="input-player-search"
            />
          </div>
        </div>

        <ScrollArea 
          className="h-48 overflow-y-auto" 
          ref={scrollAreaRef}
          style={{
            // Prevent momentum scrolling issues on mobile
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            // Prevent scrolling interference with keyboard
            touchAction: 'pan-y',
          }}
        >
          <div 
            className="p-2 space-y-1"
            role="listbox"
            aria-activedescendant={activeIndex >= 0 ? `player-option-${filteredPlayers[activeIndex]?.pid}` : undefined}
          >
            {filteredPlayers.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground" data-testid="text-no-results">
                {searchQuery.trim() ? 'No matching players found' : 'No players found'}
              </div>
            ) : (
              filteredPlayers.map((searchablePlayer, index) => {
                const player = byPid[searchablePlayer.pid];
                const isUsed = usedPids.has(searchablePlayer.pid);
                const isActive = index === activeIndex;
                
                return (
                  <Button
                    key={searchablePlayer.pid}
                    id={`player-option-${searchablePlayer.pid}`}
                    variant="ghost"
                    className={`w-full justify-start px-3 py-2 h-auto ${
                      isUsed 
                        ? 'opacity-60 cursor-not-allowed bg-muted/50 text-muted-foreground' 
                        : 'hover:bg-accent hover:text-accent-foreground'
                    } ${
                      isActive && !isUsed ? 'bg-accent text-accent-foreground ring-2 ring-ring' : ''
                    }`}
                    onClick={() => !isUsed && handleSelectPlayer(searchablePlayer)}
                    disabled={isUsed}
                    aria-disabled={isUsed}
                    role="option"
                    aria-selected={isActive}
                    data-testid={`button-select-player-${searchablePlayer.pid}`}
                  >
                    <div className="text-left flex-1">
                      <div className="font-medium flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{player.name}</span>
                          {searchablePlayer.careerYears && (
                            <span className="text-xs text-muted-foreground font-normal">
                              {searchablePlayer.careerYears}
                            </span>
                          )}
                        </div>
                        {isUsed && (
                          <span className="text-xs text-muted-foreground ml-2 font-normal">Already used</span>
                        )}
                      </div>
                    </div>
                  </Button>
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border p-4">
          <div className="text-xs text-muted-foreground text-center">
            Click a player to submit your answer
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
