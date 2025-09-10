// Grid generator utilities and functions for Basketball GM Immaculate Grid

import type { Player, Team } from '@/types/bbgm';
import { playerMeetsAchievement, getAchievements, SEASON_ALIGNED_ACHIEVEMENTS } from '@/lib/achievements';
import { SEASON_ACHIEVEMENTS, type SeasonAchievementId, type SeasonIndex, type CareerEverIndex, getSeasonEligiblePlayers, getCareerEverIntersection } from './season-achievements';
import { isAchievementByAchievementCell, getAchievementId } from '@/lib/achievement-detection';
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
  careerEverIndex?: CareerEverIndex;
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
  const { players, teams, sport, seasonIndex, careerEverIndex } = leagueData;
  
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
  const allAchievements = getAchievements(sport)
    .filter(ach => !ach.isSeasonSpecific);
  
  // Mutual exclusion: career seasons constraint (same as greedy generator)
  const careerSeasonsGroup = ["Played 10+ Seasons", "Played 15+ Seasons"];
  const usedAchievements = new Set<string>();
  
  // Check if any career seasons achievements were already selected in step 3
  const existingAchievements = [...rows, ...cols].filter(item => item?.type === 'achievement');
  for (const item of existingAchievements) {
    if (item.achievementId) {
      usedAchievements.add(item.achievementId);
    }
  }
  
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
          
          // Check career seasons mutual exclusion
          if (careerSeasonsGroup.includes(ach.label)) {
            const hasCareerSeasons = Array.from(usedAchievements).some(achId => {
              const usedAch = allAchievements.find(a => a.id === achId);
              return usedAch && careerSeasonsGroup.includes(usedAch.label);
            });
            if (hasCareerSeasons) continue; // Skip if we already have one
          }
          
          // Skip if this achievement ID is already used
          if (usedAchievements.has(ach.id)) continue;
          
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
            
            usedAchievements.add(ach.id); // Track used achievement
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
          
          // Check career seasons mutual exclusion
          if (careerSeasonsGroup.includes(ach.label)) {
            const hasCareerSeasons = Array.from(usedAchievements).some(achId => {
              const usedAch = allAchievements.find(a => a.id === achId);
              return usedAch && careerSeasonsGroup.includes(usedAch.label);
            });
            if (hasCareerSeasons) continue; // Skip if we already have one
          }
          
          // Skip if this achievement ID is already used
          if (usedAchievements.has(ach.id)) continue;
          
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
            
            usedAchievements.add(ach.id); // Track used achievement
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
      const eligiblePlayers = calculateIntersectionSimple(rows[row], cols[col], players, seasonIndex, careerEverIndex);
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
  seasonIndex?: SeasonIndex,
  careerEverIndex?: any
): Player[] {
  // Use the exact same logic as custom grids for proper Team × Achievement alignment
  let eligiblePlayers: Player[];
  
  // Check if this is Achievement × Achievement (ANY achievement types)
  if (isAchievementByAchievementCell(rowConstraint, colConstraint)) {
    // Achievement × Achievement - Use career-ever logic (no season/team alignment)
    if (careerEverIndex) {
      // Use career-ever index for fast intersection
      if (rowConstraint.achievementId === colConstraint.achievementId) {
        // Same achievement - just find all players who ever achieved it
        const achievementSet = careerEverIndex[rowConstraint.achievementId] || new Set<number>();
        eligiblePlayers = players.filter(p => achievementSet.has(p.pid));
      } else {
        // Different achievements - find intersection using career-ever index
        const eligiblePids = getCareerEverIntersection(
          careerEverIndex, 
          rowConstraint.achievementId, 
          colConstraint.achievementId
        );
        eligiblePlayers = players.filter(p => eligiblePids.has(p.pid));
      }
    } else if (seasonIndex) {
      // Fallback to season index logic if career-ever index not available
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
        // Different achievements - find players who have BOTH achievements across ANY seasons (no season alignment)
        const rowEligiblePids = new Set<number>();
        const colEligiblePids = new Set<number>();
        
        // Collect all players who have the row achievement in any season
        for (const seasonStr of Object.keys(seasonIndex)) {
          const season = parseInt(seasonStr);
          const seasonData = seasonIndex[season];
          for (const teamStr of Object.keys(seasonData)) {
            const teamId = parseInt(teamStr);
            const teamData = seasonData[teamId];
            const rowAchievementPids = teamData[rowConstraint.achievementId as SeasonAchievementId] || new Set();
            rowAchievementPids.forEach(pid => rowEligiblePids.add(pid));
          }
        }
        
        // Collect all players who have the column achievement in any season
        for (const seasonStr of Object.keys(seasonIndex)) {
          const season = parseInt(seasonStr);
          const seasonData = seasonIndex[season];
          for (const teamStr of Object.keys(seasonData)) {
            const teamId = parseInt(teamStr);
            const teamData = seasonData[teamId];
            const colAchievementPids = teamData[colConstraint.achievementId as SeasonAchievementId] || new Set();
            colAchievementPids.forEach(pid => colEligiblePids.add(pid));
          }
        }
        
        // Find intersection of players who have both achievements (across any seasons)
        const eligiblePids = new Set<number>();
        rowEligiblePids.forEach(pid => {
          if (colEligiblePids.has(pid)) {
            eligiblePids.add(pid);
          }
        });
        
        eligiblePlayers = players.filter(p => eligiblePids.has(p.pid));
      }
    } else {
      // No indices available - fallback to player-by-player evaluation
      eligiblePlayers = players.filter(p => 
        evaluateConstraintPair(p, rowConstraint, colConstraint, seasonIndex)
      );
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
 * Enforce team-first rule: move first team to index 0, keeping relative order
 */
function enforceTeamFirst(headers: GridConstraint[]): GridConstraint[] {
  const teamCount = headers.filter(h => h.type === 'team').length;
  const achievementCount = headers.filter(h => h.type === 'achievement').length;
  
  // Reject invalid compositions
  if (teamCount === 0 || teamCount === 3 || achievementCount === 3) {
    throw new Error(`Invalid axis composition: ${teamCount}T/${achievementCount}A. Only 1T2A or 2T1A allowed.`);
  }
  
  // Find first team and move to index 0
  const firstTeamIndex = headers.findIndex(h => h.type === 'team');
  if (firstTeamIndex === 0) {
    return headers; // Already correct
  }
  
  // Move first team to front, keep relative order of others
  const result = [...headers];
  const team = result.splice(firstTeamIndex, 1)[0];
  result.unshift(team);
  
  return result;
}

/**
 * Generate structured 3×3 grids for smaller leagues (< 20 seasons)
 * Rebuilt with hard guarantees: all cells >1 players, team-first ordering, repair loops
 */
export function generateGridGreedy(
  players: Player[], 
  teams: Team[], 
  sport: 'basketball' | 'football' | 'hockey' | 'baseball',
  seasonIndex?: SeasonIndex,
  careerEverIndex?: CareerEverIndex
): GridGenerationResult {
  console.log('🎯 Using low-season grid generator (< 20 seasons)');
  
  const achievements = getAchievements(sport, seasonIndex);
  const activeTeams = teams.filter(team => !team.disabled);
  
  if (activeTeams.length < 3) {
    throw new Error('Not enough teams for grid generation');
  }
  
  // Mutual exclusion groups
  const careerSeasonsGroup = ["Played 10+ Seasons", "Played 15+ Seasons"];
  
  // Tier A: Preferred layouts (2-3 achievements)
  const tierALayouts = [
    { name: '1T2A × 3T', rows: ['T', 'A', 'A'], cols: ['T', 'T', 'T'], totalAchievements: 2 },
    { name: '3T × 1T2A', rows: ['T', 'T', 'T'], cols: ['T', 'A', 'A'], totalAchievements: 2 },
    { name: '2T1A × 2T1A', rows: ['T', 'T', 'A'], cols: ['T', 'T', 'A'], totalAchievements: 2 },
    { name: '2T1A × 1T2A', rows: ['T', 'T', 'A'], cols: ['T', 'A', 'A'], totalAchievements: 3 },
    { name: '1T2A × 2T1A', rows: ['T', 'A', 'A'], cols: ['T', 'T', 'A'], totalAchievements: 3 }
  ];
  
  // Tier B: Fallback layouts (1 achievement)
  const tierBLayouts = [
    { name: '3T × 2T1A', rows: ['T', 'T', 'T'], cols: ['T', 'T', 'A'], totalAchievements: 1 },
    { name: '2T1A × 3T', rows: ['T', 'T', 'A'], cols: ['T', 'T', 'T'], totalAchievements: 1 }
  ];
  
  // Tier C: Last resort (0 achievements)
  const tierCLayouts = [
    { name: '3T × 3T', rows: ['T', 'T', 'T'], cols: ['T', 'T', 'T'], totalAchievements: 0 }
  ];
  
  // Try each tier in order
  for (const tier of [
    { name: 'A', layouts: tierALayouts, attempts: 25 },
    { name: 'B', layouts: tierBLayouts, attempts: 15 },
    { name: 'C', layouts: tierCLayouts, attempts: 5 }
  ]) {
    
    for (let tierAttempt = 0; tierAttempt < tier.attempts; tierAttempt++) {
      
      // Try each layout in this tier
      for (const layout of tier.layouts) {
        
        try {
          const result = attemptGrid(layout, players, activeTeams, achievements, seasonIndex, careerEverIndex, careerSeasonsGroup, sport);
          if (result) {
            console.log(`✅ Tier ${tier.name} grid generated using ${layout.name}`);
            return result;
          }
        } catch (error) {
          // Continue to next layout/attempt
          continue;
        }
      }
    }
    
    console.log(`⚠️ Tier ${tier.name} failed, trying next tier`);
  }
  
  // Final fallback
  throw new Error('Could not generate valid grid with guaranteed >1 players per cell');
}

/**
 * Attempt to build a valid grid with the given layout
 */
function attemptGrid(
  layout: any,
  players: Player[],
  activeTeams: any[],
  achievements: any[],
  seasonIndex: SeasonIndex | undefined,
  careerEverIndex: CareerEverIndex | undefined,
  careerSeasonsGroup: string[],
  sport: string
): GridGenerationResult | null {
  
  // Step 1: Pick headers pool-aware
  const { rows, cols } = pickHeaders(layout, activeTeams, achievements, careerSeasonsGroup, seasonIndex);
  
  // Step 2: Build eligibility matrix
  let eligibilityMatrix = buildEligibilityMatrix(rows, cols, players, seasonIndex, careerEverIndex);
  
  // Step 3: Validate hard guarantees
  let violations = findViolations(eligibilityMatrix);
  
  // Step 4: Repair loop (max 10 attempts)
  for (let repairAttempt = 0; repairAttempt < 10; repairAttempt++) {
    
    if (violations.zeros.length === 0 && violations.singletons.length === 0) {
      // Success! Build final result
      const intersections: Record<string, number[]> = {};
      
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const key = `${rows[r].key}|${cols[c].key}`;
          intersections[key] = eligibilityMatrix[r][c].map(p => p.pid);
        }
      }
      
      console.log(`🎯 Selected layout: ${layout.name} (${layout.totalAchievements} achievements total)`);
      logCellCounts(rows, cols, eligibilityMatrix);
      
      return { rows, cols, intersections };
    }
    
    // Try to repair violations
    const repaired = repairViolations(rows, cols, eligibilityMatrix, violations, activeTeams, achievements, careerSeasonsGroup);
    if (!repaired) {
      break; // Can't repair further
    }
    
    // Rebuild matrix and check again
    eligibilityMatrix = buildEligibilityMatrix(rows, cols, players, seasonIndex, careerEverIndex);
    violations = findViolations(eligibilityMatrix);
  }
  
  return null; // Failed to repair
}

