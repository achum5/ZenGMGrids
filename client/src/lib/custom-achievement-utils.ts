// client/src/lib/custom-achievement-utils.ts

import type { Player, PlayerStat } from '@/types/bbgm';
import type { CustomAchievementTemplate, StatKey, Achievement } from './types';
import { getRandomStatValue, STAT_RANGES } from './stat-ranges';
import { simpleHash } from './grid-generator'; // Assuming simpleHash is exported from grid-generator.ts

/**
 * Calculates a player's total career stat for a given StatKey.
 */
function getCareerStat(player: Player, statKey: StatKey): number {
  if (!player.stats) return 0;
  const key = statKey.replace('career', '').toLowerCase() as keyof PlayerStat;

  if (key === 'games') return player.stats.length;
  if (key === 'minutes') return player.stats.reduce((sum, s) => sum + (s.min || 0), 0);
  // Add more specific handling for other stats if needed (e.g., percentages)

  return player.stats.reduce((sum, s) => sum + (s[key] || 0), 0);
}

/**
 * Finds a player's best season stat for a given StatKey.
 */
function getSeasonStat(player: Player, statKey: StatKey): number {
  if (!player.stats || player.stats.length === 0) return 0;
  const key = statKey.replace('season', '').toLowerCase() as keyof PlayerStat;

  if (key === 'games') return Math.max(...player.stats.map(s => s.gp || 0));
  if (key === 'minutes') return Math.max(...player.stats.map(s => s.min || 0));
  // Add more specific handling for other stats if needed

  return Math.max(...player.stats.map(s => s[key] || 0));
}

/**
 * Creates the `test` function for a custom achievement based on its template.
 */
export function createCustomAchievementTest(template: CustomAchievementTemplate): (player: Player) => boolean {
  return (player: Player): boolean => {
    const statValue = template.isCareer ? getCareerStat(player, template.statKey) : getSeasonStat(player, template.statKey);

    switch (template.operator) {
      case 'lessThan':
        return statValue < (template.value || 0);
      case 'greaterThan':
        return statValue > (template.value || 0);
      case 'equals':
        return statValue === (template.value || 0);
      case 'between':
        return statValue >= (template.valueMin || 0) && statValue <= (template.valueMax || 0);
      default:
        return false;
    }
  };
}

/**
 * Generates a human-readable label for a custom achievement.
 */
export function generateCustomAchievementLabel(template: CustomAchievementTemplate): string {
  const statName = template.statKey.replace('career', 'Career ').replace('season', 'Season ').replace(/([A-Z])/g, ' $1').trim();

  switch (template.operator) {
    case 'lessThan':
      return `${statName} < ${template.value?.toLocaleString()}`;
    case 'greaterThan':
      return `${statName} > ${template.value?.toLocaleString()}`;
    case 'equals':
      return `${statName} = ${template.value?.toLocaleString()}`;
    case 'between':
      return `${statName} between ${template.valueMin?.toLocaleString()} and ${template.valueMax?.toLocaleString()}`;
    default:
      return `Custom Achievement (${template.statKey})`;
  }
}

/**
 * Randomly generates a custom achievement and performs a basic viability check.
 */
export function generateRandomCustomAchievement(players: Player[], seed: string): Achievement | null {
  const availableStatKeys: StatKey[] = Object.keys(STAT_RANGES) as StatKey[];
  if (availableStatKeys.length === 0) return null;

  let currentSeed = simpleHash(seed); // Use a seed for deterministic randomness

  const pickRandom = <T>(arr: T[]): T => {
    currentSeed = simpleHash(currentSeed.toString()); // Update seed for next pick
    return arr[currentSeed % arr.length];
  };

  const statKey = pickRandom(availableStatKeys);
  const isCareer = statKey.startsWith('career');
  const operators: (typeof CustomAchievementTemplate['operator'])[] = ['lessThan', 'greaterThan']; // Start with simple operators
  const operator = pickRandom(operators);

  // Generate value between 20th and 80th percentile to ensure reasonable difficulty
  const value = getRandomStatValue(statKey, 20, 80);

  const template: CustomAchievementTemplate = {
    id: `custom-${statKey}-${operator}-${value}-${currentSeed}`, // Unique ID for this instance
    statKey,
    operator,
    value,
    isCareer,
    label: '', // Will be generated next
  };
  template.label = generateCustomAchievementLabel(template);

  const testFunction = createCustomAchievementTest(template);

  // Basic viability check: ensure at least 5 players meet this achievement
  const viablePlayersCount = players.filter(testFunction).length;
  if (viablePlayersCount < 5) {
    return null; // Not enough players, so this achievement isn't viable
  }

  return {
    id: template.id,
    label: template.label,
    test: testFunction,
    isSeasonSpecific: !isCareer, // If not career, consider it season-specific for grid logic
    isCustom: true,
    customTemplate: template,
  };
}
