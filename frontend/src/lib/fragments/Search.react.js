import { darken, lighten } from 'polished';
import React from 'react';
import PropTypes from 'prop-types';
import PulseLoader from 'react-spinners/PulseLoader';
import { styled } from 'styled-components';
import { Constants } from "../constants";
import { useColorPalette } from '../contexts/ColorPalette';
import { useSearchUserInput } from '../contexts/SearchUserInput';
import { useSettings } from '../contexts/Settings';
import {
    addSearchResultHighlightedSymbol,
    clearSearchResultHighlightedSymbol,
    unsetRecentSearchResultHighlightedSymbol,
    useTransformations,
} from '../contexts/transformations';
import { pixelToEm } from '../utils';
import { NavigationArea } from './NavigationArea.react';
import './search.css';
import { Suggestion } from './SearchResult.react';

function middlewareAddSearchResultHighlightedSymbol(
    dispatchT,
    searchResult,
    color
) {
    if (typeof searchResult === 'undefined') {
        return;
    }

    dispatchT(addSearchResultHighlightedSymbol(searchResult, color));

    setTimeout(() => {
        dispatchT(unsetRecentSearchResultHighlightedSymbol(searchResult));
    }, Constants.searchResultHighlightDuration);
}

const SearchInput = styled.input`
    color: ${(props) => props.$colorPalette.light};
    background-color: ${({$colorPalette, $isHovered}) =>
        $isHovered
            ? darken(Constants.hoverColorDarkenFactor, $colorPalette.primary)
            : $colorPalette.primary};

    width: 100%;
    border-radius: 0.4em;
    padding: 0.7em 3em 0.7em 0.8em;
    border: 0px;

    &:focus {
        outline: none;
    }
`;

const ResultsListUL = styled.ul`
    list-style: none;
    right: 0;
    left: 0;
    margin-top: 0;
    margin-left: 0;
    padding-left: 0em;
    padding-right: 0em;
    margin-bottom: 1px;
    border-radius: 0.7em;
    overflow-x: hidden;
    overflow-y: auto;
    max-height: ${(props) => (props.$isVisible ? '8em' : '0')};
    transition: max-height 0.3s ease-out;
    -ms-overflow-style: none; /* Internet Explorer 10+ */
    scrollbar-width: none; /* Firefox */
    &::-webkit-scrollbar { /* Safari and Chrome */
        display: none;
    }
`;

const AutocompleteResultsUL = styled(ResultsListUL)`
    background-color: ${(props) =>
        lighten(
            Constants.hoverColorLightenFactor,
            props.$colorPalette.primary
        )};
    color: ${(props) => props.$colorPalette.light};
`;

const SearchResultsUL = styled(ResultsListUL)`
    background-color: ${(props) => props.$colorPalette.primary};
    color: ${(props) => props.$colorPalette.light};
`;

const SearchInputContainerDiv = styled.div`
    justify-content: end;
    align-items: center;
    display: flex;
`;

const SearchBarDiv = styled.div`
    width: ${(props) => props.$inputWidth}em;
    position: relative;
`;

const SearchDiv = styled.div`
    display: flex;
    justify-content: end;
`;

function calculateTextWidth(text) {
    const span = document.createElement('span');
    span.style.visibility = 'hidden';
    span.style.whiteSpace = 'pre';
    span.style.position = 'absolute';
    span.style.padding = '0.7em 3em 0.7em 0.8em';
    span.textContent = text;
    document.body.appendChild(span);
    const width = span.offsetWidth;
    document.body.removeChild(span);
    return width;
}

function SearchInputComponent(props) {
    const {
        awaitingInput,
        searchResultHighlightedSymbols,
        searchInputRef,
        userInput,
        onChange,
        onKeyDown,
        inputWidth,
    } = props;
    const colorPalette = useColorPalette();
    const [isHovered, setIsHovered] = React.useState(false);

    return (
        <SearchInputContainerDiv
            className="search_input_container"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <SearchInput
                className="txt-elem"
                ref={searchInputRef}
                onChange={onChange}
                onKeyDown={onKeyDown}
                value={userInput}
                $colorPalette={colorPalette}
                $isHovered={isHovered}
                $inputWidth={inputWidth}
                placeholder="query"
                type="text"
            />
            <PulseLoader
                color={colorPalette.light}
                loading={awaitingInput}
                cssOverride={{
                    position: 'absolute',
                    marginRight: '0.8em',
                }}
                size={'0.25em'}
                speedMultiplier={Constants.awaitingInputSpinnerSpeed}
            />
            <NavigationArea
                visible={
                    searchResultHighlightedSymbols.length > 0 &&
                    searchResultHighlightedSymbols.some((s) => s.isAutocomplete)
                }
                searchResult={
                    searchResultHighlightedSymbols.length
                        ? searchResultHighlightedSymbols[0]
                        : null
                }
                searchInputAreaRef={searchInputRef}
            />
        </SearchInputContainerDiv>
    );
}

