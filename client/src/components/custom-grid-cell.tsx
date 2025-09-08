import { cn } from '@/lib/utils';

interface CustomGridCellProps {
  playerCount: number;
  row: number;
  col: number;
  className?: string;
}

export function CustomGridCell({ 
  playerCount, 
  row, 
  col, 
  className 
}: CustomGridCellProps) {
  const isValid = playerCount > 0;
  
  // Dynamic intensity based on player count
  const getIntensityClass = (count: number) => {
    if (count === 0) return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400";
    if (count <= 5) return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
    if (count <= 20) return "bg-green-200 dark:bg-green-800/40 text-green-800 dark:text-green-200";
    if (count <= 50) return "bg-green-300 dark:bg-green-700/50 text-green-900 dark:text-green-100";
    return "bg-green-400 dark:bg-green-600/60 text-green-950 dark:text-green-50";
  };
  
  return (
    <div
      className={cn(
        "aspect-square flex flex-col items-center justify-center p-2 transition-all duration-200",
        "hover:scale-105 hover:shadow-lg hover:border hover:border-primary/50 hover:z-10",
        getIntensityClass(playerCount),
        className
      )}
      data-testid={`custom-cell-${row}-${col}`}
    >
      <div className="text-center">
        <div className="text-lg font-bold leading-none mb-1">
          {playerCount}
        </div>
        <div className="text-[8px] xs:text-[9px] sm:text-[10px] font-medium opacity-90">
          eligible player{playerCount !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}