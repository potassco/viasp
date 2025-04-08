import {atom, selector, atomFamily, selectorFamily, noWait, waitForAll} from 'recoil';
import {
    SYMBOLHIGHLIGHTS_RECOIL,
    RULEDOTHIGHLIGHTS_RECOIL,
    RULEBACKGROUNDHIGHLIGHTS_RECOIL,
} from '../types/propTypes';
import {edgesState} from './edgesState';
import {symbolUuidsByNodeUuidStateFamily} from './symbolsState';


export const symbolReasonHighlightsState = atom({
    key: 'symbolHighlightsState',
    /** @type {SYMBOLHIGHLIGHTS_RECOIL} */
    default: [],
});

export const symbolSearchHighlightsState = atom({
    key: 'symbolSearchHighlightsState',
    /** @type {SYMBOLHIGHLIGHTS_RECOIL} */
    default: [],
});

export const symbolModalHighlightsState = atom({
    key: 'symbolModalHighlightsState',
    /** @type {SYMBOLHIGHLIGHTS_RECOIL} */
    default: [],
});


export const allHighlightedSymbolsState = selector({
    key: 'allHighlightedSymbolsState',
    /** @type {SYMBOLHIGHLIGHTS_RECOIL} */
    get: ({get}) => {
        const searchResultHighlights = get(symbolSearchHighlightsState);
        const symbolHighlights = get(symbolReasonHighlightsState);
        const modalHighlights = get(symbolModalHighlightsState);
        return searchResultHighlights.concat(symbolHighlights).concat(modalHighlights);
    },
});

export const allHighlightedSymbolsExceptSearchState = selector({
    key: 'allHighlightedSymbolsExceptSearchState',
    /** @type {SYMBOLHIGHLIGHTS_RECOIL} */
    get: ({get}) => {
        const symbolHighlights = get(symbolReasonHighlightsState);
        const modalHighlights = get(symbolModalHighlightsState);
        return symbolHighlights.concat(modalHighlights);
    },
});

export const symbolHighlightsStateFamily = selectorFamily({
    key: 'symbolHighlightsState',
    get:
        (symbolUuid) =>
        ({get}) => {
            const highlights = get(allHighlightedSymbolsState);
            return highlights.filter((h) => h.symbolUuid === symbolUuid);
        },
});

export const symbolBackgroundHighlightsStateFamily = selectorFamily({
    key: 'symbolBackgroundHighlightsState',
    get:
        (symbolUuid) =>
        ({get}) => {
            const highlights = get(symbolHighlightsStateFamily(symbolUuid));

            
            if (highlights.length > 0) {
                const uniqueHighlightsColors = [
                    ...new Set(highlights.map((h) => h.color).reverse()),
                ];

                const gradientStops = uniqueHighlightsColors
                    .map((color, index, array) => {
                        const start = (index / array.length) * 100;
                        const end = ((index + 1) / array.length) * 100;
                        return `${color} ${start}%, ${color} ${end}%`;
                    })
                    .join(', ');
                return `linear-gradient(-45deg, ${gradientStops})`;
            }
            return 'transparent';
        },
});

export const pulsatingHighlightsState = selectorFamily({
    key: 'queryHighlightsState',
    get:
        (symbolUuid) =>
        ({get}) => {
            const highlights = get(allHighlightedSymbolsState);
            const recentSearchHighlights = highlights.filter(
                (highlight) =>
                    highlight.symbolUuid === symbolUuid &&
                    (highlight.origin === 'query' || highlight.origin === 'modal') &&
                    highlight.recent
            );
            if (recentSearchHighlights.length > 0) {
                return {
                    isPulsating: true,
                    color: recentSearchHighlights[0].color
                }
            }
            return {
                isPulsating: false,
                color: 'transparent'
            }
        },
});

export const pulsatingHighlightsStateByNodeUuidStateFamily = selectorFamily({
    key: 'pulsatingHighlightsStateByNodeUuidStateFamily',
    get:
        ({transformationHash, nodeUuid}) =>
        ({get}) => {
            const symbolUuids = get(
                symbolUuidsByNodeUuidStateFamily({transformationHash, nodeUuid})
            );
            const highlights = get(
                waitForAll(
                    symbolUuids.map((symbolUuid) =>
                        pulsatingHighlightsState(symbolUuid)
                    )
            ));
            if (highlights.some((h) => h.isPulsating)) {
                return {
                    isPulsating: true,
                    color: highlights[0].color
                }
            }
            return {
                isPulsating: false,
                color: 'transparent'
            }
        },
});

export const arrowHighlightsState = selector({
    key: 'arrowHighlightsState',
    get: ({get}) => {
        const highlights = get(allHighlightedSymbolsState);
        // create dependencies
        const edgesLoadable = get(noWait(edgesState));
        if (edgesLoadable.state === 'loading') {
            return [];
        }
        return highlights.filter(
            (highlight) =>
                highlight.origin !== 'query' &&
                highlight.symbolUuid !== highlight.origin
        );
    },
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

export const recentSymbolSearchHighlightTimeoutState = atom({
    key: 'rotateSymbolSearchHighlightTimeoutState',
    default: null,
});

export const recentModalHighlightTimeoutState = atom({
    key: 'rotateModalHighlightTimeoutState',
    default: null,
});

export const isShowingExplanationStateFamily = selectorFamily({
    key: 'isShowingExplanationState',
    get:
        (symbolUuid) =>
        ({get}) => {
            const highlights = get(symbolReasonHighlightsState);
            return highlights.some((highlight) => highlight.origin === symbolUuid);
        },
})