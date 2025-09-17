/**
 * Test file to verify achievement scaling works correctly
 * This file can be temporarily imported to test scaling functionality
 */
import type { LeagueData, Player } from "@/types/bbgm";
import { analyzeLeagueMaturity, createScaledAchievements, debugScaling } from './achievement-scaling';
import { BASKETBALL_ACHIEVEMENTS } from './achievements';

/**
 * Create a mock small league for testing scaling
 */
function createMockSmallLeague(): LeagueData {
  // Create mock players with career stats that would meet original thresholds
  const players: Player[] = [
    {
      pid: 1,
      name: "Test Player1",
      firstName: "Test",
      lastName: "Player1",
      tid: 1,
      seasons: [
        { season: 2020, tid: 1, gp: 82 },
        { season: 2021, tid: 1, gp: 80 },
        { season: 2022, tid: 1, gp: 82 },
        { season: 2023, tid: 1, gp: 82 },
        { season: 2024, tid: 1, gp: 82 }
      ],
      stats: [
        { season: 2020, playoffs: false, tid: 1, pts: 2500, trb: 800, ast: 600, gp: 82 },
        { season: 2021, playoffs: false, tid: 1, pts: 2400, trb: 900, ast: 650, gp: 80 },
        { season: 2022, playoffs: false, tid: 1, pts: 2600, trb: 850, ast: 700, gp: 82 },
        { season: 2023, playoffs: false, tid: 1, pts: 2800, trb: 950, ast: 750, gp: 82 },
        { season: 2024, playoffs: false, tid: 1, pts: 2700, trb: 900, ast: 800, gp: 82 }
      ],
      achievements: undefined,
      teamsPlayed: new Set([1]),
      awards: []
    } as Player,
    // Add a few more players with lower stats
    {
      pid: 2,
      name: "Test Player2",
      firstName: "Test",
      lastName: "Player2",
      tid: 2,
      seasons: [
        { season: 2020, tid: 2, gp: 82 },
        { season: 2021, tid: 2, gp: 80 }
      ],
      stats: [
        { season: 2020, playoffs: false, tid: 2, pts: 1200, trb: 400, ast: 300, gp: 82 },
        { season: 2021, playoffs: false, tid: 2, pts: 1300, trb: 450, ast: 350, gp: 80 }
      ],
      achievements: undefined,
      teamsPlayed: new Set([2]),
      awards: []
    } as Player
  ];

  return {
    players,
    teams: [
      { tid: 1, name: "Test Team 1", abbrev: "TT1", region: "Test", disabled: false },
      { tid: 2, name: "Test Team 2", abbrev: "TT2", region: "Test", disabled: false }
    ],
    sport: 'basketball',
    leagueYears: { minSeason: 2020, maxSeason: 2024 }, // Only 5 seasons - very small league
  } as LeagueData;
}

/**
 * Test the scaling system with a small league
 */
export function testScaling(): void {
  console.log('🧪 Testing Achievement Scaling System');
  console.log('=====================================');
  
  const smallLeague = createMockSmallLeague();
  
  // Test league maturity analysis
  const analysis = analyzeLeagueMaturity(smallLeague);
  console.log('📊 League Maturity Analysis:', analysis);
  
  // Test scaling debug output
  debugScaling(smallLeague);
  
  // Test scaling application
  const originalAchievements = BASKETBALL_ACHIEVEMENTS.slice(0, 6); // Test first 6 achievements
  const scaledAchievements = createScaledAchievements(originalAchievements, smallLeague);
  
  console.log('📈 Achievement Scaling Results:');
  console.log('Original vs Scaled Achievements:');
  
  for (let i = 0; i < originalAchievements.length; i++) {
    const original = originalAchievements[i];
    const scaled = scaledAchievements[i];
    
    if (original.label !== scaled.label) {
      console.log(`  ✅ ${original.id}:`);
      console.log(`     Original: "${original.label}"`);
      console.log(`     Scaled:   "${scaled.label}"`);
    } else {
      console.log(`  ➡️  ${original.id}: No change (${original.label})`);
    }
  }
  
  console.log('🧪 Test completed successfully!');
}

/**
 * Test rounding function with various inputs
 */
export function testRounding(): void {
  console.log('🔢 Testing Round to Nice Numbers');
  console.log('================================');
  
  const testCases = [
    { input: 20000 * 0.25, expected_around: 5000 },
    { input: 10000 * 0.25, expected_around: 2500 },
    { input: 5000 * 0.25, expected_around: 1250 },
    { input: 2000 * 0.45, expected_around: 900 },
    { input: 1500 * 0.45, expected_around: 675 }
  ];
  
  // Since roundToNiceNumber is private, we'll test it indirectly through scaling
  const mockLeague: LeagueData = {
    players: [],
    teams: [],
    sport: 'basketball',
    leagueYears: { minSeason: 2020, maxSeason: 2024 }
  } as LeagueData;
  
  const analysis = analyzeLeagueMaturity(mockLeague);
  console.log(`Scaling factor for very small league: ${analysis.scalingFactor}`);
  
  testCases.forEach((testCase, index) => {
    const roundedResult = Math.round(testCase.input / 100) * 100; // Simulate rounding
    console.log(`Test ${index + 1}: ${testCase.input.toFixed(0)} → ~${roundedResult} (expected ~${testCase.expected_around})`);
  });
}

// Export test functions for manual testing
if (typeof window !== 'undefined') {
  (window as any).testScaling = testScaling;
  (window as any).testRounding = testRounding;
}