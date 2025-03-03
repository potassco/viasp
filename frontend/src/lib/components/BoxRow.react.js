import React, {useEffect} from 'react';
import './boxrow.css';
import {styled} from 'styled-components';
import { RowContainerDiv } from './Row.style';
import {Constants} from '../constants';
import {BranchSpace} from './BranchSpace.react';
import {useRecoilValue} from 'recoil';
import { reorderTransformationDropIndicesState } from '../atoms/reorderTransformationDropIndices';
import { colorPaletteState} from '../atoms/settingsState';
import {numberOfTransformationsState} from '../atoms/currentGraphState';
import {clingraphNodesState} from '../atoms/clingraphState';
import { mapShiftState } from '../atoms/mapShiftState';

export function Boxrow() {
    const mapShift = useRecoilValue(mapShiftState);
    const boxrowRef = React.useRef(null);
    const colorPalette = useRecoilValue(colorPaletteState);
    const clingraphGraphics = useRecoilValue(clingraphNodesState);
    const tDropIndices = useRecoilValue(reorderTransformationDropIndicesState);
    const numberOfTransformations = useRecoilValue(numberOfTransformationsState)

    const branchSpaceRefs = React.useRef([]);
    useEffect(() => {
        branchSpaceRefs.current = clingraphGraphics.map(
            (_, i) => branchSpaceRefs.current[i] ?? React.createRef()
        );
    }, [clingraphGraphics]);

    return (
        <RowContainerDiv
            className="row_container boxrow_container"
            $draggedRowCanBeDroppedHere={tDropIndices === null}
            $background={
                colorPalette.rowShading[
                    (numberOfTransformations + 1) %
                        colorPalette.rowShading.length
                ]
            }
        >
            <div
                ref={boxrowRef}
                className="boxrow_row"
                style={{
                    width: `${
                        clingraphGraphics.length === 1
                            ? 100
                            : mapShift.scale * 100
                    }%`,
                    transform: `translateX(${
                        clingraphGraphics.length === 1
                            ? 0
                            : mapShift.translation.x
                    }px)`,
                }}
            >
                {clingraphGraphics.map((node) => (
                    <BranchSpace
                        key={`branch_space_${node.uuid}`}
                        transformationHash={'clingraphTransformation'}
                        transformationId={'clingraphTransformation'}
                        nodeUuid={node.uuid}
                    />
                ))}
            </div>
        </RowContainerDiv>
    );
}

Boxrow.propTypes = {};
