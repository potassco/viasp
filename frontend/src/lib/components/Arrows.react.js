import React from "react";
import Xarrow from "react-xarrows";
import PropTypes from 'prop-types'
import { v4 as uuidv4 } from 'uuid';
import debounce from "lodash/debounce";
import { styled } from 'styled-components';
import { useTransformations } from "../contexts/transformations";
import { useAnimationUpdater } from "../contexts/AnimationUpdater";

const ArrowsContainer = styled.div`
    position: sticky;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none; 
`;

export function Arrows() {
    const {
        state: {explanationHighlightedSymbols},
    } = useTransformations();
    const {
        animationState,
    } = useAnimationUpdater();
    const [arrows, setArrows] = React.useState([]);
    const observerRef = React.useRef();

    const calculateArrows = React.useCallback(() => {
        return explanationHighlightedSymbols
            .map((arrow) => {
                const suffix1 = `_${
                    document.getElementById(arrow.src + '_main')
                        ? 'main'
                        : 'sub'
                }`;
                const suffix2 = `_${
                    document.getElementById(arrow.tgt + '_main')
                        ? 'main'
                        : 'sub'
                }`;
                return {
                    src: arrow.src + suffix1,
                    tgt: arrow.tgt + suffix2,
                    color: arrow.color,
                };
            })
            .filter((arrow) => {
                // filter false arrows that are not in the DOM
                return (
                    document.getElementById(arrow.src) &&
                    document.getElementById(arrow.tgt)
                );
            })
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
    }, [explanationHighlightedSymbols]);

    const debouncedCalculateArrows = React.useMemo(
        () => debounce(() => setArrows(calculateArrows()), 10),
        [calculateArrows]
    )

    React.useEffect(() => {
        debouncedCalculateArrows();
    }, [animationState, explanationHighlightedSymbols, debouncedCalculateArrows]);
    // }, [animationState, explanationHighlightedSymbols, debouncedCalculateArrows]);

    React.useEffect(() => {
        const observer = new MutationObserver(debouncedCalculateArrows);
        observerRef.current = observer;

        const config = {attributes: true, childList: true, subtree: true};
        const targetNode = document.getElementById('content');

        if (targetNode) {
            observer.observe(targetNode, config);
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [debouncedCalculateArrows]);

    return (
        <ArrowsContainer className="arrows_container">
            {arrows.length > 0 ? arrows : null}
        </ArrowsContainer>
    );
}

Arrows.propTypes = {
    /**
     * The ID used to identify this component in Dash callbacks.
     */
    id: PropTypes.string,
}
