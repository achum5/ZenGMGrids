import type { LeagueData, CatTeam, Player } from '@/types/bbgm';
import { getViableAchievements, playerMeetsAchievement, getAchievements, type Achievement } from '@/lib/achievements';
import { evaluateConstraintPair, GridConstraint } from '@/lib/feedback';
import { getSeasonEligiblePlayers, type SeasonAchievementId, SEASON_ACHIEVEMENTS } from './season-achievements';

// Simple session-based memory to avoid immediate repetition  
const recentlyUsedTeams = new Set<number>();
const recentlyUsedAchievements = new Set<string>();

// Clear memory to allow season achievements to appear
export function clearRecentMemory() {
  recentlyUsedTeams.clear();
  recentlyUsedAchievements.clear();
}
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
  
  // Retry logic to ensure all intersections have eligible players - with maximum attempt limit
  const MAX_ATTEMPTS = 200;
  let attempt = 0;
  let lastError: Error | null = null;
  
  while (attempt < MAX_ATTEMPTS) {
    try {
      const result = attemptGridGeneration(leagueData);
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

function attemptGridGeneration(leagueData: LeagueData): {
  rows: CatTeam[];
  cols: CatTeam[];
  intersections: Record<string, number[]>;
} {
  const { players, teams, sport, seasonIndex } = leagueData;
  // Get viable achievements - use sport-specific minimum requirements to avoid infinite loops
  const minPlayersRequired = sport === 'hockey' ? 3 : 5; // Lower requirement for hockey due to fewer players
  const viableAchievements = getViableAchievements(players, minPlayersRequired, sport, seasonIndex);
  
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
      const isSeasonAchievement = SEASON_ACHIEVEMENTS.some(sa => sa.id === achievement.achievementId);
      
      // COMPLETELY BYPASS team coverage for stat achievements and season-specific achievements
      if (isStatAchievement || isSeasonAchievement) {
        const type = isSeasonAchievement ? 'Season-specific' : 'Stat';
        console.log(`${type} achievement ${achievement.achievementId}: BYPASSING coverage check, always viable=true`);
        return true; // Always allow stat and season achievements regardless of team coverage
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
  for (const [playerId, cells] of playerCellMap) {
    if (cells.length > 1) {
      const cellDescriptions = cells.map(c => `${c.rowLabel} × ${c.colLabel}`).join(', ');
      throw new Error(`Grid is unsolvable: Player ${playerId} is the only eligible option for multiple cells: ${cellDescriptions}. This creates an impossible constraint.`);
    }
  }
  
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
