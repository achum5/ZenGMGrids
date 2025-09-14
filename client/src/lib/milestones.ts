/**
 * Dynamic milestone data structures for stat achievements
 * Used for grid generation to select specific thresholds instead of hardcoded values
 */

export interface MilestoneConfig {
  id: string;
  statName: string;
  milestones: number[];
  labelTemplate: string; // Template for generating labels like "{milestone}+ Career {statName}"
  minPlayers: number;
}

// Basketball milestone configurations
export const BASKETBALL_MILESTONES: MilestoneConfig[] = [
  {
    id: 'careerPoints',
    statName: 'Points',
    milestones: [50000, 40000, 35000, 30000, 28000, 26000, 25000, 24000, 23000, 22000, 21000, 20000, 19000, 18000, 17000, 16000, 15000, 14000, 13000, 12000, 11000, 10000, 9000, 8000, 7000, 6000, 5000, 4000, 3000, 2000, 1000, 500, 100],
    labelTemplate: '{milestone}+ Career Points',
    minPlayers: 5
  },
  {
    id: 'careerRebounds',
    statName: 'Rebounds',
    milestones: [15000, 14000, 13000, 12500, 12000, 11500, 11000, 10500, 10000, 9500, 9000, 8500, 8000, 7500, 7000, 6500, 6000, 5500, 5000, 4500, 4000, 3500, 3000, 2500, 2000, 1500, 1000, 500, 100],
    labelTemplate: '{milestone}+ Career Rebounds',
    minPlayers: 5
  },
  {
    id: 'careerAssists',
    statName: 'Assists',
    milestones: [10000, 9000, 8000, 7500, 7000, 6500, 6000, 5500, 5000, 4500, 4000, 3500, 3000, 2500, 2000, 1500, 1000, 750, 500, 250, 100],
    labelTemplate: '{milestone}+ Career Assists',
    minPlayers: 5
  },
  {
    id: 'careerSteals',
    statName: 'Steals',
    milestones: [2500, 2400, 2300, 2200, 2100, 2000, 1900, 1800, 1700, 1600, 1500, 1400, 1300, 1200, 1100, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 100, 50],
    labelTemplate: '{milestone}+ Career Steals',
    minPlayers: 5
  },
  {
    id: 'careerBlocks',
    statName: 'Blocks',
    milestones: [2000, 1900, 1800, 1700, 1600, 1500, 1400, 1300, 1200, 1100, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 100, 50],
    labelTemplate: '{milestone}+ Career Blocks',
    minPlayers: 5
  },
  {
    id: 'careerThrees',
    statName: 'Made Threes',
    milestones: [4000, 3500, 3000, 2800, 2600, 2400, 2200, 2000, 1900, 1800, 1700, 1600, 1500, 1400, 1300, 1200, 1100, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 100, 50],
    labelTemplate: '{milestone}+ Made Threes',
    minPlayers: 5
  }
];

// Football milestone configurations
export const FOOTBALL_MILESTONES: MilestoneConfig[] = [
  {
    id: 'careerPassTDs',
    statName: 'Pass TDs',
    milestones: [400, 350, 300, 250, 200, 175, 150, 125, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10],
    labelTemplate: '{milestone}+ Career Pass TDs',
    minPlayers: 5
  },
  {
    id: 'careerRushYards',
    statName: 'Rush Yards',
    milestones: [15000, 14000, 13000, 12000, 11000, 10000, 9000, 8000, 7000, 6000, 5000, 4000, 3000, 2000, 1000, 500, 100],
    labelTemplate: '{milestone}+ Career Rush Yards',
    minPlayers: 5
  },
  {
    id: 'careerRushTDs',
    statName: 'Rush TDs',
    milestones: [90, 80, 70, 60, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5],
    labelTemplate: '{milestone}+ Career Rush TDs',
    minPlayers: 5
  },
  {
    id: 'careerRecYards',
    statName: 'Receiving Yards',
    milestones: [15000, 14000, 13000, 12000, 11000, 10000, 9000, 8000, 7000, 6000, 5000, 4000, 3000, 2000, 1000, 500, 100],
    labelTemplate: '{milestone}+ Career Receiving Yards',
    minPlayers: 5
  },
  {
    id: 'careerRecTDs',
    statName: 'Receiving TDs',
    milestones: [120, 110, 100, 90, 80, 70, 60, 50, 40, 30, 25, 20, 15, 10, 5],
    labelTemplate: '{milestone}+ Career Receiving TDs',
    minPlayers: 5
  },
  {
    id: 'careerSacks',
    statName: 'Sacks',
    milestones: [200, 175, 150, 125, 100, 90, 80, 70, 60, 50, 40, 30, 25, 20, 15, 10, 5],
    labelTemplate: '{milestone}+ Career Sacks',
    minPlayers: 5
  },
  {
    id: 'careerInterceptions',
    statName: 'Interceptions',
    milestones: [80, 70, 60, 50, 45, 40, 35, 30, 25, 20, 18, 16, 14, 12, 10, 8, 6, 4, 2],
    labelTemplate: '{milestone}+ Career Interceptions',
    minPlayers: 5
  }
];

