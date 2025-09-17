import type { Player, Team } from '@/types/bbgm';
import type { GridConstraint } from '@/lib/feedback';
import { type SeasonAchievementId, resolveDynamicLabel } from '@/lib/season-achievements';

// Dynamic achievement label resolver for bullet display
function getSeasonAchievementLabel(achievementId: string): string {
  // Handle dynamic threshold-based achievements (with @ symbol)
  if (achievementId.includes('@')) {
    return resolveDynamicLabel(achievementId);
  }
  
  // Fallback to static achievement labels for legacy achievements
  const staticLabels: Partial<Record<SeasonAchievementId, string>> = {
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
    
    // Basketball GM Season Statistical Achievements (24 new achievements)
    Season30PPG: '30+ PPG (Season)',
    Season2000Points: '2,000+ Points (Season)',
    Season300_3PM: '300+ 3PM (Season)',
    Season200_3PM: '200+ 3PM (Season)',
    Season12RPG: '12+ RPG (Season)',
    Season10APG: '10+ APG (Season)',
    Season800Rebounds: '800+ Rebounds (Season)',
    Season700Assists: '700+ Assists (Season)',
    Season2SPG: '2.0+ SPG (Season)',
    Season2_5BPG: '2.5+ BPG (Season)',
    Season150Steals: '150+ Steals (Season)',
    Season150Blocks: '150+ Blocks (Season)',
    Season200Stocks: '200+ Stocks (Season)',
    Season50_40_90: '50/40/90 Club (Season)',
    Season60TS20PPG: '60%+ TS on 20+ PPG (Season)',
    Season60eFG500FGA: '60%+ eFG on ≥500 FGA (Season)',
    Season90FT250FTA: '90%+ FT on ≥250 FTA (Season)',
    Season40_3PT200_3PA: '40%+ 3PT on ≥200 3PA (Season)',
    Season70Games: '70+ Games Played (Season)',
    Season36MPG: '36.0+ MPG (Season)',
    Season25_10: '25/10 Season (PPG/RPG)',
    Season25_5_5: '25/5/5 Season (PPG/RPG/APG)',
    Season20_10_5: '20/10/5 Season (PPG/RPG/APG)',
    Season1_1_1: '1/1/1 Season (SPG/BPG/3PM/G)',
    
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
    FBSeason4kPassYds: '4,000+ Passing Yards (Season)',
    FBSeason1200RushYds: '1,200+ Rushing Yards (Season)',
    FBSeason100Receptions: '100+ Receptions (Season)',
    FBSeason15Sacks: '15+ Sacks (Season)',
    FBSeason140Tackles: '140+ Tackles (Season)',
    FBSeason5Interceptions: '5+ Interceptions (Season)',
    FBSeason30PassTD: '30+ Passing TD (Season)',
    FBSeason1300RecYds: '1,300+ Receiving Yards (Season)',
    FBSeason10RecTD: '10+ Receiving TD (Season)',
    FBSeason12RushTD: '12+ Rushing TD (Season)',
    FBSeason1600Scrimmage: '1,600+ Yards from Scrimmage (Season)',
    FBSeason2000AllPurpose: '2,000+ All-Purpose Yards (Season)',
    FBSeason15TFL: '15+ Tackles for Loss (Season)',
    
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
    HKChampion: 'Won Championship',
    
    // Hockey GM Season Statistical Achievements (19 new achievements)
    HKSeason40Goals: '40+ Goals (Season)',
    HKSeason60Assists: '60+ Assists (Season)',
    HKSeason90Points: '90+ Points (Season)',
    HKSeason25Plus: '+25 Plus/Minus (Season)',
    HKSeason250Shots: '250+ Shots (Season)',
    HKSeason150Hits: '150+ Hits (Season)',
    HKSeason100Blocks: '100+ Blocks (Season)',
    HKSeason60Takeaways: '60+ Takeaways (Season)',
    HKSeason20PowerPlay: '20+ Power-Play Points (Season)',
    HKSeason3SHGoals: '3+ Short-Handed Goals (Season)',
    HKSeason7GWGoals: '7+ Game-Winning Goals (Season)',
    HKSeason55FaceoffPct: '55%+ Faceoff Win Rate (Season)',
    HKSeason22TOI: '22:00+ TOI per Game (Season)',
    HKSeason70PIM: '70+ PIM (Season)',
    HKSeason920SavePct: '.920+ Save Percentage (Season)',
    HKSeason260GAA: '≤2.60 GAA (Season)',
    HKSeason6Shutouts: '6+ Shutouts (Season)',
    HKSeason2000Saves: '2000+ Saves (Season)',
    HKSeason60Starts: '60+ Starts (Season)',
    
    // Baseball GM achievements
    BBAllStar: 'All-Star',
    BBMVP: 'MVP',
    BBROY: 'Rookie of the Year',
    BBAllRookie: 'All-Rookie Team',
    BBAllLeague: 'All-League Team',
    BBPlayoffsMVP: 'Playoffs MVP',
    BBChampion: 'Won Championship',

    // Baseball GM Season Statistical Achievements (28 new achievements)
    // Hitters (15 achievements)
    BBSeason40HR: '40+ HR (Season)',
    BBSeason200Hits: '200+ Hits (Season)',
    BBSeason100RBI: '100+ RBI (Season)',
    BBSeason100Runs: '100+ Runs (Season)',
    BBSeason50SB: '50+ SB (Season)',
    BBSeason100BB: '100+ BB (Season)',
    BBSeason300TB: '300+ TB (Season)',
    BBSeason60XBH: '60+ XBH (Season)',
    BBSeason300Avg500PA: '.300+ AVG on ≥500 PA (Season)',
    BBSeason400OBP500PA: '.400+ OBP on ≥500 PA (Season)',
    BBSeason550SLG500PA: '.550+ SLG on ≥500 PA (Season)',
    BBSeason900OPS500PA: '.900+ OPS on ≥500 PA (Season)',
    BBSeason10Triples: '10+ Triples (Season)',
    BBSeason20HBP: '20+ HBP (Season)',
    BBSeason25_25Club: '25/25 Club HR/SB (Season)',
    // Pitchers (12 achievements)
    BBSeason200SO: '200+ SO (Season)',
    BBSeason250ERA162IP: '≤2.50 ERA on ≥162 IP (Season)',
    BBSeason105WHIP162IP: '≤1.05 WHIP on ≥162 IP (Season)',
    BBSeason20Wins: '20+ Wins (Season)',
    BBSeason40Saves: '40+ Saves (Season)',
    BBSeason3CG: '3+ CG (Season)',
    BBSeason4SHO: '4+ SHO (Season)',
    BBSeason220IP: '220+ IP (Season)',
    BBSeasonKBB4_162IP: 'K/BB ≥ 4.0 on ≥162 IP (Season)',
    BBSeasonK9_10_100IP: 'K/9 ≥ 10.0 on ≥100 IP (Season)',
    BBSeason30GS: '30+ GS (Season)',
    BBSeason50APP: '50+ APP (Season)',
    // Two-Way (1 achievement)
    BBSeasonTwoWay20HR100IP: 'Two-Way 20+ HR & 100+ IP (Season)'
  };

  const label = staticLabels[achievementId as SeasonAchievementId];
  return label || achievementId;
}

