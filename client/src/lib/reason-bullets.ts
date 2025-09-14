import type { Player, Team } from '@/types/bbgm';
import type { GridConstraint } from '@/lib/feedback';
import { type SeasonAchievementId } from '@/lib/season-achievements';
import { 
  isMilestoneId, 
  parseMilestoneId, 
  getCareerValue, 
  formatThousands, 
  formatMilestoneLabel,
  getMilestoneFamilyByStatKey,
  getMilestoneFamilyById 
} from '@/lib/milestones';

// Season achievement labels for bullet display
const SEASON_ACHIEVEMENT_LABELS: Record<SeasonAchievementId, string> = {
  // Basketball GM achievements
  AllStar: 'All-Star',
  MVP: 'MVP',
  DPOY: 'Defensive Player of the Year',
  ROY: 'Rookie of the Year',
  SMOY: 'Sixth Man of the Year',
  MIP: 'Most Improved Player',
  FinalsMVP: 'Finals MVP',
  SFMVP: 'Conference Finals MVP',
  AllLeagueAny: 'All-League Team',
  AllDefAny: 'All-Defensive Team',
  AllRookieAny: 'All-Rookie Team',
  PointsLeader: 'League Points Leader',
  ReboundsLeader: 'League Rebounds Leader',
  AssistsLeader: 'League Assists Leader',
  StealsLeader: 'League Steals Leader',
  BlocksLeader: 'League Blocks Leader',
  
  // Football GM achievements
  FBAllStar: 'All-Star',
  FBMVP: 'MVP',
  FBDPOY: 'Defensive Player of the Year',
  FBOffROY: 'Offensive Rookie of the Year',
  FBDefROY: 'Defensive Rookie of the Year',
  FBAllRookie: 'All-Rookie Team',
  FBAllLeague: 'All-League Team',
  FBFinalsMVP: 'Finals MVP',
  FBChampion: 'Won Championship',
  
  // Hockey GM achievements
  HKAllStar: 'All-Star',
  HKAllStarMVP: 'All-Star MVP',
  HKMVP: 'MVP',
  HKDefenseman: 'Best Defenseman',
  HKROY: 'Rookie of the Year',
  HKAllRookie: 'All-Rookie Team',
  HKAllLeague: 'All-League Team',
  HKAssistsLeader: 'League Assists Leader',
  HKPlayoffsMVP: 'Playoffs MVP',
  HKFinalsMVP: 'Finals MVP',
  HKChampion: 'Won Championship',
  
  // Baseball GM achievements
  BBAllStar: 'All-Star',
  BBMVP: 'MVP',
  BBROY: 'Rookie of the Year',
  BBAllRookie: 'All-Rookie Team',
  BBAllLeague: 'All-League Team',
  BBPlayoffsMVP: 'Playoffs MVP',
  BBChampion: 'Won Championship'
};

export interface ReasonBullet {
  text: string;
  type: 'category' | 'team' | 'award' | 'draft' | 'longevity';
}


// Helper function to get team abbreviation
function getTeamAbbrev(teams: Team[], tid: number): string {
  const team = teams.find(t => t.tid === tid);
  return team?.abbrev || team?.region || team?.name || 'Unknown';
}

// Helper function to check if an achievement ID is a season achievement
function isSeasonAchievement(achievementId: string): achievementId is SeasonAchievementId {
  return Object.keys(SEASON_ACHIEVEMENT_LABELS).includes(achievementId as SeasonAchievementId);
}

