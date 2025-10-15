// client/src/lib/stat-ranges.ts

import type { StatKey } from './types';

export const STAT_RANGES: Record<StatKey, { min: number; max: number; typicalStep: number }> = {
  careerPoints: { min: 0, max: 40000, typicalStep: 1000 },
  careerRebounds: { min: 0, max: 20000, typicalStep: 500 },
  careerAssists: { min: 0, max: 15000, typicalStep: 500 },
  careerSteals: { min: 0, max: 3000, typicalStep: 100 },
  careerBlocks: { min: 0, max: 4000, typicalStep: 100 },
  careerGames: { min: 0, max: 1600, typicalStep: 100 },
  careerMinutes: { min: 0, max: 50000, typicalStep: 1000 },

  seasonPoints: { min: 0, max: 3000, typicalStep: 100 },
  seasonRebounds: { min: 0, max: 1500, typicalStep: 50 },
  seasonAssists: { min: 0, max: 1200, typicalStep: 50 },
  seasonSteals: { min: 0, max: 300, typicalStep: 10 },
  seasonBlocks: { min: 0, max: 400, typicalStep: 10 },
  seasonGames: { min: 0, max: 82, typicalStep: 10 },
  seasonMinutes: { min: 0, max: 3500, typicalStep: 100 },
  // Add more stat ranges as needed
};

/**
 * Generates a random stat value within a specified percentile range for a given stat key.
 * Rounds the value to the nearest typical step for cleaner numbers.
 */
export function getRandomStatValue(statKey: StatKey, percentileMin: number, percentileMax: number): number {
  const range = STAT_RANGES[statKey];
  if (!range) {
    console.warn(`No stat range defined for ${statKey}, falling back to default.`);
    return Math.floor(Math.random() * 1000); // Fallback value
  }

  const effectiveMin = range.min + (range.max - range.min) * (percentileMin / 100);
  const effectiveMax = range.min + (range.max - range.min) * (percentileMax / 100);

  let value = Math.random() * (effectiveMax - effectiveMin) + effectiveMin;
  value = Math.round(value / range.typicalStep) * range.typicalStep;
  return Math.max(range.min, Math.min(range.max, value)); // Ensure within absolute min/max
}
