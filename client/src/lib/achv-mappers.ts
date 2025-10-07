import type { Achievement } from '@/lib/achievements';
import type { Achv, Comp } from '@/lib/feedback';

// Helper to parse stat labels like "20,000+ Career Points"
function parseStatLabel(label: string): { value: number; comp: Comp; stat: string } | null {
    const match = label.match(/([\d,]+)\+?\s*(?:\(Season\))?\s*(.*)/i); // Updated regex
    if (match) {
        const value = parseInt(match[1].replace(/,/g, ''));
        const stat = match[2].trim(); // Capture the second group for the stat name
        const comp = label.includes('+') ? '>=' : label.includes('≤') ? '<=' : '=';
        return { value, comp, stat };
    }
    return null;
}

export function mapAchievementToAchv(achievement: Achievement): Achv {
    const { id, label } = achievement;

    // Default structure
    const baseAchv: Achv = {
        type: 'boolean',
        booleanNoun: label,
    };

    // Handle specific categories
    switch (id) {
        // Draft Achievements
        case 'isPick1Overall':
            return { type: 'draft', draftMeta: { overall: 1 }, booleanNoun: label };
        case 'isFirstRoundPick':
            return { type: 'draft', draftMeta: { round: 1 }, booleanNoun: label };
        case 'isSecondRoundPick':
            return { type: 'draft', draftMeta: { round: 2 }, booleanNoun: label };
        case 'isUndrafted':
            return { type: 'boolean', booleanNoun: 'Went Undrafted' };
        case 'draftedTeen':
            return { type: 'boolean', booleanNoun: 'Drafted as Teenager' };

        // Boolean Achievements
        case 'isHallOfFamer':
            return { type: 'boolean', booleanNoun: 'Hall of Fame' };
        case 'played15PlusSeasons':
            return { type: 'boolean', booleanNoun: 'Played 15+ Seasons' };
        case 'bornOutsideUS50DC':
            return { type: 'boolean', booleanNoun: 'Born outside 50 states + DC' };
        case 'playedAtAge40Plus':
            return { type: 'boolean', booleanNoun: 'Played at Age 40+' };
        case 'royLaterMVP':
            return { type: 'boolean', booleanNoun: 'ROY Who Later Won MVP' };
        case 'played5PlusFranchises':
            return { type: 'boolean', booleanNoun: 'Played for 5+ Franchises' };

        // Award Achievements (approximated from ID)
        case 'AllStar':
        case 'FBAllStar':
        case 'HKAllStar':
        case 'BBAllStar':
            return { type: 'award', award: { key: id, nounPhrase: 'All-Star' }, booleanNoun: label };
        case 'MVP':
        case 'FBMVP':
        case 'HKMVP':
        case 'BBMVP':
            return { type: 'award', award: { key: id, nounPhrase: 'MVP' }, booleanNoun: label };
        case 'DPOY':
        case 'FBDPOY':
            return { type: 'award', award: { key: id, nounPhrase: 'Defensive Player of the Year' }, booleanNoun: label };
        case 'ROY':
        case 'FBOffROY':
        case 'FBDefROY':
        case 'HKROY':
        case 'BBROY':
            return { type: 'award', award: { key: id, nounPhrase: 'Rookie of the Year' }, booleanNoun: label };
        case 'FinalsMVP':
        case 'FBFinalsMVP':
        case 'HKFinalsMVP':
            return { type: 'award', award: { key: id, nounPhrase: 'Finals MVP' }, booleanNoun: label };
        case 'Champion':
        case 'FBChampion':
        case 'HKChampion':
        case 'BBChampion':
            return { type: 'boolean', booleanNoun: 'Won Championship' };

        // Decade Achievements
        default:
            if (id.startsWith('playedIn') && id.endsWith('s')) {
                const year = parseInt(id.replace('playedIn', '').replace('s', ''));
                if (!isNaN(year)) {
                    return { type: 'decade', decadeType: 'played', decadeYear: year, booleanNoun: label };
                }
            }
            if (id.startsWith('debutedIn') && id.endsWith('s')) {
                const year = parseInt(id.replace('debutedIn', '').replace('s', ''));
                if (!isNaN(year)) {
                    return { type: 'decade', decadeType: 'debuted', decadeYear: year, booleanNoun: label };
                }
            }

            // For stat achievements, parse the label
            const parsed = parseStatLabel(label);
            if (parsed) {
                return {
                    type: 'stat',
                    scope: label.toLowerCase().includes('season') ? 'season' : 'career',
                    stat: { key: parsed.stat, noun: parsed.stat },
                    comp: parsed.comp,
                    value: parsed.value,
                    booleanNoun: label,
                };
            }
            return baseAchv;
    }
}