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
        'transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-blue-400/30',
        'hover:scale-[1.02] hover:z-10',
        isValid 
          ? 'bg-green-600/20 dark:bg-green-600/30 text-green-900 dark:text-green-100 shadow-sm shadow-green-500/10 dark:shadow-green-400/20' 
          : 'bg-red-600/20 dark:bg-red-600/30 text-red-900 dark:text-red-100 shadow-sm shadow-red-500/10 dark:shadow-red-400/20',
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