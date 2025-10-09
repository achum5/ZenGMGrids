// src/lib/custom-achievements.ts
import type { Achievement } from './achievements';
import { createCustomNumericalAchievement } from './editable-achievements';

/**
 * A centralized store for managing custom achievements created by the user.
 * This ensures that custom values are available globally and consistently.
 */
const customAchievementStore: Map<string, Achievement> = new Map();

/**
 * Creates and stores a custom achievement, returning the newly created achievement.
 * If a custom achievement for the given base ID already exists, it will be overwritten.
 * 
 * @param baseAchievement - The original achievement to customize.
 * @param newThreshold - The new numerical threshold from user input.
 * @param sport - The sport context ('basketball', 'football', etc.).
 * @param operator - The comparison operator ('≥' or '≤').
 * @returns The created or updated custom achievement.
 */
export function storeCustomAchievement(
  baseAchievement: Achievement,
  newThreshold: number | undefined,
  sport: string,
  operator: '≥' | '≤'
): Achievement {
  const customAch = createCustomNumericalAchievement(baseAchievement, newThreshold, sport, operator);
  
  // Use the base achievement's ID as the key to ensure we can always find it,
  // even if the custom threshold changes.
  customAchievementStore.set(baseAchievement.id, customAch);
  
  return customAch;
}

/**
 * Retrieves a stored custom achievement using the base achievement's ID.
 * 
 * @param baseAchievementId - The ID of the original, non-custom achievement.
 * @returns The stored custom achievement, or undefined if none exists.
 */
export function getCustomAchievement(baseAchievementId: string): Achievement | undefined {
  return customAchievementStore.get(baseAchievementId);
}

/**
 * Clears all custom achievements from the store.
 * This is useful for resetting the grid state.
 */
export function clearCustomAchievements(): void {
  customAchievementStore.clear();
}