// Helper function to extract season achievement data from player
function getSeasonAchievementSeasons(player: Player, achievementId: SeasonAchievementId, teams: Team[], teamId?: number): string[] {
  if (!player.awards) return [];

  // Map achievement ID to award type patterns
  const awardTypePatterns: Record<SeasonAchievementId, string[]> = {
    // Basketball GM achievements
    AllStar: ['All-Star', 'all-star', 'allstar'],
    MVP: ['MVP', 'Most Valuable Player', 'most valuable player'],
    DPOY: ['DPOY', 'Defensive Player of the Year', 'defensive player of the year'],
    ROY: ['ROY', 'Rookie of the Year', 'rookie of the year'],
    SMOY: ['SMOY', 'Sixth Man of the Year', 'sixth man of the year', '6MOY', '6th man'],
    MIP: ['MIP', 'Most Improved Player', 'most improved player'],
    FinalsMVP: ['Finals MVP', 'finals mvp', 'championship mvp'],
    SFMVP: ['Conference Finals MVP', 'conference finals mvp', 'CFMVP', 'cfmvp'],
    AllLeagueAny: ['All-League', 'all-league', 'First Team All-League', 'Second Team All-League', 'Third Team All-League'],
    AllDefAny: ['All-Defensive', 'all-defensive', 'First Team All-Defensive', 'Second Team All-Defensive'],
    AllRookieAny: ['All-Rookie', 'all-rookie', 'All-Rookie Team'],
    PointsLeader: ['League Points Leader', 'league points leader', 'points leader', 'scoring leader'],
    ReboundsLeader: ['League Rebounds Leader', 'league rebounds leader', 'rebounds leader', 'rebounding leader'],
    AssistsLeader: ['League Assists Leader', 'league assists leader', 'assists leader'],
    StealsLeader: ['League Steals Leader', 'league steals leader', 'steals leader'],
    BlocksLeader: ['League Blocks Leader', 'league blocks leader', 'blocks leader'],
    
    // Football GM achievements
    FBAllStar: ['All-Star'],
    FBMVP: ['Most Valuable Player'],
    FBDPOY: ['Defensive Player of the Year'],
    FBOffROY: ['Offensive Rookie of the Year'],
    FBDefROY: ['Defensive Rookie of the Year'],
    FBAllRookie: ['All-Rookie Team'],
    FBAllLeague: ['First Team All-League', 'Second Team All-League'],
    FBFinalsMVP: ['Finals MVP'],
    FBChampion: ['Won Championship'],
    
    // Hockey GM achievements
    HKAllStar: ['All-Star', 'all-star'],
    HKAllStarMVP: ['All-Star MVP', 'all-star mvp'],
    HKMVP: ['Most Valuable Player', 'most valuable player'],
    HKDefenseman: ['Best Defenseman', 'best defenseman'],
    HKROY: ['Rookie of the Year', 'rookie of the year'],
    HKAllRookie: ['All-Rookie Team', 'all-rookie team'],
    HKAllLeague: ['All-League Team', 'all-league team', 'First Team All-League', 'Second Team All-League'],
    HKAssistsLeader: ['League Assists Leader', 'league assists leader'],
    HKPlayoffsMVP: ['Playoffs MVP', 'playoffs mvp'],
    HKFinalsMVP: ['Finals MVP', 'finals mvp'],
    HKChampion: ['Won Championship', 'won championship'],
    
    // Baseball GM achievements
    BBAllStar: ['All-Star'],
    BBMVP: ['Most Valuable Player'],
    BBROY: ['Rookie of the Year'],
    BBAllRookie: ['All-Rookie Team'],
    BBAllLeague: ['All-League Team', 'First Team All-League', 'Second Team All-League'],
    BBPlayoffsMVP: ['Playoffs MVP'],
    BBChampion: ['Won Championship']
  };

  const patterns = awardTypePatterns[achievementId] || [];
  const matchingAwards = player.awards.filter(award => {
    const awardType = (award.type || '').toLowerCase();
    const awardName = ((award as any).name || '').toLowerCase();
    return patterns.some(pattern => 
      awardType.includes(pattern.toLowerCase()) || 
      awardName.includes(pattern.toLowerCase())
    );
  });

  // Extract seasons and format
  const seasonsWithTeam: string[] = [];
  
  for (const award of matchingAwards) {
    if (award.season) {
      // For Finals MVP, Conference Finals MVP, Championship, and Playoffs MVP, try to include team abbreviation
      if (achievementId === 'FinalsMVP' || achievementId === 'SFMVP' || achievementId === 'FBFinalsMVP' || 
          achievementId === 'HKPlayoffsMVP' || achievementId === 'BBPlayoffsMVP' || 
          achievementId === 'FBChampion' || achievementId === 'HKChampion' || achievementId === 'BBChampion') {
        const playoffTeam = getBulletPlayoffTeam(player, award.season, teams);
        if (playoffTeam) {
          seasonsWithTeam.push(`${award.season} ${playoffTeam}`);
        } else {
          // If we can't resolve playoff team, just show the year without team
          seasonsWithTeam.push(`${award.season}`);
        }
      } else {
        seasonsWithTeam.push(`${award.season}`);
      }
    }
  }

  return seasonsWithTeam.sort();
}

