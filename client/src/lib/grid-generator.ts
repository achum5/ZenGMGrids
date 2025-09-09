// Grid generator utilities and functions for Basketball GM Immaculate Grid

import type { Player, Team } from '@/types/bbgm';
import { playerMeetsAchievement, getAchievements } from '@/lib/achievements';
import { SEASON_ACHIEVEMENTS, type SeasonAchievementId, type SeasonIndex, getSeasonEligiblePlayers } from './season-achievements';
import { evaluateConstraintPair } from './feedback';

// Type definitions for grid constraints
interface GridConstraint {
  type: 'team' | 'achievement';
  tid?: number;
  achievementId?: string;
  label: string;
  key: string;
  test: (p: Player) => boolean;
}

interface GridGenerationResult {
  rows: GridConstraint[];
  cols: GridConstraint[];
  intersections: Record<string, number[]>;
}

interface LeagueData {
  players: Player[];
  teams: Team[];
  sport: 'basketball' | 'football' | 'hockey' | 'baseball';
  seasonIndex?: SeasonIndex;
}

interface TeamPair {
  tid1: number;
  tid2: number;
  sharedPlayers: number;
}

interface Achievement {
  id: string;
  label: string;
  test: (p: Player) => boolean;
  isSeasonSpecific?: boolean;
}

