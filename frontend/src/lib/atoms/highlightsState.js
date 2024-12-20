import { atomFamily } from 'recoil';
import {
    SYMBOLHIGHLIGHTS_RECOIL,
    RULEDOTHIGHLIGHTS_RECOIL,
    RULEBACKGROUNDHIGHLIGHTS_RECOIL,
} from '../types/propTypes';

export const symbolHighlightsStateFamily = atomFamily({
    key: 'symbolHighlightsState',
    /** @type {SYMBOLHIGHLIGHTS_RECOIL} */
    default: [],
});

export const ruleDotHighlightsStateFamily = atomFamily({
    key: 'ruleDotHighlightsState',
    /** @type {RULEDOTHIGHLIGHTS_RECOIL} */
    default: [],
});

export const ruleBackgroundHighlightsStateFamily = atomFamily({
    key: 'ruleBackgroundHighlightsState',
    /** @type {RULEBACKGROUNDHIGHLIGHTS_RECOIL} */
    default: [],
});



// export const highlightsForSymbolStateFamily = selectorFamily({
//     key: 'highlightsForSymbolState',
//     get: (symbolUuid) => ({get}) => {
//         const highlights = get(highlightsState);
//         return highlights.filter(h => h.symbolUuid === symbolUuid);
//     },
//     set: (symbolUuid) => ({set, get}, newValue) => {
//         const allHighlights = get(highlightsState);
//         set(highlightsState, [...allHighlights, newValue]);
//         console.log("In highlghtsforsymbolstatefamily set");
//     }
// });