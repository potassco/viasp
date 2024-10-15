import React, {Suspense} from 'react';
import "./search.css";
import * as Constants from "../constants";
import {Suggestion} from "./SearchResult.react";
import PropTypes from "prop-types";
import {useHighlightedNode} from "../contexts/HighlightedNode";
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
    unsetRecentSearchResultHighlightedSymbol
} from '../contexts/transformations';
import {useColorPalette} from "../contexts/ColorPalette";
import { useShownDetail } from "../contexts/ShownDetail";
import IconWrapper from './IconWrapper.react';
import {styled} from 'styled-components';


function ActiveFilters() {
    const [{activeFilters},] = useFilters();
    const {state: {searchResultHighlightedSymbols}} = useTransformations();
    return (
        <ul className="active_filters_list">
            {activeFilters.length === 0
                ? null
                : activeFilters.map((filter, index) => {
                      return <ActiveFilter key={index} filter={filter} />;
                  })}
            {searchResultHighlightedSymbols.length === 0
                ? null
                : searchResultHighlightedSymbols.map((searchResult, index) => {
                      return (
                          <ActiveHighlight
                              key={index}
                              searchResult={searchResult}
                          />
                      );
                  })}
        </ul>
    );

}

function CloseButton(props) {
    const {onClose} = props;
    const colorPalette = useColorPalette();
                                
    return (
        <IconWrapper
            icon="close"
            height="15px"
            color={colorPalette.light}
            className="close"
            onClick={onClose}
        />
    );
}

CloseButton.propTypes = {
    /**
     * The function to call when the close button is clicked.
     */
    onClose: PropTypes.func
}

function NextButton(props) {
    const {onForward, disabled} = props;
    const colorPalette = useColorPalette();

    return (
        <IconWrapper
            icon="navigateNext"
            height="15px"
            color={disabled ? colorPalette.dark : colorPalette.light}
            onClick={disabled ? null : onForward}
        />
    );
}

NextButton.propTypes = {
    /**
     * The function to call when the forward button is clicked.
     * */
    onForward: PropTypes.func,
    /**
     * Whether the forward button is disabled.
     * */
    disabled: PropTypes.bool,
}

function PrevButton(props) {
    const {onBackward, disabled} = props;
    const colorPalette = useColorPalette();

    return (
        <IconWrapper
            icon="navigateNext"
            height="15px"
            flip="horizontal"
            color={disabled ? colorPalette.dark : colorPalette.light}
            onClick={disabled ? null : onBackward}
        />
    );
}

PrevButton.propTypes = {
    /**
     * The function to call when the backward button is clicked.
     * */
    onBackward: PropTypes.func,
    /**
     * Whether the backward button is disabled.
     * */
    disabled: PropTypes.bool,
}

function ActiveFilter(props) {
    const {filter} = props;
    const [, dispatch] = useFilters();
    const colorPalette = useColorPalette();
    const classes = ["filter", "search_row", "txt-elem"];
    if (filter._type === "Transformation") {
        classes.push("search_rule")
    }
    if (filter._type === "Node") {
        classes.push("search_node")
    }
    if (filter._type === "Signature") {
        classes.push("search_signature")
    }
    function onClose() {
        dispatch(clear(filter))
    }

    return <li style={{backgroundColor: colorPalette.primary, color: colorPalette.light}} className={classes.join(" ")}
               key={filter.name}>{filter.name}/{filter.args}<CloseButton
        onClose={onClose}/>
    </li>
}

ActiveFilter.propTypes = {
    filter: PropTypes.oneOfType([TRANSFORMATION, NODE, SIGNATURE])
}

const HighlightRowLi = styled.li`
    background-color: ${(props) => props.$colorPalette.primary};
    color: ${(props) => props.$colorPalette.light};
    cursor: pointer;
    border-radius: 0.4em;
    left: 0;
    padding-left: 0.8em;
    list-style-type: none;
`;

const FilterHighlightContentDiv = styled.div`
    display: flex;
    justify-content: space-between;
    width: 100%;
    padding: 0.2em;
    align-items: center;
    height: 100%;
`;

