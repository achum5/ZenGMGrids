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
export async function analyzeTeamOverlaps(players: Player[], teams: Team[], mobile: boolean = false): Promise<TeamOverlapData> {
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
  
  // MOBILE FIX: Process in chunks with yields to prevent freeze
  const CHUNK_SIZE = mobile ? 500 : 5000;
  for (let i = 0; i < players.length; i += CHUNK_SIZE) {
    const chunk = players.slice(i, i + CHUNK_SIZE);
    
    chunk.forEach(player => {
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
    
    // Yield on mobile to prevent freeze
    if (mobile && i > 0) {
      await new Promise(resolve => setTimeout(resolve, 5));
    }
  }
  
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
    postProgress('Detecting sport type...');
    
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
  
    postProgress('Processing teams...');
    // Sport-specific default jersey styles
    const defaultJerseyStyle = sport === 'baseball' ? 'baseball2' : 'modern';

    const teams: Team[] = raw.teams?.map((team: any) => {
      const teamJersey = team.jersey || defaultJerseyStyle;
      return {
        tid: team.tid,
        abbrev: team.abbrev || team.region || 'UNK',
        name: team.name || 'Unknown',
        region: team.region,
        colors: team.colors || [],
        jersey: teamJersey,
        imgURL: team.imgURL || null,
        imgURLSmall: team.imgURLSmall || team.smallImgURL || null,
        seasons: team.seasons?.map((s: any) => ({
          ...s,
          jersey: s.jersey || teamJersey // Use season-specific jersey or fallback to team default
        })) || [],
        disabled: team.disabled || false,
      };
    }) || [];

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
  
    postProgress('Processing players...');
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

          // Debug: log death data from raw player
          const deathYear = rawPlayer.diedYear ?? rawPlayer.deathYear ?? rawPlayer.died?.year;
          if (deathYear && deathYear > 0) {
            console.log('💀 [INGEST] Found deceased player:', {
              pid: rawPlayer.pid,
              name: `${rawPlayer.firstName} ${rawPlayer.lastName}`,
              diedYear: rawPlayer.diedYear,
              deathYear: rawPlayer.deathYear,
              died: rawPlayer.died,
              computed: deathYear
            });
          }

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
            diedYear: (rawPlayer as any).diedYear,
            deathYear: (rawPlayer as any).deathYear,
            died: (rawPlayer as any).died,
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
    const teamOverlaps = await analyzeTeamOverlaps(players, teams);

    let seasonIndex: SeasonIndex | undefined;
    const uniqueSeasons = new Set(players.flatMap(p => p.stats?.filter(s => !s.playoffs).map(s => s.season) || []));
    const seasonCount = uniqueSeasons.size;

    if (['basketball', 'football', 'hockey', 'baseball'].includes(sport) && seasonCount >= 20) {
      postProgress('Building season index...');
      seasonIndex = getCachedSeasonIndex(players, sport);
    }

    // Extract team season records (wins/losses)
    postProgress('Processing team season records...');

    // Debug: Log what keys are available in raw
    console.log('[League Normalizer] Available keys in raw:', Object.keys(raw));
    console.log('[League Normalizer] raw.teamSeasons exists?', !!raw.teamSeasons);
    console.log('[League Normalizer] raw.teamStats exists?', !!raw.teamStats);

    let teamSeasons: any[] = [];

    // Try different possible property names
    let rawTeamSeasons = raw.teamSeasons || raw.teamStats;

    if (rawTeamSeasons) {
      console.log('[League Normalizer] Found team data at:', raw.teamSeasons ? 'teamSeasons' : 'teamStats');
      console.log('[League Normalizer] Sample raw record:', rawTeamSeasons[0]);

      teamSeasons = rawTeamSeasons.map((ts: any) => ({
        tid: ts.tid,
        season: ts.season,
        won: ts.won,
        lost: ts.lost,
        tied: ts.tied,
        otl: ts.otl,
        playoffs: ts.playoffs || false,
        gp: ts.gp,
        pts: ts.pts,
        oppPts: ts.oppPts
      }));

      // Find teams that have no data in raw.teamSeasons but have data in teams[].seasons
      // This handles expansion teams that were added after the league started

      // First, identify which tids are completely missing from teamSeasons
      const tidsInTeamSeasons = new Set(teamSeasons.map(ts => ts.tid));
      console.log('[League Normalizer] Checking for missing teams...', {
        totalTeams: raw.teams?.length || 0,
        tidsInTeamSeasons: tidsInTeamSeasons.size,
        uniqueTidsInTeamSeasons: Array.from(tidsInTeamSeasons).sort((a, b) => a - b)
      });

      const teamsWithoutData = raw.teams?.filter((team: any) => {
        const missing = !team.disabled && !tidsInTeamSeasons.has(team.tid) && team.seasons && Array.isArray(team.seasons);
        if (missing) {
          console.log('[League Normalizer] Team missing from teamSeasons:', team.abbrev, 'tid:', team.tid, 'disabled:', team.disabled, 'has seasons:', !!team.seasons);
        }
        return missing;
      }) || [];

      console.log('[League Normalizer] Teams without data count:', teamsWithoutData.length);

      if (teamsWithoutData.length > 0) {
        console.log('[League Normalizer] Found teams missing from raw.teamSeasons:',
          teamsWithoutData.map((t: any) => `${t.abbrev} (tid: ${t.tid})`));

        // Extract their season data from teams[].seasons
        const beforeCount = teamSeasons.length;
        for (const team of teamsWithoutData) {
          console.log('[League Normalizer] Extracting seasons for', team.abbrev, 'seasons count:', team.seasons.length);
          for (const season of team.seasons) {
            teamSeasons.push({
              tid: team.tid,
              season: season.season,
              won: season.won,
              lost: season.lost,
              tied: season.tied,
              otl: season.otl,
              playoffs: season.playoffs || false,
              gp: season.gp,
              pts: season.pts,
              oppPts: season.oppPts
            });
          }
        }
        console.log('[League Normalizer] Added',
          teamSeasons.length - beforeCount,
          'season records from teams[].seasons');
      } else {
        console.log('[League Normalizer] No teams missing from raw.teamSeasons');
      }

      // Note: The worker may have already extracted some data from teams[].seasons
      // and there may be duplicates. The IDB reader handles this correctly by reading
      // all records, so we don't need to deduplicate here.
    } else {
      // Alternative: Extract from teams[].seasons if raw.teamSeasons doesn't exist
      console.log('[League Normalizer] No raw.teamSeasons found, extracting from teams[].seasons');

      if (raw.teams) {
        console.log('[League Normalizer] Number of teams:', raw.teams.length);

        // Log first team structure
        if (raw.teams.length > 0) {
          const firstTeam = raw.teams[0];
          console.log('[League Normalizer] First team keys:', Object.keys(firstTeam));
          console.log('[League Normalizer] First team.seasons exists?', !!firstTeam.seasons);
          console.log('[League Normalizer] First team.seasons type:', Array.isArray(firstTeam.seasons) ? 'array' : typeof firstTeam.seasons);
          if (firstTeam.seasons) {
            console.log('[League Normalizer] First team.seasons length:', firstTeam.seasons.length);
            if (firstTeam.seasons.length > 0) {
              console.log('[League Normalizer] First team.seasons[0]:', firstTeam.seasons[0]);
            }
          }

          // Also check the processed teams array
          console.log('[League Normalizer] Processed teams[0].seasons:', teams[0]?.seasons);
        }

        for (const team of raw.teams) {
          if (team.seasons && Array.isArray(team.seasons)) {
            for (const season of team.seasons) {
              teamSeasons.push({
                tid: team.tid,
                season: season.season,
                won: season.won,
                lost: season.lost,
                tied: season.tied,
                otl: season.otl,
                playoffs: season.playoffs || false,
                gp: season.gp,
                pts: season.pts,
                oppPts: season.oppPts
              });
            }
          }
        }
        console.log('[League Normalizer] Extracted from teams[].seasons:', teamSeasons.length, 'records');
        if (teamSeasons.length > 0) {
          console.log('[League Normalizer] Sample record:', teamSeasons[0]);
        }
      }
    }

    console.log('[League Normalizer] Final teamSeasons count:', teamSeasons.length, 'records');
    if (teamSeasons.length > 0) {
      console.log('[League Normalizer] Sample teamSeason:', teamSeasons[0]);
    } else {
      console.warn('[League Normalizer] No teamSeasons found in raw data');
    }

    // Extract playoff series data
    postProgress('Processing playoff data...');
    console.log('[League Normalizer] Checking for playoff series in raw data...', {
      hasPlayoffSeries: !!raw.playoffSeries,
      typeOfPlayoffSeries: typeof raw.playoffSeries,
      isArray: Array.isArray(raw.playoffSeries),
      keys: raw.playoffSeries ? Object.keys(raw.playoffSeries).slice(0, 5) : null
    });
    let playoffSeries: any[] | undefined = undefined;
    if (raw.playoffSeries) {
      // Handle both array and object formats
      if (Array.isArray(raw.playoffSeries)) {
        console.log('[League Normalizer] Found playoff series data (array format):', raw.playoffSeries.length, 'seasons');
        playoffSeries = raw.playoffSeries.map((ps: any) => ({
          season: ps.season,
          series: ps.series || [],
        }));
      } else if (typeof raw.playoffSeries === 'object') {
        // Convert object keyed by season to array
        console.log('[League Normalizer] Found playoff series data (object format):', Object.keys(raw.playoffSeries).length, 'seasons');
        playoffSeries = Object.keys(raw.playoffSeries).map(season => ({
          season: parseInt(season),
          series: raw.playoffSeries[season].series || raw.playoffSeries[season] || [],
        }));
      }
      if (playoffSeries) {
        console.log('[League Normalizer] Processed playoff series for', playoffSeries.length, 'seasons');
      }
    } else {
      console.log('[League Normalizer] No playoff series data found in raw');
    }

    return { players, teams, sport, teamOverlaps, seasonIndex, leagueYears, teamSeasons, playoffSeries: playoffSeries || undefined };
  
  } catch (error) {
    console.error('Error in normalizeLeague:', error);
    throw error;
  }
}
