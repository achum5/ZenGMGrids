import type { LeagueData, CatTeam, Player, Team } from '@/types/bbgm';
import { getViableAchievements, playerMeetsAchievement, getAchievements, type Achievement } from '@/lib/achievements';
import { evaluateConstraintPair, GridConstraint } from '@/lib/feedback';
import { getSeasonEligiblePlayers, type SeasonAchievementId, type SeasonIndex, SEASON_ACHIEVEMENTS } from './season-achievements';

// Simple session-based memory to avoid immediate repetition
const recentlyUsedTeams = new Set<number>();
const recentlyUsedAchievements = new Set<string>();
const maxRecentItems = 8; // Remember last 8 items to avoid immediate reuse

function addToRecentlyUsed(teams: CatTeam[], achievements: CatTeam[]) {
  teams.forEach(team => {
    if (team.tid !== undefined) {
      recentlyUsedTeams.add(team.tid);
      if (recentlyUsedTeams.size > maxRecentItems) {
        const firstItem = recentlyUsedTeams.values().next().value;
        if (firstItem !== undefined) {
          recentlyUsedTeams.delete(firstItem);
        }
      }
    }
  });
  
  achievements.forEach(achievement => {
    if (achievement.achievementId !== undefined) {
      recentlyUsedAchievements.add(achievement.achievementId);
      if (recentlyUsedAchievements.size > maxRecentItems) {
        const firstItem = recentlyUsedAchievements.values().next().value;
        if (firstItem !== undefined) {
          recentlyUsedAchievements.delete(firstItem);
        }
      }
    }
  });
}

export function generateTeamsGrid(leagueData: LeagueData): {
  rows: CatTeam[];
  cols: CatTeam[];
  intersections: Record<string, number[]>;
} {
  const { players, teams, sport } = leagueData;
  
  console.log(`🎯 STARTING GRID GENERATION for ${sport} (${players.length} players, ${teams.length} teams)`);
  
  // Season count gate: compute unique seasons
  const uniqueSeasons = new Set<number>();
  players.forEach(player => {
    if (player.stats) {
      player.stats.forEach(stat => uniqueSeasons.add(stat.season));
    }
    if (player.awards) {
      player.awards.forEach(award => uniqueSeasons.add(award.season));
    }
  });

  console.log(`Unique seasons found: ${uniqueSeasons.size}`);

  // If < 50 seasons, use old random builder without season-specific achievements
  if (uniqueSeasons.size < 50) {
    console.log('Using old random builder (< 50 seasons)');
    return generateGridOldRandom(leagueData);
  }

  // If >= 50 seasons and basketball, football, or hockey, use new seeded builder
  if ((sport === 'basketball' || sport === 'football' || sport === 'hockey') && leagueData.seasonIndex) {
    console.log(`Using new seeded coverage-aware builder (>= 50 seasons, ${sport})`);
    return generateGridSeeded(leagueData);
  }

  // Fallback to old builder for other sports or insufficient seasons
  console.log('Using old random builder (fallback)');
  return generateGridOldRandom(leagueData);
}

