import {atom, selector, atomFamily, selectorFamily, waitForAll} from 'recoil';

import {backendUrlState} from './settingsState';
import {proxyTransformationStateFamily} from './transformationsState';
import {
    nodeUuidsByTransforamtionStateFamily,
    nodeIsExpandableVByNodeUuidStateFamily,
    nodeIsCollapsibleVByNodeUuidStateFamily,
    nodeIsExpandVAllTheWayByNodeUuidStateFamily,
    nodeShowMiniByNodeUuidStateFamily,
} from './nodesState';
import {clingraphNodesState} from './clingraphState';


export const currentSortState = atom({
    key: 'currentSortState',
    default: selector({
        key: 'currentSortState/Default',
        get: async ({get}) => {
            const backendURL = get(backendUrlState);
            const response = await fetch(`${backendURL}/graph/current`);
            if (!response.ok) {
                throw new Error(response.statusText);
            }
            return response.json();
        }
    }),
});


export const numberOfTransformationsFromApiState = selector({
    key: 'numberOfTransformationsStateeee',
    get: async ({get}) => {
        const currentSort = get(currentSortState);
        const backendURL = get(backendUrlState);
        const response = await fetch(
            `${backendURL}/transformations/current`
        );
        if (!response.ok) {
            throw new Error(response.statusText);
        }
        const numberOfTransformations = await response.json();
        return Array.from({length: numberOfTransformations}, (_, i) => ({
            id: i,
        }));
    }
});

export const numberOfTransformationsState = atom({
    key: 'numberOfTransformationsState',
    default: selector({
        key: 'numberOfTransformationsState/Default',
        get: async ({get}) => {
            return get(waitForAll([numberOfTransformationsFromApiState]))[0];
        }
    }),
})

const defaultShownRecursion = [];
export const shownRecursionState = atom({
    key: 'shownRecursionState',
    default: defaultShownRecursion,
});

const defaultOverflowButtonState = {
    isExpandableV: false,
    isCollapsibleV: false,
    allNodesShowMini: false,
};

export const overflowButtonState = selectorFamily({
    key: 'overflowButtonState',
    get:
        (transformationHash) =>
        ({get}) => {
            if (!transformationHash) {
                return defaultOverflowButtonState;
            }
            const [nodeUuidsByTransforamtion] = get(
                waitForAll([
                    nodeUuidsByTransforamtionStateFamily(
                        transformationHash
                    ),
                ])
            );
            const nodesIsExpandableV = get(
                waitForAll(
                    nodeUuidsByTransforamtion.map((uuid) =>
                        nodeIsExpandableVByNodeUuidStateFamily(uuid)
                    )
                )
            );
            const nodesIsCollapsibleV = get(
                waitForAll(
                    nodeUuidsByTransforamtion.map((uuid) =>
                        nodeIsCollapsibleVByNodeUuidStateFamily(uuid)
                    )
                )
            );
            const nodeIsExpandVAllTheWay = get(
                waitForAll(
                    nodeUuidsByTransforamtion.map((uuid) =>
                        nodeIsExpandVAllTheWayByNodeUuidStateFamily(uuid)
                    )
                )
            );
            const nodesShowMini = get(
                waitForAll(
                    nodeUuidsByTransforamtion.map((uuid) =>
                        nodeShowMiniByNodeUuidStateFamily(uuid)
                    )
                )
            );

            const rowIsExpandableV = nodesIsExpandableV.some((v,i) => 
                v && !nodesShowMini[i]);
            const rowIsCollapsibleV = nodesIsCollapsibleV.some((v,i) => 
                v && !nodesShowMini[i]);
            const rowIsExpandVAllTheWay = nodeIsExpandVAllTheWay.every((v) => v);
            const allNodesShowMini = nodesShowMini.every((v) => v);
            return {
                rowIsExpandableV,
                rowIsCollapsibleV,
                rowIsExpandVAllTheWay,
                allNodesShowMini,
            };
        },
});

export const rowHasOverflowButtonState = atomFamily({
    key: 'rowHasOverflowButtonState',
    get: false,
});

export const usingClingraphState = selector({
    key: 'usingClingraphState',
    get: async ({get}) => {
        return get(clingraphNodesState).length > 0;
    }
})

export const isCurrentlyResizedState = atom({
    key: 'isCurrentlyResizedState',
    default: false,
});

export const isCurrentlyAnimatingHeightStateFamily = atomFamily({
    key: 'isCurrentlyAnimatingHeightStateFamily',
    default: false,
});

export const isCurrentlyAnimatingHeightState = selector({
    key: 'isCurrentlyAnimatingHeightState',
    get: ({get}) => {
        const numberOfTransformations = get(numberOfTransformationsState);
        if (
            !Array.isArray(numberOfTransformations) ||
            numberOfTransformations.length === 0
        ) {
            return false;
        }

        const transformations = get(
            waitForAll(
                numberOfTransformations.map((n) =>
                    proxyTransformationStateFamily(n.id)
                )
            )
        );
        const validTransformations = transformations.filter((t) => t && t.hash);

        const nodeUuidsArray = get(
            waitForAll(
                validTransformations.map((t) =>
                    nodeUuidsByTransforamtionStateFamily(t.hash)
                )
            )
        );

        const allNodeUuids = nodeUuidsArray.flat();
        const animationStates = get(
            waitForAll(
                allNodeUuids.map((uuid) =>
                    isCurrentlyAnimatingHeightStateFamily(uuid)
                )
            )
        );
        return animationStates.some((v) => v);
    },
});

export const isCurrentlyZoomingState = atom({
    key: 'isCurrentlyZoomingState',
    default: false,
});

export const isCurrentlyPickedUpState = atom({
    key: 'isCurrentlyPickedUp',
    default: false,
});

export const isCurrentlyBeingReorderedState = atom({
    key: 'isCurrentlyBeingReorderedState',
    default: false,
})

export const transformationMountedStateFamily = atomFamily({
    key: 'transformationMountedState',
    default: false,
});

export const isAnimatingState = selector({
    key: 'isAnimatingState',
    get: ({get}) => {
        return (
            get(isCurrentlyResizedState) ||
            get(isCurrentlyAnimatingHeightState) ||
            get(isCurrentlyZoomingState) ||
            get(isCurrentlyPickedUpState) ||
            get(isCurrentlyBeingReorderedState) 
        );
    }
});
