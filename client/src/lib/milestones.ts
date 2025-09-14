import type { Player } from "@/types/bbgm";

// Type definitions for milestone system
export type MilestoneSport = 'basketball' | 'football' | 'hockey' | 'baseball';

export interface MilestoneFamily {
  id: string;
  sport: MilestoneSport;
  labelBase: string;
  statKey: string;
  thresholds: number[];
  minPlayersFn?: (threshold: number) => number;
}

export interface MilestoneAchievement {
  id: string;
  familyId: string;
  threshold: number;
  label: string;
  sport: MilestoneSport;
  test: (player: Player) => boolean;
  minPlayers: number;
}

// Helper function to format numbers with thousands separators
export function formatThousands(num: number): string {
  return num.toLocaleString('en-US');
}

// Helper function to format milestone labels
export function formatMilestoneLabel(threshold: number, labelBase: string): string {
  return `${formatThousands(threshold)}+ ${labelBase}`;
}

// Helper function to extract career values from player stats
export function getCareerValue(player: Player, family: MilestoneFamily): number {
  if (!player.stats || player.stats.length === 0) return 0;

  let total = 0;
  
  for (const stat of player.stats) {
    // Skip playoff stats for career calculations
    if (stat.playoffs) continue;

    let value = 0;
    switch (family.statKey) {
      // Basketball stats
      case 'pts':
        value = stat.pts || 0;
        break;
      case 'trb':
        value = stat.trb || 0;
        break;
      case 'ast':
        value = stat.ast || 0;
        break;
      case 'stl':
        value = stat.stl || 0;
        break;
      case 'blk':
        value = stat.blk || 0;
        break;
      case 'tpm':
        value = stat.tpm || stat.tp || 0; // Use preferred tpm, fallback to tp
        break;
      
      // Football stats (using common field names)
      case 'passTd':
        value = (stat as any).passTd || (stat as any).psTd || 0;
        break;
      case 'rushYds':
        value = (stat as any).rushYds || (stat as any).rusYds || 0;
        break;
      case 'rushTd':
        value = (stat as any).rushTd || (stat as any).rusTd || 0;
        break;
      case 'recYds':
        value = (stat as any).recYds || (stat as any).recvYds || 0;
        break;
      case 'recTd':
        value = (stat as any).recTd || (stat as any).recvTd || 0;
        break;
      case 'sacks':
        value = (stat as any).sacks || (stat as any).sk || 0;
        break;
      case 'interceptions':
        value = (stat as any).interceptions || (stat as any).int || 0;
        break;

      // Hockey stats
      case 'goals':
        value = (stat as any).goals || (stat as any).g || 0;
        break;
      case 'points':
        value = (stat as any).points || (stat as any).pts || 0;
        break;
      case 'assists':
        value = (stat as any).assists || (stat as any).a || 0;
        break;
      case 'wins':
        value = (stat as any).wins || (stat as any).w || 0;
        break;
      case 'shutouts':
        value = (stat as any).shutouts || (stat as any).so || 0;
        break;

      // Baseball stats
      case 'hits':
        value = (stat as any).hits || (stat as any).h || 0;
        break;
      case 'homeRuns':
        value = (stat as any).homeRuns || (stat as any).hr || 0;
        break;
      case 'rbis':
        value = (stat as any).rbis || (stat as any).rbi || 0;
        break;
      case 'stolenBases':
        value = (stat as any).stolenBases || (stat as any).sb || 0;
        break;
      case 'runs':
        value = (stat as any).runs || (stat as any).r || 0;
        break;
      case 'pitcherWins':
        value = (stat as any).wins || (stat as any).w || 0;
        break;
      case 'strikeouts':
        value = (stat as any).strikeouts || (stat as any).so || 0;
        break;
      case 'saves':
        value = (stat as any).saves || (stat as any).sv || 0;
        break;
    }
    
    total += value;
  }
  
  return total;
}

