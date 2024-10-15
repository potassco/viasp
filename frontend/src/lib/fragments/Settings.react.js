import React, {useState} from "react";
import PropTypes from "prop-types";
import {useColorPalette} from "../contexts/ColorPalette";
import {
    useTransformations,
    clearExplanationHighlightedSymbol,
    clearSearchResultHighlightedSymbol,
} from '../contexts/transformations';
import './settings.css'
import { darken } from 'polished';
import { Search } from "./Search.react";
import { styled } from 'styled-components';


function makeClassNameFromMarkedSymbol(highlightedSymbol) {
    const className = `txt-elem noselect toggle_part unselected ${
        highlightedSymbol.length === 0 ? 'fadeOut' : 'fadeIn'
    }`;
    return className;
}

function ClearMarked() {
    const colorPalette = useColorPalette();
    const [classNames, setClassNames] = useState('');
    const {dispatch: dispatchT, state: {explanationHighlightedSymbols}} = useTransformations();

    React.useEffect(() => {
        setClassNames(
            makeClassNameFromMarkedSymbol(explanationHighlightedSymbols)
        );
    }, [explanationHighlightedSymbols, setClassNames]);
    const [isHovered, setIsHovered] = useState(false);
    const [isClicked, setIsClicked] = useState(false);

    const hoverFactor = 0.08;
    const style = {
        background: colorPalette.primary,
        color: colorPalette.light,
        padding: "1em 1.5em",
    };

    if (isHovered) {
        style.background = darken(hoverFactor, style.background);
    }
    if (isClicked) {
        style.background = colorPalette.infoBackground;
    }

    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => setIsHovered(false);
    const handleMouseDown = () => setIsClicked(true);
    const handleMouseUp = () => setIsClicked(false);

    function onClick() {
        dispatchT(clearExplanationHighlightedSymbol());
        dispatchT(clearSearchResultHighlightedSymbol());
    }

    return (
        <div className="clear_marked">
            <span
                onClick={onClick}
                className={classNames}
                style={style}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
            >
                clear
            </span>
        </div>
    );
}

function Header(props) {
    const {text} = props;
    return (
        <tr>
            <td className="settings_header" align="center" colSpan="3">
                {text}
            </td>
        </tr>
    );
}
Header.propTypes = {
    /**
     * The text to be displayed in the header
     */
    text: PropTypes.string,
};

export default function Settings() {
    return (
        <div className="settings noselect">
            <div className="drawer">
                <div className="drawer_content">
                    <Search />
                </div>
                <div className="drawer_content">
                    <ClearMarked />
                </div>
            </div>
        </div>
    );
}
