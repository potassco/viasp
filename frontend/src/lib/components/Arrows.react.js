import React, {useCallback, Suspense} from "react";
import Xarrow from "react-xarrows";
import PropTypes from 'prop-types'
import { v4 as uuidv4 } from 'uuid';
import { styled } from 'styled-components';
import {Transition} from 'react-transition-group';

import { Constants } from "../constants";
import {
    isAnimatingState,
    contentDivState,
} from '../atoms/currentGraphState';
import {arrowHighlightsState} from '../atoms/highlightsState';
import { useRecoilValue } from "recoil";

const ArrowsContainer = styled.span`
    position: sticky;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    transition: opacity 0.2s ease;
    opacity: 0;
    
    &.enter, &.entered {
        opacity: 1;
    }
    &.exit,
    &.exited {
        opacity: 0;
    }
`;

export function Arrows() {
    const arrowHighlights = useRecoilValue(arrowHighlightsState);
    const contentDiv = useRecoilValue(contentDivState);
    const isAnimating = useRecoilValue(
        isAnimatingState
    );

    const createArrows = useCallback((highlights) => {
        return highlights
            .map((arrow) => {
                const source = contentDiv.current.querySelector(
                    `div[data-uuid^='${arrow.origin}']`
                )?.firstChild?.id;
                const target = contentDiv.current.querySelector(
                    `div[data-uuid^='${arrow.symbolUuid}']`
                )?.firstChild?.id;
                return {
                    src: source,
                    tgt: target,
                    color: arrow.color,
                };
            })
            .filter((arrow) => arrow.src && arrow.tgt)
            .map((arrow) => {
                return (
                    <Xarrow
                        key={uuidv4()}
                        start={arrow.src}
                        end={arrow.tgt}
                        startAnchor={'auto'}
                        endAnchor={'auto'}
                        color={arrow.color}
                        strokeWidth={2}
                        headSize={5}
                        zIndex={10}
                    />
                );
            });
    }, [contentDiv]);


    return (arrowHighlights.length === 0) ? null : (
        <Transition
            key="arrows"
            timeout={{
                enter: 0,
                appear: Constants.arrowsAppearTimeout,
                exit: 200,
            }}
            appear={true}
            in={!isAnimating}
            mountOnEnter
            unmountOnExit
        >
            {(state) => (
                <ArrowsContainer className={`arrows-container ${state}`}>
                    {createArrows(arrowHighlights)}
                </ArrowsContainer>
            )}
        </Transition>
    );
}

Arrows.propTypes = {
    /**
     * The ID used to identify this component in Dash callbacks.
     */
    id: PropTypes.string,
};

