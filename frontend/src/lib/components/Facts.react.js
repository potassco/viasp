import './facts.css';
import React, {useRef, Suspense} from 'react';
import {styled} from 'styled-components';
import { RowRowDiv } from './Row.style';
import { Constants } from "../constants";
import { useColorPalette} from '../contexts/ColorPalette';
import {OverflowButton} from './OverflowButton.react';
import {useDebouncedAnimateResize} from '../hooks/useDebouncedAnimateResize';

import { useRecoilValue } from 'recoil';
import {
    nodeUuidsByTransforamtionStateFamily,
    nodeAtomByNodeUuidStateFamily,
} from '../atoms/nodesState';    
import { reorderTransformationDropIndicesState } from '../atoms/reorderTransformationDropIndices';
import { BranchSpace } from './BranchSpace.react';


const RowContainer = styled.div`
    opacity: ${(props) =>
        props.$draggedRowCanBeDroppedHere
            ? 1
            : 1 - Constants.opacityMultiplier};
    transition: opacity 0.5s ease-out;
`;


export function Facts() {
    const [nodeUuid] = useRecoilValue(
        nodeUuidsByTransforamtionStateFamily("-1")
    );
    const fact = useRecoilValue(nodeAtomByNodeUuidStateFamily({transformationHash: "-1", nodeUuid}));
    const tDropIndices = useRecoilValue(reorderTransformationDropIndicesState);

    const colorPalette = useColorPalette();
    const rowbodyRef = useRef(null);
    const transformationIdRef = useRef('-1');

    useDebouncedAnimateResize(rowbodyRef, transformationIdRef);

    if (fact === null) {
        return <div className="row_container"></div>;
    }
    return (
        <RowContainer
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
            <OverflowButton
                transformationHash={'-1'}
            />
        </RowContainer>
    );
}

Facts.propTypes = {};
