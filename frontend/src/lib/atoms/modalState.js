import React from 'react';
import PulseLoader from 'react-spinners/PulseLoader';
import {Constants} from '../constants';
import {atom, noWait, selector} from 'recoil';

import {backendUrlState, sessionState, colorPaletteState} from './settingsState';

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

const defaultModalForSymbol = {sourceId: null, nodeId: null};
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
        const colorPalette = get(colorPaletteState);
        switch (modalLoadable.state) {
            case 'hasValue':
                return JSON.stringify(modalLoadable.contents);
            case 'loading':
                return (
                    <PulseLoader
                        color={colorPalette.dark}
                        loading={true}
                        size={'0.25em'}
                        speedMultiplier={Constants.awaitingInputSpinnerSpeed}
                    />
                );
            case 'hasError':
                return 'Error loading modal content';
            default:
                return 'Unknown state';
        }
    },
})