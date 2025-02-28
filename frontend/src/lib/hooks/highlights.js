import {getNextColor} from '../utils';
import {Constants} from '../constants';
import {colorPaletteState} from '../atoms/settingsState';
import {
    symbolReasonHighlightsState,
    symbolSearchHighlightsState,
    allHighlightedSymbolsState,
    recentSymbolSearchHighlightTimeoutState,
    ruleDotHighlightsStateFamily,
    ruleBackgroundHighlightsStateFamily,
} from '../atoms/highlightsState';
import {
    selectedBranchState,
    searchInputState,
    exactMatchState,
    filteredSuggestionsState,
    selectedSuggestionState,
} from '../atoms/searchState';


export const setReasonHighlightsCallback =
    ({snapshot, set}) =>
    async (transformationHash, symbolUuid, data) => {
        const previousHighlights = await snapshot.getPromise(
            allHighlightedSymbolsState
        );
        const colorPalette = await snapshot.getPromise(colorPaletteState);
        const nextColor = getNextColor(
            previousHighlights,
            colorPalette.explanationHighlights
        );

        const oldValue = await snapshot.getPromise(symbolReasonHighlightsState);
        // symbol Highlights
        const newValue = [
            ...oldValue,
            {
                _type: 'SymbolHighlights_RECOIL',
                symbolUuid,
                repr: null,
                includes: null,
                origin: symbolUuid,
                color: nextColor,
                recent: true,
                selectedIndex: null,
                scrollable: null,
                isAutocomplete: null,
                transformationHash,
            },
            ...data.symbols.map((arrow) => ({
                _type: 'SymbolHighlights_RECOIL',
                symbolUuid: arrow.tgt,
                repr: null,
                includes: null,
                origin: symbolUuid,
                color: nextColor,
                recent: true,
                selectedIndex: null,
                scrollable: null,
                isAutocomplete: null,
                transformationHash,
            })),
        ];
        set(symbolReasonHighlightsState, newValue);
        const nextHoverColor = getNextColor(
            newValue,
            colorPalette.explanationHighlights
        );
        document.documentElement.style.setProperty(
            '--hover-color',
            nextHoverColor
        );

        // rule Dot Highlights
        const ruleDotHighlights = await snapshot.getPromise(
            ruleDotHighlightsStateFamily(transformationHash)
        );
        const newRuleDotHighlights = [
            ...ruleDotHighlights,
            {
                _type: 'RuleDotHighlights_RECOIL',
                symbolUuid,
                transformationHash,
                ruleHash: data.rule,
                color: nextColor,
                shown: true,
            },
        ];
        set(
            ruleDotHighlightsStateFamily(transformationHash),
            newRuleDotHighlights
        );

        // rule Background Highlights
        const ruleBackgroundHighlights = await snapshot.getPromise(
            ruleBackgroundHighlightsStateFamily(transformationHash)
        );
        const updatedRuleBackgroundHighlights = [
            {
                _type: 'RuleBackgroundHighlights_RECOIL',
                symbolUuid,
                transformationHash,
                ruleHash: data.rule,
                color: nextColor,
                shown: true,
            },
            ...ruleBackgroundHighlights,
        ];
        set(
            ruleBackgroundHighlightsStateFamily(transformationHash),
            updatedRuleBackgroundHighlights
        );
        setTimeout(() => {
            set(
                ruleBackgroundHighlightsStateFamily(transformationHash),
                (ruleBackgroundHighlights) =>
                    ruleBackgroundHighlights.filter(
                        (h) => h.symbolUuid !== symbolUuid
                    )
            );
        }, Constants.ruleHighlightDuration);
    };

export const removeSymbolHighlightsCallback =
    ({snapshot, set}) =>
    async (transformationHash, symbolUuid) => {
        // symbol Background
        const symbolBackgrounds = await snapshot.getPromise(
            symbolReasonHighlightsState
        );
        const updatedSymbolBackgrounds = symbolBackgrounds.filter(
            (h) => h.origin !== symbolUuid
        );
        set(symbolReasonHighlightsState, updatedSymbolBackgrounds);
        const searchResultHighlights = await snapshot.getPromise(
            symbolSearchHighlightsState
        );
        const colorPalette = await snapshot.getPromise(colorPaletteState);
        const nextHoverColor = getNextColor(
            updatedSymbolBackgrounds.concat(searchResultHighlights),
            colorPalette.explanationHighlights
        );
        document.documentElement.style.setProperty(
            '--hover-color',
            nextHoverColor
        );

        // rule Dot Highlights
        set(
            ruleDotHighlightsStateFamily(transformationHash),
            (ruleBackgroundHighlights) =>
                ruleBackgroundHighlights.map((h) => {
                    if (h.symbolUuid !== symbolUuid) {
                        return h;
                    }
                    return {...h, shown: false};
                })
        );
        setTimeout(() => {
            set(
                ruleDotHighlightsStateFamily(transformationHash),
                (ruleBackgroundHighlights) =>
                    ruleBackgroundHighlights.filter(
                        (h) => h.symbolUuid !== symbolUuid
                    )
            );
        }, Constants.ruleHighlightFadeDuration);

        // rule Background Highlights
        set(
            ruleBackgroundHighlightsStateFamily(transformationHash),
            (ruleBackgroundHighlights) =>
                ruleBackgroundHighlights.filter(
                    (h) => h.symbolUuid !== symbolUuid
                )
        );
    };

