import React from 'react';
import PropTypes from 'prop-types';
import {styled} from 'styled-components';
import {
    NODE,
    SIGNATURE,
    TRANSFORMATION,
    SYMBOLHIGHLIGHTS_RECOIL,
} from '../types/propTypes';
import {darken, lighten} from 'polished';
import { Constants } from "../constants";
import {NavigationArea} from './NavigationArea.react';

import {useRecoilValue, useSetRecoilState} from 'recoil';
import {colorPaletteState} from '../atoms/settingsState';
import {
    filteredSuggestionsState,
    showSuggestionsState,
    isAutocompleteVisibleState,
    activeSuggestionState,
    selectedSuggestionState,
} from '../atoms/searchState';

const SuggestionTextSpan = styled.span`
    margin-left: 0.8em;
    padding-right: 3em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    direction: rtl;
    text-align: left;
`;

function SuggestionContent(props) {
    const {value} = props;
    const display = value.repr;

    return (
        <SuggestionTextSpan className="txt-elem">{display}</SuggestionTextSpan>
    );
}

SuggestionContent.propTypes = {
    /**
     * The Search Result to be displayed, either a Transformation, a Node or a Signature
     */
    value: SYMBOLHIGHLIGHTS_RECOIL,
};

const SearchRowLi = styled.li`
    background-color: ${(props) => props.$backgroundColor};
    padding: 0.7em 0;
    justify-content: begin;
    align-items: center;
    display: flex;

    &.active {
        background-color: ${(props) =>
            darken(Constants.hoverColorDarkenFactor, props.$backgroundColor)};
    }
`;

const ActiveSearchResultDiv = styled.div`
    position: relative;
    display: flex;
    justify-content: space-between;
    width: 100%;
    align-items: center;
    height: 100%;
    padding-right: 3em;
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
    &::-webkit-scrollbar {
        /* Safari and Chrome */
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

export function SearchResultSuggestionsList(props) {
    const {select} = props;
    const filteredSuggestions = useRecoilValue(filteredSuggestionsState);
    const isAutocompleteVisible = useRecoilValue(isAutocompleteVisibleState);
    const colorPalette = useRecoilValue(colorPaletteState);
    const showSuggestions = useRecoilValue(showSuggestionsState);
    const setActiveSuggestion = useSetRecoilState(activeSuggestionState);
    const selectedSuggestion = useRecoilValue(selectedSuggestionState);
        


    if (!filteredSuggestions.length) {
        return (
            <SearchResultsUL
                className="results-list"
                $colorPalette={colorPalette}
                $isVisible={false}
            />
        );
    }
    if (isAutocompleteVisible) {
        return (
            <AutocompleteResultsUL
                className="results-list"
                $colorPalette={colorPalette}
                $isVisible={showSuggestions}
            >
                {filteredSuggestions.map((suggestion, index) => {
                    return (
                        <Suggestion
                            key={index}
                            index={index}
                            value={suggestion}
                            select={() => {select(index)}}
                            mouseHoverCallback={() =>
                                setActiveSuggestion(index)
                            }
                            isAutocompleteSuggestion
                        />
                    );
                })}
            </AutocompleteResultsUL>
        );
    }
    return (
        <SearchResultsUL
            className="results-list"
            $colorPalette={colorPalette}
            $isVisible={showSuggestions}
        >
            {filteredSuggestions.map((suggestion, index) => (
                <Suggestion
                        key={index}
                        index={index}
                        value={suggestion}
                        select={() => {
                            select(index);
                        }}
                        mouseHoverCallback={() => setActiveSuggestion(index)}
                        isAutocompleteSuggestion={false}
                        isSelectedResult={selectedSuggestion === index}
                    />
            ))}
        </SearchResultsUL>
    );
}

SearchResultSuggestionsList.propTypes = {
    /**
     * onClick Callback
     */
    select: PropTypes.func,
};

export function Suggestion(props) {
    const {
        value,
        index,
        select,
        mouseHoverCallback,
        isAutocompleteSuggestion,
        isSelectedResult,
    } = props;
    const colorPalette = useRecoilValue(colorPaletteState);
    const activeSuggestion = useRecoilValue(activeSuggestionState);
    const SearchRowRef = React.useRef(null);

    const classes = ['search_row'];
    if (index === activeSuggestion) {
        classes.push('active');
    }


    React.useEffect(() => {
        if (index === activeSuggestion) {
            SearchRowRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            });
        }
    }, [activeSuggestion, index]);


    return (
        <SearchRowLi
            className={classes.join(' ')}
            name={value.repr}
            $backgroundColor={
                isAutocompleteSuggestion
                    ? lighten(
                          Constants.hoverColorLightenFactor,
                          colorPalette.primary
                      )
                    : colorPalette.primary
            }
            ref={SearchRowRef}
            onMouseEnter={mouseHoverCallback}
            onClick={isSelectedResult ? null : () => select(value)}
        >
            {!isSelectedResult ? (
                <SuggestionContent value={value} />
            ) : (
                <ActiveSearchResultDiv className="active_search_result">
                    <SuggestionContent value={value} />
                    <NavigationArea
                        className="navigation_area"
                        visible={true}
                        searchInputAreaRef={null}
                    />
                </ActiveSearchResultDiv>
            )}
        </SearchRowLi>
    );
};

Suggestion.propTypes = {
    /**
     * The Search Result to be displayed, either a Transformation, a Node or a Signature
     */
    value: PropTypes.oneOfType([
        SIGNATURE,
        TRANSFORMATION,
        NODE,
        SYMBOLHIGHLIGHTS_RECOIL,
    ]),
    /**
     *  Index of the Suggestion in the Search Results
     */
    index: PropTypes.number,
    /**
     *  onClick Callback
     */
    select: PropTypes.func,
    /**
     *  onMouseHover Callback
     */
    mouseHoverCallback: PropTypes.func,
    /**
     *  Is autocomplete
     */
    isAutocompleteSuggestion: PropTypes.bool,
    /**
     *  Is selected result
     */
    isSelectedResult: PropTypes.bool,
};
