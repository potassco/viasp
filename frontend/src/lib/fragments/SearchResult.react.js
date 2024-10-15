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


const StyledSuggestion = styledComponents.span`
 &:before {
    color: ${props => props.color};
    background: ${props => props.$background};
    position: absolute;
    left: 0;
    content: '${props => props.content}';
};
`

function SuggestionContent(props) {
    const {value} = props;
    let display = "UNKNOWN FILTER"

    if (value._type === 'SearchResultSymbolWrapper') {
        display = value.repr;
    }

    return (
        <StyledSuggestion className="txt-elem">
            {display}
        </StyledSuggestion>
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

export const Suggestion = React.forwardRef((props, ref) => {
    const {value, active, select} = props;
    const colorPalette = useColorPalette();

    const classes = ['search_row'];
    if (active) {
        classes.push('active');
    }
    return (
        <li
            className={classes.join(' ')}
            name={[value]}
            onClick={() => select(value)}
            style={{
                backgroundColor: classes.includes('active')
                    ? darken(Constants.hoverFactor, colorPalette.primary)
                    : null,
            }}
            ref={ref}
        >
            <SuggestionContent value={value} />
        </li>
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
};
