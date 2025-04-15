import React, {useRef} from 'react';
import {make_atoms_string, scrollParentToChild} from '../utils';
import './symbol.css';
import PropTypes from 'prop-types';
import {useMessages, showError} from '../contexts/UserMessages';
import {SymbolElementSpan} from './Symbol.style';

import {useRecoilValue, useRecoilCallback, useSetRecoilState, useResetRecoilState} from 'recoil';
import {backendUrlState, sessionState} from '../atoms/settingsState';
import {contentDivState, currentSortState} from '../atoms/currentGraphState';
import {
    symbolBackgroundHighlightsStateFamily,
    pulsatingHighlightsState,
    isShowingExplanationStateFamily,
    symbolModalHighlightsState,
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
        has_reason,
        symbol_repr,
        nodeUuid,
        transformationHash,
        supernodeUuid,
    } = props;
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
    const setModalForSymbol = useSetRecoilState(modalForSymbolState);
    const resetSymbolModalHighlights = useResetRecoilState(symbolModalHighlightsState);
    
    const handleClickOnSymbol = async (e) => {
        try {
            if (!isShowingExplanation) {
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
                setThisSymbolHighlights(transformationHash, symbolUuid, data);
            } else {
                removeThisSymbolHighlights(transformationHash,symbolUuid);
            }
        } catch (error) {
            messageDispatch(showError(`Failed to get reason: ${error}`));
        }
    };

    const handleDoubleClickOnSymbol = async (e) => {
        setModalForSymbol({
            sourceId: symbolUuid,
            nodeId: nodeUuid,
            supernodeId: supernodeUuid,
            repr: symbol_repr,
        });
        resetSymbolModalHighlights();
    }

    const doubleClickTimer = useRef()
    const onClickHandler = (e) => {
        e.stopPropagation();
        if (!has_reason) {
            return;
        }
        clearTimeout(doubleClickTimer.current);

        if (e.detail === 1) {
            doubleClickTimer.current = setTimeout(() => handleClickOnSymbol(), 200)
        } else if (e.detail === 2) {
            handleDoubleClickOnSymbol();
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
        <SymbolElementSpan
            id={symbolUuid + suffix}
            $pulsate={pulsatingState.isPulsating}
            $pulsatingColor={pulsatingState.color}
            $backgroundColor={backgroundColor}
            $hasReason={has_reason}
            onClick={onClickHandler}
            ref={symbolElementRef}
            >
            {symbol_repr}
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
    /**
     * If the symbol has a reason
     */
    has_reason: PropTypes.bool,
    /**
     * The representation of the symbol
     */
    symbol_repr: PropTypes.string,
    /**
     * The uuid of the supernode that the symbol is in, optional
     */
    supernodeUuid: PropTypes.string,
};
