import React, {Suspense, useEffect, useRef, useState} from 'react';
import PropTypes from 'prop-types';
import {Node, RecursiveSuperNode} from './Node.react';
import {useRecoilValue} from 'recoil';
import {
    nodeAtomByNodeUuidStateFamily,
} from '../atoms/nodesState';

export function BranchSpace(props) {
    const {transformationHash, transformationId, nodeUuid} = props;
    const node = useRecoilValue(
        nodeAtomByNodeUuidStateFamily({transformationHash, nodeUuid})
    );
    const branchSpaceRef = useRef(null);

    return (
        <div
            className="branch_space"
            key={node.uuid}
            style={{flex: `0 0 ${node.space_multiplier * 100}%`}}
            ref={branchSpaceRef}
        >
            {node.recursive.length > 0 && node.shownRecursion ? (
                <RecursiveSuperNode
                    key={node.uuid}
                    node={node}
                    branchSpace={branchSpaceRef}
                    transformationId={transformationId}
                />
            ) : (
                <Node
                    key={node.uuid}
                    transformationHash={transformationHash}
                    nodeUuid={node}
                    isSubnode={false}
                    branchSpace={branchSpaceRef}
                    transformationId={transformationId}
                />
            )}
        </div>
    );
}

BranchSpace.propTypes = {
    transformationHash: PropTypes.string,
    transformationId: PropTypes.number,
    nodeUuid: PropTypes.string,
};
