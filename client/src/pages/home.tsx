import { useState, useCallback, useEffect, useRef } from 'react';
import { UploadSection } from '@/components/upload-section';
import { GridSection } from '@/components/grid-section';
import { PlayerSearchModal } from '@/components/player-search-modal';
import { PlayerPageModal } from '@/components/PlayerPageModal';
import { TeamInfoModal } from '@/components/TeamInfoModal';
import { HintModal } from '@/components/HintModal';
import { AccentLine } from '@/components/AccentLine';
import { RulesModal } from '@/components/RulesModal';
import { GridSharingModal } from '@/components/grid-sharing-modal';
import { CustomGridModal } from '@/components/custom-grid-modal';
import { SavedLeagues } from '@/components/SavedLeagues';
import ChooseGameMode from '@/pages/choose-game-mode';
import TeamTrivia from '@/pages/team-trivia';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Home as HomeIcon, ArrowLeft, History } from 'lucide-react';
import { GridHistoryModal } from '@/components/GridHistoryModal';
import { loadGridHistory, saveGridToHistory, deleteLeagueGridHistory, deleteLeagueGridHistoryBelowThreshold, migrateGridsFromLocalStorage, type GridHistoryEntry } from '@/lib/grid-history-idb';
import { saveLeague, updateLastPlayed, type StoredLeague } from '@/lib/league-storage';
// Import sport icon images  
import zengmGridsLogo from '@/assets/zengm-grids-logo-mark.png';
import basketballIcon from '@/assets/zengm-grids-logo-basketball.png';
import footballIcon from '@/assets/zengm-grids-logo-football.png';
import hockeyIcon from '@/assets/zengm-grids-logo-hockey.png';
import baseballIcon from '@/assets/zengm-grids-logo-baseball.png';
import { parseLeagueFile, parseLeagueUrl, buildSearchIndex, type ParsingMethod } from '@/lib/bbgm-parser';
import { getStoredParsingMethod, storeParsingMethod, getRecommendedMethod, type ParsingMethod as ParsingMethodType } from '@/lib/mobile-detection';
import { generateTeamsGrid, cellKey } from '@/lib/grid-generator';
import { computeRarityForGuess, playerToEligibleLite } from '@/lib/rarity';
import { calculateCustomCellIntersection, headerConfigToCatTeam, getCustomCellEligiblePlayersAsync } from '@/lib/custom-grid-utils';
import { calculateOptimizedIntersection, type IntersectionConstraint, clearIntersectionCachesForPlayers } from '@/lib/intersection-cache';
import { getSeasonEligiblePlayers, SEASON_ACHIEVEMENTS } from '@/lib/season-achievements';
import { debugIndividualAchievements, playerMeetsAchievement, setCachedLeagueYears, calculateTeamSeasonsAndAchievementSeasons } from '@/lib/achievements';
import { clearHintCache } from '@/lib/hint-generation';
import { useToast } from '@/lib/hooks/use-toast';
import type { LeagueData, CatTeam, CellState, Player, SearchablePlayer } from '@/types/bbgm';

// Helper functions copied from team-trivia for team modals
function getAssetBaseUrl(sport: string): string {
  const sportUrlMap: Record<string, string> = {
    basketball: 'https://play.basketball-gm.com',
    football: 'https://play.football-gm.com',
    hockey: 'https://play.hockey-gm.com',
    baseball: 'https://play.baseball-gm.com'
  };
  return sportUrlMap[sport] || sportUrlMap.basketball;
}

function getTeamLogoUrl(logoUrl: string | null | undefined, sport: string = 'basketball'): string | undefined {
  if (!logoUrl) return undefined;
  if (logoUrl.startsWith('/img/logos-')) {
    const assetBase = getAssetBaseUrl(sport);
    const cleanPath = logoUrl.startsWith('/') ? logoUrl.substring(1) : logoUrl;
    return `${assetBase}/${cleanPath}`;
  }
  return logoUrl;
}

function calculateYearsWithTeam(player: Player, tid: number, season: number): number {
  if (!player.stats || player.stats.length === 0) return 0;
  const seasonsWithTeam = player.stats
    .filter(stat => stat.tid === tid && stat.season <= season)
    .map(stat => stat.season)
    .sort((a, b) => a - b);
  if (seasonsWithTeam.length === 0) return 0;
  return season - seasonsWithTeam[0] + 1;
}

function getPlayerRating(player: Player, season: number, type: 'ovr' | 'pot'): number | undefined {
  if (!player.ratings || player.ratings.length === 0) return undefined;
  const seasonRating = player.ratings.find(r => r.season === season);
  if (seasonRating) return type === 'ovr' ? seasonRating.ovr : seasonRating.pot;
  const closestRating = player.ratings.reduce((closest, current) => {
    const currentDiff = Math.abs(current.season - season);
    const closestDiff = Math.abs(closest.season - season);
    return currentDiff < closestDiff ? current : closest;
  });
  return type === 'ovr' ? closestRating.ovr : closestRating.pot;
}

function formatContract(player: Player, season: number): string | undefined {
  if (!player.salaries || player.salaries.length === 0) return undefined;
  const seasonSalary = player.salaries.find(s => s.season === season);
  if (!seasonSalary) return undefined;
  const salaryInMillions = seasonSalary.amount / 1000;
  return `$${salaryInMillions.toFixed(2)}M`;
}

function getTeamPlayoffResult(
  leagueData: LeagueData,
  tid: number,
  season: number
): { label: string; value: number; seriesScore: string | null; numRounds: number } | null {
  if (!leagueData.playoffSeries || leagueData.playoffSeries.length === 0) {
    return null;
  }

  let finishLabel = 'Missed Playoffs';
  let finishValue = -1;
  let seriesScore: string | null = null;
  let numRounds = 4;

  const seasonPlayoffs = leagueData.playoffSeries?.find(ps => ps.season === season);
  if (!seasonPlayoffs?.series || seasonPlayoffs.series.length === 0) {
    return null;
  }

  const rounds = seasonPlayoffs.series;
  numRounds = rounds.length;

  let lastRoundFound = -1;
  let lastMatchup: any = null;

  for (let r = 0; r < numRounds; r++) {
    const matchup = rounds[r]?.find(
      m => m?.home?.tid === tid || m?.away?.tid === tid
    );

    if (matchup) {
      lastRoundFound = r;
      lastMatchup = matchup;
    }
  }

  if (lastRoundFound >= 0 && lastMatchup) {
    const isHome = lastMatchup.home?.tid === tid;
    const teamSide = isHome ? lastMatchup.home : lastMatchup.away;
    const oppSide = isHome ? lastMatchup.away : lastMatchup.home;
    const teamWins = teamSide?.won ?? 0;
    const oppWins = oppSide?.won ?? 0;

    if (teamWins + oppWins === 1) {
      const teamPts = isHome ? lastMatchup.home?.pts : lastMatchup.away?.pts;
      const oppPts = isHome ? lastMatchup.away?.pts : lastMatchup.home?.pts;

      if (Array.isArray(teamPts) && Array.isArray(oppPts) && teamPts.length > 0 && oppPts.length > 0) {
        seriesScore = `${teamPts[0]}–${oppPts[0]}`;
      } else {
        seriesScore = `${teamWins}–${oppWins}`;
      }
    } else {
      seriesScore = `${teamWins}–${oppWins}`;
    }

    if (lastRoundFound === numRounds - 1 && teamWins > oppWins) {
      finishLabel = 'Won Championship';
      finishValue = numRounds;
    } else if (teamWins < oppWins) {
      finishValue = lastRoundFound;

      if (numRounds === 4) {
        finishLabel =
          lastRoundFound === 0
            ? 'Lost First Round'
            : lastRoundFound === 1
            ? 'Lost Second Round'
            : lastRoundFound === 2
            ? 'Lost Conference Finals'
            : 'Lost Finals';
      } else if (numRounds === 3) {
        finishLabel =
          lastRoundFound === 0
            ? 'Lost First Round'
            : lastRoundFound === 1
            ? 'Lost Second Round'
            : 'Lost Finals';
      } else if (numRounds === 2) {
        finishLabel = lastRoundFound === 0 ? 'Lost First Round' : 'Lost Finals';
      } else {
        finishLabel = lastRoundFound === numRounds - 1 ? 'Lost Finals' : `Lost Round ${lastRoundFound + 1}`;
      }
    }
  }

  return { label: finishLabel, value: finishValue, seriesScore, numRounds };
}

