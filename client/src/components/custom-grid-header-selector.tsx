import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HeaderConfig, TeamOption, AchievementOption } from '@/lib/custom-grid-utils';

interface CustomGridHeaderSelectorProps {
  config: HeaderConfig;
  teamOptions: TeamOption[];
  achievementOptions: AchievementOption[];
  onConfigChange: (newConfig: HeaderConfig) => void;
  position: string; // for data-testid
}

export function CustomGridHeaderSelector({
  config,
  teamOptions,
  achievementOptions,
  onConfigChange,
  position
}: CustomGridHeaderSelectorProps) {
  const handleTeamSelect = (value: string) => {
    const team = teamOptions.find(t => t.id.toString() === value);
    if (team) {
      onConfigChange({
        type: 'team',
        selectedId: team.id,
        selectedLabel: team.label
      });
    }
  };

  const handleAchievementSelect = (value: string) => {
    const achievement = achievementOptions.find(a => a.id === value);
    if (achievement) {
      onConfigChange({
        type: 'achievement',
        selectedId: achievement.id,
        selectedLabel: achievement.label
      });
    }
  };

  const handleClear = () => {
    onConfigChange({
      type: null,
      selectedId: null,
      selectedLabel: null
    });
  };

  // If something is selected, show it with clear button
  if (config.selectedLabel) {
    return (
      <div 
        className="aspect-square bg-secondary dark:bg-slate-700 p-2 md:p-3 overflow-hidden border border-border/60 dark:border-slate-600/90 relative"
        data-testid={`header-selector-${position}`}
      >
        <Button
          onClick={handleClear}
          variant="ghost"
          size="sm"
          className="absolute top-1 right-1 h-5 w-5 p-0 hover:bg-destructive/20 z-10"
          data-testid={`button-clear-selection-${position}`}
        >
          <X className="h-3 w-3" />
        </Button>
        
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="text-xs font-medium text-muted-foreground mb-1">
              {config.type === 'team' ? 'Team' : 'Achievement'}
            </div>
            <div className="text-xs font-medium text-foreground leading-tight">
              {config.selectedLabel}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default split view
  return (
    <div 
      className="aspect-square bg-secondary dark:bg-slate-700 overflow-hidden border border-border/60 dark:border-slate-600/90 relative"
      data-testid={`header-selector-${position}`}
    >
      {/* Team Section (Top Half) */}
      <div className="relative h-1/2 border-b border-border/60 dark:border-slate-600/90">
        <Select onValueChange={handleTeamSelect}>
          <SelectTrigger className="w-full h-full text-xs font-medium border-none bg-transparent rounded-none hover:bg-accent/30 dark:hover:bg-accent/20 data-[state=open]:bg-accent/30 dark:data-[state=open]:bg-accent/20">
            <SelectValue placeholder="Team" className="text-xs" />
          </SelectTrigger>
          <SelectContent 
            className="w-64 max-h-60 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 shadow-xl"
            data-testid={`dropdown-teams-${position}`}
          >
            {teamOptions.map(team => (
              <SelectItem 
                key={team.id} 
                value={team.id.toString()}
                className="text-sm hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer px-3 py-2"
                data-testid={`option-team-${team.id}`}
              >
                {team.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Achievement Section (Bottom Half) */}
      <div className="relative h-1/2">
        <Select onValueChange={handleAchievementSelect}>
          <SelectTrigger className="w-full h-full text-xs font-medium border-none bg-transparent rounded-none hover:bg-accent/30 dark:hover:bg-accent/20 data-[state=open]:bg-accent/30 dark:data-[state=open]:bg-accent/20">
            <SelectValue placeholder="Achievement" className="text-xs" />
          </SelectTrigger>
          <SelectContent 
            className="w-64 max-h-60 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 shadow-xl"
            data-testid={`dropdown-achievements-${position}`}
          >
            {achievementOptions.map(achievement => (
              <SelectItem 
                key={achievement.id} 
                value={achievement.id}
                className="text-sm hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer px-3 py-2"
                data-testid={`option-achievement-${achievement.id}`}
              >
                {achievement.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}