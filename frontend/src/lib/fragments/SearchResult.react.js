import React from "react";
import PropTypes from "prop-types";
import {
    NODE,
    SIGNATURE,
    TRANSFORMATION,
    SEARCHRESULTSYMBOLWRAPPER,
} from '../types/propTypes';
import { styled as styledComponents } from "styled-components";
import {useColorPalette} from "../contexts/ColorPalette";
import {darken} from 'polished';
import * as Constants from "../constants";


function SuggestionContent(props) {
    const {value, userInput} = props;
    let display = "UNKNOWN FILTER"

    const index = value.repr.toLowerCase().indexOf(userInput.toLowerCase());
    if (index !== -1) {
        display = <>
            <span>{value.repr.substring(0, index)}</span>
            <b>{value.repr.substring(index, index + userInput.length)}</b>
            <span>{value.repr.substring(index + userInput.length)}</span>
        </>
    } else {
        display = value.repr;
    }

    return (
        <span className="txt-elem">
            {display}
        </span>
    );
}


SuggestionContent.propTypes = {
    /**
     * The Search Result to be displayed, either a Transformation, a Node or a Signature
     */
    value: SEARCHRESULTSYMBOLWRAPPER,
    /**
     *  The user input
     */
    userInput: PropTypes.string,
};

const SearchRowLi = styledComponents.li`
    background-color: ${(props) => props.$backgroundColor};
    margin-bottom: 0.2em;

    &.active {
        background-color: ${(props) => darken(Constants.hoverColorDarkenFactor, props.$backgroundColor)};
    }
`;

export const Suggestion = React.forwardRef((props, ref) => {
    const {value, active, select, userInput, mouseHoverCallback, $backgroundColor} = props;
    const colorPalette = useColorPalette();

    const classes = ['search_row'];
    if (active) {
        classes.push('active');
    }
    return (
        <SearchRowLi
            className={classes.join(' ')}
            name={[value]}
            $backgroundColor={$backgroundColor}
            ref={ref}
            onMouseEnter={mouseHoverCallback}
            onClick={() => select(value)}
        >
            <SuggestionContent value={value} userInput={userInput} />
        </SearchRowLi>
    );
});

Suggestion.propTypes = {
    /**
     * The Search Result to be displayed, either a Transformation, a Node or a Signature
     */
    value: PropTypes.oneOfType([
        SIGNATURE,
        TRANSFORMATION,
        NODE,
        SEARCHRESULTSYMBOLWRAPPER,
    ]),
    /**
     *  Whether the result is highlighted or not.
     */
    active: PropTypes.bool,
    /**
     *  onClick Callback
     */
    select: PropTypes.func,
    /**
     *  The user input
     */
    userInput: PropTypes.string,
    /**
     *  onMouseHover Callback
     */
    mouseHoverCallback: PropTypes.func,
    /**
     *  The background color of the suggestion
     */
    $backgroundColor: PropTypes.string,
};
