import { selector, waitForAll } from 'recoil';
import {
    currentSortState,
    numberOfTransformationsState,
    shownRecursionState,
    usingClingraphState,
} from './currentGraphState';
import { backendUrlState, sessionState } from './settingsState';
import { proxyTransformationStateFamily } from './transformationsState';
import { bufferedSymbolsByNodeUuidStateFamily } from './symbolsState';
import {nodeUuidsByTransforamtionStateFamily} from './nodesState';

const getEdgesFromServer = async (
    backendUrl,
    currentSort,
    shownRecursion,
    usingClingraph,
    session
) => {
    return fetch(`${backendUrl}/graph/edges`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session}`,
        },
        body: JSON.stringify({currentSort, shownRecursion, usingClingraph}),
    });
};

export const edgesFromApiState = selector({
    key: 'edgesStateFromApi',
    get: async ({get}) => {
        const currentSort = get(currentSortState);
        const backendURL = get(backendUrlState);
        const shownRecursion = get(shownRecursionState);
        const usingClingraph = get(usingClingraphState);
        const session = get(sessionState);
        const response = await getEdgesFromServer(
            backendURL,
            currentSort,
            shownRecursion,
            usingClingraph,
            session
        );

        if (!response.ok) {
            throw new Error(response.statusText);
        }
        return response.json();
    }
})

export const edgesState = selector({
    key: 'edgesState',
    get: async ({get}) => {
        const edges = get(edgesFromApiState);

        // create additional dependencies for automatic reloading
        const numberOfTransformations = get(numberOfTransformationsState);
        const transformations = get(
            waitForAll(
                numberOfTransformations.map(({id}) =>
                    proxyTransformationStateFamily(id)
                )
            )
        );
        const nodes = get(waitForAll(
            transformations.map(t => nodeUuidsByTransforamtionStateFamily(t.hash))
        ));
        // const symbols = get(
        //     waitForAll(
        //         nodes.map((n) =>
        //             n.map((uuid) => bufferedSymbolsByNodeUuidStateFamily({nodeUuid: uuid}))
        //         )
        //     )
        // );
        // console.log({symbols});


        return edges
    }
});