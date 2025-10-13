import type { Player, Team, CatTeam } from '@/types/bbgm';
import { getAllAchievements, playerMeetsAchievement } from './achievements';
import { parseCustomAchievementId, getPlayerCareerTotal } from './editable-achievements';
import { getPlayerFranchiseCount } from './player-utils';

export interface ReasonBullet {
  text: string;
  type: 'team' | 'award';
}

function groupConsecutiveYears(years: number[]): string[] {
    if (years.length === 0) return [];
    const sortedYears = [...new Set(years)].sort((a, b) => a - b);
    if (sortedYears.length === 1) return [sortedYears[0].toString()];

    const groups: string[] = [];
    let start = sortedYears[0];
    let end = sortedYears[0];

    for (let i = 1; i < sortedYears.length; i++) {
        if (sortedYears[i] === end + 1) {
            end = sortedYears[i];
        } else {
            groups.push(start === end ? `${start}` : `${start}–${end}`);
            start = sortedYears[i];
            end = sortedYears[i];
        }
    }
    groups.push(start === end ? `${start}` : `${start}–${end}`);
    return groups;
}

function formatYearRanges(years: number[]): string {
    return groupConsecutiveYears(years).join(', ');
}

function getSeasonsForSeasonStatAchievement(player: Player, achievementId: string, customThreshold?: number, customOperator?: '≥' | '≤', minGames: number = 1): number[] {
    if (!player.stats || player.stats.length === 0) return [];
  
    const qualifyingSeasons: number[] = [];
    
    const regularSeasonStats = player.stats.filter(s => !s.playoffs);
    
    for (const stat of regularSeasonStats) {
      const season = stat.season;
      const gp = stat.gp || 0;
      const min = stat.min || 0;
      const pts = stat.pts || 0;
      const trb = (stat as any).trb ?? ((stat as any).orb || 0) + ((stat as any).drb || 0);
      const ast = stat.ast || 0;
      const stl = stat.stl || 0;
      const blk = stat.blk || 0;
      const tp = stat.tpm || stat.tp || 0;
      const tpa = stat.tpa || 0;
      const fga = stat.fga || 0;
      const fta = stat.fta || 0;
      const ft = stat.ft || 0;
      const fg = stat.fg || 0;
      
      const check = (value: number, threshold: number, operator: '≥' | '≤') => {
        if (operator === '≤') return value <= threshold;
        return value >= threshold;
      };
  
      switch (achievementId) {
        case 'Season30PPG':
          if (gp >= minGames && check(pts / gp, customThreshold !== undefined ? customThreshold : 30, customOperator || '≥')) qualifyingSeasons.push(season);
          break;
        case 'Season2000Points':
          if (check(pts, customThreshold !== undefined ? customThreshold : 2000, customOperator || '≥')) qualifyingSeasons.push(season);
          break;
        case 'Season200_3PM':
          if (check(tp, customThreshold !== undefined ? customThreshold : 200, customOperator || '≥')) qualifyingSeasons.push(season);
          break;
        case 'Season12RPG':
          if (gp >= minGames && check(trb / gp, customThreshold !== undefined ? customThreshold : 12, customOperator || '≥')) qualifyingSeasons.push(season);
          break;
        case 'Season10APG':
          if (gp >= minGames && check(ast / gp, customThreshold !== undefined ? customThreshold : 10, customOperator || '≥')) qualifyingSeasons.push(season);
          break;
        case 'Season800Rebounds':
          if (check(trb, customThreshold !== undefined ? customThreshold : 800, customOperator || '≥')) qualifyingSeasons.push(season);
          break;
        case 'Season700Assists':
          if (check(ast, customThreshold !== undefined ? customThreshold : 700, customOperator || '≥')) qualifyingSeasons.push(season);
          break;
        case 'Season2SPG':
          if (gp >= minGames && check(stl / gp, customThreshold !== undefined ? customThreshold : 2.0, customOperator || '≥')) qualifyingSeasons.push(season);
          break;
        case 'Season2_5BPG':
          if (gp >= minGames && check(blk / gp, customThreshold !== undefined ? customThreshold : 2.5, customOperator || '≥')) qualifyingSeasons.push(season);
          break;
        case 'Season150Steals':
          if (check(stl, customThreshold !== undefined ? customThreshold : 150, customOperator || '≥')) qualifyingSeasons.push(season);
          break;
        case 'Season150Blocks':
          if (check(blk, customThreshold !== undefined ? customThreshold : 150, customOperator || '≥')) qualifyingSeasons.push(season);
          break;
        case 'Season200Stocks':
          if (check((stl + blk), customThreshold !== undefined ? customThreshold : 200, customOperator || '≥')) qualifyingSeasons.push(season);
          break;
        case 'Season50_40_90':
          if (fga >= 400 && tpa >= 100 && fta >= 100) {
            const fgPct = fg / fga;
            const tpPct = tp / tpa;
            const ftPct = ft / fta;
            if (check(fgPct, customThreshold !== undefined ? customThreshold / 100 : 0.50, customOperator || '≥') &&
                check(tpPct, customThreshold !== undefined ? customThreshold / 100 : 0.40, customOperator || '≥') &&
                check(ftPct, customThreshold !== undefined ? customThreshold / 100 : 0.90, customOperator || '≥')) {
              qualifyingSeasons.push(season);
            }
          }
          break;
        case 'Season60eFG500FGA':
          if (fga >= 500) {
            const eFG = (fg + 0.5 * tp) / fga;
            if (check(eFG, customThreshold !== undefined ? customThreshold / 100 : 0.60, customOperator || '≥')) qualifyingSeasons.push(season);
          }
          break;
      case 'Season90FT250FTA':
          if (fta >= 250 && check(ft / fta, customThreshold !== undefined ? customThreshold / 100 : 0.90, customOperator || '≥')) qualifyingSeasons.push(season);
          break;
      case 'SeasonFGPercent':
          if (fga >= 300 && check(fg / fga, customThreshold !== undefined ? customThreshold / 100 : 0.40, customOperator || '≥')) qualifyingSeasons.push(season);
          break;
      case 'Season3PPercent':
          if (tpa >= 100 && check(tp / tpa, customThreshold !== undefined ? customThreshold / 100 : 0.40, customOperator || '≥')) qualifyingSeasons.push(season);
          break;
        case 'Season70Games':
          if (check(gp, customThreshold !== undefined ? customThreshold : 70, customOperator || '≥')) qualifyingSeasons.push(season);
          break;
        case 'Season36MPG':
          if (gp >= minGames && check(min / gp, customThreshold !== undefined ? customThreshold : 36.0, customOperator || '≥')) qualifyingSeasons.push(season);
          break;
        case 'Season25_10':
          if (gp >= minGames && check(pts / gp, customThreshold !== undefined ? customThreshold : 25, customOperator || '≥') && check(trb / gp, customThreshold !== undefined ? customThreshold : 10, customOperator || '≥')) qualifyingSeasons.push(season);
          break;
        case 'Season25_5_5':
          if (gp >= minGames && check(pts / gp, customThreshold !== undefined ? customThreshold : 25, customOperator || '≥') && check(trb / gp, customThreshold !== undefined ? customThreshold : 5, customOperator || '≥') && check(ast / gp, customThreshold !== undefined ? customThreshold : 5, customOperator || '≥')) qualifyingSeasons.push(season);
          break;
        case 'Season20_10_5':
          if (gp >= minGames && check(pts / gp, customThreshold !== undefined ? customThreshold : 20, customOperator || '≥') && check(trb / gp, customThreshold !== undefined ? customThreshold : 10, customOperator || '≥') && check(ast / gp, customThreshold !== undefined ? customThreshold : 5, customOperator || '≥')) qualifyingSeasons.push(season);
          break;
        case 'Season1_1_1':
          if (gp >= minGames && check(stl / gp, customThreshold !== undefined ? customThreshold : 1, customOperator || '≥') && check(blk / gp, customThreshold !== undefined ? customThreshold : 1, customOperator || '≥') && check(tp / gp, customThreshold !== undefined ? customThreshold : 1, customOperator || '≥')) qualifyingSeasons.push(season);
          break;
        case 'FBSeason4kPassYds':
          if (check((stat as any).pssYds, customThreshold !== undefined ? customThreshold : 4000, customOperator || '≥')) qualifyingSeasons.push(season);
          break;
        case 'FBSeason1200RushYds':
          if (check((stat as any).rushYds, customThreshold !== undefined ? customThreshold : 1200, customOperator || '≥')) qualifyingSeasons.push(season);
          break;
      }
    }
    
    return [...new Set(qualifyingSeasons)].sort();
}

