import type { LeagueData, CatTeam, Player, Team } from '@/types/bbgm';
import { getViableAchievements, playerMeetsAchievement, getAllAchievements, type Achievement, debugIndividualAchievements, generateCustomStatAchievements } from '@/lib/achievements';
import { parseAchievementLabel, createCustomNumericalAchievement } from '@/lib/editable-achievements';
import { getSeasonEligiblePlayers, type SeasonAchievementId, type SeasonIndex, SEASON_ACHIEVEMENTS } from './season-achievements';
import { calculateOptimizedIntersection, type IntersectionConstraint } from '@/lib/intersection-cache';
import { mapAchievementToAchv } from './achv-mappers';

// Define conflicting achievement sets at module level
const draftAchievements = new Set(['isPick1Overall', 'isFirstRoundPick', 'isSecondRoundPick', 'isUndrafted', 'draftedTeen']);
const seasonLengthAchievements = new Set(['played15PlusSeasons']);

// Simple session-based memory to avoid immediate repetition
const recentlyUsedTeams = new Set<number>();
const recentlyUsedAchievements = new Set<string>();
const maxRecentItems = 4; // Remember last 4 items to avoid immediate reuse - reduced for performance

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
  
  
  
  try {
    const DEBUG = import.meta.env.VITE_DEBUG === 'true';
    if (DEBUG) {
      
    }
    
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

    

    // If < 20 seasons, use old random builder without season-specific achievements
    if (uniqueSeasons.size < 20) {
      
      return generateGridOldRandom(leagueData);
    }

    // If >= 20 seasons and basketball, football, hockey, or baseball, use new seeded builder
    if ((sport === 'basketball' || sport === 'football' || sport === 'hockey' || sport === 'baseball') && leagueData.seasonIndex) {
      
      return generateGridSeeded(leagueData);
    }

    // Fallback to old builder for other sports or insufficient seasons
    
    return generateGridOldRandom(leagueData);
  } catch (error) {
    console.error('🔧 [GRID GEN] Error during grid generation:', error);
    console.error('🔧 [GRID GEN] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('🔧 [GRID GEN] League data summary:', {
      sport,
      playersCount: players.length,
      teamsCount: teams.length,
      hasSeasonIndex: !!leagueData.seasonIndex
    });
    throw error;
  }
}