// Hockey milestone configurations
export const HOCKEY_MILESTONES: MilestoneConfig[] = [
  {
    id: 'careerGoals',
    statName: 'Goals',
    milestones: [800, 700, 600, 500, 450, 400, 350, 300, 250, 200, 175, 150, 125, 100, 75, 50, 25, 10],
    labelTemplate: '{milestone}+ Career Goals',
    minPlayers: 1 // Lowered for hockey due to fewer players
  },
  {
    id: 'careerPoints',
    statName: 'Points',
    milestones: [2000, 1800, 1600, 1400, 1200, 1000, 900, 800, 700, 600, 500, 400, 300, 250, 200, 150, 100, 50, 20],
    labelTemplate: '{milestone}+ Career Points',
    minPlayers: 1
  },
  {
    id: 'careerAssists',
    statName: 'Assists',
    milestones: [1000, 900, 800, 700, 600, 500, 450, 400, 350, 300, 250, 200, 150, 100, 75, 50, 25, 10],
    labelTemplate: '{milestone}+ Career Assists',
    minPlayers: 3
  },
  {
    id: 'careerWins',
    statName: 'Wins (G)',
    milestones: [500, 450, 400, 350, 300, 250, 200, 175, 150, 125, 100, 75, 50, 25, 10, 5],
    labelTemplate: '{milestone}+ Career Wins (G)',
    minPlayers: 1
  },
  {
    id: 'careerShutouts',
    statName: 'Shutouts (G)',
    milestones: [130, 120, 110, 100, 90, 80, 70, 60, 50, 40, 30, 25, 20, 15, 10, 5],
    labelTemplate: '{milestone}+ Career Shutouts (G)',
    minPlayers: 1
  }
];

// Baseball milestone configurations
export const BASEBALL_MILESTONES: MilestoneConfig[] = [
  {
    id: 'careerHits',
    statName: 'Hits',
    milestones: [4000, 3500, 3000, 2800, 2600, 2400, 2200, 2000, 1900, 1800, 1700, 1600, 1500, 1400, 1300, 1200, 1100, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 100],
    labelTemplate: '{milestone}+ Career Hits',
    minPlayers: 5
  },
  {
    id: 'careerHomeRuns',
    statName: 'Home Runs',
    milestones: [700, 600, 500, 450, 400, 350, 300, 250, 200, 175, 150, 125, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10],
    labelTemplate: '{milestone}+ Career Home Runs',
    minPlayers: 5
  },
  {
    id: 'careerRBIs',
    statName: 'RBIs',
    milestones: [2000, 1900, 1800, 1700, 1600, 1500, 1400, 1300, 1200, 1100, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 100, 50],
    labelTemplate: '{milestone}+ Career RBIs',
    minPlayers: 5
  },
  {
    id: 'careerStolenBases',
    statName: 'Stolen Bases',
    milestones: [800, 700, 600, 500, 450, 400, 350, 300, 250, 200, 175, 150, 125, 100, 75, 50, 25, 10],
    labelTemplate: '{milestone}+ Career Stolen Bases',
    minPlayers: 5
  },
  {
    id: 'careerRuns',
    statName: 'Runs',
    milestones: [2500, 2200, 2000, 1900, 1800, 1700, 1600, 1500, 1400, 1300, 1200, 1100, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 100, 50],
    labelTemplate: '{milestone}+ Career Runs',
    minPlayers: 5
  },
  {
    id: 'careerWinsPitcher',
    statName: 'Wins (P)',
    milestones: [400, 350, 300, 250, 200, 175, 150, 125, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10],
    labelTemplate: '{milestone}+ Career Wins (P)',
    minPlayers: 5
  },
  {
    id: 'careerStrikeouts',
    statName: 'Strikeouts',
    milestones: [4000, 3500, 3000, 2800, 2600, 2400, 2200, 2000, 1900, 1800, 1700, 1600, 1500, 1400, 1300, 1200, 1100, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 100],
    labelTemplate: '{milestone}+ Career Strikeouts',
    minPlayers: 5
  },
  {
    id: 'careerSaves',
    statName: 'Saves',
    milestones: [500, 450, 400, 350, 300, 250, 200, 175, 150, 125, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10],
    labelTemplate: '{milestone}+ Career Saves',
    minPlayers: 5
  }
];

// Helper function to get milestone configurations by sport
export function getMilestonesBySport(sport: 'basketball' | 'football' | 'hockey' | 'baseball'): MilestoneConfig[] {
  switch (sport) {
    case 'basketball':
      return BASKETBALL_MILESTONES;
    case 'football':
      return FOOTBALL_MILESTONES;
    case 'hockey':
      return HOCKEY_MILESTONES;
    case 'baseball':
      return BASEBALL_MILESTONES;
    default:
      return [];
  }
}

// Helper function to format milestone numbers with thousands separators
export function formatMilestone(milestone: number): string {
  return milestone.toLocaleString();
}

// Helper function to generate achievement label from milestone config and selected milestone
export function generateMilestoneLabel(config: MilestoneConfig, milestone: number): string {
  return config.labelTemplate.replace('{milestone}', formatMilestone(milestone));
}

// Interface for dynamic achievement with selected milestone
export interface DynamicMilestoneAchievement {
  id: string; // e.g. "careerPoints_25000"
  baseId: string; // e.g. "careerPoints"
  label: string; // e.g. "25,000+ Career Points"
  milestone: number; // e.g. 25000
  test: (player: any) => boolean;
  minPlayers: number;
}