import React from 'react';
import "./search.css";
import * as Constants from "../constants";
import {Suggestion} from "./SearchResult.react";
import PropTypes from "prop-types";
import {useSettings} from "../contexts/Settings";
import {addSignature, clear, useFilters} from "../contexts/Filters";
import {
    NODE,
    SIGNATURE,
    SEARCHRESULTSYMBOLWRAPPER,
    TRANSFORMATION,
} from '../types/propTypes';
import {
    showOnlyTransformation,
    useTransformations,
    addSearchResultHighlightedSymbol,
    removeSearchResultHighlightedSymbol,
    rotateSearchResultHighlightedSymbol,
    unsetRecentSearchResultHighlightedSymbol,
    clearSearchResultHighlightedSymbol,
} from '../contexts/transformations';
import {useColorPalette} from "../contexts/ColorPalette";
import { useShownDetail } from "../contexts/ShownDetail";
import IconWrapper from './IconWrapper.react';
import {styled} from 'styled-components';
import PulseLoader from 'react-spinners/PulseLoader';
import {NavigationArea, CloseButton} from "./NavigationArea.react";

function middlewareAddSearchResultHighlightedSymbol(dispatchT, searchResult, color) {
    dispatchT(addSearchResultHighlightedSymbol(searchResult, color));

    setTimeout(() => {
        dispatchT(unsetRecentSearchResultHighlightedSymbol(searchResult));
    }, Constants.searchResultHighlightDuration);
}

const SearchInput = styled.input`
    background-color: ${(props) => props.$colorPalette.primary};
    color: ${(props) => props.$colorPalette.light};
    width: 100%;
    border-radius: 0.4em;
    padding: 0.7em 0.4em 0.7em 0.8em;
    border: 0px;

    &:focus {
        outline: none;
    }
`;

const AutocompleteResultsUL = styled.ul`
    position: absolute;
    z-index: 30;
    list-style: none;
    right: 0;
    left: 0;
    margin-top: 0;
    margin-left: 0;
    padding-left: 1.2em;
    padding-right: 0.2em;
    margin-bottom: 1px;
    border-radius: 0.7em;
    overflow-x: hidden;
    overflow-y: auto;
    max-height: 8em;
    background-color: ${(props) => props.$colorPalette.light};
    color: ${(props) => props.$colorPalette.dark};
`

const SearchResultsUL = styled(AutocompleteResultsUL)`
    background-color: ${(props) => props.$colorPalette.primary};
    color: ${(props) => props.$colorPalette.light};
`;

const SearchInputContainerDiv = styled.div`
    justify-content: end;
    align-items: center;
    display: flex;
`;

const SearchContentDiv = styled.div`
    width: 100%;
    border-radius: 0.4em;
    background-color: ${(props) => props.$colorPalette.primary};
`;