function generateGridOldRandom(leagueData: LeagueData): {
  rows: CatTeam[];
  cols: CatTeam[];
  intersections: Record<string, number[]>;
} {
  // Retry logic to ensure all intersections have eligible players - with maximum attempt limit
  const MAX_ATTEMPTS = 200;
  let attempt = 0;
  let lastError: Error | null = null;
  
  while (attempt < MAX_ATTEMPTS) {
    try {
      const result = attemptGridGenerationOldRandom(leagueData);
      console.log(`✅ GRID GENERATION SUCCESSFUL after ${attempt + 1} attempts`);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`Grid generation attempt ${attempt + 1} failed: ${lastError.message}`);
    }
    attempt++;
  }
  
  // If we reach here, all attempts failed
  console.error(`❌ GRID GENERATION FAILED after ${MAX_ATTEMPTS} attempts`);
  throw new Error(`Unable to generate valid grid after ${MAX_ATTEMPTS} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
}

function attemptGridGenerationOldRandom(leagueData: LeagueData): {
  rows: CatTeam[];
  cols: CatTeam[];
  intersections: Record<string, number[]>;
} {
  const { players, teams, sport, seasonIndex } = leagueData;
  // Get viable achievements - use sport-specific minimum requirements to avoid infinite loops
  // For old random builder, exclude season-specific achievements
  const minPlayersRequired = sport === 'hockey' ? 3 : 5; // Lower requirement for hockey due to fewer players
  const allAchievements = getViableAchievements(players, minPlayersRequired, sport, seasonIndex);
  
  // Filter out season-specific achievements for old builder
  const viableAchievements = allAchievements.filter(achievement => 
    !SEASON_ACHIEVEMENTS.some(sa => sa.id === achievement.id)
  );
  
  // Log all achievement counts for debugging - only check sport-specific achievements
  console.log('=== ACHIEVEMENT COUNTS ===');
  const sportAchievements = getAchievements(sport);
  sportAchievements.forEach((achievement: Achievement) => {
    const count = players.filter(p => p.achievements && (p.achievements as any)[achievement.id]).length;
    const viable = count >= 15 ? '✓' : '✗';
    console.log(`${viable} ${achievement.id}: ${count} players`);
  });
  console.log('==========================');
  
  // Create constraint pool (teams + achievements)
  const teamConstraints: CatTeam[] = teams.map(team => ({
    key: `team-${team.tid}`,
    label: `${team.region || team.abbrev} ${team.name}`,
    tid: team.tid,
    type: 'team',
    test: (p: Player) => p.teamsPlayed.has(team.tid),
  }));

  const achievementConstraints: CatTeam[] = viableAchievements.map(achievement => ({
    key: `achievement-${achievement.id}`,
    label: achievement.label,
    achievementId: achievement.id,
    type: 'achievement',
    test: (p: Player) => playerMeetsAchievement(p, achievement.id),
  }));

  if (teamConstraints.length < 3) {
    throw new Error(`Need at least 3 teams to generate grid (found ${teamConstraints.length})`);
  }

  if (achievementConstraints.length < 2) {
    throw new Error(`Need at least 2 viable achievements to generate grid (found ${achievementConstraints.length})`);
  }

  // Determine number of achievements (2 or 3)
  const numAchievements = Math.random() < 0.5 ? 2 : 3;
  const numTeams = 6 - numAchievements;

  // Define draft achievements that should not appear together
  const draftAchievements = new Set(['isPick1Overall', 'isFirstRoundPick', 'isSecondRoundPick', 'isUndrafted', 'draftedTeen']);
  
  // Helper function to ensure only one draft achievement in selection
  const ensureOnlyOneDraftAchievement = (achievements: CatTeam[]): CatTeam[] => {
    const draftAchs = achievements.filter(a => draftAchievements.has(a.achievementId!));
    const nonDraftAchs = achievements.filter(a => !draftAchievements.has(a.achievementId!));
    
    if (draftAchs.length <= 1) {
      return achievements; // Already compliant
    }
    
    // Keep only the first draft achievement, replace others with non-draft ones
    const selectedDraft = draftAchs[0];
    const availableNonDraft = achievementConstraints.filter(a => 
      !draftAchievements.has(a.achievementId!) && 
      !nonDraftAchs.some(selected => selected.achievementId === a.achievementId)
    );
    
    // Build final selection: one draft + non-draft achievements
    const result = [selectedDraft, ...nonDraftAchs];
    
    // Fill remaining slots with non-draft achievements if needed
    const needed = achievements.length - result.length;
    if (needed > 0 && availableNonDraft.length >= needed) {
      result.push(...availableNonDraft.slice(0, needed));
    }
    
    return result.slice(0, achievements.length);
  };

  // Pre-validate achievement-team combinations to avoid impossible grids
  const preValidateIntersection = (achievement: CatTeam, team: CatTeam): boolean => {
    // Check if this is a season-specific achievement
    const isSeasonAchievement = SEASON_ACHIEVEMENTS.some(sa => sa.id === achievement.achievementId);
    
    if (isSeasonAchievement && seasonIndex && sport === 'basketball') {
      // Use season harmonization for season-specific achievements
      const seasonAchievementId = achievement.achievementId as SeasonAchievementId;
      const eligiblePids = getSeasonEligiblePlayers(seasonIndex, team.tid!, seasonAchievementId);
      return eligiblePids.size > 0;
    } else {
      // Use traditional validation for career achievements
      const eligiblePlayers = players.filter(p => 
        playerMeetsAchievement(p, achievement.achievementId!) && 
        p.teamsPlayed.has(team.tid!)
      );
      return eligiblePlayers.length > 0;
    }
  };

  // Smart random selection: filter out low-coverage achievements, then randomize
  let selectedAchievements: CatTeam[] = [];
  if (leagueData.teamOverlaps && Object.keys(leagueData.teamOverlaps.achievementTeamCounts).length > 0) {
    // Filter achievements to only those with decent team coverage
    // Lower requirement for stat achievements since they're rarer but valuable
    const viableAchievements = achievementConstraints.filter(achievement => {
      const teamCoverage = leagueData.teamOverlaps!.achievementTeamCounts[achievement.achievementId!] || 0;
      const isStatAchievement = achievement.achievementId!.includes('career') || achievement.achievementId!.includes('season');
      
      // COMPLETELY BYPASS team coverage for stat achievements
      if (isStatAchievement) {
        console.log(`Stat achievement ${achievement.achievementId}: BYPASSING coverage check, always viable=true`);
        return true; // Always allow stat achievements regardless of team coverage
      }
      
      // Only apply team coverage filtering to non-stat achievements
      return teamCoverage >= 3;
    });
    
    // Separate recently used vs fresh achievements
    const freshAchievements = viableAchievements.filter(a => 
      !recentlyUsedAchievements.has(a.achievementId!)
    );
    const recentAchievements = viableAchievements.filter(a => 
      recentlyUsedAchievements.has(a.achievementId!)
    );
    
    // Prefer fresh achievements, but use recent ones if needed
    if (freshAchievements.length >= numAchievements) {
      // We have enough fresh achievements, use only those
      selectedAchievements = freshAchievements
        .sort(() => Math.random() - 0.5)
        .slice(0, numAchievements);
    } else if (viableAchievements.length >= numAchievements) {
      // Mix fresh and recent achievements
      const neededFresh = Math.min(freshAchievements.length, numAchievements);
      const neededRecent = numAchievements - neededFresh;
      
      selectedAchievements = [
        ...freshAchievements.sort(() => Math.random() - 0.5).slice(0, neededFresh),
        ...recentAchievements.sort(() => Math.random() - 0.5).slice(0, neededRecent)
      ];
    } else {
      // Not enough high-coverage achievements, include some with lower coverage
      const allByTeamCoverage = achievementConstraints
        .map(achievement => ({
          achievement,
          teamCoverage: leagueData.teamOverlaps!.achievementTeamCounts[achievement.achievementId!] || 0
        }))
        .sort((a, b) => b.teamCoverage - a.teamCoverage);
      
      selectedAchievements = allByTeamCoverage
        .slice(0, numAchievements)
        .map(item => item.achievement);
    }
  } else {
    // Fallback: random selection
    selectedAchievements = achievementConstraints
      .sort(() => Math.random() - 0.5)
      .slice(0, numAchievements);
  }
  
  // Ensure only one draft achievement is selected
  selectedAchievements = ensureOnlyOneDraftAchievement(selectedAchievements);
  
  // Use pre-analyzed team overlap data for intelligent team selection
  const { teamOverlaps } = leagueData;
  const selectedTeams: CatTeam[] = [];
  
  if (teamOverlaps && teamOverlaps.viableTeamPairs.length > 0) {
    // Smart team selection: pre-validate all achievement-team combinations
    const viableTeamConstraints = teamConstraints.filter(teamConstraint => {
      // Check if this team has valid intersections with ALL selected achievements
      return selectedAchievements.every(achievement => 
        preValidateIntersection(achievement, teamConstraint)
      );
    });
    
    // Separate recently used vs fresh teams for variety
    const freshTeams = viableTeamConstraints.filter(tc => !recentlyUsedTeams.has(tc.tid!));
    const recentTeams = viableTeamConstraints.filter(tc => recentlyUsedTeams.has(tc.tid!));
    
    // Prefer fresh teams, but use recent ones if needed
    if (freshTeams.length >= numTeams) {
      // We have enough fresh teams, use only those
      selectedTeams.push(...freshTeams
        .sort(() => Math.random() - 0.5)
        .slice(0, numTeams));
    } else if (viableTeamConstraints.length >= numTeams) {
      // Mix fresh and recent teams
      const neededFresh = Math.min(freshTeams.length, numTeams);
      const neededRecent = numTeams - neededFresh;
      
      selectedTeams.push(
        ...freshTeams.sort(() => Math.random() - 0.5).slice(0, neededFresh),
        ...recentTeams.sort(() => Math.random() - 0.5).slice(0, neededRecent)
      );
    } else {
      // Not enough viable teams, mix viable teams with some connected teams
      selectedTeams.push(...viableTeamConstraints);
      
      const additionalNeeded = numTeams - selectedTeams.length;
      if (additionalNeeded > 0) {
        const remainingTeams = teamConstraints.filter(tc => 
          !selectedTeams.some(st => st.tid === tc.tid)
        );
        const mostConnectedRemaining = teamOverlaps.mostConnectedTeams
          .map(tid => remainingTeams.find(tc => tc.tid === tid))
          .filter(Boolean)
          .slice(0, additionalNeeded) as CatTeam[];
        
        selectedTeams.push(...mostConnectedRemaining);
      }
    }
  } else {
    // Fallback: no overlap data available, use random selection
    console.log('⚠️ No team overlap data available, using random team selection');
    selectedTeams.push(...teamConstraints.sort(() => Math.random() - 0.5).slice(0, numTeams));
  }
  
  // Emergency fallback: if we still don't have enough teams, duplicate the most viable ones
  while (selectedTeams.length < numTeams && teamConstraints.length > 0) {
    console.log(`🚨 Not enough unique teams, duplicating viable teams (have ${selectedTeams.length}, need ${numTeams})`);
    const additionalTeams = teamConstraints.filter(tc => 
      !selectedTeams.some(st => st.tid === tc.tid)
    );
    if (additionalTeams.length === 0) {
      // If no more unique teams, start reusing the most connected ones
      selectedTeams.push(...selectedTeams.slice(0, numTeams - selectedTeams.length));
    } else {
      selectedTeams.push(...additionalTeams.slice(0, numTeams - selectedTeams.length));
    }
  }

  const allSelected = [...selectedAchievements, ...selectedTeams];

  // Apply distribution constraints based on number of achievements
  let rows: CatTeam[], cols: CatTeam[];

  if (numAchievements === 2) {
    // With 2 achievements: max 2 per row/column set (so max 2 in rows OR max 2 in cols)
    const achievementPositions = Math.random() < 0.5 ? 'rows' : 'cols';
    
    if (achievementPositions === 'rows') {
      // Both achievements in rows, teams in columns
      rows = [selectedTeams[0], ...selectedAchievements];
      cols = selectedTeams.slice(1, 4);
    } else {
      // Both achievements in columns, teams in rows  
      cols = [selectedTeams[0], ...selectedAchievements];
      rows = selectedTeams.slice(1, 4);
    }
  } else {
    // With 3 achievements: cannot all be in same dimension (max 2 per row/column set)
    // So must be split: 2 in one dimension, 1 in the other
    const twoInRows = Math.random() < 0.5;
    
    if (twoInRows) {
      // 2 achievements in rows, 1 in columns
      rows = [selectedTeams[0], ...selectedAchievements.slice(0, 2)];
      cols = [...selectedTeams.slice(1, 3), selectedAchievements[2]];
    } else {
      // 2 achievements in columns, 1 in rows
      cols = [selectedTeams[0], ...selectedAchievements.slice(0, 2)];
      rows = [...selectedTeams.slice(1, 3), selectedAchievements[2]];
    }
  }

  // Don't shuffle - keep teams first, then achievements order
  // rows.sort(() => Math.random() - 0.5);
  // cols.sort(() => Math.random() - 0.5);

  // Debug: Log the selected constraints
  console.log(`Selected: ${numAchievements} achievements, ${numTeams} teams`);
  console.log(`Rows (${rows.length}):`, rows.map(r => r.label));
  console.log(`Cols (${cols.length}):`, cols.map(c => c.label));
  
  // Log the achievement distribution for debugging
  const rowAchievements = rows.filter(r => r.type === 'achievement').length;
  const colAchievements = cols.filter(c => c.type === 'achievement').length;
  console.log(`Grid generated with ${numAchievements} total achievements: ${rowAchievements} in rows, ${colAchievements} in columns`);

  // Build intersections and validate
  const intersections: Record<string, number[]> = {};
  
  for (const row of rows) {
    for (const col of cols) {
      const cellKey = `${row.key}|${col.key}`;
      
      // Find players who satisfy both constraints using same-season alignment
      const rowConstraint: GridConstraint = {
        type: row.type,
        tid: row.tid,
        achievementId: row.achievementId,
        label: row.label
      };
      const colConstraint: GridConstraint = {
        type: col.type,
        tid: col.tid,
        achievementId: col.achievementId,
        label: col.label
      };
      
      // Pre-check for team × team intersections using pre-analyzed data
      if (rowConstraint.type === 'team' && colConstraint.type === 'team') {
        const teamA = Math.min(rowConstraint.tid!, colConstraint.tid!);
        const teamB = Math.max(rowConstraint.tid!, colConstraint.tid!);
        
        // Check if this team pair is in our viable pairs list
        const isViablePair = leagueData.teamOverlaps?.viableTeamPairs.some(
          pair => pair.teamA === teamA && pair.teamB === teamB
        ) || false;
        
        if (!isViablePair) {
          throw new Error(`No players found who played for both ${row.label} and ${col.label}`);
        }
      }
      
      // Pre-check for team × achievement intersections using pre-analyzed data
      if (rowConstraint.type === 'team' && colConstraint.type === 'achievement') {
        const achievementId = colConstraint.achievementId!;
        const teamId = rowConstraint.tid!;
        const hasPlayersWithAchievement = leagueData.teamOverlaps?.teamAchievementMatrix[achievementId]?.has(teamId) || false;
        
        // BYPASS pre-check for stat achievements since matrix may be incomplete
        const isStatAchievement = achievementId.includes('career') || achievementId.includes('season');
        if (!hasPlayersWithAchievement && !isStatAchievement) {
          throw new Error(`No eligible players for intersection ${row.label} × ${col.label}`);
        }
      }
      
      // Pre-check for achievement × team intersections using pre-analyzed data  
      if (rowConstraint.type === 'achievement' && colConstraint.type === 'team') {
        const achievementId = rowConstraint.achievementId!;
        const teamId = colConstraint.tid!;
        const hasPlayersWithAchievement = leagueData.teamOverlaps?.teamAchievementMatrix[achievementId]?.has(teamId) || false;
        
        // BYPASS pre-check for stat achievements since matrix may be incomplete
        const isStatAchievement = achievementId.includes('career') || achievementId.includes('season');
        if (!hasPlayersWithAchievement && !isStatAchievement) {
          throw new Error(`No eligible players for intersection ${row.label} × ${col.label}`);
        }
      }
      
      const eligiblePids = players
        .filter(p => evaluateConstraintPair(p, rowConstraint, colConstraint))
        .map(p => p.pid);
      
      if (eligiblePids.length === 0) {
        throw new Error(`No eligible players for intersection ${row.label} × ${col.label}`);
      }
      
      intersections[cellKey] = eligiblePids;
      console.log(`Intersection ${row.label} × ${col.label}: ${eligiblePids.length} eligible players`);
    }
  }
  
  // Validate grid solvability - check for conflicting single-player constraints
  const singlePlayerCells: Array<{cellKey: string, playerId: number, rowLabel: string, colLabel: string}> = [];
  
  for (const [cellKey, eligiblePids] of Object.entries(intersections)) {
    if (eligiblePids.length === 1) {
      const [rowKey, colKey] = cellKey.split('|');
      const row = rows.find(r => r.key === rowKey);
      const col = cols.find(c => c.key === colKey);
      singlePlayerCells.push({
        cellKey,
        playerId: eligiblePids[0],
        rowLabel: row?.label || rowKey,
        colLabel: col?.label || colKey
      });
    }
  }
  
  // Check for conflicting single-player constraints
  const playerCellMap = new Map<number, Array<{cellKey: string, rowLabel: string, colLabel: string}>>();
  for (const cell of singlePlayerCells) {
    if (!playerCellMap.has(cell.playerId)) {
      playerCellMap.set(cell.playerId, []);
    }
    playerCellMap.get(cell.playerId)!.push({
      cellKey: cell.cellKey,
      rowLabel: cell.rowLabel,
      colLabel: cell.colLabel
    });
  }
  
  // If any player is the only option for multiple cells, the grid is unsolvable
  playerCellMap.forEach((cells, playerId) => {
    if (cells.length > 1) {
      const cellDescriptions = cells.map((c: {cellKey: string, rowLabel: string, colLabel: string}) => `${c.rowLabel} × ${c.colLabel}`).join(', ');
      throw new Error(`Grid is unsolvable: Player ${playerId} is the only eligible option for multiple cells: ${cellDescriptions}. This creates an impossible constraint.`);
    }
  });
  
  console.log(`✅ Grid solvability validated: ${singlePlayerCells.length} single-player cells, no conflicts detected`);
  
  // Track used teams and achievements for variety in future generations
  const usedTeams = [...rows, ...cols].filter(item => item.type === 'team');
  const usedAchievements = [...rows, ...cols].filter(item => item.type === 'achievement');
  addToRecentlyUsed(usedTeams, usedAchievements);
  
  return { rows, cols, intersections };
}

export function cellKey(rowKey: string, colKey: string): string {
  return `${rowKey}|${colKey}`;
}

export function legacyCellKey(rowTid: number, colTid: number): string {
  return `${rowTid}|${colTid}`;
}

// New simplified seeded grid builder (for basketball with >= 12 seasons)
function generateGridSeeded(leagueData: LeagueData): {
  rows: CatTeam[];
  cols: CatTeam[];
  intersections: Record<string, number[]>;
} {
  const { players, teams, sport, seasonIndex } = leagueData;
  
  if (!seasonIndex) {
    throw new Error('Season index required for seeded builder');
  }
  
  console.log('🎯 Starting simplified seeded grid generation...');
  
  // Step 1: Pick layout randomly (seeded by current time)
  const ALLOWED_LAYOUTS = [
    { name: '1T2A×3T', rows: ['T', 'A', 'A'], cols: ['T', 'T', 'T'] },
    { name: '3T×1T2A', rows: ['T', 'T', 'T'], cols: ['T', 'A', 'A'] },
    { name: '2T1A×2T1A', rows: ['T', 'T', 'A'], cols: ['T', 'T', 'A'] },
    { name: '2T1A×1T2A', rows: ['T', 'T', 'A'], cols: ['T', 'A', 'A'] }
  ] as const;
  
  const gridId = Date.now().toString();
  const layoutIndex = simpleHash(gridId) % ALLOWED_LAYOUTS.length;
  const layout = ALLOWED_LAYOUTS[layoutIndex];
  console.log(`✅ Step 1: Selected layout: ${layout.name}`);
  
  // Step 2: Seed with one random season achievement
  let retryCount = 0;
  let seedAchievement: typeof SEASON_ACHIEVEMENTS[0];
  let seedSlot: { axis: 'row' | 'col', index: number };
  
  do {
    if (retryCount >= 10) {
      throw new Error('Could not find viable seed achievement after 10 tries');
    }
    
    // Find viable season achievements that have >= 3 eligible teams
    const viableSeasonAchievements = SEASON_ACHIEVEMENTS.filter(sa => {
      const eligibleTeams = getTeamsForAchievement(seasonIndex, sa.id);
      return eligibleTeams.size >= 3;
    });
    
    console.log(`Found ${viableSeasonAchievements.length} viable season achievements:`, viableSeasonAchievements.map(sa => sa.id));
    
    if (viableSeasonAchievements.length === 0) {
      throw new Error('No viable season achievements found for seeded generation');
    }
    
    // Pick random season achievement
    const achievementIndex = simpleHash(gridId + '_seed' + retryCount) % viableSeasonAchievements.length;
    seedAchievement = viableSeasonAchievements[achievementIndex];
    
    // Find achievement slots and pick one randomly
    const achievementSlots: Array<{ axis: 'row' | 'col', index: number }> = [];
    layout.rows.forEach((type, index) => {
      if (type === 'A') achievementSlots.push({ axis: 'row', index });
    });
    layout.cols.forEach((type, index) => {
      if (type === 'A') achievementSlots.push({ axis: 'col', index });
    });
    
    const slotIndex = simpleHash(gridId + '_slot' + retryCount) % achievementSlots.length;
    seedSlot = achievementSlots[slotIndex];
    
    // Check if this achievement has ≥3 eligible teams
    const eligibleTeams = getTeamsForAchievement(seasonIndex, seedAchievement.id);
    if (eligibleTeams.size >= 3) break;
    
    retryCount++;
  } while (retryCount < 10);
  
  console.log(`✅ Step 2: Seeded with ${seedAchievement.label} at ${seedSlot.axis} ${seedSlot.index}`);
  
  // Track used season achievements to prevent duplicates
  const usedSeasonAchievements = new Set<SeasonAchievementId>();
  usedSeasonAchievements.add(seedAchievement.id);
  
  // Initialize grid
  const rows: CatTeam[] = new Array(3);
  const cols: CatTeam[] = new Array(3);
  
  const seedConstraint: CatTeam = {
    type: 'achievement',
    achievementId: seedAchievement.id,
    label: seedAchievement.label,
    key: `achievement-${seedAchievement.id}`,
    test: (p: Player) => playerMeetsAchievement(p, seedAchievement.id),
  };
  
  if (seedSlot.axis === 'row') {
    rows[seedSlot.index] = seedConstraint;
  } else {
    cols[seedSlot.index] = seedConstraint;
  }
  
  // Step 3: Choose opposite axis to ensure seed has 3/3 coverage
  const oppositeAxis = seedSlot.axis === 'row' ? 'col' : 'row';
  const oppositeLayout = oppositeAxis === 'row' ? layout.rows : layout.cols;
  const oppositeArray = oppositeAxis === 'row' ? rows : cols;
  
  console.log(`✅ Step 3: Filling opposite ${oppositeAxis} with layout [${oppositeLayout.join(', ')}]`);
  
  const eligibleTeams = getTeamsForAchievement(seasonIndex, seedAchievement.id);
  const eligibleTeamsList = Array.from(eligibleTeams)
    .map(tid => teams.find(t => t.tid === tid))
    .filter(t => t) as Team[];
  
  // Shuffle teams for randomness
  for (let i = eligibleTeamsList.length - 1; i > 0; i--) {
    const j = Math.floor((simpleHash(gridId + '_shuffle' + i) / 2147483647) * (i + 1));
    [eligibleTeamsList[i], eligibleTeamsList[j]] = [eligibleTeamsList[j], eligibleTeamsList[i]];
  }
  
  let teamIndex = 0;
  
  for (let i = 0; i < 3; i++) {
    if (oppositeLayout[i] === 'T') {
      // Pick next team that has eligible players with seed
      const team = eligibleTeamsList[teamIndex];
      if (!team) {
        throw new Error(`Not enough eligible teams for seed ${seedAchievement.label}`);
      }
      
      oppositeArray[i] = {
        type: 'team',
        tid: team.tid,
        label: team.name || `Team ${team.tid}`,
        key: `team-${team.tid}`,
        test: (p: Player) => p.teamsPlayed.has(team.tid),
      };
      
      console.log(`   Filled ${oppositeAxis} ${i} with team: ${team.name || `Team ${team.tid}`}`);
      teamIndex++;
    } else if (oppositeLayout[i] === 'A') {
      // Pick achievement that has shared players in same season with seed
      const viableAchievements: (typeof SEASON_ACHIEVEMENTS[0] | Achievement)[] = [];
      
      // Skip season achievements entirely - only use career achievements for opposite axis
      // This prevents impossible season harmonization conflicts
      
      // Only try career achievements (get from achievements passed to function)
      const achievements = getAchievements('basketball');
      for (const ach of achievements) {
        if (ach.isSeasonSpecific) continue;
        
        // Check if any player has both seed achievement (any season) and this career achievement
        const seedPlayerIds = new Set<number>();
        for (const season of Object.keys(seasonIndex)) {
          const seasonData = seasonIndex[parseInt(season)];
          for (const teamId of Object.keys(seasonData)) {
            const teamData = seasonData[parseInt(teamId)];
            const achPlayers = teamData[seedAchievement.id] || new Set();
            for (const pid of Array.from(achPlayers)) {
              seedPlayerIds.add(pid);
            }
          }
        }
        
        const hasOverlap = players.some(p => seedPlayerIds.has(p.pid) && ach.test(p));
        if (hasOverlap) {
          viableAchievements.push(ach);
        }
      }
      
      if (viableAchievements.length === 0) {
        throw new Error(`No viable achievements found for opposite axis with seed ${seedAchievement.label}`);
      }
      
      const achIndex = simpleHash(gridId + '_oppach' + i) % viableAchievements.length;
      const selectedAch = viableAchievements[achIndex];
      
      oppositeArray[i] = {
        type: 'achievement',
        achievementId: selectedAch.id,
        label: selectedAch.label,
        key: `achievement-${selectedAch.id}`,
        test: (p: Player) => playerMeetsAchievement(p, selectedAch.id),
      };
      
      // Mark season achievement as used
      if (selectedAch.isSeasonSpecific) {
        usedSeasonAchievements.add(selectedAch.id as SeasonAchievementId);
      }
      
      console.log(`   Filled ${oppositeAxis} ${i} with achievement: ${selectedAch.label}`);
    }
  }
  
  // Step 4: Fill remaining slots using old-style approach
  console.log(`✅ Step 4: Filling remaining slots old-style`);
  
  // Only use career achievements for old-style fill to avoid season harmonization conflicts
  const allAchievements = getAchievements('basketball').filter(ach => !ach.isSeasonSpecific);
  
  // Find remaining empty slots
  for (let i = 0; i < 3; i++) {
    if (!rows[i]) {
      console.log(`   Filling empty row ${i} slot (type: ${layout.rows[i]})`);
      
      if (layout.rows[i] === 'T') {
        // Fill team slot - try up to 50 random teams
        let found = false;
        for (let attempt = 0; attempt < 50; attempt++) {
          const teamIndex = simpleHash(gridId + '_rowteam' + i + '_' + attempt) % teams.length;
          const team = teams[teamIndex];
          
          // Check if this team creates valid intersections with all columns
          let validForAllCols = true;
          
          for (let colIdx = 0; colIdx < 3; colIdx++) {
            const colConstraint = cols[colIdx];
            const intersection = calculateIntersectionSimple(
              { type: 'team', tid: team.tid, label: team.name || `Team ${team.tid}` },
              colConstraint,
              players,
              seasonIndex
            );
            
            if (intersection.length === 0) {
              validForAllCols = false;
              break;
            }
          }
          
          if (validForAllCols) {
            rows[i] = {
              type: 'team',
              tid: team.tid,
              label: team.name || `Team ${team.tid}`,
              key: `team-${team.tid}`,
              test: (p: Player) => p.teamsPlayed.has(team.tid),
            };
            console.log(`     Selected team: ${team.name || `Team ${team.tid}`} (attempt ${attempt + 1})`);
            found = true;
            break;
          }
        }
        
        if (!found) {
          throw new Error(`Could not find valid team for row ${i} after trying 50 candidates`);
        }
        
      } else if (layout.rows[i] === 'A') {
        // Fill achievement slot - try up to 50 random achievements
        let found = false;
        for (let attempt = 0; attempt < 50; attempt++) {
          const achIndex = simpleHash(gridId + '_rowach' + i + '_' + attempt) % allAchievements.length;
          const ach = allAchievements[achIndex];
          
          // Career achievements only - no season checks needed
          
          // Check if this achievement creates valid intersections with all columns
          let validForAllCols = true;
          
          for (let colIdx = 0; colIdx < 3; colIdx++) {
            const colConstraint = cols[colIdx];
            if (!colConstraint) continue; // Skip empty columns
            
            const intersection = calculateIntersectionSimple(
              { type: 'achievement', achievementId: ach.id, label: ach.label },
              colConstraint,
              players,
              seasonIndex
            );
            
            if (intersection.length === 0) {
              validForAllCols = false;
              break;
            }
          }
          
          if (validForAllCols) {
            rows[i] = {
              type: 'achievement',
              achievementId: ach.id,
              label: ach.label,
              key: `achievement-${ach.id}`,
              test: (p: Player) => playerMeetsAchievement(p, ach.id),
            };
            
            console.log(`     Selected achievement: ${ach.label} (attempt ${attempt + 1})`);
            found = true;
            break;
          }
        }
        
        if (!found) {
          throw new Error(`Could not find valid achievement for row ${i} after trying 50 candidates`);
        }
      }
    }
    
    if (!cols[i]) {
      console.log(`   Filling empty col ${i} slot (type: ${layout.cols[i]})`);
      
      if (layout.cols[i] === 'T') {
        // Fill team slot - try up to 50 random teams
        let found = false;
        for (let attempt = 0; attempt < 50; attempt++) {
          const teamIndex = simpleHash(gridId + '_colteam' + i + '_' + attempt) % teams.length;
          const team = teams[teamIndex];
          
          // Check if this team creates valid intersections with all rows
          let validForAllRows = true;
          
          for (let rowIdx = 0; rowIdx < 3; rowIdx++) {
            const rowConstraint = rows[rowIdx];
            const intersection = calculateIntersectionSimple(
              rowConstraint,
              { type: 'team', tid: team.tid, label: team.name || `Team ${team.tid}` },
              players,
              seasonIndex
            );
            
            if (intersection.length === 0) {
              validForAllRows = false;
              break;
            }
          }
          
          if (validForAllRows) {
            cols[i] = {
              type: 'team',
              tid: team.tid,
              label: team.name || `Team ${team.tid}`,
              key: `team-${team.tid}`,
              test: (p: Player) => p.teamsPlayed.has(team.tid),
            };
            console.log(`     Selected team: ${team.name || `Team ${team.tid}`} (attempt ${attempt + 1})`);
            found = true;
            break;
          }
        }
        
        if (!found) {
          throw new Error(`Could not find valid team for col ${i} after trying 50 candidates`);
        }
        
      } else if (layout.cols[i] === 'A') {
        // Fill achievement slot - try up to 50 random achievements
        let found = false;
        for (let attempt = 0; attempt < 50; attempt++) {
          const achIndex = simpleHash(gridId + '_colach' + i + '_' + attempt) % allAchievements.length;
          const ach = allAchievements[achIndex];
          
          // Career achievements only - no season checks needed
          
          // Check if this achievement creates valid intersections with all rows
          let validForAllRows = true;
          
          for (let rowIdx = 0; rowIdx < 3; rowIdx++) {
            const rowConstraint = rows[rowIdx];
            if (!rowConstraint) continue; // Skip empty rows
            
            const intersection = calculateIntersectionSimple(
              rowConstraint,
              { type: 'achievement', achievementId: ach.id, label: ach.label },
              players,
              seasonIndex
            );
            
            if (intersection.length === 0) {
              validForAllRows = false;
              break;
            }
          }
          
          if (validForAllRows) {
            cols[i] = {
              type: 'achievement',
              achievementId: ach.id,
              label: ach.label,
              key: `achievement-${ach.id}`,
              test: (p: Player) => playerMeetsAchievement(p, ach.id),
            };
            
            console.log(`     Selected achievement: ${ach.label} (attempt ${attempt + 1})`);
            found = true;
            break;
          }
        }
        
        if (!found) {
          throw new Error(`Could not find valid achievement for col ${i} after trying 50 candidates`);
        }
      }
    }
  }
  
  console.log(`✅ Grid complete: ${layout.name}`);
  console.log(`   Rows: ${rows.map(r => r.label).join(', ')}`);
  console.log(`   Cols: ${cols.map(c => c.label).join(', ')}`);
  
  // Calculate all intersections
  const intersections: Record<string, number[]> = {};
  
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const key = `${rows[row].key}|${cols[col].key}`;
      const eligiblePlayers = calculateIntersectionSimple(rows[row], cols[col], players, seasonIndex);
      intersections[key] = eligiblePlayers.map((p: Player) => p.pid);
      console.log(`Intersection ${rows[row].label} × ${cols[col].label}: ${eligiblePlayers.length} eligible players`);
    }
  }
  
  console.log('✅ Simplified seeded grid generated successfully');
  
  return { rows, cols, intersections };
}

// Simple hash function for seeded randomness
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Get teams that have players for a specific achievement (missing function)
function getTeamsForAchievement(seasonIndex: SeasonIndex, achievementId: SeasonAchievementId): Set<number> {
  const teams = new Set<number>();
  
  for (const season of Object.values(seasonIndex)) {
    for (const [teamId, teamData] of Object.entries(season)) {
      if (teamData[achievementId] && teamData[achievementId].size > 0) {
        teams.add(parseInt(teamId));
      }
    }
  }
  
  return teams;
}

// Helper function to calculate intersection between two constraints (simplified version)
function calculateIntersectionSimple(
  rowConstraint: any,
  colConstraint: any,
  players: Player[],
  seasonIndex?: SeasonIndex
): Player[] {
  const rowIsSeasonAchievement = rowConstraint.type === 'achievement' && 
    SEASON_ACHIEVEMENTS.some(sa => sa.id === rowConstraint.achievementId);
  const colIsSeasonAchievement = colConstraint.type === 'achievement' && 
    SEASON_ACHIEVEMENTS.some(sa => sa.id === colConstraint.achievementId);
  
  if (rowIsSeasonAchievement && colConstraint.type === 'team') {
    // Season achievement × team
    if (!seasonIndex) return [];
    const eligiblePids = getSeasonEligiblePlayers(seasonIndex, colConstraint.tid!, rowConstraint.achievementId as SeasonAchievementId);
    return players.filter(p => eligiblePids.has(p.pid));
  } else if (colIsSeasonAchievement && rowConstraint.type === 'team') {
    // Team × season achievement  
    if (!seasonIndex) return [];
    const eligiblePids = getSeasonEligiblePlayers(seasonIndex, rowConstraint.tid!, colConstraint.achievementId as SeasonAchievementId);
    return players.filter(p => eligiblePids.has(p.pid));
  } else if (rowIsSeasonAchievement && colIsSeasonAchievement) {
    // Season achievement × season achievement
    if (!seasonIndex) return [];
    
    if (rowConstraint.achievementId === colConstraint.achievementId) {
      // Same achievement - find all players who have it
      const eligiblePids = new Set<number>();
      for (const seasonStr of Object.keys(seasonIndex)) {
        const season = parseInt(seasonStr);
        const seasonData = seasonIndex[season];
        for (const teamStr of Object.keys(seasonData)) {
          const teamId = parseInt(teamStr);
          const teamData = seasonData[teamId];
          if (teamData[rowConstraint.achievementId as SeasonAchievementId]) {
            const achievementPids = teamData[rowConstraint.achievementId as SeasonAchievementId];
            achievementPids.forEach(pid => eligiblePids.add(pid));
          }
        }
      }
      return players.filter(p => eligiblePids.has(p.pid));
    } else {
      // Different achievements - find players who have both in the same season
      const eligiblePids = new Set<number>();
      for (const seasonStr of Object.keys(seasonIndex)) {
        const season = parseInt(seasonStr);
        const seasonData = seasonIndex[season];
        for (const teamStr of Object.keys(seasonData)) {
          const teamId = parseInt(teamStr);
          const teamData = seasonData[teamId];
          const rowPids = teamData[rowConstraint.achievementId as SeasonAchievementId] || new Set();
          const colPids = teamData[colConstraint.achievementId as SeasonAchievementId] || new Set();
          
          // Find intersection - players who have both achievements with this team in this season
          for (const pid of Array.from(rowPids)) {
            if (colPids.has(pid)) {
              eligiblePids.add(pid);
            }
          }
        }
      }
      return players.filter(p => eligiblePids.has(p.pid));
    }
  } else if (rowConstraint.type === 'team' && colConstraint.type === 'team') {
    // Team × team - players who played for both teams
    return players.filter(p => {
      return p.teamsPlayed.has(rowConstraint.tid) && p.teamsPlayed.has(colConstraint.tid);
    });
  } else if (rowConstraint.type === 'team' && colConstraint.type === 'achievement' && !colIsSeasonAchievement) {
    // Team × career achievement
    return players.filter(p => {
      return p.teamsPlayed.has(rowConstraint.tid) && playerMeetsAchievement(p, colConstraint.achievementId);
    });
  } else if (rowConstraint.type === 'achievement' && !rowIsSeasonAchievement && colConstraint.type === 'team') {
    // Career achievement × team
    return players.filter(p => {
      return playerMeetsAchievement(p, rowConstraint.achievementId) && p.teamsPlayed.has(colConstraint.tid);
    });
  } else if (rowConstraint.type === 'achievement' && !rowIsSeasonAchievement && colConstraint.type === 'achievement' && !colIsSeasonAchievement) {
    // Career achievement × career achievement
    return players.filter(p => {
      return playerMeetsAchievement(p, rowConstraint.achievementId) && playerMeetsAchievement(p, colConstraint.achievementId);
    });
  } else if (rowConstraint.type === 'achievement' && !rowIsSeasonAchievement && colConstraint.type === 'achievement' && colIsSeasonAchievement) {
    // Career achievement × season achievement
    if (!seasonIndex) return [];
    
    // Find players who meet the career achievement AND have the season achievement
    return players.filter(p => {
      if (!playerMeetsAchievement(p, rowConstraint.achievementId)) return false;
      
      // Check if this player has the season achievement in any season/team
      for (const seasonStr of Object.keys(seasonIndex)) {
        const season = parseInt(seasonStr);
        const seasonData = seasonIndex[season];
        for (const teamStr of Object.keys(seasonData)) {
          const teamId = parseInt(teamStr);
          const teamData = seasonData[teamId];
          const seasonAchPlayers = teamData[colConstraint.achievementId as SeasonAchievementId] || new Set();
          if (seasonAchPlayers.has(p.pid)) {
            return true;
          }
        }
      }
      return false;
    });
  } else if (rowConstraint.type === 'achievement' && rowIsSeasonAchievement && colConstraint.type === 'achievement' && !colIsSeasonAchievement) {
    // Season achievement × career achievement  
    if (!seasonIndex) return [];
    
    // Find players who meet the career achievement AND have the season achievement
    return players.filter(p => {
      if (!playerMeetsAchievement(p, colConstraint.achievementId)) return false;
      
      // Check if this player has the season achievement in any season/team
      for (const seasonStr of Object.keys(seasonIndex)) {
        const season = parseInt(seasonStr);
        const seasonData = seasonIndex[season];
        for (const teamStr of Object.keys(seasonData)) {
          const teamId = parseInt(teamStr);
          const teamData = seasonData[teamId];
          const seasonAchPlayers = teamData[rowConstraint.achievementId as SeasonAchievementId] || new Set();
          if (seasonAchPlayers.has(p.pid)) {
            return true;
          }
        }
      }
      return false;
    });
  }
  
  return [];
}

// Build opposite axis to ensure seed has 3/3 coverage (simplified implementation)
function buildOppositeAxisForSeed(
  layout: { name: string; rows: readonly string[]; cols: readonly string[] },
  seedSlot: { axis: 'row' | 'col'; index: number },
  seedAchievement: { id: SeasonAchievementId; name: string },
  eligibleTeams: number[],
  teams: Team[],
  players: Player[],
  seasonIndex: SeasonIndex
): { rows: CatTeam[]; cols: CatTeam[]; intersections: Record<string, number[]> } {
  
  // Create arrays for the final result
  const rows: CatTeam[] = new Array(3);
  const cols: CatTeam[] = new Array(3);
  
  // Fill in the seed achievement first
  const seedConstraint: CatTeam = {
    key: `achievement-${seedAchievement.id}`,
    label: seedAchievement.name,
    achievementId: seedAchievement.id,
    type: 'achievement',
    test: (p: Player) => playerMeetsAchievement(p, seedAchievement.id),
  };
  
  if (seedSlot.axis === 'row') {
    rows[seedSlot.index] = seedConstraint;
  } else {
    cols[seedSlot.index] = seedConstraint;
  }
  
  // Count total team slots needed across both axes
  const totalTeamSlotsNeeded = layout.rows.filter(r => r === 'T').length + layout.cols.filter(c => c === 'T').length;
  console.log(`Total team slots needed: ${totalTeamSlotsNeeded} (${layout.rows.filter(r => r === 'T').length} in rows + ${layout.cols.filter(c => c === 'T').length} in cols)`);
  
  // Choose DISTINCT teams from eligible teams for ALL team slots
  const selectedTeamIds = new Set<number>();
  const selectedTeams: CatTeam[] = [];
  
  for (const tid of eligibleTeams) {
    if (selectedTeams.length >= totalTeamSlotsNeeded) break;
    if (selectedTeamIds.has(tid)) continue; // Skip duplicates
    
    const team = teams.find(t => t.tid === tid);
    if (!team) continue;
    
    selectedTeamIds.add(tid);
    selectedTeams.push({
      key: `team-${tid}`,
      label: `${team.region || team.abbrev} ${team.name}`,
      tid,
      type: 'team' as const,
      test: (p: Player) => p.teamsPlayed.has(tid),
    });
  }
  
  if (selectedTeams.length < totalTeamSlotsNeeded) {
    throw new Error(`Need at least ${totalTeamSlotsNeeded} different teams for this layout, only found ${selectedTeams.length}`);
  }
  
  console.log(`Selected ${selectedTeams.length} teams: ${selectedTeams.map(t => t.label).join(', ')}`);
  
  // Fill BOTH axes completely according to their layouts
  console.log(`Layout: ${layout.name} - Rows: [${layout.rows.join(', ')}], Cols: [${layout.cols.join(', ')}]`);
  console.log(`Seed: ${seedAchievement.name} at ${seedSlot.axis} ${seedSlot.index}`);
  
  // Fill all team slots first
  let teamIndex = 0;
  
  // Fill column team slots
  for (let i = 0; i < 3; i++) {
    if (layout.cols[i] === 'T') {
      if (teamIndex < selectedTeams.length) {
        cols[i] = selectedTeams[teamIndex];
        console.log(`Filled col ${i} with team: ${selectedTeams[teamIndex].label}`);
        teamIndex++;
      }
    }
  }
  
  // Fill row team slots  
  for (let i = 0; i < 3; i++) {
    if (layout.rows[i] === 'T') {
      if (teamIndex < selectedTeams.length) {
        rows[i] = selectedTeams[teamIndex];
        console.log(`Filled row ${i} with team: ${selectedTeams[teamIndex].label}`);
        teamIndex++;
      } else {
        console.log(`ERROR: No more teams available for row ${i}, teamIndex=${teamIndex}, selectedTeams.length=${selectedTeams.length}`);
      }
    }
  }
  
  console.log(`After team filling - teamIndex: ${teamIndex}, rows filled: ${rows.filter(r => r).length}, cols filled: ${cols.filter(c => c).length}`);
  
  // Fill remaining slots with safe achievements/teams
  // For layouts with season achievements, use other season achievements to avoid mixing career/season
  // But don't reuse the seed achievement
  const availableSeasonAchievements = SEASON_ACHIEVEMENTS.filter((sa: any) => sa.id !== seedAchievement.id);
  const safeSeasonAchievement: CatTeam = availableSeasonAchievements.length > 0 ? {
    key: `achievement-${availableSeasonAchievements[0].id}`,
    label: availableSeasonAchievements[0].label || availableSeasonAchievements[0].id,
    achievementId: availableSeasonAchievements[0].id,
    type: 'achievement',
    test: (p: Player) => playerMeetsAchievement(p, availableSeasonAchievements[0].id),
  } : {
    key: 'achievement-AllStar',
    label: 'All-Star',
    achievementId: 'AllStar',
    type: 'achievement',
    test: (p: Player) => playerMeetsAchievement(p, 'AllStar'),
  };
  
  const safeCareerAchievement: CatTeam = {
    key: 'achievement-played10PlusSeasons',
    label: 'Played 10+ Seasons',
    achievementId: 'played10PlusSeasons',
    type: 'achievement',
    test: (p: Player) => playerMeetsAchievement(p, 'played10PlusSeasons'),
  };
  
  // Now fill all achievement slots
  console.log(`Filling achievement slots. Seed already placed: ${seedAchievement.name} at ${seedSlot.axis} ${seedSlot.index}`);
  
  // Track already used achievements
  const usedAchievementIds = new Set<string>();
  usedAchievementIds.add(seedAchievement.id); // Seed is already used
  
  let availableAchievementIndex = 0;
  
  // Fill row achievement slots
  for (let i = 0; i < 3; i++) {
    if (layout.rows[i] === 'A' && !rows[i]) {
      while (availableAchievementIndex < availableSeasonAchievements.length &&
             usedAchievementIds.has(availableSeasonAchievements[availableAchievementIndex].id)) {
        availableAchievementIndex++;
      }
      if (availableAchievementIndex < availableSeasonAchievements.length) {
        const achievement = availableSeasonAchievements[availableAchievementIndex];
        rows[i] = {
          key: `achievement-${achievement.id}`,
          label: achievement.label || achievement.id,
          achievementId: achievement.id,
          type: 'achievement',
          test: (p: Player) => playerMeetsAchievement(p, achievement.id),
        };
        usedAchievementIds.add(achievement.id);
        console.log(`Filled row ${i} with achievement: ${achievement.label || achievement.id}`);
        availableAchievementIndex++;
      } else {
        rows[i] = safeSeasonAchievement;
        console.log(`Filled row ${i} with fallback achievement: ${safeSeasonAchievement.label}`);
      }
    }
  }
  
  // Fill col achievement slots
  for (let i = 0; i < 3; i++) {
    if (layout.cols[i] === 'A' && !cols[i]) {
      while (availableAchievementIndex < availableSeasonAchievements.length &&
             usedAchievementIds.has(availableSeasonAchievements[availableAchievementIndex].id)) {
        availableAchievementIndex++;
      }
      if (availableAchievementIndex < availableSeasonAchievements.length) {
        const achievement = availableSeasonAchievements[availableAchievementIndex];
        cols[i] = {
          key: `achievement-${achievement.id}`,
          label: achievement.label || achievement.id,
          achievementId: achievement.id,
          type: 'achievement',
          test: (p: Player) => playerMeetsAchievement(p, achievement.id),
        };
        usedAchievementIds.add(achievement.id);
        console.log(`Filled col ${i} with achievement: ${achievement.label || achievement.id}`);
        availableAchievementIndex++;
      } else {
        cols[i] = safeSeasonAchievement;
        console.log(`Filled col ${i} with fallback achievement: ${safeSeasonAchievement.label}`);
      }
    }
  }
  
  // Validate that we have exactly 3 rows and 3 columns
  if (rows.length !== 3 || cols.length !== 3) {
    throw new Error(`Invalid grid dimensions: ${rows.length} rows, ${cols.length} cols (expected 3x3)`);
  }
  
  // Ensure all slots are filled
  for (let i = 0; i < 3; i++) {
    if (!rows[i] || !cols[i]) {
      throw new Error(`Grid has empty slots: row ${i} = ${!!rows[i]}, col ${i} = ${!!cols[i]}`);
    }
  }
  
  console.log(`Grid structure verified: 3x3 with unique constraints`);
  console.log(`Rows: ${rows.map(r => r.label).join(', ')}`);
  console.log(`Cols: ${cols.map(c => c.label).join(', ')}`);
  
  // Calculate intersections using the evaluation system
  const intersections: Record<string, number[]> = {};
  
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const key = `${rows[row].key}|${cols[col].key}`;
      const rowConstraint: GridConstraint = {
        type: rows[row].type,
        tid: rows[row].tid,
        achievementId: rows[row].achievementId,
        label: rows[row].label
      };
      const colConstraint: GridConstraint = {
        type: cols[col].type,
        tid: cols[col].tid,
        achievementId: cols[col].achievementId,
        label: cols[col].label
      };
      
      // Handle different constraint combinations
      let eligiblePlayers: Player[] = [];
      
      const rowIsSeasonAchievement = rowConstraint.type === 'achievement' && SEASON_ACHIEVEMENTS.some(sa => sa.id === rowConstraint.achievementId);
      const colIsSeasonAchievement = colConstraint.type === 'achievement' && SEASON_ACHIEVEMENTS.some(sa => sa.id === colConstraint.achievementId);
      
      if (rowIsSeasonAchievement && colConstraint.type === 'team') {
        // Season achievement × team
        const eligiblePids = getSeasonEligiblePlayers(seasonIndex, colConstraint.tid!, rowConstraint.achievementId as SeasonAchievementId);
        eligiblePlayers = players.filter(p => eligiblePids.has(p.pid));
      } else if (colIsSeasonAchievement && rowConstraint.type === 'team') {
        // Team × season achievement  
        const eligiblePids = getSeasonEligiblePlayers(seasonIndex, rowConstraint.tid!, colConstraint.achievementId as SeasonAchievementId);
        eligiblePlayers = players.filter(p => eligiblePids.has(p.pid));
      } else if (rowIsSeasonAchievement && colIsSeasonAchievement) {
        // Season achievement × season achievement
        if (rowConstraint.achievementId === colConstraint.achievementId) {
          // Same achievement - just find all players who have it
          const eligiblePids = new Set<number>();
          for (const seasonStr of Object.keys(seasonIndex)) {
            const season = parseInt(seasonStr);
            const seasonData = seasonIndex[season];
            for (const teamStr of Object.keys(seasonData)) {
              const teamId = parseInt(teamStr);
              const teamData = seasonData[teamId];
              if (teamData[rowConstraint.achievementId as SeasonAchievementId]) {
                const achievementPids = teamData[rowConstraint.achievementId as SeasonAchievementId];
                achievementPids.forEach(pid => eligiblePids.add(pid));
              }
            }
          }
          eligiblePlayers = players.filter(p => eligiblePids.has(p.pid));
        } else {
          // Different achievements - find players who have both in the same season
          const eligiblePids = new Set<number>();
          for (const seasonStr of Object.keys(seasonIndex)) {
            const season = parseInt(seasonStr);
            const seasonData = seasonIndex[season];
            for (const teamStr of Object.keys(seasonData)) {
              const teamId = parseInt(teamStr);
              const teamData = seasonData[teamId];
              const rowAchievementPids = teamData[rowConstraint.achievementId as SeasonAchievementId] || new Set();
              const colAchievementPids = teamData[colConstraint.achievementId as SeasonAchievementId] || new Set();
              
              // Find intersection of players who had both achievements in this season/team
              rowAchievementPids.forEach(pid => {
                if (colAchievementPids.has(pid)) {
                  eligiblePids.add(pid);
                }
              });
            }
          }
          eligiblePlayers = players.filter(p => eligiblePids.has(p.pid));
        }
      } else {
        // Standard evaluation for career achievements or mixed career/season
        eligiblePlayers = players.filter(p => 
          evaluateConstraintPair(p, rowConstraint, colConstraint)
        );
      }
      
      intersections[key] = eligiblePlayers.map(p => p.pid);
      console.log(`Intersection ${rows[row].label} × ${cols[col].label}: ${eligiblePlayers.length} eligible players`);
      
      if (eligiblePlayers.length === 0) {
        throw new Error(`No eligible players for intersection ${rows[row].label} × ${cols[col].label}`);
      }
    }
  }
  
  return { rows, cols, intersections };
}