// Helper function to get playoff team abbreviation for bullets
function getBulletPlayoffTeam(player: Player, season: number, teams: Team[]): string | null {
  if (!player.stats) return null;
  
  const playoffStats = player.stats.find(s => 
    s.season === season && s.playoffs && (s.gp || 0) > 0
  );
  
  if (playoffStats) {
    const team = teams.find(t => t.tid === playoffStats.tid);
    return team?.abbrev || null; // Return null instead of T{tid} fallback
  }
  
  return null;
}

// Helper function to group consecutive years into ranges
function groupConsecutiveYears(years: number[]): string[] {
  if (years.length === 0) return [];
  if (years.length === 1) return [years[0].toString()];
  
  const sortedYears = [...years].sort((a, b) => a - b);
  const groups: string[] = [];
  let start = sortedYears[0];
  let end = sortedYears[0];
  
  for (let i = 1; i < sortedYears.length; i++) {
    if (sortedYears[i] === end + 1) {
      // Consecutive year, extend the range
      end = sortedYears[i];
    } else {
      // Non-consecutive year, close the current range
      if (start === end) {
        groups.push(start.toString());
      } else {
        groups.push(`${start}-${end}`);
      }
      start = sortedYears[i];
      end = sortedYears[i];
    }
  }
  
  // Add the final range
  if (start === end) {
    groups.push(start.toString());
  } else {
    groups.push(`${start}-${end}`);
  }
  
  return groups;
}

// Helper function to format season list for bullets
function formatBulletSeasonList(seasons: string[], isFinalsOrCFMVP: boolean = false): string {
  if (seasons.length === 0) return '';
  if (seasons.length === 1) return seasons[0];
  
  // For Finals MVP/CFMVP with team abbreviations, use semicolon separator
  if (isFinalsOrCFMVP) {
    // Group by consecutive years while preserving team abbreviations
    const yearsWithTeams = seasons.map(s => {
      const parts = s.split(' ');
      return { year: parseInt(parts[0]), team: parts[1] || '', original: s };
    });
    
    // If all seasons have the same team, group years and append team
    const uniqueTeams = Array.from(new Set(yearsWithTeams.map(y => y.team)));
    if (uniqueTeams.length === 1 && uniqueTeams[0]) {
      const years = yearsWithTeams.map(y => y.year);
      const yearRanges = groupConsecutiveYears(years);
      return yearRanges.map(range => `${range} ${uniqueTeams[0]}`).join('; ');
    } else {
      // Different teams or no teams, just use original format
      return seasons.join('; ');
    }
  }
  
  // For other awards, group consecutive years: "2023-2028, 2030"
  const years = seasons.map(s => parseInt(s)).filter(y => !isNaN(y));
  const yearRanges = groupConsecutiveYears(years);
  return yearRanges.join(', ');
}

// Helper function to get team year range from stats
function getTeamYearRange(player: Player, teamId: number): string {
  if (!player.stats) return '';
  
  const seasons = player.stats
    .filter(s => s.tid === teamId && !s.playoffs && (s.gp || 0) > 0)
    .map(s => s.season)
    .sort((a, b) => a - b);
  
  if (seasons.length === 0) return '';
  if (seasons.length === 1) return seasons[0].toString();
  
  return `${seasons[0]}–${seasons[seasons.length - 1]}`;
}