// Fallback for when deterministic generation fails
export function generateGridFallback(
  players: Player[], 
  teams: Team[], 
  sport: 'basketball' | 'football' | 'hockey' | 'baseball'
): GridGenerationResult {
  console.log('⚠️ Using fallback grid generator');
  
  const achievements = getAchievements(sport);
  const activeTeams = teams.filter(team => !team.disabled);
  
  // Separate tracking for row and column constraints to avoid duplicates
  const usedRowTeams = new Set<number>();
  const usedColTeams = new Set<number>();
  const usedRowAchievements = new Set<string>();
  const usedColAchievements = new Set<string>();
  
  // Generate constraints for each axis separately
  const rows: GridConstraint[] = [];
  const cols: GridConstraint[] = [];
  
  // Create diverse row constraints (mix of teams and achievements)
  for (let i = 0; i < 3; i++) {
    const useTeam = Math.random() > 0.5; // 50% chance for team vs achievement
    
    if (useTeam) {
      const availableTeams = activeTeams.filter(t => !usedRowTeams.has(t.tid) && !usedColTeams.has(t.tid));
      if (availableTeams.length > 0) {
        const team = availableTeams[Math.floor(Math.random() * availableTeams.length)];
        usedRowTeams.add(team.tid);
        rows.push({
          type: 'team',
          tid: team.tid,
          label: team.name || `Team ${team.tid}`,
          key: `team-${team.tid}`,
          test: (p: Player) => p.teamsPlayed.has(team.tid),
        });
      } else {
        // Fall back to achievement if no teams available
        const availableAchievements = achievements.filter(a => !usedRowAchievements.has(a.id));
        if (availableAchievements.length > 0) {
          const achievement = availableAchievements[Math.floor(Math.random() * availableAchievements.length)];
          usedRowAchievements.add(achievement.id);
          rows.push({
            type: 'achievement',
            achievementId: achievement.id,
            label: achievement.label,
            key: `achievement-${achievement.id}`,
            test: (p: Player) => playerMeetsAchievement(p, achievement.id),
          });
        }
      }
    } else {
      const availableAchievements = achievements.filter(a => !usedRowAchievements.has(a.id) && !usedColAchievements.has(a.id));
      if (availableAchievements.length > 0) {
        const achievement = availableAchievements[Math.floor(Math.random() * availableAchievements.length)];
        usedRowAchievements.add(achievement.id);
        rows.push({
          type: 'achievement',
          achievementId: achievement.id,
          label: achievement.label,
          key: `achievement-${achievement.id}`,
          test: (p: Player) => playerMeetsAchievement(p, achievement.id),
        });
      } else {
        // Fall back to team if no achievements available
        const availableTeams = activeTeams.filter(t => !usedRowTeams.has(t.tid) && !usedColTeams.has(t.tid));
        if (availableTeams.length > 0) {
          const team = availableTeams[Math.floor(Math.random() * availableTeams.length)];
          usedRowTeams.add(team.tid);
          rows.push({
            type: 'team',
            tid: team.tid,
            label: team.name || `Team ${team.tid}`,
            key: `team-${team.tid}`,
            test: (p: Player) => p.teamsPlayed.has(team.tid),
          });
        }
      }
    }
  }
  
  // Create diverse column constraints (mix of teams and achievements, avoiding row duplicates)
  for (let i = 0; i < 3; i++) {
    const useTeam = Math.random() > 0.5; // 50% chance for team vs achievement
    
    if (useTeam) {
      const availableTeams = activeTeams.filter(t => !usedColTeams.has(t.tid) && !usedRowTeams.has(t.tid));
      if (availableTeams.length > 0) {
        const team = availableTeams[Math.floor(Math.random() * availableTeams.length)];
        usedColTeams.add(team.tid);
        cols.push({
          type: 'team',
          tid: team.tid,
          label: team.name || `Team ${team.tid}`,
          key: `team-${team.tid}`,
          test: (p: Player) => p.teamsPlayed.has(team.tid),
        });
      } else {
        // Fall back to achievement if no teams available
        const availableAchievements = achievements.filter(a => !usedColAchievements.has(a.id) && !usedRowAchievements.has(a.id));
        if (availableAchievements.length > 0) {
          const achievement = availableAchievements[Math.floor(Math.random() * availableAchievements.length)];
          usedColAchievements.add(achievement.id);
          cols.push({
            type: 'achievement',
            achievementId: achievement.id,
            label: achievement.label,
            key: `achievement-${achievement.id}`,
            test: (p: Player) => playerMeetsAchievement(p, achievement.id),
          });
        }
      }
    } else {
      const availableAchievements = achievements.filter(a => !usedColAchievements.has(a.id) && !usedRowAchievements.has(a.id));
      if (availableAchievements.length > 0) {
        const achievement = availableAchievements[Math.floor(Math.random() * availableAchievements.length)];
        usedColAchievements.add(achievement.id);
        cols.push({
          type: 'achievement',
          achievementId: achievement.id,
          label: achievement.label,
          key: `achievement-${achievement.id}`,
          test: (p: Player) => playerMeetsAchievement(p, achievement.id),
        });
      } else {
        // Fall back to team if no achievements available
        const availableTeams = activeTeams.filter(t => !usedColTeams.has(t.tid) && !usedRowTeams.has(t.tid));
        if (availableTeams.length > 0) {
          const team = availableTeams[Math.floor(Math.random() * availableTeams.length)];
          usedColTeams.add(team.tid);
          cols.push({
            type: 'team',
            tid: team.tid,
            label: team.name || `Team ${team.tid}`,
            key: `team-${team.tid}`,
            test: (p: Player) => p.teamsPlayed.has(team.tid),
          });
        }
      }
    }
  }
  
  // Ensure we have 3 constraints for each axis (pad with remaining constraints if needed)
  while (rows.length < 3) {
    const availableTeams = activeTeams.filter(t => !usedRowTeams.has(t.tid) && !usedColTeams.has(t.tid));
    if (availableTeams.length > 0) {
      const team = availableTeams[Math.floor(Math.random() * availableTeams.length)];
      usedRowTeams.add(team.tid);
      rows.push({
        type: 'team',
        tid: team.tid,
        label: team.name || `Team ${team.tid}`,
        key: `team-${team.tid}`,
        test: (p: Player) => p.teamsPlayed.has(team.tid),
      });
    } else {
      break;
    }
  }
  
  while (cols.length < 3) {
    const availableTeams = activeTeams.filter(t => !usedColTeams.has(t.tid) && !usedRowTeams.has(t.tid));
    if (availableTeams.length > 0) {
      const team = availableTeams[Math.floor(Math.random() * availableTeams.length)];
      usedColTeams.add(team.tid);
      cols.push({
        type: 'team',
        tid: team.tid,
        label: team.name || `Team ${team.tid}`,
        key: `team-${team.tid}`,
        test: (p: Player) => p.teamsPlayed.has(team.tid),
      });
    } else {
      break;
    }
  }
  
  console.log('🎯 Fallback grid generated:');
  console.log('  Rows:', rows.map(r => r.label));
  console.log('  Cols:', cols.map(c => c.label));
  
  // Calculate intersections
  const intersections: Record<string, number[]> = {};
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const key = `${rows[row].key}|${cols[col].key}`;
      const eligiblePlayers = players.filter(p => rows[row].test(p) && cols[col].test(p));
      intersections[key] = eligiblePlayers.map(p => p.pid);
    }
  }
  
  return { rows, cols, intersections };
}

