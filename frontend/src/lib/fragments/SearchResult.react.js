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
    const {value} = props;
    let display = "UNKNOWN FILTER"

    if (value._type === 'SearchResultSymbolWrapper') {
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
    value: PropTypes.oneOfType([
        SIGNATURE,
        TRANSFORMATION,
        NODE,
        SEARCHRESULTSYMBOLWRAPPER,
    ]),
};

const SearchRowLi = styledComponents.li`
    background-color: ${(props) => props.$backgroundColor};
    margin-bottom: 0.2em;

    &.active {
        background-color: ${(props) => darken(Constants.hoverColorDarkenFactor, props.$backgroundColor)};
    }
`;

export const Suggestion = React.forwardRef((props, ref) => {
    const {value, active, select, mouseHoverCallback} = props;
    const colorPalette = useColorPalette();

    const classes = ['search_row'];
    if (active) {
        classes.push('active');
    }
    return (
        <SearchRowLi
            className={classes.join(' ')}
            name={[value]}
            $backgroundColor={colorPalette.primary}
            ref={ref}
            onMouseEnter={mouseHoverCallback}
            onClick={() => select(value)}
        >
            <SuggestionContent value={value} />
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
     *  onMouseHover Callback
     */
    mouseHoverCallback: PropTypes.func,
};
