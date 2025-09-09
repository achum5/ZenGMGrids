import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [showAchievementDropdown, setShowAchievementDropdown] = useState(false);

  const handleTeamSelect = (value: string) => {
    const team = teamOptions.find(t => t.id.toString() === value);
    if (team) {
      onConfigChange({
        type: 'team',
        selectedId: team.id,
        selectedLabel: team.label
      });
    }
    setShowTeamDropdown(false);
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
    setShowAchievementDropdown(false);
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
        <Button
          onClick={() => setShowTeamDropdown(!showTeamDropdown)}
          variant="ghost"
          className="w-full h-full text-xs font-medium text-secondary-foreground dark:text-white hover:bg-accent/30 dark:hover:bg-accent/20 rounded-none"
          data-testid={`button-select-team-${position}`}
        >
          Team
        </Button>
        
        {showTeamDropdown && (
          <div className="absolute top-full left-0 z-50 w-64 max-h-60 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-md shadow-xl overflow-hidden">
            <div className="max-h-60 overflow-y-auto">
              {teamOptions.map(team => (
                <button
                  key={team.id}
                  onClick={() => handleTeamSelect(team.id.toString())}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-slate-700 border-b border-gray-100 dark:border-slate-700 last:border-b-0 transition-colors"
                  data-testid={`option-team-${team.id}`}
                >
                  {team.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Achievement Section (Bottom Half) */}
      <div className="relative h-1/2">
        <Button
          onClick={() => setShowAchievementDropdown(!showAchievementDropdown)}
          variant="ghost"
          className="w-full h-full text-xs font-medium text-secondary-foreground dark:text-white hover:bg-accent/30 dark:hover:bg-accent/20 rounded-none"
          data-testid={`button-select-achievement-${position}`}
        >
          Achievement
        </Button>
        
        {showAchievementDropdown && (
          <div className="absolute bottom-full left-0 z-50 w-64 max-h-60 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-md shadow-xl overflow-hidden">
            <div className="max-h-60 overflow-y-auto">
              {achievementOptions.map(achievement => (
                <button
                  key={achievement.id}
                  onClick={() => handleAchievementSelect(achievement.id)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-slate-700 border-b border-gray-100 dark:border-slate-700 last:border-b-0 transition-colors"
                  data-testid={`option-achievement-${achievement.id}`}
                >
                  {achievement.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close dropdowns */}
      {(showTeamDropdown || showAchievementDropdown) && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowTeamDropdown(false);
            setShowAchievementDropdown(false);
          }}
        />
      )}
    </div>
  );
}