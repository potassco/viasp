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
import {darken, lighten} from 'polished';
import * as Constants from '../constants';
import {NavigationArea} from './NavigationArea.react';

const SuggestionTextSpan = styled.span`
    margin-left: 0.8em;
`;

function SuggestionContent(props) {
    const {value} = props;
    const display = value.repr;

    return (
        <SuggestionTextSpan className="txt-elem">{display}</SuggestionTextSpan>
    );
}

SuggestionContent.propTypes = {
    /**
     * The Search Result to be displayed, either a Transformation, a Node or a Signature
     */
    value: SEARCHRESULTSYMBOLWRAPPER,
};

const SearchRowLi = styled.li`
    background-color: ${(props) => props.$backgroundColor};
    padding: 0.7em 0;
    justify-content: begin;
    align-items: center;
    display: flex;

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
                    ? lighten(
                          Constants.hoverColorLightenFactor,
                          colorPalette.primary
                      )
                    : colorPalette.primary
            }
            ref={ref}
            onMouseEnter={mouseHoverCallback}
            onClick={isSelectedResult ? null : () => select(value)}
        >
            {!isSelectedResult ? (
                <SuggestionContent value={value} />
            ) : (
                <ActiveSearchResultDiv className="active_search_result">
                    <SuggestionContent value={value} />
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
