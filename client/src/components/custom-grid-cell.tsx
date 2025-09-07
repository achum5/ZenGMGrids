import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle } from 'lucide-react';

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
  
  return (
    <Card className={cn(
      "aspect-square transition-all duration-300 hover:shadow-md",
      isValid ? "shadow-green-100 dark:shadow-green-900/20" : "shadow-gray-100 dark:shadow-gray-800/20",
      className
    )}>
      <CardContent className="p-0 h-full flex flex-col items-center justify-center space-y-2">
        <div
          className="text-center space-y-1"
          data-testid={`custom-cell-${row}-${col}`}
        >
          {/* Status Icon */}
          <div className="flex justify-center">
            {isValid ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-gray-400" />
            )}
          </div>
          
          {/* Player Count */}
          <div className={cn(
            "text-2xl font-bold transition-colors duration-200",
            isValid ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"
          )}>
            {playerCount}
          </div>
          
          {/* Pill Badge */}
          <Badge 
            variant={isValid ? "default" : "secondary"}
            className={cn(
              "text-xs px-2 py-1 rounded-full font-medium transition-all duration-200",
              isValid 
                ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700" 
                : "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-600"
            )}
          >
            {isValid ? (
              playerCount === 1 ? "1 player" : `${playerCount} players`
            ) : (
              "No players"
            )}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}