import React, {useRef} from 'react';
import PropTypes from 'prop-types';
import {BranchSpaceDiv} from './BranchSpace.style';
import {Node, RecursiveSuperNode} from './Node.react';
import {Box} from './Box.react';
import {useRecoilValue} from 'recoil';
import {
    nodeAtomByNodeUuidStateFamily,
} from '../atoms/nodesState';
import {shownRecursionState} from '../atoms/currentGraphState';

export function BranchSpace(props) {
    const {transformationHash, transformationId, nodeUuid} = props;
    const node = useRecoilValue(
        nodeAtomByNodeUuidStateFamily({transformationHash, nodeUuid})
    );
    const shownRecursion = useRecoilValue(shownRecursionState);
    const branchSpaceRef = useRef(null);

    return (
        <BranchSpaceDiv
            className="branch_space"
            key={nodeUuid}
            $spaceMultiplier={node.space_multiplier}
            ref={branchSpaceRef}
        >
            {node.recursive && shownRecursion.includes(nodeUuid) ? (
                <RecursiveSuperNode
                    key={nodeUuid}
                    transformationHash={transformationHash}
                    nodeUuid={nodeUuid}
                    branchSpace={branchSpaceRef}
                    transformationId={transformationId}
                />
            ) : transformationHash === 'clingraphTransformation' ? (
                <Box
                    key={nodeUuid}
                    clingraphUuid={nodeUuid}
                    branchSpace={branchSpaceRef}
                />
            ) : (
                <Node
                    key={nodeUuid}
                    transformationHash={transformationHash}
                    nodeUuid={nodeUuid}
                    branchSpace={branchSpaceRef}
                    transformationId={transformationId}
                />
            )}
        </BranchSpaceDiv>
    );
}

BranchSpace.propTypes = {
    transformationHash: PropTypes.string,
    transformationId: PropTypes.string,
    nodeUuid: PropTypes.string,
};
