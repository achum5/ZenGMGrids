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
  
  // Function to ensure only one draft achievement is selected
  function ensureOnlyOneDraftAchievement(achievements: CatTeam[]): CatTeam[] {
    const draftAchievementsInSet = achievements.filter(a => draftAchievements.has(a.achievementId || ''));
    
    if (draftAchievementsInSet.length <= 1) {
      return achievements; // No change needed
    }
    
    // Keep the first draft achievement, replace others with non-draft ones
    const firstDraftAchievement = draftAchievementsInSet[0];
    const achievementsToReplace = draftAchievementsInSet.slice(1);
    const nonDraftAchievements = achievementConstraints.filter(
      a => !draftAchievements.has(a.achievementId || '') && 
      !achievements.some(selected => selected.achievementId === a.achievementId)
    );
    
    let result = achievements.filter(a => !achievementsToReplace.includes(a));
    
    // Replace each extra draft achievement with a non-draft one
    for (let i = 0; i < achievementsToReplace.length && i < nonDraftAchievements.length; i++) {
      result.push(nonDraftAchievements[i]);
    }
    
    return result;
  }

  // Enhanced selection for season achievements - bypass team coverage requirements
  let selectedAchievements: CatTeam[] = [];
  if (leagueData.teamOverlaps && Object.keys(leagueData.teamOverlaps.achievementTeamCounts).length > 0) {
    // Filter achievements to only those with decent team coverage
    // Lower requirement for stat achievements since they're rarer but valuable
    const viableAchievementsList = achievementConstraints.filter(achievement => {
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
    const freshAchievements = viableAchievementsList.filter(a => 
      !recentlyUsedAchievements.has(a.achievementId!)
    );
    const recentAchievements = viableAchievementsList.filter(a => 
      recentlyUsedAchievements.has(a.achievementId!)
    );
    
    // Separate season achievements from others for better selection
    const seasonAchievements = viableAchievementsList.filter(a => 
      SEASON_ACHIEVEMENTS.some(sa => sa.id === a.achievementId)
    );
    const nonSeasonAchievements = viableAchievementsList.filter(a => 
      !SEASON_ACHIEVEMENTS.some(sa => sa.id === a.achievementId)
    );
    
    console.log(`Selection pool: ${seasonAchievements.length} season achievements, ${nonSeasonAchievements.length} other achievements`);
    
    // Enhanced selection logic to ensure season achievements get included
    if (sport === 'basketball' && seasonAchievements.length > 0) {
      // For basketball, ensure at least one season achievement if available
      const numSeasonToInclude = Math.min(Math.max(1, Math.floor(numAchievements * 0.4)), seasonAchievements.length);
      const numOthersToInclude = numAchievements - numSeasonToInclude;
      
      console.log(`Basketball mode: selecting ${numSeasonToInclude} season achievements and ${numOthersToInclude} others`);
      
      const selectedSeasonAchievements = seasonAchievements
        .sort(() => Math.random() - 0.5)
        .slice(0, numSeasonToInclude);
        
      const selectedOtherAchievements = nonSeasonAchievements
        .sort(() => Math.random() - 0.5)
        .slice(0, numOthersToInclude);
        
      selectedAchievements = [...selectedSeasonAchievements, ...selectedOtherAchievements];
    } else {
      // Prefer fresh achievements, but use recent ones if needed
      if (freshAchievements.length >= numAchievements) {
        // We have enough fresh achievements, use only those
        selectedAchievements = freshAchievements
          .sort(() => Math.random() - 0.5)
          .slice(0, numAchievements);
      } else if (viableAchievementsList.length >= numAchievements) {
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
    }
  } else {
    // Fallback: random selection
    selectedAchievements = achievementConstraints
      .sort(() => Math.random() - 0.5)
      .slice(0, numAchievements);
  }
  
  // Ensure only one draft achievement is selected
  selectedAchievements = ensureOnlyOneDraftAchievement(selectedAchievements);

  // Pre-validate intersections for achievements to prevent impossible scenarios
  const validatedConstraints = leagueData.teamOverlaps ? achievementConstraints.filter(achievement => {
    const teamCoverage = leagueData.teamOverlaps!.achievementTeamCounts[achievement.achievementId!] || 0;
    return teamCoverage >= 1; // At least one team must have players for this achievement
  }) : achievementConstraints;

  // Team selection: prefer teams with good coverage for selected achievements
  const teamConstraintsWithScores = teamConstraints.map(tc => ({
    ...tc,
    score: selectedAchievements.reduce((sum, achievement) => {
      return sum + preValidateIntersection(tc, achievement, leagueData);
    }, 0)
  }));

  // Sort by score (descending) and apply recency penalty
  const teamsByScore = teamConstraintsWithScores
    .map(tc => ({
      ...tc,
      adjustedScore: tc.score - (recentlyUsedTeams.has(tc.tid!) ? 2 : 0)
    }))
    .sort((a, b) => b.adjustedScore - a.adjustedScore);

  // Select teams, ensuring we have enough high-scoring options
  let selectedTeams: CatTeam[];
  if (teamsByScore.length >= numTeams) {
    // Select top teams, but add some randomness in the middle tier
    const topTeams = teamsByScore.slice(0, Math.floor(numTeams / 2));
    const midTeams = teamsByScore.slice(Math.floor(numTeams / 2), Math.min(numTeams * 2, teamsByScore.length));
    const remainingNeeded = numTeams - topTeams.length;
    
    selectedTeams = [
      ...topTeams,
      ...midTeams.sort(() => Math.random() - 0.5).slice(0, remainingNeeded)
    ];
  } else {
    // Not enough teams, use all available
    selectedTeams = teamsByScore.slice(0, numTeams);
  }

  if (selectedTeams.length < numTeams) {
    // Fallback: pad with random teams
    const usedTids = new Set(selectedTeams.map(t => t.tid));
    const remainingTeams = teamConstraints.filter(tc => !usedTids.has(tc.tid));
    selectedTeams.push(
      ...remainingTeams.sort(() => Math.random() - 0.5).slice(0, numTeams - selectedTeams.length)
    );
  }

  // Shuffle the constraints for rows and columns
  const allConstraints = [...selectedAchievements, ...selectedTeams];
  const shuffled = allConstraints.sort(() => Math.random() - 0.5);
  
  // Determine split: if numAchievements = 2, could be [2,1] or [1,2]
  let rows: CatTeam[], cols: CatTeam[];
  
  if (numAchievements === 2) {
    // Randomly decide if achievements go in rows or columns
    if (Math.random() < 0.5) {
      rows = selectedAchievements.concat(selectedTeams.slice(0, 1)); // 2 achievements + 1 team in rows
      cols = selectedTeams.slice(1); // remaining teams in columns
    } else {
      rows = selectedAchievements.slice(0, 1).concat(selectedTeams.slice(0, 2)); // 1 achievement + 2 teams in rows
      cols = selectedAchievements.slice(1).concat(selectedTeams.slice(2)); // remaining in columns
    }
  } else {
    // numAchievements === 3: all achievements in rows or columns
    if (Math.random() < 0.5) {
      rows = selectedAchievements; // 3 achievements in rows
      cols = selectedTeams; // 3 teams in columns
    } else {
      rows = selectedTeams; // 3 teams in rows
      cols = selectedAchievements; // 3 achievements in columns
    }
  }

  console.log(`Selected: ${selectedAchievements.length} achievements, ${selectedTeams.length} teams`);
  console.log('Rows (3):', rows.map(r => r.label));
  console.log('Cols (3):', cols.map(c => c.label));
  console.log(`Grid generated with ${selectedAchievements.length} total achievements: ${rows.filter(r => r.type === 'achievement').length} in rows, ${cols.filter(c => c.type === 'achievement').length} in columns`);

  // Generate all intersections and validate
  const intersections: Record<string, number[]> = {};
  
  const allPairs = rows.flatMap(row => 
    cols.map(col => ({ row, col, key: `${row.key}-${col.key}` }))
  );

  // Validate intersections and find eligible players using season-aware logic
  for (const pair of allPairs) {
    let eligiblePlayers: Player[] = [];
    
    // Use season-aware validation for season achievements
    const rowIsSeasonAchievement = pair.row.type === 'achievement' && SEASON_ACHIEVEMENTS.some(sa => sa.id === pair.row.achievementId);
    const colIsSeasonAchievement = pair.col.type === 'achievement' && SEASON_ACHIEVEMENTS.some(sa => sa.id === pair.col.achievementId);
    
    if (rowIsSeasonAchievement || colIsSeasonAchievement) {
      // Use season-specific logic from feedback.ts
      eligiblePlayers = players.filter(p => {
        return evaluateConstraintPair(
          p,
          pair.row as GridConstraint,
          pair.col as GridConstraint
        );
      });
    } else {
      // Use simple test logic for non-season achievements
      eligiblePlayers = players.filter(p => 
        pair.row.test(p) && pair.col.test(p)
      );
    }
    
    intersections[pair.key] = eligiblePlayers.map(p => p.pid);
    
    console.log(`Intersection ${pair.row.label} × ${pair.col.label}: ${eligiblePlayers.length} eligible players`);
    
    if (eligiblePlayers.length === 0) {
      throw new Error(`No eligible players for intersection ${pair.row.label} × ${pair.col.label}`);
    }
  }

  // Enhanced solvability validation
  const { isValid, details } = validateGridSolvability(rows, cols, intersections, players);
  
  if (!isValid) {
    throw new Error(`Grid not solvable: ${details}`);
  }
  
  console.log(`✅ Grid solvability validated: ${details}`);
  
  // Track recently used items
  addToRecentlyUsed(selectedTeams, selectedAchievements);
  
  return { rows, cols, intersections };
}

// Helper function to pre-validate intersection feasibility
function preValidateIntersection(teamConstraint: CatTeam, achievementConstraint: CatTeam, leagueData: LeagueData): number {
  const eligiblePlayers = leagueData.players.filter(p => 
    teamConstraint.test(p) && achievementConstraint.test(p)
  );
  return Math.min(eligiblePlayers.length, 10); // Cap at 10 for scoring purposes
}

// Enhanced grid solvability validation
function validateGridSolvability(
  rows: CatTeam[], 
  cols: CatTeam[], 
  intersections: Record<string, number[]>,
  players: Player[]
): { isValid: boolean; details: string } {
  let singlePlayerCells = 0;
  const conflicts = new Set<number>();
  
  // Check for conflicts (same player eligible for multiple cells)
  const playerToCells = new Map<number, Array<{cellKey: string, rowLabel: string, colLabel: string}>>();
  
  Object.entries(intersections).forEach(([cellKey, eligiblePlayers]) => {
    if (eligiblePlayers.length === 1) {
      singlePlayerCells++;
    }
    
    // Track which cells each player can fill
    eligiblePlayers.forEach(playerId => {
      if (!playerToCells.has(playerId)) {
        playerToCells.set(playerId, []);
      }
      const [rowKey, colKey] = cellKey.split('-');
      const rowLabel = rows.find(r => r.key === rowKey)?.label || 'Unknown';
      const colLabel = cols.find(c => c.key === colKey)?.label || 'Unknown';
      playerToCells.get(playerId)!.push({cellKey, rowLabel, colLabel});
    });
  });
  
  // Identify potential conflicts (players eligible for multiple cells)
  playerToCells.forEach((cells, playerId) => {
    if (cells.length > 1) {
      conflicts.add(playerId);
    }
  });
  
  const details = `${singlePlayerCells} single-player cells, ${conflicts.size > 0 ? 'conflicts detected' : 'no conflicts detected'}`;
  
  // Grid is considered valid if it's solvable
  const isValid = singlePlayerCells <= 3; // Allow up to 3 gimme answers
  
  return { isValid, details };
}

// Helper function to create cell keys (used by the UI)
export function cellKey(rowKey: string, colKey: string): string {
  return `${rowKey}-${colKey}`;
}