// Helper function to get career stats for any sport
function getCareerStats(player: Player, statTypes: string[]) {
  if (!player.stats || !Array.isArray(player.stats)) return {};
  
  const careerStats: Record<string, number> = {};
  
  statTypes.forEach(statType => {
    let total = 0;
    
    player.stats!
      .filter(s => !s.playoffs)
      .forEach(season => {
        // Handle special case for three-pointers - try multiple field names
        if (statType === 'fg3') {
          const seasonThrees = (season as any).tpm || (season as any).tp || (season as any).fg3 || 0;
          total += seasonThrees;
        } 
        // Handle hockey assists - calculate from component assists
        else if (statType === 'a') {
          // Hockey assists are the sum of even-strength, power-play, and short-handed assists
          const evA = (season as any).evA || 0;
          const ppA = (season as any).ppA || 0;
          const shA = (season as any).shA || 0;
          const seasonAssists = evA + ppA + shA;
          
          // Fallback to direct field if components not available
          const fallbackAssists = seasonAssists || (season as any).a || (season as any).ast || (season as any).assists || 0;
          
          // Debug logging for hockey assists
          if (fallbackAssists > 0) {
            console.log(`🏒 ASSISTS DEBUG: Season ${season.season}, evA:${evA} + ppA:${ppA} + shA:${shA} = ${seasonAssists}, total so far: ${total + fallbackAssists}`);
          }
          total += fallbackAssists;
        } else {
          total += (season as any)[statType] || 0;
        }
      });
    
    careerStats[statType] = total;
  });
  
  return careerStats;
}

// Helper function to get best season performance
function getBestSeason(player: Player, statType: string, isMin = false) {
  if (!player.stats || !Array.isArray(player.stats)) return { value: 0, year: 0 };
  
  let bestValue = isMin ? Infinity : -Infinity;
  let bestYear = 0;
  
  player.stats.forEach(season => {
    if (season.playoffs) return;
    
    let value = 0;
    
    // Handle hockey assists - calculate from component assists
    if (statType === 'a') {
      const evA = (season as any).evA || 0;
      const ppA = (season as any).ppA || 0;
      const shA = (season as any).shA || 0;
      const calculatedAssists = evA + ppA + shA;
      value = calculatedAssists || (season as any).a || (season as any).ast || (season as any).assists || 0;
    } else {
      value = (season as any)[statType] || (isMin ? Infinity : 0);
    }
    
    if ((isMin && value < bestValue && value > 0) || (!isMin && value > bestValue)) {
      bestValue = value;
      bestYear = season.season;
    }
  });
  
  return { 
    value: bestValue === Infinity ? 0 : bestValue, 
    year: bestYear 
  };
}

// Helper function to get award seasons
function getAwardSeasons(player: Player, awardTypes: string[]): number[] {
  if (!player.awards || !Array.isArray(player.awards)) return [];
  
  const seasons: number[] = [];
  
  player.awards.forEach(award => {
    for (const awardType of awardTypes) {
      if (award.type?.includes(awardType) || (award as any).name?.includes(awardType)) {
        if (award.season) seasons.push(award.season);
        break;
      }
    }
  });
  
  return seasons.sort((a, b) => a - b);
}

// Build proof bullets for both constraints in a cell
export function generateReasonBullets(
  player: Player,
  rowConstraint: GridConstraint,
  colConstraint: GridConstraint,
  teams: Team[],
  sport: string = 'basketball'
): ReasonBullet[] {
  const bullets: ReasonBullet[] = [];
  
  // Always generate separate bullet points for both constraints
  // No special case - let both constraints be processed individually
  
  // Standard rule: Generate one bullet per constraint header
  // Process constraints in order: Teams first, then season achievements, then career/misc
  const constraints = [rowConstraint, colConstraint];
  const teamConstraints = constraints.filter(c => c.type === 'team');
  const seasonAchConstraints = constraints.filter(c => c.type === 'achievement' && isSeasonAchievement(c.achievementId!));
  const otherAchConstraints = constraints.filter(c => c.type === 'achievement' && !isSeasonAchievement(c.achievementId!));
  
  // 1) Team bullets first
  for (const constraint of teamConstraints) {
    const bullet = buildTeamBullet(player, constraint.tid!, teams);
    if (bullet) bullets.push(bullet);
  }
  
  // 2) Season achievement bullets
  for (const constraint of seasonAchConstraints) {
    const bullet = buildSeasonAchievementBullet(player, constraint.achievementId! as SeasonAchievementId, teams);
    if (bullet) bullets.push(bullet);
  }
  
  // 3) Career/misc achievement bullets
  for (const constraint of otherAchConstraints) {
    const bullet = buildCareerAchievementBullet(player, constraint.achievementId!, teams, sport);
    if (bullet) bullets.push(bullet);
  }
  
  // Deduplicate identical bullets (if row and column are the same type/value)
  const uniqueBullets = bullets.filter((bullet, index, array) => 
    array.findIndex(b => b.text === bullet.text) === index
  );
  
  return uniqueBullets.slice(0, 3); // Max 3 bullets
}