/**
 * Pick headers for the layout, respecting team-first ordering and mutual exclusion
 */
function pickHeaders(
  layout: any,
  activeTeams: any[],
  achievements: any[],
  careerSeasonsGroup: string[],
  seasonIndex: SeasonIndex | undefined
) {
  const rows: GridConstraint[] = [];
  const cols: GridConstraint[] = [];
  
  // Get available achievements (prefer career over season for broader pools)
  const careerAchievements = achievements.filter(a => !a.isSeasonSpecific);
  const seasonAchievements = achievements.filter(a => a.isSeasonSpecific);
  const availableAchievements = [...careerAchievements, ...seasonAchievements];
  
  // Shuffle teams and achievements
  const shuffledTeams = [...activeTeams].sort(() => Math.random() - 0.5);
  const shuffledAchievements = [...availableAchievements].sort(() => Math.random() - 0.5);
  
  // Global tracking to prevent duplicates across entire grid
  const usedAchievements = new Set<string>();
  const usedTeams = new Set<number>();
  
  // Fill rows
  for (let i = 0; i < 3; i++) {
    if (layout.rows[i] === 'T') {
      // Find next available team not already used
      let foundTeam = false;
      for (const team of shuffledTeams) {
        if (!usedTeams.has(team.tid)) {
          rows.push({
            type: 'team',
            tid: team.tid,
            label: team.name || `Team ${team.tid}`,
            key: `team-${team.tid}`,
            test: (p: Player) => p.teamsPlayed.has(team.tid),
          });
          usedTeams.add(team.tid);
          foundTeam = true;
          break;
        }
      }
      
      if (!foundTeam) {
        throw new Error('Not enough unique teams available for grid');
      }
      
    } else if (layout.rows[i] === 'A') {
      // Find next available achievement not already used
      let foundAchievement = false;
      for (const ach of shuffledAchievements) {
        if (usedAchievements.has(ach.id)) continue;
        
        // Check career seasons mutual exclusion
        if (careerSeasonsGroup.includes(ach.label)) {
          const hasCareerSeasons = Array.from(usedAchievements).some(id => {
            const usedAch = achievements.find(a => a.id === id);
            return usedAch && careerSeasonsGroup.includes(usedAch.label);
          });
          if (hasCareerSeasons) continue;
        }
        
        rows.push({
          type: 'achievement',
          achievementId: ach.id,
          label: ach.label,
          key: `achievement-${ach.id}`,
          test: (p: Player) => playerMeetsAchievement(p, ach.id, seasonIndex),
        });
        usedAchievements.add(ach.id);
        foundAchievement = true;
        break;
      }
      
      if (!foundAchievement) {
        throw new Error('Not enough compatible unique achievements available');
      }
    }
  }
  
  // Fill columns (ensuring no duplicates from rows)
  for (let i = 0; i < 3; i++) {
    if (layout.cols[i] === 'T') {
      // Find next available team not already used anywhere in grid
      let foundTeam = false;
      for (const team of shuffledTeams) {
        if (!usedTeams.has(team.tid)) {
          cols.push({
            type: 'team',
            tid: team.tid,
            label: team.name || `Team ${team.tid}`,
            key: `team-${team.tid}`,
            test: (p: Player) => p.teamsPlayed.has(team.tid),
          });
          usedTeams.add(team.tid);
          foundTeam = true;
          break;
        }
      }
      
      if (!foundTeam) {
        throw new Error('Not enough unique teams available for grid');
      }
      
    } else if (layout.cols[i] === 'A') {
      // Find next available achievement not already used anywhere in grid
      let foundAchievement = false;
      for (const ach of shuffledAchievements) {
        if (usedAchievements.has(ach.id)) continue;
        
        // Check career seasons mutual exclusion
        if (careerSeasonsGroup.includes(ach.label)) {
          const hasCareerSeasons = Array.from(usedAchievements).some(id => {
            const usedAch = achievements.find(a => a.id === id);
            return usedAch && careerSeasonsGroup.includes(usedAch.label);
          });
          if (hasCareerSeasons) continue;
        }
        
        cols.push({
          type: 'achievement',
          achievementId: ach.id,
          label: ach.label,
          key: `achievement-${ach.id}`,
          test: (p: Player) => playerMeetsAchievement(p, ach.id, seasonIndex),
        });
        usedAchievements.add(ach.id);
        foundAchievement = true;
        break;
      }
      
      if (!foundAchievement) {
        throw new Error('Not enough compatible unique achievements available');
      }
    }
  }
  
  return { rows, cols };
}

