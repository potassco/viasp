import {atomFamily, selectorFamily, waitForAll} from 'recoil';
import {bufferedNodesByTransformationStateFamily} from './nodesState';

export const symoblsByNodeStateFamily = atomFamily({
    key: 'symoblsByNodeState',
    default: selectorFamily({
        key: 'symoblsByNodeState/Default',
        get: 
            ({transformationHash, nodeUuid, symbolUuid}) =>
            ({get}) => {
                const nodes = get(
                    bufferedNodesByTransformationStateFamily(transformationHash)
                )
                const [node] = nodes.filter(n => n.uuid === nodeUuid);
                const [symbol] = !node?.diff ? [{}] : node.diff.filter(s => s.uuid === symbolUuid);
                return {
                    ...symbol,
                    highlights: [],
                };
            }
    })
})
