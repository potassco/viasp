import React from 'react';
import PropTypes from 'prop-types';
import {styled} from 'styled-components';
import IconWrapper from './IconWrapper.react';
import {useRecoilValue, useSetRecoilState} from 'recoil';
import {colorPaletteState} from '../atoms/settingsState';
import {
    symbolSearchHighlightsState,
} from '../atoms/highlightsState';
import {
    selectedBranchState,
} from '../atoms/searchState';

const NavigationAreaDiv = styled.div`
    color: ${(props) => props.$colorPalette.light};
    border-radius: 0.4em;
    position: absolute;
    right: 0;
    margin-right: 0.4em;
    display: ${(props) => (props.$visible ? 'flex' : 'none')};
`;

function NextButton(props) {
    const {onForward, disabled} = props;
    const colorPalette = useRecoilValue(colorPaletteState);

    return (
        <IconWrapper
            icon="navigateNext"
            height="25px"
            color={colorPalette.light}
            onClick={disabled ? null : onForward}
        />
    );
}

NextButton.propTypes = {
    /**
     * The function to call when the forward button is clicked.
     * */
    onForward: PropTypes.func,
    /**
     * Whether the forward button is disabled.
     * */
    disabled: PropTypes.bool,
};

function PrevButton(props) {
    const {onBackward, disabled} = props;
    const colorPalette = useRecoilValue(colorPaletteState);

    return (
        <IconWrapper
            icon="navigateNext"
            height="25px"
            flip="horizontal"
            color={colorPalette.light}
            onClick={disabled ? null : onBackward}
        />
    );
}

PrevButton.propTypes = {
    /**
     * The function to call when the backward button is clicked.
     * */
    onBackward: PropTypes.func,
    /**
     * Whether the backward button is disabled.
     * */
    disabled: PropTypes.bool,
};

export function NavigationArea(props) {
    const {visible, searchInputAreaRef} = props;
    const colorPalette = useRecoilValue(colorPaletteState);
    const searchResultRecoilHighlights = useRecoilValue(
        symbolSearchHighlightsState
    );
    const setSelectedBranch = useSetRecoilState(selectedBranchState);

    if (searchResultRecoilHighlights.length === 0) {
        return null;
    }

    function onClose() {
        searchInputAreaRef?.current.focus();
    }

    function onRotate(direction) {
        setSelectedBranch(
            (selectedBranch) =>
                (searchResultRecoilHighlights[0].includes.length + selectedBranch +
                    direction) %
                searchResultRecoilHighlights[0].includes.length
        );
        searchInputAreaRef?.current.focus();
    }

    return (
        <NavigationAreaDiv
            className="txt-elem"
            $colorPalette={colorPalette}
            $visible={visible}
        >
            <PrevButton
                onBackward={() => {
                    onRotate(-1);
                }}
                // disabled={selected < 1}
                disabled={searchResultRecoilHighlights[0].includes.length < 2}
            />
            <NextButton
                onForward={() => {
                    onRotate(+1);
                }}
                // disabled={selected + 1 >= includesLength}
                disabled={searchResultRecoilHighlights[0].includes.length < 2}
            />
            {/* <CloseButton onClose={onClose} /> */}
        </NavigationAreaDiv>
    );
}

NavigationArea.propTypes = {
    /**
     * Whether the navigation area should be visible.
     * */
    visible: PropTypes.bool,
    /**
     * The reference to the search input element.
     * */
    searchInputAreaRef: PropTypes.object,
};
