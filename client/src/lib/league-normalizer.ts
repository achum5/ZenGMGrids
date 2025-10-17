import type { LeagueData, Player, Team, SeasonLine, TeamOverlapData } from '@/types/bbgm';
import { calculatePlayerAchievements, clearSeasonLengthCache, calculateLeagueLeadership, calculateTeamSeasonsAndAchievementSeasons, setCachedSportDetection } from '@/lib/achievements';
import { type SeasonIndex } from './season-achievements';
import { getCachedSeasonIndex } from './season-index-cache';

export type Sport = 'basketball' | 'football' | 'hockey' | 'baseball';

// Sport detection based on league data characteristics
export function detectSport(raw: any): Sport {
  if (!raw.players || raw.players.length === 0) {
    return 'basketball'; // Default fallback
  }

  // Check multiple players for better detection
  const samplePlayers = raw.players.slice(0, Math.min(10, raw.players.length));
  
  // Check for baseball first - most distinctive
  for (const player of samplePlayers) {
    const ratings = player.ratings?.[0];
    if (ratings) {
      const ovrs = ratings.ovrs || {};
      
      // Baseball has positions: SP, RP, C, 1B, 2B, 3B, SS, LF, CF, RF, DH
      const hasBaseballPositions = Object.keys(ovrs).some(pos => 
        ['SP', 'RP', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'].includes(pos)
      );
      if (hasBaseballPositions) {
        return 'baseball';
      }
      
      // Check for baseball stats (hits, home runs, RBIs, saves)
      const stats = player.stats?.[0];
      if (stats && (stats.h !== undefined || stats.hr !== undefined || stats.rbi !== undefined)) {
        return 'baseball';
      }
      
      // Check for baseball awards
      const awards = player.awards || [];
      if (awards.some((a: any) => 
        a.type?.includes('League HR Leader') || 
        a.type?.includes('League RBI Leader') ||
        a.type?.includes('All-Defensive Team') ||
        a.type?.includes('All-Offensive Team')
      )) {
        return 'baseball';
      }
    }
  }
  
  // Check for hockey second - also distinctive
  for (const player of samplePlayers) {
    const ratings = player.ratings?.[0];
    if (ratings) {
      const ovrs = ratings.ovrs || {};
      
      // Hockey has positions: C, W, D, G and stats like evG, ppG, sv
      const hasHockeyPositions = Object.keys(ovrs).some(pos => ['C', 'W', 'D', 'G'].includes(pos));
      if (hasHockeyPositions) {
        return 'hockey';
      }
      
      // Check for hockey stats
      const stats = player.stats?.[0];
      if (stats && (stats.evG !== undefined || stats.sv !== undefined || stats.gW !== undefined)) {
        return 'hockey';
      }
      
      // Check for hockey awards
      const awards = player.awards || [];
      if (awards.some((a: any) => a.type?.includes('Goalie of the Year') || a.type?.includes('Hart Trophy'))) {
        return 'hockey';
      }
    }
  }
  
  // Check for football third
  for (const player of samplePlayers) {
    const ratings = player.ratings?.[0];
    if (ratings) {
      const ovrs = ratings.ovrs || {};
      
      // Football has positions: QB, RB, WR, TE, OL, DL, LB, CB, S, K, P
      const hasFootballPositions = Object.keys(ovrs).some(pos => 
        ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'].includes(pos)
      );
      if (hasFootballPositions) {
        return 'football';
      }
      
      // Check for football stats (rushing, passing, receiving)
      const stats = player.stats?.[0];
      if (stats && (stats.rusYds !== undefined || stats.pasYds !== undefined || stats.recYds !== undefined)) {
        return 'football';
      }
    }
  }
  
  // Default to basketball
  return 'basketball';
}

// Analyze which team combinations have shared players and team-achievement viability
export function analyzeTeamOverlaps(players: Player[], teams: Team[]): TeamOverlapData {
  const teamPlayerCounts: Record<number, number> = {};
  const teamPairCounts: Record<string, number> = {};
  const teamAchievementMatrix: Record<string, Set<number>> = {};
  const achievementTeamCounts: Record<string, number> = {};
  
  // Initialize team counts
  teams.forEach(team => {
    teamPlayerCounts[team.tid] = 0;
  });
  
  // List of all possible achievement IDs to track
  const achievementIds = [
    'isPick1Overall', 'isFirstRoundPick', 'isSecondRoundPick', 'isUndrafted', 'draftedTeen',
    'isHallOfFamer', 'played15PlusSeasons', 'bornOutsideUS50DC',
    'career300PassTDs', 'season35PassTDs', 'career12kRushYds', 'career100RushTDs', 
    'season1800RushYds', 'season20RushTDs', 'career12kRecYds', 'career100RecTDs',
    'season1400RecYds', 'season15RecTDs', 'career100Sacks', 'career20Ints',
    'season15Sacks', 'season8Ints', 'wonMVP', 'wonOPOY', 'wonDPOY', 'wonROY',
    'career20kPoints', 'career10kRebounds', 'career2kThrees', 'hasMVP', 'hasAllStar'
  ];
  
  // Initialize achievement tracking
  achievementIds.forEach(id => {
    teamAchievementMatrix[id] = new Set<number>();
    achievementTeamCounts[id] = 0;
  });
  
  players.forEach(player => {
    const playerTeams = Array.from(player.teamsPlayed);
    
    // Count players per team
    playerTeams.forEach(tid => {
      teamPlayerCounts[tid] = (teamPlayerCounts[tid] || 0) + 1;
    });
    
    // Track which teams have players with each achievement
    achievementIds.forEach(achievementId => {
      if ((player.achievements as any)?.[achievementId]) {
        playerTeams.forEach(tid => {
          teamAchievementMatrix[achievementId].add(tid);
        });
      }
    });
    
    // Count shared players between team pairs
    for (let i = 0; i < playerTeams.length; i++) {
      for (let j = i + 1; j < playerTeams.length; j++) {
        const teamA = Math.min(playerTeams[i], playerTeams[j]);
        const teamB = Math.max(playerTeams[i], playerTeams[j]);
        const pairKey = `${teamA}|${teamB}`;
        teamPairCounts[pairKey] = (teamPairCounts[pairKey] || 0) + 1;
      }
    }
  });
  
  // Calculate team counts per achievement
  achievementIds.forEach(id => {
    achievementTeamCounts[id] = teamAchievementMatrix[id].size;
  });
  
  // Create viable team pairs (those with at least 1 shared player)
  const viableTeamPairs = Object.entries(teamPairCounts)
    .filter(([_, count]) => count > 0)
    .map(([pairKey, playerCount]) => {
      const [teamA, teamB] = pairKey.split('|').map(Number);
      return { teamA, teamB, playerCount };
    })
    .sort((a, b) => b.playerCount - a.playerCount); // Sort by most shared players
  
  // Find most connected teams (teams that share players with many other teams)
  const teamConnections: Record<number, number> = {};
  viableTeamPairs.forEach(({ teamA, teamB }) => {
    teamConnections[teamA] = (teamConnections[teamA] || 0) + 1;
    teamConnections[teamB] = (teamConnections[teamB] || 0) + 1;
  });
  
  const mostConnectedTeams = Object.entries(teamConnections)
    .sort(([,a], [,b]) => b - a)
    .map(([tid]) => Number(tid))
    .slice(0, 10); // Top 10 most connected teams
  
  return {
    viableTeamPairs,
    teamPlayerCounts,
    mostConnectedTeams,
    teamAchievementMatrix,
    achievementTeamCounts
  };
}

export async function normalizeLeague(raw: any, postProgress: (message: string) => void): Promise<LeagueData & { sport: Sport }> {
  try {
    postProgress('Detecting sport...');
    
    // MOBILE FIX: Yield before accessing large arrays to prevent crash
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const sport = detectSport(raw);
    
    setCachedSportDetection(sport);
  
    let currentSeason = raw.gameAttributes?.season;
    if (!currentSeason && raw.players) {
      let maxSeason = 2023;
      for (const player of raw.players) {
        if (player.stats) {
          for (const stat of player.stats) {
            if (stat.season > maxSeason) maxSeason = stat.season;
          }
        }
      }
      currentSeason = maxSeason;
    }
    currentSeason = currentSeason || 2023;
  
    postProgress('Normalizing teams...');
    const teams: Team[] = raw.teams?.map((team: any) => ({
      tid: team.tid,
      abbrev: team.abbrev || team.region || 'UNK',
      name: team.name || 'Unknown',
      region: team.region,
      colors: team.colors || [],
      jersey: team.jersey || 'modern',
      imgURL: team.imgURL || null,
      imgURLSmall: team.imgURLSmall || team.smallImgURL || null,
      seasons: team.seasons || [],
      disabled: team.disabled || false,
    })) || [];

    let minSeason = currentSeason;
    let maxSeason = currentSeason;
    if (raw.players) {
      for (const rawPlayer of raw.players) {
        if (rawPlayer.stats) {
          for (const stat of rawPlayer.stats) {
            if (!stat.playoffs && stat.season) {
              if (stat.season < minSeason) minSeason = stat.season;
              if (stat.season > maxSeason) maxSeason = stat.season;
            }
          }
        }
      }
    }
    const leagueYears = { minSeason, maxSeason };
  
    postProgress('Normalizing players...');
    const players: Player[] = [];
    if (raw.players) {
      for (const rawPlayer of raw.players) {
        const regularSeasonStats = rawPlayer.stats?.filter((stat: any) => !stat.playoffs) || [];
        const playoffStats = rawPlayer.stats?.filter((stat: any) => stat.playoffs) || [];
        
        const seasons: SeasonLine[] = [
          ...regularSeasonStats.map((stat: any) => ({ season: stat.season, tid: stat.tid, gp: stat.gp || 0, playoffs: false })),
          ...playoffStats.map((stat: any) => ({ season: stat.season, tid: stat.tid, gp: stat.gp || 0, playoffs: true }))
        ];

        const teamsPlayed = new Set<number>();
        regularSeasonStats.forEach((stat: any) => {
          if ((stat.gp || 0) > 0) teamsPlayed.add(stat.tid);
        });

        if (teamsPlayed.size > 0) {
          let firstSeason = 0, lastSeason = 0;
          if (seasons.length > 0) {
            firstSeason = seasons.reduce((min, s) => Math.min(min, s.season), seasons[0].season);
            lastSeason = seasons.reduce((max, s) => Math.max(max, s.season), seasons[0].season);
          }
          
          const decadesPlayed = new Set<number>();
          seasons.forEach(s => {
            if (s.season > 0) decadesPlayed.add(Math.floor(s.season / 10) * 10);
          });
          
          players.push({
            pid: rawPlayer.pid,
            name: `${rawPlayer.firstName || ''} ${rawPlayer.lastName || ''}`.trim() || 'Unknown Player',
            seasons,
            teamsPlayed,
            imgURL: rawPlayer.imgURL || null,
            face: rawPlayer.face || null,
            firstName: rawPlayer.firstName,
            lastName: rawPlayer.lastName,
            pos: rawPlayer.pos,
            born: rawPlayer.born,
            draft: rawPlayer.draft,
            weight: rawPlayer.weight,
            hgt: rawPlayer.hgt,
            tid: rawPlayer.tid ?? -1,
            awards: rawPlayer.awards || [],
            stats: rawPlayer.stats || [],
            ratings: rawPlayer.ratings || [],
            retiredYear: rawPlayer.retiredYear,
            contract: rawPlayer.contract,
            college: rawPlayer.college,
            injury: raw.injury,
            jerseyNumber: rawPlayer.jerseyNumber,
            firstSeason: firstSeason > 0 ? firstSeason : undefined,
            lastSeason: lastSeason > 0 ? lastSeason : undefined,
            debutDecade: firstSeason > 0 ? Math.floor(firstSeason / 10) * 10 : undefined,
            retiredDecade: lastSeason > 0 ? Math.floor(lastSeason / 10) * 10 : undefined,
            decadesPlayed: decadesPlayed.size > 0 ? decadesPlayed : undefined,
          });
        }
      }
    }

    postProgress('Calculating achievements...');
    clearSeasonLengthCache();
    const leadershipMap = calculateLeagueLeadership(players, raw.gameAttributes);
    const playerFeats = raw.playerFeats || [];
    
    players.forEach((player) => {
      player.achievements = calculatePlayerAchievements(player, players, leadershipMap, playerFeats, leagueYears);
      calculateTeamSeasonsAndAchievementSeasons(player, leadershipMap, raw.gameAttributes);
    });

    postProgress('Analyzing team overlaps...');
    const teamOverlaps = analyzeTeamOverlaps(players, teams);
    
    let seasonIndex: SeasonIndex | undefined;
    const uniqueSeasons = new Set(players.flatMap(p => p.stats?.filter(s => !s.playoffs).map(s => s.season) || []));
    const seasonCount = uniqueSeasons.size;
    
    if (['basketball', 'football', 'hockey', 'baseball'].includes(sport) && seasonCount >= 20) {
      postProgress('Building season index...');
      seasonIndex = getCachedSeasonIndex(players, sport);
    }
  
    return { players, teams, sport, teamOverlaps, seasonIndex, leagueYears };
  
  } catch (error) {
    console.error('Error in normalizeLeague:', error);
    throw error;
  }
}
