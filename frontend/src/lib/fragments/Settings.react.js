import React, { Suspense } from 'react';
import {CSSTransition} from 'react-transition-group';
import {
    SettingsDiv,
    ClearMarkedDiv,
    ClearMarkedSpan,
    DrawerDiv,
    DrawerContentDiv,
} from './Settings.style';
import {Search} from './Search.react';

import {useRecoilValue, useSetRecoilState, useRecoilCallback} from 'recoil';
import { colorPaletteState } from '../atoms/settingsState';
import {allHighlightedSymbolsState} from '../atoms/highlightsState';
import {clearAllHighlightsCallback} from '../hooks/highlights';
import { searchInputState } from '../atoms/searchState';

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

export default function Settings() {
    return (
        <SettingsDiv className="settings noselect">
            <DrawerDiv>
                <DrawerContentDiv>
                    <Suspense fallback={null}>
                        <Search />
                    </Suspense>
                </DrawerContentDiv>
                <DrawerContentDiv>
                    <ClearMarked />
                </DrawerContentDiv>
            </DrawerDiv>
        </SettingsDiv>
    );
}
