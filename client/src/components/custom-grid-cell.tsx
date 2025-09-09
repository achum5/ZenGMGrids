import { cn } from '@/lib/utils';

interface CustomGridCellProps {
  playerCount: number;
  rowIndex: number;
  colIndex: number;
  className?: string;
}

export function CustomGridCell({
  playerCount,
  rowIndex,
  colIndex,
  className
}: CustomGridCellProps) {
  const isValid = playerCount > 0;
  
  return (
    <div
      className={cn(
        'aspect-square w-full flex flex-col items-center justify-center text-center relative overflow-hidden',
        'border border-border/60 dark:border-slate-600/90',
        isValid 
          ? 'bg-green-600/20 dark:bg-green-600/30 text-green-900 dark:text-green-100' 
          : 'bg-red-600/20 dark:bg-red-600/30 text-red-900 dark:text-red-100',
        className
      )}
      data-testid={`custom-cell-${rowIndex}-${colIndex}`}
    >
      <div className="text-xl md:text-2xl font-bold leading-none">
        {playerCount}
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        eligible player{playerCount !== 1 ? 's' : ''}
      </div>
    </div>
  );
}