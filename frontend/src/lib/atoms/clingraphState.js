import {selector, atomFamily, selectorFamily, waitForAll} from 'recoil';
import {backendUrlState, sessionState} from './settingsState';
import {currentSortState} from './currentGraphState';

const getClingraphsFromServer = async (backendUrl, currentSort, session) => {
    return fetch(`${backendUrl}/clingraph/children`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session}`,
        },
        body: JSON.stringify({currentSort}),
    });
};

export const clingraphNodesState = selector({
    key: 'clingraphNodesState',
    get: async ({get}) => {
        const backendURL = get(backendUrlState);
        const session = get(sessionState)
        const currentSort = get(currentSortState);
        const response = await getClingraphsFromServer(
            backendURL,
            currentSort,
            session
        );
        if (!response.ok) {
            throw new Error(response.statusText);
        }
        return response.json();
    }
})

export const clingraphAtomByUuidState = atomFamily({
    key: 'clingraphGraphicsState',
    default: selectorFamily({
        key: 'clingraphGraphicsState/Default',
        get: (clingraphUuid) =>
            async ({get}) => {
                const [clingraphNode] = get(
                    waitForAll([clingraphNodesState])
                ).filter((node) => node.uuid === clingraphUuid);
                return {
                    ...clingraphNode,
                    loading: false,
                };
        }
    }),
})