function generateGridOldRandom(leagueData: LeagueData): {
  rows: CatTeam[];
  cols: CatTeam[];
  intersections: Record<string, number[]>;
} {
  // Retry logic to ensure all intersections have eligible players - reduced for performance
  const MAX_ATTEMPTS = 50;
  let attempt = 0;
  let lastError: Error | null = null;
  
  while (attempt < MAX_ATTEMPTS) {
    try {
      const result = attemptGridGenerationOldRandom(leagueData);
      const DEBUG = import.meta.env.VITE_DEBUG === 'true';
      if (DEBUG) {}
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const DEBUG = import.meta.env.VITE_DEBUG === 'true';
      if (DEBUG) {}
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
  const { players, teams, sport, seasonIndex, leagueYears } = leagueData;
  // Get viable achievements - use sport-specific minimum requirements to avoid infinite loops
  // For old random builder, exclude season-specific achievements
  const minPlayersRequired = sport === 'hockey' ? 3 : 5; // Lower requirement for hockey due to fewer players
  const allAchievements = getViableAchievements(players, minPlayersRequired, sport, seasonIndex, leagueYears);
  
  // Filter out season-specific achievements for old builder
  const viableAchievements = allAchievements.filter(achievement => 
    !SEASON_ACHIEVEMENTS.some(sa => sa.id === achievement.id)
  );
  
  // Debug logging removed for performance - was causing verbose logs on every grid generation
  const DEBUG = import.meta.env.VITE_DEBUG === 'true';
  if (DEBUG) {
    
    const sportAchievements = getAllAchievements(sport, seasonIndex, leagueYears);
    sportAchievements.forEach((achievement: Achievement) => {
      const count = players.filter(p => p.achievements && (p.achievements as any)[achievement.id]).length;
      const viable = count >= 15 ? '✓' : '✗';
      
    });
    
    
    
    debugIndividualAchievements(players, seasonIndex);
  }
  
  // Create constraint pool (only active teams + achievements)
  const teamConstraints: CatTeam[] = teams.filter(team => !team.disabled).map(team => ({
    key: `team-${team.tid}`,
    label: `${team.region || team.abbrev} ${team.name}`,
    tid: team.tid,
    type: 'team',
    test: (p: Player) => p.teamsPlayed.has(team.tid),
  }));

  const achievementConstraints: CatTeam[] = viableAchievements
    .filter(achievement => achievement.id !== 'bornOutsideUS50DC') // Temporarily remove born outside US achievement
    .map((achievement, index) => {
      // Dynamically customize career stat achievements with a seed based on index
      const customized = sport ? maybeCustomizeAchievement(achievement, sport, `oldrandom_${index}`) : achievement;
      return {
        key: `achievement-${customized.id}`,
        label: customized.label,
        achievementId: customized.id,
        achv: mapAchievementToAchv(customized),
        type: 'achievement',
        test: (p: Player) => playerMeetsAchievement(p, customized.id, seasonIndex),
      };
    });

  if (teamConstraints.length < 3) {
    throw new Error(`Need at least 3 teams to generate grid (found ${teamConstraints.length})`);
  }

  if (achievementConstraints.length < 2) {
    throw new Error(`Need at least 2 viable achievements to generate grid (found ${achievementConstraints.length})`);
  }

  // Determine number of achievements (2 or 3)
  const numAchievements = Math.random() < 0.5 ? 2 : 3;
  const numTeams = 6 - numAchievements;

  // Define draft achievements that should not appear together (using module-level definitions)
  
  // Helper function to ensure only one draft achievement, one season length achievement, and one per decade
  const ensureNoConflictingAchievements = (achievements: CatTeam[]): CatTeam[] => {
    const draftAchs = achievements.filter(a => draftAchievements.has(a.achievementId!));
    const seasonLengthAchs = achievements.filter(a => seasonLengthAchievements.has(a.achievementId!));
    
    // Group decade achievements by decade
    const decadeGroups = new Map<number, CatTeam[]>();
    const nonDecadeAchs: CatTeam[] = [];
    
    achievements.forEach(a => {
      if (!draftAchievements.has(a.achievementId!) && !seasonLengthAchievements.has(a.achievementId!)) {
        const decade = extractDecadeFromAchievement(a.achievementId!);
        if (decade !== null) {
          if (!decadeGroups.has(decade)) {
            decadeGroups.set(decade, []);
          }
          decadeGroups.get(decade)!.push(a);
        } else {
          nonDecadeAchs.push(a);
        }
      }
    });
    
    // Check if we have conflicts
    const hasDecadeConflicts = Array.from(decadeGroups.values()).some(group => group.length > 1);
    
    if (draftAchs.length <= 1 && seasonLengthAchs.length <= 1 && !hasDecadeConflicts) {
      return achievements; // Already compliant
    }
    
    // Log conflict resolution for debugging
    if (seasonLengthAchs.length > 1) {
      if (import.meta.env.VITE_DEBUG === 'true') {
        
      }
    }
    
    if (hasDecadeConflicts) {
      if (import.meta.env.VITE_DEBUG === 'true') {
        
        decadeGroups.forEach((group, decade) => {
          if (group.length > 1) {
            
          }
        });
      }
    }
    
    // Keep only one from each conflicting category
    const selectedDraft = draftAchs.length > 0 ? draftAchs[0] : null;
    const selectedSeasonLength = seasonLengthAchs.length > 0 ? seasonLengthAchs[0] : null;
    const selectedDecadeAchs = Array.from(decadeGroups.values()).map(group => group[0]); // Keep first from each decade
    
    const alreadySelectedIds = new Set([
      selectedDraft?.achievementId,
      selectedSeasonLength?.achievementId,
      ...selectedDecadeAchs.map(a => a.achievementId),
      ...nonDecadeAchs.map(a => a.achievementId)
    ].filter(Boolean));
    
    const availableNonConflicting = achievementConstraints.filter(a => 
      !draftAchievements.has(a.achievementId!) && 
      !seasonLengthAchievements.has(a.achievementId!) &&
      !alreadySelectedIds.has(a.achievementId!) &&
      extractDecadeFromAchievement(a.achievementId!) === null // No more decade achievements
    );
    
    // Build final selection
    const result = [...nonDecadeAchs, ...selectedDecadeAchs];
    if (selectedDraft) result.push(selectedDraft);
    if (selectedSeasonLength) result.push(selectedSeasonLength);
    
    // Fill remaining slots with non-conflicting achievements if needed
    const needed = achievements.length - result.length;
    if (needed > 0 && availableNonConflicting.length >= needed) {
      result.push(...availableNonConflicting.slice(0, needed));
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
        playerMeetsAchievement(p, achievement.achievementId!, seasonIndex) && 
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
      const isDecadeAchievement = achievement.achievementId!.includes('playedIn') || 
                                  achievement.achievementId!.includes('debutedIn');
      
      // COMPLETELY BYPASS team coverage for stat achievements
      if (isStatAchievement) {
        
        return true; // Always allow stat achievements regardless of team coverage
      }
      
      // COMPLETELY BYPASS team coverage for decade achievements
      if (isDecadeAchievement) {
        
        return true; // Always allow decade achievements regardless of team coverage
      }
      
      // Only apply team coverage filtering to non-stat, non-decade achievements
      return teamCoverage >= 3;
    });
    
    // Apply decade probability skewing - favor recent decades, phase out old ones (50+ years)
    const currentYear = leagueData.leagueYears?.maxSeason || new Date().getFullYear();
    const weightedAchievements = viableAchievements.map(achievement => {
      let weight = 1;
      
      // Apply decade skewing for decade achievements
      const isDecadeAchievement = achievement.achievementId!.includes('playedIn') || 
                                  achievement.achievementId!.includes('debutedIn');
      
      if (isDecadeAchievement) {
        // Extract decade year from achievement ID (e.g., "playedIn2040s" -> 2040)
        const decadeMatch = achievement.achievementId!.match(/(\d{4})s/);
        if (decadeMatch) {
          const decade = parseInt(decadeMatch[1]);
          const yearsDiff = currentYear - decade;
          
          // Make decades 40+ years ago VERY RARE (user request: 2020s and earlier in 2059)
          if (yearsDiff >= 40) {
            weight = 0.05; // Extremely rare - 5% chance vs normal
          }
          // Recent decades (within 20 years) get maximum boost
          else if (yearsDiff <= 20) {
            weight = 5 - (yearsDiff / 8); // Weight 5.0 for current decade, down to 2.5 for 20 years ago
          }
          // Somewhat recent decades (20-40 years) get moderate weight
          else {
            weight = 1.5 - ((yearsDiff - 20) / 40); // 1.5 down to 1.0 for 20-40 years ago
          }
        }
      }
      
      return { achievement, weight };
    });

    // Separate by usage recency
    const freshWeightedAchievements = weightedAchievements.filter(w => 
      !recentlyUsedAchievements.has(w.achievement.achievementId!)
    );
    const recentWeightedAchievements = weightedAchievements.filter(w => 
      recentlyUsedAchievements.has(w.achievement.achievementId!)
    );
    
    // Convert to weighted selection arrays (duplicate items based on weight)
    const createWeightedArray = (weightedItems: Array<{achievement: CatTeam, weight: number}>) => {
      const result: CatTeam[] = [];
      weightedItems.forEach(({achievement, weight}) => {
        const copies = Math.max(1, Math.round(weight * 10)); // Scale weights and ensure at least 1 copy
        for (let i = 0; i < copies; i++) {
          result.push(achievement);
        }
      });
      return result;
    };
    
    const freshAchievements = createWeightedArray(freshWeightedAchievements);
    const recentAchievements = createWeightedArray(recentWeightedAchievements);
    
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
    // Fallback: apply decade skewing even without team coverage data
    const currentYear = leagueData.leagueYears?.maxSeason || new Date().getFullYear();
    const weightedFallbackAchievements = achievementConstraints.map(achievement => {
      let weight = 1;
      
      const isDecadeAchievement = achievement.achievementId!.includes('playedIn') || 
                                  achievement.achievementId!.includes('debutedIn');
      
      if (isDecadeAchievement) {
        const decadeMatch = achievement.achievementId!.match(/(\d{4})s/);
        if (decadeMatch) {
          const decade = parseInt(decadeMatch[1]);
          const yearsDiff = currentYear - decade;
          
          if (yearsDiff >= 40) {
            weight = 0.05; // Extremely rare for 40+ year old decades
          } else if (yearsDiff <= 20) {
            weight = 5 - (yearsDiff / 8); // Max boost for recent decades
          } else {
            weight = 1.5 - ((yearsDiff - 20) / 40); // Moderate for 20-40 years ago
          }
        }
      }
      
      return { achievement, weight };
    });
    
    // Create weighted array for fallback selection
    const weightedFallbackArray: CatTeam[] = [];
    weightedFallbackAchievements.forEach(({achievement, weight}) => {
      const copies = Math.max(1, Math.round(weight * 10));
      for (let i = 0; i < copies; i++) {
        weightedFallbackArray.push(achievement);
      }
    });
    
    selectedAchievements = weightedFallbackArray
      .sort(() => Math.random() - 0.5)
      .slice(0, numAchievements);
  }
  
  // Ensure no conflicting achievements are selected (draft, season length)
  selectedAchievements = ensureNoConflictingAchievements(selectedAchievements);
  
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
    
    selectedTeams.push(...teamConstraints.sort(() => Math.random() - 0.5).slice(0, numTeams));
  }
  
  // Emergency fallback: if we still don't have enough teams, duplicate the most viable ones
  while (selectedTeams.length < numTeams && teamConstraints.length > 0) {
    
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
  
  
  
  
  // Log the achievement distribution for debugging
  const rowAchievements = rows.filter(r => r.type === 'achievement').length;
  const colAchievements = cols.filter(c => c.type === 'achievement').length;
  

  // Build intersections and validate
  const intersections: Record<string, number[]> = {};
  
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    for (let colIndex = 0; colIndex < cols.length; colIndex++) {
      const row = rows[rowIndex];
      const col = cols[colIndex];
      const cellKey = `${rowIndex}-${colIndex}`;
      
      const rowConstraint: CatTeam = {
        type: row.type,
        tid: row.tid,
        achievementId: row.achievementId,
        label: row.label,
        key: row.key,
        test: row.test,
      };
      const colConstraint: CatTeam = {
        type: col.type,
        tid: col.tid,
        achievementId: col.achievementId,
        label: col.label,
        key: col.key,
        test: col.test,
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
      
      // USE THE SAME LOGIC AS CREATE A GRID (calculateOptimizedIntersection)
      const rowIntersectionConstraint: IntersectionConstraint = {
        type: rowConstraint.type,
        id: rowConstraint.type === 'team' ? rowConstraint.tid! : rowConstraint.achievementId!,
        label: row.label
      };
      
      const colIntersectionConstraint: IntersectionConstraint = {
        type: colConstraint.type,
        id: colConstraint.type === 'team' ? colConstraint.tid! : colConstraint.achievementId!,
        label: col.label
      };
      
      const eligiblePidsSet = calculateOptimizedIntersection(
        rowIntersectionConstraint,
        colIntersectionConstraint,
        players,
        teams,
        leagueData.seasonIndex,
        false // Return Set, not count
      ) as Set<number>;
      
      const eligiblePids = Array.from(eligiblePidsSet);
      
      if (eligiblePids.length === 0) {
        throw new Error(`No eligible players for intersection ${row.label} × ${col.label}`);
      }
      
      intersections[cellKey] = eligiblePids;
      
      // Debug logging removed for performance - was logging for every intersection calculation
      const DEBUG = import.meta.env.VITE_DEBUG === 'true';
      if (DEBUG) {
        
      }
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
  
  
  
  // Track used teams and achievements for variety in future generations
  const usedTeams = [...rows, ...cols].filter(item => item.type === 'team');
  const usedAchievements = [...rows, ...cols].filter(item => item.type === 'achievement');
  addToRecentlyUsed(usedTeams, usedAchievements);
  
  return { rows, cols, intersections };
}

// Detect if a grid has duplicate header keys
export function hasGridDuplicateHeaders(rows: CatTeam[], cols: CatTeam[]): boolean {
  const rowKeys = rows.map(r => r.key);
  const colKeys = cols.map(c => c.key);
  
  // Check for duplicate row keys
  const uniqueRowKeys = new Set(rowKeys);
  if (uniqueRowKeys.size !== rowKeys.length) {
    return true;
  }
  
  // Check for duplicate column keys
  const uniqueColKeys = new Set(colKeys);
  if (uniqueColKeys.size !== colKeys.length) {
    return true;
  }
  
  return false;
}

// Enhanced cell key generation that handles duplicates
export function cellKey(rowKey: string, colKey: string, rows?: CatTeam[], cols?: CatTeam[]): string {
  // If rows and cols are provided, check for duplicates
  if (rows && cols && hasGridDuplicateHeaders(rows, cols)) {
    // Use position-based keys for grids with duplicates
    const rowIndex = rows.findIndex(r => r.key === rowKey);
    const colIndex = cols.findIndex(c => c.key === colKey);
    return `${rowIndex}-${colIndex}`;
  }
  
  // Use traditional key-based approach for grids without duplicates
  return `${rowKey}|${colKey}`;
}

// Position-based cell key generation (for consistency with custom grid modal)
export function positionBasedCellKey(rowIndex: number, colIndex: number): string {
  return `${rowIndex}-${colIndex}`;
}

export function legacyCellKey(rowTid: number, colTid: number): string {
  return `${rowTid}|${colTid}`;
}

// Dynamically customize a career stat achievement with random threshold and operator


// Define dynamic ranges for stat thresholds
const STAT_RANGES: Record<string, { min: number; max: number; step: number }> = {
  // Basketball Career
  'pts': { min: 50, max: 40000, step: 50 },
  'trb': { min: 50, max: 15000, step: 50 },
  'ast': { min: 50, max: 10000, step: 50 },
  'stl': { min: 10, max: 2000, step: 10 },
  'blk': { min: 10, max: 2000, step: 10 },
  'tpm': { min: 10, max: 3000, step: 10 },
  // Basketball Season
  'ppg': { min: 5, max: 35, step: 1 },
  'rpg': { min: 3, max: 18, step: 1 },
  'apg': { min: 3, max: 15, step: 1 },
  'seasonPts': { min: 100, max: 3000, step: 50 },
  'seasonTpm': { min: 20, max: 400, step: 10 },
  'fgPct': { min: 0.3, max: 0.7, step: 0.01 },
  'tpPct': { min: 0.2, max: 0.5, step: 0.01 },
  'ftPct': { min: 0.7, max: 0.95, step: 0.01 },
  'efg': { min: 0.4, max: 0.7, step: 0.01 },
  'ts': { min: 0.4, max: 0.7, step: 0.01 },
  'min': { min: 10, max: 40, step: 1 }, // MPG
  'gp': { min: 20, max: 82, step: 1 }, // Games Played in a Season
  // Football Career
  'pssYds': { min: 1000, max: 80000, step: 1000 },
  'pssTD': { min: 10, max: 500, step: 5 },
  'rusYds': { min: 500, max: 20000, step: 100 },
  'rusTD': { min: 5, max: 200, step: 5 },
  'recYds': { min: 500, max: 20000, step: 100 },
  'recTD': { min: 5, max: 200, step: 5 },
  'sks': { min: 5, max: 200, step: 5 },
  'defInt': { min: 5, max: 50, step: 1 },
  // Football Season
  'seasonPssYds': { min: 1000, max: 6000, step: 100 },
  'seasonPssTD': { min: 10, max: 50, step: 1 },
  'seasonRusYds': { min: 500, max: 2000, step: 50 },
  'seasonRusTD': { min: 5, max: 20, step: 1 },
  'seasonRecYds': { min: 500, max: 2000, step: 50 },
  'seasonRec': { min: 30, max: 150, step: 5 },
  'seasonRecTD': { min: 5, max: 20, step: 1 },
  'seasonSks': { min: 3, max: 20, step: 1 },
  'seasonDefTck': { min: 50, max: 180, step: 5 },
  'seasonDefInt': { min: 2, max: 10, step: 1 },
  'seasonScrimmageYds': { min: 800, max: 2500, step: 50 },
  'seasonAllPurposeYds': { min: 1000, max: 3000, step: 50 },
  'seasonDefTckLoss': { min: 5, max: 25, step: 1 },
  // Hockey Career
  'goals': { min: 50, max: 1000, step: 10 },
  'assists': { min: 50, max: 1500, step: 10 },
  'points': { min: 100, max: 2500, step: 25 },
  'wins': { min: 20, max: 500, step: 5 }, // Goalie wins
  'shutouts': { min: 5, max: 100, step: 1 }, // Goalie shutouts
  // Hockey Season
  'seasonGoals': { min: 10, max: 90, step: 1 },
  'seasonAssists': { min: 20, max: 120, step: 1 },
  'seasonPoints': { min: 30, max: 150, step: 1 },
  'seasonPm': { min: 5, max: 50, step: 1 }, // Plus/Minus
  'seasonS': { min: 100, max: 400, step: 10 }, // Shots
  'seasonHit': { min: 50, max: 300, step: 10 }, // Hits
  'seasonBlk': { min: 30, max: 200, step: 5 }, // Blocks
  'seasonTk': { min: 20, max: 100, step: 5 }, // Takeaways
  'seasonPpPoints': { min: 5, max: 40, step: 1 }, // Power Play Points
  'seasonShG': { min: 1, max: 10, step: 1 }, // Short Handed Goals
  'seasonGwG': { min: 2, max: 12, step: 1 }, // Game Winning Goals
  'seasonFaceoffPct': { min: 0.45, max: 0.65, step: 0.01 },
  'seasonToiPerGame': { min: 10, max: 30, step: 0.5 },
  'seasonPim': { min: 30, max: 150, step: 5 },
  'seasonSavePct': { min: 0.88, max: 0.94, step: 0.001 },
  'seasonGaaRate': { min: 1.5, max: 3.5, step: 0.1 },
  'seasonSo': { min: 1, max: 15, step: 1 }, // Goalie Shutouts
  'seasonSv': { min: 500, max: 3000, step: 100 }, // Goalie Saves
  'seasonGs': { min: 20, max: 80, step: 1 }, // Goalie Starts
  // Baseball Career
  'h': { min: 200, max: 4000, step: 100 }, // Hits
  'hr': { min: 20, max: 800, step: 10 }, // Home Runs
  'rbi': { min: 100, max: 2500, step: 50 }, // RBIs
  'sb': { min: 20, max: 800, step: 10 }, // Stolen Bases
  'r': { min: 100, max: 2500, step: 50 }, // Runs
  'w': { min: 10, max: 400, step: 5 }, // Pitcher Wins
  'soPit': { min: 100, max: 5000, step: 100 }, // Pitcher Strikeouts
  'sv': { min: 10, max: 600, step: 5 }, // Pitcher Saves
  // Baseball Season (less common for dynamic, but include some)
  'seasonH': { min: 50, max: 250, step: 5 },
  'seasonHr': { min: 5, max: 70, step: 1 },
  'seasonRbi': { min: 20, max: 180, step: 5 },
  'seasonSb': { min: 5, max: 100, step: 1 },
  'seasonW': { min: 5, max: 30, step: 1 },
  'seasonSoPit': { min: 50, max: 350, step: 10 },
  'seasonSv': { min: 10, max: 60, step: 1 },
};

// Generate a random threshold for dynamic customization
function generateRandomThreshold(
  statField: string,
  isSeason: boolean,
  rng: SeededRandom
): number {
  const key = isSeason ? `season${statField.charAt(0).toUpperCase() + statField.slice(1)}` : statField;
  const range = STAT_RANGES[key];

  if (!range) {
    console.warn(`⚠️ No stat range defined for ${key}. Falling back to default.`);
    return Math.round(rng.next() * 1000); // Default random if no range
  }

  const numSteps = (range.max - range.min) / range.step;
  const randomStep = Math.floor(rng.next() * (numSteps + 1));
  let threshold = range.min + randomStep * range.step;

  // Round to appropriate decimal places for percentages
  if (statField.includes('Pct') || statField.includes('efg') || statField.includes('ts') || statField.includes('gaaRate') || statField.includes('toiPerGame')) {
    threshold = parseFloat(threshold.toFixed(3));
  } else {
    threshold = Math.round(threshold);
  }

  return threshold;
}

// Dynamically customize a numerical stat achievement with random threshold and operator
function maybeCustomizeAchievement(
  achievement: Achievement,
  sport: 'basketball' | 'football' | 'hockey' | 'baseball',
  seed: string
): Achievement {
  // Only customize numerical stat achievements
  const parsed = parseAchievementLabel(achievement.label, sport);
  if (!parsed.isEditable || !parsed.number) {
    return achievement;
  }

  // Use a seeded random number generator for consistent results per grid
  const rng = new SeededRandom(simpleHash(seed + achievement.id));

  // Determine if it's a season or career stat based on label or ID
  const isSeasonStat = achievement.id.includes('Season') || parsed.originalLabel.toLowerCase().includes('(season)');
  
  // Extract the base stat field from the achievement ID or label
  let statField = '';
  // Basketball
  if (achievement.id.includes('Points') || achievement.id.includes('pts')) statField = 'pts';
  else if (achievement.id.includes('Rebounds') || achievement.id.includes('trb')) statField = 'trb';
  else if (achievement.id.includes('Assists') || achievement.id.includes('ast')) statField = 'ast';
  else if (achievement.id.includes('Steals') || achievement.id.includes('stl')) statField = 'stl';
  else if (achievement.id.includes('Blocks') || achievement.id.includes('blk')) statField = 'blk';
  else if (achievement.id.includes('3PM') || achievement.id.includes('tpm')) statField = 'tpm';
  // Football
  else if (achievement.id.includes('PassYds') || achievement.id.includes('pssYds')) statField = 'pssYds';
  else if (achievement.id.includes('PassTDs') || achievement.id.includes('pssTD')) statField = 'pssTD';
  else if (achievement.id.includes('RushYds') || achievement.id.includes('rusYds')) statField = 'rusYds';
  else if (achievement.id.includes('RushTDs') || achievement.id.includes('rusTD')) statField = 'rusTD';
  else if (achievement.id.includes('RecYds') || achievement.id.includes('recYds')) statField = 'recYds';
  else if (achievement.id.includes('RecTDs') || achievement.id.includes('recTD')) statField = 'recTD';
  else if (achievement.id.includes('Sacks') || achievement.id.includes('sks')) statField = 'sks';
  else if (achievement.id.includes('Ints') || achievement.id.includes('defInt')) statField = 'defInt';
  // Hockey
  else if (achievement.id.includes('Goals') && !achievement.id.includes('SHGoals') && !achievement.id.includes('GWGoals')) statField = 'goals';
  else if (achievement.id.includes('Assists') && !achievement.id.includes('PowerPlay')) statField = 'assists';
  else if (achievement.id.includes('Points') && !achievement.id.includes('PowerPlay')) statField = 'points';
  else if (achievement.id.includes('Wins') && achievement.id.includes('(G)')) statField = 'wins';
  else if (achievement.id.includes('Shutouts') && achievement.id.includes('(G)')) statField = 'shutouts';
  else if (achievement.id.includes('Plus')) statField = 'pm'; // Plus/Minus
  else if (achievement.id.includes('Shots')) statField = 's';
  else if (achievement.id.includes('Hits')) statField = 'hit';
  else if (achievement.id.includes('Blocks')) statField = 'blk';
  else if (achievement.id.includes('Takeaways')) statField = 'tk';
  else if (achievement.id.includes('PowerPlay')) statField = 'ppPoints'; // Custom field for power play points
  else if (achievement.id.includes('SHGoals')) statField = 'shG';
  else if (achievement.id.includes('GWGoals')) statField = 'gwG';
  else if (achievement.id.includes('FaceoffPct')) statField = 'faceoffPct';
  else if (achievement.id.includes('TOI')) statField = 'toiPerGame';
  else if (achievement.id.includes('PIM')) statField = 'pim';
  else if (achievement.id.includes('SavePct')) statField = 'savePct';
  else if (achievement.id.includes('GAA')) statField = 'gaaRate';
  else if (achievement.id.includes('Saves')) statField = 'sv';
  else if (achievement.id.includes('Starts')) statField = 'gs';
  // Baseball
  else if (achievement.id.includes('Hits')) statField = 'h';
  else if (achievement.id.includes('HRs')) statField = 'hr';
  else if (achievement.id.includes('RBIs')) statField = 'rbi';
  else if (achievement.id.includes('StolenBases')) statField = 'sb';
  else if (achievement.id.includes('Runs')) statField = 'r';
  else if (achievement.id.includes('Wins') && achievement.id.includes('(P)')) statField = 'w';
  else if (achievement.id.includes('Strikeouts')) statField = 'soPit';
  else if (achievement.id.includes('Saves') && achievement.id.includes('(P)')) statField = 'sv';
  // Generic season averages (PPG, RPG, APG)
  else if (parsed.statUnit?.includes('PPG')) statField = 'ppg';
  else if (parsed.statUnit?.includes('RPG')) statField = 'rpg';
  else if (parsed.statUnit?.includes('APG')) statField = 'apg';
  else if (parsed.statUnit?.includes('FG%')) statField = 'fgPct';
  else if (parsed.statUnit?.includes('3P%')) statField = 'tpPct';
  else if (parsed.statUnit?.includes('FT%')) statField = 'ftPct';
  else if (parsed.statUnit?.includes('eFG')) statField = 'efg';
  else if (parsed.statUnit?.includes('TS')) statField = 'ts';
  else if (parsed.statUnit?.includes('Games')) statField = 'gp';
  else if (parsed.statUnit?.includes('Minutes')) statField = 'min';


  if (!statField) {
    console.warn(`⚠️ Could not determine statField for achievement: ${achievement.label} (${achievement.id}). Skipping customization.`);
    return achievement;
  }

  const selectedThreshold = generateRandomThreshold(statField, isSeasonStat, rng);
  
  // Randomly pick operator (50/50)
  const operator = (rng.next() * 2) < 1 ? '≥' : '≤';
  
  const customized = createCustomNumericalAchievement(achievement, selectedThreshold, sport, operator);
  console.log(`🎲 Dynamically customized: ${achievement.label} → ${customized.label} (Stat: ${statField}, Season: ${isSeasonStat})`);
  
  return customized;
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
  
  // Note: Custom stat achievements are now generated dynamically when selected, not pre-generated
  
  
  
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
  
  
  // Step 2: Seed with one random season achievement
  let retryCount = 0;
  let seedAchievement: typeof SEASON_ACHIEVEMENTS[0];
  let seedSlot: { axis: 'row' | 'col', index: number };
  
  do {
    if (retryCount >= 10) {
      throw new Error('Could not find viable seed achievement after 10 tries');
    }
    
    // Find viable season achievements that have >= 3 eligible teams (sport-filtered)
    const sportFilteredAchievements = getAllAchievements(sport, seasonIndex, leagueData.leagueYears)
      .filter(ach => ach.isSeasonSpecific);
    
    const viableSeasonAchievements = sportFilteredAchievements.map(ach => 
      SEASON_ACHIEVEMENTS.find(sa => sa.id === ach.id)
    ).filter((sa): sa is NonNullable<typeof sa> => {
      if (!sa) return false;
      const eligibleTeams = getTeamsForAchievement(seasonIndex, sa.id, teams);
      
      // Debug baseball achievements specifically
      if (sport === 'baseball') {
        
      }
      
      return eligibleTeams.size >= 3;
    });
    
    
    
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
    const eligibleTeams = getTeamsForAchievement(seasonIndex, seedAchievement.id, teams);
    if (eligibleTeams.size >= 3) break;
    
    retryCount++;
  } while (retryCount < 10);
  
  
  
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
    achv: mapAchievementToAchv(seedAchievement as Achievement),
    test: (p: Player) => playerMeetsAchievement(p, seedAchievement.id, seasonIndex),
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
  
  
  
  const eligibleTeams = getTeamsForAchievement(seasonIndex, seedAchievement.id, teams);
  const eligibleTeamsList = Array.from(eligibleTeams)
    .map(tid => teams.find(t => t.tid === tid))
    .filter(t => t && !t.disabled) as Team[];
  
  // Shuffle teams for randomness
  for (let i = eligibleTeamsList.length - 1; i > 0; i--) {
    const j = Math.floor((simpleHash(gridId + '_shuffle' + i) / 2147483647) * (i + 1));
    [eligibleTeamsList[i], eligibleTeamsList[j]] = [eligibleTeamsList[j], eligibleTeamsList[i]];
  }
  
  let teamIndex = 0;
  const usedAchievementIds = new Set<string>([seedAchievement.id]); // Track used achievements to prevent duplicates, starting with seed
  
  for (let i = 0; i < 3; i++) {
    if (oppositeLayout[i] === 'T') {
      // Pick next team that has eligible players with seed and isn't already used
      let team;
      while (teamIndex < eligibleTeamsList.length) {
        const candidateTeam = eligibleTeamsList[teamIndex];
        teamIndex++;
        
        // Check if this team is already used in this grid
        const teamAlreadyUsed = 
          rows.some(r => r && r.type === 'team' && r.tid === candidateTeam.tid) ||
          cols.some(c => c && c.type === 'team' && c.tid === candidateTeam.tid);
        
        if (!teamAlreadyUsed) {
          team = candidateTeam;
          break;
        }
      }
      
      if (!team) {
        throw new Error(`Not enough unique eligible teams for seed ${seedAchievement.label}`);
      }
      
      oppositeArray[i] = {
        type: 'team',
        tid: team.tid,
        label: team.name || `Team ${team.tid}`,
        key: `team-${team.tid}`,
        test: (p: Player) => p.teamsPlayed.has(team.tid),
      };
      
      
    } else if (oppositeLayout[i] === 'A') {
      // Pick achievement that has shared players in same season with seed
      const viableAchievements: (typeof SEASON_ACHIEVEMENTS[0] | Achievement)[] = [];
      
      // Skip season achievements entirely - only use career achievements for opposite axis
      // This prevents impossible season harmonization conflicts
      
      // Only try career achievements with decade weighting applied
      const rawAchievements = getAllAchievements(sport, seasonIndex, leagueData.leagueYears);
      
      // Apply decade weighting for achievement selection 
      const currentYear = leagueData.leagueYears?.maxSeason || new Date().getFullYear();
      const weightedAchievements: Achievement[] = [];
      
      for (const ach of rawAchievements) {
        if (ach.isSeasonSpecific) continue;
        if (ach.id === 'bornOutsideUS50DC') continue;
        
        let weight = 1;
        
        // Apply decade skewing for decade achievements
        const isDecadeAchievement = ach.id.includes('playedIn') || ach.id.includes('debutedIn');
        
        if (isDecadeAchievement) {
          const decadeMatch = ach.id.match(/(\d{4})s/);
          if (decadeMatch) {
            const decade = parseInt(decadeMatch[1]);
            const yearsDiff = currentYear - decade;
            
            if (yearsDiff >= 40) {
              weight = 0.05; // Extremely rare for 40+ year old decades
            } else if (yearsDiff <= 20) {
              weight = 5 - (yearsDiff / 8); // Max boost for recent decades
            } else {
              weight = 1.5 - ((yearsDiff - 20) / 40); // Moderate for 20-40 years ago
            }
          }
        }
        
        // Create weighted array (duplicate items based on weight)
        const copies = Math.max(1, Math.round(weight * 10));
        for (let i = 0; i < copies; i++) {
          weightedAchievements.push(ach);
        }
      }
      
      for (const ach of weightedAchievements) {
        // Skip if this achievement ID is already used
        if (usedAchievementIds.has(ach.id)) {
          continue;
        }
        
        // Check if any player has both seed achievement (any season) and this career achievement
        const seedPlayerIds = new Set<number>();
        for (const season of Object.keys(seasonIndex)) {
          const seasonData = seasonIndex[parseInt(season)];
          for (const teamId of Object.keys(seasonData)) {
            const teamData = seasonData[parseInt(teamId)];
            const achPlayers = teamData[seedAchievement.id] || new Set();
            for (const pid of Array.from(achPlayers)) {
              seedPlayerIds.add(pid as number);
            }
          }
        }
        
        const hasOverlap = players.some(p => seedPlayerIds.has(p.pid) && ach.test(p));
        if (hasOverlap) {
          viableAchievements.push(ach);
        }
      }
      
      if (viableAchievements.length === 0) {
        throw new Error(`No viable achievements found for opposite axis with seed ${seedAchievement.label} (slot ${i})`);
      }
      
      const achIndex = simpleHash(gridId + '_oppach' + i) % viableAchievements.length;
      let selectedAch = viableAchievements[achIndex] as Achievement;
      
      // Dynamically customize career stat achievements
      if (sport) {
        selectedAch = maybeCustomizeAchievement(selectedAch, sport, gridId + '_oppach' + i);
      }
      
      // Track this achievement as used to prevent duplicates
      usedAchievementIds.add(selectedAch.id);
      
      oppositeArray[i] = {
        type: 'achievement',
        achievementId: selectedAch.id,
        label: selectedAch.label,
        key: `achievement-${selectedAch.id}`,
        achv: mapAchievementToAchv(selectedAch as Achievement),
        test: (p: Player) => playerMeetsAchievement(p, selectedAch.id, seasonIndex),
      };
      
      // Mark season achievement as used
      if (selectedAch.isSeasonSpecific) {
        usedSeasonAchievements.add(selectedAch.id as SeasonAchievementId);
      }
      
      
    }
  }
  
  // Step 4: Fill remaining slots using old-style approach
  
  
  // Only use career achievements for old-style fill with decade weighting
  const rawAllAchievements = getAllAchievements(sport, seasonIndex, leagueData.leagueYears)
    .filter(ach => !ach.isSeasonSpecific)
    .filter(ach => ach.id !== 'bornOutsideUS50DC');
  
  // Apply decade weighting to create final achievement list
  const currentYear = leagueData.leagueYears?.maxSeason || new Date().getFullYear();
  const allAchievements: Achievement[] = [];
  
  for (const ach of rawAllAchievements) {
    let weight = 1;
    
    // Apply decade skewing for decade achievements
    const isDecadeAchievement = ach.id.includes('playedIn') || ach.id.includes('debutedIn');
    
    if (isDecadeAchievement) {
      const decadeMatch = ach.id.match(/(\d{4})s/);
      if (decadeMatch) {
        const decade = parseInt(decadeMatch[1]);
        const yearsDiff = currentYear - decade;
        
        if (yearsDiff >= 40) {
          weight = 0.05; // Extremely rare for 40+ year old decades
        } else if (yearsDiff <= 20) {
          weight = 5 - (yearsDiff / 8); // Max boost for recent decades
        } else {
          weight = 1.5 - ((yearsDiff - 20) / 40); // Moderate for 20-40 years ago
        }
      }
    }
    
    // Create weighted array (duplicate items based on weight)
    const copies = Math.max(1, Math.round(weight * 10));
    for (let i = 0; i < copies; i++) {
      allAchievements.push(ach);
    }
  }
  
  // Filter out disabled teams for old-style fill
  const activeTeams = teams.filter(team => !team.disabled);
  
  // Find remaining empty slots
  for (let i = 0; i < 3; i++) {
    if (!rows[i]) {
      
      
      if (layout.rows[i] === 'T') {
        // Fill team slot - try up to 100 random teams
        let found = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          const teamIndex = simpleHash(gridId + '_rowteam' + i + '_' + attempt) % activeTeams.length;
          const team = activeTeams[teamIndex];
          
          // Check if this team is already used in this grid
          const teamAlreadyUsed = 
            rows.some(r => r && r.type === 'team' && r.tid === team.tid) ||
            cols.some(c => c && c.type === 'team' && c.tid === team.tid);
          
          if (teamAlreadyUsed) continue;
          
          // Check if this team creates valid intersections with all columns
          let validForAllCols = true;
          
          for (let colIdx = 0; colIdx < 3; colIdx++) {
            const colConstraint = cols[colIdx];
            const intersection = calculateIntersectionSimple(
              { type: 'team', tid: team.tid, label: team.name || `Team ${team.tid}` },
              colConstraint,
              players,
              seasonIndex,
              teams
            );
            
            if (intersection.length === 0) {
              validForAllCols = false;
              break;
            }
          }
          
          if (validForAllCols) {

            found = true;
            break;
          }
        }
        
        if (!found) {
          throw new Error(`Could not find valid team for row ${i} after trying 500 candidates`);
        }
        
      } else if (layout.rows[i] === 'A') {
        // Fill achievement slot - try up to 100 random achievements
        let found = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          const achIndex = simpleHash(gridId + '_rowach' + i + '_' + attempt) % allAchievements.length;
          let ach = allAchievements[achIndex];
          
          // Dynamically customize career stat achievements
          if (sport) {
            ach = maybeCustomizeAchievement(ach, sport, gridId + '_rowach' + i + '_' + attempt);
          }
          
          // Check if this achievement is already used in the grid
          const achAlreadyUsed = 
            rows.some(r => r && r.type === 'achievement' && r.achievementId === ach.id) ||
            cols.some(c => c && c.type === 'achievement' && c.achievementId === ach.id);
          
          if (achAlreadyUsed) continue;
          
          // Check for decade conflicts (prevent multiple decade achievements from same decade)
          if (hasDecadeConflict(ach.id, [...rows, ...cols])) {
            continue;
          }
          
          // Check for conflicting achievements (draft and season length)
          const hasConflictingDraft = draftAchievements.has(ach.id) && 
            [...rows, ...cols].some(slot => slot && slot.type === 'achievement' && draftAchievements.has(slot.achievementId!));
          const hasConflictingSeasonLength = seasonLengthAchievements.has(ach.id) && 
            [...rows, ...cols].some(slot => slot && slot.type === 'achievement' && seasonLengthAchievements.has(slot.achievementId!));
          
          if (hasConflictingDraft || hasConflictingSeasonLength) {
            if (hasConflictingSeasonLength) {
              console.log(`⚠️ Skipping ${ach.label} - conflicts with existing season length achievement`);
            }
            continue;
          }
          
          // Check if this achievement creates valid intersections with all columns
          let validForAllCols = true;
          
          for (let colIdx = 0; colIdx < 3; colIdx++) {
            const colConstraint = cols[colIdx];
            if (!colConstraint) continue; // Skip empty columns
            
            // Special validation for achievement × achievement intersections
            if (colConstraint.type === 'achievement') {
              if (!validateAchievementIntersection(ach.id, colConstraint.achievementId!, players, seasonIndex, 3)) {
                validForAllCols = false;
                break;
              }
            }
            
            const intersection = calculateIntersectionSimple(
              { type: 'achievement', achievementId: ach.id, label: ach.label },
              colConstraint,
              players,
              seasonIndex,
              teams
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
              achv: mapAchievementToAchv(ach),
              test: (p: Player) => playerMeetsAchievement(p, ach.id, seasonIndex),
            };
            
            console.log(`     Selected achievement: ${ach.label} (attempt ${attempt + 1})`);
            found = true;
            break;
          }
        }
        
        if (!found) {
          throw new Error(`Could not find valid achievement for row ${i} after trying 500 candidates`);
        }
      }
    }
    
    if (!cols[i]) {
      console.log(`   Filling empty col ${i} slot (type: ${layout.cols[i]})`);
      
      if (layout.cols[i] === 'T') {
        // Fill team slot - try up to 100 random teams
        let found = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          const teamIndex = simpleHash(gridId + '_colteam' + i + '_' + attempt) % activeTeams.length;
          const team = activeTeams[teamIndex];
          
          // Check if this team is already used in this grid
          const teamAlreadyUsed = 
            rows.some(r => r && r.type === 'team' && r.tid === team.tid) ||
            cols.some(c => c && c.type === 'team' && c.tid === team.tid);
          
          if (teamAlreadyUsed) continue;
          
          // Check if this team creates valid intersections with all rows
          let validForAllRows = true;
          
          for (let rowIdx = 0; rowIdx < 3; rowIdx++) {
            const rowConstraint = rows[rowIdx];
            const intersection = calculateIntersectionSimple(
              rowConstraint,
              { type: 'team', tid: team.tid, label: team.name || `Team ${team.tid}` },
              players,
              seasonIndex,
              teams
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
          throw new Error(`Could not find valid team for col ${i} after trying 500 candidates`);
        }
        
      } else if (layout.cols[i] === 'A') {
        // Fill achievement slot - try up to 100 random achievements
        let found = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          const achIndex = simpleHash(gridId + '_colach' + i + '_' + attempt) % allAchievements.length;
          let ach = allAchievements[achIndex];
          
          // Dynamically customize career stat achievements
          if (sport) {
            ach = maybeCustomizeAchievement(ach, sport, gridId + '_colach' + i + '_' + attempt);
          }
          
          // Check if this achievement is already used in the grid
          const achAlreadyUsed = 
            rows.some(r => r && r.type === 'achievement' && r.achievementId === ach.id) ||
            cols.some(c => c && c.type === 'achievement' && c.achievementId === ach.id);
          
          if (achAlreadyUsed) continue;
          
          // Check for decade conflicts (prevent multiple decade achievements from same decade)
          if (hasDecadeConflict(ach.id, [...rows, ...cols])) {
            continue;
          }
          
          // Check for conflicting achievements (draft and season length)
          const hasConflictingDraft = draftAchievements.has(ach.id) && 
            [...rows, ...cols].some(slot => slot && slot.type === 'achievement' && draftAchievements.has(slot.achievementId!));
          const hasConflictingSeasonLength = seasonLengthAchievements.has(ach.id) && 
            [...rows, ...cols].some(slot => slot && slot.type === 'achievement' && seasonLengthAchievements.has(slot.achievementId!));
          
          if (hasConflictingDraft || hasConflictingSeasonLength) {
            if (hasConflictingSeasonLength) {
              console.log(`⚠️ Skipping ${ach.label} - conflicts with existing season length achievement`);
            }
            continue;
          }
          
          // Check if this achievement creates valid intersections with all rows
          let validForAllRows = true;
          
          for (let rowIdx = 0; rowIdx < 3; rowIdx++) {
            const rowConstraint = rows[rowIdx];
            if (!rowConstraint) continue; // Skip empty rows
            
            // Special validation for achievement × achievement intersections
            if (rowConstraint.type === 'achievement') {
              if (!validateAchievementIntersection(rowConstraint.achievementId!, ach.id, players, seasonIndex, 3)) {
                validForAllRows = false;
                break;
              }
            }
            
            const intersection = calculateIntersectionSimple(
              rowConstraint,
              { type: 'achievement', achievementId: ach.id, label: ach.label },
              players,
              seasonIndex,
              teams
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
              achv: mapAchievementToAchv(ach),
              test: (p: Player) => playerMeetsAchievement(p, ach.id, seasonIndex),
            };
            
            console.log(`     Selected achievement: ${ach.label} (attempt ${attempt + 1})`);
            found = true;
            break;
          }
        }
        
        if (!found) {
          throw new Error(`Could not find valid achievement for col ${i} after trying 500 candidates`);
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
      const key = `${row}-${col}`;
      const eligiblePlayers = calculateIntersectionSimple(rows[row], cols[col], players, seasonIndex, teams);
      intersections[key] = eligiblePlayers.map((p: Player) => p.pid);
      console.log(`Intersection ${rows[row].label} × ${cols[col].label}: ${eligiblePlayers.length} eligible players`);
    }
  }
  
  console.log('✅ Simplified seeded grid generated successfully');
  
  return { rows, cols, intersections };
}
