import { selector, waitForAll } from 'recoil';
import {
    currentSortState,
    numberOfTransformationsState,
    shownRecursionState,
    usingClingraphState,
} from './currentGraphState';
import { backendUrlState } from './settingsState';
import { proxyTransformationStateFamily } from './transformationsState';
import {nodeUuidsByTransforamtionStateFamily} from './nodesState';

const getEdgesFromServer = async (
    backendUrl,
    currentSort,
    shownRecursion,
    usingClingraph
) => {
    return fetch(`${backendUrl}/graph/edges`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
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
        const response = await getEdgesFromServer(
            backendURL,
            currentSort,
            shownRecursion,
            usingClingraph
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

        return edges
    }
});