/**
 * Build 3x3 eligibility matrix using same validation logic as gameplay
 */
function buildEligibilityMatrix(
  rows: GridConstraint[],
  cols: GridConstraint[],
  players: Player[],
  seasonIndex?: SeasonIndex,
  careerEverIndex?: CareerEverIndex
): Player[][][] {
  const matrix: Player[][][] = [];
  
  for (let r = 0; r < 3; r++) {
    matrix[r] = [];
    for (let c = 0; c < 3; c++) {
      matrix[r][c] = calculateIntersectionSimple(rows[r], cols[c], players, seasonIndex, careerEverIndex);
    }
  }
  
  return matrix;
}

/**
 * Find cells that violate hard guarantees (zeros or singletons)
 */
function findViolations(eligibilityMatrix: Player[][][]): { zeros: [number, number][], singletons: [number, number][] } {
  const zeros: [number, number][] = [];
  const singletons: [number, number][] = [];
  
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const count = eligibilityMatrix[r][c].length;
      if (count === 0) {
        zeros.push([r, c]);
      } else if (count === 1) {
        singletons.push([r, c]);
      }
    }
  }
  
  return { zeros, singletons };
}

/**
 * Attempt to repair violations by swapping headers for broader ones
 */
function repairViolations(
  rows: GridConstraint[],
  cols: GridConstraint[],
  eligibilityMatrix: Player[][][],
  violations: { zeros: [number, number][], singletons: [number, number][] },
  activeTeams: any[],
  achievements: any[],
  careerSeasonsGroup: string[]
): boolean {
  
  // Focus on zero cells first
  if (violations.zeros.length > 0) {
    // Find the axis contributing to most zeros
    const rowZeroCounts = [0, 0, 0];
    const colZeroCounts = [0, 0, 0];
    
    for (const [r, c] of violations.zeros) {
      rowZeroCounts[r]++;
      colZeroCounts[c]++;
    }
    
    const maxRowZeros = Math.max(...rowZeroCounts);
    const maxColZeros = Math.max(...colZeroCounts);
    
    if (maxRowZeros >= maxColZeros) {
      // Try swapping the worst row - pass combined headers to check global duplicates
      const worstRow = rowZeroCounts.indexOf(maxRowZeros);
      return trySwapHeaderGlobal(rows, cols, worstRow, 'row', achievements, careerSeasonsGroup, activeTeams);
    } else {
      // Try swapping the worst column - pass combined headers to check global duplicates
      const worstCol = colZeroCounts.indexOf(maxColZeros);
      return trySwapHeaderGlobal(rows, cols, worstCol, 'col', achievements, careerSeasonsGroup, activeTeams);
    }
  }
  
  // Handle singleton cells
  if (violations.singletons.length > 0) {
    // Try swapping any header contributing to singletons
    const [r, c] = violations.singletons[0];
    
    // Try row first, then column
    if (trySwapHeaderGlobal(rows, cols, r, 'row', achievements, careerSeasonsGroup, activeTeams)) {
      return true;
    }
    return trySwapHeaderGlobal(rows, cols, c, 'col', achievements, careerSeasonsGroup, activeTeams);
  }
  
  return false;
}

