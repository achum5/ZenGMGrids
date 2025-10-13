import { inflate } from 'pako';
import type { LeagueData, Player, Team, SeasonLine, TeamOverlapData } from '@/types/bbgm';
import { calculatePlayerAchievements, clearSeasonLengthCache, calculateLeagueLeadership, calculateTeamSeasonsAndAchievementSeasons, setCachedSportDetection } from '@/lib/achievements';
import { type SeasonIndex } from '../lib/season-achievements';
import { getCachedSeasonIndex } from '../lib/season-index-cache';

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

self.onmessage = async (event: MessageEvent) => {
  const { fileBuffer } = event.data;

  try {
    const decompressed = inflate(fileBuffer);
    const leagueData = await streamParseLeagueData(decompressed.buffer);
    self.postMessage({ success: true, leagueData });
  } catch (error: any) {
    self.postMessage({ success: false, error: error.message });
  }
};
