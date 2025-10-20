import { openDB, type IDBPDatabase } from 'idb';
import type { LeagueData, Player, Team, TeamOverlapData } from '@/types/bbgm';
import { calculatePlayerAchievements, clearSeasonLengthCache, calculateLeagueLeadership, calculateTeamSeasonsAndAchievementSeasons, setCachedSportDetection } from '@/lib/achievements';
import { getCachedSeasonIndex } from './season-index-cache';
import type { SeasonIndex } from './season-achievements';
import type { Sport } from './league-normalizer';
import { analyzeTeamOverlaps } from './league-normalizer';

const DB_NAME = 'grids-league';
const DB_VERSION = 3;

export interface IDBLeagueMeta {
  sport: Sport;
  playerCount: number;
  teamCount: number;
  version?: any;
  startingSeason?: any;
  gameAttributes?: any;
  meta?: any;
}

/**
 * Open the league database
 */
export async function openLeagueDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION);
}

/**
 * Get metadata from IDB
 */
export async function getLeagueMeta(): Promise<IDBLeagueMeta | null> {
  const db = await openLeagueDB();
  try {
    const meta = await db.get('meta', 'importMeta');
    return meta || null;
  } finally {
    db.close();
  }
}

/**
 * Read all players from IDB in small batches and process them
 */
export async function readAndNormalizePlayers(
  onProgress?: (message: string) => void
): Promise<{ players: Player[]; sport: Sport; gameAttributes: any }> {
  const db = await openLeagueDB();
  
  try {
    onProgress?.('Reading metadata...');
    const meta = await db.get('meta', 'importMeta') as IDBLeagueMeta | undefined;
    
    if (!meta) {
      throw new Error('No league data found in database');
    }
    
    const sport = meta.sport || 'basketball';
    const gameAttributes = meta.gameAttributes || {};
    
    onProgress?.('Reading players from database...');
    
    // Read all players (they're already in memory from IDB, but we process in chunks)
    const tx = db.transaction('players', 'readonly');
    const store = tx.objectStore('players');
    const allPlayers: any[] = await store.getAll();
    await tx.done;
    
    onProgress?.('Normalizing player data...');
    
    // Transform raw players into normalized Player objects
    const players: Player[] = [];
    let currentSeason = gameAttributes?.season || 2023;
    let minSeason = currentSeason;
    let maxSeason = currentSeason;
    
    // Find min/max seasons
    for (const rawPlayer of allPlayers) {
      if (rawPlayer.stats) {
        for (const stat of rawPlayer.stats) {
          if (!stat.playoffs && stat.season) {
            if (stat.season < minSeason) minSeason = stat.season;
            if (stat.season > maxSeason) maxSeason = stat.season;
          }
        }
      }
    }
    
    const leagueYears = { minSeason, maxSeason };
    
    // Process players in chunks
    const CHUNK_SIZE = 500;
    for (let i = 0; i < allPlayers.length; i += CHUNK_SIZE) {
      const chunk = allPlayers.slice(i, i + CHUNK_SIZE);
      
      for (const rawPlayer of chunk) {
        const regularSeasonStats = rawPlayer.stats?.filter((stat: any) => !stat.playoffs) || [];
        const playoffStats = rawPlayer.stats?.filter((stat: any) => stat.playoffs) || [];
        
        const seasons = [
          ...regularSeasonStats.map((stat: any) => ({ 
            season: stat.season, 
            tid: stat.tid, 
            gp: stat.gp || 0, 
            playoffs: false 
          })),
          ...playoffStats.map((stat: any) => ({ 
            season: stat.season, 
            tid: stat.tid, 
            gp: stat.gp || 0, 
            playoffs: true 
          }))
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
            injury: rawPlayer.injury,
            jerseyNumber: rawPlayer.jerseyNumber,
            firstSeason: firstSeason > 0 ? firstSeason : undefined,
            lastSeason: lastSeason > 0 ? lastSeason : undefined,
            debutDecade: firstSeason > 0 ? Math.floor(firstSeason / 10) * 10 : undefined,
            retiredDecade: lastSeason > 0 ? Math.floor(lastSeason / 10) * 10 : undefined,
            decadesPlayed: decadesPlayed.size > 0 ? decadesPlayed : undefined,
          });
        }
      }
      
      // Progress update
      if (i % 2000 === 0 && i > 0) {
        onProgress?.(`Normalized ${i.toLocaleString()} of ${allPlayers.length.toLocaleString()} players...`);
      }
      
      // Yield to prevent UI freeze
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    return { players, sport, gameAttributes };
    
  } finally {
    db.close();
  }
}

