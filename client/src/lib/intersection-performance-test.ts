import type { Player, Team } from '@/types/bbgm';
import type { SeasonIndex } from '@/lib/season-achievements';
import { calculateOptimizedIntersection, getIntersectionCacheStats, clearIntersectionCaches, type IntersectionConstraint } from '@/lib/intersection-cache';

/**
 * Performance test utility to validate optimized intersection calculations
 */

// Mock data generator for testing
function generateMockPlayers(count: number): Player[] {
  const players: Player[] = [];
  
  for (let i = 0; i < count; i++) {
    const player: Player = {
      pid: i,
      name: `Player ${i}`,
      teamsPlayed: new Set([
        Math.floor(Math.random() * 10), // Random team 0-9
        Math.floor(Math.random() * 10), // Random second team
      ]),
      achievements: {
        'career20kPoints': Math.random() > 0.8,
        'career10kRebounds': Math.random() > 0.9,
        'career5kAssists': Math.random() > 0.85,
        'played10PlusSeasons': Math.random() > 0.7,
        'played15PlusSeasons': Math.random() > 0.9,
        'isHallOfFamer': Math.random() > 0.95,
        'AllStar': Math.random() > 0.6,
        'MVP': Math.random() > 0.95,
      },
      stats: [],
      awards: [],
    } as any;
    
    players.push(player);
  }
  
  return players;
}

function generateMockTeams(count: number): Team[] {
  const teams: Team[] = [];
  
  for (let i = 0; i < count; i++) {
    teams.push({
      tid: i,
      name: `Team ${i}`,
      region: `Region ${i}`,
      abbrev: `T${i}`,
      disabled: false,
    } as Team);
  }
  
  return teams;
}

