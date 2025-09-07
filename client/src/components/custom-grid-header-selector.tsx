import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Users, Trophy } from 'lucide-react';
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
    <Card className={cn("shadow-lg hover:shadow-xl transition-all duration-200", className)}>
      <CardContent className="p-4">
        <div 
          className="space-y-3"
          data-testid={`header-selector-${position}`}
        >
          {/* Type Selection */}
          {!localType && (
            <div className="space-y-3">
              <div className="text-center">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Choose Type</h4>
              </div>
              <div className="space-y-2">
                <Button
                  onClick={() => handleTypeChange('team')}
                  variant="outline"
                  className="w-full h-12 text-sm font-medium hover:bg-primary/10 hover:border-primary/50 transition-all duration-200"
                  data-testid={`button-select-team-${position}`}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Team
                </Button>
                <Button
                  onClick={() => handleTypeChange('achievement')}
                  variant="outline"
                  className="w-full h-12 text-sm font-medium hover:bg-primary/10 hover:border-primary/50 transition-all duration-200"
                  data-testid={`button-select-achievement-${position}`}
                >
                  <Trophy className="mr-2 h-4 w-4" />
                  Achievement
                </Button>
              </div>
            </div>
          )}

          {/* Selection Display & Dropdown */}
          {localType && !config.selectedLabel && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {localType === 'team' ? (
                    <Users className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Trophy className="h-4 w-4 text-amber-500" />
                  )}
                  <span className="text-sm font-medium">
                    {localType === 'team' ? 'Team' : 'Achievement'}
                  </span>
                </div>
                <Button
                  onClick={handleClear}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-destructive/20 rounded-full"
                  data-testid={`button-clear-type-${position}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              
              <Select onValueChange={handleSelectionChange} data-testid={`select-${localType}-${position}`}>
                <SelectTrigger className="w-full h-11 text-sm border-2 hover:border-primary/50 transition-colors">
                  <SelectValue placeholder={`Select ${localType}...`} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {localType === 'team' 
                    ? teamOptions.map(team => (
                        <SelectItem 
                          key={team.id} 
                          value={team.id.toString()}
                          className="text-sm hover:bg-primary/10"
                          data-testid={`option-team-${team.id}`}
                        >
                          {team.label}
                        </SelectItem>
                      ))
                    : achievementOptions.map(achievement => (
                        <SelectItem 
                          key={achievement.id} 
                          value={achievement.id}
                          className="text-sm hover:bg-primary/10"
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {config.type === 'team' ? (
                    <Users className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Trophy className="h-4 w-4 text-amber-500" />
                  )}
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {config.type === 'team' ? 'Team' : 'Achievement'}
                  </span>
                </div>
                <Button
                  onClick={handleClear}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-destructive/20 rounded-full"
                  data-testid={`button-clear-selection-${position}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-3 border border-primary/20">
                <span className="text-sm font-semibold text-foreground leading-relaxed">
                  {config.selectedLabel}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}