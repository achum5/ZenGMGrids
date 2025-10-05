import { cn } from '@/lib/utils';
import React from 'react';

interface CustomGridCellProps {
  playerCount: number;
  row: number;
  col: number;
  className?: string;
}

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

// Define color and gradient for each rarity tier
const rarityStyles: Record<string, { bgColor: string; gradient: string; textColor: string; borderColor: string }> = {
  common: {
    bgColor: '#3DB2FF',
    gradient: 'linear-gradient(135deg, #69C8FF 0%, #2A8AE0 100%)',
    textColor: 'white',
    borderColor: '#2A8AE0',
  },
  uncommon: {
    bgColor: '#00D68F',
    gradient: 'linear-gradient(135deg, #3EF1B3 0%, #00A070 100%)',
    textColor: 'white',
    borderColor: '#00A070',
  },
  rare: {
    bgColor: '#FFD93D',
    gradient: 'linear-gradient(135deg, #FFE875 0%, #E3B900 100%)',
    textColor: 'white',
    borderColor: '#E3B900',
  },
  epic: {
    bgColor: '#FF7A00',
    gradient: 'linear-gradient(135deg, #FF9C40 0%, #E66000 100%)',
    textColor: 'white',
    borderColor: '#E66000',
  },
  legendary: {
    bgColor: '#FF3D68',
    gradient: 'linear-gradient(135deg, #FF6D8C 0%, #D82A4F 100%)',
    textColor: 'white',
    borderColor: '#D82A4F',
  },
  mythic: {
    bgColor: '#B537F2',
    gradient: 'linear-gradient(135deg, #D178FF 0%, #8B1BD1 100%)',
    textColor: 'white',
    borderColor: '#8B1BD1',
  },
  none: { // For playerCount < 10 or 0
    bgColor: 'transparent',
    gradient: 'none',
    textColor: 'white',
    borderColor: '#ef4444', // Default red for invalid, will be overridden by green if valid
  }
};

export const CustomGridCell = React.memo(function CustomGridCell({
  playerCount,
  row,
  col,
  className
}: CustomGridCellProps) {
  const isValid = playerCount > 0;
  const rarityTier = getRarityTier(playerCount);
  const styles = rarityStyles[rarityTier];

  console.log(`[DEBUG CustomGridCell] Cell (${row},${col}): playerCount=${playerCount}, rarityTier=${rarityTier}, styles=`, styles);

  // Determine border color based on validity, overriding rarityStyles.none.borderColor if valid
  const currentBorderColor = isValid ? '#2ECC71' : styles.borderColor; // Green for valid, rarity-specific or default red for invalid

  return (
    <div
      className={cn(
        "relative aspect-square flex items-center justify-center rounded-lg transition-all duration-200 shadow-md cell-reveal-animation",
        className
      )}
      style={{
        background: styles.gradient !== 'none' ? styles.gradient : styles.bgColor,
        color: styles.textColor,
        borderColor: currentBorderColor,
        borderWidth: '1px',
        borderStyle: 'solid',
      }}
      data-testid={`custom-cell-${row}-${col}`}
    >
      {/* Scoring Badge */}
      {isValid && (
        <div
          className="absolute top-1 right-1 w-4 h-4 sm:w-5 sm:h-5 bg-[#2ECC71] text-white rounded-md flex items-center justify-center text-[8px] sm:text-xs font-bold shadow-sm" // Green background, white text, subtle shadow, rounded-md for square
          style={{ animation: 'popIn 0.3s ease-out forwards' }} // Pop animation
        >
          {/* No number in the badge, just a visual indicator */}
        </div>
      )}

      <div className="text-center">
        <div className="text-lg font-bold">
          {playerCount > 500 ? '500+' : playerCount}
        </div>
        <div className="text-xs opacity-75">
          eligible player{playerCount !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
});

CustomGridCell.displayName = 'CustomGridCell';