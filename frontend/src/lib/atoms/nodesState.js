import {atomFamily, selectorFamily, waitForAll} from 'recoil';
import { currentSortState } from './currentGraphState';
import { backendURLState } from './settingsState';

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
            const [nodes] = get(
                waitForAll([nodesByTransforamtionStateFamily(transformationHash)])
            );
            return nodes.map(n => n.uuid)
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