// Build a team bullet: Team Name (minYear–maxYear)
function buildTeamBullet(player: Player, teamTid: number, teams: Team[]): ReasonBullet | null {
  if (!player.stats) return null;
  
  const teamSeasons = player.stats
    .filter(s => s.tid === teamTid && !s.playoffs && (s.gp || 0) > 0)
    .map(s => s.season)
    .sort((a, b) => a - b);
  
  if (teamSeasons.length === 0) return null;
  
  const team = teams.find(t => t.tid === teamTid);
  const teamName = team ? `${team.region} ${team.name}` : `Team ${teamTid}`;
  
  const seasonRange = teamSeasons.length === 1 
    ? teamSeasons[0].toString()
    : `${teamSeasons[0]}–${teamSeasons[teamSeasons.length - 1]}`;
  
  return {
    text: `${teamName} (${seasonRange})`,
    type: 'team'
  };
}

// Build a season achievement bullet: Award Label (season list with playoff teams for Finals/CFMVP)
function buildSeasonAchievementBullet(player: Player, achievementId: SeasonAchievementId, teams: Team[]): ReasonBullet | null {
  const achLabel = SEASON_ACHIEVEMENT_LABELS[achievementId];
  const seasons = getSeasonAchievementSeasons(player, achievementId, teams);
  
  if (seasons.length === 0) return null;
  
  const isPlayoffAward = achievementId === 'FinalsMVP' || achievementId === 'SFMVP' || 
                        achievementId === 'FBFinalsMVP' || achievementId === 'HKPlayoffsMVP' || 
                        achievementId === 'BBPlayoffsMVP' || achievementId === 'FBChampion' || 
                        achievementId === 'HKChampion' || achievementId === 'BBChampion';
  const seasonStr = formatBulletSeasonList(seasons, isPlayoffAward);
  
  return {
    text: `${achLabel} (${seasonStr})`,
    type: 'award'
  };
}

// Build a career/misc achievement bullet: Award Label (value)
function buildCareerAchievementBullet(player: Player, achievementId: string, teams: Team[], sport: string): ReasonBullet | null {
  // Use existing achievement bullet generation logic
  return generateAchievementBullet(player, achievementId, teams, sport);
}

// Legacy function for compatibility
function generateCategoryBullet(
  player: Player,
  constraint: GridConstraint,
  teams: Team[],
  sport: string
): ReasonBullet | null {
  if (constraint.type === 'team') {
    return buildTeamBullet(player, constraint.tid!, teams);
  } else if (constraint.type === 'achievement') {
    if (isSeasonAchievement(constraint.achievementId!)) {
      return buildSeasonAchievementBullet(player, constraint.achievementId! as SeasonAchievementId, teams);
    } else {
      return buildCareerAchievementBullet(player, constraint.achievementId!, teams, sport);
    }
  }
  
  return null;
}


function generateAchievementBullet(
  player: Player,
  achievementId: string,
  teams: Team[],
  sport: string
): ReasonBullet | null {
  // Milestone achievements
  if (isMilestoneId(achievementId)) {
    return generateMilestoneBullet(player, achievementId, sport);
  }
  
  // Draft achievements
  if (['isPick1Overall', 'isFirstRoundPick', 'isSecondRoundPick', 'isUndrafted', 'draftedTeen'].includes(achievementId)) {
    return generateDraftBullet(player, achievementId);
  }
  
  // Longevity achievements  
  if (['played15PlusSeasons', 'played10PlusSeasons'].includes(achievementId)) {
    return generateLongevityBullet(player, achievementId);
  }
  
  // Career thresholds
  if (achievementId.startsWith('career')) {
    return generateCareerThresholdBullet(player, achievementId, sport);
  }
  
  // Season thresholds
  if (achievementId.startsWith('season')) {
    return generateSeasonThresholdBullet(player, achievementId, sport);
  }
  
  // Awards
  if (['wonMVP', 'hasMVP', 'wonDPOY', 'hasDPOY', 'wonROY', 'hasROY', 'wonFinalsMVP', 'wonSixMOY', 'hasAllStar', 'madeAllStar', 'wonChampionship'].includes(achievementId)) {
    return generateAwardBullet(player, achievementId, sport);
  }
  
  // Hall of Fame
  if (achievementId === 'isHallOfFamer') {
    return generateHallOfFameBullet(player);
  }
  
  return null;
}

