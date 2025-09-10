import type { CatTeam } from '@/types/bbgm';

/**
 * Centralized function to detect if a header represents an achievement
 * Used for reliable Achievement × Achievement cell detection
 */
export function isAchievementHeader(header: CatTeam): boolean {
  return header.type === 'achievement';
}

/**
 * Detect if a cell is Achievement × Achievement based on both headers
 */
export function isAchievementByAchievementCell(rowHeader: CatTeam, colHeader: CatTeam): boolean {
  return isAchievementHeader(rowHeader) && isAchievementHeader(colHeader);
}

/**
 * Get achievement ID from a header, handling type safety
 */
export function getAchievementId(header: CatTeam): string | null {
  return header.type === 'achievement' ? header.achievementId || null : null;
}