export const clearAllHighlightsCallback =
    ({snapshot, set}) =>
    async () => {
        // Search
        set(symbolSearchHighlightsState, []);

        // Reason
        const currentSymbolReasonHighlights = await snapshot.getPromise(
            symbolReasonHighlightsState
        );
        set(symbolReasonHighlightsState, []);

        const activeTransformationHashes = currentSymbolReasonHighlights.map(
            (h) => h.transformationHash
        );
        activeTransformationHashes.forEach((transformationHash) => {
            set(
                ruleDotHighlightsStateFamily(transformationHash),
                (ruleBackgroundHighlights) =>
                    ruleBackgroundHighlights.map((h) => {
                        return {...h, shown: false};
                    })
            );
            setTimeout(() => {
                set(ruleDotHighlightsStateFamily(transformationHash), []);
            }, Constants.ruleHighlightFadeDuration);
            set(ruleBackgroundHighlightsStateFamily(transformationHash), []);
        });

        // Hover color
        const colorPalette = await snapshot.getPromise(colorPaletteState);
        const nextHoverColor = getNextColor(
            [],
            colorPalette.explanationHighlights
        );
        document.documentElement.style.setProperty(
            '--hover-color',
            nextHoverColor
        );
    };

export const handleSearchResultSuggestionsCallback =
    ({snapshot, set}) =>
    async () => {
        async function setSymbolSearchHighlights(newValue) {
            const SymbolReasonHighlights = await snapshot.getPromise(
                symbolReasonHighlightsState
            );
            const selectedBranch = await snapshot.getPromise(
                selectedBranchState
            );
            const colorPalette = await snapshot.getPromise(colorPaletteState);
            const nextColor = getNextColor(
                SymbolReasonHighlights,
                colorPalette.explanationHighlights
            );

            const updatedHighlights = [newValue].map((h) => ({
                ...h,
                color: nextColor,
                selectedIndex: selectedBranch,
                symbolUuid: h.includes[selectedBranch],
            }));
            set(symbolSearchHighlightsState, updatedHighlights);
            if (newValue.isAutocomplete) {
                set(searchInputState, newValue.repr);
            }

            // set recent
            const oldTimeoutId = await snapshot.getPromise(
                recentSymbolSearchHighlightTimeoutState
            );
            if (oldTimeoutId) {
                clearTimeout(oldTimeoutId);
            }
            // const newTimeoutId = setTimeout(() => {
            //     set(symbolSearchHighlightsState, (recentValue) =>
            //         recentValue.map((h) => ({
            //             ...h,
            //             recent: false,
            //         }))
            //     );
            // }, Constants.searchResultHighlightDuration);
            // set(recentSymbolSearchHighlightTimeoutState, (oldTimeoutId) => {
            //     if (oldTimeoutId !== null) {
            //         clearTimeout(oldTimeoutId);
            //     }
            //     return newTimeoutId;
            // });

            // set hover color
            const nextHoverColor = getNextColor(
                SymbolReasonHighlights.concat(updatedHighlights),
                colorPalette.explanationHighlights
            );
            document.documentElement.style.setProperty(
                '--hover-color',
                nextHoverColor
            );
        }

        const exactMatch = await snapshot.getPromise(exactMatchState);
        if (exactMatch !== null) {
            setSymbolSearchHighlights(exactMatch);
            return;
        }

        const suggestions = await snapshot.getPromise(filteredSuggestionsState);
        const selectedSuggestion = await snapshot.getPromise(
            selectedSuggestionState
        );
        if (suggestions[selectedSuggestion]) {
            setSymbolSearchHighlights(suggestions[selectedSuggestion]);
            return;
        }

        const SymbolSearchHighlights = await snapshot.getPromise(
            symbolSearchHighlightsState
        );
        if (
            suggestions.length === 0 ||
            (selectedSuggestion === null && SymbolSearchHighlights.length > 0)
        ) {
            // remove search highlights
            set(symbolSearchHighlightsState, []);

            // set hover color
            const SymbolReasonHighlights = await snapshot.getPromise(
                symbolReasonHighlightsState
            );
            const colorPalette = await snapshot.getPromise(colorPaletteState);
            const nextHoverColor = getNextColor(
                SymbolReasonHighlights,
                colorPalette.explanationHighlights
            );
            document.documentElement.style.setProperty(
                '--hover-color',
                nextHoverColor
            );
            return;
        }
    };
