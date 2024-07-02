import React, {useState} from "react";
import PropTypes from "prop-types";
import {useColorPalette} from "../contexts/ColorPalette";
import {useHighlightedSymbol} from "../contexts/HighlightedSymbol";
import './settings.css'
import { darken } from 'polished';
import { Search } from "./Search.react";


function makeClassNameFromMarkedSymbol(highlightedSymbol) {
    const className = `txt-elem noselect toggle_part unselected ${highlightedSymbol.length === 0 ? "fadeOut" : "fadeIn"}`;
    return className;
}

function ClearMarked() {
    const { highlightedSymbol, setHighlightedSymbol } = useHighlightedSymbol()
    const colorPalette = useColorPalette();
    const className = makeClassNameFromMarkedSymbol(highlightedSymbol)
    const [isHovered, setIsHovered] = useState(false);
    const [isClicked, setIsClicked] = useState(false);

    const hoverFactor = 0.08;
    const style = {
        background: colorPalette.primary,
        color: colorPalette.light,
        padding: "12px",
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

    return <div className="clear_marked">
     <span onClick={() => setHighlightedSymbol([])}
                className={className}
                style={style}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}>
            clear</span>
    </div>
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
function SettingsTable() {

    return (<div>
            <ClearMarked />
            <Search />
    </div>);
}
export default function Settings() {
    return (
        <div className="settings noselect">
            <div className="drawer"
            >
                <div
                    className="drawer_content"
                    style={{
                        maxWidth: '500px',
                    }}
                >
                    <SettingsTable />
                </div>
            </div>
        </div>
    );
}
