import {atom, selector, noWait} from 'recoil';

import {currentSortState} from './currentGraphState';
import {backendUrlState} from './settingsState';

const defaultSearchInputState = "";

export const searchInputState = atom({
    key: 'searchInputState',
    default: defaultSearchInputState,
});

let abortController = new AbortController();

const getSearchResultsFromServer = async (
    backendUrl,
    currentSort,
    userInput
) => {
    abortController.abort();
    abortController = new AbortController();
    return fetch(`${backendUrl}/query?q=${encodeURIComponent(userInput)}`, {
        signal: abortController.signal,
    });
};

export const queryResultState = selector({
    key: 'queryResultState',
    get: async ({get}) => {
        const searchInput = get(searchInputState);
        if (searchInput === "") {
            return [];
        }
        const currentSort = get(currentSortState);
        const backendURL = get(backendUrlState);
        const response = await getSearchResultsFromServer(
            backendURL,
            currentSort,
            searchInput
        );
        const data = await response.json();
        return data;
    },
});

let previousQueryResult = [];
export const bufferedQueryResultState = selector({
    key: 'bufferedQueryResultState',
    get: async ({get}) => {
        const queryResultLoadable = get(noWait(queryResultState));
        switch (queryResultLoadable.state) {
            case 'hasValue':
                previousQueryResult = queryResultLoadable.contents;
                return queryResultLoadable.contents;
            case 'loading':
                return previousQueryResult;
            default:
                return [];
        }
    },
});

export const exactMatchState = selector({
    key: 'exactMatchState',
    get: ({get}) => {
        const suggestions = get(bufferedQueryResultState);
        const searchInput = get(searchInputState);
        const indexOfUserInputInSuggestions = suggestions.findIndex(
            (s) => s.repr === searchInput
        );
        if (
            indexOfUserInputInSuggestions !== -1 &&
            !suggestions[indexOfUserInputInSuggestions].hideInSuggestions
        ) {
            const match = suggestions[indexOfUserInputInSuggestions];
            return {
                _type: 'SymbolHighlights_RECOIL',
                symbolUuid: match.includes[0],
                repr: match.repr,
                includes: match.includes,
                origin: 'query',
                color: 'TBD',
                recent: true,
                selectedIndex: 0,
                scrollable: match.includes.length > 1,
                isAutocomplete: match.isAutocomplete,
                transformationHash: null,
            }
        }
        return null;
    },
});

export const partialMatchState = selector({
    key: 'partialMatchState',
    get: ({get}) => {
        const suggestions = get(bufferedQueryResultState);
        const searchInput = get(searchInputState);
        const indexOfUserInputInSuggestions = suggestions.findIndex(
            (s) => s.repr === searchInput
        );
        if (
            indexOfUserInputInSuggestions === -1 &&
            suggestions.length > 0 &&
            !suggestions.every(s => s.hideInSuggestions)
        ) {
            return suggestions.filter(s => !s.hideInSuggestions);
        }
        return null;
    },
});

export const filteredSuggestionsState = selector({
    key: 'filteredSuggestionsState',
    get: ({get}) => {
        const exactMatch = get(exactMatchState);
        if (exactMatch !== null) {
            return [];
        }
        const partialMatch = get(partialMatchState);
        if (partialMatch !== null) {
            return partialMatch.map((s) => ({
                _type: 'SymbolHighlights_RECOIL',
                symbolUuid: s.includes[0],
                repr: s.repr,
                includes: s.includes,
                origin: 'query',
                color: 'TBD',
                recent: true,
                selectedIndex: 0,
                scrollable: s.includes.length > 1,
                isAutocomplete: s.isAutocomplete,
            }));
        }
        return [];
    }
});

export const cursorPositionSearchInputState = selector({
    key: 'cursorInSearchFieldState',
    get: ({get}) => {
        const exactMatch = get(exactMatchState);
        if (exactMatch !== null) {
            return exactMatch.repr.length;
        }
        const searchInput = get(searchInputState);
        return searchInput.length;
    },
});

export const awaitingInputState = selector({
    key: 'awaitingInputState',
    get: ({get}) => {
        const searchInput = get(searchInputState);
        if (searchInput === '') {
            return false;
        }


        const exactMatch = get(exactMatchState);
        if (exactMatch !== null) {
            return false;
        }

        const suggestions = get(bufferedQueryResultState);
        if (suggestions.length === 0) {
            return false;
        }
        return suggestions.some((s) => s.awaitingInput);
    },
});

export const showSuggestionsState = selector({
    key: 'showSuggestionsState',
    get: ({get}) => {
        const partialMatch = get(partialMatchState)
        return partialMatch !== null;
    },
});

export const isAutocompleteVisibleState = selector({
    key: 'isAutocompleteVisibleState',
    get: ({get}) => {
        const partialMatch = get(partialMatchState);
        if (partialMatch === null) {
            return false;
        }
        return partialMatch.some((s) => s.isAutocomplete);
    },
});

export const activeSuggestionState = atom({
    key: 'activeSuggestionState',
    default: 0,
});


export const selectedSuggestionState = atom({
    key: 'selectedSuggestionState',
    default: null,
});

export const selectedBranchState = atom({
    key: 'selectedBranchState',
    default: 0,
});