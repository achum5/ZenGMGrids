// This file contains shared types that were previously causing circular dependencies.

export type Comp = '>=' | '<=' | '=';

export type Achv =
  | {
      type: 'boolean';
      booleanNoun: string;
    }
  | {
      type: 'draft';
      draftMeta: {
        overall?: number;
        round?: number;
      };
      booleanNoun: string;
    }
  | {
      type: 'award';
      award: {
        key: string;
        nounPhrase: string;
      };
      booleanNoun: string;
    }
  | {
      type: 'decade';
      decadeType: 'played' | 'debuted';
      decadeYear: number;
      booleanNoun: string;
    }
  | {
      type: 'stat';
      scope: 'season' | 'career';
      stat: {
        key: string;
        noun: string;
      };
      comp: Comp;
      value: number;
      booleanNoun: string;
    };