import { useState, useCallback, useEffect } from 'react';
import { UploadSection } from '@/components/upload-section';
import { GridSection } from '@/components/grid-section';
import { PlayerSearchModal } from '@/components/player-search-modal';
import { PlayerModal } from '@/components/PlayerModal';
import { HintModal } from '@/components/HintModal';
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
import { debugAchievementIntersection, calculateCustomCellIntersection } from '@/lib/custom-grid-utils';
import { calculateOptimizedIntersection, type IntersectionConstraint } from '@/lib/intersection-cache';
import { getSeasonEligiblePlayers, SEASON_ACHIEVEMENTS } from '@/lib/season-achievements';
import { debugIndividualAchievements, playerMeetsAchievement } from '@/lib/achievements';
import { clearHintCache } from '@/lib/hint-generation';
import { useToast } from '@/hooks/use-toast';
import type { LeagueData, CatTeam, CellState, Player, SearchablePlayer } from '@/types/bbgm';

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
  
  // Give Up state tracking
  const [giveUpPressed, setGiveUpPressed] = useState(false);
  
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
  
  // Custom grid creation state
  const [customGridModalOpen, setCustomGridModalOpen] = useState(false);

  // Help Mode state - off by default
  const [hintMode, setHintMode] = useState<boolean>(false);
  
  // Help Mode locked state - locks after first guess or opening hint modal
  const [hintModeLocked, setHintModeLocked] = useState<boolean>(false);
  
  // Hint modal state
  const [hintModalOpen, setHintModalOpen] = useState(false);
  const [hintCellKey, setHintCellKey] = useState<string>('');
  const [hintRowConstraint, setHintRowConstraint] = useState<CatTeam | null>(null);
  const [hintColConstraint, setHintColConstraint] = useState<CatTeam | null>(null);
  
  // Reshuffle count tracking per cell
  const [reshuffleCounts, setReshuffleCounts] = useState<Record<string, number>>({});

  // Handle hint mode toggle with locking logic
  const handleHintModeChange = useCallback((enabled: boolean) => {
    // Can't change if locked
    if (hintModeLocked) return;
    
    setHintMode(enabled);
  }, [hintModeLocked]);

  // Handle hint modal close
  const handleHintModalClose = useCallback(() => {
    setHintModalOpen(false);
    setHintCellKey('');
    setHintRowConstraint(null);
    setHintColConstraint(null);
  }, []);

  // Handle player selection - moved up to avoid temporal dead zone
  // Core selection logic with explicit cellKey
  const handleSelectPlayerForCell = useCallback((cellKey: string, player: Player, isFromHintModal: boolean = false) => {
    // Check if player already used
    if (usedPids.has(player.pid)) {
      toast({
        title: 'Player already used',
        description: 'This player has already been used in this grid.',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate eligibility
    const eligiblePids = intersections[cellKey] || [];
    const isCorrect = eligiblePids.includes(player.pid);
    
    // Compute rarity if correct
    let rarity = 0;
    let points = 0;
    if (isCorrect && leagueData) {
      const eligiblePlayers = leagueData.players.filter(p => eligiblePids.includes(p.pid));
      const eligiblePool = eligiblePlayers.map(p => playerToEligibleLite(p));
      const guessedPlayer = playerToEligibleLite(player);
      const puzzleSeed = `${rows.map(r => r.key).join('-')}_${cols.map(c => c.key).join('-')}`;
      
      // Get row and column constraints for cell context
      let rowConstraint: CatTeam | undefined;
      let colConstraint: CatTeam | undefined;
      
      if (cellKey.includes('|')) {
        // Traditional format: "rowKey|colKey"
        const [rowKey, colKey] = cellKey.split('|');
        rowConstraint = rows.find(r => r.key === rowKey);
        colConstraint = cols.find(c => c.key === colKey);
      } else {
        // Position-based format: "rowIndex-colIndex"
        const [rowIndexStr, colIndexStr] = cellKey.split('-');
        const rowIndex = parseInt(rowIndexStr, 10);
        const colIndex = parseInt(colIndexStr, 10);
        rowConstraint = rows[rowIndex];
        colConstraint = cols[colIndex];
      }
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
        teams: teamsMap,
        seasonIndex: leagueData.seasonIndex
      });
      points = rarity;
    }
    
    // Lock Help Mode after first guess
    if (!hintModeLocked) {
      setHintModeLocked(true);
    }

    // Check if this matches a hint suggestion
    const currentCell = cells[cellKey];
    const matchesHintSuggestion = currentCell?.hintSuggestedPlayer === player.pid;
    const usedHint = (isFromHintModal && isCorrect) || (matchesHintSuggestion && isCorrect);

    // Update cell state with locking and hint tracking
    setCells(prev => ({
      ...prev,
      [cellKey]: {
        name: player.name,
        correct: isCorrect,
        locked: true,
        guessed: true,
        player: player,
        rarity: isCorrect ? rarity : undefined,
        points: isCorrect ? points : undefined,
        hintSuggestedPlayer: currentCell?.hintSuggestedPlayer, // Preserve hint suggestion
        usedHint: usedHint,
      },
    }));
    
    // Add to used players (regardless of correctness to prevent reuse)
    setUsedPids(prev => new Set([...Array.from(prev), player.pid]));
  }, [intersections, usedPids, leagueData, rows, cols, toast, hintModeLocked]);

  // Handle search modal player selection
  const handleSelectPlayer = useCallback((player: Player) => {
    if (!currentCellKey) return;
    
    handleSelectPlayerForCell(currentCellKey, player, false);
    setCurrentCellKey(null);
    setSearchModalOpen(false);
  }, [currentCellKey, handleSelectPlayerForCell]);

  // Handle hint player selection (route through existing guess logic)
  const handleHintPlayerSelect = useCallback((player: Player, isFromHintModal: boolean) => {
    if (!hintCellKey) return;
    
    // Use explicit cellKey to avoid race conditions
    handleSelectPlayerForCell(hintCellKey, player, isFromHintModal);
    
    // Close hint modal after successful selection
    handleHintModalClose();
  }, [hintCellKey, handleSelectPlayerForCell, handleHintModalClose]);
  
  // Handle hint modal reshuffle
  const handleHintReshuffle = useCallback((cellKey: string) => {
    setReshuffleCounts(prev => ({
      ...prev,
      [cellKey]: (prev[cellKey] || 0) + 1
    }));
  }, []);

  // Handle hint generated - store suggested player in cell state
  const handleHintGenerated = useCallback((cellKey: string, suggestedPlayerPid: number) => {
    setCells(prev => ({
      ...prev,
      [cellKey]: {
        ...prev[cellKey],
        hintSuggestedPlayer: suggestedPlayerPid,
      },
    }));
  }, []);

  // Helper function to build and cache player rankings for a cell
  const buildRankCacheForCell = useCallback((cellKey: string): Array<{player: Player, rarity: number}> => {
    if (!leagueData || !rows.length || !cols.length) return [];
    
    let rowConstraint: CatTeam | undefined;
    let colConstraint: CatTeam | undefined;
    
    if (cellKey.includes('|')) {
      // Traditional format: "rowKey|colKey"
      const [rowKey, colKey] = cellKey.split('|');
      rowConstraint = rows.find(r => r.key === rowKey);
      colConstraint = cols.find(c => c.key === colKey);
    } else {
      // Position-based format: "rowIndex-colIndex"
      const [rowIndexStr, colIndexStr] = cellKey.split('-');
      const rowIndex = parseInt(rowIndexStr, 10);
      const colIndex = parseInt(colIndexStr, 10);
      rowConstraint = rows[rowIndex];
      colConstraint = cols[colIndex];
    }
    
    if (!rowConstraint || !colConstraint) return [];
    
    // Get eligible players for this cell using dynamic intersection calculation
    // Convert CatTeam constraints to IntersectionConstraint format
    const rowIntersectionConstraint: IntersectionConstraint = {
      type: rowConstraint.type,
      id: rowConstraint.type === 'team' ? rowConstraint.tid! : rowConstraint.achievementId!,
      label: rowConstraint.label
    };
    
    const colIntersectionConstraint: IntersectionConstraint = {
      type: colConstraint.type,
      id: colConstraint.type === 'team' ? colConstraint.tid! : colConstraint.achievementId!,
      label: colConstraint.label
    };
    
    // Use the same optimized intersection calculation as custom grid creation
    const eligiblePidsSet = calculateOptimizedIntersection(
      rowIntersectionConstraint,
      colIntersectionConstraint,
      leagueData.players,
      leagueData.teams,
      leagueData.seasonIndex,
      false // returnCount = false to get the Set of player IDs
    ) as Set<number>;
    
    const eligiblePids = Array.from(eligiblePidsSet);
    const eligiblePlayers = eligiblePids
      .map(pid => byPid[pid])
      .filter(player => player);
    
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
        teams: teamsMap,
        seasonIndex: leagueData.seasonIndex
      });
      
      return { player: p, rarity };
    });
    
    // Sort by rarity (most common first = lowest rarity score)
    playersWithRarity.sort((a, b) => a.rarity - b.rarity);
    
    return playersWithRarity;
  }, [leagueData, rows, cols, intersections, byPid]);

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

  // Create minimal test data for debugging
  const createTestData = useCallback((): LeagueData => {
    console.log('🔧 [DEBUG] Creating minimal test data for achievement debugging...');
    
    // Create mock players with achievements (add more for grid generation)
    const mockPlayers = [
      {
        pid: 1,
        name: "Test Player 1 (Both)",
        achievements: { career10kRebounds: true },
        awards: [{ type: "Assists Leader", season: 2020, tid: 1 }],
        teamsPlayed: new Set([1]),
        stats: [{ season: 2020, rebounds: 12000 }, { season: 2019, rebounds: 11000 }]
      },
      {
        pid: 2, 
        name: "Test Player 2 (Rebounds Only)",
        achievements: { career10kRebounds: true },
        awards: [],
        teamsPlayed: new Set([1]),
        stats: [{ season: 2020, rebounds: 15000 }, { season: 2018, rebounds: 14000 }]
      },
      {
        pid: 3,
        name: "Test Player 3 (Assists Only)", 
        achievements: { career10kRebounds: false },
        awards: [{ type: "Assists Leader", season: 2021, tid: 2 }],
        teamsPlayed: new Set([2]),
        stats: [{ season: 2021, rebounds: 5000 }, { season: 2020, rebounds: 4800 }]
      },
      {
        pid: 4,
        name: "Test Player 4 (Both Again)",
        achievements: { career10kRebounds: true },
        awards: [{ type: "Assists Leader", season: 2022, tid: 3 }],
        teamsPlayed: new Set([3]),
        stats: [{ season: 2022, rebounds: 11000 }]
      },
      {
        pid: 5,
        name: "Test Player 5 (Another Both)",
        achievements: { career10kRebounds: true },
        awards: [{ type: "Assists Leader", season: 2019, tid: 1 }],
        teamsPlayed: new Set([1, 2]),
        stats: [{ season: 2019, rebounds: 13000 }]
      },
      {
        pid: 6,
        name: "Test Player 6 (Rebounds Only)",
        achievements: { career10kRebounds: true },
        awards: [],
        teamsPlayed: new Set([4]),
        stats: [{ season: 2020, rebounds: 10500 }]
      },
      {
        pid: 7,
        name: "Test Player 7 (Assists Only)",
        achievements: { career10kRebounds: false },
        awards: [{ type: "Assists Leader", season: 2018, tid: 4 }],
        teamsPlayed: new Set([4]),
        stats: [{ season: 2018, rebounds: 4000 }]
      },
      {
        pid: 8,
        name: "Test Player 8 (Final Both)",
        achievements: { career10kRebounds: true },
        awards: [{ type: "Assists Leader", season: 2017, tid: 3 }],
        teamsPlayed: new Set([3]),
        stats: [{ season: 2017, rebounds: 10200 }]
      }
    ];
    
    // Create mock teams (need at least 3 for grid generation)
    const mockTeams = [
      { tid: 1, name: "Team A", region: "Test", abbrev: "TA", disabled: false },
      { tid: 2, name: "Team B", region: "Test", abbrev: "TB", disabled: false },
      { tid: 3, name: "Team C", region: "Test", abbrev: "TC", disabled: false },
      { tid: 4, name: "Team D", region: "Test", abbrev: "TD", disabled: false }
    ];
    
    // Create mock season index (with 20+ seasons to trigger new seeded builder)
    const mockSeasonIndex: any = {};
    for (let season = 2000; season <= 2022; season++) {
      mockSeasonIndex[season] = {
        1: { AssistsLeader: new Set() },
        2: { AssistsLeader: new Set() },
        3: { AssistsLeader: new Set() },
        4: { AssistsLeader: new Set() }
      };
    }
    
    // Add our specific assist leaders
    mockSeasonIndex[2017][3].AssistsLeader = new Set([8]);
    mockSeasonIndex[2018][4].AssistsLeader = new Set([7]);
    mockSeasonIndex[2019][1].AssistsLeader = new Set([5]);
    mockSeasonIndex[2020][1].AssistsLeader = new Set([1]);
    mockSeasonIndex[2021][2].AssistsLeader = new Set([3]);
    mockSeasonIndex[2022][3].AssistsLeader = new Set([4]);
    
    return {
      players: mockPlayers as any,
      teams: mockTeams as any,
      sport: 'basketball',
      seasonIndex: mockSeasonIndex
    };
  }, []);

  const loadTestData = useCallback(async () => {
    try {
      console.log('🔧 [DEBUG] Creating and processing minimal test data...');
      const data = createTestData();
      await processLeagueData(data);
    } catch (error) {
      console.error('Test data creation failed:', error);
    }
  }, [createTestData]);

  const processLeagueData = useCallback(async (data: LeagueData) => {
    setLeagueData(data);
    setHintModeLocked(false); // Reset Help Mode lock when new file is loaded
    
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
    
    // Direct intersection test (bypass grid generation)
    console.log('🎯 [DIRECT TEST] Testing the problematic intersection directly...');
    
    // Test each achievement individually
    let reboundsPlayers: Player[] = [];
    let assistsPlayers: Player[] = [];
    let intersectionPlayers: Player[] = [];
    
    console.log(`   Testing ${data.players.length} players...`);
    
    for (const player of data.players) {
      const hasRebounds = playerMeetsAchievement(player, 'career10kRebounds', data.seasonIndex);
      const hasAssists = playerMeetsAchievement(player, 'AssistsLeader', data.seasonIndex);
      
      if (hasRebounds) {
        reboundsPlayers.push(player);
      }
      
      if (hasAssists) {
        assistsPlayers.push(player);
      }
      
      if (hasRebounds && hasAssists) {
        intersectionPlayers.push(player);
      }
    }
    
    console.log(`📊 [DIRECT TEST] Results:`);
    console.log(`   Career 10k Rebounds: ${reboundsPlayers.length} players`);
    console.log(`     - Players: ${reboundsPlayers.map(p => p.name).join(', ')}`);
    
    console.log(`   Assists Leader: ${assistsPlayers.length} players`);
    console.log(`     - Players: ${assistsPlayers.map(p => p.name).join(', ')}`);
    
    console.log(`   🎯 INTERSECTION: ${intersectionPlayers.length} players`);
    if (intersectionPlayers.length > 0) {
      console.log(`     - These are the players that should appear in the intersection!`);
      console.log(`     - Players: ${intersectionPlayers.map(p => p.name).join(', ')}`);
    } else {
      console.log(`     - ❌ NO INTERSECTION! This is the bug we need to fix.`);
    }
    
    // Test the intersection calculation function directly
    console.log(`🔧 [INTERSECTION FUNCTION TEST] Using calculateCustomCellIntersection...`);
    const testIntersection = calculateCustomCellIntersection(
      { type: 'achievement', selectedId: 'career10kRebounds', selectedLabel: '10,000+ Career Rebounds' },
      { type: 'achievement', selectedId: 'AssistsLeader', selectedLabel: 'League Assists Leader' },
      data.players,
      data.teams,
      data.seasonIndex
    );
    console.log(`   Function result: ${testIntersection} players`);
    
    // Debug individual achievements first to understand the data
    console.log('🐛 [DEBUG] Testing individual achievements first...');
    debugIndividualAchievements(data.players, data.seasonIndex);
    
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
    if (!leagueData) return;
    
    setIsGenerating(true);
    
    try {
      const gridResult = generateTeamsGrid(leagueData);
      setRows(gridResult.rows);
      setCols(gridResult.cols);
      setIntersections(gridResult.intersections);
      setCells({}); // Reset all answers
      setUsedPids(new Set()); // Reset used players
      setRankCache({}); // Reset cached rankings for the old grid
      setGiveUpPressed(false); // Reset Give Up state
      clearHintCache(); // Clear hint cache for new grid
      setReshuffleCounts({}); // Reset reshuffle counts for new grid
      setHintModeLocked(false); // Reset Help Mode lock for new grid
      
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
      
      // Generate intersections for the new grid using position-based keys
      const newIntersections: Record<string, number[]> = {};
      
      for (let rowIndex = 0; rowIndex < importedRows.length; rowIndex++) {
        for (let colIndex = 0; colIndex < importedCols.length; colIndex++) {
          const key = `${rowIndex}-${colIndex}`;
          const row = importedRows[rowIndex];
          const col = importedCols[colIndex];
          
          if (row && col) {
            const eligible = leagueData.players.filter(p => row.test(p) && col.test(p));
            newIntersections[key] = eligible.map(p => p.pid);
          }
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

  const handleCellClick = useCallback((positionalKey: string) => {
    const cellState = cells[positionalKey];
    
    // If cell is locked and has a player, open player modal
    if (cellState?.locked && cellState?.player) {
      setModalPlayer(cellState.player);
      
      // Get eligible players for this cell using dynamic intersection calculation
      let eligiblePlayers: Player[] = [];
      if (leagueData && rows.length && cols.length) {
        let rowConstraint: CatTeam | undefined;
        let colConstraint: CatTeam | undefined;
        
        if (positionalKey.includes('|')) {
          // Traditional format: "rowKey|colKey"
          const [rowKey, colKey] = positionalKey.split('|');
          rowConstraint = rows.find(r => r.key === rowKey);
          colConstraint = cols.find(c => c.key === colKey);
        } else {
          // Position-based format: "rowIndex-colIndex"
          const [rowIndexStr, colIndexStr] = positionalKey.split('-');
          const rowIndex = parseInt(rowIndexStr, 10);
          const colIndex = parseInt(colIndexStr, 10);
          rowConstraint = rows[rowIndex];
          colConstraint = cols[colIndex];
        }
        
        if (rowConstraint && colConstraint) {
          // Convert CatTeam constraints to IntersectionConstraint format
          const rowIntersectionConstraint: IntersectionConstraint = {
            type: rowConstraint.type,
            id: rowConstraint.type === 'team' ? rowConstraint.tid! : rowConstraint.achievementId!,
            label: rowConstraint.label
          };
          
          const colIntersectionConstraint: IntersectionConstraint = {
            type: colConstraint.type,
            id: colConstraint.type === 'team' ? colConstraint.tid! : colConstraint.achievementId!,
            label: colConstraint.label
          };
          
          // Use optimized intersection calculation to get eligible players
          const eligiblePidsSet = calculateOptimizedIntersection(
            rowIntersectionConstraint,
            colIntersectionConstraint,
            leagueData.players,
            leagueData.teams,
            leagueData.seasonIndex,
            false // returnCount = false to get the Set of player IDs
          ) as Set<number>;
          
          const eligiblePids = Array.from(eligiblePidsSet);
          eligiblePlayers = eligiblePids
            .map(pid => byPid[pid])
            .filter(player => player);
        }
      }
      setModalEligiblePlayers(eligiblePlayers);
      
      // Set puzzle seed for consistent rarity calculations
      const puzzleSeed = `${rows.map(r => r.key).join('-')}_${cols.map(c => c.key).join('-')}`;
      setModalPuzzleSeed(puzzleSeed);
      
      // Set the cell key for feedback generation
      setModalCellKey(positionalKey);
      
      setPlayerModalOpen(true);
      return;
    }
    
    // If cell is locked but no player, do nothing
    if (cellState?.locked) {
      return;
    }
    
    // Route to search modal or hint modal based on hint mode
    if (hintMode) {
      // Get constraints for this cell
      const [rowIndexStr, colIndexStr] = positionalKey.split('-');
      const rowIndex = parseInt(rowIndexStr, 10);
      const colIndex = parseInt(colIndexStr, 10);
      const rowConstraint = rows[rowIndex];
      const colConstraint = cols[colIndex];
      
      if (rowConstraint && colConstraint) {
        // Check if there are eligible players for this cell
        const eligiblePids = intersections[positionalKey] || [];
        if (eligiblePids.length === 0) {
          toast({
            title: 'No eligible players for this square.',
            variant: 'destructive',
          });
          return;
        }
        
        // Lock Help Mode when hint modal is opened
        if (!hintModeLocked) {
          setHintModeLocked(true);
        }
        
        // Open hint modal
        setHintCellKey(positionalKey);
        setHintRowConstraint(rowConstraint);
        setHintColConstraint(colConstraint);
        setHintModalOpen(true);
      }
    } else {
      // Open search modal (existing behavior)
      setCurrentCellKey(positionalKey);
      setSearchModalOpen(true);
    }
  }, [cells, rows, cols, intersections, leagueData, hintMode, toast, hintModeLocked]);


  const getCurrentCellDescription = () => {
    if (!currentCellKey || !rows || !cols) return '';
    
    let row: CatTeam | undefined;
    let col: CatTeam | undefined;
    
    if (currentCellKey.includes('|')) {
      // Traditional format: "rowKey|colKey"
      const [rowKey, colKey] = currentCellKey.split('|');
      row = rows.find(r => r.key === rowKey);
      col = cols.find(c => c.key === colKey);
    } else {
      // Position-based format: "rowIndex-colIndex"
      const [rowIndexStr, colIndexStr] = currentCellKey.split('-');
      const rowIndex = parseInt(rowIndexStr, 10);
      const colIndex = parseInt(colIndexStr, 10);
      row = rows[rowIndex];
      col = cols[colIndex];
    }
    
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

  // Handle Give Up - fill each cell with the most common answer (rank #1)
  const handleGiveUp = useCallback(() => {
    if (!leagueData) return;
    
    // Find all empty cells using position-based keys
    const emptyCells: string[] = [];
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      for (let colIndex = 0; colIndex < cols.length; colIndex++) {
        const key = `${rowIndex}-${colIndex}`;
        if (!cells[key]?.name) {
          emptyCells.push(key);
        }
      }
    }
    
    if (emptyCells.length === 0) return;
    
    const newCells = { ...cells };
    const newRankCache = { ...rankCache };
    
    // Build rankings for all empty cells
    const cellRankings: Record<string, Array<{player: Player, rarity: number}>> = {};
    for (const cellKey of emptyCells) {
      let ranking = newRankCache[cellKey];
      if (!ranking) {
        ranking = buildRankCacheForCell(cellKey);
        newRankCache[cellKey] = ranking;
      }
      cellRankings[cellKey] = ranking;
    }
    
    // Detect collisions: find players who are rank #1 for multiple cells
    const playerToCells: Record<number, string[]> = {};
    for (const cellKey of emptyCells) {
      const ranking = cellRankings[cellKey];
      if (ranking.length > 0) {
        const topPlayer = ranking[0].player;
        if (!playerToCells[topPlayer.pid]) {
          playerToCells[topPlayer.pid] = [];
        }
        playerToCells[topPlayer.pid].push(cellKey);
      }
    }
    
    // Check for players already used in the entire grid (including existing cells)
    const gridUsedPids = new Set<number>();
    Object.values(cells).forEach(cell => {
      if (cell.player?.pid) {
        gridUsedPids.add(cell.player.pid);
      }
    });
    
    // Determine which rank to use for each cell (collision resolution)
    const cellToRank: Record<string, number> = {};
    
    for (const [pidStr, cellsForPlayer] of Object.entries(playerToCells)) {
      if (cellsForPlayer.length === 1) {
        // No collision, use rank #1
        cellToRank[cellsForPlayer[0]] = 0;
      } else {
        // Collision detected - use rank #1, #2, #3, etc. for different cells
        cellsForPlayer.forEach((cellKey, index) => {
          cellToRank[cellKey] = index; // 0 = rank #1, 1 = rank #2, etc.
        });
      }
    }
    
    // Fill cells with the determined ranks
    for (const cellKey of emptyCells) {
      const ranking = cellRankings[cellKey];
      
      if (ranking.length === 0) {
        // No eligible players
        newCells[cellKey] = {
          name: '—',
          correct: false,
          locked: true,
          autoFilled: true,
          guessed: false,
        };
        console.log(`🔍 Give Up: ${cellKey} -> "—" (no eligible players)`);
        continue;
      }
      
      // Get the rank to use for this cell (with collision detection)
      let rankToUse = cellToRank[cellKey] || 0;
      
      // Find the first available player not already used in the entire grid
      let selectedRanked = null;
      let actualRank = rankToUse;
      
      while (actualRank < ranking.length) {
        const candidate = ranking[actualRank];
        if (!gridUsedPids.has(candidate.player.pid)) {
          selectedRanked = candidate;
          break;
        }
        actualRank++;
      }
      
      if (!selectedRanked) {
        // No available players (all already used in grid)
        newCells[cellKey] = {
          name: '—',
          correct: false,
          locked: true,
          autoFilled: true,
          guessed: false,
          points: 0, // No points for Give Up
        };
        console.log(`🔍 Give Up: ${cellKey} -> "—" (all players already used in grid)`);
      } else {
        // Use the selected player
        newCells[cellKey] = {
          name: selectedRanked.player.name,
          correct: true,
          locked: true,
          autoFilled: true,
          guessed: false,
          player: selectedRanked.player,
          rarity: selectedRanked.rarity,
          points: 0, // No points for Give Up
        };
        
        // Add to used set for subsequent cells
        gridUsedPids.add(selectedRanked.player.pid);
        console.log(`🔍 Give Up: ${cellKey} -> ${selectedRanked.player.name} (rank #${actualRank + 1}, rarity ${selectedRanked.rarity})`);
      }
    }
    
    // Update state
    setCells(newCells);
    setRankCache(newRankCache);
    setGiveUpPressed(true); // Mark Give Up as pressed
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
    setGiveUpPressed(false); // Reset Give Up state
    setReshuffleCounts({}); // Reset reshuffle counts for retry
    setHintModeLocked(false); // Reset Help Mode lock for retry
    
    // Keep the same rows, cols, and intersections (same puzzle)
  }, [currentGridId, attemptCount]);

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
          onCreateCustomGrid={() => setCustomGridModalOpen(true)}
          isGenerating={isGenerating}
          giveUpPressed={giveUpPressed}
          teams={leagueData?.teams || []}
          sport={leagueData?.sport}
          attemptCount={attemptCount}
          getOrdinalLabel={getOrdinalLabel}
          hintMode={hintMode}
          onHintModeChange={handleHintModeChange}
          hintModeLocked={hintModeLocked}
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
        
        <HintModal
          open={hintModalOpen}
          onClose={handleHintModalClose}
          onSelectPlayer={handleHintPlayerSelect}
          cellKey={hintCellKey}
          rowConstraint={hintRowConstraint!}
          colConstraint={hintColConstraint!}
          eligiblePlayerIds={intersections[hintCellKey] || []}
          allPlayers={leagueData?.players || []}
          byPid={byPid}
          teams={leagueData?.teams || []}
          usedPids={usedPids}
          gridId={currentGridId}
          leagueData={leagueData}
          reshuffleCount={reshuffleCounts[hintCellKey] || 0}
          onReshuffle={handleHintReshuffle}
          onHintGenerated={handleHintGenerated}
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
          isGridCompleted={(() => {
            // Check if all cells have been filled (either guessed or auto-filled)
            const allCellKeys = rows.flatMap((row, rowIndex) => 
              cols.map((col, colIndex) => `${rowIndex}-${colIndex}`)
            );
            return allCellKeys.every(key => cells[key]?.name);
          })()}
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
          onPlayGrid={(customRows, customCols) => {
            if (!leagueData) return;
            
            // Replace current grid with custom grid
            setRows(customRows);
            setCols(customCols);
            // Reset game state for new custom grid
            setCells({});
            setUsedPids(new Set());
            setRankCache({});
            
            // Calculate intersections for custom grid using position-based keys
            const newIntersections: Record<string, number[]> = {};
            
            for (let rowIndex = 0; rowIndex < customRows.length; rowIndex++) {
              for (let colIndex = 0; colIndex < customCols.length; colIndex++) {
                const key = `${rowIndex}-${colIndex}`;
              
              const row = customRows[rowIndex];
              const col = customCols[colIndex];
              
              if (row && col) {
                // Use the same season-aware intersection logic as the modal preview
                const rowConfig = {
                  type: row.type,
                  selectedId: row.type === 'team' ? row.tid : row.achievementId,
                  selectedLabel: row.label
                };
                
                const colConfig = {
                  type: col.type, 
                  selectedId: col.type === 'team' ? col.tid : col.achievementId,
                  selectedLabel: col.label
                };
                
                // Get eligible players using exact same logic as calculateCustomCellIntersection
                const rowIsSeasonAchievement = row.type === 'achievement' && 
                  SEASON_ACHIEVEMENTS.some(sa => sa.id === row.achievementId);
                const colIsSeasonAchievement = col.type === 'achievement' && 
                  SEASON_ACHIEVEMENTS.some(sa => sa.id === col.achievementId);
                
                let eligiblePlayers: Player[] = [];
                
                if (rowIsSeasonAchievement && col.type === 'team' && leagueData.seasonIndex) {
                  // Season achievement × team - use season-aware logic
                  const eligiblePids = getSeasonEligiblePlayers(leagueData.seasonIndex, col.tid!, row.achievementId as any);
                  eligiblePlayers = leagueData.players.filter(p => eligiblePids.has(p.pid));
                } else if (colIsSeasonAchievement && row.type === 'team' && leagueData.seasonIndex) {
                  // Team × season achievement - use season-aware logic  
                  const eligiblePids = getSeasonEligiblePlayers(leagueData.seasonIndex, row.tid!, col.achievementId as any);
                  eligiblePlayers = leagueData.players.filter(p => eligiblePids.has(p.pid));
                } else {
                  // Use standard logic for career achievements and team×team
                  eligiblePlayers = leagueData.players.filter(p => row.test(p) && col.test(p));
                }
                
                newIntersections[key] = eligiblePlayers.map(p => p.pid);
              }
              }
            }
            
            setIntersections(newIntersections);
            // Close modal
            setCustomGridModalOpen(false);
          }}
          leagueData={leagueData}
        />
      </main>
    </div>
  );
}
