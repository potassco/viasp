import React from 'react';
import {styled} from 'styled-components';
import Draggable from 'react-draggable';

import {useRecoilValue, useResetRecoilState} from 'recoil';
import { colorPaletteState } from '../atoms/settingsState';
import {
    modalForSymbolState,
    modalPositionState,
    modalVisibleState,
    modalContentState,
} from '../atoms/modalState';
import { CloseButton } from '../fragments/CloseButton.react';
import { DragHandle } from '../fragments/DragHandle.react';

const MODALWIDTH = 200;
const MODALDISTANCETOEDGE = 40;
const ModalDiv = styled.div`
    top: ${(props) => props.$position.top}px;
    left: ${(props) => props.$position.left}px;
    width: ${MODALWIDTH}px;

    position: sticky;
    background-color: white;
    border: 1pt solid;
    border-radius: 0.7em;
    padding: 10px;
    z-index: 1000;
    line-break: anywhere;

    background-color: ${({$colorPalette}) => $colorPalette.light};
    color: ${({$colorPalette}) => $colorPalette.dark};
    border-color: ${({$colorPalette}) => $colorPalette.primary};

    margin: 12pt 3% 12pt 3%;

    &:hover {
        transition: drop-shadow 0.1s;
        filter: drop-shadow(0 0 0.14em #333);

        .button {
            display: block;
        }
    }

    .button {
        display: none;
    }
`;

export function Modal() {
    const colorPalette = useRecoilValue(colorPaletteState);
    const modalVisible = useRecoilValue(modalVisibleState);
    const spawnPosition = useRecoilValue(modalPositionState);
    const resetModal = useResetRecoilState(modalForSymbolState);
    const modalContent = useRecoilValue(modalContentState);

    const adjustedPosition = {
        top: spawnPosition.top,
        left: Math.min(
            spawnPosition.left,
            window.innerWidth - MODALWIDTH - MODALDISTANCETOEDGE
        ),
    };

    return !modalVisible ? null : (
        <Draggable handle=".dragIndicator">
            <ModalDiv $position={adjustedPosition} $colorPalette={colorPalette}>
                <DragHandle handleName={'dragIndicator'} />
                <CloseButton onClose={resetModal} />
                Modal content will show up here {modalContent}
            </ModalDiv>
        </Draggable>
    );
}

Modal.propTypes = {
};