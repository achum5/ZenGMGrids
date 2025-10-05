import { cn } from '@/lib/utils';

// Helper to determine rarity tier based on playerCount
const getRarityTier = (count: number) => {
  if (count >= 90) return 'mythic';
  if (count >= 75) return 'legendary';
  if (count >= 60) return 'epic';
  if (count >= 40) return 'rare';
  if (count >= 20) return 'uncommon';
  if (count >= 10) return 'common';
  return 'none'; // For playerCount < 10 or 0
};

// Define color for each rarity tier badge
const rarityBadgeStyles: Record<string, { bgColor: string; textColor: string }> = {
  common: {
    bgColor: '#0078D7',
    textColor: 'white',
  },
  uncommon: {
    bgColor: '#009E6C',
    textColor: 'white',
  },
  rare: {
    bgColor: '#E0A500',
    textColor: 'black',
  },
  epic: {
    bgColor: '#C75000',
    textColor: 'white',
  },
  legendary: {
    bgColor: '#C71A41',
    textColor: 'white',
  },
  mythic: {
    bgColor: '#6C1CB4',
    textColor: 'white',
  },
  none: { // For playerCount < 10 or 0
    bgColor: '#2ECC71', // Default green for valid, or transparent/red for invalid if needed
    textColor: 'white',
  }
};

export function RarityChip({ value }: { value: number }) {
  const rarityTier = getRarityTier(value);
  const styles = rarityBadgeStyles[rarityTier];

  return (
    <div
      className={cn(
        "w-4 h-4 sm:w-5 sm:h-5 rounded-md flex items-center justify-center text-[8px] sm:text-xs font-bold shadow-sm", // General layout classes
        "animate-popIn" // Pop animation
      )}
      style={{
        backgroundColor: styles.bgColor,
        color: styles.textColor,
      }}
      aria-label={`Rarity ${value}`}
      title={`Rarity ${value}`}
    >
      {value} {/* Display the rarity value here */}
    </div>
  );
}
