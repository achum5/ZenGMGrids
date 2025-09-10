import { useState, useCallback } from 'react';
import { UploadSection } from '@/components/upload-section';
import { GridSection } from '@/components/grid-section';
import { PlayerSearchModal } from '@/components/player-search-modal';
import { PlayerModal } from '@/components/PlayerModal';
import { ThemeToggle } from '@/components/theme-toggle';
import { RulesModal } from '@/components/RulesModal';
import { GridSharingModal } from '@/components/grid-sharing-modal';
import { CustomGridModal } from '@/components/custom-grid-modal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Home as HomeIcon } from 'lucide-react';
// Import sport icon images
import sportsCombinedIcon from '@/assets/sports-combined.png';
import basketballIcon from '@/assets/basketball.png';
import footballIcon from '@/assets/football.png';
import hockeyIcon from '@/assets/hockey.png';
import baseballIcon from '@/assets/baseball.png';
import { parseLeagueFile, parseLeagueUrl, buildSearchIndex } from '@/lib/bbgm-parser';
import { generateTeamsGrid, cellKey } from '@/lib/grid-generator';
import { computeRarityForGuess, playerToEligibleLite } from '@/lib/rarity';
import { useToast } from '@/hooks/use-toast';
import type { LeagueData, CatTeam, CellState, Player, SearchablePlayer } from '@/types/bbgm';
import { validatePlayerEligibility } from '@/lib/common-sense-validator';

// Helper functions for attempt tracking
function getAttemptCount(gridId: string): number {
  try {
    const stored = localStorage.getItem(`attemptCount:${gridId}`);
    return stored ? parseInt(stored, 10) : 1;
  } catch {
    return 1;
  }
}

function storeAttemptCount(gridId: string, count: number): void {
  try {
    localStorage.setItem(`attemptCount:${gridId}`, count.toString());
  } catch {
    // Storage failed, continue without persistence
  }
}