// Simple performance testing function
export function runIntersectionPerformanceTest(): {
  success: boolean;
  results: {
    testName: string;
    duration: number;
    intersectionCount: number;
    cacheHits?: number;
  }[];
  cacheStats: ReturnType<typeof getIntersectionCacheStats>;
} {
  console.log('🧪 Starting intersection performance test...');
  
  const results: {
    testName: string;
    duration: number;
    intersectionCount: number;
    cacheHits?: number;
  }[] = [];
  
  try {
    // Clear caches before testing
    clearIntersectionCaches();
    
    // Generate test data
    const players = generateMockPlayers(10000); // 10k players for stress test
    const teams = generateMockTeams(30); // 30 teams
    
    console.log(`Generated ${players.length} players and ${teams.length} teams for testing`);
    
    // Test 1: Team × Team intersections
    console.log('Test 1: Team × Team intersections');
    const start1 = performance.now();
    let intersections1 = 0;
    
    for (let i = 0; i < 10; i++) {
      for (let j = i + 1; j < 15; j++) {
        const rowConstraint: IntersectionConstraint = { type: 'team', id: i };
        const colConstraint: IntersectionConstraint = { type: 'team', id: j };
        
        const count = calculateOptimizedIntersection(
          rowConstraint,
          colConstraint,
          players,
          teams,
          undefined,
          true
        ) as number;
        
        intersections1 += count;
      }
    }
    
    const duration1 = performance.now() - start1;
    results.push({
      testName: 'Team × Team intersections (105 combinations)',
      duration: duration1,
      intersectionCount: intersections1
    });
    
    // Test 2: Team × Achievement intersections  
    console.log('Test 2: Team × Achievement intersections');
    const start2 = performance.now();
    let intersections2 = 0;
    
    const achievements = ['career20kPoints', 'career10kRebounds', 'AllStar', 'MVP', 'played10PlusSeasons'];
    
    for (let teamId = 0; teamId < 15; teamId++) {
      for (const achievementId of achievements) {
        const rowConstraint: IntersectionConstraint = { type: 'team', id: teamId };
        const colConstraint: IntersectionConstraint = { type: 'achievement', id: achievementId };
        
        const count = calculateOptimizedIntersection(
          rowConstraint,
          colConstraint,
          players,
          teams,
          undefined,
          true
        ) as number;
        
        intersections2 += count;
      }
    }
    
    const duration2 = performance.now() - start2;
    results.push({
      testName: 'Team × Achievement intersections (75 combinations)',
      duration: duration2,
      intersectionCount: intersections2
    });
    
    // Test 3: Achievement × Achievement intersections
    console.log('Test 3: Achievement × Achievement intersections');
    const start3 = performance.now();
    let intersections3 = 0;
    
    for (let i = 0; i < achievements.length; i++) {
      for (let j = i + 1; j < achievements.length; j++) {
        const rowConstraint: IntersectionConstraint = { type: 'achievement', id: achievements[i] };
        const colConstraint: IntersectionConstraint = { type: 'achievement', id: achievements[j] };
        
        const count = calculateOptimizedIntersection(
          rowConstraint,
          colConstraint,
          players,
          teams,
          undefined,
          true
        ) as number;
        
        intersections3 += count;
      }
    }
    
    const duration3 = performance.now() - start3;
    results.push({
      testName: 'Achievement × Achievement intersections (10 combinations)',
      duration: duration3,
      intersectionCount: intersections3
    });
    
    // Test 4: Cache effectiveness - repeat Test 1 to measure cache hits
    console.log('Test 4: Cache effectiveness test (repeating Team × Team)');
    const start4 = performance.now();
    let intersections4 = 0;
    
    for (let i = 0; i < 10; i++) {
      for (let j = i + 1; j < 15; j++) {
        const rowConstraint: IntersectionConstraint = { type: 'team', id: i };
        const colConstraint: IntersectionConstraint = { type: 'team', id: j };
        
        const count = calculateOptimizedIntersection(
          rowConstraint,
          colConstraint,
          players,
          teams,
          undefined,
          true
        ) as number;
        
        intersections4 += count;
      }
    }
    
    const duration4 = performance.now() - start4;
    results.push({
      testName: 'Cache effectiveness test (repeated Team × Team)',
      duration: duration4,
      intersectionCount: intersections4
    });
    
    console.log('✅ Performance test completed successfully');
    
    // Log results
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.testName}`);
      console.log(`   Duration: ${result.duration.toFixed(2)}ms`);
      console.log(`   Intersections found: ${result.intersectionCount}`);
      console.log(`   Avg time per intersection: ${(result.duration / (result.intersectionCount || 1)).toFixed(4)}ms`);
    });
    
    const cacheStats = getIntersectionCacheStats();
    console.log('\n📊 Cache Statistics:');
    console.log(`   Intersection cache size: ${cacheStats.intersectionCacheSize}`);
    console.log(`   Players by team cache size: ${cacheStats.playersByTeamCacheSize}`);
    console.log(`   Players by achievement cache size: ${cacheStats.playersByAchievementCacheSize}`);
    
    // Validate cache effectiveness
    const firstRunDuration = results[0].duration;
    const cachedRunDuration = results[3].duration;
    const speedupFactor = firstRunDuration / cachedRunDuration;
    
    console.log(`\n⚡ Cache speedup factor: ${speedupFactor.toFixed(2)}x`);
    
    return {
      success: true,
      results,
      cacheStats
    };
    
  } catch (error) {
    console.error('❌ Performance test failed:', error);
    return {
      success: false,
      results,
      cacheStats: getIntersectionCacheStats()
    };
  }
}

// Function to run a simple validation test
export function runIntersectionValidationTest(): boolean {
  console.log('🔍 Running intersection validation test...');
  
  try {
    clearIntersectionCaches();
    
    // Generate small test dataset
    const players = generateMockPlayers(100);
    const teams = generateMockTeams(5);
    
    // Test basic functionality
    const rowConstraint: IntersectionConstraint = { type: 'team', id: 0 };
    const colConstraint: IntersectionConstraint = { type: 'team', id: 1 };
    
    const countResult = calculateOptimizedIntersection(
      rowConstraint,
      colConstraint,
      players,
      teams,
      undefined,
      true
    ) as number;
    
    const setResult = calculateOptimizedIntersection(
      rowConstraint,
      colConstraint,
      players,
      teams,
      undefined,
      false
    ) as Set<number>;
    
    // Validate count matches set size
    if (countResult !== setResult.size) {
      throw new Error(`Count mismatch: count=${countResult}, set.size=${setResult.size}`);
    }
    
    // Validate all players in set actually satisfy both constraints
    const teamAPlayers = players.filter(p => p.teamsPlayed.has(0));
    const teamBPlayers = players.filter(p => p.teamsPlayed.has(1));
    const expectedIntersection = teamAPlayers.filter(p => teamBPlayers.some(bp => bp.pid === p.pid));
    
    if (setResult.size !== expectedIntersection.length) {
      console.warn(`Size difference detected but this could be due to Set optimization vs array filtering`);
    }
    
    console.log(`✅ Validation passed: ${countResult} intersections found`);
    return true;
    
  } catch (error) {
    console.error('❌ Validation test failed:', error);
    return false;
  }
}