/**
 * Try to swap a header while checking for duplicates across the entire grid
 */
function trySwapHeaderGlobal(
  rows: GridConstraint[],
  cols: GridConstraint[],
  index: number,
  axis: 'row' | 'col',
  achievements: any[],
  careerSeasonsGroup: string[],
  activeTeams: any[]
): boolean {
  
  const headers = axis === 'row' ? rows : cols;
  const currentHeader = headers[index];
  
  // Get ALL used IDs across BOTH rows and cols (entire grid)
  const allHeaders = [...rows, ...cols];
  const usedIds = new Set(allHeaders.map(h => h.type === 'team' ? h.tid : h.achievementId).filter(id => id !== undefined));
  
  if (currentHeader.type === 'achievement') {
    // Try swapping for a broader achievement (prefer career over season)
    const careerAchievements = achievements.filter(a => !a.isSeasonSpecific);
    const seasonAchievements = achievements.filter(a => a.isSeasonSpecific);
    const alternatives = [...careerAchievements, ...seasonAchievements];
    
    for (const ach of alternatives) {
      // Skip if this achievement is already used anywhere in the entire grid
      if (usedIds.has(ach.id)) continue;
      
      // Check mutual exclusion
      if (careerSeasonsGroup.includes(ach.label)) {
        const hasCareerSeasons = allHeaders.some(h => 
          h.type === 'achievement' && h.achievementId !== currentHeader.achievementId &&
          careerSeasonsGroup.includes(ach.label)
        );
        if (hasCareerSeasons) continue;
      }
      
      // Swap it in
      headers[index] = {
        type: 'achievement',
        achievementId: ach.id,
        label: ach.label,
        key: `achievement-${ach.id}`,
        test: (p: Player) => playerMeetsAchievement(p, ach.id),
      };
      return true;
    }
    
  } else if (currentHeader.type === 'team') {
    // Try swapping for a different team
    const availableTeams = activeTeams.filter(t => !usedIds.has(t.tid));
    if (availableTeams.length > 0) {
      const newTeam = availableTeams[Math.floor(Math.random() * availableTeams.length)];
      headers[index] = {
        type: 'team',
        tid: newTeam.tid,
        label: newTeam.name || `Team ${newTeam.tid}`,
        key: `team-${newTeam.tid}`,
        test: (p: Player) => p.teamsPlayed.has(newTeam.tid),
      };
      return true;
    }
  }
  
  return false;
}