function getOrdinalLabel(count: number): string {
  const ordinals = {
    2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth', 7: 'seventh', 8: 'eighth', 9: 'ninth', 10: 'tenth',
    11: 'eleventh', 12: 'twelfth', 13: 'thirteenth', 14: 'fourteenth', 15: 'fifteenth', 16: 'sixteenth', 17: 'seventeenth', 18: 'eighteenth', 19: 'nineteenth', 20: 'twentieth'
  };
  
  if (count <= 20) {
    return ordinals[count as keyof typeof ordinals] || `${count}th`;
  }
  
  // For numbers above 20, use hyphenated form
  const tens = Math.floor(count / 10) * 10;
  const ones = count % 10;
  const tensWord = { 20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty', 60: 'sixty', 70: 'seventy', 80: 'eighty', 90: 'ninety' }[tens];
  const onesWord = { 1: 'first', 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth', 7: 'seventh', 8: 'eighth', 9: 'ninth' }[ones];
  
  if (ones === 0) {
    return `${tensWord}th`;
  }
  
  return `${tensWord}-${onesWord}`;
}

export default function Home() {
  const { toast } = useToast();
  
  // Core state
  const [leagueData, setLeagueData] = useState<LeagueData | null>(null);
  const [rows, setRows] = useState<CatTeam[]>([]);
  const [cols, setCols] = useState<CatTeam[]>([]);
  const [cells, setCells] = useState<Record<string, CellState>>({});
  const [usedPids, setUsedPids] = useState<Set<number>>(new Set());
  const [intersections, setIntersections] = useState<Record<string, number[]>>({});
  
  // Search indices
  const [byName, setByName] = useState<Record<string, number>>({});
  const [byPid, setByPid] = useState<Record<number, Player>>({});
  const [searchablePlayers, setSearchablePlayers] = useState<SearchablePlayer[]>([]);
  const [teamsByTid, setTeamsByTid] = useState<Record<number, any>>({});
  
  // Rank cache for Give Up functionality
  const [rankCache, setRankCache] = useState<Record<string, Array<{player: Player, rarity: number}>>>({});
  
  // UI state
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [currentCellKey, setCurrentCellKey] = useState<string | null>(null);
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [modalPlayer, setModalPlayer] = useState<Player | null>(null);
  const [modalEligiblePlayers, setModalEligiblePlayers] = useState<Player[]>([]);
  const [modalPuzzleSeed, setModalPuzzleSeed] = useState<string>("");
  const [modalCellKey, setModalCellKey] = useState<string>("");
  
  // Attempt tracking state
  const [currentGridId, setCurrentGridId] = useState<string>('');
  const [attemptCount, setAttemptCount] = useState<number>(1);
  
  // Grid sharing state
  const [gridSharingModalOpen, setGridSharingModalOpen] = useState(false);
  
  // Custom grid state
  const [customGridModalOpen, setCustomGridModalOpen] = useState(false);

  // Helper function to build and cache player rankings for a cell
  const buildRankCacheForCell = useCallback((cellKey: string): Array<{player: Player, rarity: number}> => {
    if (!leagueData || !rows.length || !cols.length) return [];
    
    const [rowKey, colKey] = cellKey.split('|');
    const rowConstraint = rows.find(r => r.key === rowKey);
    const colConstraint = cols.find(c => c.key === colKey);
    
    if (!rowConstraint || !colConstraint) return [];
    
    // Get eligible players for this cell using single common-sense validator
    const rowValidationConstraint = {
      type: rowConstraint.type === 'team' ? 'team' as const : 'achievement' as const,
      name: rowConstraint.label || '',
      tid: rowConstraint.tid
    };
    
    const colValidationConstraint = {
      type: colConstraint.type === 'team' ? 'team' as const : 'achievement' as const,
      name: colConstraint.label || '',
      tid: colConstraint.tid
    };
    
    const eligiblePlayers = leagueData.players.filter(p => {
      const result = validatePlayerEligibility(
        rowValidationConstraint,
        colValidationConstraint,
        p,
        leagueData.teams
      );
      return result.isValid;
    });
    
    if (eligiblePlayers.length === 0) return [];
    
    // Calculate rarity for all eligible players using the same method as PlayerModal
    const eligiblePool = eligiblePlayers.map(p => playerToEligibleLite(p));
    const puzzleSeed = `${rows.map(r => r.key).join('-')}_${cols.map(c => c.key).join('-')}`;
    const teamsMap = new Map(leagueData.teams.map(t => [t.tid, t]));
    
    const playersWithRarity = eligiblePlayers.map(p => {
      const guessedPlayer = playerToEligibleLite(p);
      
      const rarity = computeRarityForGuess({
        guessed: guessedPlayer,
        eligiblePool: eligiblePool,
        puzzleSeed: puzzleSeed,
        cellContext: {
          rowConstraint: {
            type: rowConstraint.type,
            tid: rowConstraint.tid,
            achievementId: rowConstraint.achievementId,
            label: rowConstraint.label
          },
          colConstraint: {
            type: colConstraint.type,
            tid: colConstraint.tid,
            achievementId: colConstraint.achievementId,
            label: colConstraint.label
          }
        },
        fullPlayers: eligiblePlayers,
        teams: teamsMap
      });
      
      return { player: p, rarity };
    });
    
    // Sort by rarity (most common first = lowest rarity score)
    playersWithRarity.sort((a, b) => a.rarity - b.rarity);
    
    return playersWithRarity;
  }, [leagueData, rows, cols]);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsProcessing(true);
    
    try {
      // Parse the league file
      const data = await parseLeagueFile(file);
      await processLeagueData(data);
      
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: 'Error loading file',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const handleUrlUpload = useCallback(async (url: string) => {
    setIsProcessing(true);
    
    try {
      // Parse the league URL
      const data = await parseLeagueUrl(url);
      await processLeagueData(data);
      
    } catch (error) {
      console.error('Error processing URL:', error);
      toast({
        title: 'Error loading URL',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const processLeagueData = useCallback(async (data: LeagueData) => {
    setLeagueData(data);
    
    // Force close any open dropdowns/modals on mobile after file upload
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      // Close any open dialogs or dropdowns by clicking outside
      document.body.click();
      // Remove focus from any elements that might be capturing events
      if (document.activeElement && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      // Force a brief delay to let any modal states resolve
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    
    // Build search indices
    const indices = buildSearchIndex(data.players, data.teams);
    setByName(indices.byName);
    setByPid(indices.byPid);
    setSearchablePlayers(indices.searchablePlayers);
    setTeamsByTid(indices.teamsByTid);
    
    // Generate initial grid
    const gridResult = generateTeamsGrid(data);
    setRows(gridResult.rows);
    setCols(gridResult.cols);
    setIntersections(gridResult.intersections);
    setCells({});
    
    // Initialize grid tracking
    const gridId = `${gridResult.rows.map(r => r.key).join('-')}_${gridResult.cols.map(c => c.key).join('-')}`;
    setCurrentGridId(gridId);
    
    // Load attempt count from localStorage
    const storedAttemptCount = getAttemptCount(gridId);
    setAttemptCount(storedAttemptCount);
    
    // Success toast removed - was blocking mobile interactions
  }, [toast]);

  const handleGenerateNewGrid = useCallback(() => {
    if (!leagueData) {
      console.warn('Cannot generate grid: missing leagueData');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const gridResult = generateTeamsGrid(leagueData);
      setRows(gridResult.rows);
      setCols(gridResult.cols);
      setIntersections(gridResult.intersections);
      setCells({}); // Reset all answers
      setUsedPids(new Set()); // Reset used players
      setRankCache({}); // Reset cached rankings for the old grid
      
      // Initialize new grid tracking
      const gridId = `${gridResult.rows.map(r => r.key).join('-')}_${gridResult.cols.map(c => c.key).join('-')}`;
      setCurrentGridId(gridId);
      
      // Reset attempt count for new grid
      setAttemptCount(1);
      storeAttemptCount(gridId, 1);
      
      // Grid generation toast removed - was intrusive
      
    } catch (error) {
      console.error('Error generating grid:', error);
      toast({
        title: 'Error generating grid',
        description: error instanceof Error ? error.message : 'Failed to generate new grid',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [leagueData, toast]);

  // Handle importing a shared grid
  const handleImportGrid = useCallback((importedRows: CatTeam[], importedCols: CatTeam[]) => {
    if (!leagueData) return;
    
    try {
      // Set the imported grid structure
      setRows(importedRows);
      setCols(importedCols);
      
      // Generate intersections for the new grid
      const allCellKeys = importedRows.flatMap(row => 
        importedCols.map(col => cellKey(row.key, col.key))
      );
      
      const newIntersections: Record<string, number[]> = {};
      
      for (const key of allCellKeys) {
        const [rowKey, colKey] = key.split('|');
        const row = importedRows.find(r => r.key === rowKey);
        const col = importedCols.find(c => c.key === colKey);
        
        if (row && col) {
          const eligible = leagueData.players.filter(p => row.test(p) && col.test(p));
          newIntersections[key] = eligible.map(p => p.pid);
        }
      }
      
      setIntersections(newIntersections);
      setCells({}); // Reset all answers
      setUsedPids(new Set()); // Reset used players
      setRankCache({}); // Reset cached rankings
      
      // Initialize grid tracking for imported grid
      const gridId = `${importedRows.map(r => r.key).join('-')}_${importedCols.map(c => c.key).join('-')}`;
      setCurrentGridId(gridId);
      
      // Check if we've played this grid before
      const storedAttempt = getAttemptCount(gridId);
      setAttemptCount(storedAttempt);
      
    } catch (error) {
      console.error('Error importing grid:', error);
      toast({
        title: 'Error importing grid',
        description: error instanceof Error ? error.message : 'Failed to import shared grid',
        variant: 'destructive',
      });
    }
  }, [leagueData, toast]);

  const handleCellClick = useCallback((rowKey: string, colKey: string) => {
    const key = cellKey(rowKey, colKey);
    const cellState = cells[key];
    
    // If cell is locked and has a player, open player modal
    if (cellState?.locked && cellState?.player) {
      setModalPlayer(cellState.player);
      
      // Get eligible players for this cell using the single common-sense validator
      const [modalRowKey, modalColKey] = key.split('|');
      const modalRowConstraint = rows.find(r => r.key === modalRowKey);
      const modalColConstraint = cols.find(c => c.key === modalColKey);
      
      if (modalRowConstraint && modalColConstraint) {
        const modalRowValidationConstraint = {
          type: modalRowConstraint.type === 'team' ? 'team' as const : 'achievement' as const,
          name: modalRowConstraint.label || '',
          tid: modalRowConstraint.tid
        };
        
        const modalColValidationConstraint = {
          type: modalColConstraint.type === 'team' ? 'team' as const : 'achievement' as const,
          name: modalColConstraint.label || '',
          tid: modalColConstraint.tid
        };
        
        const eligiblePlayers = leagueData?.players.filter(p => {
          const result = validatePlayerEligibility(
            modalRowValidationConstraint,
            modalColValidationConstraint,
            p,
            leagueData?.teams || []
          );
          return result.isValid;
        }) || [];
        
        setModalEligiblePlayers(eligiblePlayers);
      } else {
        setModalEligiblePlayers([]);
      }
      
      // Set puzzle seed for consistent rarity calculations
      const puzzleSeed = `${rows.map(r => r.key).join('-')}_${cols.map(c => c.key).join('-')}`;
      setModalPuzzleSeed(puzzleSeed);
      
      // Set the cell key for feedback generation
      setModalCellKey(key);
      
        setPlayerModalOpen(true);
      return;
    }
    
    // If cell is locked but no player, do nothing
    if (cellState?.locked) {
      return;
    }
    
    // Open search modal for empty cells
    setCurrentCellKey(key);
    setSearchModalOpen(true);
  }, [cells, rows, cols, intersections, leagueData]);

  const handleSelectPlayer = useCallback((player: Player) => {
    if (!currentCellKey) return;
    
    // Check if player already used
    if (usedPids.has(player.pid)) {
      toast({
        title: 'Player already used',
        description: 'This player has already been used in this grid.',
        variant: 'destructive',
      });
      return;
    }
    
    // currentCellKey now uses key format: "key1|key2"
    
    // Validate eligibility using canonical index - SINGLE SOURCE OF TRUTH
    const [rowKey, colKey] = currentCellKey.split('|');
    const rowConstraint = rows.find(r => r.key === rowKey);
    const colConstraint = cols.find(c => c.key === colKey);
    
    // Use single common-sense validator - SINGLE SOURCE OF TRUTH
    const rowValidationConstraint = {
      type: rowConstraint?.type === 'team' ? 'team' as const : 'achievement' as const,
      name: rowConstraint?.label || '',
      tid: rowConstraint?.tid
    };
    
    const colValidationConstraint = {
      type: colConstraint?.type === 'team' ? 'team' as const : 'achievement' as const,
      name: colConstraint?.label || '',
      tid: colConstraint?.tid
    };
    
    const validationResult = validatePlayerEligibility(
      rowValidationConstraint,
      colValidationConstraint,
      player,
      leagueData?.teams || []
    );
    
    const isCorrect = validationResult.isValid;
    
    console.log(`🚨 VALIDATION DEBUG: ${player.name} for ${currentCellKey}`);
    console.log(`  Row: ${rowValidationConstraint.name} (${rowValidationConstraint.type})`);
    console.log(`  Col: ${colValidationConstraint.name} (${colValidationConstraint.type})`);
    console.log(`  Result: ${isCorrect ? '✅ VALID' : '❌ INVALID'}`);
    
    if (!isCorrect) {
      console.log(`  Reason: ${validationResult.proofData.failureReason}`);
    } else {
      console.log(`  Proof:`, validationResult.proofData);
    }
    
    
    // Compute rarity if correct
    let rarity = 0;
    let points = 0;
    if (isCorrect && leagueData) {
      // Calculate eligible players using the same validator for rarity consistency
      const eligiblePlayers = leagueData.players.filter(p => {
        const result = validatePlayerEligibility(
          rowValidationConstraint,
          colValidationConstraint,
          p,
          leagueData.teams
        );
        return result.isValid;
      });
      const eligiblePool = eligiblePlayers.map(p => playerToEligibleLite(p));
      const guessedPlayer = playerToEligibleLite(player);
      const puzzleSeed = `${rows.map(r => r.key).join('-')}_${cols.map(c => c.key).join('-')}`;
      
      // Row and column constraints already extracted above
      const teamsMap = new Map(leagueData.teams.map(t => [t.tid, t]));
      
      rarity = computeRarityForGuess({
        guessed: guessedPlayer,
        eligiblePool: eligiblePool,
        puzzleSeed: puzzleSeed,
        cellContext: rowConstraint && colConstraint ? {
          rowConstraint: {
            type: rowConstraint.type,
            tid: rowConstraint.tid,
            achievementId: rowConstraint.achievementId,
            label: rowConstraint.label
          },
          colConstraint: {
            type: colConstraint.type,
            tid: colConstraint.tid,
            achievementId: colConstraint.achievementId,
            label: colConstraint.label
          }
        } : undefined,
        fullPlayers: eligiblePlayers,
        teams: teamsMap
      });
      points = rarity;
    }
    
    // Update cell state with locking
    setCells(prev => ({
      ...prev,
      [currentCellKey]: {
        name: player.name,
        correct: isCorrect,
        locked: true,
        guessed: true,
        player: player,
        rarity: isCorrect ? rarity : undefined,
        points: isCorrect ? points : undefined,
      },
    }));
    
    // Add to used players (regardless of correctness to prevent reuse)
    setUsedPids(prev => new Set([...Array.from(prev), player.pid]));
    
    setCurrentCellKey(null);
    setSearchModalOpen(false);
  }, [currentCellKey, intersections, usedPids, toast, rows, cols, leagueData]);

  const getCurrentCellDescription = () => {
    if (!currentCellKey || !rows || !cols) return '';
    
    const [rowKey, colKey] = currentCellKey.split('|');
    const row = rows.find(r => r.key === rowKey);
    const col = cols.find(c => c.key === colKey);
    
    if (!row || !col) return '';
    
    return `Find a player who meets both: ${row.label} and ${col.label}`;
  };

  // Check if user has made any guesses in the current grid
  const hasGuesses = Object.values(cells).some(cell => cell.guessed);

  // Handle going home with confirmation if there are guesses
  const handleGoHome = useCallback(() => {
    // Reset all state to go back to upload screen
    setLeagueData(null);
    setRows([]);
    setCols([]);
    setCells({});
    setUsedPids(new Set());
    setIntersections({});
    setByName({});
    setByPid({});
    setSearchablePlayers([]);
    setTeamsByTid({});
    setCurrentCellKey(null);
    setSearchModalOpen(false);
    setPlayerModalOpen(false);
    setModalPlayer(null);
    setModalEligiblePlayers([]);
    setModalPuzzleSeed("");
    setModalCellKey("");
    setRankCache({});
  }, []);

  // Handle Give Up - auto-fill empty cells using cached rankings (no recomputation)
  const handleGiveUp = useCallback(() => {
    if (!leagueData) return;
    
    // Find all empty cells in stable order (row-major: top→bottom, left→right)
    const allCellKeys = rows.flatMap(row => cols.map(col => `${row.key}|${col.key}`));
    const emptyCells = allCellKeys.filter(key => !cells[key]?.name);
    
    if (emptyCells.length === 0) return;
    
    // Build usedPids from already-guessed cells
    const usedPidsSet = new Set<number>();
    Object.values(cells).forEach(cell => {
      if (cell.player?.pid) {
        usedPidsSet.add(cell.player.pid);
      }
    });
    
    const newCells = { ...cells };
    const updatedRankCache = { ...rankCache };
    
    // Process each empty cell
    for (const cellKey of emptyCells) {
      // Get or build cached ranking for this cell
      if (!updatedRankCache[cellKey]) {
        updatedRankCache[cellKey] = buildRankCacheForCell(cellKey);
      }
      
      const ranked = updatedRankCache[cellKey];
      
      if (ranked.length === 0) {
        // No eligible players - fill with placeholder
        newCells[cellKey] = {
          name: '—',
          correct: false,
          locked: true,
          autoFilled: true,
          guessed: false,
        };
        
        // Dev logging
        console.log(`🔍 Give Up: ${cellKey} -> "—" (no eligible players)`);
        continue;
      }
      
      // Scan ranked from index 0 upward; pick first unused player
      let selectedEntry = null;
      let selectedRankIndex = -1;
      let skippedPlayers = [];
      
      for (let i = 0; i < ranked.length; i++) {
        const entry = ranked[i];
        if (!usedPidsSet.has(entry.player.pid)) {
          selectedEntry = entry;
          selectedRankIndex = i;
          break;
        } else {
          // Track skipped players for logging
          skippedPlayers.push({ pid: entry.player.pid, name: entry.player.name, rank: i + 1 });
        }
      }
      
      if (selectedEntry) {
        newCells[cellKey] = {
          name: selectedEntry.player.name,
          correct: true, // Auto-filled answers are considered correct for display
          locked: true,
          autoFilled: true,
          guessed: false,
          player: selectedEntry.player,
          rarity: undefined, // No rarity points for revealed answers
          points: 0, // No points for revealed answers
        };
        
        // Add to used set for next iterations
        usedPidsSet.add(selectedEntry.player.pid);
        
        // Dev logging
        const skippedInfo = skippedPlayers.length > 0 
          ? ` (skipped: ${skippedPlayers.map(s => `${s.name}(#${s.rank})`).join(', ')})` 
          : '';
        console.log(`🔍 Give Up: ${cellKey} -> ${selectedEntry.player.name} (rank #${selectedRankIndex + 1}, rarity ${selectedEntry.rarity})${skippedInfo}`);
      } else {
        // All players already used - fill with placeholder
        newCells[cellKey] = {
          name: '—',
          correct: false,
          locked: true,
          autoFilled: true,
          guessed: false,
        };
        
        // Dev logging
        console.log(`🔍 Give Up: ${cellKey} -> "—" (all ${ranked.length} players already used)`);
      }
    }
    
    // Single batched state update
    setCells(newCells);
    setRankCache(updatedRankCache);
    setUsedPids(usedPidsSet);
  }, [leagueData, rows, cols, cells, rankCache, buildRankCacheForCell]);

  const handleRetryGrid = useCallback(() => {
    if (!currentGridId) return;
    
    // Increment attempt count
    const newAttemptCount = attemptCount + 1;
    setAttemptCount(newAttemptCount);
    storeAttemptCount(currentGridId, newAttemptCount);
    
    // Reset the grid state
    setCells({});
    setUsedPids(new Set());
    setRankCache({});
    
    // Keep the same rows, cols, and intersections (same puzzle)
  }, [currentGridId, attemptCount]);

  // Handle custom grid creation
  const handleCustomGridCreated = useCallback((customRows: CatTeam[], customCols: CatTeam[]) => {
    if (!leagueData) return;
    
    try {
      // Calculate intersections for the custom grid
      const newIntersections: Record<string, number[]> = {};
      
      customRows.forEach((row, rowIndex) => {
        customCols.forEach((col, colIndex) => {
          const key = cellKey(row.key, col.key);
          
          // Filter players that match both row and column constraints
          const eligiblePlayers = leagueData.players.filter(player => 
            row.test(player) && col.test(player)
          );
          
          newIntersections[key] = eligiblePlayers.map(p => p.pid);
        });
      });
      
      // Update state with custom grid
      setRows(customRows);
      setCols(customCols);
      setIntersections(newIntersections);
      setCells({}); // Reset all answers
      setUsedPids(new Set()); // Reset used players
      setRankCache({}); // Reset cached rankings
      
      // Initialize new grid tracking
      const gridId = `custom_${customRows.map(r => r.key).join('-')}_${customCols.map(c => c.key).join('-')}`;
      setCurrentGridId(gridId);
      
      // Reset attempt count for new grid
      setAttemptCount(1);
      storeAttemptCount(gridId, 1);
      
    } catch (error) {
      console.error('Error creating custom grid:', error);
      toast({
        title: 'Error creating custom grid',
        description: error instanceof Error ? error.message : 'Failed to create custom grid',
        variant: 'destructive',
      });
    }
  }, [leagueData, toast]);

  // Show upload section if no league data
  if (!leagueData) {
    return (
      <div>
        <header className="bg-card border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img 
                  src={sportsCombinedIcon}
                  alt="Basketball, Football, Hockey, and Baseball icons" 
                  className="w-12 h-12 object-contain"
                />
                <h1 className="text-2xl font-bold text-foreground">ZenGM Grids</h1>
              </div>
              <div className="flex items-center space-x-3">
                <ThemeToggle />
                <RulesModal />
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-6 py-8">
          <UploadSection 
            onFileUpload={handleFileUpload}
            onUrlUpload={handleUrlUpload}
            isProcessing={isProcessing}
          />
        </main>
      </div>
    );
  }

  // Show grid section if league data is loaded
  return (
    <div>
      <header className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src={
                  leagueData?.sport === 'basketball' ? basketballIcon :
                  leagueData?.sport === 'football' ? footballIcon :
                  leagueData?.sport === 'hockey' ? hockeyIcon :
                  leagueData?.sport === 'baseball' ? baseballIcon :
                  sportsCombinedIcon
                }
                alt={`${leagueData?.sport || 'Sports'} icon`} 
                className="w-10 h-10 object-contain"
              />
              <h1 className="text-2xl font-bold text-foreground">
                {leagueData?.sport === 'basketball' && 'Basketball GM Grids'}
                {leagueData?.sport === 'football' && 'Football GM Grids'}
                {leagueData?.sport === 'hockey' && 'ZenGM Hockey Grids'}
                {leagueData?.sport === 'baseball' && 'ZenGM Baseball Grids'}
              </h1>
            </div>
            <div className="flex items-center space-x-1">
              <ThemeToggle />
              <RulesModal sport={leagueData?.sport} />
              {hasGuesses ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" data-testid="button-home">
                      <HomeIcon className="h-[1.2rem] w-[1.2rem]" />
                      <span className="sr-only">Go home</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Go back to file upload?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You have made guesses in this grid. Going home will lose your current progress. Are you sure you want to continue?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleGoHome}>Go Home</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button variant="ghost" size="sm" onClick={handleGoHome} data-testid="button-home">
                  <HomeIcon className="h-[1.2rem] w-[1.2rem]" />
                  <span className="sr-only">Go home</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">
        <GridSection
          rows={rows}
          cols={cols}
          cells={cells}
          onCellClick={handleCellClick}
          onGenerateNewGrid={handleGenerateNewGrid}
          onGiveUp={handleGiveUp}
          onRetryGrid={handleRetryGrid}
          onShareGrid={() => setGridSharingModalOpen(true)}
          onCustomGrid={() => setCustomGridModalOpen(true)}
          isGenerating={isGenerating}
          teams={leagueData?.teams || []}
          sport={leagueData?.sport}
          attemptCount={attemptCount}
          getOrdinalLabel={getOrdinalLabel}
        />
        
        <PlayerSearchModal
          isOpen={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          onSelectPlayer={handleSelectPlayer}
          searchablePlayers={searchablePlayers}
          byPid={byPid}
          cellDescription={getCurrentCellDescription()}
          usedPids={usedPids}
          currentCellKey={currentCellKey}
        />
        
        <PlayerModal
          open={playerModalOpen}
          onOpenChange={setPlayerModalOpen}
          player={modalPlayer}
          teams={leagueData?.teams || []}
          eligiblePlayers={modalEligiblePlayers}
          puzzleSeed={modalPuzzleSeed}
          rows={rows}
          cols={cols}
          currentCellKey={modalCellKey}
          sport={leagueData?.sport}
          cells={cells}
          seasonIndex={leagueData?.seasonIndex}
        />
        
        <GridSharingModal
          isOpen={gridSharingModalOpen}
          onClose={() => setGridSharingModalOpen(false)}
          rows={rows}
          cols={cols}
          leagueData={leagueData}
          onImportGrid={handleImportGrid}
        />
        
        <CustomGridModal
          isOpen={customGridModalOpen}
          onClose={() => setCustomGridModalOpen(false)}
          leagueData={leagueData}
          onCreateGrid={handleCustomGridCreated}
        />
      </main>
    </div>
  );
}
