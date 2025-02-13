import React, {useRef} from 'react';
import PropTypes from 'prop-types';
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
    const shownRecursion = useRecoilValue(
        shownRecursionState
    )
    const branchSpaceRef = useRef(null);

    // if (transformationId === '0') {console.log("Rerender BranchSpace")}
    return (
        <div
            className="branch_space"
            key={node.uuid}
            style={{flex: `0 0 ${node.space_multiplier * 100}%`}}
            ref={branchSpaceRef}
        >
            {node.recursive.length > 0 &&
            shownRecursion.includes(nodeUuid) ? (
                <RecursiveSuperNode
                    key={node.uuid}
                    transformationHash={transformationHash}
                    nodeUuid={nodeUuid}
                    branchSpace={branchSpaceRef}
                    transformationId={transformationId}
                />
            ) : transformationHash === 'clingraphTransformation' ? (
                <Box
                    key={node.uuid}
                    clingraphUuid={node.uuid}
                    branchSpace={branchSpaceRef}
                />
            ) : (
                <Node
                    key={node.uuid}
                    transformationHash={transformationHash}
                    nodeUuid={nodeUuid}
                    branchSpace={branchSpaceRef}
                    transformationId={transformationId}
                />
            )}
        </div>
    );
}

BranchSpace.propTypes = {
    transformationHash: PropTypes.string,
    transformationId: PropTypes.string,
    nodeUuid: PropTypes.string,
};
