import React from "react";
import {make_atoms_string, make_rules_string} from "../utils/index";
import PropTypes from "prop-types";
import {NODE, SIGNATURE, TRANSFORMATION, SYMBOL} from "../types/propTypes";
import {useSettings} from "../contexts/Settings";
import { styled as styledComponents } from "styled-components";
import {useColorPalette} from "../contexts/ColorPalette";

const StyledSuggestion = styledComponents.span`
 &:before {
    color: ${props => props.color};
    position: absolute;
    left: 0;
    content: '${props => props.content}';
};
`

function SuggestionContent(props) {
    const {value} = props;
    const {state} = useSettings()
    const colorPalette = useColorPalette();
    let display = "UNKNOWN FILTER"
    let suggestionSymbol = "?";
    const color = colorPalette.primary;

    if (value._type === "Node") {
        suggestionSymbol = "{}"
        display = make_atoms_string(state.show_all ? value.atoms : value.diff)
    }
    if (value._type === "Signature") {
        suggestionSymbol = "  /"
        display = `${value.name}/${value.args}`
    }
    if (value._type === "Transformation") {
        suggestionSymbol = ":-"
        display = make_rules_string(value.rules)
    }
    if (value._type === "Function") {
        suggestionSymbol = " ."
        display = make_atoms_string(value)
    }
    return <StyledSuggestion color={color} content={suggestionSymbol}>{display}</StyledSuggestion>
}


SuggestionContent.propTypes = {
    /**
     * The Search Result to be displayed, either a Transformation, a Node or a Signature
     */
    value: PropTypes.oneOfType([
        SIGNATURE,
        TRANSFORMATION,
        NODE,
        SYMBOL
    ]),
}

export function Suggestion(props) {
    const {value, active, select} = props;

    const classes = ["search_row"];
    if (active) {
        classes.push("active")
    }
    return <li className={classes.join(" ")} name={value} onClick={() => select(value)}><SuggestionContent
        value={value}/>
    </li>

}

Suggestion.propTypes = {
    /**
     * The Search Result to be displayed, either a Transformation, a Node or a Signature
     */
    value: PropTypes.oneOfType([
        SIGNATURE,
        TRANSFORMATION,
        NODE,
        SYMBOL
    ]),
    /**
     *  Whether the result is highlighted or not.
     */
    active: PropTypes.bool,
    /**
     *  onClick Callback
     */
    select: PropTypes.func
}
