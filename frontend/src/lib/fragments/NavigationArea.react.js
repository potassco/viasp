import React from 'react';
import { Constants } from "../constants";
import PropTypes from 'prop-types';
import {styled} from 'styled-components';
import {SEARCHRESULTSYMBOLWRAPPER} from '../types/propTypes';
import {
    useTransformations,
    removeSearchResultHighlightedSymbol,
    rotateSearchResultHighlightedSymbol,
    unsetRecentSearchResultHighlightedSymbol,
} from '../contexts/transformations';
import {useColorPalette} from '../contexts/ColorPalette';
import IconWrapper from './IconWrapper.react';

const NavigationAreaDiv = styled.div`
    color: ${(props) => props.$colorPalette.light};
    border-radius: 0.4em;
    position: absolute;
    right: 0;
    margin-right: 0.4em;
    display: ${(props) => (props.$visible ? 'flex' : 'none')};
`;

export function CloseButton(props) {
    const {onClose} = props;
    const colorPalette = useColorPalette();

    return (
        <IconWrapper
            icon="close"
            height="25px"
            color={colorPalette.light}
            className="close"
            onClick={onClose}
        />
    );
}

CloseButton.propTypes = {
    /**
     * The function to call when the close button is clicked.
     */
    onClose: PropTypes.func,
};

function NextButton(props) {
    const {onForward, disabled} = props;
    const colorPalette = useColorPalette();

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
    const colorPalette = useColorPalette();

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
    const {visible, searchResult, searchInputAreaRef} = props;
    const {dispatch: dispatchT} = useTransformations();
    const colorPalette = useColorPalette();
    const [timeoutId, setTimeoutId] = React.useState(null);
    const [selected, setSelected] = React.useState(0);
    const [includesLength, setIncludesLength] = React.useState(0);
    const {
        state: {searchResultHighlightedSymbols},
    } = useTransformations();

    React.useEffect(() => {
        const index = searchResultHighlightedSymbols?.findIndex(
            (symbol) => symbol.repr === searchResult?.repr
        );
        if (index !== -1) {
            setSelected(searchResultHighlightedSymbols[index].selected);
            setIncludesLength(
                searchResultHighlightedSymbols[index].includes.length
            );
        } else {
            setSelected(0);
        }
    }, [searchResult, searchResultHighlightedSymbols]);

    if (!searchResult) {
        return null;
    }

    function onClose() {
        dispatchT(removeSearchResultHighlightedSymbol(searchResult));
        searchInputAreaRef?.current.focus();
    }

    function onRotate(direction) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        dispatchT(rotateSearchResultHighlightedSymbol(direction));
        const newTimeoutId = setTimeout(() => {
            dispatchT(unsetRecentSearchResultHighlightedSymbol(searchResult));
        }, Constants.searchResultHighlightDuration);
        setTimeoutId(newTimeoutId);
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
                disabled={includesLength < 2}
            />
            <NextButton
                onForward={() => {
                    onRotate(+1);
                }}
                // disabled={selected + 1 >= includesLength}
                disabled={includesLength < 2}
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
     * The search result to navigate through.
     * */
    searchResult: SEARCHRESULTSYMBOLWRAPPER,
    /**
     * The reference to the search input element.
     * */
    searchInputAreaRef: PropTypes.object,
};
