// This file contains shared types that were previously causing circular dependencies.

export type Comp = '>=' | '<=' | '=';

export type StatKey =
  | 'careerPoints' | 'careerRebounds' | 'careerAssists' | 'careerSteals' | 'careerBlocks' | 'careerGames' | 'careerMinutes'
  | 'seasonPoints' | 'seasonRebounds' | 'seasonAssists' | 'seasonSteals' | 'seasonBlocks' | 'seasonGames' | 'seasonMinutes';

export type ComparisonOperator = 'lessThan' | 'greaterThan' | 'equals' | 'between';

export interface CustomAchievementTemplate {
  id: string;
  statKey: StatKey;
  operator: ComparisonOperator;
  value?: number;
  valueMin?: number;
  valueMax?: number;
  isCareer: boolean;
  label: string;
  description?: string;
}

export interface Achievement {
  id: string;
  label: string;
  description?: string;
  test: (player: Player, seasonIndex?: SeasonIndex) => boolean;
  isSeasonSpecific?: boolean;
  isCustom?: boolean;
  customTemplate?: CustomAchievementTemplate;
}

export interface CatTeam {
  key: string;
  label: string;
  tid?: number;
  achievementId?: string;
  achv?: Achv;
  type: 'team' | 'achievement';
  test: (p: Player) => boolean;
}