function getAchievementYears(player: Player, achievementId: string): number[] {
    const awardMap: Record<string, string[]> = {
        'AllStar': ['All-Star'], 'MVP': ['Most Valuable Player'], 'DPOY': ['Defensive Player of the Year', 'DPOY'], 'ROY': ['Rookie of the Year'], 'SMOY': ['Sixth Man of the Year'], 'MIP': ['Most Improved Player'], 'FinalsMVP': ['Finals MVP', 'FMVP'], 'AllLeagueAny': ['All-League'], 'AllDefAny': ['All-Defensive'], 'AllRookieAny': ['All-Rookie'], 'Champion': ['Won Championship', 'Championship'],
        'FBAllStar': ['All-Star'], 'FBMVP': ['MVP'], 'FBDPOY': ['Defensive Player of the Year'], 'FBOffROY': ['Offensive Rookie of the Year'], 'FBDefROY': ['Defensive Rookie of the Year'], 'FBAllRookie': ['All-Rookie Team'], 'FBAllLeague': ['All-League Team'], 'FBFinalsMVP': ['Finals MVP'], 'FBChampion': ['Won Championship'],
        'HKAllStar': ['All-Star'], 'HKMVP': ['MVP'], 'HKROY': ['Rookie of the Year'], 'HKAllRookie': ['All-Rookie Team'], 'HKAllLeague': ['All-League Team'], 'HKPlayoffsMVP': ['Playoffs MVP'], 'HKChampion': ['Won Championship'], 'HKFinalsMVP': ['Finals MVP'],
        'BBAllStar': ['All-Star'], 'BBMVP': ['MVP'], 'BBROY': ['Rookie of the Year'], 'BBAllRookie': ['All-Rookie Team'], 'BBAllLeague': ['All-League Team'], 'BBPlayoffsMVP': ['Playoffs MVP'], 'BBChampion': ['Won Championship'],
    };

    let baseAchievementId = achievementId;
    if (achievementId.includes('_custom_')) {
        baseAchievementId = achievementId.split('_custom_')[0];
    }

    const awardTypesToLookFor = awardMap[baseAchievementId];
    if (awardTypesToLookFor && player.awards) {
        const seasons = player.awards
            .filter(award => {
                const awardTypeLower = award.type.toLowerCase();
                return awardTypesToLookFor.some(type => {
                    const typeLower = type.toLowerCase();
                    // Use regex for whole word matching to avoid "Semifinals MVP" matching "MVP"
                    const regex = new RegExp(`\\b${typeLower}\\b`);
                    return regex.test(awardTypeLower);
                });
            })
            .map(award => award.season);
        return [...new Set(seasons)].sort((a, b) => a - b);
    }

    const customParts = parseCustomAchievementId(achievementId);
    return getSeasonsForSeasonStatAchievement(player, customParts ? customParts.baseId : achievementId, customParts?.threshold, customParts?.operator);
}

