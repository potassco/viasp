import {atom, noWait, selector} from 'recoil';

import {backendUrlState, sessionState} from './settingsState';

async function fetchModalContent(backendURL, sourceId, nodeId, token){
    const response = await fetch(`${backendURL}/graph/ground`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            sourceid: sourceId,
            nodeid: nodeId,
        }),
    });
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return await response.json();
}

const defaultModalForSymbol = {sourceId: null, nodeId: null, supernodeId: null, repr: null};
const defaultModalPosition = {top: 0, left: 0};

export const modalForSymbolState = atom({
    key: 'modalForSymbolState',
    default: defaultModalForSymbol,
});

export const modalVisibleState = selector({
    key: 'modalVisibleState',
    get: ({get}) => {
        const {sourceId, nodeId} = get(modalForSymbolState);
        return sourceId !== null && nodeId !== null;
    },
})

export const modalPositionState = atom({
    key: 'modalPositionState',
    default: defaultModalPosition,
});

export const bufferedModalContentState = selector({
    key: 'modalContentState',
    get: ({get}) => {
        const {sourceId, nodeId} = get(modalForSymbolState);
        return fetchModalContent(
            get(backendUrlState),
            sourceId,
            nodeId,
            get(sessionState)
        );
    },
})

export const modalContentState = selector({
    key: 'newModalContentState',
    get: ({get}) => {
        const isVisible = get(modalVisibleState);
        if (!isVisible) {
            return null;
        }
        const modalLoadable = get(noWait(bufferedModalContentState));
        switch (modalLoadable.state) {
            case 'hasValue':
                return {
                    "loading": false,
                    ...modalLoadable.contents};
            case 'loading':
                return {
                    "_type": "GroundReasonTransport",
                    "loading": true,
                    "content": {},
                };
            case 'hasError':
                return 'Error loading modal content';
            default:
                return 'Unknown state';
        }
    },
})

const defaultModalContentHighlighted = [];
export const modalContentHighlightedState = atom({
    key: 'modalContentHighlightedState',
    default: defaultModalContentHighlighted,
});