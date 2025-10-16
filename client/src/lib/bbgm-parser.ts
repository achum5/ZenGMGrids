import pako from 'pako';
import type { LeagueData, Player, Team, SeasonLine, TeamOverlapData } from '@/types/bbgm';
import { calculatePlayerAchievements, clearSeasonLengthCache, calculateLeagueLeadership, calculateTeamSeasonsAndAchievementSeasons, setCachedSportDetection } from '@/lib/achievements';
import { type SeasonIndex } from './season-achievements';
import { getCachedSeasonIndex } from './season-index-cache';

export type Sport = 'basketball' | 'football' | 'hockey' | 'baseball';

// Sport detection based on league data characteristics
function detectSport(raw: any): Sport {
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

export async function parseLeagueFile(file: File): Promise<LeagueData & { sport: Sport }> {
  console.log(`🔧 [FILE UPLOAD] Starting upload for file: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB, type: ${file.type})`);
  
  try {
    let content: string;
    
    if (file.name.endsWith('.gz')) {
      console.log(`🔧 [FILE UPLOAD] Processing .gz file`);
      // Handle .gz files
      const arrayBuffer = await file.arrayBuffer();
      const compressed = new Uint8Array(arrayBuffer);
      
      console.log(`🔧 [FILE UPLOAD] Compressed data length: ${compressed.length}`);
      if (compressed.length > 0) {
        // Log first 16 bytes in hex for inspection
        const hexSnippet = Array.from(compressed.slice(0, Math.min(compressed.length, 16)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join(' ');
        console.log(`🔧 [FILE UPLOAD] Compressed data snippet (first 16 bytes): ${hexSnippet}`);
      } else {
        console.log(`🔧 [FILE UPLOAD] Compressed data is empty.`);
      }

      try {
        const decompressed = pako.inflate(compressed, { to: 'string' });
        content = decompressed;
        console.log(`🔧 [FILE UPLOAD] Successfully decompressed .gz file (${content.length} chars)`);
      } catch (inflateError1) {
        console.error('Pako inflation error (attempt 1):', inflateError1);
        console.log(`🔧 [FILE UPLOAD] Trying decompression with fallback method...`);
        try {
          const decompressedBytes = pako.inflate(compressed);
          try {
            content = new TextDecoder('utf-8').decode(decompressedBytes);
            console.log(`🔧 [FILE UPLOAD] Decompressed with fallback method (${content.length} chars)`);
          } catch (decodeError) {
            console.error('TextDecoder error after fallback decompression:', decodeError);
            throw new Error('Failed to decode decompressed data. The file might be corrupted or use an unsupported encoding.');
          }
        } catch (inflateError2) {
          console.error('Pako inflation error (attempt 2, fallback):', inflateError2);
          throw new Error('Failed to decompress .gz file. It might be corrupted or not a valid gzip archive.');
        }
      }
    } else {
      console.log(`🔧 [FILE UPLOAD] Processing .json file`);
      // Handle .json files
      content = await file.text();
      console.log(`🔧 [FILE UPLOAD] Read JSON file (${content.length} chars)`);
    }
    
    if (!content || content.length === 0) {
      throw new Error('Decompressed file content is empty. The .gz file might be corrupted or empty.');
    }
    
    console.log(`🔧 [FILE UPLOAD] Parsing JSON...`);
    const rawData = JSON.parse(content);
    console.log(`🔧 [FILE UPLOAD] JSON parsed successfully, calling normalizeLeague...`);
    
    const result = normalizeLeague(rawData);
    console.log(`🔧 [FILE UPLOAD] File processed successfully as ${result.sport}`);
    return result;
  } catch (error) {
    console.error('🔧 [FILE UPLOAD] Error parsing league file:', error);
    console.error('🔧 [FILE UPLOAD] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw new Error(`Failed to parse league file: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure it's a valid BBGM league file.`);
  }
}

function normalizeDownloadUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    
    // Handle Dropbox URLs - convert share links to direct download
    if (parsedUrl.hostname.includes('dropbox.com')) {
      // Handle modern Dropbox sharing URLs (www.dropbox.com/scl/fi/...)
      if (parsedUrl.hostname === 'www.dropbox.com' && parsedUrl.pathname.startsWith('/scl/fi/')) {
        // Convert to direct download format: dl.dropboxusercontent.com
        const newUrl = new URL(url);
        newUrl.hostname = 'dl.dropboxusercontent.com';
        newUrl.searchParams.set('dl', '1');
        const convertedUrl = newUrl.toString();
        console.log(`🔄 Dropbox URL converted: ${url} → ${convertedUrl}`);
        return convertedUrl;
      }
      
      // Handle legacy Dropbox URLs
      if (url.includes('?') && !url.includes('dl=1')) {
        // Replace dl=0 with dl=1, or add dl=1 if not present
        const newUrl = new URL(url);
        newUrl.searchParams.set('dl', '1');
        const convertedUrl = newUrl.toString();
        console.log(`🔄 Legacy Dropbox URL converted: ${url} → ${convertedUrl}`);
        return convertedUrl;
      }
    }
    
    // Handle Google Drive URLs
    if (parsedUrl.hostname.includes('drive.google.com')) {
      const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
      if (fileIdMatch) {
        return `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
      }
    }
    
    return url;
  } catch {
    // If URL parsing fails, return original
    return url;
  }
}

export async function parseLeagueUrl(url: string): Promise<LeagueData> {
  try {
    // Normalize the URL for direct download
    const downloadUrl = normalizeDownloadUrl(url);
    
    // Try multiple fetch strategies
    const fetchOptions = [
      { mode: 'cors' as RequestMode },
      { mode: 'no-cors' as RequestMode },
      { mode: 'cors' as RequestMode, cache: 'no-cache' as RequestCache }
    ];
    
    let lastError: Error | null = null;
    
    for (const options of fetchOptions) {
      try {
        const response = await fetch(downloadUrl, options);
        
        // For no-cors mode, we can't check response.ok
        if (options.mode !== 'no-cors' && !response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        // Skip empty responses
        if (arrayBuffer.byteLength === 0) {
          throw new Error('Empty response from server');
        }
        
        let content: string;
        
        // Check if it's a compressed file by URL or content inspection
        const isCompressed = downloadUrl.includes('.gz') || downloadUrl.includes('.json.gz');
        
        if (isCompressed) {
          try {
            // Try to decompress as gzip
            const compressed = new Uint8Array(arrayBuffer);
            const decompressed = pako.inflate(compressed, { to: 'string' });
            content = decompressed;
          } catch (decompressError) {
            // If decompression fails, try as plain text
            content = new TextDecoder().decode(arrayBuffer);
          }
        } else {
          // Handle as plain JSON
          content = new TextDecoder().decode(arrayBuffer);
        }
        
        // Validate that we have JSON content
        if (!content.trim().startsWith('{') && !content.trim().startsWith('[')) {
          throw new Error('Response does not appear to be JSON data');
        }
        
        const rawData = JSON.parse(content);
        
        // Basic validation that it's a BBGM file
        if (!rawData.players && !rawData.teams) {
          throw new Error('File does not appear to be a valid BBGM league file');
        }
        
        return normalizeLeague(rawData);
        
      } catch (error) {
        console.warn(`Fetch strategy ${JSON.stringify(options)} failed:`, error);
        lastError = error as Error;
        continue; // Try next fetch strategy
      }
    }
    
    // If all strategies failed, throw the last error
    throw lastError || new Error('All fetch strategies failed');
    
  } catch (error) {
    console.error('Error loading league from URL:', error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Failed to load URL due to network or CORS issues. Try downloading the file and uploading it directly.');
    }
    
    if (error instanceof SyntaxError) {
      throw new Error('The downloaded file is not valid JSON. Please check the URL points to a BBGM league file.');
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to load league data: ${errorMessage}`);
  }
}



export function buildSearchIndex(players: Player[], teams: Team[]) {
  const byName: Record<string, number> = {};
  const byPid: Record<number, Player> = {};
  const teamsByTid: Record<number, Team> = {};
  
  // Build team lookup
  teams.forEach(team => {
    teamsByTid[team.tid] = team;
  });
  
  // Build player indices
  players.forEach(player => {
    byPid[player.pid] = player;
    byName[player.name.toLowerCase()] = player.pid;
  });

  // Calculate current season once for all players - avoid stack overflow
  let currentSeason = new Date().getFullYear();
  for (const player of players) {
    if (player.stats) {
      for (const stat of player.stats) {
        if (!stat.playoffs && stat.season > currentSeason) {
          currentSeason = stat.season;
        }
      }
    }
  }

  // Build searchable player list with diacritic-insensitive folding
  const searchablePlayers = players.map(player => {
    const nameParts = player.name.split(' ');
    const teamAbbrevs = Array.from(player.teamsPlayed)
      .map(tid => teamsByTid[tid]?.abbrev)
      .filter(Boolean);
    
    // Pre-calculate career years
    const careerYears = getCareerYears(player, currentSeason);
    
    return {
      pid: player.pid,
      name: player.name,
      nameLower: player.name.toLowerCase(),
      nameFolded: fold(player.name),
      firstLower: nameParts[0]?.toLowerCase() || '',
      firstFolded: fold(nameParts[0] || ''),
      lastLower: nameParts[nameParts.length - 1]?.toLowerCase() || '',
      lastFolded: fold(nameParts[nameParts.length - 1] || ''),
      teamAbbrevs,
      careerYears,
    };
  });

  return { byName, byPid, searchablePlayers, teamsByTid };
}

// Helper function to calculate career years
function getCareerYears(player: Player, currentSeason: number): string {
  if (!player.stats || player.stats.length === 0) {
    return '';
  }
  
  // Get all regular season years (exclude playoffs)
  const seasons = player.stats
    .filter(stat => !stat.playoffs)
    .map(stat => stat.season)
    .sort((a, b) => a - b);
  
  if (seasons.length === 0) {
    return '';
  }
  
  const firstSeason = seasons[0];
  const lastSeason = seasons[seasons.length - 1];
  
  // Player is active if their last season is the current season
  const isActive = lastSeason === currentSeason;
  
  if (firstSeason === lastSeason) {
    return `${firstSeason}`;
  }
  
  return `${firstSeason}-${isActive ? 'Present' : lastSeason}`;
}


// Analyze which team combinations have shared players and team-achievement viability
function analyzeTeamOverlaps(players: Player[], teams: Team[]): TeamOverlapData {
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