function calculateTeamStats(
  leagueData: LeagueData,
  tid: number,
  season: number,
  roster: any[]
): { wins: number; losses: number; teamRating: number; avgAge: number; playoffResult?: string } | undefined {
  const teamSeason = leagueData.teamSeasons?.find(
    ts => ts.tid === tid && ts.season === season && !ts.playoffs
  );

  if (!teamSeason) return undefined;

  const wins = teamSeason.won || 0;
  const losses = teamSeason.lost || 0;

  let totalWeightedAge = 0;
  let totalWeight = 0;

  roster.forEach(rp => {
    if (rp.age != null) {
      let weight = 0;
      const seasonStats = rp.rawSeasonStats || rp.stats;

      if (seasonStats?.min != null && seasonStats.min > 0) {
        weight = seasonStats.min;
      } else if (rp.gamesPlayed != null && rp.gamesPlayed > 0) {
        weight = rp.gamesPlayed;
      }

      if (weight > 0) {
        totalWeightedAge += rp.age * weight;
        totalWeight += weight;
      }
    }
  });

  const avgAge = totalWeight > 0 ? totalWeightedAge / totalWeight : 0;

  const team = leagueData.teams.find(t => t.tid === tid);
  let teamRating = 0;
  if (team) {
    const playerRatings: number[] = [];
    leagueData.players.forEach(player => {
      const seasonStats = player.stats?.find(
        s => !s.playoffs && s.season === season && s.tid === tid
      );
      if (seasonStats && seasonStats.gp && seasonStats.gp > 0) {
        const rating = player.ratings?.find(r => r.season === season);
        if (rating?.ovr) {
          playerRatings.push(rating.ovr);
        }
      }
    });
    if (playerRatings.length > 0) {
      teamRating = Math.round(playerRatings.reduce((sum, r) => sum + r, 0) / playerRatings.length);
    }
  }

  const playoffData = getTeamPlayoffResult(leagueData, tid, season);
  const playoffResult = playoffData?.label;

  return {
    wins,
    losses,
    teamRating,
    avgAge,
    ...(playoffResult ? { playoffResult } : {}),
  };
}

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
  const [gameMode, setGameMode] = useState<'choose' | 'grids' | 'team-trivia' | null>(null);
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
  
  // Parsing method state - load from localStorage or default to 'auto'
  const [parsingMethodSetting, setParsingMethodSetting] = useState<ParsingMethod>(() => 
    getStoredParsingMethod()
  );
  
  // Displayed method in UI - shows actual method when auto is selected and uploading
  const [displayedMethod, setDisplayedMethod] = useState<ParsingMethod>(() => 
    getStoredParsingMethod()
  );
  
  // Progress tracking for file uploads
  const [uploadProgress, setUploadProgress] = useState<{
    message: string;
    loaded?: number;
    total?: number;
  } | null>(null);
  const [loadingLeagueId, setLoadingLeagueId] = useState<string | null>(null);
  const [currentLeagueId, setCurrentLeagueId] = useState<string | null>(null); // Track currently loaded league ID
  const [currentFingerprintId, setCurrentFingerprintId] = useState<string | null>(null); // Track league fingerprint ID for history
  const [savedYearRange, setSavedYearRange] = useState<[number, number] | null>(null); // Saved year range from loaded league
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [currentCellKey, setCurrentCellKey] = useState<string | null>(null);
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [modalPlayer, setModalPlayer] = useState<Player | null>(null);
  const [modalEligiblePlayers, setModalEligiblePlayers] = useState<Player[]>([]);
  const [modalPuzzleSeed, setModalPuzzleSeed] = useState<string>("");
  const [modalCellKey, setModalCellKey] = useState<string>("");
  const [playerModalStackIndex, setPlayerModalStackIndex] = useState<number>(0);

  // Modal stack for team and history modals
  type ModalStackItem = { type: 'team'; tid: number; season: number } | { type: 'history' };
  const [modalStack, setModalStack] = useState<ModalStackItem[]>([]);
  const pushModal = useCallback((modal: ModalStackItem) => {
    setModalStack(prev => [...prev, modal]);
  }, []);
  const popModal = useCallback(() => {
    setModalStack(prev => prev.slice(0, -1));
  }, []);
  const clearModals = useCallback(() => {
    setModalStack([]);
    setPlayerModalOpen(false);
    setPlayerModalStackIndex(0);
  }, []);

  // Handler for opening team modals (only when grid is completed)
  const handleTeamClick = useCallback((tid: number, season: number) => {
    const isGridCompleted = Object.values(cells).length === 9 && Object.values(cells).every(cell => cell.locked);
    if (isGridCompleted) {
      pushModal({ type: 'team', tid, season });
    }
  }, [cells, pushModal]);

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

  // File metadata for saving
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [currentFileSize, setCurrentFileSize] = useState<number | undefined>(undefined);

  // Grid history state
  const [gridHistory, setGridHistory] = useState<GridHistoryEntry[]>([]);

  // Track last saved grid to prevent duplicates
  const lastSavedGridRef = useRef<string | null>(null);

  // Handle hint mode toggle
  const handleHintModeChange = useCallback((enabled: boolean) => {
    setHintMode(enabled);
  }, []);

  // One-time migration from localStorage to IndexedDB for grids
  useEffect(() => {
    let mounted = true;

    async function runMigration() {
      try {
        const result = await migrateGridsFromLocalStorage();
        if (mounted && result.migrated > 0) {
          console.log(`[Grid History] Migrated ${result.migrated} entries from localStorage to IndexedDB`);
        }
      } catch (error) {
        console.error('[Grid History] Migration failed:', error);
      }
    }

    runMigration();

    return () => {
      mounted = false;
    };
  }, []); // Run once on mount

  // Load grid history on mount and filter by current league
  useEffect(() => {
    let mounted = true;

    async function loadHistory() {
      try {
        const allHistory = await loadGridHistory();
        console.log('[Grid History] Loading history. Current fingerprint:', currentFingerprintId);
        console.log('[Grid History] All history entries:', allHistory.length);
        console.log('[Grid History] Fingerprint IDs in history:', [...new Set(allHistory.map(h => h.leagueFingerprintId))]);

        // Filter history by current league fingerprint
        // Only show history if we have a valid fingerprint ID AND the entry matches
        const filteredHistory = currentFingerprintId
          ? allHistory.filter(entry => entry.leagueFingerprintId === currentFingerprintId)
          : []; // Don't show any history if no fingerprint (to avoid showing wrong league's history)

        console.log('[Grid History] Filtered history entries:', filteredHistory.length);

        if (mounted) {
          setGridHistory(filteredHistory);
        }
      } catch (error) {
        console.error('[Grid History] Failed to load history:', error);
      }
    }

    loadHistory();

    return () => {
      mounted = false;
    };
  }, [currentFingerprintId]);

  // Save grid to history when completed
  useEffect(() => {
    if (!leagueData) return;

    // Check if grid is complete (all 9 cells filled)
    const allCellKeys = rows.flatMap((row, rowIndex) =>
      cols.map((col, colIndex) => `${rowIndex}-${colIndex}`)
    );
    const filledCells = allCellKeys.filter(key => cells[key]?.name).length;
    const isGridComplete = filledCells === 9 && allCellKeys.length === 9;

    // Only save once when grid is newly completed
    if (isGridComplete && rows.length > 0 && cols.length > 0) {
      const totalScore = Object.values(cells).reduce((sum, cell) => sum + (cell.points || 0), 0);
      const correctGuesses = Object.values(cells).filter(cell => cell.correct).length;

      // Don't save if player gave up without making any guesses (creates broken/unclickable history entries)
      if (giveUpPressed && correctGuesses === 0) {
        return;
      }

      // Create a unique identifier for this specific grid completion
      const gridCompletionId = `${rows.map(r => r.key).join('-')}_${cols.map(c => c.key).join('-')}_${totalScore}_${correctGuesses}_${attemptCount}_${giveUpPressed}`;

      // Only save if we haven't already saved this exact completion
      if (lastSavedGridRef.current !== gridCompletionId) {
        // Save to history with full grid state
        const simplifiedCells: Record<string, any> = {};
        Object.entries(cells).forEach(([key, cell]) => {
          simplifiedCells[key] = {
            name: cell.name,
            correct: cell.correct,
            locked: cell.locked,
            autoFilled: cell.autoFilled,
            guessed: cell.guessed,
            points: cell.points,
            rarity: cell.rarity,
            usedHint: cell.usedHint,
            // Don't save full player object to keep storage small
          };
        });

        console.log('[Grid History] Saving grid to history with fingerprintId:', currentFingerprintId);

        // Save to history (async)
        (async () => {
          try {
            await saveGridToHistory({
              sport: leagueData.sport || 'basketball',
              score: totalScore,
              correctGuesses,
              totalCells: 9,
              attemptCount,
              usedGiveUp: giveUpPressed,
              leagueFingerprintId: currentFingerprintId || undefined,
              gridConfig: {
                rows: rows.map(r => ({
                  type: r.type,
                  label: r.label,
                  tid: r.tid,
                  key: r.key,
                  achievementId: r.achievementId
                })),
                cols: cols.map(c => ({
                  type: c.type,
                  label: c.label,
                  tid: c.tid,
                  key: c.key,
                  achievementId: c.achievementId
                })),
              },
              cells: simplifiedCells,
            });

            // Mark this grid completion as saved
            lastSavedGridRef.current = gridCompletionId;

            // Reload history after saving
            const allHistory = await loadGridHistory();
            const filteredHistory = currentFingerprintId
              ? allHistory.filter(entry => entry.leagueFingerprintId === currentFingerprintId)
              : []; // Don't show any history if no fingerprint
            setGridHistory(filteredHistory);
          } catch (error) {
            console.error('[Grid History] Error saving grid:', error);
          }
        })();
      }
    }
  }, [cells, rows, cols, leagueData, attemptCount, giveUpPressed, currentFingerprintId]);

  // Handle parsing method change
  const handleParsingMethodChange = useCallback((method: ParsingMethod) => {
    setParsingMethodSetting(method);
    setDisplayedMethod(method); // Update display to match setting
    storeParsingMethod(method);
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
    
    if (!rowConstraint || !colConstraint || !leagueData) {
      toast({
        title: 'Error',
        description: 'Could not determine cell constraints.',
        variant: 'destructive',
      });
      return;
    }

    // Recalculate eligible players for this cell using the same logic as handleCellClick
    // This ensures consistency between the modal's eligibility and the cell's correctness
    let currentCellEligiblePlayers: Player[] = [];
    const hasCustomAchievements = rowConstraint.key.includes('custom') || colConstraint.key.includes('custom');

    if (hasCustomAchievements) {
      currentCellEligiblePlayers = leagueData.players.filter(p => 
        rowConstraint!.test(p) && colConstraint!.test(p)
      );
    } else {
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
      currentCellEligiblePlayers = eligiblePids
        .map(pid => byPid[pid])
        .filter(p => p);
    }

    const isCorrect = currentCellEligiblePlayers.some(p => Number(p.pid) === Number(player.pid));
    
    // Compute rarity if correct
    let rarity = 0;
    let points = 0;
    if (isCorrect) {
      const eligiblePool = currentCellEligiblePlayers.map(p => playerToEligibleLite(p));
      const guessedPlayer = playerToEligibleLite(player);
      const puzzleSeed = `${rows.map(r => r.key).join('-')}_${cols.map(c => c.key).join('-')}`;
      const teamsMap = new Map(leagueData.teams.map(t => [t.tid, t]));
      
      rarity = computeRarityForGuess({
        guessed: guessedPlayer,
        eligiblePool: eligiblePool,
        puzzleSeed: puzzleSeed,
        cellContext: {
          rowConstraint: rowConstraint,
          colConstraint: colConstraint
        },
        fullPlayers: currentCellEligiblePlayers,
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
  }, [leagueData, rows, cols, intersections, usedPids, byPid, toast]);

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
  
    } else {
  
      
      // Use EXACT SAME LOGIC as eligible players list in handleCellClick
      const hasCustomAchievements = rowConstraint.key.includes('custom') || colConstraint.key.includes('custom');
      
      if (hasCustomAchievements) {
        // Direct test function evaluation (same as eligible players list)
        eligiblePlayers = leagueData.players.filter(player => 
          rowConstraint.test(player) && colConstraint.test(player)
        );
    
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
          rowConstraint: rowConstraint,
          colConstraint: colConstraint
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
    setUploadProgress({ message: 'Starting...', loaded: 0, total: file.size });
    
    try {
      // Store file metadata for saving
      setCurrentFileName(file.name);
      setCurrentFileSize(file.size);

      // Determine which method to use based on setting
      const method: ParsingMethod = parsingMethodSetting === 'auto'
        ? getRecommendedMethod(file.size, file.name)
        : parsingMethodSetting;

      // Update displayed method to show actual method being used
      setDisplayedMethod(method);

      // Generate unique database name for this league (for streaming/IDB method)
      const uniqueDbName = `grids-league-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

      // Parse the league file with progress tracking and selected method
      const data = await parseLeagueFile(file, (message, loaded, total) => {
        setUploadProgress({ message, loaded, total });
      }, method, uniqueDbName);
      await processLeagueData(data, file.name, file.size);
      
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: 'Error loading file',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
      // Reset displayed method on error
      setDisplayedMethod(parsingMethodSetting);
    } finally {
      setIsProcessing(false);
      setUploadProgress(null);
    }
  }, [toast, parsingMethodSetting]);

  const handleUrlUpload = useCallback(async (url: string) => {
    setIsProcessing(true);
    setUploadProgress({ message: 'Starting...', loaded: 0, total: 100 });
    
    try {
      // Extract file name from URL
      const fileName = url.split('/').pop() || 'league-from-url.json';
      setCurrentFileName(fileName);
      setCurrentFileSize(undefined); // Unknown size for URLs

      // Determine which method to use based on setting
      // For URLs, pass isUrl=true to default to streaming when size unknown
      const method: ParsingMethod = parsingMethodSetting === 'auto'
        ? getRecommendedMethod(undefined, fileName, true)
        : parsingMethodSetting;

      // Update displayed method to show actual method being used
      setDisplayedMethod(method);
      
      // Generate unique database name for this league (for streaming/IDB method)
      const uniqueDbName = `grids-league-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      
      // Parse the league URL with progress tracking and selected method
      const data = await parseLeagueUrl(url, (message, loaded, total) => {
        setUploadProgress({ message, loaded, total });
      }, method, uniqueDbName);
      await processLeagueData(data, fileName, undefined);
      
    } catch (error) {
      console.error('Error processing URL:', error);
      toast({
        title: 'Error loading URL',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
      // Reset displayed method on error
      setDisplayedMethod(parsingMethodSetting);
    } finally {
      setIsProcessing(false);
      setUploadProgress(null);
    }
  }, [toast, parsingMethodSetting]);

  const handleLoadLeague = useCallback(async (storedLeague: StoredLeague) => {
    setIsProcessing(true);
    setLoadingLeagueId(storedLeague.id);
    setUploadProgress({ message: 'Loading saved league...', loaded: 0, total: 100 });

    try {
      // Update last played timestamp
      await updateLastPlayed(storedLeague.id);

      setCurrentFileName(storedLeague.name);
      setCurrentFileSize(storedLeague.fileSize);
      setCurrentLeagueId(storedLeague.id);
      console.log('[League Load] Loading saved league with fingerprintId:', storedLeague.fingerprintId);

      // If league doesn't have a fingerprint (old save), generate one now
      let fingerprintId = storedLeague.fingerprintId;
      if (!fingerprintId && !storedLeague.isMetadataOnly) {
        console.log('[League Load] No fingerprintId found, generating one...');
        try {
          const { generateLeagueFingerprint, findMatchingLeague } = await import('@/lib/league-fingerprint');
          const { updateLeagueFingerprint, saveFingerprint, getAllFingerprints } = await import('@/lib/league-storage');

          const fingerprint = generateLeagueFingerprint(storedLeague.leagueData);

          // Check if this fingerprint already exists
          const allFingerprints = await getAllFingerprints();
          const fingerprintMap = new Map(allFingerprints.map(sf => [sf.id, sf.fingerprint]));
          const matchingId = findMatchingLeague(fingerprint, fingerprintMap);

          if (matchingId) {
            // Use existing fingerprint ID
            fingerprintId = matchingId;
            console.log('[League Load] Found matching fingerprint:', fingerprintId);
          } else {
            // Save new fingerprint
            fingerprintId = fingerprint.id;
            await saveFingerprint(fingerprint);
            console.log('[League Load] Saved new fingerprint:', fingerprintId);
          }

          await updateLeagueFingerprint(storedLeague.id, fingerprintId);
          console.log('[League Load] Updated league with fingerprintId:', fingerprintId);
        } catch (error) {
          console.error('[League Load] Failed to generate fingerprint:', error);
        }
      }

      setCurrentFingerprintId(fingerprintId || null);
      setSavedYearRange(storedLeague.yearRange || null);

      // Check if this is a metadata-only save (large file on mobile)
      if (storedLeague.isMetadataOnly && storedLeague.idbName) {
        setUploadProgress({ message: 'Loading from database...', loaded: 10, total: 100 });

        // Load the full data from the league-specific IDB
        const { processLeagueFromIDB } = await import('@/lib/idb-league-reader');
        const data = await processLeagueFromIDB((message) => {
          setUploadProgress({ message, loaded: 50, total: 100 });
        }, storedLeague.idbName); // Pass the specific database name

        // Process without saving (already saved)
        await processLeagueData(data);
      } else {
        // Normal save with full league data - process without saving (already saved)
        await processLeagueData(storedLeague.leagueData);
      }

      toast({
        title: 'League loaded',
        description: `${storedLeague.name} has been loaded successfully.`,
      });
    } catch (error) {
      console.error('Error loading saved league:', error);
      toast({
        title: 'Error loading league',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setLoadingLeagueId(null);
      setUploadProgress(null);
    }
  }, [toast]);

  // Create minimal test data for debugging
  const createTestData = useCallback((): LeagueData => {

    
    // Create mock players with achievements (add more for grid generation)
    const mockPlayers = [
      {
        pid: 1,
        achievements: { },
        awards: [{ type: "Assists Leader", season: 2020, tid: 1 }],
        teamsPlayed: new Set([1]),
        stats: [{ season: 2020, rebounds: 12000 }, { season: 2019, rebounds: 11000 }]
      },
      {
        pid: 2, 
        achievements: { },
        awards: [],
        teamsPlayed: new Set([1]),
        stats: [{ season: 2020, rebounds: 15000 }, { season: 2018, rebounds: 14000 }]
      },
      {
        pid: 3,
        name: "Test Player 3 (Assists Only)", 
        achievements: { },
        awards: [{ type: "Assists Leader", season: 2021, tid: 2 }],
        teamsPlayed: new Set([2]),
        stats: [{ season: 2021, rebounds: 5000 }, { season: 2020, rebounds: 4800 }]
      },
      {
        pid: 4,
        name: "Test Player 4 (Both Again)",
        achievements: { },
        awards: [{ type: "Assists Leader", season: 2022, tid: 3 }],
        teamsPlayed: new Set([3]),
        stats: [{ season: 2022, rebounds: 11000 }]
      },
      {
        pid: 5,
        name: "Test Player 5 (Another Both)",
        achievements: { },
        awards: [{ type: "Assists Leader", season: 2019, tid: 1 }],
        teamsPlayed: new Set([1, 2]),
        stats: [{ season: 2019, rebounds: 13000 }]
      },
      {
        pid: 6,
        name: "Test Player 6 (Rebounds Only)",
        achievements: { },
        awards: [],
        teamsPlayed: new Set([4]),
        stats: [{ season: 2020, rebounds: 10500 }]
      },
      {
        pid: 7,
        name: "Test Player 7 (Assists Only)",
        achievements: { },
        awards: [{ type: "Assists Leader", season: 2018, tid: 4 }],
        teamsPlayed: new Set([4]),
        stats: [{ season: 2018, rebounds: 4000 }]
      },
      {
        pid: 8,
        name: "Test Player 8 (Final Both)",
        achievements: { },
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
  
      const data = createTestData();
      await processLeagueData(data);
    } catch (error) {
      console.error('Test data creation failed:', error);
    }
  }, [createTestData]);

  const processLeagueData = useCallback(async (data: LeagueData & { isFullyProcessed?: boolean; byName?: any; byPid?: any; searchablePlayers?: any; teamsByTid?: any; idbName?: string }, fileName?: string, fileSize?: number) => {
    // Detect if on mobile for memory-aware processing
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const playerCount = data.players?.length || 0;
    const isHugeFile = playerCount > 10000;
    
    // Clear caches for the new player dataset
    clearIntersectionCachesForPlayers(data.players);
    
    // MOBILE FIX: Give browser breathing room before massive state update
    if (isMobile && isHugeFile) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setLeagueData(data);
    
    // MOBILE FIX: Yield after setting league data to prevent overwhelm
    if (isMobile && isHugeFile) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    if (data.leagueYears) {
      setCachedLeagueYears(data.leagueYears);
    }
    
    // Force close any open dropdowns/modals on mobile after file upload
    if (isMobile) {
      // Close any open dialogs or dropdowns by clicking outside
      document.body.click();
      // Remove focus from any elements that might be capturing events
      if (document.activeElement && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      // Force a brief delay to let any modal states resolve
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // MOBILE FIX: Skip redundant processing if data comes from IDB (already fully processed)
    if (data.isFullyProcessed && data.byName && data.byPid && data.searchablePlayers && data.teamsByTid) {
      setByName(data.byName);
      setByPid(data.byPid);
      setSearchablePlayers(data.searchablePlayers);
      setTeamsByTid(data.teamsByTid);
      setUploadProgress({ message: 'Finalizing...', loaded: 90, total: 100 });
      
      // MOBILE FIX: Yield after setting search indices
      if (isMobile && isHugeFile) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } else {
      // Build search indices (async with yielding for mobile) - only for traditional/streaming uploads
      setUploadProgress({ message: 'Building search index...', loaded: 50, total: 100 });
      const indices = await buildSearchIndex(data.players, data.teams);
      setByName(indices.byName);
      setByPid(indices.byPid);
      setSearchablePlayers(indices.searchablePlayers);
      setTeamsByTid(indices.teamsByTid);

      // Calculate team seasons and achievement seasons for each player
      // MOBILE FIX: More aggressive yielding on mobile to prevent crashes
      setUploadProgress({ message: 'Calculating player achievements...', loaded: 75, total: 100 });
      const yieldInterval = isMobile ? 250 : 500; // More frequent yielding on mobile
      const batchSize = isMobile ? 100 : 250; // Smaller processing batches on mobile
      
      for (let i = 0; i < data.players.length; i += batchSize) {
        // Process in batches
        const end = Math.min(i + batchSize, data.players.length);
        for (let j = i; j < end; j++) {
          calculateTeamSeasonsAndAchievementSeasons(data.players[j], data.teamOverlaps, data.gameAttributes);
        }
        
        // Yield control after each batch
        if (i % yieldInterval === 0 && i > 0) {
          const progress = Math.floor((i / data.players.length) * 25) + 75; // 75-100%
          setUploadProgress({ 
            message: `Processing ${i.toLocaleString()} of ${data.players.length.toLocaleString()} players...`,
            loaded: progress,
            total: 100 
          });
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    }
    
    // Direct intersection test (bypass grid generation)

    
    // Test each achievement individually

    
    // Debug individual achievements first to understand the data

    debugIndividualAchievements(data.players, data.seasonIndex);
    
    // Automatically save the league to storage
    if (fileName && data.sport) {
      try {
        setUploadProgress({ message: 'Saving league...', loaded: 95, total: 100 });

        // Extract league name from meta.name in the uploaded file
        // Fallback to cleaned filename if no meta.name found
        let leagueName = data.meta?.name || '';

        // Fallback to cleaned filename if no league name found
        let extractedName = '';
        if (!leagueName) {
          // Remove file extensions and URL parameters first
          let cleanedName = fileName.split('?')[0].replace(/\.(json|gz)$/gi, '');

          // Remove sport prefixes (BBGM_, FBGM_, ZGMH_, ZGMB_)
          cleanedName = cleanedName.replace(/^(?:BBGM|FBGM|ZGMH|ZGMB)_/i, '');

          // Remove year patterns with surrounding separators
          // Matches: _2025_, -2025-, _2025, -2025, etc.
          cleanedName = cleanedName.replace(/[-_]\d{4}[-_]/g, ' ');
          cleanedName = cleanedName.replace(/[-_]\d{4}$/g, '');

          // Remove common suffixes
          cleanedName = cleanedName.replace(/[-_](preseason|playoffs|regular[-_]?season|postseason|draft[-_]?update|season)$/gi, '');

          // Replace underscores and dashes with spaces
          cleanedName = cleanedName.replace(/[_-]+/g, ' ');

          // Clean up multiple spaces and dots
          cleanedName = cleanedName.replace(/\.+/g, ' ').replace(/\s+/g, ' ').trim();

          extractedName = cleanedName;
        }

        const cleanName = leagueName || extractedName;

        // MOBILE FIX: Use lightweight metadata-only save for large files on mobile
        let savedLeagueId: string;
        let isUpdate = false;
        let previousName: string | undefined;
        let fingerprintId: string | undefined;

        if (isMobile && isHugeFile && data.idbName) {
          const { saveLeagueMetadata } = await import('@/lib/league-storage');
          const seasons = data.leagueYears ? {
            min: data.leagueYears.minSeason,
            max: data.leagueYears.maxSeason
          } : undefined;

          savedLeagueId = await saveLeagueMetadata(
            cleanName,
            data.sport,
            playerCount,
            data.teams?.length || 0,
            data.idbName, // Pass the unique database name
            fileSize,
            seasons
          );
          // Note: metadata-only saves don't support fingerprinting yet
        } else {
          // Normal save for desktop or smaller files
          const result = await saveLeague(cleanName, data, data.sport, fileSize);
          savedLeagueId = result.id;
          isUpdate = result.isUpdate;
          previousName = result.previousName;

          // Get the fingerprint ID from the saved league
          const { getLeague } = await import('@/lib/league-storage');
          const savedLeague = await getLeague(savedLeagueId);
          fingerprintId = savedLeague?.fingerprintId;
        }

        // Set the current league ID and fingerprint so they're available
        setCurrentLeagueId(savedLeagueId);
        console.log('[League Load] Setting fingerprintId:', fingerprintId);
        setCurrentFingerprintId(fingerprintId || null);

        toast({
          title: isUpdate ? 'League updated' : 'League saved',
          description: isUpdate && previousName
            ? `Detected as an update to "${previousName}". Your game history has been preserved.`
            : 'Your league has been saved and will be available the next time you visit.',
        });
      } catch (error) {
        console.error('Error saving league:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown',
          stack: error instanceof Error ? error.stack : undefined,
          error
        });
        // Don't show error toast - saving is optional
      }
    }
    
    setUploadProgress({ message: 'Complete!', loaded: 100, total: 100 });
    
    // Show game mode selection interstitial instead of immediately generating grid
    setGameMode('choose');
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
      lastSavedGridRef.current = null; // Reset saved grid tracking
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
      setGiveUpPressed(false); // Reset Give Up state
      lastSavedGridRef.current = null; // Reset saved grid tracking

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

      // Set player modal stack index to be on top of current modal stack
      setPlayerModalStackIndex(modalStack.length);
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
  }, [cells, rows, cols, intersections, leagueData, hintMode, toast, modalStack]);


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
    setGameMode(null);
    setRows([]);
    setCols([]);
    setCells({});
    setUsedPids(new Set());
    setIntersections({});
    setByName({});
    setByPid({});
    setSearchablePlayers([]);
    // Reset displayed method back to the user's setting (e.g., "auto")
    setDisplayedMethod(parsingMethodSetting);
    setTeamsByTid({});
    setCurrentCellKey(null);
    setSearchModalOpen(false);
    setPlayerModalOpen(false);
    setModalPlayer(null);
    setModalEligiblePlayers([]);
    setModalPuzzleSeed("");
    setModalCellKey("");
    setPlayerModalStackIndex(0);
    setRankCache({});
  }, [parsingMethodSetting]);

  // Handle game mode selection
  const handleSelectGameMode = useCallback((mode: 'grids' | 'team-trivia') => {
    if (mode === 'grids') {
      // Generate grid for Grids mode
      if (!leagueData) return;
      
      // IMPORTANT: Set the game mode FIRST so UI can update
      setGameMode('grids');
      setIsGenerating(true);
      
      // Defer grid generation to prevent mobile browser crash
      // This allows the browser to render the loading state first
      setTimeout(() => {
        // Generate initial grid with automatic retry on error
        let gridResult: { rows: any[], cols: any[], intersections: any } = { rows: [], cols: [], intersections: {} };
        let attempt = 0;
        const MAX_AUTO_RETRIES = 50;
        
        while (attempt < MAX_AUTO_RETRIES) {
          try {
            gridResult = generateTeamsGrid(leagueData);
            break; // Success! Exit the retry loop
          } catch (error) {
            attempt++;
            if (attempt >= MAX_AUTO_RETRIES) {
              console.error('Error generating initial grid after maximum retries:', error);
              gridResult = { rows: [], cols: [], intersections: {} };
              break;
            }
          }
        }
        
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
        setGiveUpPressed(false);
        lastSavedGridRef.current = null; // Reset saved grid tracking

        setIsGenerating(false);
      }, 100); // 100ms delay to let browser render
      
      return; // Exit early since we set gameMode above
    }
    
    setGameMode(mode);
  }, [leagueData]);

  // Handle back to mode select from a game
  const handleBackToModeSelect = useCallback(() => {
    setGameMode('choose');
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
      
      if (eligiblePlayers.length === 0) {
        newCells[positionalKey] = {
          name: '—',
          correct: false,
          locked: true,
          autoFilled: true,
          guessed: false,
        };
    
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
    lastSavedGridRef.current = null; // Reset saved grid tracking
    setReshuffleCounts({}); // Reset reshuffle counts for retry

    // Keep the same rows, cols, and intersections (same puzzle)
  }, [currentGridId, attemptCount]);

  const [isHeaderHovered, setIsHeaderHovered] = useState(false);

  // Show upload section if no league data
  // Show upload screen if no league data OR if league is loading but game mode not yet set
  if (!leagueData || gameMode === null) {
    return (
      <div>
        <header
          className="bg-card border-border"
          onMouseEnter={() => setIsHeaderHovered(true)}
          onMouseLeave={() => setIsHeaderHovered(false)}
          style={{ position: 'relative' }}
        >
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="relative flex items-center justify-start md:justify-center">
              <div className="flex items-center space-x-3 pr-12">
                <img
                  src={zengmGridsLogo}
                  alt="ZenGM Grids logo with Basketball, Football, Hockey, and Baseball icons"
                  className="w-12 h-12 object-contain header-logo"
                />
                <h1 className="header-title text-base sm:text-xl md:text-2xl">ZenGM Grids & Team Trivia</h1>
              </div>
              <div className="absolute right-0 flex items-center space-x-3">
                <div>
                  <RulesModal />
                </div>
              </div>
            </div>
          </div>
          <AccentLine isHovered={isHeaderHovered} />
        </header>
        <main className="max-w-2xl mx-auto px-6 py-8 space-y-8">
          <SavedLeagues
            onLoadLeague={handleLoadLeague}
            loadingLeagueId={loadingLeagueId}
            uploadProgress={uploadProgress}
          />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or upload a new league
              </span>
            </div>
          </div>

          <UploadSection
            onFileUpload={handleFileUpload}
            onUrlUpload={handleUrlUpload}
            isProcessing={isProcessing}
            uploadProgress={uploadProgress}
            parsingMethod={displayedMethod}
            onParsingMethodChange={handleParsingMethodChange}
          />
        </main>
      </div>
    );
  }

  // Show game mode selection if league data is loaded but no mode selected
  if (gameMode === 'choose') {
    return (
      <ChooseGameMode
        onSelectMode={handleSelectGameMode}
        onBackToUpload={handleGoHome}
      />
    );
  }

  // Show Team Trivia if that mode is selected
  if (gameMode === 'team-trivia' && leagueData) {
    return (
      <TeamTrivia
        leagueData={leagueData}
        onBackToModeSelect={handleBackToModeSelect}
        onGoHome={handleGoHome}
        leagueId={currentLeagueId}
        leagueFingerprintId={currentFingerprintId}
        initialYearRange={savedYearRange}
      />
    );
  }

  // Show grid section if Grids mode is selected
  return (
    <div>
      <header 
        className="bg-card border-border"
        onMouseEnter={() => setIsHeaderHovered(true)}
        onMouseLeave={() => setIsHeaderHovered(false)}
        style={{ position: 'relative' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4">
          {/* Desktop: Centered layout with absolute positioning */}
          <div className="hidden sm:block">
            <div className="relative flex items-center justify-center">
              <div className="absolute left-0 flex items-center space-x-1 z-10">
                {hasGuesses ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" data-testid="button-back">
                        <ArrowLeft className="h-[1.2rem] w-[1.2rem]" />
                        <span className="sr-only">Go back</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Go back to game selection?</AlertDialogTitle>
                        <AlertDialogDescription>
                          You have made guesses in this grid. Going back will lose your current progress. Are you sure?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBackToModeSelect}>Go Back</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button variant="ghost" size="sm" onClick={handleBackToModeSelect} data-testid="button-back">
                    <ArrowLeft className="h-[1.2rem] w-[1.2rem]" />
                    <span className="sr-only">Go back</span>
                  </Button>
                )}
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <img
                  src={
                    leagueData?.sport === 'basketball' ? basketballIcon :
                    leagueData?.sport === 'football' ? footballIcon :
                    leagueData?.sport === 'hockey' ? hockeyIcon :
                    leagueData?.sport === 'baseball' ? baseballIcon :
                    zengmGridsLogo
                  }
                  alt={`${leagueData?.sport || 'Sports'} icon`}
                  className="w-10 h-10 object-contain header-logo shrink-0"
                />
                <h1 className="text-base md:text-lg lg:text-2xl header-title whitespace-nowrap">
                  {leagueData?.sport === 'basketball' && 'Basketball GM Grids'}
                  {leagueData?.sport === 'football' && 'Football GM Grids'}
                  {leagueData?.sport === 'hockey' && 'ZenGM Hockey Grids'}
                  {leagueData?.sport === 'baseball' && 'ZenGM Baseball Grids'}
                </h1>
              </div>
              <div className="absolute right-0 flex items-center space-x-1 z-10">
                {/* History button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => pushModal({ type: 'history' })}
                  data-testid="button-history"
                >
                  <History className="h-[1.2rem] w-[1.2rem]" />
                  <span className="sr-only">History</span>
                </Button>
                <div>
                  <RulesModal sport={leagueData?.sport} />
                </div>
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

          {/* Mobile: Left-aligned layout with responsive text */}
          <div className="block sm:hidden">
            <div className="flex items-center justify-between gap-1">
              {/* Left side: Back button + Title */}
              <div className="flex items-center gap-1 min-w-0 flex-1">
                {hasGuesses ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" data-testid="button-back" className="shrink-0">
                        <ArrowLeft className="h-[1.2rem] w-[1.2rem]" />
                        <span className="sr-only">Go back</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Go back to game selection?</AlertDialogTitle>
                        <AlertDialogDescription>
                          You have made guesses in this grid. Going back will lose your current progress. Are you sure?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBackToModeSelect}>Go Back</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button variant="ghost" size="sm" onClick={handleBackToModeSelect} data-testid="button-back" className="shrink-0">
                    <ArrowLeft className="h-[1.2rem] w-[1.2rem]" />
                    <span className="sr-only">Go back</span>
                  </Button>
                )}

                <div className="flex items-center gap-1.5 min-w-0">
                  <img
                    src={
                      leagueData?.sport === 'basketball' ? basketballIcon :
                      leagueData?.sport === 'football' ? footballIcon :
                      leagueData?.sport === 'hockey' ? hockeyIcon :
                      leagueData?.sport === 'baseball' ? baseballIcon :
                      zengmGridsLogo
                    }
                    alt={`${leagueData?.sport || 'Sports'} icon`}
                    className="w-7 h-7 object-contain header-logo shrink-0"
                  />
                  <h1 className="text-[11px] leading-tight header-title min-w-0" style={{ fontSize: 'clamp(9px, 2.5vw, 13px)' }}>
                    {leagueData?.sport === 'basketball' && 'Basketball GM Grids'}
                    {leagueData?.sport === 'football' && 'Football GM Grids'}
                    {leagueData?.sport === 'hockey' && 'ZenGM Hockey Grids'}
                    {leagueData?.sport === 'baseball' && 'ZenGM Baseball Grids'}
                  </h1>
                </div>
              </div>

              {/* Right side: History, Rules, Home buttons */}
              <div className="flex items-center space-x-1 shrink-0">
                {/* History button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => pushModal({ type: 'history' })}
                  data-testid="button-history"
                >
                  <History className="h-[1.2rem] w-[1.2rem]" />
                  <span className="sr-only">History</span>
                </Button>
                <div>
                  <RulesModal sport={leagueData?.sport} />
                </div>
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
        </div>
        <AccentLine isHovered={isHeaderHovered} />
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
        
        {playerModalOpen && modalPlayer && (
          <PlayerPageModal
            player={modalPlayer}
            sport={(leagueData?.sport as 'basketball' | 'football' | 'hockey' | 'baseball') || 'basketball'}
            teams={leagueData?.teams || []}
            season={(() => {
              // Find the player's peak overall season
              if (modalPlayer.ratings && modalPlayer.ratings.length > 0) {
                const peakRating = modalPlayer.ratings.reduce((peak, current) => {
                  return (current.ovr || 0) > (peak.ovr || 0) ? current : peak;
                });
                return peakRating.season;
              }
              // Fallback: use most recent season from stats
              if (modalPlayer.stats && modalPlayer.stats.length > 0) {
                return Math.max(...modalPlayer.stats.map(s => s.season));
              }
              return undefined;
            })()}
            onClose={() => {
              setPlayerModalOpen(false);
              setPlayerModalStackIndex(0);
            }}
            onTeamClick={handleTeamClick}
            eligiblePlayers={modalEligiblePlayers}
            puzzleSeed={modalPuzzleSeed}
            rows={rows}
            cols={cols}
            currentCellKey={modalCellKey}
            isGridCompleted={Object.values(cells).length === 9 && Object.values(cells).every(cell => cell.locked)}
            wasAutoFilled={modalCellKey ? cells[modalCellKey]?.autoFilled : false}
            stackIndex={playerModalStackIndex}
          />
        )}
        
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
          onPlayGrid={(customRows, customCols, customRowSelectors, customColSelectors) => {
            if (!leagueData) return;

            // Generate a unique ID for the new custom grid
            const newGridId = `${customRows.map(r => r.key).join('-')}_${customCols.map(c => c.key).join('-')}`;

            // If the new grid is different from the current one, reset the attempt count
            if (newGridId !== currentGridId) {
              setAttemptCount(1);
              storeAttemptCount(newGridId, 1);
            }
            
            setCurrentGridId(newGridId);

            // Replace current grid with custom grid
            setRows(customRows);
            setCols(customCols);
            
            // Reset game state for the new custom grid
            setCells({});
            setUsedPids(new Set());
            setRankCache({});
            setGiveUpPressed(false); // Reset the "finished" state
            lastSavedGridRef.current = null; // Reset saved grid tracking

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

        {/* Team modals */}
        {modalStack.map((modal, index) => {
          if (modal.type === 'team' && leagueData) {
            const team = leagueData.teams.find(t => t.tid === modal.tid);
            if (!team) return null;

            // Build team roster
            const rosterData: any[] = [];
            leagueData.players.forEach(player => {
              const seasonStats = player.stats?.find(s => !s.playoffs && s.season === modal.season && s.tid === modal.tid);
              if (seasonStats && seasonStats.gp && seasonStats.gp > 0) {
                const rating = player.ratings?.find(r => r.season === modal.season);
                const position = rating?.pos || player.pos || 'F';
                const age = player.born?.year ? modal.season - player.born.year : undefined;
                rosterData.push({
                  player,
                  position,
                  age,
                  gamesPlayed: seasonStats.gp,
                  stats: seasonStats,
                  yearsWithTeam: calculateYearsWithTeam(player, modal.tid, modal.season),
                  ovr: getPlayerRating(player, modal.season, 'ovr'),
                  pot: getPlayerRating(player, modal.season, 'pot'),
                  contract: formatContract(player, modal.season),
                });
              }
            });

            const seasonInfo = team.seasons?.find(s => s.season === modal.season);
            const teamLogo = seasonInfo?.imgURL || team.imgURL;
            const teamColors = seasonInfo?.colors || team.colors || ['#000000', '#ffffff'];
            const teamRegion = seasonInfo?.region || team.region || '';
            const teamNickname = seasonInfo?.name || team.name || `Team ${team.tid}`;
            const teamName = teamRegion ? `${teamRegion} ${teamNickname}` : teamNickname;
            const teamAbbrev = seasonInfo?.abbrev || team.abbrev || '';

            // Calculate team stats
            const teamStats = calculateTeamStats(leagueData, modal.tid, modal.season, rosterData);

            // Get playoff series data for this season
            const playoffSeriesData = leagueData.playoffSeries?.find(ps => ps.season === modal.season);

            return (
              <TeamInfoModal
                key={`team-${index}`}
                open={true}
                onCloseTop={popModal}
                onCloseAll={clearModals}
                stackIndex={index}
                season={modal.season}
                teamName={teamName}
                teamAbbrev={teamAbbrev}
                teamLogo={teamLogo ? getTeamLogoUrl(teamLogo, leagueData.sport || 'basketball') : undefined}
                teamColors={teamColors}
                players={rosterData}
                sport={leagueData.sport || 'basketball'}
                teams={leagueData.teams}
                teamStats={teamStats}
                playoffSeriesData={playoffSeriesData}
                teamTid={modal.tid}
                onOpenOpponentTeam={handleTeamClick}
                allPlayoffSeries={leagueData.playoffSeries}
                onPlayerClick={(player) => {
                  setModalPlayer(player);
                  // Set player modal to appear above this team modal
                  setPlayerModalStackIndex(index + 1);
                  setPlayerModalOpen(true);
                }}
              />
            );
          } else if (modal.type === 'history') {
            return (
              <GridHistoryModal
                key={`history-${index}`}
                open={true}
                onCloseTop={popModal}
                onCloseAll={clearModals}
                stackIndex={index}
                history={gridHistory}
                leagueFingerprintId={currentFingerprintId ?? undefined}
                onGameClick={(entry) => {
                  // Restore the grid from history
                  console.log('Restoring grid from history:', entry);
                  console.log('byName size:', Object.keys(byName).length);
                  console.log('byPid size:', Object.keys(byPid).length);
                  if (entry.gridConfig && entry.cells && leagueData) {
                    // Reconstruct CatTeam objects from saved config
                    const restoredRows: CatTeam[] = entry.gridConfig.rows.map(r => {
                      if (r.type === 'team') {
                        const team = leagueData.teams.find(t => t.tid === r.tid);
                        return {
                          type: 'team' as const,
                          tid: r.tid!,
                          label: r.label,
                          key: r.key || `team-${r.tid}`,
                          test: (player: Player) => {
                            return player.stats?.some(s => !s.playoffs && s.tid === r.tid && s.gp && s.gp > 0) || false;
                          }
                        };
                      } else {
                        // Achievement type - we need to find the achievement definition
                        // For now, just create a basic structure
                        return {
                          type: 'achievement' as const,
                          achievementId: r.achievementId || 'unknown',
                          label: r.label,
                          key: r.key || `achv-${r.achievementId}`,
                          test: () => false // Will be filled from intersections
                        };
                      }
                    });

                    const restoredCols: CatTeam[] = entry.gridConfig.cols.map(c => {
                      if (c.type === 'team') {
                        const team = leagueData.teams.find(t => t.tid === c.tid);
                        return {
                          type: 'team' as const,
                          tid: c.tid!,
                          label: c.label,
                          key: c.key || `team-${c.tid}`,
                          test: (player: Player) => {
                            return player.stats?.some(s => !s.playoffs && s.tid === c.tid && s.gp && s.gp > 0) || false;
                          }
                        };
                      } else {
                        return {
                          type: 'achievement' as const,
                          achievementId: c.achievementId || 'unknown',
                          label: c.label,
                          key: c.key || `achv-${c.achievementId}`,
                          test: () => false
                        };
                      }
                    });

                    // Restore cell states and look up player objects
                    const restoredCells: Record<string, CellState> = {};
                    Object.entries(entry.cells).forEach(([key, savedCell]) => {
                      // Look up the player by name
                      let player: Player | undefined = undefined;
                      if (savedCell.name && savedCell.name !== '—') {
                        const pid = byName[savedCell.name];
                        if (pid !== undefined) {
                          player = byPid[pid];
                          if (!player) {
                            console.warn(`Player not found in byPid for pid ${pid}, name: ${savedCell.name}`);
                          } else {
                            console.log(`Found player ${savedCell.name}:`, {
                              pid: player.pid,
                              name: player.name,
                              hasImgURL: !!player.imgURL,
                              hasFace: !!player.face,
                              imgURL: player.imgURL,
                            });
                          }
                        } else {
                          console.warn(`Player name not found in byName index: ${savedCell.name}`);
                          // Try to find by searching all players
                          const foundPlayer = leagueData.players.find(p => p.name === savedCell.name);
                          if (foundPlayer) {
                            player = foundPlayer;
                            console.log(`Found player via direct search: ${savedCell.name}`, {
                              pid: player.pid,
                              hasImgURL: !!player.imgURL,
                              hasFace: !!player.face,
                            });
                          }
                        }
                      }

                      restoredCells[key] = {
                        name: savedCell.name,
                        correct: savedCell.correct,
                        locked: savedCell.locked || true,
                        autoFilled: savedCell.autoFilled || false,
                        guessed: savedCell.guessed || false,
                        points: savedCell.points || 0,
                        rarity: savedCell.rarity,
                        usedHint: savedCell.usedHint || false,
                        player: player, // Add the player object
                      };
                    });

                    // Update grid state
                    setRows(restoredRows);
                    setCols(restoredCols);
                    setCells(restoredCells);
                    setIntersections({}); // Clear intersections since grid is already complete
                    setGiveUpPressed(entry.usedGiveUp);
                    setAttemptCount(entry.attemptCount);

                    // Set grid ID for tracking
                    const gridId = `${restoredRows.map(r => r.key).join('-')}_${restoredCols.map(c => c.key).join('-')}`;
                    setCurrentGridId(gridId);

                    // Mark as already saved so we don't re-save when viewing history
                    const gridCompletionId = `${restoredRows.map(r => r.key).join('-')}_${restoredCols.map(c => c.key).join('-')}_${entry.score}_${entry.correctGuesses}_${entry.attemptCount}_${entry.usedGiveUp}`;
                    lastSavedGridRef.current = gridCompletionId;

                    // Clear any used players set for this restored grid
                    const usedPlayerIds = new Set<number>();
                    Object.values(restoredCells).forEach(cell => {
                      if (cell.player?.pid) {
                        usedPlayerIds.add(cell.player.pid);
                      }
                    });
                    setUsedPids(usedPlayerIds);

                    // Close the modal
                    clearModals();
                  }
                }}
                onDeleteHistory={async () => {
                  if (currentFingerprintId) {
                    await deleteLeagueGridHistory(currentFingerprintId);
                    // Reload history after deletion
                    const allHistory = await loadGridHistory();
                    const filteredHistory = allHistory.filter(
                      entry => entry.leagueFingerprintId === currentFingerprintId
                    );
                    setGridHistory(filteredHistory);
                  }
                }}
                onDeleteBelowThreshold={async (threshold) => {
                  if (currentFingerprintId) {
                    await deleteLeagueGridHistoryBelowThreshold(currentFingerprintId, threshold);
                    // Reload history after deletion
                    const allHistory = await loadGridHistory();
                    const filteredHistory = allHistory.filter(
                      entry => entry.leagueFingerprintId === currentFingerprintId
                    );
                    setGridHistory(filteredHistory);
                  }
                }}
              />
            );
          }
          return null;
        })}
      </main>
    </div>
  );
}