// Generate milestone-specific bullet with actual career stat value
function generateMilestoneBullet(player: Player, achievementId: string, sport: string): ReasonBullet | null {
  const milestoneData = parseMilestoneId(achievementId);
  if (!milestoneData) return null;

  const { sport: milestoneSport, statKey, threshold } = milestoneData;
  
  // Get the milestone family to access stat information
  const family = getMilestoneFamilyByStatKey(milestoneSport, statKey);
  if (!family) return null;

  // Get player's actual career value for this stat
  const actualValue = getCareerValue(player, family);
  
  // Create milestone bullet with formatted numbers
  const formattedActual = formatThousands(actualValue);
  const formattedThreshold = formatThousands(threshold);
  
  // Extract the stat description from the label base (e.g., "Career Points" -> "career points")
  const statDescription = family.labelBase.toLowerCase();
  
  const text = `${player.name} had ${formattedActual} ${statDescription}, surpassing the ${formattedThreshold}+ threshold`;
  
  return {
    text,
    type: 'category'
  };
}

function generateDraftBullet(player: Player, achievementId: string): ReasonBullet | null {
  const draftYear = player.draft?.year || 'unknown';
  
  const draftLabels: Record<string, string> = {
    isPick1Overall: '#1 Overall Pick',
    isFirstRoundPick: 'First-Round Pick', 
    isSecondRoundPick: 'Second-Round Pick',
    isUndrafted: 'Undrafted',
    draftedTeen: 'Drafted as Teenager'
  };
  
  const label = draftLabels[achievementId];
  if (!label) return null;
  
  return {
    text: `${label} (${draftYear})`,
    type: 'draft'
  };
}

function generateLongevityBullet(player: Player, achievementId: string): ReasonBullet | null {
  if (!player.stats) return null;
  
  const seasons = new Set(
    player.stats
      .filter(s => !s.playoffs && (s.gp || 0) > 0)
      .map(s => s.season)
  ).size;
  
  return {
    text: `Played ${seasons} Seasons`,
    type: 'longevity'
  };
}

function generateHallOfFameBullet(player: Player): ReasonBullet | null {
  if (!player.awards || !Array.isArray(player.awards)) return null;
  
  // Find the Hall of Fame induction award
  const hofAward = player.awards.find((award: any) => 
    award.type === 'Inducted into the Hall of Fame'
  );
  
  if (!hofAward || !hofAward.season) return null;
  
  return {
    text: `Hall of Fame (${hofAward.season})`,
    type: 'award'
  };
}