export function Search() {
    const [activeSuggestion, setActiveSuggestion] = React.useState(0);
    const [filteredSuggestions, setFilteredSuggestions] = React.useState([]);
    const [awaitingInput, setAwaitingInput] = React.useState(false);
    const [isAutocompleteVisible, setIsAutocompleteVisible] = React.useState(true);
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [userInput, setUserInput] = React.useState("");
    const {
        dispatch: dispatchT,
        state: {searchResultHighlightedSymbols},
    } = useTransformations();
    const {backendURL} = useSettings();
    const colorPalette = useColorPalette();
    const suggestionRefs = React.useRef([]);
    const searchInputRef = React.useRef(null);


    let suggestionsListComponent;

    function onChange(e) {
        const userInput = e.currentTarget.value;
        setUserInput(userInput);
        if (userInput === "") {
            setAwaitingInput(false);
        }
        else {
            fetch(`${backendURL('query')}?q=${encodeURIComponent(userInput)}`)
                .then((r) => r.json())
                .then((data) => {
                    const indexOfUserInputInSuggestions = data.findIndex(s => s.repr === userInput);
                    if (indexOfUserInputInSuggestions !== -1 && !data[indexOfUserInputInSuggestions].hideInSuggestions) {
                        // exact match
                        setFilteredSuggestions([]);
                        selectAutocomplete(data[indexOfUserInputInSuggestions]);
                    }
                    else {
                        // show suggestions
                        setIsAutocompleteVisible(
                            data.some((s) => s.isAutocomplete)
                        );
                        setAwaitingInput(data.some((s) => s.awaitingInput));
                        setActiveSuggestion(0);
                        dispatchT(clearSearchResultHighlightedSymbol());
                        setFilteredSuggestions(
                            data.filter((s) => !s.hideInSuggestions)
                        );
                        setShowSuggestions(true);
                    }
                });
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
    }

    function select(searchResultSuggestion) {
        middlewareAddSearchResultHighlightedSymbol(
            dispatchT,
            searchResultSuggestion,
            colorPalette.explanationHighlights
        );
    }

    function reset() {
        setActiveSuggestion(0)
        setFilteredSuggestions([])
        setShowSuggestions(false)
        dispatchT(clearSearchResultHighlightedSymbol())
        setUserInput("")
    }

    function onKeyDown(e) {
        if (e.keyCode === Constants.KEY_ENTER) {
            if (isAutocompleteVisible) {
                selectAutocomplete(filteredSuggestions[activeSuggestion])
            }
            else {
                select(filteredSuggestions[activeSuggestion])
            }
        } else if (e.keyCode === Constants.KEY_UP) {
            e.preventDefault()
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

    if (showSuggestions && userInput) {
        if (filteredSuggestions.length) {
            if (isAutocompleteVisible) {
                suggestionsListComponent = (
                    <AutocompleteResultsUL $colorPalette={colorPalette}>
                        {filteredSuggestions.map((suggestion, index) => {
                            return (
                                <Suggestion
                                    active={index === activeSuggestion}
                                    key={index}
                                    value={suggestion}
                                    select={selectAutocomplete}
                                    userInput={userInput}
                                    ref={(el) =>
                                        (suggestionRefs.current[index] = el)
                                    }
                                    mouseHoverCallback={() =>
                                        handleMouseOver(index)
                                    }
                                    isAutocompleteSuggestion={true}
                                />
                            );
                        })}
                    </AutocompleteResultsUL>
                );
            }
            else {
                suggestionsListComponent = (
                    <SearchResultsUL $colorPalette={colorPalette}>
                        {filteredSuggestions.map((suggestion, index) => {
                            const findIndexOfSelectedInSuggestions = searchResultHighlightedSymbols.findIndex(s => s.repr === suggestion.repr)
                            return (
                                <Suggestion
                                    active={index === activeSuggestion}
                                    key={index}
                                    value={suggestion}
                                    select={select}
                                    userInput={userInput}
                                    ref={(el) =>
                                        (suggestionRefs.current[index] = el)
                                    }
                                    mouseHoverCallback={() =>
                                        handleMouseOver(index)
                                    }
                                    isAutocompleteSuggestion={false}
                                    isSelectedResult={
                                        index ===
                                        findIndexOfSelectedInSuggestions
                                    }
                                />
                            );
                        })}
                    </SearchResultsUL>
                );
            }
        } else {
            suggestionsListComponent = <div className="no-suggestions" />;
        }
    }
    return (
        <div className="search">
            <SearchContentDiv
                className="search_content"
                $colorPalette={colorPalette}
            >
                <SearchInputContainerDiv className="search_input_container">
                    <SearchInput
                        className="txt-elem"
                        ref={searchInputRef}
                        onChange={onChange}
                        onKeyDown={onKeyDown}
                        value={userInput}
                        $colorPalette={colorPalette}
                        placeholder="query"
                        type="text"
                    />
                    <PulseLoader
                        color={colorPalette.light}
                        loading={awaitingInput}
                        cssOverride={{
                            position: 'absolute',
                            marginRight: '0.2em',
                        }}
                        size={'0.25em'}
                        speedMultiplier={Constants.awaitingInputSpinnerSpeed}
                    />
                    <NavigationArea
                        visible={searchResultHighlightedSymbols.length > 0 && searchResultHighlightedSymbols.some(s => s.isAutocomplete)}
                        searchResult={searchResultHighlightedSymbols.length ? searchResultHighlightedSymbols[0]:null}
                        searchInputAreaRef={searchInputRef}
                    />
                </SearchInputContainerDiv>
                {suggestionsListComponent}
            </SearchContentDiv>
        </div>
    );
}


Search.propTypes = {}
