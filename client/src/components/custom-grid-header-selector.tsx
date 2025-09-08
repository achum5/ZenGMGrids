import { useState, useEffect } from 'react';
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

  // Sync local state with external config changes (like auto-fill)
  useEffect(() => {
    setLocalType(config.type);
  }, [config.type]);

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
        "flex flex-col items-center justify-center",
        className
      )}
      data-testid={`header-selector-${position}`}
    >
      {/* Type Selection */}
      {!localType && (
        <div className="w-full h-full flex flex-col">
          <button
            onClick={() => handleTypeChange('team')}
            className="flex-1 flex items-center justify-center text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs font-medium text-secondary-foreground dark:text-white hover:bg-secondary/80 dark:hover:bg-slate-600 transition-colors border-b border-border dark:border-slate-600"
            data-testid={`button-select-team-${position}`}
          >
            Team
          </button>
          <button
            onClick={() => handleTypeChange('achievement')}
            className="flex-1 flex items-center justify-center text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs font-medium text-secondary-foreground dark:text-white hover:bg-secondary/80 dark:hover:bg-slate-600 transition-colors"
            data-testid={`button-select-achievement-${position}`}
          >
            Achievement
          </button>
        </div>
      )}

      {/* Selection Display & Dropdown */}
      {localType && !config.selectedLabel && (
        <div className="w-full h-full flex flex-col p-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs font-medium text-muted-foreground">
              {localType === 'team' ? 'Team' : 'Achievement'}
            </span>
            <Button
              onClick={handleClear}
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-destructive/20"
              data-testid={`button-clear-type-${position}`}
            >
              <X className="h-2 w-2" />
            </Button>
          </div>
          
          <Select onValueChange={handleSelectionChange} data-testid={`select-${localType}-${position}`}>
            <SelectTrigger className="w-full text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs dark:bg-slate-600 h-8">
              <SelectValue placeholder={`Select ${localType === 'team' ? 'Team' : 'Achievement'}`} />
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
        <div className="w-full h-full flex flex-col p-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs font-medium text-muted-foreground">
              {config.type === 'team' ? 'Team' : 'Achievement'}
            </span>
            <Button
              onClick={handleClear}
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-destructive/20"
              data-testid={`button-clear-selection-${position}`}
            >
              <X className="h-2 w-2" />
            </Button>
          </div>
          
          <div className="bg-primary/10 dark:bg-primary/20 rounded p-1 border border-primary/20 flex-1 flex items-center justify-center">
            <span className="text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs font-medium text-primary dark:text-primary-foreground text-center leading-tight">
              {config.selectedLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}