import React, { Suspense } from 'react';
import PropTypes from 'prop-types';
import {CSSTransition} from 'react-transition-group';
import './settings.css';
import {darken} from 'polished';
import {Search} from './Search.react';
import {styled} from 'styled-components';
import { Constants } from "../constants";
import {useRecoilValue, useSetRecoilState, useRecoilCallback} from 'recoil';
import { colorPaletteState } from '../atoms/settingsState';
import {
    allHighlightedSymbolsState,
    clearAllHighlightsCallback,
} from '../atoms/highlightsState';
import { searchInputState } from '../atoms/searchState';

const ClearMarkedDiv = styled.div`
    display: flex;
    justify-content: end;
`;

const ClearMarkedSpan = styled.span`
    background: ${({$colorPalette}) => $colorPalette.primary};
    color: ${({$colorPalette}) => $colorPalette.light};
    padding: 0.7em 0.9em;
    font-family: monospace;
    border-radius: 0.7em;
    z-index: 20;
    cursor: pointer;

    &:hover {
        background: ${({$colorPalette}) =>
            darken(Constants.hoverColorDarkenFactor, $colorPalette.primary)};
    }

    &:active {
        background: ${({$colorPalette}) => $colorPalette.infoBackground};
    }

    &.fade-enter {
        opacity: 0;
    }
    &.fade-enter-active {
        opacity: 1;
        transition: opacity 0.8s;
    }
    &.fade-exit {
        opacity: 1;
    }
    &.fade-exit-active {
        opacity: 0;
        transition: opacity 0.8s;
    }
`;

function ClearMarked() {
    const setSearchUserInput = useSetRecoilState(searchInputState);
    const recoilHighlightedSymbols = useRecoilValue(allHighlightedSymbolsState);
    const clearHighlights = useRecoilCallback(clearAllHighlightsCallback, []);
    const colorPalette = useRecoilValue(colorPaletteState);

    function onClick() {
        setSearchUserInput('');
        clearHighlights();
    }

    return (
        <ClearMarkedDiv className="clear_marked">
            <CSSTransition
                in={recoilHighlightedSymbols.length > 0}
                timeout={800}
                classNames="fade"
                mountOnEnter
                unmountOnExit
            >
                <ClearMarkedSpan
                    className="txt-elem noselect unselected"
                    onClick={onClick}
                    $colorPalette={colorPalette}
                >
                    clear
                </ClearMarkedSpan>
            </CSSTransition>
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
                    <Suspense fallback={null}>
                        <Search />
                    </Suspense>
                </div>
                <div className="drawer_content">
                    <ClearMarked />
                </div>
            </div>
        </div>
    );
}
