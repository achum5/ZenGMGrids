import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import type { LeagueData, Team } from '@/types/bbgm';
import { detectSport } from '@/lib/grid-sharing';

// Constants for BBGM logo URLs
const BBGM_ASSET_BASE = 'https://play.basketball-gm.com';

function isBBGMDefaultLogo(logoURL: string | null | undefined): boolean {
  if (!logoURL) return false;
  return logoURL.startsWith('/img/logos-') || logoURL.startsWith('img/logos-');
}

// Build logo candidates for teams, prioritizing small logos
function buildLogoURL(team: Team): string {
  // 1. If explicit small logo URL is provided and it's custom (not BBGM default), use it
  if (team.imgURLSmall && !isBBGMDefaultLogo(team.imgURLSmall)) {
    return team.imgURLSmall;
  }
  
  // 2. If explicit regular logo URL is provided and it's custom, use it  
  if (team.imgURL && !isBBGMDefaultLogo(team.imgURL)) {
    return team.imgURL;
  }
  
  // 3. If BBGM default small logo path is provided, convert to absolute URL
  if (team.imgURLSmall && isBBGMDefaultLogo(team.imgURLSmall)) {
    const cleanPath = team.imgURLSmall.startsWith('/') ? team.imgURLSmall.substring(1) : team.imgURLSmall;
    return `${BBGM_ASSET_BASE}/${cleanPath}`;
  }
  
  // 4. If BBGM default logo path is provided, convert to absolute URL
  if (team.imgURL && isBBGMDefaultLogo(team.imgURL)) {
    const cleanPath = team.imgURL.startsWith('/') ? team.imgURL.substring(1) : team.imgURL;
    return `${BBGM_ASSET_BASE}/${cleanPath}`;
  }
  
  // 5. Build BBGM default URL from abbreviation
  if (team.abbrev) {
    const abbrev = team.abbrev.toUpperCase();
    return `${BBGM_ASSET_BASE}/img/logos-primary/${abbrev}.svg`;
  }
  
  // 6. Fallback empty string
  return '';
}

interface TeamOption {
  id: number;
  name: string;
  abbrev: string;
  region: string;
  logoUrl: string;
  smallLogoUrl?: string;
}

interface AchievementOption {
  id: string;
  label: string;
  isCareer: boolean;
}

interface HeaderSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leagueData: LeagueData | null;
  onSelect: (type: 'team' | 'achievement', value: string, label: string) => void;
  headerPosition: string; // e.g., "row-0", "col-1"
}

