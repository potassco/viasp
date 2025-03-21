import React, {useRef} from 'react';
import {make_atoms_string, scrollParentToChild} from '../utils';
import './symbol.css';
import PropTypes from 'prop-types';
import {useMessages, showError} from '../contexts/UserMessages';
import {SymbolElementSpan} from './Symbol.style';

import {useRecoilValue, useRecoilCallback} from 'recoil';
import {backendUrlState, sessionState} from '../atoms/settingsState';
import {contentDivState, currentSortState} from '../atoms/currentGraphState';
import {symoblsByNodeStateFamily} from '../atoms/symbolsState';
import {
    symbolBackgroundHighlightsStateFamily,
    pulsatingHighlightsState,
    isShowingExplanationStateFamily,
} from '../atoms/highlightsState';
import {
    setReasonHighlightsCallback,
    removeSymbolHighlightsCallback,
} from '../hooks/highlights';
import {changeXShiftWithinBoundsCallback} from '../hooks/mapShift';

async function fetchReasonOf(backendURL, sourceId, nodeId, currentSort, session) {
    const r = await fetch(`${backendURL}/graph/reason`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session}`,
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
    const setThisSymbolHighlights = useRecoilCallback(
        setReasonHighlightsCallback, []
    );
    const removeThisSymbolHighlights = useRecoilCallback(
        removeSymbolHighlightsCallback, []
    );
    const pulsatingState = useRecoilValue(
        pulsatingHighlightsState(symbolUuid)
    );
    const session = useRecoilValue(sessionState);
    const backendUrl = useRecoilValue(backendUrlState);
    const currentSort = useRecoilValue(currentSortState);
    const symbolElementRef = useRef(null);
    const backgroundColor = useRecoilValue(
        symbolBackgroundHighlightsStateFamily(symbolUuid)
    );
    const contentDiv = useRecoilValue(contentDivState);

    const suffix = `_${isSubnode ? 'sub' : 'main'}`;
    const isShowingExplanation = useRecoilValue(
        isShowingExplanationStateFamily(symbolUuid)
    );
    const [, messageDispatch] = useMessages();
    const changeXShiftWithinBounds = useRecoilCallback(
        changeXShiftWithinBoundsCallback,
        []
    );
    
    let atomString = make_atoms_string(recoilSymbol.symbol);
    atomString = atomString.length === 0 ? '' : atomString;

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
                currentSort,
                session
            );
            if (data.symbols.some((tgt) => tgt === null)) {
                return;
            }
            if (!isShowingExplanation) {
                setThisSymbolHighlights(transformationHash, symbolUuid, data);
            } else {
                removeThisSymbolHighlights(transformationHash,symbolUuid);
            }
        } catch (error) {
            messageDispatch(showError(`Failed to get reason: ${error}`));
        }
    };

    if (pulsatingState.isPulsating) {
        scrollParentToChild(
            contentDiv.current,
            symbolElementRef.current,
            changeXShiftWithinBounds
        )
    }


    return (
        <SymbolElementSpan
            id={symbolUuid + suffix}
            $pulsate={pulsatingState.isPulsating}
            $pulsatingColor={pulsatingState.color}
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
