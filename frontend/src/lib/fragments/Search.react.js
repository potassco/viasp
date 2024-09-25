import React, {Suspense} from 'react';
import "./search.css";
import * as Constants from "../constants";
import {Suggestion} from "./SearchResult.react";
import PropTypes from "prop-types";
import {useHighlightedNode} from "../contexts/HighlightedNode";
import {useSettings} from "../contexts/Settings";
import {addSignature, clear, useFilters} from "../contexts/Filters";
import {NODE, SIGNATURE, SYMBOL, TRANSFORMATION} from "../types/propTypes";
import {showOnlyTransformation, useTransformations, addAtom, removeAtom} from "../contexts/transformations";
import {useColorPalette} from "../contexts/ColorPalette";
import { useShownDetail } from "../contexts/ShownDetail";
import { make_atoms_string } from '../utils';
import { useHighlightedSymbol } from '../contexts/HighlightedSymbol';
import {darken} from 'polished';
import IconWrapper from './IconWrapper.react';


function ActiveFilters() {
    const [{activeFilters},] = useFilters();
    const {state: {highlightedAtoms: activeHighlights}} = useTransformations();
    return (
        <ul className="active_filters_list">
            {activeFilters.length === 0 ? null :
                activeFilters.map((filter, index) => {
                return <ActiveFilter key={index} filter={filter} />;
            })}
            {activeHighlights.length === 0 ? null :
                activeHighlights.map((atom, index) => {
                    return <ActiveHighlight key={index} atom={atom} />;
                })}
        </ul>
    );

}

function CloseButton(props) {
    const {onClose} = props;
    const colorPalette = useColorPalette();
    return <span style={{color: colorPalette.light}} className='close' onClick={onClose}>X</span>
}

CloseButton.propTypes = {
    /**
     * The function to call when the close button is clicked.
     */
    onClose: PropTypes.func
}

function ActiveFilter(props) {
    const {filter} = props;
    const [, dispatch] = useFilters();
    const colorPalette = useColorPalette();
    const classes = ["filter", "search_row"]
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

function ActiveHighlight(props) {
    const {atom} = props;
    const {dispatch} = useTransformations();
    const colorPalette = useColorPalette();
    function onClose() {
        dispatch(removeAtom(atom))
    }
    return (
        <li
            style={{
                backgroundColor: colorPalette.primary,
                color: colorPalette.light,
            }}
            className="filter search_row"
            key={atom}
        >
            <div className="filter_highlight_content">
                <span className="atom_string">{make_atoms_string(atom)}</span>
                <CloseButton onClose={onClose} />
            </div>
        </li>
    );
}

ActiveHighlight.propTypes = {
    atom: SYMBOL
}


export function Search() {
    const [searchActivated, setSearchActivated] = React.useState(false);
    const [activeSuggestion, setActiveSuggestion] = React.useState(0);
    const [filteredSuggestions, setFilteredSuggestions] = React.useState([]);
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [userInput, setUserInput] = React.useState("");
    const [, setHighlightedNode] = useHighlightedNode();
    const setHighlightedNodeRef = React.useRef(setHighlightedNode)
    const [, dispatch] = useFilters();
    const {dispatch: dispatchT} = useTransformations()
    const {backendURL} = useSettings();
    const colorPalette = useColorPalette();
    const { setShownDetail } = useShownDetail();
    const suggestionRefs = React.useRef([]);
    const {state: {shownRecursion}} =  useTransformations();
    const {
        highlightedSymbol: compareHighlightedSymbol,
        highlightedRule: compareHighlightedRule,
        backgroundHighlightColor: compareBackgroundHighlightColor,
        ruleDotHighlightColor: compareRuleDotHighlightColor,
        toggleReasonOf,
    } = useHighlightedSymbol();

    const [isHovered, setIsHovered] = React.useState(false);
    const [isClicked, setIsClicked] = React.useState(false);

    const style = {
        background: colorPalette.primary,
        color: colorPalette.light,
    };

    if (isHovered) {
        style.background = darken(Constants.hoverFactor, style.background);
    }
    if (isClicked) {
        style.background = colorPalette.infoBackground;
    }

    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => setIsHovered(false);
    const handleMouseDown = () => setIsClicked(true);
    const handleMouseUp = () => setIsClicked(false);


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
            setFilteredSuggestions(data)
            setShowSuggestions(true)
            })
    }


    function select(transformation) {
        handleSelection(transformation)
        reset()
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
        if (selection._type === "Function") {
            dispatchT(addAtom(selection));
            // toggleReasonOf(
            //     selection.atom.uuid,
            //     selection.node,
            //     compareHighlightedSymbol,
            //     compareHighlightedRule,
            //     compareBackgroundHighlightColor,
            //     compareRuleDotHighlightColor
            // );
        }
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
            {!searchActivated ? (
                <span
                    onClick={() => setSearchActivated(!searchActivated)}
                    className="search_content open_search_input_btn txt-elem noselect toggle_part unselected"
                    style={style}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                >
                    <Suspense fallback={<div>...</div>}>
                        <IconWrapper icon="search" height="20px" />
                    </Suspense>
                </span>
            ) : (
                <div className="search_content">
                    <div className="search_input_container">
                        <input
                            className="search_input"
                            type="text"
                            onChange={onChange}
                            onKeyDown={onKeyDown}
                            value={userInput}
                        />
                        <span
                            className="clear_search_input_btn"
                            onClick={() => {setSearchActivated(false); setUserInput(""); setActiveSuggestion(0);}}
                            style={{
                                color: colorPalette.dark,
                            }}
                        >
                            <Suspense fallback={<div>x</div>}>
                                <IconWrapper icon="close" height="15px" />
                            </Suspense>
                        </span>
                    </div>
                    <ActiveFilters />
                    {suggestionsListComponent}
                </div>
            )}
        </div>
    );
}


Search.propTypes = {}
