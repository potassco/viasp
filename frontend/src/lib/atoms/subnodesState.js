import {selectorFamily, noWait} from 'recoil';
import {backendUrlState, sessionState} from './settingsState';
import { currentSortState } from './currentGraphState';
import {make_default_nodes} from '../utils';

const getSubnodesFromServer = async (
    backendUrl,
    currentSort,
    supernodeUuid,
    session
) => {
    return fetch(`${backendUrl}/graph/subchildren`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session}`,
        },
        body: JSON.stringify({currentSort, supernodeUuid}),
    });
};

const subnodesAtomByNodeUuidStateFamily = selectorFamily({
    key: 'subnodesAtomByNodeUuidState',
    get:
        ({supernodeUuid}) =>
        async ({get}) => {
            if (typeof supernodeUuid === 'undefined') {
                return [];
            }
            const backendUrl = get(backendUrlState);
            const currentSort = get(currentSortState);
            const session = get(sessionState);
            const response = await getSubnodesFromServer(
                backendUrl,
                currentSort,
                supernodeUuid,
                session
            );
            if (!response.ok) {
                throw new Error(response.statusText);
            }
            return response.json();
        },
});

const previousSubnodesBySupernode = {};
export const bufferedSubnodesBySupernodeStateFamily = selectorFamily({
    key: 'bufferedNodesByTransformationState',
    get:
        ({supernodeUuid}) =>
        async ({get}) => {
            const nodesLoadable = get(
                noWait(subnodesAtomByNodeUuidStateFamily({supernodeUuid}))
            );
            switch (nodesLoadable.state) {
                case 'hasValue':
                    previousSubnodesBySupernode[supernodeUuid] =
                        nodesLoadable.contents;
                    return nodesLoadable.contents;
                case 'loading':
                    return (
                        make_default_nodes(previousSubnodesBySupernode[supernodeUuid])
                    );
                default:
                    return [];
            }
        },
});
