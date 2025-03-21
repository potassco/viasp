import React, {useRef} from 'react';
import {make_atoms_string, scrollParentToChild} from '../utils';
import './symbol.css';
import PropTypes from 'prop-types';
import {useMessages, showError} from '../contexts/UserMessages';
import {SymbolElementSpan} from './Symbol.style';

import {useRecoilValue, useRecoilCallback, useSetRecoilState} from 'recoil';
import {backendUrlState, sessionState} from '../atoms/settingsState';
import {contentDivState, currentSortState} from '../atoms/currentGraphState';
import {symoblsByNodeStateFamily} from '../atoms/symbolsState';
import {
    symbolBackgroundHighlightsStateFamily,
    pulsatingHighlightsState,
} from '../atoms/highlightsState';
import {
    setReasonHighlightsCallback,
    removeSymbolHighlightsCallback,
} from '../hooks/highlights';
import {changeXShiftWithinBoundsCallback} from '../hooks/mapShift';
import { modalForSymbolState, modalPositionState } from '../atoms/modalState';

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
    const isShowingExplanation = useRef(false);
    const [, messageDispatch] = useMessages();
    const changeXShiftWithinBounds = useRecoilCallback(
        changeXShiftWithinBoundsCallback,
        []
    );
    const setModalForSymbol = useSetRecoilState(modalForSymbolState);
    const setModalPosition = useSetRecoilState(modalPositionState);
    
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

    const handleDoubleClickOnSymbol = async (e) => {
        e.stopPropagation();
        const rect = symbolElementRef.current.getBoundingClientRect();
        setModalPosition({top: rect.top, left: rect.left + rect.width});
        setModalForSymbol({sourceId: symbolUuid, nodeId: nodeUuid});
    }

    const doubleClickTimer = useRef()
    const onClickHandler = (e) => {
        e.persist();
        clearTimeout(doubleClickTimer.current);

        if (e.detail === 1) {
            doubleClickTimer.current = setTimeout(() => handleClickOnSymbol(e), 200)
        } else if (e.detail === 2) {
            handleDoubleClickOnSymbol(e);
        }
    }

    if (pulsatingState.isPulsating) {
        scrollParentToChild(
            contentDiv.current,
            symbolElementRef.current,
            changeXShiftWithinBounds
        )
    }


    return (
    <>
        <SymbolElementSpan
            id={symbolUuid + suffix}
            $pulsate={pulsatingState.isPulsating}
            $pulsatingColor={pulsatingState.color}
            $backgroundColor={backgroundColor}
            $hasReason={recoilSymbol.has_reason}
            onClick={onClickHandler}
            ref={symbolElementRef}
            >
            {atomString}
        </SymbolElementSpan>
    </>
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
