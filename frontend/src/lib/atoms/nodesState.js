import {atomFamily, selectorFamily, waitForAll, noWait} from 'recoil';
import { currentSortState } from './currentGraphState';
import { backendURLState } from './settingsState';
import { node } from 'prop-types';

const getNodesFromServer = async (backendUrl, transformationHash, currentSort) => {
    return fetch(
        `${backendUrl}/graph/children`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({transformationHash, currentSort})
        }
    )
}

export const nodesByTransforamtionStateFamily = selectorFamily({
    key: 'nodesByTransformation',
    get: (transformationHash) => async ({get}) => {
        const currentSort = get(currentSortState);
        const backendURL = get(backendURLState);
        const response = await getNodesFromServer(backendURL, transformationHash, currentSort)

        if (!response.ok) {
            throw new Error(response.statusText);
        }
        return response.json();
    }
})

export const nodeUuidsByTransforamtionStateFamily = selectorFamily({
    key: 'proxyNodesByTransformationState',
    get: 
        (transformationHash) =>
        ({get}) => {
            const nodesLoadable = get(
                noWait(nodesByTransforamtionStateFamily(transformationHash))
            )
            switch (nodesLoadable.state) {
                case 'hasValue':
                    return nodesLoadable.contents.map(n => n.uuid)
                case 'loading':
                    return []
                case 'hasError':
                    throw nodesLoadable.contents
                default:
                    return []
            }
        }
})

export const nodeAtomByNodeUuidStateFamily = atomFamily({
    key: 'nodeAtomByNodeUuidState',
    default: selectorFamily({
        key: 'nodeAtomByNodeUuidState/Default',
        get:
            ({transformationHash, nodeUuid}) =>
            ({get}) => {
                const [nodes] = get(
                    waitForAll([nodesByTransforamtionStateFamily(transformationHash)])
                );
                const [node] = nodes.filter(n => n.uuid === nodeUuid)
                if (!node) {
                    throw new Error(`Node with uuid ${nodeUuid} not found`)
                }
                return {
                    ...node,
                    loading: false,
                    shownRecursion: false,
                    isExpandableV: false,
                    isCollapsibleV: false,
                    isExpandVAllTheWay: false,
                    showMini: false,
                };
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