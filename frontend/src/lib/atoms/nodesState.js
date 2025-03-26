import {atomFamily, selectorFamily, waitForAll, noWait} from 'recoil';
import { currentSortState } from './currentGraphState';
import {backendUrlState, showDiffOnlyState, sessionState} from './settingsState';
import {bufferedSubnodesBySupernodeStateFamily} from './subnodesState';
import {clingraphNodesState} from './clingraphState';

import {make_default_nodes} from '../utils/index';

const getNodesFromServer = async (backendUrl, transformationHash, currentSort, session) => {
    return fetch(`${backendUrl}/graph/children`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session}`,
        },
        body: JSON.stringify({transformationHash, currentSort}),
    });
}

export const nodesByTransforamtionStateFamily = selectorFamily({
    key: 'nodesByTransformation',
    get: (transformationHash) => async ({get}) => {
        const currentSort = get(currentSortState);
        const backendURL = get(backendUrlState);
        const session = get(sessionState);
        const response = await getNodesFromServer(
            backendURL,
            transformationHash,
            currentSort,
            session
        );

        if (!response.ok) {
            throw new Error(response.statusText);
        }
        return response.json();
    }
})

const previousNodesByTransformation = {};
export const bufferedNodesByTransformationStateFamily = selectorFamily({
    key: 'bufferedNodesByTransformationState',
    get:
        (transformationHash) =>
        async ({get}) => {
            const nodesLoadable = get(
                noWait(nodesByTransforamtionStateFamily(transformationHash))
            );
            switch (nodesLoadable.state) {
                case 'hasValue':
                    previousNodesByTransformation[transformationHash] =
                        nodesLoadable.contents;
                    return nodesLoadable.contents;
                case 'loading':
                    return (
                        make_default_nodes(previousNodesByTransformation[
                            transformationHash
                        ])
                    );
                default:
                    return [];
            }
        },
});

export const nodeUuidsByTransforamtionStateFamily = selectorFamily({
    key: 'proxyNodesByTransformationState',
    get:
        (transformationHash) =>
        ({get}) => {
            const nodes = get(bufferedNodesByTransformationStateFamily(transformationHash));
            return nodes.map((n) => n.node_uuid);
        },
});

export const nodeAtomByNodeUuidStateFamily = atomFamily({
    key: 'nodeAtomByNodeUuidState',
    default: selectorFamily({
        key: 'nodeAtomByNodeUuidState/Default',
        get:
            ({transformationHash, nodeUuid, subnodeIndex}) =>
            ({get}) => {
                if (transformationHash === 'clingraphTransformation') {
                    const [nodes] = get(waitForAll([clingraphNodesState]));
                    const [node] = nodes.filter((n) => n.uuid === nodeUuid);
                    return {
                        ...node,
                        node_uuid: node.uuid,
                        recursive: [],
                        loading: true,
                    }
                }
                if (typeof subnodeIndex !== 'undefined') {
                    const nodes = get(
                        bufferedSubnodesBySupernodeStateFamily({supernodeUuid: nodeUuid})
                    );
                    return nodes[subnodeIndex];
                }
                const nodes = get(
                    bufferedNodesByTransformationStateFamily(transformationHash)
                );
                const [node] = nodes.filter((n) => n.node_uuid === nodeUuid);
                if (!node) {
                    throw new Error(`Node with uuid ${nodeUuid} not found`)
                }
                return node;
            }
    })
})

export const nodesByTransformationHash = selectorFamily({
    key: 'nodesByTransformationHash',
    get: (transformationHash) => ({get}) => {
        const nodeUuids = get(nodeUuidsByTransforamtionStateFamily(transformationHash));
        const nodeAtoms = nodeUuids.map(uuid => 
            get(
                nodeAtomByNodeUuidStateFamily({transformationHash, nodeUuid: uuid})
            )
        );
        return nodeAtoms;
    },
    set: (transformationHash) => ({set}, newValue) => {
        newValue.forEach(node => {
            set(
                nodeAtomByNodeUuidStateFamily({transformationHash, nodeUuid: node.uuid}),
                node
            )
        })
    }
})

export const nodeLoadingByNodeUuidStateFamily = atomFamily({
    key: 'nodeLoadingByNodeUuidState',
    default: false,
});

export const nodeShownRecursionByNodeUuidStateFamily = atomFamily({
    key: 'nodeShownRecursionByNodeUuidState',
    default: false,
});

export const nodeIsExpandableVByNodeUuidStateFamily = atomFamily({
    key: 'nodeIsExpandableVByNodeUuidState',
    default: false,
});

export const nodeIsCollapsibleVByNodeUuidStateFamily = atomFamily({
    key: 'nodeIsCollapsibleVByNodeUuidState',
    default: false,
});

export const nodeIsExpandVAllTheWayByNodeUuidStateFamily = atomFamily({
    key: 'nodeIsExpandVAllTheWayByNodeUuidState',
    default: false,
});

export const nodeShowMiniByNodeUuidStateFamily = atomFamily({
    key: 'nodeShowMiniByNodeUuidState',
    default: false,
});

export const longestSymbolInNodeByNodeUuidStateFamily = atomFamily({
    key: 'longestSymbolInNodeByNodeUuidState',
    default: 0,
});
