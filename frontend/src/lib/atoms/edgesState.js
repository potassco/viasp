import { selector, waitForAll, waitForAllSettled } from 'recoil';
import {
    currentSortState,
    numberOfTransformationsState,
    shownRecursionState,
    clingraphState,
} from './currentGraphState';
import { backendURLState } from './settingsState';
import { proxyTransformationStateFamily } from './transformationsState';
import { nodesByTransforamtionStateFamily } from './nodesState';

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

export const edgesState = selector({
    key: 'edgesState',
    get: async ({get}) => {
        const currentSort = get(currentSortState);
        const backendURL = get(backendURLState);

        // create dependencies for automatic reloading
        const shownRecursion = get(shownRecursionState);
        const usingClingraph = get(clingraphState).length > 0;
        const numberOfTransformations = get(numberOfTransformationsState);
        const arrayofobjects = Array.from(
            {length: numberOfTransformations},
            (_, i) => ({id: i})
        );
        const transformations = get(
            waitForAllSettled(
                arrayofobjects.map(({id}) =>
                    proxyTransformationStateFamily(id)
                ),
            )
        );
        const nodes = get(
            waitForAllSettled(
                transformations.map(t => nodesByTransforamtionStateFamily(t.hash)),
            )
        );

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
});