// Basketball milestone families
export const BASKETBALL_MILESTONE_FAMILIES: MilestoneFamily[] = [
  {
    id: 'basketball-points',
    sport: 'basketball',
    labelBase: 'Career Points',
    statKey: 'pts',
    thresholds: [50000, 45000, 40000, 35000, 30000, 25000, 20000, 19000, 18000, 17000, 16000, 15000, 14000, 13000, 12000, 11000, 10000, 9000, 8000, 7000, 6000, 5000, 4000, 3000, 2000, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 100],
  },
  {
    id: 'basketball-rebounds',
    sport: 'basketball',
    labelBase: 'Career Rebounds',
    statKey: 'trb',
    thresholds: [15000, 12000, 10000, 9500, 9000, 8500, 8000, 7500, 7000, 6500, 6000, 5500, 5000, 4500, 4000, 3500, 3000, 2500, 2000, 1500, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 100],
  },
  {
    id: 'basketball-assists',
    sport: 'basketball',
    labelBase: 'Career Assists',
    statKey: 'ast',
    thresholds: [10000, 7500, 6000, 5000, 4750, 4500, 4250, 4000, 3750, 3500, 3250, 3000, 2750, 2500, 2250, 2000, 1750, 1500, 1250, 1000, 750, 500, 450, 400, 350, 300, 250, 200, 150, 100],
  },
  {
    id: 'basketball-steals',
    sport: 'basketball',
    labelBase: 'Career Steals',
    statKey: 'stl',
    thresholds: [2500, 2000, 1900, 1800, 1700, 1600, 1500, 1400, 1300, 1200, 1100, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 190, 180, 170, 160, 150, 140, 130, 120, 110, 100, 90, 80, 70, 60, 50],
  },
  {
    id: 'basketball-blocks',
    sport: 'basketball',
    labelBase: 'Career Blocks',
    statKey: 'blk',
    thresholds: [2000, 1750, 1500, 1425, 1350, 1275, 1200, 1125, 1050, 975, 900, 825, 750, 675, 600, 525, 450, 375, 300, 225, 150, 140, 130, 120, 110, 100, 90, 80, 70, 60, 50],
  },
  {
    id: 'basketball-threes',
    sport: 'basketball',
    labelBase: 'Career Made Threes',
    statKey: 'tpm',
    thresholds: [4000, 3000, 2500, 2000, 1900, 1800, 1700, 1600, 1500, 1400, 1300, 1200, 1100, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 190, 180, 170, 160, 150, 140, 130, 120, 110, 100, 90, 80, 70, 60, 50],
  },
];

// Football milestone families
export const FOOTBALL_MILESTONE_FAMILIES: MilestoneFamily[] = [
  {
    id: 'football-pass-tds',
    sport: 'football',
    labelBase: 'Career Pass TDs',
    statKey: 'passTd',
    thresholds: [400, 300, 250, 200, 150, 140, 130, 120, 110, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10],
  },
  {
    id: 'football-rush-yards',
    sport: 'football',
    labelBase: 'Career Rush Yards',
    statKey: 'rushYds',
    thresholds: [15000, 12000, 10000, 8000, 7500, 7000, 6500, 6000, 5500, 5000, 4500, 4000, 3500, 3000, 2500, 2000, 1500, 1000, 500, 450, 400, 350, 300, 250, 200, 150, 100],
  },
  {
    id: 'football-rush-tds',
    sport: 'football',
    labelBase: 'Career Rush TDs',
    statKey: 'rushTd',
    thresholds: [90, 80, 70, 60, 50, 40, 35, 30, 25, 20, 15, 10, 5],
  },
  {
    id: 'football-receiving-yards',
    sport: 'football',
    labelBase: 'Career Receiving Yards',
    statKey: 'recYds',
    thresholds: [15000, 12000, 10000, 6000, 5500, 5000, 4500, 4000, 3500, 3000, 2500, 2000, 1500, 1000, 500, 450, 400, 350, 300, 250, 200, 150, 100],
  },
  {
    id: 'football-receiving-tds',
    sport: 'football',
    labelBase: 'Career Receiving TDs',
    statKey: 'recTd',
    thresholds: [120, 100, 80, 60, 50, 40, 35, 30, 25, 20, 15, 10, 5],
  },
  {
    id: 'football-sacks',
    sport: 'football',
    labelBase: 'Career Sacks',
    statKey: 'sacks',
    thresholds: [200, 150, 120, 100, 80, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5],
  },
  {
    id: 'football-interceptions',
    sport: 'football',
    labelBase: 'Career Interceptions',
    statKey: 'interceptions',
    thresholds: [80, 60, 50, 40, 30, 20, 18, 16, 14, 12, 10, 8, 6, 4, 2],
  },
];