const AtomStringSpan = styled.span`
    flex-grow: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

function ActiveHighlight(props) {
    const {searchResult} = props;
    const {dispatch: dispatchT} = useTransformations();
    const colorPalette = useColorPalette();

    function onClose() {
        dispatchT(removeSearchResultHighlightedSymbol(searchResult));
    }

    const [timeoutId, setTimeoutId] = React.useState(null);
    function onRotate(direction) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        dispatchT(rotateSearchResultHighlightedSymbol(searchResult, direction));
        const newTimeoutId = setTimeout(() => {
            dispatchT(unsetRecentSearchResultHighlightedSymbol(searchResult));
        }, Constants.searchResultHighlightDuration);
        setTimeoutId(newTimeoutId);
    }

    return (
        <HighlightRowLi
            className="txt-elem"
            key={searchResult}
            $colorPalette={colorPalette}
        >
            <FilterHighlightContentDiv className="filter-highlight-content">
                <AtomStringSpan>{searchResult.repr}</AtomStringSpan>
                <PrevButton
                    onBackward={() => {
                        onRotate(-1);
                    }}
                    disabled={searchResult.selected < 1}
                />
                <NextButton
                    onForward={() => {
                        onRotate(+1);
                    }}
                    disabled={
                        searchResult.selected + 1 >=
                        searchResult.includes.length
                    }
                />
                <CloseButton onClose={onClose} />
            </FilterHighlightContentDiv>
        </HighlightRowLi>
    );
}

ActiveHighlight.propTypes = {
    searchResult: SEARCHRESULTSYMBOLWRAPPER,
};

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

export function Search() {
    const [activeSuggestion, setActiveSuggestion] = React.useState(0);
    const [filteredSuggestions, setFilteredSuggestions] = React.useState([]);
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [userInput, setUserInput] = React.useState("");
    const [, setHighlightedNode] = useHighlightedNode();
    const setHighlightedNodeRef = React.useRef(setHighlightedNode)
    const [, dispatch] = useFilters();
    const {
        dispatch: dispatchT,
        state: {searchResultHighlightedSymbols},
    } = useTransformations();
    const {backendURL} = useSettings();
    const colorPalette = useColorPalette();
    const { setShownDetail } = useShownDetail();
    const suggestionRefs = React.useRef([]);


    const style = {
        background: colorPalette.primary,
        color: colorPalette.light,
    };

    let suggestionsListComponent;
    React.useEffect(() => {
        const highlighted = filteredSuggestions[activeSuggestion]

        if (highlighted && highlighted._type === "Node") {
            setHighlightedNodeRef.current(highlighted.uuid);
        }
    }, [activeSuggestion, filteredSuggestions])

    function onChange(e) {
        const userInput = e.currentTarget.value;
        setUserInput(userInput);
        fetch(`${backendURL("query")}?q=${userInput}`)
        .then(r => r.json())
        .then(data => {
            setActiveSuggestion(0)
            const activeSearchResultHighlights = new Set(searchResultHighlightedSymbols.map(s => s.repr));
            const filtered = data.filter(
                (s) => !activeSearchResultHighlights.has(s.repr)
            );
            setFilteredSuggestions(filtered)
            setShowSuggestions(true)
            })
    }


    function handleSelection(selection) {
        if (selection._type === "Signature") {
            dispatch(addSignature(selection));
        }
        if (selection._type === "Node") {
            setShownDetail(selection.uuid);
        }
        if (selection._type === "Transformation") {
            dispatchT(showOnlyTransformation(selection));
        }
        if (selection._type === 'SearchResultSymbolWrapper') {
            middlewareAddSearchResultHighlightedSymbol(dispatchT, selection, colorPalette.explanationHighlights);
        }
    }

    function select(transformation) {
        handleSelection(transformation)
        reset()
    }


    function reset() {
        setActiveSuggestion(0)
        setFilteredSuggestions([])
        setShowSuggestions(false)
        setUserInput("")
    }

    function onKeyDown(e) {
        if (e.keyCode === Constants.KEY_ENTER) {
            select(filteredSuggestions[activeSuggestion])
            setHighlightedNode(null);
        } else if (e.keyCode === Constants.KEY_UP) {
            e.preventDefault()
            if (activeSuggestion === 0) {
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
            suggestionsListComponent = (
                <ul
                    className="search_result_list"
                    style={{
                        backgroundColor: colorPalette.primary,
                        color: colorPalette.light,
                    }}
                >
                    {filteredSuggestions.map((suggestion, index) => {
                        return (
                            <Suggestion
                                active={index === activeSuggestion}
                                key={index}
                                value={suggestion}
                                select={select}
                                ref={(el) =>
                                    (suggestionRefs.current[index] = el)
                                }
                            />
                        );
                    })}
                </ul>
            );
        } else {
            suggestionsListComponent = <div className="no-suggestions" />;
        }
    }
    return (
        <div className="search">
            <div className="search_content">
                <div className="search_input_container">
                    <SearchInput
                        className="txt-elem"
                        onChange={onChange}
                        onKeyDown={onKeyDown}
                        value={userInput}
                        $colorPalette={colorPalette}
                        placeholder="query"
                        type="text"
                    />
                </div>
                <ActiveFilters />
                {suggestionsListComponent}
            </div>
        </div>
    );
}


Search.propTypes = {}
