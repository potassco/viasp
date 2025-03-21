import {atomFamily, selectorFamily} from 'recoil';
import {bufferedNodesByTransformationStateFamily} from './nodesState';
import { showDiffOnlyState } from './settingsState';

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
                const showDiffOnly = get(showDiffOnlyState);
                const [node] = nodes.filter(n => n.uuid === nodeUuid);
                const [symbol] = showDiffOnly 
                     ? !node?.diff ? [{}] : node.diff.filter(s => s.uuid === symbolUuid)
                     : !node?.atoms ? [{}] : node.atoms.filter(s => s.uuid === symbolUuid);
                return {
                    ...symbol,
                    highlights: [],
                };
            }
    })
})