/**
 * Coverage-aware grid generation for leagues with extensive season data
 * Uses seeded randomness for consistency and prioritizes team overlap
 */
export function generateGridSeeded(leagueData: LeagueData): GridGenerationResult {
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
    
    // Find viable season achievements that have >= 3 eligible teams (sport-filtered)
    const sportFilteredAchievements = getAchievements(sport, seasonIndex)
      .filter(ach => ach.isSeasonSpecific);
    
    const viableSeasonAchievements = sportFilteredAchievements.map(ach => 
      SEASON_ACHIEVEMENTS.find(sa => sa.id === ach.id)
    ).filter((sa): sa is NonNullable<typeof sa> => {
      if (!sa) return false;
      const eligibleTeams = getTeamsForAchievement(seasonIndex, sa.id, teams);
      
      // Debug baseball achievements specifically
      if (sport === 'baseball') {
        console.log(`🏀 Baseball achievement ${sa.id}: ${eligibleTeams.size} eligible teams`, Array.from(eligibleTeams));
      }
      
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
    layout.rows.forEach((type, i) => {
      if (type === 'A') achievementSlots.push({ axis: 'row', index: i });
    });
    layout.cols.forEach((type, i) => {
      if (type === 'A') achievementSlots.push({ axis: 'col', index: i });
    });
    
    if (achievementSlots.length === 0) {
      retryCount++;
      continue;
    }
    
    const slotIndex = simpleHash(gridId + '_slot' + retryCount) % achievementSlots.length;
    seedSlot = achievementSlots[slotIndex];
    
    retryCount++;
  } while (false); // Always break after first iteration now that we have better logic
  
  console.log(`✅ Step 2: Seeded with ${seedAchievement.label} at ${seedSlot.axis} ${seedSlot.index}`);
  
  // Initialize arrays
  const rows: Array<GridConstraint | null> = [null, null, null];
  const cols: Array<GridConstraint | null> = [null, null, null];
  const usedSeasonAchievements = new Set<SeasonAchievementId>([seedAchievement.id]);
  
  // Place seed achievement
  if (seedSlot.axis === 'row') {
    rows[seedSlot.index] = {
      type: 'achievement',
      achievementId: seedAchievement.id,
      label: seedAchievement.label,
      key: `achievement-${seedAchievement.id}`,
      test: (p: Player) => playerMeetsAchievement(p, seedAchievement.id, seasonIndex),
    };
  } else {
    cols[seedSlot.index] = {
      type: 'achievement',
      achievementId: seedAchievement.id,
      label: seedAchievement.label,
      key: `achievement-${seedAchievement.id}`,
      test: (p: Player) => playerMeetsAchievement(p, seedAchievement.id, seasonIndex),
    };
  }
  
  // Step 3: Fill opposite axis with teams that have players for the seed achievement
  const oppositeAxis = seedSlot.axis === 'row' ? 'col' : 'row';
  const oppositeLayout = seedSlot.axis === 'row' ? layout.cols : layout.rows;
  const oppositeArray = seedSlot.axis === 'row' ? cols : rows;
  
  console.log(`✅ Step 3: Filling opposite ${oppositeAxis} with layout [${oppositeLayout.join(', ')}]`);
  
  const eligibleTeamsForSeed = Array.from(getTeamsForAchievement(seasonIndex, seedAchievement.id, teams))
    .map(tid => teams.find(t => t.tid === tid))
    .filter((team): team is Team => team !== undefined && !team.disabled);
  
  // Shuffle eligible teams for variety
  for (let i = eligibleTeamsForSeed.length - 1; i > 0; i--) {
    const j = Math.floor(simpleHash(gridId + '_shuffle' + i) / Math.pow(2, 31) * (i + 1));
    [eligibleTeamsForSeed[i], eligibleTeamsForSeed[j]] = [eligibleTeamsForSeed[j], eligibleTeamsForSeed[i]];
  }
  
  for (let i = 0; i < 3; i++) {
    if (oppositeLayout[i] === 'T') {
      // Fill with team that has players for seed achievement
      let teamIndex = 0;
      let team: Team | undefined;
      
      while (teamIndex < eligibleTeamsForSeed.length && !team) {
        const candidateTeam = eligibleTeamsForSeed[teamIndex];
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
      
      console.log(`   Filled ${oppositeAxis} ${i} with team: ${team.name || `Team ${team.tid}`}`);
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
        throw new Error(`No viable achievements found for opposite axis with seed ${seedAchievement.label}`);
      }
      
      const achIndex = simpleHash(gridId + '_oppach' + i) % viableAchievements.length;
      const selectedAch = viableAchievements[achIndex];
      
      oppositeArray[i] = {
        type: 'achievement',
        achievementId: selectedAch.id,
        label: selectedAch.label,
        key: `achievement-${selectedAch.id}`,
        test: (p: Player) => playerMeetsAchievement(p, selectedAch.id, seasonIndex),
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
  const allAchievements = getAchievements('basketball')
    .filter(ach => !ach.isSeasonSpecific);
  
  // Filter out disabled teams for old-style fill
  const activeTeams = teams.filter(team => !team.disabled);
  
  // Find remaining empty slots
  for (let i = 0; i < 3; i++) {
    if (!rows[i]) {
      console.log(`   Filling empty row ${i} slot (type: ${layout.rows[i]})`);
      
      if (layout.rows[i] === 'T') {
        // Fill team slot - try up to 50 random teams
        let found = false;
        for (let attempt = 0; attempt < 50; attempt++) {
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
          
          // Check if this achievement creates valid intersections with all columns
          let validForAllCols = true;
          
          for (let colIdx = 0; colIdx < 3; colIdx++) {
            const colConstraint = cols[colIdx];
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
              test: (p: Player) => playerMeetsAchievement(p, ach.id, seasonIndex),
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
          
          // Check if this achievement creates valid intersections with all rows
          let validForAllRows = true;
          
          for (let rowIdx = 0; rowIdx < 3; rowIdx++) {
            const rowConstraint = rows[rowIdx];
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
              test: (p: Player) => playerMeetsAchievement(p, ach.id, seasonIndex),
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

// Get teams that have players for a specific achievement (only active teams)
function getTeamsForAchievement(seasonIndex: SeasonIndex, achievementId: SeasonAchievementId, allTeams: Team[]): Set<number> {
  const teams = new Set<number>();
  const activeTeamIds = new Set(allTeams.filter(t => !t.disabled).map(t => t.tid));
  
  for (const season of Object.values(seasonIndex)) {
    for (const [teamId, teamData] of Object.entries(season)) {
      const tid = parseInt(teamId);
      // Only include if team is currently active and has players for this achievement
      if (activeTeamIds.has(tid) && teamData[achievementId] && teamData[achievementId].size > 0) {
        teams.add(tid);
      }
    }
  }
  
  return teams;
}

// Helper function to validate achievement × achievement intersection has sufficient players 
function validateAchievementIntersection(
  achievement1: string,
  achievement2: string,
  players: Player[],
  seasonIndex?: SeasonIndex,
  minPlayers: number = 3
): boolean {
  if (achievement1 === achievement2) {
    // Same achievement - just check if enough players have it
    return players.filter(p => playerMeetsAchievement(p, achievement1, seasonIndex)).length >= minPlayers;
  }
  
  // Different achievements - check for players who have both
  const eligiblePlayers = players.filter(p => 
    playerMeetsAchievement(p, achievement1, seasonIndex) && 
    playerMeetsAchievement(p, achievement2, seasonIndex)
  );
  
  return eligiblePlayers.length >= minPlayers;
}

// Helper function to calculate intersection between two constraints - USES EXACT CUSTOM GRID LOGIC
function calculateIntersectionSimple(
  rowConstraint: any,
  colConstraint: any,
  players: Player[],
  seasonIndex?: SeasonIndex
): Player[] {
  // Use the exact same logic as custom grids for proper Team × Achievement alignment
  let eligiblePlayers: Player[];
  
  // Check if either constraint is a season achievement
  const rowIsSeasonAchievement = rowConstraint.type === 'achievement' && SEASON_ACHIEVEMENTS.some(sa => sa.id === rowConstraint.achievementId);
  const colIsSeasonAchievement = colConstraint.type === 'achievement' && SEASON_ACHIEVEMENTS.some(sa => sa.id === colConstraint.achievementId);
  
  if (rowIsSeasonAchievement && colConstraint.type === 'team' && seasonIndex) {
    // Season achievement × team
    const eligiblePids = getSeasonEligiblePlayers(seasonIndex, colConstraint.tid!, rowConstraint.achievementId as SeasonAchievementId);
    eligiblePlayers = players.filter(p => eligiblePids.has(p.pid));
  } else if (colIsSeasonAchievement && rowConstraint.type === 'team' && seasonIndex) {
    // Team × season achievement  
    const eligiblePids = getSeasonEligiblePlayers(seasonIndex, rowConstraint.tid!, colConstraint.achievementId as SeasonAchievementId);
    eligiblePlayers = players.filter(p => eligiblePids.has(p.pid));
  } else if (rowIsSeasonAchievement && colIsSeasonAchievement && seasonIndex) {
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
          
          // Find intersection of both achievements in this season
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
      evaluateConstraintPair(p, rowConstraint, colConstraint, seasonIndex)
    );
  }
  
  return eligiblePlayers;
}

// Get intersection count for two constraints
function getIntersectionCount(constraint1: any, constraint2: any, players: Player[]): number {
  return players.filter(p => constraint1.test(p) && constraint2.test(p)).length;
}

/**
 * Get viable team pairs based on shared player count
 */
function getViableTeamPairs(players: Player[], teams: Team[], minShared: number = 15): TeamPair[] {
  const pairs: TeamPair[] = [];
  const activeTeams = teams.filter(team => !team.disabled);
  
  for (let i = 0; i < activeTeams.length; i++) {
    for (let j = i + 1; j < activeTeams.length; j++) {
      const team1 = activeTeams[i];
      const team2 = activeTeams[j];
      
      const sharedPlayers = players.filter(p => 
        p.teamsPlayed.has(team1.tid) && p.teamsPlayed.has(team2.tid)
      ).length;
      
      if (sharedPlayers >= minShared) {
        pairs.push({
          tid1: team1.tid,
          tid2: team2.tid,
          sharedPlayers
        });
      }
    }
  }
  
  return pairs.sort((a, b) => b.sharedPlayers - a.sharedPlayers);
}

/**
 * Generate structured 3×3 grids for smaller leagues (< 20 seasons)
 * Follows exact specification: teams always first, 2-3 achievements total, specific patterns only
 */
export function generateGridGreedy(
  players: Player[], 
  teams: Team[], 
  sport: 'basketball' | 'football' | 'hockey' | 'baseball',
  seasonIndex?: SeasonIndex
): GridGenerationResult {
  console.log('🎯 Using low-season grid generator (< 20 seasons)');
  
  // Get non-season achievements (draft, career stats, milestones)
  const achievements = getAchievements(sport, seasonIndex);
  const nonSeasonAchievements = achievements.filter(a => !a.isSeasonSpecific);
  const activeTeams = teams.filter(team => !team.disabled);
  
  if (activeTeams.length < 3) {
    throw new Error('Not enough teams for grid generation');
  }
  
  // Define the 5 allowed layouts (teams always first on each axis)
  const allowedLayouts = [
    { name: '1T2A × 3T', rows: ['T', 'A', 'A'], cols: ['T', 'T', 'T'], totalAchievements: 2 },
    { name: '3T × 1T2A', rows: ['T', 'T', 'T'], cols: ['T', 'A', 'A'], totalAchievements: 2 },
    { name: '2T1A × 2T1A', rows: ['T', 'T', 'A'], cols: ['T', 'T', 'A'], totalAchievements: 2 },
    { name: '2T1A × 1T2A', rows: ['T', 'T', 'A'], cols: ['T', 'A', 'A'], totalAchievements: 3 },
    { name: '1T2A × 2T1A', rows: ['T', 'A', 'A'], cols: ['T', 'T', 'A'], totalAchievements: 3 }
  ];
  
  // Pick a random layout
  const layout = allowedLayouts[Math.floor(Math.random() * allowedLayouts.length)];
  console.log(`🎯 Selected layout: ${layout.name} (${layout.totalAchievements} achievements total)`);
  
  // Select teams for the grid (no duplicates across axes)
  const teamsNeeded = Math.max(
    layout.rows.filter(t => t === 'T').length,
    layout.cols.filter(t => t === 'T').length
  ) + Math.min(
    layout.rows.filter(t => t === 'T').length,
    layout.cols.filter(t => t === 'T').length
  );
  
  const selectedTeams = activeTeams
    .sort(() => Math.random() - 0.5) // Shuffle
    .slice(0, Math.min(teamsNeeded, activeTeams.length));
  
  // Select achievements (no duplicates)
  const selectedAchievements = nonSeasonAchievements
    .sort(() => Math.random() - 0.5) // Shuffle
    .slice(0, layout.totalAchievements);
  
  if (selectedAchievements.length < layout.totalAchievements) {
    throw new Error('Not enough non-season achievements available');
  }
  
  // Build constraints following the exact pattern
  const rows: GridConstraint[] = [];
  const cols: GridConstraint[] = [];
  
  let teamIndex = 0;
  let achievementIndex = 0;
  
  // Fill rows according to pattern
  for (let i = 0; i < 3; i++) {
    if (layout.rows[i] === 'T') {
      const team = selectedTeams[teamIndex++];
      rows.push({
        type: 'team',
        tid: team.tid,
        label: team.name || `Team ${team.tid}`,
        key: `team-${team.tid}`,
        test: (p: Player) => p.teamsPlayed.has(team.tid),
      });
    } else { // 'A'
      const achievement = selectedAchievements[achievementIndex++];
      rows.push({
        type: 'achievement',
        achievementId: achievement.id,
        label: achievement.label,
        key: `achievement-${achievement.id}`,
        test: (p: Player) => playerMeetsAchievement(p, achievement.id, seasonIndex),
      });
    }
  }
  
  // Fill columns according to pattern (continue with remaining teams/achievements)
  for (let i = 0; i < 3; i++) {
    if (layout.cols[i] === 'T') {
      if (teamIndex < selectedTeams.length) {
        const team = selectedTeams[teamIndex++];
        cols.push({
          type: 'team',
          tid: team.tid,
          label: team.name || `Team ${team.tid}`,
          key: `team-${team.tid}`,
          test: (p: Player) => p.teamsPlayed.has(team.tid),
        });
      } else {
        // Need more teams - select from remaining
        const usedTeamIds = new Set([...rows, ...cols]
          .filter(c => c.type === 'team')
          .map(c => c.tid));
        const availableTeams = activeTeams.filter(t => !usedTeamIds.has(t.tid));
        if (availableTeams.length > 0) {
          const team = availableTeams[Math.floor(Math.random() * availableTeams.length)];
          cols.push({
            type: 'team',
            tid: team.tid,
            label: team.name || `Team ${team.tid}`,
            key: `team-${team.tid}`,
            test: (p: Player) => p.teamsPlayed.has(team.tid),
          });
        }
      }
    } else { // 'A'
      if (achievementIndex < selectedAchievements.length) {
        const achievement = selectedAchievements[achievementIndex++];
        cols.push({
          type: 'achievement',
          achievementId: achievement.id,
          label: achievement.label,
          key: `achievement-${achievement.id}`,
          test: (p: Player) => playerMeetsAchievement(p, achievement.id, seasonIndex),
        });
      } else {
        // Need more achievements - select from remaining
        const usedAchievementIds = new Set([...rows, ...cols]
          .filter(c => c.type === 'achievement')
          .map(c => c.achievementId));
        const availableAchievements = nonSeasonAchievements.filter(a => !usedAchievementIds.has(a.id));
        if (availableAchievements.length > 0) {
          const achievement = availableAchievements[Math.floor(Math.random() * availableAchievements.length)];
          cols.push({
            type: 'achievement',
            achievementId: achievement.id,
            label: achievement.label,
            key: `achievement-${achievement.id}`,
            test: (p: Player) => playerMeetsAchievement(p, achievement.id, seasonIndex),
          });
        }
      }
    }
  }
  
  // Ensure we have exactly 3 constraints for each axis
  if (rows.length < 3 || cols.length < 3) {
    throw new Error('Failed to generate complete grid constraints');
  }
  
  console.log('🎯 Low-season grid generated:');
  console.log('  Rows:', rows.map((r, i) => `${i+1}. ${r.type === 'team' ? '🏀' : '🏆'} ${r.label}`));
  console.log('  Cols:', cols.map((c, i) => `${i+1}. ${c.type === 'team' ? '🏀' : '🏆'} ${c.label}`));
  
  // Validate header coverage (≥3 players per intersection)
  let validationFailed = false;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const eligiblePlayers = calculateIntersectionSimple(rows[row], cols[col], players, seasonIndex);
      if (eligiblePlayers.length < 3) {
        console.log(`⚠️ Low coverage: ${rows[row].label} × ${cols[col].label} = ${eligiblePlayers.length} players`);
        validationFailed = true;
      }
    }
  }
  
  if (validationFailed) {
    throw new Error('Grid failed header coverage validation (some intersections have <3 players)');
  }
  
  // Calculate intersections
  const intersections: Record<string, number[]> = {};
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const key = `${rows[row].key}|${cols[col].key}`;
      const eligiblePlayers = calculateIntersectionSimple(rows[row], cols[col], players, seasonIndex);
      intersections[key] = eligiblePlayers.map((p: Player) => p.pid);
    }
  }
  
  console.log('✅ Low-season grid validated and generated successfully');
  return { rows, cols, intersections };
}

/**
 * Main grid generation function that tries different strategies
 */
export function generateGrid(leagueData: LeagueData): GridGenerationResult {
  const { players, teams, sport, seasonIndex } = leagueData;
  
  // Get unique seasons for coverage assessment
  const allSeasons = new Set<number>();
  for (const player of players) {
    if (player.stats) {
      for (const stat of player.stats) {
        if (stat.season) {
          allSeasons.add(stat.season);
        }
      }
    }
  }
  
  const uniqueSeasons = Array.from(allSeasons);
  console.log(`🎯 STARTING GRID GENERATION for ${sport} (${players.length} players, ${teams.filter(t => !t.disabled).length} teams)`);
  console.log(`Unique seasons found: ${uniqueSeasons.length}`);
  
  try {
    // Use seeded generation for leagues with extensive season data
    if (uniqueSeasons.length >= 20 && seasonIndex && (sport === 'basketball' || sport === 'football')) {
      console.log(`Using new seeded coverage-aware builder (>= 20 seasons, ${sport})`);
      return generateGridSeeded(leagueData);
    }
    
    // Fall back to greedy for smaller leagues or sports without season achievements
    console.log('Using greedy generation with backtracking');
    return generateGridGreedy(players, teams, sport, seasonIndex);
    
  } catch (error) {
    console.log(`⚠️ Grid generation failed: ${error}. Using fallback.`);
    return generateGridFallback(players, teams, sport);
  }
}

/**
 * Generate cell key for player submission tracking
 */
export function getCellKey(rowTid: number, colTid: number): string {
  return `${rowTid}|${colTid}`;
}

/**
 * Export cellKey alias for compatibility
 */
export const cellKey = getCellKey;

/**
 * Generate teams grid (alias for generateGrid)
 */
export const generateTeamsGrid = generateGrid;