// Hockey milestone families
export const HOCKEY_MILESTONE_FAMILIES: MilestoneFamily[] = [
  {
    id: 'hockey-goals',
    sport: 'hockey',
    labelBase: 'Career Goals',
    statKey: 'goals',
    thresholds: [800, 700, 600, 500, 475, 450, 425, 400, 375, 350, 325, 300, 275, 250, 225, 200, 175, 150, 125, 100, 75, 50, 45, 40, 35, 30, 25, 20, 15, 10],
  },
  {
    id: 'hockey-points',
    sport: 'hockey',
    labelBase: 'Career Points',
    statKey: 'points',
    thresholds: [2000, 1500, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 100, 90, 80, 70, 60, 50, 40, 30, 20],
  },
  {
    id: 'hockey-assists',
    sport: 'hockey',
    labelBase: 'Career Assists',
    statKey: 'assists',
    thresholds: [1000, 800, 700, 600, 500, 475, 450, 425, 400, 375, 350, 325, 300, 275, 250, 225, 200, 175, 150, 125, 100, 75, 50, 45, 40, 35, 30, 25, 20, 15, 10],
  },
  {
    id: 'hockey-wins-goalie',
    sport: 'hockey',
    labelBase: 'Career Wins (Goalie)',
    statKey: 'wins',
    thresholds: [500, 400, 300, 200, 175, 150, 125, 100, 75, 50, 25, 20, 15, 10, 5],
  },
  {
    id: 'hockey-shutouts-goalie',
    sport: 'hockey',
    labelBase: 'Career Shutouts (Goalie)',
    statKey: 'shutouts',
    thresholds: [130, 100, 75, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5],
  },
];

// Baseball milestone families
export const BASEBALL_MILESTONE_FAMILIES: MilestoneFamily[] = [
  {
    id: 'baseball-hits',
    sport: 'baseball',
    labelBase: 'Career Hits',
    statKey: 'hits',
    thresholds: [4000, 3500, 3000, 2900, 2800, 2700, 2600, 2500, 2400, 2300, 2200, 2100, 2000, 1900, 1800, 1700, 1600, 1500, 1400, 1300, 1200, 1100, 1000, 900, 800, 700, 600, 500, 450, 400, 350, 300, 250, 200, 150, 100],
  },
  {
    id: 'baseball-home-runs',
    sport: 'baseball',
    labelBase: 'Career Home Runs',
    statKey: 'homeRuns',
    thresholds: [700, 650, 600, 550, 500, 475, 450, 425, 400, 375, 350, 325, 300, 275, 250, 225, 200, 175, 150, 125, 100, 75, 50, 45, 40, 35, 30, 25, 20, 15, 10],
  },
  {
    id: 'baseball-rbis',
    sport: 'baseball',
    labelBase: 'Career RBIs',
    statKey: 'rbis',
    thresholds: [2000, 1800, 1500, 1400, 1300, 1200, 1100, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 180, 170, 160, 150, 140, 130, 120, 110, 100, 90, 80, 70, 60, 50],
  },
  {
    id: 'baseball-stolen-bases',
    sport: 'baseball',
    labelBase: 'Career Stolen Bases',
    statKey: 'stolenBases',
    thresholds: [800, 700, 600, 500, 400, 375, 350, 325, 300, 275, 250, 225, 200, 175, 150, 125, 100, 75, 50, 45, 40, 35, 30, 25, 20, 15, 10],
  },
  {
    id: 'baseball-runs',
    sport: 'baseball',
    labelBase: 'Career Runs',
    statKey: 'runs',
    thresholds: [2500, 2200, 2000, 1800, 1700, 1600, 1500, 1400, 1300, 1200, 1100, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 180, 170, 160, 150, 140, 130, 120, 110, 100, 90, 80, 70, 60, 50],
  },
  {
    id: 'baseball-pitcher-wins',
    sport: 'baseball',
    labelBase: 'Career Wins (Pitcher)',
    statKey: 'pitcherWins',
    thresholds: [400, 350, 300, 275, 250, 225, 200, 175, 150, 125, 100, 75, 50, 45, 40, 35, 30, 25, 20, 15, 10],
  },
  {
    id: 'baseball-strikeouts-pitcher',
    sport: 'baseball',
    labelBase: 'Career Strikeouts (Pitcher)',
    statKey: 'strikeouts',
    thresholds: [4000, 3500, 3000, 2900, 2800, 2700, 2600, 2500, 2400, 2300, 2200, 2100, 2000, 1900, 1800, 1700, 1600, 1500, 1400, 1300, 1200, 1100, 1000, 900, 800, 700, 600, 500, 450, 400, 350, 300, 250, 200, 150, 100],
  },
  {
    id: 'baseball-saves',
    sport: 'baseball',
    labelBase: 'Career Saves',
    statKey: 'saves',
    thresholds: [500, 450, 400, 350, 300, 275, 250, 225, 200, 175, 150, 125, 100, 75, 50, 45, 40, 35, 30, 25, 20, 15, 10],
  },
];

// Combined list of all milestone families
export const ALL_MILESTONE_FAMILIES: MilestoneFamily[] = [
  ...BASKETBALL_MILESTONE_FAMILIES,
  ...FOOTBALL_MILESTONE_FAMILIES,
  ...HOCKEY_MILESTONE_FAMILIES,
  ...BASEBALL_MILESTONE_FAMILIES,
];