export function generateReasonBullets(player: Player, rowConstraint: CatTeam, colConstraint: CatTeam, teams: Team[], sport: string, seasonIndex: any): ReasonBullet[] {
    const bullets: ReasonBullet[] = [];
    const rowBullet = generateConstraintBullet(player, rowConstraint, teams, sport, seasonIndex, colConstraint);
    if (rowBullet) bullets.push(rowBullet);
    const colBullet = generateConstraintBullet(player, colConstraint, teams, sport, seasonIndex, rowConstraint);
    if (colBullet) bullets.push(colBullet);
    return bullets;
}

function generateConstraintBullet(player: Player, constraint: CatTeam, teams: Team[], sport: string, seasonIndex: any, otherConstraint?: CatTeam): ReasonBullet | null {
    if (constraint.type === 'team') {
        return generateTeamBullet(player, constraint.tid!, teams, constraint.label);
    } else if (constraint.type === 'achievement') {
        return generateAchievementBullet(player, constraint.achievementId!, teams, constraint.label, sport, seasonIndex, otherConstraint);
    }
    return null;
}

function generateTeamBullet(player: Player, teamTid: number, teams: Team[], constraintLabel?: string): ReasonBullet {
    const team = teams.find(t => t.tid === teamTid);
    const teamName = constraintLabel || (team ? `${team.region} ${team.name}` : `Team ${teamTid}`);

    const teamSeasons = player.stats?.filter(s => s.tid === teamTid && !s.playoffs && (s.gp || 0) > 0).map(s => s.season) || [];

    if (teamSeasons.length === 0) {
        return { text: `Never played for the ${teamName}`, type: 'team' };
    }

    return { text: `${teamName} (${formatYearRanges(teamSeasons)})`, type: 'team' };
}

