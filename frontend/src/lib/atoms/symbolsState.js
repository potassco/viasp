import { selectorFamily, noWait} from 'recoil';
import { backendUrlState, sessionState } from './settingsState';
import { currentSortState } from './currentGraphState';

const getSymbolsFromServer = async (
    backendUrl,
    currentSort, 
    nodeUuid,
    session
) => {
    return fetch(`${backendUrl}/graph/symbols`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session}`,
        },
        body: JSON.stringify({nodeUuid, currentSort}),
    });
};

export const symbolUuidsByNodeUuidStateFamily = selectorFamily({
    key: 'symoblsByNodeState',
    get:
        ({nodeUuid, subnodeIndex}) =>
        async ({get}) => {
            if (typeof nodeUuid === 'undefined') {
                return [];
            }
            const backendUrl = get(backendUrlState);
            const currentSort = get(currentSortState);
            const session = get(sessionState);
            const response = await getSymbolsFromServer(
                backendUrl,
                currentSort,
                nodeUuid,
                session
            );
            if (!response.ok) {
                throw new Error(response.statusText);
            }
            return response.json();
        },
});

const previousSymbolsByNode = {};
export const bufferedSymbolsByNodeUuidStateFamily = selectorFamily({
    key: 'bufferedSymbolsByNodeState',
    get:
        ({nodeUuid, subnodeIndex}) =>
        async ({get}) => {
            const symbolsLoadable = get(
                noWait(symbolUuidsByNodeUuidStateFamily({nodeUuid, subnodeIndex}))
            );
            switch (symbolsLoadable.state) {
                case 'hasValue':
                    previousSymbolsByNode[nodeUuid] = symbolsLoadable.contents;
                    return symbolsLoadable.contents;
                case 'loading':
                    return previousSymbolsByNode[nodeUuid] || [];
                default:
                    return [];
            }
        },
});