SearchInputComponent.propTypes = {
    awaitingInput: PropTypes.bool,
    searchResultHighlightedSymbols: PropTypes.array,
    searchInputRef: PropTypes.object,
    userInput: PropTypes.string,
    onChange: PropTypes.func,
    onKeyDown: PropTypes.func,
    inputWidth: PropTypes.number,
};


export function Search() {
    const [activeSuggestion, setActiveSuggestion] = React.useState(0);
    const [filteredSuggestions, setFilteredSuggestions] = React.useState([]);
    const [awaitingInput, setAwaitingInput] = React.useState(false);
    const [isAutocompleteVisible, setIsAutocompleteVisible] =
        React.useState(true);
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [userInput, setUserInput] = useSearchUserInput();
    const [inputWidth, setInputWidth] = React.useState(
        Constants.minSearchInputWidthInEm
    );
    const {
        dispatch: dispatchT,
        state: {searchResultHighlightedSymbols},
    } = useTransformations();
    const {backendURL} = useSettings();
    const colorPalette = useColorPalette();
    const suggestionRefs = React.useRef([]);
    const searchInputRef = React.useRef(null);

    let suggestionsListComponent;
    let abortController = new AbortController();

    const fetchSuggestions = (userInput) => {
        abortController.abort();
        abortController = new AbortController();
        fetch(`${backendURL('query')}?q=${encodeURIComponent(userInput)}`, {
            signal: abortController.signal,
        })
            .then((r) => r.json())
            .then((data) => {
                const indexOfUserInputInSuggestions = data.findIndex(
                    (s) => s.repr === userInput
                );
                if (
                    indexOfUserInputInSuggestions !== -1 &&
                    !data[indexOfUserInputInSuggestions].hideInSuggestions
                ) {
                    // exact match
                    setFilteredSuggestions([]);
                    selectAutocomplete(data[indexOfUserInputInSuggestions]);
                } else {
                    // show suggestions
                    setIsAutocompleteVisible(
                        data.some((s) => s.isAutocomplete)
                    );
                    setAwaitingInput(data.some((s) => s.awaitingInput));
                    setActiveSuggestion(0);
                    if (searchResultHighlightedSymbols.length > 0) {
                        dispatchT(clearSearchResultHighlightedSymbol());
                    }
                    setFilteredSuggestions(
                    data.filter((s) => !s.hideInSuggestions)
                    );
                    setShowSuggestions(true);
                }
            });
    };


    function onChange(e) {
        const userInput = e.currentTarget.value;
        setUserInput(userInput);

        if (userInput === '') {
            setAwaitingInput(false);
            setFilteredSuggestions([]);
        } else {
            fetchSuggestions(userInput);
        }
    }

    function selectAutocomplete(searchResultSuggestion) {
        middlewareAddSearchResultHighlightedSymbol(
            dispatchT,
            searchResultSuggestion,
            colorPalette.explanationHighlights
        );
        setUserInput(searchResultSuggestion.repr);
        setAwaitingInput(false);
        setShowSuggestions(false);
        setFilteredSuggestions([]);
        if (searchInputRef.current) {
            const inputLength = searchResultSuggestion.repr.length;
            searchInputRef.current.setSelectionRange(inputLength, inputLength);
        }
    }

    function select(searchResultSuggestion) {
        middlewareAddSearchResultHighlightedSymbol(
            dispatchT,
            searchResultSuggestion,
            colorPalette.explanationHighlights
        );
    }

    function reset() {
        setActiveSuggestion(0);
        setFilteredSuggestions([]);
        setShowSuggestions(false);
        dispatchT(clearSearchResultHighlightedSymbol());
        setUserInput('');
    }

    function onKeyDown(e) {
        if (e.keyCode === Constants.KEY_ENTER) {
            if (isAutocompleteVisible) {
                selectAutocomplete(filteredSuggestions[activeSuggestion]);
            } else {
                select(filteredSuggestions[activeSuggestion]);
            }
        } else if (e.keyCode === Constants.KEY_UP) {
            e.preventDefault();
            if (activeSuggestion === -1) {
                return;
            }
            setActiveSuggestion(activeSuggestion - 1);
        } else if (e.keyCode === Constants.KEY_DOWN) {
            if (activeSuggestion + 1 === filteredSuggestions.length) {
                return;
            }
            setActiveSuggestion(activeSuggestion + 1);
        }
    }

    const handleMouseOver = (index) => {
        setActiveSuggestion(index);
    };

    React.useEffect(() => {
        if (suggestionRefs.current[activeSuggestion]) {
            suggestionRefs.current[activeSuggestion].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            });
        }
    }, [activeSuggestion]);

    React.useEffect(() => {
        const calculateWidth = () => {
            const inputWidth = calculateTextWidth(userInput);
            const suggestionsWidth = filteredSuggestions.reduce(
                (maxWidth, suggestion) => {
                    const suggestionWidth = calculateTextWidth(suggestion.repr);
                    return Math.max(maxWidth, suggestionWidth);
                },
                0
            );
            const newWidth =
                pixelToEm(Math.max(inputWidth, suggestionsWidth)) + 2;
            setInputWidth(
                Math.min(
                    Math.max(newWidth, Constants.minSearchInputWidthInEm),
                    Constants.maxSearchInputWidthInEm
                )
            );
        };

        calculateWidth();
    }, [userInput, filteredSuggestions]);

    if (userInput) {
        if (filteredSuggestions.length) {
            if (isAutocompleteVisible) {
                suggestionsListComponent = (
                    <AutocompleteResultsUL
                        className="results-list"
                        $colorPalette={colorPalette}
                        $isVisible={showSuggestions}
                    >
                        {filteredSuggestions.map((suggestion, index) => {
                            return (
                                <Suggestion
                                    active={index === activeSuggestion}
                                    key={index}
                                    value={suggestion}
                                    select={selectAutocomplete}
                                    ref={(el) =>
                                        (suggestionRefs.current[index] = el)
                                    }
                                    mouseHoverCallback={() =>
                                        handleMouseOver(index)
                                    }
                                    isAutocompleteSuggestion
                                />
                            );
                        })}
                    </AutocompleteResultsUL>
                );
            } else {
                suggestionsListComponent = (
                    <SearchResultsUL
                        className="results-list"
                        $colorPalette={colorPalette}
                        $isVisible={showSuggestions}
                    >
                        {filteredSuggestions.map((suggestion, index) => {
                            const findIndexOfSelectedInSuggestions =
                                searchResultHighlightedSymbols.findIndex(
                                    (s) => s.repr === suggestion.repr
                                );
                            return (
                                <Suggestion
                                    active={index === activeSuggestion}
                                    key={index}
                                    value={suggestion}
                                    select={select}
                                    ref={(el) =>
                                        (suggestionRefs.current[index] = el)
                                    }
                                    mouseHoverCallback={() =>
                                        handleMouseOver(index)
                                    }
                                    isAutocompleteSuggestion={false}
                                    isSelectedResult={
                                        findIndexOfSelectedInSuggestions !== -1
                                    }
                                />
                            );
                        })}
                    </SearchResultsUL>
                );
            }
        } else {
            suggestionsListComponent =  <SearchResultsUL
                        className="results-list"
                        $colorPalette={colorPalette}
                        $isVisible={false}
                    />;
            // suggestionsListComponent = <div className="no-suggestions" />;
        }
    }
    return (
        <SearchDiv className="search">
            <SearchBarDiv className="search_bar" $inputWidth={inputWidth}>
                <SearchInputComponent
                    awaitingInput={awaitingInput}
                    searchResultHighlightedSymbols={searchResultHighlightedSymbols}
                    searchInputRef={searchInputRef}
                    userInput={userInput}
                    onChange={onChange}
                    onKeyDown={onKeyDown}
                    inputWidth={inputWidth}
                    />
                {suggestionsListComponent}
            </SearchBarDiv>
        </SearchDiv>
    );
}

Search.propTypes = {};
