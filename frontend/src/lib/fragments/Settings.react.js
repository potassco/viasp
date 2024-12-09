import React from 'react';
import PropTypes from 'prop-types';
import {useColorPalette} from '../contexts/ColorPalette';
import {
    useTransformations,
    clearExplanationHighlightedSymbol,
    clearSearchResultHighlightedSymbol,
} from '../contexts/transformations';
import {useSearchUserInput} from '../contexts/SearchUserInput';
import './settings.css';
import {darken} from 'polished';
import {Search} from './Search.react';
import {styled} from 'styled-components';
import { Constants } from "../constants";

const ClearMarkedDiv = styled.div`
    display: flex;
    justify-content: end;
`;

const ClearMarkedSpan = styled.span`
    background: ${({$colorPalette}) => $colorPalette.primary};
    color: ${({$colorPalette}) => $colorPalette.light};
    padding: 0.7em 0.9em;
    transition: opacity 0.8s;
    font-family: monospace;
    border-radius: 0.7em;
    z-index: 20;
    cursor: pointer;
    opacity: ${({$highlightedSymbol}) =>
        $highlightedSymbol.length === 0 ? 0 : 1};

    &:hover {
        background: ${({$colorPalette}) =>
            darken(Constants.hoverColorDarkenFactor, $colorPalette.primary)};
    }

    &:active {
        background: ${({$colorPalette}) => $colorPalette.infoBackground};
    }
`;

function ClearMarked() {
    const colorPalette = useColorPalette();
    const {
        dispatch: dispatchT,
        state: {allHighlightedSymbols},
    } = useTransformations();
    const [, setSearchUserInput] = useSearchUserInput();

    function onClick() {
        dispatchT(clearExplanationHighlightedSymbol());
        dispatchT(clearSearchResultHighlightedSymbol());
        setSearchUserInput('');
    }
    return (
        <ClearMarkedDiv className="clear_marked">
            <ClearMarkedSpan
                className="txt-elem noselect unselected"
                onClick={onClick}
                $colorPalette={colorPalette}
                $highlightedSymbol={allHighlightedSymbols}
            >
                clear
            </ClearMarkedSpan>
        </ClearMarkedDiv>
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