/**
 * Try to swap a header for a broader alternative
 */
function trySwapHeader(
  headers: GridConstraint[],
  index: number,
  axis: 'row' | 'col',
  achievements: any[],
  careerSeasonsGroup: string[],
  activeTeams: any[]
): boolean {
  
  const currentHeader = headers[index];
  // Get ALL used IDs across the ENTIRE grid (both rows and cols will be passed in)
  const usedIds = new Set(headers.map(h => h.type === 'team' ? h.tid : h.achievementId).filter(id => id !== undefined));
  
  if (currentHeader.type === 'achievement') {
    // Try swapping for a broader achievement (prefer career over season)
    const careerAchievements = achievements.filter(a => !a.isSeasonSpecific && !usedIds.has(a.id));
    const seasonAchievements = achievements.filter(a => a.isSeasonSpecific && !usedIds.has(a.id));
    const alternatives = [...careerAchievements, ...seasonAchievements];
    
    for (const ach of alternatives) {
      // Skip if this achievement is already used anywhere in the grid
      if (usedIds.has(ach.id)) continue;
      
      // Check mutual exclusion
      if (careerSeasonsGroup.includes(ach.label)) {
        const hasCareerSeasons = headers.some(h => 
          h.type === 'achievement' && h.achievementId !== currentHeader.achievementId &&
          careerSeasonsGroup.includes(ach.label)
        );
        if (hasCareerSeasons) continue;
      }
      
      // Swap it in
      headers[index] = {
        type: 'achievement',
        achievementId: ach.id,
        label: ach.label,
        key: `achievement-${ach.id}`,
        test: (p: Player) => playerMeetsAchievement(p, ach.id),
      };
      return true;
    }
    
  } else if (currentHeader.type === 'team') {
    // Try swapping for a different team
    const availableTeams = activeTeams.filter(t => !usedIds.has(t.tid));
    if (availableTeams.length > 0) {
      const newTeam = availableTeams[Math.floor(Math.random() * availableTeams.length)];
      headers[index] = {
        type: 'team',
        tid: newTeam.tid,
        label: newTeam.name || `Team ${newTeam.tid}`,
        key: `team-${newTeam.tid}`,
        test: (p: Player) => p.teamsPlayed.has(newTeam.tid),
      };
      return true;
    }
  }
  
  return false;
}

