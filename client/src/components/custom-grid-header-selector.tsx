import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HeaderConfig, TeamOption, AchievementOption } from '@/lib/custom-grid-utils';

interface CustomGridHeaderSelectorProps {
  config: HeaderConfig;
  teamOptions: TeamOption[];
  achievementOptions: AchievementOption[];
  onConfigChange: (newConfig: HeaderConfig) => void;
  position: string; // for data-testid
  className?: string;
}

export function CustomGridHeaderSelector({
  config,
  teamOptions,
  achievementOptions,
  onConfigChange,
  position,
  className
}: CustomGridHeaderSelectorProps) {
  const [localType, setLocalType] = useState<'team' | 'achievement' | null>(config.type);

  const handleTypeChange = (newType: 'team' | 'achievement') => {
    setLocalType(newType);
    onConfigChange({
      type: newType,
      selectedId: null,
      selectedLabel: null
    });
  };

  const handleSelectionChange = (value: string) => {
    if (!localType) return;

    if (localType === 'team') {
      const team = teamOptions.find(t => t.id.toString() === value);
      if (team) {
        onConfigChange({
          type: 'team',
          selectedId: team.id,
          selectedLabel: team.label
        });
      }
    } else {
      const achievement = achievementOptions.find(a => a.id === value);
      if (achievement) {
        onConfigChange({
          type: 'achievement',
          selectedId: achievement.id,
          selectedLabel: achievement.label
        });
      }
    }
  };

  const handleClear = () => {
    setLocalType(null);
    onConfigChange({
      type: null,
      selectedId: null,
      selectedLabel: null
    });
  };

  return (
    <div 
      className={cn(
        "bg-secondary dark:bg-slate-700 p-2 md:p-3 overflow-hidden flex flex-col items-center justify-center",
        className
      )}
      data-testid={`header-selector-${position}`}
    >
      {/* Type Selection */}
      {!localType && (
        <div className="space-y-2">
          <Button
            onClick={() => handleTypeChange('team')}
            variant="outline"
            className="w-full text-xs dark:bg-slate-600 dark:hover:bg-slate-500"
            data-testid={`button-select-team-${position}`}
          >
            🏟️
          </Button>
          <Button
            onClick={() => handleTypeChange('achievement')}
            variant="outline"
            className="w-full text-xs dark:bg-slate-600 dark:hover:bg-slate-500"
            data-testid={`button-select-achievement-${position}`}
          >
            🏆
          </Button>
        </div>
      )}

      {/* Selection Display & Dropdown */}
      {localType && !config.selectedLabel && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {localType === 'team' ? '🏟️' : '🏆'}
            </span>
            <Button
              onClick={handleClear}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-destructive/20"
              data-testid={`button-clear-type-${position}`}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          <Select onValueChange={handleSelectionChange} data-testid={`select-${localType}-${position}`}>
            <SelectTrigger className="w-full text-xs dark:bg-slate-600">
              <SelectValue placeholder={`Select ${localType === 'team' ? '🏟️' : '🏆'}`} />
            </SelectTrigger>
            <SelectContent className="max-h-60 dark:bg-slate-700">
              {localType === 'team' 
                ? teamOptions.map(team => (
                    <SelectItem 
                      key={team.id} 
                      value={team.id.toString()}
                      className="text-xs dark:hover:bg-slate-600"
                      data-testid={`option-team-${team.id}`}
                    >
                      {team.label}
                    </SelectItem>
                  ))
                : achievementOptions.map(achievement => (
                    <SelectItem 
                      key={achievement.id} 
                      value={achievement.id}
                      className="text-xs dark:hover:bg-slate-600"
                      data-testid={`option-achievement-${achievement.id}`}
                    >
                      {achievement.label}
                    </SelectItem>
                  ))
              }
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Selected Item Display */}
      {config.selectedLabel && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {config.type === 'team' ? '🏟️' : '🏆'}
            </span>
            <Button
              onClick={handleClear}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-destructive/20"
              data-testid={`button-clear-selection-${position}`}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="bg-primary/10 dark:bg-primary/20 rounded p-2 border border-primary/20">
            <span className="text-xs font-medium text-primary dark:text-primary-foreground">
              {config.selectedLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}