function generateCareerThresholdBullet(player: Player, achievementId: string, sport: string): ReasonBullet | null {
  const thresholds: Record<string, { label: string; stat: string }> = {
    // Basketball
    career20kPoints: { label: formatMilestoneLabel(20000, 'Career Points'), stat: 'pts' },
    career10kRebounds: { label: formatMilestoneLabel(10000, 'Career Rebounds'), stat: 'trb' },
    career5kAssists: { label: formatMilestoneLabel(5000, 'Career Assists'), stat: 'ast' },
    career2kSteals: { label: formatMilestoneLabel(2000, 'Career Steals'), stat: 'stl' },
    career1500Blocks: { label: formatMilestoneLabel(1500, 'Career Blocks'), stat: 'blk' },
    career2kThrees: { label: formatMilestoneLabel(2000, 'Made Threes'), stat: 'fg3' },
    
    // Football
    career300PassTDs: { label: formatMilestoneLabel(300, 'Career Pass TDs'), stat: 'pssTD' },
    career100RushTDs: { label: formatMilestoneLabel(100, 'Career Rush TDs'), stat: 'rusTD' },
    career12kRecYds: { label: formatMilestoneLabel(12000, 'Career Rec Yards'), stat: 'recYds' },
    career100RecTDs: { label: formatMilestoneLabel(85, 'Career Rec TDs'), stat: 'recTD' },
    career100Sacks: { label: formatMilestoneLabel(100, 'Career Sacks'), stat: 'sk' },
    career20Ints: { label: formatMilestoneLabel(20, 'Career Interceptions'), stat: 'defInt' },
    
    // Baseball
    career3000Hits: { label: formatMilestoneLabel(3000, 'Career Hits'), stat: 'h' },
    career500HRs: { label: formatMilestoneLabel(500, 'Career Home Runs'), stat: 'hr' },
    career1500RBIs: { label: formatMilestoneLabel(1500, 'Career RBIs'), stat: 'rbi' },
    career400SBs: { label: formatMilestoneLabel(400, 'Career Stolen Bases'), stat: 'sb' },
    career1800Runs: { label: formatMilestoneLabel(1800, 'Career Runs'), stat: 'r' },
    career300Wins: { label: formatMilestoneLabel(300, 'Career Wins'), stat: 'w' },
    career3000Ks: { label: formatMilestoneLabel(3000, 'Career Strikeouts'), stat: 'so' },
    career300Saves: { label: formatMilestoneLabel(300, 'Career Saves'), stat: 'sv' },
    
    // Hockey
    career500Goals: { label: formatMilestoneLabel(500, 'Career Goals'), stat: 'g' },
    career1000Points: { label: formatMilestoneLabel(1000, 'Career Points'), stat: 'pts' },
    career500Assists: { label: formatMilestoneLabel(500, 'Career Assists'), stat: 'a' },
    career200Wins: { label: formatMilestoneLabel(200, 'Career Wins (G)'), stat: 'w' },
    career50Shutouts: { label: formatMilestoneLabel(50, 'Career Shutouts'), stat: 'so' }
  };
  
  const threshold = thresholds[achievementId];
  if (!threshold) return null;
  
  const careerStats = getCareerStats(player, [threshold.stat]);
  const actualValue = careerStats[threshold.stat] || 0;
  
  // Debug logging for hockey assists specifically
  if (threshold.stat === 'a' && player.name) {
    console.log(`🏒 CAREER ASSISTS DEBUG: ${player.name}, career total: ${actualValue}`);
    if (player.stats) {
      console.log(`🏒 Player has ${player.stats.filter(s => !s.playoffs).length} regular season records`);
      console.log(`🏒 Sample season stats:`, player.stats.filter(s => !s.playoffs)[0]);
    }
  }
  
  return {
    text: `${threshold.label} (${formatThousands(actualValue)})`,
    type: 'category'
  };
}

function generateSeasonThresholdBullet(player: Player, achievementId: string, sport: string): ReasonBullet | null {
  const thresholds: Record<string, { label: string; stat: string; isMin?: boolean }> = {
    // Basketball  
    season30ppg: { label: '30+ PPG', stat: 'pts' }, // Will be calculated per game
    season10apg: { label: '10+ APG', stat: 'ast' },
    season15rpg: { label: '15+ RPG', stat: 'trb' },
    season3bpg: { label: '3+ BPG', stat: 'blk' },
    season25spg: { label: '2.5+ SPG', stat: 'stl' },
    
    // Football
    season35PassTDs: { label: '35+ Pass TDs', stat: 'pssTD' },
    season1400RecYds: { label: '1,400+ Rec Yards', stat: 'recYds' },
    season15RecTDs: { label: '15+ Rec TDs', stat: 'recTD' },
    season15Sacks: { label: '15+ Sacks', stat: 'sk' },
    season8Ints: { label: '8+ Interceptions', stat: 'defInt' },
    season1800RushYds: { label: '1,600+ Rush Yards', stat: 'rusYds' },
    season20RushTDs: { label: '20+ Rush TDs', stat: 'rusTD' },
    
    // Baseball
    season50HRs: { label: '50+ Home Runs', stat: 'hr' },
    season130RBIs: { label: '130+ RBIs', stat: 'rbi' },
    season200Hits: { label: '200+ Hits', stat: 'h' },
    season50SBs: { label: '50+ Stolen Bases', stat: 'sb' },
    season20Wins: { label: '20+ Wins (P)', stat: 'w' },
    season40Saves: { label: '40+ Saves', stat: 'sv' },
    season300Ks: { label: '300+ Strikeouts', stat: 'so' },
    season200ERA: { label: 'Sub-2.00 ERA', stat: 'era', isMin: true },
    
    // Hockey
    season50Goals: { label: '50+ Goals', stat: 'g' },
    season100Points: { label: '100+ Points', stat: 'pts' },
    season60Assists: { label: '60+ Assists', stat: 'a' },
    season35Wins: { label: '35+ Wins (G)', stat: 'w' },
    season10Shutouts: { label: '10+ Shutouts', stat: 'so' },
    season925SavePct: { label: '.925+ Save %', stat: 'svPct' }
  };
  
  const threshold = thresholds[achievementId];
  if (!threshold) return null;
  
  // Handle per-game stats for basketball
  if (['season30ppg', 'season10apg', 'season15rpg', 'season3bpg', 'season25spg'].includes(achievementId)) {
    return generatePerGameBullet(player, achievementId, threshold);
  }
  
  const bestSeason = getBestSeason(player, threshold.stat, threshold.isMin);
  if (bestSeason.year === 0) return null;
  
  let valueStr = formatThousands(bestSeason.value);
  
  // Special formatting for save percentage and ERA
  if (achievementId === 'season925SavePct') {
    valueStr = bestSeason.value.toFixed(3);
  } else if (achievementId === 'season200ERA') {
    valueStr = bestSeason.value.toFixed(2);
  }
  
  return {
    text: `${threshold.label} (${valueStr}) in ${bestSeason.year}`,
    type: 'category'
  };
}

