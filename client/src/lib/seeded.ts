/**
 * Seeded random number generation for deterministic hint mode
 * Provides reproducible random behavior across different users for the same grid
 */

/**
 * Simple string hash function for creating seeds
 * Uses djb2 algorithm for consistent, fast hashing
 */
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Mulberry32 PRNG - fast, simple, and good quality
 * Based on 32-bit state for consistent behavior across platforms
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    // Ensure positive 32-bit integer
    this.state = Math.abs(seed) % 0x100000000;
    if (this.state === 0) this.state = 1;
  }

  /**
   * Generate next random number between 0 and 1 (exclusive)
   */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6D2B79F5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  }

  /**
   * Generate random integer between min and max (inclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Shuffle array in-place using Fisher-Yates algorithm
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Pick random element from array
   */
  pick<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[this.nextInt(0, array.length - 1)];
  }

  /**
   * Pick n random elements from array without replacement
   */
  sample<T>(array: T[], n: number): T[] {
    if (n >= array.length) return [...array];
    
    const shuffled = this.shuffle(array);
    return shuffled.slice(0, n);
  }
}

/**
 * Create a deterministic seed for hint generation
 * Format: gridId|cellKey|reshuffleCount
 */
export function createHintSeed(gridId: string, cellKey: string, reshuffleCount: number = 0): number {
  const seedString = `${gridId}|${cellKey}|${reshuffleCount}`;
  return hashString(seedString);
}

/**
 * Create seeded random generator for hint mode
 */
export function createSeededRandom(gridId: string, cellKey: string, reshuffleCount: number = 0): SeededRandom {
  const seed = createHintSeed(gridId, cellKey, reshuffleCount);
  return new SeededRandom(seed);
}