import pako from 'pako';
import type { LeagueData, Player, Team, SeasonLine, TeamOverlapData } from '@/types/bbgm';
import { calculatePlayerAchievements, clearSeasonLengthCache, calculateLeagueLeadership, calculateTeamSeasonsAndAchievementSeasons, setCachedSportDetection } from '@/lib/achievements';
import { buildSeasonIndex, type SeasonIndex } from './season-achievements';

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
  try {
    let content: string;
    
    if (file.name.endsWith('.gz')) {
      // Handle .gz files
      const arrayBuffer = await file.arrayBuffer();
      const compressed = new Uint8Array(arrayBuffer);
      try {
        const decompressed = pako.inflate(compressed, { to: 'string' });
        content = decompressed;
      } catch (inflateError) {
        console.error('Pako inflation error:', inflateError);
        // Try without string conversion
        const decompressedBytes = pako.inflate(compressed);
        content = new TextDecoder('utf-8').decode(decompressedBytes);
      }
    } else {
      // Handle .json files
      content = await file.text();
    }
    
    const rawData = JSON.parse(content);
    return normalizeLeague(rawData);
  } catch (error) {
    console.error('Error parsing league file:', error);
    throw new Error('Failed to parse league file. Please ensure it\'s a valid BBGM league file.');
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

function normalizeLeague(raw: any): LeagueData & { sport: Sport } {
  try {
    // Detect sport type
    const sport = detectSport(raw);
    console.log('Detected sport:', sport);
    console.log('Raw league data keys:', Object.keys(raw));
    
    // Cache the sport detection for use in achievements
    setCachedSportDetection(sport);
  
  // Find current season for filtering active teams
  const currentSeason = raw.gameAttributes?.season || Math.max(...(raw.players?.flatMap((p: any) => 
    p.stats?.map((s: any) => s.season) || []
  ) || [2023]));
  
  console.log(`Current season: ${currentSeason}, Active teams: ${raw.teams?.filter((t: any) => !t.disabled).length || 0}`);
  
  // Extract ALL teams (active and inactive) - we need historical data for player lookups
  const teams: Team[] = raw.teams?.map((team: any) => {
    // Log the first team's structure to debug
    if (team.tid === 0 && team.seasons) {
      console.log('Sample team with seasons:', team.tid, team.seasons?.slice(0, 3));
    }
    
    const teamColors = team.colors || [];
    
    return {
      tid: team.tid,
      abbrev: team.abbrev || team.region || 'UNK',
      name: team.name || 'Unknown',
      region: team.region,
      colors: teamColors, // Team colors (hex codes)
      jersey: team.jersey || 'modern', // Jersey style
      imgURL: team.imgURL || null, // Team logo URL
      imgURLSmall: team.imgURLSmall || team.smallImgURL || null, // Small team logo URL
      seasons: team.seasons || [], // Include historical seasons data
      disabled: team.disabled || false, // Track if team is currently active
    };
  }) || [];

  // Extract and normalize players
  const players: Player[] = [];
  
  if (raw.players) {
    for (const rawPlayer of raw.players) {
      // Get both regular season and playoff stats
      const regularSeasonStats = rawPlayer.stats?.filter((stat: any) => !stat.playoffs) || [];
      const playoffStats = rawPlayer.stats?.filter((stat: any) => stat.playoffs) || [];
      
      const seasons: SeasonLine[] = [
        ...regularSeasonStats.map((stat: any) => ({
          season: stat.season,
          tid: stat.tid,
          gp: stat.gp || 0,
          playoffs: false,
        })),
        ...playoffStats.map((stat: any) => ({
          season: stat.season,
          tid: stat.tid,
          gp: stat.gp || 0,
          playoffs: true,
        }))
      ];

      // Calculate teams played (TIDs where GP > 0 in either RS or playoffs)
      const teamsPlayed = new Set<number>();
      
      // Add teams from regular season
      regularSeasonStats.forEach((stat: any) => {
        if (stat.gp > 0) {
          teamsPlayed.add(stat.tid);
        }
      });
      
      // Add teams from playoffs
      playoffStats.forEach((stat: any) => {
        if (stat.gp > 0) {
          teamsPlayed.add(stat.tid);
        }
      });

      // Only include players who actually played games
      if (teamsPlayed.size > 0) {
        const player: Player = {
          pid: rawPlayer.pid,
          name: `${rawPlayer.firstName || ''} ${rawPlayer.lastName || ''}`.trim() || 'Unknown Player',
          seasons,
          teamsPlayed,
          imgURL: rawPlayer.imgURL || null,
          face: rawPlayer.face || null,
          // Additional rich BBGM data
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
        };

        // Note: achievements will be calculated after all players are processed
        
        players.push(player);
      }
    }
  }

  // Calculate achievements for all players (requires full player list for season-based achievements)
  console.log('Starting achievement calculations...');
  
  // Clear any cached season lengths for new league data
  clearSeasonLengthCache();
  
  const startTime = performance.now();
  
  // First, calculate league leadership across all seasons
  console.log('Calculating league leadership...');
  const leadershipMap = calculateLeagueLeadership(players, raw.gameAttributes);
  
  // Extract playerFeats for triple-double detection
  const playerFeats = raw.playerFeats || [];
  console.log(`Found ${playerFeats.length} player feats records`);
  
  // Debug removed - triple-double detection working correctly
  
  players.forEach((player, index) => {
    if (index % 500 === 0) {
      console.log(`Processing player ${index + 1}/${players.length}...`);
    }
    try {
      player.achievements = calculatePlayerAchievements(player, players, leadershipMap, playerFeats);
      // Calculate season-specific data for same-season alignment
      calculateTeamSeasonsAndAchievementSeasons(player, leadershipMap, raw.gameAttributes);
    } catch (error) {
      console.error(`Error calculating achievements for player ${player.name}:`, error);
      // Set default achievements on error
      player.achievements = {
        career20kPoints: false,
        career10kRebounds: false,
        career5kAssists: false,
        career2kSteals: false,
        career1500Blocks: false,
        career2kThrees: false,
        season30ppg: false,
        season10apg: false,
        season15rpg: false,
        season3bpg: false,
        season25spg: false,
        season504090: false,
        ledScoringAny: false,
        ledRebAny: false,
        ledAstAny: false,
        ledStlAny: false,
        ledBlkAny: false,
        // Career length & draft achievements
        played15PlusSeasons: false,
        isPick1Overall: false,
        isFirstRoundPick: false,
        isSecondRoundPick: false,
        isUndrafted: false,
        draftedTeen: false,
        bornOutsideUS50DC: false,
        // Special categories achievements
        allStar35Plus: false,
        oneTeamOnly: false,
        isHallOfFamer: false
      };
    }
  });
  
  const endTime = performance.now();
  console.log(`Achievement calculations completed in ${(endTime - startTime).toFixed(2)}ms`);

  // Log achievement statistics
  const achievementCounts = {
    // Career achievements
    career20kPoints: 0,
    career10kRebounds: 0,
    career5kAssists: 0,
    career2kSteals: 0,
    career1500Blocks: 0,
    career2kThrees: 0,
    // Single-season achievements
    season30ppg: 0,
    season10apg: 0,
    season15rpg: 0,
    season3bpg: 0,
    season25spg: 0,
    season504090: 0,
    // League leadership achievements
    ledScoringAny: 0,
    ledRebAny: 0,
    ledAstAny: 0,
    ledStlAny: 0,
    ledBlkAny: 0,
    // Game performance feats
    // Career length & draft achievements
    played15PlusSeasons: 0,
    isPick1Overall: 0,
    isFirstRoundPick: 0,
    isSecondRoundPick: 0,
    isUndrafted: 0,
    draftedTeen: 0,
    bornOutsideUS50DC: 0,
    // Special categories achievements
    allStar35Plus: 0,
    oneTeamOnly: 0,
    isHallOfFamer: 0
  };

  players.forEach(player => {
    if (player.achievements) {
      // Career achievements
      if (player.achievements.career20kPoints) achievementCounts.career20kPoints++;
      if (player.achievements.career10kRebounds) achievementCounts.career10kRebounds++;
      if (player.achievements.career5kAssists) achievementCounts.career5kAssists++;
      if (player.achievements.career2kSteals) achievementCounts.career2kSteals++;
      if (player.achievements.career1500Blocks) achievementCounts.career1500Blocks++;
      if (player.achievements.career2kThrees) achievementCounts.career2kThrees++;
      // Single-season achievements
      if (player.achievements.season30ppg) achievementCounts.season30ppg++;
      if (player.achievements.season10apg) achievementCounts.season10apg++;
      if (player.achievements.season15rpg) achievementCounts.season15rpg++;
      if (player.achievements.season3bpg) achievementCounts.season3bpg++;
      if (player.achievements.season25spg) achievementCounts.season25spg++;
      if (player.achievements.season504090) achievementCounts.season504090++;
      // League leadership achievements
      if (player.achievements.ledScoringAny) achievementCounts.ledScoringAny++;
      if (player.achievements.ledRebAny) achievementCounts.ledRebAny++;
      if (player.achievements.ledAstAny) achievementCounts.ledAstAny++;
      if (player.achievements.ledStlAny) achievementCounts.ledStlAny++;
      if (player.achievements.ledBlkAny) achievementCounts.ledBlkAny++;
      // Game performance feats
      // Career length & draft achievements
      if (player.achievements.played15PlusSeasons) achievementCounts.played15PlusSeasons++;
      if (player.achievements.isPick1Overall) achievementCounts.isPick1Overall++;
      if (player.achievements.isFirstRoundPick) achievementCounts.isFirstRoundPick++;
      if (player.achievements.isSecondRoundPick) achievementCounts.isSecondRoundPick++;
      if (player.achievements.isUndrafted) achievementCounts.isUndrafted++;
      if (player.achievements.draftedTeen) achievementCounts.draftedTeen++;
      if (player.achievements.bornOutsideUS50DC) achievementCounts.bornOutsideUS50DC++;
      // Special categories achievements
      if (player.achievements.allStar35Plus) achievementCounts.allStar35Plus++;
      if (player.achievements.oneTeamOnly) achievementCounts.oneTeamOnly++;
      if (player.achievements.isHallOfFamer) achievementCounts.isHallOfFamer++;
    }
  });

  console.log(`Parsed ${players.length} players and ${teams.length} teams`);
  console.log('Achievement qualifiers:', achievementCounts);
  
  // Analyze team overlaps for intelligent grid generation
  const teamOverlaps = analyzeTeamOverlaps(players, teams);
  console.log(`📊 Team overlap analysis: ${teamOverlaps.viableTeamPairs.length} viable team pairs found`);
  
  // Debug: show most connected teams and top viable pairs
  if (teamOverlaps.mostConnectedTeams.length > 0) {
    const topConnectedTeamsInfo = teamOverlaps.mostConnectedTeams.slice(0, 5).map(tid => {
      const team = teams.find(t => t.tid === tid);
      return team ? `${team.region} ${team.name}` : `Team ${tid}`;
    });
    console.log(`🏆 Most connected teams: ${topConnectedTeamsInfo.join(', ')}`);
    
    const topPairs = teamOverlaps.viableTeamPairs.slice(0, 3).map(pair => {
      const teamA = teams.find(t => t.tid === pair.teamA);
      const teamB = teams.find(t => t.tid === pair.teamB);
      const nameA = teamA ? `${teamA.region} ${teamA.name}` : `Team ${pair.teamA}`;
      const nameB = teamB ? `${teamB.region} ${teamB.name}` : `Team ${pair.teamB}`;
      return `${nameA} ↔ ${nameB} (${pair.playerCount} shared)`;
    });
    console.log(`⚡ Top viable pairs: ${topPairs.join(', ')}`);
    
    // Debug: show team coverage for key achievements  
    const keyAchievements = ['isHallOfFamer', 'career100Sacks', 'wonMVP', 'isPick1Overall'];
    keyAchievements.forEach(achievementId => {
      const teamCount = teamOverlaps.achievementTeamCounts[achievementId] || 0;
      if (teamCount > 0) {
        console.log(`🎯 ${achievementId}: covers ${teamCount} teams`);
      }
    });
  }
  
  // Debug: Report top career stat performers for FBGM validation
  if (sport === 'football' && (window as any)._debugStats) {
    const debugStats = (window as any)._debugStats;
    
    console.log('=== TOP CAREER PERFORMERS (FBGM Debug) ===');
    
    if (debugStats.passTDs?.length > 0) {
      const top5PassTDs = debugStats.passTDs.sort((a: any, b: any) => b.total - a.total).slice(0, 5);
      console.log('Top-5 Career Passing TDs:', top5PassTDs);
    }
    
    if (debugStats.rushYds?.length > 0) {
      const top5RushYds = debugStats.rushYds.sort((a: any, b: any) => b.total - a.total).slice(0, 5);
      console.log('Top-5 Career Rushing Yards:', top5RushYds);
    }
    
    if (debugStats.recYds?.length > 0) {
      const top5RecYds = debugStats.recYds.sort((a: any, b: any) => b.total - a.total).slice(0, 5);
      console.log('Top-5 Career Receiving Yards:', top5RecYds);
    }
    
    if (debugStats.sacks?.length > 0) {
      const top5Sacks = debugStats.sacks.sort((a: any, b: any) => b.total - a.total).slice(0, 5);
      console.log('Top-5 Career Sacks:', top5Sacks);
    }
    
    // Clear debug stats
    delete (window as any)._debugStats;
  }
  
  // Build season index for basketball and football (when league has 50+ seasons)
  let seasonIndex: SeasonIndex | undefined;
  
  // Check if league has enough seasons for season achievement grids
  const uniqueSeasons = new Set(
    players.flatMap(p => p.stats?.filter(s => !s.playoffs).map(s => s.season) || [])
  );
  const seasonCount = uniqueSeasons.size;
  
  if (sport === 'basketball') {
    console.log('🏀 Building season-specific achievement index for basketball...');
    seasonIndex = buildSeasonIndex(players, sport);
  } else if (sport === 'football' && seasonCount >= 20) {
    console.log(`🏈 Building season-specific achievement index for football (${seasonCount} seasons ≥ 20)...`);
    seasonIndex = buildSeasonIndex(players, sport);
  } else if (sport === 'football') {
    console.log(`🏈 Skipping season achievements for football (${seasonCount} seasons < 20)`);
  } else if (sport === 'hockey' && seasonCount >= 20) {
    console.log(`🏒 Building season-specific achievement index for hockey (${seasonCount} seasons ≥ 20)...`);
    seasonIndex = buildSeasonIndex(players, sport);
  } else if (sport === 'hockey') {
    console.log(`🏒 Skipping season achievements for hockey (${seasonCount} seasons < 20)`);
  } else if (sport === 'baseball' && seasonCount >= 20) {
    console.log(`⚾ Building season-specific achievement index for baseball (${seasonCount} seasons ≥ 20)...`);
    seasonIndex = buildSeasonIndex(players, sport);
  } else if (sport === 'baseball') {
    console.log(`⚾ Skipping season achievements for baseball (${seasonCount} seasons < 20)`);
  }
  
  return { players, teams, sport, teamOverlaps, seasonIndex };
  
  } catch (error) {
    console.error('Error in normalizeLeague:', error);
    throw error;
  }
}

// Diacritic-insensitive text folding
const fold = (s: string): string => {
  // Use fallback approach for better compatibility
  return s.normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
    .replace(/'/g, '') // Remove apostrophes for search matching
    .replace(/[-]/g, ' '); // Convert hyphens to spaces for flexible search
};

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

  // Calculate current season once for all players
  const allSeasons = players
    .filter(p => p.stats)
    .flatMap(p => p.stats!.filter(s => !s.playoffs).map(s => s.season));
  const currentSeason = allSeasons.length > 0 ? Math.max(...allSeasons) : new Date().getFullYear();

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
    'isHallOfFamer', 'played15PlusSeasons', 'played10PlusSeasons', 'bornOutsideUS50DC',
    'career300PassTDs', 'season35PassTDs', 'career12kRushYds', 'career100RushTDs', 
    'season1800RushYds', 'season20RushTDs', 'career12kRecYds', 'career100RecTDs',
    'season1400RecYds', 'season15RecTDs', 'career100Sacks', 'career20Ints',
    'season15Sacks', 'season8Ints', 'wonMVP', 'wonOPOY', 'wonDPOY', 'wonROY',
    'career20kPoints', 'career10kRebounds', 'hasMVP', 'hasAllStar'
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