export interface ReasonBullet {
  text: string;
  type: 'category' | 'team' | 'award' | 'draft' | 'longevity' | 'decade';
}

// Helper function to format numbers with commas
function formatNumber(num: number): string {
  return num.toLocaleString();
}

// Helper function to get team abbreviation
function getTeamAbbrev(teams: Team[], tid: number): string {
  const team = teams.find(t => t.tid === tid);
  return team?.abbrev || team?.region || team?.name || 'Unknown';
}

// Helper function to check if an achievement ID is a season achievement
function isSeasonAchievement(achievementId: string): achievementId is SeasonAchievementId {
  // Check if it's a dynamic achievement (contains @) or a known static achievement
  if (achievementId.includes('@')) return false; // Dynamic achievements are handled separately
  const staticLabels: Partial<Record<SeasonAchievementId, string>> = {
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
    BlocksLeader: 'League Blocks Leader'
  };
  return Object.keys(staticLabels).includes(achievementId);
}

// Helper function to extract season achievement data from player
function getSeasonAchievementSeasons(player: Player, achievementId: SeasonAchievementId, teams: Team[], teamId?: number): string[] {
  if (!player.awards) return [];

  // Map achievement ID to award type patterns
  const awardTypePatterns: Partial<Record<SeasonAchievementId, string[]>> = {
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
    BlocksLeader: ['League Blocks Leader', 'league blocks leader', 'blocks leader']
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
  
  // Close the final range
  if (start === end) {
    groups.push(start.toString());
  } else {
    groups.push(`${start}-${end}`);
  }
  
  return groups;
}

// Helper function to format bullet season list
function formatBulletSeasonList(seasons: string[], isPlayoffAward: boolean = false): string {
  if (seasons.length === 0) return '';
  if (seasons.length === 1) return seasons[0];
  
  // For playoff awards, use semicolon separator: "1994 HOU; 1995 HOU"
  if (isPlayoffAward) {
    return seasons.join('; ');
  }
  
  // For other awards, try to parse years and format with ranges
  const numericYears = seasons
    .map(s => parseInt(s, 10))
    .filter(year => !isNaN(year))
    .sort((a, b) => a - b);
    
  if (numericYears.length === seasons.length) {
    // All seasons are numeric years, format with ranges
    return groupConsecutiveYears(numericYears).join(', ');
  }
  
  // Fall back to comma separator if seasons contain non-numeric data
  return seasons.join(', ');
}

// Helper function to get award seasons
function getAwardSeasons(player: Player, searchTerms: string[]): number[] {
  if (!player.awards) return [];
  
  const seasons = player.awards
    .filter(award => {
      const awardType = (award.type || '').toLowerCase();
      const awardName = ((award as any).name || '').toLowerCase();
      return searchTerms.some(term => 
        awardType.includes(term.toLowerCase()) || 
        awardName.includes(term.toLowerCase())
      );
    })
    .map(award => award.season)
    .filter(season => season !== undefined) as number[];
  
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
  const teamConstraints = constraints.filter(c => c.team !== undefined);
  const seasonAchConstraints = constraints.filter(c => c.achievement && isSeasonAchievement(c.achievement));
  const otherAchConstraints = constraints.filter(c => c.achievement && !isSeasonAchievement(c.achievement));
  
  // 1) Team bullets first
  for (const constraint of teamConstraints) {
    const bullet = buildTeamBullet(player, constraint.team!, teams);
    if (bullet) bullets.push(bullet);
  }
  
  // 2) Season achievement bullets
  for (const constraint of seasonAchConstraints) {
    const bullet = buildSeasonAchievementBullet(player, constraint.achievement! as SeasonAchievementId, teams);
    if (bullet) bullets.push(bullet);
  }
  
  // 3) Career/misc achievement bullets
  for (const constraint of otherAchConstraints) {
    const bullet = buildCareerAchievementBullet(player, constraint.achievement!, teams, sport);
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
  const achLabel = getSeasonAchievementLabel(achievementId);
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
  if (constraint.team !== undefined) {
    return buildTeamBullet(player, constraint.team, teams);
  } else if (constraint.achievement) {
    if (isSeasonAchievement(constraint.achievement)) {
      return buildSeasonAchievementBullet(player, constraint.achievement as SeasonAchievementId, teams);
    } else {
      return buildCareerAchievementBullet(player, constraint.achievement, teams, sport);
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
  // Decade achievements
  if (achievementId.includes('playedIn') && achievementId.endsWith('s')) {
    return generateDecadeBullet(player, achievementId, 'played');
  }
  
  if (achievementId.includes('debutedIn') && achievementId.endsWith('s')) {
    return generateDecadeBullet(player, achievementId, 'debuted');
  }
  
  if (achievementId.includes('retiredIn') && achievementId.endsWith('s')) {
    return generateDecadeBullet(player, achievementId, 'retired');
  }
  
  // Draft achievements
  if (['isPick1Overall', 'isFirstRoundPick', 'isSecondRoundPick', 'isUndrafted', 'draftedTeen'].includes(achievementId)) {
    return generateDraftBullet(player, achievementId);
  }
  
  // Longevity achievements  
  if (['played15PlusSeasons', 'played10PlusSeasons'].includes(achievementId)) {
    return generateLongevityBullet(player, achievementId);
  }
  
  // Award achievements
  return generateAwardBullet(player, achievementId);
}

function generateDecadeBullet(player: Player, achievementId: string, action: string): ReasonBullet | null {
  const decade = achievementId.match(/(\d{4})s/)?.[1];
  if (!decade) return null;
  
  return {
    text: `${action.charAt(0).toUpperCase() + action.slice(1)} in the ${decade}s`,
    type: 'decade'
  };
}

function generateDraftBullet(player: Player, achievementId: string): ReasonBullet | null {
  if (!player.draft) return null;
  
  const draftMap: Record<string, string> = {
    isPick1Overall: '#1 Overall Pick',
    isFirstRoundPick: 'First Round Pick',
    isSecondRoundPick: 'Second Round Pick',
    isUndrafted: 'Undrafted',
    draftedTeen: 'Drafted as Teenager'
  };
  
  const label = draftMap[achievementId];
  if (!label) return null;
  
  const year = player.draft.year || player.born?.year || 'Unknown';
  
  return {
    text: `${label} (${year})`,
    type: 'draft'
  };
}

function generateLongevityBullet(player: Player, achievementId: string): ReasonBullet | null {
  if (!player.stats) return null;
  
  const seasons = player.stats
    .filter(s => !s.playoffs && (s.gp || 0) > 0)
    .map(s => s.season)
    .filter((season, index, arr) => arr.indexOf(season) === index)
    .length;
  
  const longevityMap: Record<string, { threshold: number; label: string }> = {
    played15PlusSeasons: { threshold: 15, label: '15+ Seasons' },
    played10PlusSeasons: { threshold: 10, label: '10+ Seasons' }
  };
  
  const config = longevityMap[achievementId];
  if (!config || seasons < config.threshold) return null;
  
  return {
    text: `${config.label} (${seasons} seasons)`,
    type: 'longevity'
  };
}

function generateAwardBullet(player: Player, achievementId: string): ReasonBullet | null {
  if (!player.awards) return null;
  
  const awardMap: Record<string, { label: string; searchTerms: string[] }> = {
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