import React from 'react';
import {styled} from 'styled-components';
import Draggable from 'react-draggable';

import PulseLoader from 'react-spinners/PulseLoader';
import {Constants} from '../constants';

import { Symbol } from './Symbol.react';

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
const MODALDISTANCETOEDGE = 60;
const ModalDiv = styled.div`
    top: ${(props) => props.$position.top}px;
    left: ${(props) => props.$position.left}px;
    width: ${MODALWIDTH}px;

    position: absolute;
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

const StyledList = styled.ul`
    list-style-type: none;
    padding: 0;
    margin: 0;
`;

const StyledListItem = styled.li`
    background-color: ${({$colorPalette}) => $colorPalette.light};
    color: ${({$colorPalette}) => $colorPalette.dark};
    border: 1px solid ${({$colorPalette}) => $colorPalette.primary};
    border-radius: 0.5em;
    padding: 5px;
    margin: 5px 0;
    
    box-shadow: 0 0 0.14em #333;
    transition: transform 0.2s ease, box-shadow 0.2s ease;

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }
`;

function ModalContent() {
    const colorPalette = useRecoilValue(colorPaletteState);
    const modalContent = useRecoilValue(modalContentState);

    if (modalContent?.loading) {
        return (
            <PulseLoader
                color={colorPalette.dark}
                loading={true}
                size={'0.25em'}
                speedMultiplier={Constants.awaitingInputSpinnerSpeed}
            />
        );
    }
    const contentToShow = modalContent?.content.map((symbol) => (
        <StyledListItem key={symbol.reason_repr} $colorPalette={colorPalette}>
            <Symbol
                symbolUuid={symbol.reason_uuid}
                isSubnode={false}
                nodeUuid={"test"}
                transformationHash={"test"}
                has_reason={false}
                symbol_repr={symbol.reason_repr}
            />
        </StyledListItem>
    ));

    return <StyledList>{contentToShow}</StyledList>;
}

ModalContent.propTypes = {
};

export function Modal() {
    const colorPalette = useRecoilValue(colorPaletteState);
    const modalVisible = useRecoilValue(modalVisibleState);
    const spawnPosition = useRecoilValue(modalPositionState);
    const resetModal = useResetRecoilState(modalForSymbolState);

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
                <ModalContent />
            </ModalDiv>
        </Draggable>
    );
}

Modal.propTypes = {
};