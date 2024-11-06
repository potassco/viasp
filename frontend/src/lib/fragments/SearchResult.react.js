import React from 'react';
import PropTypes from 'prop-types';
import {
    NODE,
    SIGNATURE,
    TRANSFORMATION,
    SEARCHRESULTSYMBOLWRAPPER,
} from '../types/propTypes';
import {styled} from 'styled-components';
import {useColorPalette} from '../contexts/ColorPalette';
import {darken} from 'polished';
import * as Constants from '../constants';
import {NavigationArea} from './NavigationArea.react';

function SuggestionContent(props) {
    const {value, bolden} = props;
    let display = 'UNKNOWN FILTER';

    const index = value.repr.toLowerCase().indexOf(bolden.toLowerCase());
    if (index !== -1) {
        display = (
            <>
                <span>{value.repr.substring(0, index)}</span>
                <b>{value.repr.substring(index, index + bolden.length)}</b>
                <span>{value.repr.substring(index + bolden.length)}</span>
            </>
        );
    } else {
        display = value.repr;
    }

    return <span className="txt-elem">{display}</span>;
}

SuggestionContent.propTypes = {
    /**
     * The Search Result to be displayed, either a Transformation, a Node or a Signature
     */
    value: SEARCHRESULTSYMBOLWRAPPER,
    /**
     *  The user input
     */
    bolden: PropTypes.string,
};

const SearchRowLi = styled.li`
    background-color: ${(props) => props.$backgroundColor};
    padding: 0.7em 0;

    &.active {
        background-color: ${(props) =>
            darken(Constants.hoverColorDarkenFactor, props.$backgroundColor)};
    }
`;

const ActiveSearchResultDiv = styled.div`
    display: flex;
    justify-content: space-between;
    width: 100%;
    align-items: center;
    height: 100%;
`;

export const Suggestion = React.forwardRef((props, ref) => {
    const {
        value,
        active,
        select,
        userInput,
        mouseHoverCallback,
        isAutocompleteSuggestion,
        isSelectedResult,
    } = props;
    const colorPalette = useColorPalette();

    const classes = ['search_row'];
    if (active) {
        classes.push('active');
    }
    return (
        <SearchRowLi
            className={classes.join(' ')}
            name={value.repr}
            $backgroundColor={
                isAutocompleteSuggestion
                    ? colorPalette.light
                    : colorPalette.primary
            }
            ref={ref}
            onMouseEnter={mouseHoverCallback}
            onClick={isSelectedResult ? null : () => select(value)}
        >
            {!isSelectedResult ? (
                <SuggestionContent
                    value={value}
                    bolden={isAutocompleteSuggestion ? userInput : ''}
                />
            ) : (
                <ActiveSearchResultDiv className="active_search_result">
                    <SuggestionContent value={value} bolden={''} />
                    <NavigationArea
                        className="navigation_area"
                        visible={true}
                        searchResult={value}
                        searchInputAreaRef={null}
                    />
                </ActiveSearchResultDiv>
            )}
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
     *  The user input
     */
    userInput: PropTypes.string,
    /**
     *  onMouseHover Callback
     */
    mouseHoverCallback: PropTypes.func,
    /**
     *  Is autocomplete
     */
    isAutocompleteSuggestion: PropTypes.bool,
    /**
     *  Is selected result
     */
    isSelectedResult: PropTypes.bool,
};
