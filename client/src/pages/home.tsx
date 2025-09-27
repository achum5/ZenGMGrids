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
import { debugAchievementIntersection, calculateCustomCellIntersection, headerConfigToCatTeam, getCustomCellEligiblePlayersAsync } from '@/lib/custom-grid-utils';
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
  const [isLoadingCustomIntersection, setIsLoadingCustomIntersection] = useState(false);
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
  
  
  // Hint modal state
  const [hintModalOpen, setHintModalOpen] = useState(false);
  const [hintCellKey, setHintCellKey] = useState<string>('');
  const [hintRowConstraint, setHintRowConstraint] = useState<CatTeam | null>(null);
  const [hintColConstraint, setHintColConstraint] = useState<CatTeam | null>(null);
  
  // Reshuffle count tracking per cell
  const [reshuffleCounts, setReshuffleCounts] = useState<Record<string, number>>({});

  // Handle hint mode toggle
  const handleHintModeChange = useCallback((enabled: boolean) => {
    setHintMode(enabled);
  }, []);

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
    
    // Validate eligibility using EXACT SAME LOGIC as eligible players list
    let isCorrect = false;
    
    // Get row and column constraints
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
    
    if (rowConstraint && colConstraint) {
      // Use EXACT SAME LOGIC as eligible players list in handleCellClick
      const hasCustomAchievements = rowConstraint.key.includes('custom') || colConstraint.key.includes('custom');
      
      if (hasCustomAchievements) {
        // Direct test function evaluation (same as eligible players list)
        isCorrect = rowConstraint.test(player) && colConstraint.test(player);
        console.log(`🔧 [GRID VALIDATION] Custom achievements - Player ${player.name}: ${isCorrect}`);
      } else {
        // Use pre-calculated intersections for regular achievements
        const eligiblePids = intersections[cellKey] || [];
        isCorrect = eligiblePids.includes(player.pid);
        console.log(`🔧 [GRID VALIDATION] Regular achievements - Player ${player.name}: ${isCorrect}`);
      }
    } else {
      // Fallback to pre-calculated intersections if constraints not found
      const eligiblePids = intersections[cellKey] || [];
      isCorrect = eligiblePids.includes(player.pid);
    }
    
    // Compute rarity if correct
    let rarity = 0;
    let points = 0;
    if (isCorrect && leagueData && rowConstraint && colConstraint) {
      // Get eligible players using EXACT SAME LOGIC as eligible players list
      let eligiblePlayers: Player[];
      
      const hasCustomAchievements = rowConstraint.key.includes('custom') || colConstraint.key.includes('custom');
      
      if (hasCustomAchievements) {
        // Direct test function evaluation (same as eligible players list)
        eligiblePlayers = leagueData.players.filter(player => 
          rowConstraint.test(player) && colConstraint.test(player)
        );
      } else {
        // Use pre-calculated intersections for regular achievements
        const eligiblePids = intersections[cellKey] || [];
        eligiblePlayers = leagueData.players.filter(p => eligiblePids.includes(p.pid));
      }
      
      const eligiblePool = eligiblePlayers.map(p => playerToEligibleLite(p));
      const guessedPlayer = playerToEligibleLite(player);
      const puzzleSeed = `${rows.map(r => r.key).join('-')}_${cols.map(c => c.key).join('-')}`;
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
    

    // Check if this matches a hint suggestion
    const currentCell = cells[cellKey];
    const matchesHintSuggestion = currentCell?.hintSuggestedPlayer === player.pid;
    const usedHint = (isFromHintModal && isCorrect) || (matchesHintSuggestion && isCorrect);
    
    
    // Check if this matches a hint suggestion and set usedHint accordingly

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
  }, [intersections, usedPids, leagueData, rows, cols, toast]);

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
    setCells(prev => {
      return {
        ...prev,
        [cellKey]: {
          // Ensure we have a base cell structure, even if the cell didn't exist before
          name: prev[cellKey]?.name || '',
          correct: prev[cellKey]?.correct,
          locked: prev[cellKey]?.locked || false,
          guessed: prev[cellKey]?.guessed || false,
          player: prev[cellKey]?.player,
          rarity: prev[cellKey]?.rarity,
          points: prev[cellKey]?.points,
          autoFilled: prev[cellKey]?.autoFilled,
          usedHint: prev[cellKey]?.usedHint,
          // Store the hint suggestion
          hintSuggestedPlayer: suggestedPlayerPid,
        },
      };
    });
  }, [byPid]);

  // Helper function to build and cache player rankings for a cell
  const buildRankCacheForCell = useCallback((cellKey: string): Array<{player: Player, rarity: number}> => {
    if (!leagueData || !rows.length || !cols.length) return [];
    
    console.log(`🔧 [RANK CACHE] Building for cell ${cellKey}`);
    
    // Determine row and column constraints
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
    
    // Get eligible players using EXACT SAME LOGIC as eligible players list in handleCellClick
    let eligiblePlayers: Player[];
    
    if (intersections && intersections[cellKey]) {
      // Use pre-calculated intersection data for custom grids
      const eligiblePids = intersections[cellKey];
      eligiblePlayers = eligiblePids
        .map(pid => byPid[pid])
        .filter(player => player);
      console.log(`🔧 [RANK CACHE] Using stored intersection data: ${eligiblePlayers.length} players`);
    } else {
      console.log(`🔧 [RANK CACHE] No stored data, calculating using eligible players logic`);
      
      // Use EXACT SAME LOGIC as eligible players list in handleCellClick
      const hasCustomAchievements = rowConstraint.key.includes('custom') || colConstraint.key.includes('custom');
      
      if (hasCustomAchievements) {
        // Direct test function evaluation (same as eligible players list)
        eligiblePlayers = leagueData.players.filter(player => 
          rowConstraint.test(player) && colConstraint.test(player)
        );
        console.log(`🔧 [RANK CACHE] Custom achievements calculation found: ${eligiblePlayers.length} players`);
      } else {
        // Use optimized intersection calculation for regular achievements
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
        console.log(`🔧 [RANK CACHE] Standard calculation found: ${eligiblePlayers.length} players`);
      }
    }
    
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
    
    // Keep retrying until successful - no error popup
    let attempt = 0;
    const MAX_AUTO_RETRIES = 50; // Prevent infinite loops, but this should rarely be reached
    let gridResult;
    
    while (attempt < MAX_AUTO_RETRIES) {
      try {
        gridResult = generateTeamsGrid(leagueData);
        break; // Success! Exit the retry loop
      } catch (error) {
        attempt++;
        console.log(`Grid generation attempt ${attempt} failed, retrying...`);
        
        // Only show error if we've exhausted all retries (should be very rare)
        if (attempt >= MAX_AUTO_RETRIES) {
          console.error('Error generating grid after maximum retries:', error);
          toast({
            title: 'Unable to generate grid',
            description: 'Please try again or try a different league file.',
            variant: 'destructive',
          });
          setIsGenerating(false);
          return;
        }
      }
    }
    
    // Apply the successful grid result
    if (gridResult) {
      setRows(gridResult.rows);
      setCols(gridResult.cols);
      setIntersections(gridResult.intersections);
      setCells({}); // Reset all answers
      setUsedPids(new Set()); // Reset used players
      setRankCache({}); // Reset cached rankings for the old grid
      setGiveUpPressed(false); // Reset Give Up state
      clearHintCache(); // Clear hint cache for new grid
      setReshuffleCounts({}); // Reset reshuffle counts for new grid
      
      // Initialize new grid tracking
      const gridId = `${gridResult.rows.map(r => r.key).join('-')}_${gridResult.cols.map(c => c.key).join('-')}`;
      setCurrentGridId(gridId);
      
      // Reset attempt count for new grid
      setAttemptCount(1);
      storeAttemptCount(gridId, 1);
    }
    
    setIsGenerating(false);
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

  const handleCellClick = useCallback(async (positionalKey: string) => {
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
          // Check if we have custom achievements by examining the constraint keys
          const hasCustomAchievements = rowConstraint.key.includes('custom') || colConstraint.key.includes('custom');
          
          if (hasCustomAchievements) {
            console.log(`🔧 [ASYNC] Using async calculation for custom intersection`);
            setIsLoadingCustomIntersection(true);
            
            try {
              // Convert CatTeam constraints to HeaderConfig format for async function
              const rowConfig = {
                type: rowConstraint.type,
                selectedId: (rowConstraint.type === 'team' ? rowConstraint.tid : rowConstraint.achievementId) || null,
                selectedLabel: rowConstraint.label,
                customAchievement: rowConstraint.key.includes('custom') ? rowConstraint : undefined
              };
              
              const colConfig = {
                type: colConstraint.type,
                selectedId: (colConstraint.type === 'team' ? colConstraint.tid : colConstraint.achievementId) || null,
                selectedLabel: colConstraint.label,
                customAchievement: colConstraint.key.includes('custom') ? colConstraint : undefined
              };
              
              // Use async calculation to prevent UI blocking
              eligiblePlayers = await getCustomCellEligiblePlayersAsync(
                rowConfig,
                colConfig,
                leagueData.players,
                leagueData.teams,
                leagueData.seasonIndex
              );
              console.log(`🔧 [ASYNC] Completed async calculation: ${eligiblePlayers.length} players`);
              
            } catch (error) {
              console.error('Error in async intersection calculation:', error);
              // Fallback to synchronous calculation as last resort
              eligiblePlayers = leagueData.players.filter(player => 
                rowConstraint!.test(player) && colConstraint!.test(player)
              );
            } finally {
              setIsLoadingCustomIntersection(false);
            }
          } else {
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
        // Use same logic as player modal to handle custom achievements properly
        const hasCustomAchievements = rowConstraint.key.includes('custom') || colConstraint.key.includes('custom');
        let eligiblePidsCount = 0;
        
        if (hasCustomAchievements) {
          console.log(`🔧 [ASYNC HINT] Using async calculation for hint modal custom intersection`);
          setIsLoadingCustomIntersection(true);
          
          try {
            // Convert CatTeam constraints to HeaderConfig format for async function
            const rowConfig = {
              type: rowConstraint.type,
              selectedId: (rowConstraint.type === 'team' ? rowConstraint.tid : rowConstraint.achievementId) || null,
              selectedLabel: rowConstraint.label,
              customAchievement: rowConstraint.key.includes('custom') ? rowConstraint : undefined
            };
            
            const colConfig = {
              type: colConstraint.type,
              selectedId: (colConstraint.type === 'team' ? colConstraint.tid : colConstraint.achievementId) || null,
              selectedLabel: colConstraint.label,
              customAchievement: colConstraint.key.includes('custom') ? colConstraint : undefined
            };
            
            // Use async calculation to prevent UI blocking
            const eligiblePlayers = await getCustomCellEligiblePlayersAsync(
              rowConfig,
              colConfig,
              leagueData?.players || [],
              leagueData?.teams || [],
              leagueData?.seasonIndex
            );
            eligiblePidsCount = eligiblePlayers.length;
            console.log(`🔧 [ASYNC HINT] Completed async calculation: ${eligiblePidsCount} players`);
            
          } catch (error) {
            console.error('Error in async hint intersection calculation:', error);
            // Fallback to synchronous calculation as last resort
            const eligiblePlayers = leagueData?.players?.filter(player => 
              rowConstraint.test(player) && colConstraint.test(player)
            ) || [];
            eligiblePidsCount = eligiblePlayers.length;
          } finally {
            setIsLoadingCustomIntersection(false);
          }
        } else {
          // Use optimized intersection calculation for regular achievements
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
          
          eligiblePidsCount = calculateOptimizedIntersection(
            rowIntersectionConstraint,
            colIntersectionConstraint,
            leagueData?.players || [],
            leagueData?.teams || [],
            leagueData?.seasonIndex,
            true // Return count
          ) as number;
        }
        
        if (eligiblePidsCount === 0) {
          toast({
            title: 'No eligible players for this square.',
            variant: 'destructive',
          });
          return;
        }
        
        
        // DEBUG: Check intersection availability before opening hint modal
        const availablePlayerIds = intersections[positionalKey] || [];
        const rowId = rowConstraint.type === 'team' ? rowConstraint.tid : rowConstraint.achievementId;
        const colId = colConstraint.type === 'team' ? colConstraint.tid : colConstraint.achievementId;
        console.log(`🐛 [HINT MODAL DEBUG] Cell ${positionalKey}:`);
        console.log(`   Row: ${rowConstraint.label} (${rowId})`);
        console.log(`   Col: ${colConstraint.label} (${colId})`);
        console.log(`   Available players: ${availablePlayerIds.length}`);
        console.log(`   Intersection keys available:`, Object.keys(intersections));
        
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
  }, [cells, rows, cols, intersections, leagueData, hintMode, toast]);


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
    
    // Find all empty cells
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
    const usedInGiveUp = new Set<number>();

    // Track players already used in existing cells
    Object.values(cells).forEach(cell => {
      if (cell.player?.pid) {
        usedInGiveUp.add(cell.player.pid);
      }
    });
    
    // Fill each empty cell by simulating handleCellClick to get EXACT SAME eligible list
    for (const positionalKey of emptyCells) {
      // Simulate handleCellClick to get the exact eligible players list that appears in modal
      console.log(`🔧 [GIVE UP SIMULATE] Simulating handleCellClick for ${positionalKey}`);
      
      // Create a temporary locked cell to trigger player modal logic
      const tempCell = { locked: true, player: { pid: -1, name: 'temp' } };
      
      // Call handleCellClick internally to populate modalEligiblePlayers
      let eligiblePlayers: Player[] = [];
      
      if (leagueData && rows.length && cols.length) {
        let rowConstraint: CatTeam | undefined;
        let colConstraint: CatTeam | undefined;
        
        if (positionalKey.includes('|')) {
          const [rowKey, colKey] = positionalKey.split('|');
          rowConstraint = rows.find(r => r.key === rowKey);
          colConstraint = cols.find(c => c.key === colKey);
        } else {
          const [rowIndexStr, colIndexStr] = positionalKey.split('-');
          const rowIndex = parseInt(rowIndexStr, 10);
          const colIndex = parseInt(colIndexStr, 10);
          rowConstraint = rows[rowIndex];
          colConstraint = cols[colIndex];
        }
        
        if (rowConstraint && colConstraint) {
          // EXACT SAME LOGIC as handleCellClick lines 834-870
          const hasCustomAchievements = rowConstraint.key.includes('custom') || colConstraint.key.includes('custom');
          
          if (hasCustomAchievements) {
            // Use direct calculation for custom achievements to avoid cache conflicts
            eligiblePlayers = leagueData.players.filter(player => 
              rowConstraint!.test(player) && colConstraint!.test(player)
            );
            console.log(`🔧 [GIVE UP SIMULATE] Custom achievements - ${eligiblePlayers.length} eligible players`);
          } else {
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
            console.log(`🔧 [GIVE UP SIMULATE] Regular achievements - ${eligiblePlayers.length} eligible players`);
          }
        }
      }
      
      if (eligiblePlayers.length === 0) {
        newCells[positionalKey] = {
          name: '—',
          correct: false,
          locked: true,
          autoFilled: true,
          guessed: false,
        };
        console.log(`🔍 Give Up: ${positionalKey} -> "—" (no eligible players)`);
        continue;
      }
      
      // Apply EXACT SAME rarity sorting as PlayerModal (lines 539-595)
      const eligiblePool = eligiblePlayers.map(p => playerToEligibleLite(p));
      const puzzleSeed = `${rows.map(r => r.key).join('-')}_${cols.map(c => c.key).join('-')}`;
      
      const playersWithRarity = eligiblePlayers.map(p => {
        const guessedPlayer = playerToEligibleLite(p);
        const rarity = computeRarityForGuess({
          guessed: guessedPlayer,
          eligiblePool: eligiblePool,
          puzzleSeed: puzzleSeed,
          fullPlayers: eligiblePlayers,
          teams: new Map(leagueData.teams.map(t => [t.tid, t])),
          seasonIndex: leagueData.seasonIndex
        });
        return { player: p, rarity };
      });
      
      // Sort by rarity (ascending = most common first, SAME AS PLAYERMODAL)  
      playersWithRarity.sort((a, b) => a.rarity - b.rarity);
      
      // DEBUG: Show first 5 players AFTER rarity sorting (should match modal)
      console.log(`🔧 [GIVE UP RARITY SORTED] ${positionalKey} - First 5 players (modal rarity order):`, 
        playersWithRarity.slice(0, 5).map((p, i) => `${i+1}. ${p.player.name} (rarity: ${p.rarity})`));
      
      // Find first available player from rarity-sorted list (should match PlayerModal #1)
      let selectedPlayer: Player | null = null;
      for (const { player } of playersWithRarity) {
        if (!usedInGiveUp.has(player.pid)) {
          selectedPlayer = player;
          break;
        }
      }
      
      if (!selectedPlayer) {
        // No available players (all already used)
        newCells[positionalKey] = {
          name: '—',
          correct: false,
          locked: true,
          autoFilled: true,
          guessed: false,
        };
        console.log(`🔍 Give Up: ${positionalKey} -> "—" (all players already used)`);
      } else {
        // Use the first available player from eligible list (natural order)
        newCells[positionalKey] = {
          name: selectedPlayer.name,
          correct: true,
          locked: true,
          autoFilled: true,
          guessed: false,
          player: selectedPlayer,
          points: 0, // No points for Give Up
        };
        
        // Mark as used for next cells
        usedInGiveUp.add(selectedPlayer.pid);
        const positionInList = eligiblePlayers.findIndex(p => p.pid === selectedPlayer.pid) + 1;
        console.log(`🔍 Give Up: ${positionalKey} -> ${selectedPlayer.name} (position #${positionInList} in eligible list)`);
      }
    }
    
    // Update state
    setCells(newCells);
    setGiveUpPressed(true);
  }, [leagueData, rows, cols, cells, byPid]);

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
            
            // Reset game state for the new custom grid
            setCells({});
            setUsedPids(new Set());
            setRankCache({});
            setGiveUpPressed(false); // Reset the "finished" state
            
            // Calculate intersections directly from the test functions provided by the modal
            const newIntersections: Record<string, number[]> = {};
            for (let rowIndex = 0; rowIndex < customRows.length; rowIndex++) {
              for (let colIndex = 0; colIndex < customCols.length; colIndex++) {
                const key = `${rowIndex}-${colIndex}`;
                const rowConstraint = customRows[rowIndex];
                const colConstraint = customCols[colIndex];
                
                const eligiblePlayers = leagueData.players.filter(p => 
                  rowConstraint.test(p) && colConstraint.test(p)
                );
                
                newIntersections[key] = eligiblePlayers.map(p => p.pid);
              }
            }
            
            setIntersections(newIntersections);
            
            // Close the modal
            setCustomGridModalOpen(false);
          }}
          leagueData={leagueData}
          rows={rows}
          cols={cols}
        />
      </main>
    </div>
  );
}