export function HeaderSelectionModal({ 
  open, 
  onOpenChange, 
  leagueData, 
  onSelect, 
  headerPosition 
}: HeaderSelectionModalProps) {
  const [activeTab, setActiveTab] = useState<'teams' | 'achievements'>('teams');

  const sport = useMemo(() => leagueData ? detectSport(leagueData) : 'basketball', [leagueData]);

  // Process teams data
  const teamOptions = useMemo<TeamOption[]>(() => {
    if (!leagueData?.teams) return [];
    
    return leagueData.teams.map(team => {
      const logoUrl = buildLogoURL(team);
      const teamName = team.name || team.region || `Team ${team.tid}`;
      return {
        id: team.tid,
        name: teamName,
        abbrev: team.abbrev || 'UNK',
        region: team.region || '',
        logoUrl,
        smallLogoUrl: logoUrl // Using the same URL since buildLogoURL already prioritizes small logos
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [leagueData?.teams]);

  // Process achievements data
  const achievementOptions = useMemo<AchievementOption[]>(() => {
    if (!sport) return [];
    
    const achievements: AchievementOption[] = [];
    
    // Career achievements (always present)
    const careerAchievements = [
      { id: 'mvp', label: 'MVP', isCareer: true },
      { id: 'finals_mvp', label: 'Finals MVP', isCareer: true },
      { id: 'dpoy', label: 'Defensive Player of the Year', isCareer: true },
      { id: 'smoy', label: 'Sixth Man of the Year', isCareer: true },
      { id: 'roy', label: 'Rookie of the Year', isCareer: true },
      { id: 'allstar', label: 'All-Star', isCareer: true },
      { id: 'all_league', label: 'All-League', isCareer: true },
      { id: 'all_defensive', label: 'All-Defensive', isCareer: true },
      { id: 'champion', label: 'Champion', isCareer: true }
    ];
    
    // Season achievements
    const seasonAchievements = [
      { id: 'mvp_season', label: 'MVP (Season)', isCareer: false },
      { id: 'finals_mvp_season', label: 'Finals MVP (Season)', isCareer: false },
      { id: 'dpoy_season', label: 'DPOY (Season)', isCareer: false },
      { id: 'smoy_season', label: 'SMOY (Season)', isCareer: false },
      { id: 'roy_season', label: 'ROY (Season)', isCareer: false },
      { id: 'allstar_season', label: 'All-Star (Season)', isCareer: false },
      { id: 'all_league_season', label: 'All-League (Season)', isCareer: false },
      { id: 'all_defensive_season', label: 'All-Defensive (Season)', isCareer: false },
      { id: 'champion_season', label: 'Champion (Season)', isCareer: false }
    ];
    
    // Add career achievements first, then season achievements
    achievements.push(...careerAchievements);
    achievements.push(...seasonAchievements);
    
    return achievements;
  }, [sport]);

  const handleTeamSelect = (team: TeamOption) => {
    onSelect('team', team.id.toString(), team.name);
    onOpenChange(false);
  };

  const handleAchievementSelect = (achievement: AchievementOption) => {
    onSelect('achievement', achievement.id, achievement.label);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] h-[80vh] flex flex-col" data-radix-scroll-lock-ignore>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg font-semibold">
            Select {headerPosition.includes('row') ? 'Row' : 'Column'} Header
          </DialogTitle>
        </DialogHeader>
        
        <Tabs 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as 'teams' | 'achievements')}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
            <TabsTrigger value="teams" data-testid="tab-teams">Teams</TabsTrigger>
            <TabsTrigger value="achievements" data-testid="tab-achievements">Achievements</TabsTrigger>
          </TabsList>
          
          <TabsContent value="teams" className="flex-1 overflow-hidden mt-4">
            <div className="h-full overflow-y-auto" data-testid="teams-list">
              <div className="space-y-2 pr-2">
                {teamOptions.map((team) => (
                  <Button
                    key={team.id}
                    variant="ghost"
                    className="w-full justify-start h-auto p-3 hover:bg-muted"
                    onClick={() => handleTeamSelect(team)}
                    data-testid={`team-option-${team.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={team.smallLogoUrl}
                        alt={`${team.name} logo`}
                        className="w-8 h-8 object-contain flex-shrink-0"
                        onError={(e) => {
                          // Fallback to regular logo if small logo fails
                          e.currentTarget.src = team.logoUrl;
                        }}
                      />
                      <div className="text-left">
                        <div className="font-medium">{team.name}</div>
                        <div className="text-sm text-muted-foreground">{team.abbrev}</div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="achievements" className="flex-1 overflow-hidden mt-4">
            <div className="h-full overflow-y-auto" data-testid="achievements-list">
              <div className="space-y-4 pr-2">
                {/* Career Achievements Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Career Achievements
                    </h3>
                    <Badge variant="secondary" className="text-xs">Career</Badge>
                  </div>
                  <div className="space-y-2">
                    {achievementOptions
                      .filter(achievement => achievement.isCareer)
                      .map((achievement) => (
                        <Button
                          key={achievement.id}
                          variant="ghost"
                          className="w-full justify-start h-auto p-3 hover:bg-muted"
                          onClick={() => handleAchievementSelect(achievement)}
                          data-testid={`achievement-option-${achievement.id}`}
                        >
                          <div className="text-left">
                            <div className="font-medium">{achievement.label}</div>
                          </div>
                        </Button>
                      ))}
                  </div>
                </div>
                
                {/* Season Achievements Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Season Achievements
                    </h3>
                    <Badge variant="outline" className="text-xs">Season</Badge>
                  </div>
                  <div className="space-y-2">
                    {achievementOptions
                      .filter(achievement => !achievement.isCareer)
                      .map((achievement) => (
                        <Button
                          key={achievement.id}
                          variant="ghost"
                          className="w-full justify-start h-auto p-3 hover:bg-muted"
                          onClick={() => handleAchievementSelect(achievement)}
                          data-testid={`achievement-option-${achievement.id}`}
                        >
                          <div className="text-left">
                            <div className="font-medium">{achievement.label}</div>
                          </div>
                        </Button>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}