// Get milestone families for a specific sport
export function getMilestoneFamiliesForSport(sport: MilestoneSport): MilestoneFamily[] {
  return ALL_MILESTONE_FAMILIES.filter(family => family.sport === sport);
}

// Get a milestone family by ID
export function getMilestoneFamilyById(id: string): MilestoneFamily | undefined {
  return ALL_MILESTONE_FAMILIES.find(family => family.id === id);
}

// Map statKey to family ID suffix for consistent lookup
function getStatKeyFamilyMapping(sport: MilestoneSport, statKey: string): string {
  const mappings: Record<string, Record<string, string>> = {
    basketball: {
      'pts': 'points',
      'trb': 'rebounds', 
      'ast': 'assists',
      'stl': 'steals',
      'blk': 'blocks',
      'tpm': 'threes'
    },
    football: {
      'passTd': 'pass-tds',
      'rushYds': 'rush-yards',
      'rushTd': 'rush-tds',
      'recYds': 'receiving-yards',
      'recTd': 'receiving-tds',
      'sacks': 'sacks',
      'interceptions': 'interceptions'
    },
    hockey: {
      'goals': 'goals',
      'points': 'points',
      'assists': 'assists',
      'wins': 'wins-goalie',
      'shutouts': 'shutouts-goalie'
    },
    baseball: {
      'hits': 'hits',
      'homeRuns': 'home-runs',
      'rbis': 'rbis',
      'stolenBases': 'stolen-bases',
      'runs': 'runs',
      'pitcherWins': 'pitcher-wins',
      'strikeouts': 'strikeouts-pitcher',
      'saves': 'saves'
    }
  };
  
  return mappings[sport]?.[statKey] || statKey;
}

// Get milestone family by sport and statKey (used for milestone ID parsing)
export function getMilestoneFamilyByStatKey(sport: MilestoneSport, statKey: string): MilestoneFamily | undefined {
  const familyIdSuffix = getStatKeyFamilyMapping(sport, statKey);
  const familyId = `${sport}-${familyIdSuffix}`;
  return getMilestoneFamilyById(familyId);
}

// Test if a player meets a specific milestone
export function playerMeetsMilestone(player: Player, familyId: string, threshold: number): boolean {
  const family = getMilestoneFamilyById(familyId);
  if (!family) return false;

  const careerValue = getCareerValue(player, family);
  return careerValue >= threshold;
}

// Create a milestone achievement from family and threshold
export function createMilestoneAchievement(family: MilestoneFamily, threshold: number): MilestoneAchievement {
  const id = `milestone:${family.sport}:${family.statKey}:${threshold}`;
  const label = formatMilestoneLabel(threshold, family.labelBase);

  return {
    id,
    familyId: family.id,
    threshold,
    label,
    sport: family.sport,
    test: (player: Player) => playerMeetsMilestone(player, family.id, threshold),
    minPlayers: family.minPlayersFn ? family.minPlayersFn(threshold) : 5,
  };
}

// Generate all possible milestone achievements for a family
export function generateMilestoneAchievementsForFamily(family: MilestoneFamily, players?: Player[]): MilestoneAchievement[] {
  return family.thresholds.map(threshold => {
    const achievement = createMilestoneAchievement(family, threshold);
    
    // If players are provided, filter out milestones with zero eligible players
    if (players) {
      const eligibleCount = players.filter(p => achievement.test(p)).length;
      if (eligibleCount === 0) {
        return null;
      }
    }
    
    return achievement;
  }).filter(Boolean) as MilestoneAchievement[];
}

// Generate all milestone achievements for a sport
export function generateMilestoneAchievementsForSport(sport: MilestoneSport, players?: Player[]): MilestoneAchievement[] {
  const families = getMilestoneFamiliesForSport(sport);
  return families.flatMap(family => generateMilestoneAchievementsForFamily(family, players));
}

// Parse milestone ID to extract components
export function parseMilestoneId(id: string): { type: 'milestone', sport: MilestoneSport, statKey: string, threshold: number } | null {
  const parts = id.split(':');
  if (parts.length !== 4 || parts[0] !== 'milestone') {
    return null;
  }

  const sport = parts[1] as MilestoneSport;
  const statKey = parts[2];
  const threshold = parseInt(parts[3], 10);

  if (!['basketball', 'football', 'hockey', 'baseball'].includes(sport) || isNaN(threshold)) {
    return null;
  }

  return { type: 'milestone', sport, statKey, threshold };
}

// Check if an achievement ID represents a milestone
export function isMilestoneId(id: string): boolean {
  return id.startsWith('milestone:');
}