function generatePerGameBullet(player: Player, achievementId: string, threshold: { label: string; stat: string }): ReasonBullet | null {
  if (!player.stats) return null;
  
  let bestValue = 0;
  let bestYear = 0;
  
  player.stats.forEach(season => {
    if (season.playoffs) return;
    
    const gp = season.gp || (season as any).g || 0;
    if (gp < 10) return; // Minimum games requirement
    
    const total = (season as any)[threshold.stat] || 0;
    const perGame = total / gp;
    
    if (perGame > bestValue) {
      bestValue = perGame;
      bestYear = season.season;
    }
  });
  
  if (bestYear === 0) return null;
  
  return {
    text: `${threshold.label} (${bestValue.toFixed(1)}) in ${bestYear}`,
    type: 'category'
  };
}

function generateAwardBullet(player: Player, achievementId: string, sport: string): ReasonBullet | null {
  const awardMap: Record<string, { label: string; searchTerms: string[] }> = {
    // Basketball
    wonMVP: { label: 'MVP', searchTerms: ['MVP', 'Most Valuable Player'] },
    hasMVP: { label: 'MVP', searchTerms: ['MVP', 'Most Valuable Player'] },
    wonDPOY: { label: 'Defensive Player of the Year', searchTerms: ['DPOY', 'Defensive Player'] },
    hasDPOY: { label: 'Defensive Player of the Year', searchTerms: ['DPOY', 'Defensive Player'] },
    wonROY: { label: 'Rookie of the Year', searchTerms: ['ROY', 'Rookie of the Year'] },
    hasROY: { label: 'Rookie of the Year', searchTerms: ['ROY', 'Rookie of the Year'] },
    wonFinalsMVP: { label: 'Finals MVP', searchTerms: ['Finals MVP', 'FMVP'] },
    wonSixMOY: { label: 'Sixth Man of the Year', searchTerms: ['SMOY', 'Sixth Man'] },
    hasAllStar: { label: 'All-Star', searchTerms: ['All-Star', 'All Star'] },
    madeAllStar: { label: 'All-Star', searchTerms: ['All-Star', 'All Star'] },
    wonChampionship: { label: 'Champion', searchTerms: ['Champion', 'Championship'] }
  };
  
  const award = awardMap[achievementId];
  if (!award) return null;
  
  const seasons = getAwardSeasons(player, award.searchTerms);
  if (seasons.length === 0) return null;
  
  let seasonText = '';
  if (seasons.length === 1) {
    seasonText = seasons[0].toString();
  } else if (seasons.length <= 3) {
    seasonText = seasons.join(', ');
  } else {
    seasonText = `${seasons.slice(0, 3).join(', ')}, +${seasons.length - 3}`;
  }
  
  return {
    text: `${award.label} (${seasonText})`,
    type: 'award'
  };
}