/**
 * Read all teams from IDB
 */
export async function readTeams(): Promise<Team[]> {
  const db = await openLeagueDB();
  
  try {
    const tx = db.transaction('teams', 'readonly');
    const store = tx.objectStore('teams');
    const rawTeams = await store.getAll();
    await tx.done;
    
    return rawTeams.map((team: any) => ({
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
    }));
  } finally {
    db.close();
  }
}

/**
 * Process the league data from IDB - calculates achievements and overlaps
 */
export async function processLeagueFromIDB(
  onProgress?: (message: string) => void
): Promise<LeagueData & { sport: Sport }> {
  try {
    onProgress?.('Loading data from database...');
    
    // Read players and teams in parallel
    const [{ players, sport, gameAttributes }, teams] = await Promise.all([
      readAndNormalizePlayers(onProgress),
      readTeams()
    ]);
    
    // Set sport detection cache
    setCachedSportDetection(sport);
    
    // Calculate league years
    let minSeason = 2023, maxSeason = 2023;
    for (const player of players) {
      for (const stat of player.stats || []) {
        if (!stat.playoffs && stat.season) {
          if (stat.season < minSeason) minSeason = stat.season;
          if (stat.season > maxSeason) maxSeason = stat.season;
        }
      }
    }
    const leagueYears = { minSeason, maxSeason };
    
    onProgress?.('Calculating achievements...');
    clearSeasonLengthCache();
    const leadershipMap = calculateLeagueLeadership(players, gameAttributes);
    const playerFeats: any[] = []; // We don't store feats in IDB yet
    
    // Process achievements in chunks to avoid UI freeze
    const CHUNK_SIZE = 500;
    for (let i = 0; i < players.length; i += CHUNK_SIZE) {
      const chunk = players.slice(i, i + CHUNK_SIZE);
      
      for (const player of chunk) {
        player.achievements = calculatePlayerAchievements(player, players, leadershipMap, playerFeats, leagueYears);
        calculateTeamSeasonsAndAchievementSeasons(player, leadershipMap, gameAttributes);
      }
      
      if (i % 2000 === 0 && i > 0) {
        onProgress?.(`Processed achievements for ${i.toLocaleString()} of ${players.length.toLocaleString()} players...`);
      }
      
      // Yield to prevent UI freeze
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    onProgress?.('Analyzing team overlaps...');
    const teamOverlaps = analyzeTeamOverlaps(players, teams);
    
    // Build season index if applicable
    let seasonIndex: SeasonIndex | undefined;
    const uniqueSeasons = new Set(players.flatMap(p => p.stats?.filter(s => !s.playoffs).map(s => s.season) || []));
    const seasonCount = uniqueSeasons.size;
    
    if (['basketball', 'football', 'hockey', 'baseball'].includes(sport) && seasonCount >= 20) {
      onProgress?.('Building season index...');
      seasonIndex = getCachedSeasonIndex(players, sport);
    }
    
    onProgress?.('Complete!');
    
    return { players, teams, sport, teamOverlaps, seasonIndex, leagueYears };
    
  } catch (error) {
    console.error('Error processing league from IDB:', error);
    throw error;
  }
}

/**
 * Check if there's data in IDB
 */
export async function hasLeagueData(): Promise<boolean> {
  try {
    const meta = await getLeagueMeta();
    return meta !== null && (meta.playerCount || 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Clear all league data from IDB
 */
export async function clearLeagueData(): Promise<void> {
  const db = await openLeagueDB();
  try {
    await Promise.all([
      db.clear('players'),
      db.clear('teams'),
      db.clear('meta')
    ]);
  } finally {
    db.close();
  }
}
