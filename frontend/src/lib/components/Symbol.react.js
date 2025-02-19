import React, {useRef} from 'react';
import {make_atoms_string} from '../utils/index';
import './symbol.css';
import PropTypes from 'prop-types';
import {styled, keyframes, css} from 'styled-components';
import {useMessages, showError} from '../contexts/UserMessages';

import {useRecoilValue, useRecoilCallback, useSetRecoilState} from 'recoil';
import {backendUrlState} from '../atoms/settingsState';
import {contentDivState, currentSortState} from '../atoms/currentGraphState';
import {symoblsByNodeStateFamily} from '../atoms/symbolsState';
import {
    symbolHighlightsStateFamily,
    setReasonHighlightsCallback,
    removeSymbolHighlightsCallback,
} from '../atoms/highlightsState';
import {mapShiftState, xShiftState} from '../atoms/mapShiftState';
import {changeXShiftWithinBoundsCallback} from '../hooks/mapShift';

const symbolPulsate = ($pulsatingColor) => keyframes`
    0% {
        box-shadow: 0 0 0 0 ${$pulsatingColor};
    }

    100% {
        box-shadow: 0 0 0 1em rgba(0, 0, 0, 0);
    }
`;

const pulsate = ($pulsatingColor) => css`
    animation: ${symbolPulsate($pulsatingColor)} 1s infinite;
`;

const SymbolElementSpan = styled.span`
    margin: 1px 1px;
    display: flex;
    border-radius: 7pt;
    background: ${(props) => props.$backgroundColor};
    padding: 1pt 2pt;
    min-height: 0;
    width: fit-content;
    width: -moz-fit-content;
    ${(props) => (props.$pulsate ? pulsate(props.$pulsatingColor) : '')};
    ${(props) => (props.$hasReason ?
        '&:hover {background-color: var(--hover-color);}' : '')};
    )}
`;

async function fetchReasonOf(backendURL, sourceId, nodeId, currentSort) {
    const r = await fetch(`${backendURL}/graph/reason`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            sourceid: sourceId,
            nodeid: nodeId,
            currentSort: currentSort,
        }),
    });
    if (!r.ok) {
        throw new Error(`${r.status} ${r.statusText}`);
    }
    return await r.json();
}

function scrollParentToChild(parent, child, changexShiftWithinBounds) {
    if (!child || !parent) {
        return;
    }
    var parentRect = parent.getBoundingClientRect();
    var parentViewableArea = {
        height: parent.clientHeight,
        width: parent.clientWidth,
    };

    var childRect = child.getBoundingClientRect();
    var isChildInVerticalViewport =
        childRect.top >= parentRect.top &&
        childRect.bottom <= parentRect.top + parentViewableArea.height;
    var isChildInHorizontalViewport =
        childRect.left >= parentRect.left &&
        childRect.right <= parentRect.left + parentViewableArea.width;

    if (!isChildInVerticalViewport) {
        parent.scrollTo({
            top:
                childRect.top -
                parentRect.top +
                parent.scrollTop -
                parent.clientHeight / 2,
            behavior: 'smooth',
        });
    }
    if (!isChildInHorizontalViewport) {
        changexShiftWithinBounds(
            -childRect.left
        )
    }
}


export function Symbol(props) {
    const {
        symbolUuid,
        isSubnode,
        nodeUuid,
        transformationHash,
    } = props;
    const recoilSymbol= useRecoilValue(
        symoblsByNodeStateFamily({
            transformationHash,
            nodeUuid,
            symbolUuid,
        })
    );
    const thisSymbolHighlights = useRecoilValue(
        symbolHighlightsStateFamily(symbolUuid)
    );
    const setThisSymbolHighlights = useRecoilCallback(
        setReasonHighlightsCallback, []
    );
    const removeThisSymbolHighlights = useRecoilCallback(
        removeSymbolHighlightsCallback, []
    );
    const backendUrl = useRecoilValue(backendUrlState);
    const currentSort = useRecoilValue(currentSortState);
    const symbolElementRef = useRef(null);
    let backgroundColor = 'transparent';
    const isPulsating = useRef(false);
    const pulsatingColor = useRef('transparent');

    let atomString = make_atoms_string(recoilSymbol.symbol);
    const suffix = `_${isSubnode ? 'sub' : 'main'}`;
    const contentDiv = useRecoilValue(contentDivState);
    const isShowingExplanation = useRef(false);
    const [, messageDispatch] = useMessages();
    const changeXShiftWithinBounds = useRecoilCallback(
        changeXShiftWithinBoundsCallback,
        []
    );
    

    const handleClickOnSymbol = async (e) => {
        e.stopPropagation();
        if (!recoilSymbol.has_reason) {
            return;
        }
        try {
            const data = await fetchReasonOf(
                backendUrl,
                symbolUuid,
                nodeUuid,
                currentSort
            );
            if (data.symbols.some((tgt) => tgt === null)) {
                return;
            }
            if (!isShowingExplanation.current) {
                setThisSymbolHighlights(transformationHash, symbolUuid, data);
                isShowingExplanation.current = true;
            } else {
                removeThisSymbolHighlights(transformationHash,symbolUuid);
                isShowingExplanation.current = false;
            }
        } catch (error) {
            messageDispatch(showError(`Failed to get reason: ${error}`));
        }
    };


    if (thisSymbolHighlights.length > 0) {
        const uniqueHighlightsColors = [
            ...new Set(thisSymbolHighlights.map(h => h.color).reverse()),
        ];

        const gradientStops = uniqueHighlightsColors
            .map((color, index, array) => {
                const start = (index / array.length) * 100;
                const end = ((index + 1) / array.length) * 100;
                return `${color} ${start}%, ${color} ${end}%`;
            })
            .join(', ');
        backgroundColor = `linear-gradient(-45deg, ${gradientStops})`
    } else {
        backgroundColor = 'transparent';
    }

    const recentQueryHighlights = thisSymbolHighlights.filter(
        (h) => h.origin === 'query'
    );
    if (recentQueryHighlights.some((h) => h.recent)) {
        scrollParentToChild(
            contentDiv.current,
            symbolElementRef.current,
            changeXShiftWithinBounds
        );
        isPulsating.current = true;
        pulsatingColor.current = recentQueryHighlights[0].color;
    } else {
        isPulsating.current = false;
        pulsatingColor.current = 'transparent';
    }

    atomString = atomString.length === 0 ? '' : atomString;

    return (
        <SymbolElementSpan
            id={symbolUuid + suffix}
            $pulsate={isPulsating.current}
            $pulsatingColor={pulsatingColor.current}
            $backgroundColor={backgroundColor}
            $hasReason={recoilSymbol.has_reason}
            onClick={handleClickOnSymbol}
            ref={symbolElementRef}
        >
            {atomString}
        </SymbolElementSpan>
    );
}

Symbol.propTypes = {
    /**
     * The symbolidentifier Uuid of the symbol to display
     */
    symbolUuid: PropTypes.string,
    /**
     * If the symbol is a subnode
     */
    isSubnode: PropTypes.bool,
    /**
     * The uuid of the node that the symbol is in
     */
    nodeUuid: PropTypes.string,
    /**
     * The hash of the transformation that the symbol is in
     */
    transformationHash: PropTypes.string,
};
