import { Player, Team, CatTeam, ReasonBullet, SeasonAchievementId } from '@/lib/types';
import { getAllAchievements, isSeasonAchievement, getSeasonAchievementSeasons, playerMeetsAchievement, parseCustomAchievementId, getSeasonsForSeasonStatAchievement, getPlayerCareerTotal, parseAchievementLabel, singularizeStatWord } from '@/lib/achievements';
import { formatNumber } from '@/lib/utils';
import { SEASON_ACHIEVEMENT_LABELS } from '@/lib/season-achievements';

// Helper to format year ranges for display
function formatYearRanges(years: number[]): string {
    if (years.length === 0) {
        return '';
    }

    const sortedYears = [...years].sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = sortedYears[0];
    let end = sortedYears[0];

    for (let i = 1; i < sortedYears.length; i++) {
        if (sortedYears[i] === end + 1) {
            end = sortedYears[i];
        } else {
            ranges.push(start === end ? start.toString() : `${start}–${end}`);
            start = sortedYears[i];
            end = sortedYears[i];
        }
    }
    ranges.push(start === end ? start.toString() : `${start}–${end}`);

    return ranges.join(', ');
}

function getAchievementYears(player: Player, achievementId: string): number[] {
    const awardMap: Record<string, string[]> = {
        'AllStar': ['All-Star'], 'MVP': ['Most Valuable Player'], 'DPOY': ['Defensive Player of the Year', 'DPOY'], 'ROY': ['Rookie of the Year'], 'SMOY': ['Sixth Man of the Year'], 'MIP': ['Most Improved Player'], 'FinalsMVP': ['Finals MVP', 'FMVP'], 'AllLeagueAny': ['All-League'], 'AllDefAny': ['All-Defensive'], 'AllRookieAny': ['All-Rookie'], 'Champion': ['Won Championship', 'Championship'],
        'FBAllStar': ['All-Star'], 'FBMVP': ['MVP'], 'FBDPOY': ['Defensive Player of the Year'], 'FBOffROY': ['Offensive Rookie of the Year'], 'FBDefROY': ['Defensive Rookie of the Year'], 'FBAllRookie': ['All-Rookie Team'], 'FBAllLeague': ['All-League Team'], 'FBFinalsMVP': ['Finals MVP'], 'FBChampion': ['Won Championship'],
        'HKAllStar': ['All-Star'], 'HKMVP': ['MVP'], 'HKROY': ['Rookie of the Year'], 'HKAllRookie': ['All-Rookie Team'], 'HKAllLeague': ['All-League Team'], 'HKPlayoffsMVP': ['Playoffs MVP'], 'HKChampion': ['Won Championship'], 'HKFinalsMVP': ['Finals MVP'],
        'BBAllStar': ['All-Star'], 'BBMVP': ['MVP'], 'BBROY': ['Rookie of the Year'], 'BBAllRookie': ['All-Rookie Team'], 'BBAllLeague': ['All-League Team'], 'BBPlayoffsMVP': ['Playoffs MVP'], 'BBChampion': ['Won Championship'],
    };

    const baseAchievementId = achievementId.split('_custom_')[0];
    const awardTypesToLookFor = awardMap[baseAchievementId];

    if (awardTypesToLookFor && player.awards) {
        const seasons = player.awards
            .filter(award => awardTypesToLookFor.some(type => award.type.toLowerCase().includes(type.toLowerCase())))
            .map(award => award.season);
        return [...new Set(seasons)].sort((a, b) => a - b);
    }
    return [];
}

export function generateReasonBullets(player: Player, rowConstraint: CatTeam, colConstraint: CatTeam, teams: Team[], sport: string): ReasonBullet[] {
    const bullets: ReasonBullet[] = [];
    const rowBullet = generateConstraintBullet(player, rowConstraint, teams, sport, colConstraint);
    if (rowBullet) bullets.push(rowBullet);
    const colBullet = generateConstraintBullet(player, colConstraint, teams, sport, rowConstraint);
    if (colBullet) bullets.push(colBullet);
    return bullets;
}

function generateConstraintBullet(player: Player, constraint: CatTeam, teams: Team[], sport: string, otherConstraint?: CatTeam): ReasonBullet | null {
    if (constraint.type === 'team') {
        return generateTeamBullet(player, constraint.tid!, teams, constraint.label);
    } else if (constraint.type === 'achievement') {
        return generateAchievementBullet(player, constraint.achievementId!, teams, constraint.label, sport, otherConstraint);
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

function generateAchievementBullet(player: Player, achievementId: string, teams: Team[], constraintLabel?: string, sport?: string, otherConstraint?: CatTeam): ReasonBullet {
    const allAchievements = getAllAchievements(sport as any);
    const baseAchievementId = achievementId.split('_custom_')[0];
    const achievement = allAchievements.find(ach => ach.id === baseAchievementId);
    const label = constraintLabel || achievement?.label || achievementId;

    if (achievement?.isSeasonSpecific) {
        const allYears = getAchievementYears(player, achievementId);

        if (allYears.length > 0) {
            if (otherConstraint?.type === 'team') {
                const teamTid = otherConstraint.tid!;
                const team = teams.find(t => t.tid === teamTid);
                const teamName = otherConstraint.label || (team ? `${team.region} ${team.name}` : `Team ${teamTid}`);

                const yearsWithTeam = allYears.filter(year => {
                    return player.stats?.some(s => s.season === year && s.tid === teamTid && !s.playoffs && (s.gp || 0) > 0);
                });

                if (yearsWithTeam.length > 0) {
                    return { text: `${label} (${formatYearRanges(yearsWithTeam)})`, type: 'award' };
                } else {
                    const countText = allYears.length > 1 ? ` (${allYears.length}x)` : '';
                    return { text: `${label}${countText} (never with the ${teamName})`, type: 'award' };
                }
            } else {
                return { text: `${label} (${formatYearRanges(allYears)})`, type: 'award' };
            }
        }
    } else if (achievement) {
        const customData = parseCustomAchievementId(achievementId);
        const playerHasIt = playerMeetsAchievement(player, achievementId, undefined, customData?.operator || '≥');
        if (playerHasIt) {
            return { text: label, type: 'award' };
        }
    }

    return { text: `Did not achieve: ${label}`, type: 'award' };
}