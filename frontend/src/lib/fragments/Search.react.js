import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import PulseLoader from 'react-spinners/PulseLoader';
import {
    SearchDiv,
    SearchBarDiv,
    SearchInputContainerDiv,
    SearchInput,
} from './Search.style';
import { Constants } from "../constants";
import { pixelToEm } from '../utils';
import { NavigationArea } from './NavigationArea.react';
import {SearchResultSuggestionsList} from './SearchResult.react';
import { useRecoilState, useRecoilValue, useRecoilCallback, useResetRecoilState } from 'recoil';
import {symbolSearchHighlightsState} from '../atoms/highlightsState';
import {handleSearchResultSuggestionsCallback} from '../hooks/highlights';
import { colorPaletteState } from '../atoms/settingsState';
import {
    searchInputState,
    filteredSuggestionsState,
    awaitingInputState,
    activeSuggestionState,
    selectedSuggestionState,
    selectedBranchState,
} from '../atoms/searchState';
import { currentSortState } from '../atoms/currentGraphState';

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
        searchInputRef,
        onChange,
        onKeyDown,
        inputWidth,
    } = props;
    const colorPalette = useRecoilValue(colorPaletteState);

    const awaitingInput = useRecoilValue(awaitingInputState);
    const userInput = useRecoilValue(searchInputState);
    const searchResultHighlights = useRecoilValue(
        symbolSearchHighlightsState
    );

    useEffect(() => {
        searchInputRef.current.focus();
    }, [searchInputRef, userInput]);

    return (
        <SearchInputContainerDiv className="search_input_container">
            <SearchInput
                className="txt-elem"
                ref={searchInputRef}
                onChange={onChange}
                onKeyDown={onKeyDown}
                value={userInput}
                $colorPalette={colorPalette}
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
                    searchResultHighlights.length > 0 &&
                    searchResultHighlights.some((s) => s.isAutocomplete)
                }
                searchInputAreaRef={searchInputRef}
            />
        </SearchInputContainerDiv>
    );
}

SearchInputComponent.propTypes = {
    searchInputRef: PropTypes.object,
    onChange: PropTypes.func,
    onKeyDown: PropTypes.func,
    inputWidth: PropTypes.number,
};



export function Search() {
    const [activeSuggestion, setActiveSuggestion] = useRecoilState(activeSuggestionState);
    const filteredSuggestions = useRecoilValue(filteredSuggestionsState);
    const [searchInput, setSearchInput] = useRecoilState(searchInputState);
    const inputWidth = useRef(Constants.minSearchInputWidthInEm);
    const searchInputRef = useRef(null);
    const handleSearchResultSuggestions = useRecoilCallback(
        handleSearchResultSuggestionsCallback, []
    );
    const [selectedSuggestion, setSelectedSuggestion] = useRecoilState(selectedSuggestionState);
    const currentSort = useRecoilValue(currentSortState);
    const resetSelectedBranch = useResetRecoilState(selectedBranchState)
    const selectedBranch = useRecoilValue(selectedBranchState);



    function onChange(e) {
        const userInput = e.currentTarget.value;
        setSearchInput(userInput);
    }

    function select(searchResultSuggestion) {
        setSelectedSuggestion(searchResultSuggestion);
    }

    useEffect(() => {
        setSelectedSuggestion(null);
        setActiveSuggestion(-1);
        resetSelectedBranch();
        handleSearchResultSuggestions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchInput]);

    useEffect(() => {
        resetSelectedBranch();
        handleSearchResultSuggestions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSuggestion]);

    useEffect(() => {
        handleSearchResultSuggestions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentSort, selectedBranch]);

    function onKeyDown(e) {
        if (e.keyCode === Constants.KEY_ENTER) {
            select(activeSuggestion);
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

    // calculate Width of search input
    useEffect(() => {
        const calculateWidth = () => {
            const inputWidthCalculated = calculateTextWidth(searchInput);
            const suggestionsWidth = filteredSuggestions.reduce(
                (maxWidth, suggestion) => {
                    const suggestionWidth = calculateTextWidth(suggestion.repr);
                    return Math.max(maxWidth, suggestionWidth);
                },
                0
            );
            const newWidth =
                pixelToEm(Math.max(inputWidthCalculated, suggestionsWidth)) + 2;
            inputWidth.current = Math.min(
                    Math.max(newWidth, Constants.minSearchInputWidthInEm),
                    Constants.maxSearchInputWidthInEm
                );
        };

        calculateWidth();
    }, [searchInput, filteredSuggestions]);

    
    return (
        <SearchDiv className="search">
            <SearchBarDiv className="search_bar" $inputWidth={inputWidth.current}>
                <SearchInputComponent
                    searchInputRef={searchInputRef}
                    onChange={onChange}
                    onKeyDown={onKeyDown}
                    inputWidth={inputWidth.current}
                />
                {searchInput !== '' ? <SearchResultSuggestionsList 
                    select={select}/> : null}
            </SearchBarDiv>
        </SearchDiv>
    );
}

Search.propTypes = {};