/**
 * Log cell counts for debugging
 */
function logCellCounts(rows: GridConstraint[], cols: GridConstraint[], eligibilityMatrix: Player[][][]) {
  console.log('✅ Low-season grid validated and generated successfully');
  
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const count = eligibilityMatrix[r][c].length;
      if (count <= 3) {
        console.log(`⚠️ Low coverage: ${rows[r].label} × ${cols[c].label} = ${count} players`);
      }
    }
  }
}

/**
 * Main grid generation function that tries different strategies
 */
export function generateGrid(leagueData: LeagueData): GridGenerationResult {
  const { players, teams, sport, seasonIndex, careerEverIndex } = leagueData;
  
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
    return generateGridGreedy(players, teams, sport, seasonIndex, careerEverIndex);
    
  } catch (error) {
    console.log(`⚠️ Grid generation failed: ${error}. Using fallback.`);
    // Ultimate fallback: use Tier C (3T × 3T) 
    const fallbackLayout = { name: '3T × 3T', rows: ['T', 'T', 'T'], cols: ['T', 'T', 'T'], totalAchievements: 0 };
    const fallbackResult = attemptGrid(fallbackLayout, players, teams.filter(t => !t.disabled), [], seasonIndex, careerEverIndex, [], sport);
    if (fallbackResult) {
      console.log('✅ Used ultimate fallback (all teams)');
      return fallbackResult;
    }
    throw new Error('Could not generate any valid grid');
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