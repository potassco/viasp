import React, {useEffect} from 'react';
import './boxrow.css';
import {styled} from 'styled-components';
import {Constants} from '../constants';
import { useColorPalette } from '../contexts/ColorPalette';
import {Box} from './Box.react';
import {useMapShift} from '../contexts/MapShiftContext';
import {useRecoilValue} from 'recoil';
import { reorderTransformationDropIndicesState } from '../atoms/reorderTransformationDropIndices';
import {
    numberOfTransformationsState,
    clingraphState,
} from '../atoms/currentGraphState';

const RowContainer = styled.div`
    opacity: ${(props) =>
        props.$draggedRowCanBeDroppedHere
            ? 1
            : 1 - Constants.opacityMultiplier};
    background: ${(props) => props.$background};
    transition: opacity 0.5s ease-out;
`;

export function Boxrow() {
    const {mapShiftValue: transform} = useMapShift();
    const boxrowRef = React.useRef(null);
    const colorPalette = useColorPalette();
    const clingraphGraphics = useRecoilValue(clingraphState);
    const tDropIndices = useRecoilValue(reorderTransformationDropIndicesState);
    const numberOfTransformations = useRecoilValue(numberOfTransformationsState)

    const branchSpaceRefs = React.useRef([]);
    useEffect(() => {
        branchSpaceRefs.current = clingraphGraphics.map(
            (_, i) => branchSpaceRefs.current[i] ?? React.createRef()
        );
    }, [clingraphGraphics]);

    return (
        <RowContainer
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
                            : transform.scale * 100
                    }%`,
                    transform: `translateX(${
                        clingraphGraphics.length === 1
                            ? 0
                            : transform.translation.x
                    }px)`,
                }}
            >
                {clingraphGraphics.map((child, index) => {
                    const space_multiplier = child.space_multiplier * 100;

                    return (
                        <div
                            className="branch_space"
                            key={child.uuid}
                            style={{flex: `0 0 ${space_multiplier}%`}}
                            ref={branchSpaceRefs.current[index]}
                        >
                            <Box
                                key={child.uuid}
                                node={child}
                                branchSpace={branchSpaceRefs.current[index]}
                            />
                        </div>
                    );
                })}
            </div>
        </RowContainer>
    );
}

Boxrow.propTypes = {};