function generateAchievementBullet(player: Player, achievementId: string, teams: Team[], constraintLabel?: string, sport?: string, seasonIndex?: any, otherConstraint?: CatTeam): ReasonBullet {
    const allAchievements = getAllAchievements(sport as any, seasonIndex);
    const baseAchievementId = achievementId.split('_custom_')[0];
    const achievement = allAchievements.find(ach => ach.id === baseAchievementId);
    let label = constraintLabel || achievement?.label || achievementId;

    // Define which achievements are "awards" that should get a counter (e.g., 2x)
    const awardAchievements = new Set([
        'AllStar', 'MVP', 'DPOY', 'ROY', 'SMOY', 'MIP', 'FinalsMVP', 'AllLeagueAny', 'AllDefAny', 'AllRookieAny', 'Champion',
        'FBAllStar', 'FBMVP', 'FBDPOY', 'FBOffROY', 'FBDefROY', 'FBAllRookie', 'FBAllLeague', 'FBFinalsMVP', 'FBChampion',
        'HKAllStar', 'HKMVP', 'HKROY', 'HKAllRookie', 'HKAllLeague', 'HKPlayoffsMVP', 'HKChampion', 'HKFinalsMVP',
        'BBAllStar', 'BBMVP', 'BBROY', 'BBAllRookie', 'BBAllLeague', 'BBPlayoffsMVP', 'BBChampion'
    ]);
    const isAwardAchievement = awardAchievements.has(baseAchievementId);

    if (baseAchievementId === 'played5PlusFranchises') {
        const count = getPlayerFranchiseCount(player);
        const franchiseText = count === 1 ? 'Franchise' : 'Franchises';
        return { text: `Played for ${count} ${franchiseText}`, type: 'award' };
    }

    const careerStatMap: Record<string, { name: string, calculation: (player: Player) => number }> = {
        'career20kPoints': { name: 'Career Points', calculation: (p) => getPlayerCareerTotal(p, 'pts') },
        'career10kRebounds': { name: 'Career Rebounds', calculation: (p) => getPlayerCareerTotal(p, 'trb') },
        'career5kAssists': { name: 'Career Assists', calculation: (p) => getPlayerCareerTotal(p, 'ast') },
        'career2kSteals': { name: 'Career Steals', calculation: (p) => getPlayerCareerTotal(p, 'stl') },
        'career1500Blocks': { name: 'Career Blocks', calculation: (p) => getPlayerCareerTotal(p, 'blk') },
        'career2kThrees': { name: 'Career 3PM', calculation: (p) => getPlayerCareerTotal(p, ['tpm', 'tp']) },
        'career300PassTDs': { name: 'Career Passing TDs', calculation: (p) => getPlayerCareerTotal(p, 'pssTD') },
        'career50kPassYds': { name: 'Career Passing Yards', calculation: (p) => getPlayerCareerTotal(p, 'pssYds') },
        'career12kRushYds': { name: 'Career Rushing Yards', calculation: (p) => getPlayerCareerTotal(p, 'rusYds') },
        'career100RushTDs': { name: 'Career Rushing TDs', calculation: (p) => getPlayerCareerTotal(p, 'rusTD') },
        'career12kRecYds': { name: 'Career Receiving Yards', calculation: (p) => getPlayerCareerTotal(p, 'recYds') },
        'career100RecTDs': { name: 'Career Receiving TDs', calculation: (p) => getPlayerCareerTotal(p, 'recTD') },
        'career100Sacks': { name: 'Career Sacks', calculation: (p) => getPlayerCareerTotal(p, ['sks', 'defSk']) },
        'career20Ints': { name: 'Career Interceptions', calculation: (p) => getPlayerCareerTotal(p, 'defInt') },
        'career3000Hits': { name: 'Career Hits', calculation: (p) => getPlayerCareerTotal(p, 'h') },
        'career500HRs': { name: 'Career Home Runs', calculation: (p) => getPlayerCareerTotal(p, 'hr') },
        'career1500RBIs': { name: 'Career RBIs', calculation: (p) => getPlayerCareerTotal(p, 'rbi') },
        'career400SBs': { name: 'Career Stolen Bases', calculation: (p) => getPlayerCareerTotal(p, 'sb') },
        'career1800Runs': { name: 'Career Runs', calculation: (p) => getPlayerCareerTotal(p, 'r') },
        'career300Wins': { name: 'Career Wins (P)', calculation: (p) => getPlayerCareerTotal(p, 'w') },
        'career3000Ks': { name: 'Career Strikeouts', calculation: (p) => getPlayerCareerTotal(p, 'soPit') },
        'career300Saves': { name: 'Career Saves', calculation: (p) => getPlayerCareerTotal(p, 'sv') },
        'career500Goals': { name: 'Career Goals', calculation: (p) => p.stats?.filter(s => !s.playoffs).reduce((sum, s) => sum + ((s as any).evG || 0) + ((s as any).ppG || 0) + ((s as any).shG || 0), 0) || 0 },
        'career500Assists': { name: 'Career Assists', calculation: (p) => p.stats?.filter(s => !s.playoffs).reduce((sum, s) => sum + ((s as any).evA || 0) + ((s as any).ppA || 0) + ((s as any).shA || 0), 0) || 0 },
        'career1000Points': { name: 'Career Points', calculation: (p) => p.stats?.filter(s => !s.playoffs).reduce((sum, s) => sum + ((s as any).evG || 0) + ((s as any).ppG || 0) + ((s as any).shG || 0) + ((s as any).evA || 0) + ((s as any).ppA || 0) + ((s as any).shA || 0), 0) || 0 },
        'career200Wins': { name: 'Career Wins (G)', calculation: (p) => p.stats?.filter(s => !s.playoffs && ((s as any).gpGoalie || 0) > 0).reduce((sum, s) => sum + ((s as any).gW || 0), 0) || 0 },
        'career50Shutouts': { name: 'Career Shutouts (G)', calculation: (p) => p.stats?.filter(s => !s.playoffs && ((s as any).gpGoalie || 0) > 0).reduce((sum, s) => sum + ((s as any).so || 0), 0) || 0 },
    };

    if (careerStatMap[baseAchievementId]) {
        const statInfo = careerStatMap[baseAchievementId];
        const total = statInfo.calculation(player);
        const formattedTotal = total.toLocaleString();
        return { text: `${formattedTotal} ${statInfo.name}`, type: 'award' };
    }

    // Does the player have this achievement at all, regardless of team?
    const allYears = getAchievementYears(player, achievementId);
    const hasEverAchieved = allYears.length > 0 || (achievement && !achievement.isSeasonSpecific && playerMeetsAchievement(player, achievementId));

    if (!hasEverAchieved) {
        // This is simple. They never got it.
        return { text: `Did not achieve: ${label}`, type: 'award' };
    }

    // Clean the label for season achievements
    if (achievement?.isSeasonSpecific) {
        label = label.replace(/\s*\(Season\)/gi, '');
    }

    // OK, they have the award. Now we need to check against the team constraint, if it exists.
    if (otherConstraint?.type === 'team' && achievement?.isSeasonSpecific) {
        const teamTid = otherConstraint.tid!;
        const team = teams.find(t => t.tid === teamTid);
        const teamName = otherConstraint.label || (team ? `${team.region} ${team.name}` : `Team ${teamTid}`);

        // Did they achieve it with this specific team?
        const yearsWithTeam = allYears.filter(year => {
            return player.stats?.some(s => s.season === year && s.tid === teamTid && !s.playoffs && (s.gp || 0) > 0);
        });

        if (yearsWithTeam.length > 0) {
            // Yes, they did. Show the total years count, but only the years with this team.
            const countText = allYears.length > 1 && isAwardAchievement ? `${allYears.length}x ` : '';
            const yearsText = yearsWithTeam.length > 0 ? `(${formatYearRanges(yearsWithTeam)} with the ${teamName})` : '';
            return { text: `${countText}${label} ${yearsText}`, type: 'award' };
        } else {
            // No, they didn't. Show the special message with count and all years.
            const countText = allYears.length > 1 && isAwardAchievement ? `${allYears.length}x ` : '';
            const yearsText = allYears.length > 0 ? `(${formatYearRanges(allYears)})` : '';
            return { text: `${countText}${label} ${yearsText} (never with the ${teamName})`, type: 'award' };
        }
    }

    // They have the award, but there is no team constraint to check against, or it's a career award.
    if (achievement?.isSeasonSpecific) {
        const countText = allYears.length > 1 && isAwardAchievement ? `${allYears.length}x ` : '';
        const yearsText = allYears.length > 0 ? `(${formatYearRanges(allYears)})` : '';
        return { text: `${countText}${label} ${yearsText}`, type: 'award' };
    } else {
        // For non-season-specific career achievements
        return { text: label, type: 'award' };
    }
}