import { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';
import type { SearchablePlayer, Player } from '@/types/bbgm';
import { buildSearchIndex, searchIndex, useDebounce, type SearchIndex } from '@/lib/search-utils';

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
  const [activeIndex, setActiveIndex] = useState(-1);
  const [inputRef, setInputRef] = useState<HTMLInputElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 150);

  // Build search index (memoized)
  const builtIndex = useMemo(() => {
    return buildSearchIndex(
      searchablePlayers,
      (player: SearchablePlayer) => [
        player.name,
        player.firstFolded,
        player.lastFolded,
        player.nameFolded
      ],
      (player: SearchablePlayer) => player.pid
    );
  }, [searchablePlayers]);

  // Perform search with debounced query for display
  const searchResults = useMemo(() => {
    return searchIndex(builtIndex, debouncedQuery, 50);
  }, [builtIndex, debouncedQuery]);

  // Extract just the SearchablePlayer items from search results
  const filteredPlayers = useMemo(() => {
    return searchResults.map((result: any) => result.item);
  }, [searchResults]);

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

      // Perform immediate search with current query (bypass debounce)
      const immediateResults = searchIndex(builtIndex, searchQuery, 50);
      const immediatePlayers = immediateResults.map((result: any) => result.item);

      // If there's an active selection and it's in the immediate results, use it
      if (activeIndex >= 0 && immediatePlayers[activeIndex]) {
        const selectedPlayer = immediatePlayers[activeIndex];
        if (selectedPlayer && !usedPids.has(selectedPlayer.pid)) {
          handleSelectPlayer(selectedPlayer);
        }
      }
      // Otherwise, if there are any immediate results, select the first one (best match)
      else if (immediatePlayers.length > 0) {
        const selectedPlayer = immediatePlayers[0];
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
          zIndex: 9999, // Ensure modal is on top
        }}
      >
        <DialogHeader className="border-b border-border p-4">
          <DialogTitle className="text-lg font-semibold">Search Player</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground text-left mt-2">
            {cellDescription}
          </DialogDescription>
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
              }}
              className="pl-10"
              autoFocus
              data-testid="input-player-search"
            />
          </div>
        </div>

        <ScrollArea
          className="flex-1 overflow-y-auto"
          ref={scrollAreaRef}
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
          }}
        >
          <div
            className="p-1.5"
            role="listbox"
            aria-activedescendant={activeIndex >= 0 ? `player-option-${filteredPlayers[activeIndex]?.pid}` : undefined}
          >
            {filteredPlayers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-results">
                {searchQuery.trim() ? 'No matching players found' : 'No players found'}
              </div>
            ) : (
              filteredPlayers.map((searchablePlayer: SearchablePlayer, index: number) => {
                const player = byPid[searchablePlayer.pid];
                const isUsed = usedPids.has(searchablePlayer.pid);
                const isActive = index === activeIndex;

                return (
                  <button
                    key={searchablePlayer.pid}
                    id={`player-option-${searchablePlayer.pid}`}
                    className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-3 transition-colors ${
                      isUsed
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:bg-accent hover:text-accent-foreground cursor-pointer'
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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{player.name}</span>
                        {searchablePlayer.careerYears && (
                          <span className="text-[11px] text-muted-foreground font-normal flex-shrink-0">
                            {searchablePlayer.careerYears}
                          </span>
                        )}
                        {isUsed && (
                          <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0 italic">Used</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
