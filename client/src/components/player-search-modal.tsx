
import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import type { SearchablePlayer, Player } from '@/types/bbgm';
import { useFuseSearch } from '@/lib/search-utils';
import { useVirtualizer } from '@tanstack/react-virtual';
import { PlayerFace } from './PlayerFace';
import type Fuse from 'fuse.js';
import type { FuseResult, FuseResultMatch } from 'fuse.js';

interface PlayerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlayer: (player: Player) => void;
  searchablePlayers: SearchablePlayer[];
  byPid: Record<number, Player>;
  cellDescription: string;
  usedPids: Set<number>;
}

// Helper to generate highlighted name from Fuse.js matches
const generateHighlightedName = (
  name: string,
  matches: readonly FuseResultMatch[] | undefined
) => {
  if (!matches || matches.length === 0) {
    return <span>{name}</span>;
  }

  const result: (string | JSX.Element)[] = [];
  let lastIndex = 0;

  // Assuming we only care about the 'searchKey' matches
  const nameMatch = matches.find(m => m.key === 'searchKey');
  if (!nameMatch) return <span>{name}</span>;

  nameMatch.indices.forEach((match: readonly [number, number], i: number) => {
    const [start, end] = match;
    // Add non-matching part
    if (start > lastIndex) {
      result.push(name.substring(lastIndex, start));
    }
    // Add matching part
    result.push(<strong key={`match-${i}`}>{name.substring(start, end + 1)}</strong>);
    lastIndex = end + 1;
  });

  // Add the rest of the string
  if (lastIndex < name.length) {
    result.push(name.substring(lastIndex));
  }

  return <span>{result}</span>;
};


export function PlayerSearchModal({
  isOpen,
  onClose,
  onSelectPlayer,
  searchablePlayers,
  byPid,
  cellDescription,
  usedPids,
}: PlayerSearchModalProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const {
    searchQuery,
    setSearchQuery,
    searchResults,
  } = useFuseSearch(searchablePlayers, { delay: 120, maxResults: 30 });

  const rowVirtualizer = useVirtualizer({
    count: searchResults.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 5,
  });

  const resetAndFocus = useCallback(() => {
    setSearchQuery('');
    setActiveIndex(0);
    // Delay focus to ensure modal is fully rendered
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [setSearchQuery]);

  useEffect(() => {
    if (isOpen) {
      resetAndFocus();
    }
  }, [isOpen, resetAndFocus]);

  useEffect(() => {
    setActiveIndex(0);
    // This check prevents scrolling to top on every keystroke if already there
    if (rowVirtualizer.getVirtualItems().length > 0 && rowVirtualizer.getVirtualItems()[0].index !== 0) {
      rowVirtualizer.scrollToIndex(0);
    }
  }, [searchQuery, rowVirtualizer]);


  const handleSelectPlayer = (playerResult: FuseResult<SearchablePlayer>) => {
    if (playerResult && !usedPids.has(playerResult.item.pid)) {
      onSelectPlayer(byPid[playerResult.item.pid]);
      onClose();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    if (searchResults.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const newIndex = Math.min(activeIndex + 1, searchResults.length - 1);
      setActiveIndex(newIndex);
      rowVirtualizer.scrollToIndex(newIndex, { align: 'auto' });
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const newIndex = Math.max(activeIndex - 1, 0);
      setActiveIndex(newIndex);
      rowVirtualizer.scrollToIndex(newIndex, { align: 'auto' });
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (searchResults[activeIndex]) {
        handleSelectPlayer(searchResults[activeIndex]);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-md max-h-[80vh] flex flex-col p-0 shadow-lg border"
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label={cellDescription}
      >
        <DialogHeader className="border-b p-4">
          <DialogTitle className="text-lg font-semibold">Find a Player</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            {cellDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Type player name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-autocomplete="list"
              aria-controls="player-listbox"
              aria-activedescendant={searchResults.length > 0 ? `player-option-${activeIndex}`: undefined}
            />
          </div>
        </div>

        <div
          ref={parentRef}
          className="overflow-y-auto h-full"
          id="player-listbox"
          role="listbox"
        >
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const result = searchResults[virtualItem.index];
              const player = result.item;
              const fullPlayer = byPid[player.pid];
              const isUsed = usedPids.has(player.pid);
              const isActive = virtualItem.index === activeIndex;

              return (
                <div
                  key={virtualItem.key}
                  id={`player-option-${virtualItem.index}`}
                  role="option"
                  aria-selected={isActive}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  className={`p-2 ${isActive && !isUsed ? 'bg-accent' : ''}`}
                  onMouseEnter={() => setActiveIndex(virtualItem.index)}
                  onClick={() => !isUsed && handleSelectPlayer(result)}
                >
                  <Button
                    variant="ghost"
                    className={`w-full justify-start h-full text-left ${isUsed ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isUsed}
                  >
                    <PlayerFace
                      pid={fullPlayer.pid}
                      name={fullPlayer.name}
                      imgURL={fullPlayer.imgURL}
                      face={fullPlayer.face}
                      player={fullPlayer}
                      size={40}
                    />
                    <div className="flex-grow ml-3">
                      <div className="font-medium">
                        {generateHighlightedName(player.displayName, result.matches)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {player.careerYears}
                      </div>
                    </div>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {searchResults.length === 0 && searchQuery.length > 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No matches found for "{searchQuery}".</p>
            <p className="text-xs mt-2">Try a different spelling or another player.</p>
          </div>
        )}

        <div className="border-t p-3 text-center text-xs text-muted-foreground">
          Click a player or press <strong>Enter</strong> to submit.
        </div>
      </DialogContent>
    </Dialog>
  );
}
