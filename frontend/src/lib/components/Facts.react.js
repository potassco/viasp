import './facts.css';
import React, {useRef, Suspense} from 'react';
import { RowRowDiv, RowContainerDiv } from './Row.style';
import {OverflowButton} from './OverflowButton.react';

import { useRecoilValue } from 'recoil';
import {
    nodeUuidsByTransforamtionStateFamily,
    nodeAtomByNodeUuidStateFamily,
} from '../atoms/nodesState';
import { colorPaletteState } from '../atoms/settingsState';
import { reorderTransformationDropIndicesState } from '../atoms/reorderTransformationDropIndices';
import { BranchSpace } from './BranchSpace.react';

export function Facts() {
    const [nodeUuid] = useRecoilValue(
        nodeUuidsByTransforamtionStateFamily("-1")
    );
    const fact = useRecoilValue(nodeAtomByNodeUuidStateFamily({transformationHash: "-1", nodeUuid}));
    const tDropIndices = useRecoilValue(reorderTransformationDropIndicesState);

    const colorPalette = useRecoilValue(colorPaletteState);
    const rowbodyRef = useRef(null);


    if (fact === null) {
        return <div className="row_container"></div>;
    }
    return (
        <RowContainerDiv
            className="row_container facts_banner"
            $draggedRowCanBeDroppedHere={tDropIndices === null}
        >
            <RowRowDiv
                className="row_row"
                $background={colorPalette.rowShading[0]}
                $onlyOneNode={true}
                $scale={1}
                $translation={0}
                $isConstraintsOnly={false}
                ref={rowbodyRef}
            >
                <Suspense fallback={<div>Loading...</div>}>
                    <BranchSpace
                        key={`branch_space_${nodeUuid}`}
                        transformationHash={'-1'}
                        transformationId={'-1'}
                        nodeUuid={nodeUuid}
                    />
                </Suspense>
            </RowRowDiv>
            <OverflowButton transformationHash={'-1'} />
        </RowContainerDiv>
    );
}

Facts.propTypes = {};
