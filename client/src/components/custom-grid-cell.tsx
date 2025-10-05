import { cn } from '@/lib/utils';
import React from 'react';

interface CustomGridCellProps {
  playerCount: number;
  row: number;
  col: number;
  className?: string;
}

export const CustomGridCell = React.memo(function CustomGridCell({ 
  playerCount, 
  row, 
  col, 
  className 
}: CustomGridCellProps) {
  const isValid = playerCount > 0;
  
  return (
    <div
      className={cn(
        "aspect-square flex items-center justify-center border border-border dark:border-slate-600 rounded-lg transition-all duration-200",
        isValid 
          ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700" 
          : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700",
        className
      )}
      data-testid={`custom-cell-${row}-${col}`}
    >
      <div className="text-center">
        <div className="text-lg font-bold">
          {playerCount}
        </div>
        <div className="text-xs opacity-75">
          eligible player{playerCount !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
});

CustomGridCell.displayName = 'CustomGridCell';