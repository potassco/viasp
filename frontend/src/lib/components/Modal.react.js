import React from 'react';
import Draggable from 'react-draggable';

import PulseLoader from 'react-spinners/PulseLoader';
import {Constants} from '../constants';

import { SymbolElementSpan } from './Symbol.style';
import { StyledListItem, StyledList, ModalDiv, ModalHeader, calculateAdjustedPosition } from './Modal.style';

import {useRecoilValue, useRecoilState, useResetRecoilState, useRecoilCallback, useSetRecoilState} from 'recoil';
import { colorPaletteState } from '../atoms/settingsState';
import {
    modalForSymbolState,
    modalPositionState,
    modalVisibleState,
    modalContentState,
} from '../atoms/modalState';
import {handleModalHighlightCallback} from '../hooks/highlights';

import { CloseButton } from '../fragments/CloseButton.react';

function ModalContent() {
    const colorPalette = useRecoilValue(colorPaletteState);
    const modalContent = useRecoilValue(modalContentState);
    const originSymbol = useRecoilValue(modalForSymbolState);
    const backgroundColor = colorPalette.light;
    const handleSearchResultSuggestions = useRecoilCallback(
        handleModalHighlightCallback,
        []
    );

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
    const onClickHandler = (e) => {
        const symbolUuid = e.target.id.split('_')[0];
        if (symbolUuid === 'noUuid') {
            return;
        }
        const symbolRepr = e.target.innerText;
        handleSearchResultSuggestions({
            symbolUuid,
            repr: symbolRepr,
        });
    }

    const contentToShow = modalContent?.content.map((symbol, i) => (
        <StyledListItem key={symbol.reason_repr} $colorPalette={colorPalette} >
            <SymbolElementSpan
                id={(symbol.reason_uuid !== null ? symbol.reason_uuid : 'noUuid_' + i) + '_modal'}
                $pulsate={false}
                $pulsatingColor={null}
                $backgroundColor={backgroundColor}
                $hasReason={symbol.reason_uuid !== null}
                onClick={onClickHandler}
            >
                {symbol.reason_repr}
            </SymbolElementSpan>
        </StyledListItem>
    ));

    return (
        <div className="modalContent">
            <ModalHeader className="modalHeader txt-elem">{originSymbol.repr}</ModalHeader>
            <StyledList className="modalContent txt-elem">
                {contentToShow}
            </StyledList>
        </div>
    );
}

ModalContent.propTypes = {
};

export function Modal() {
    const colorPalette = useRecoilValue(colorPaletteState);
    const modalVisible = useRecoilValue(modalVisibleState);
    const spawnPosition = useRecoilValue(modalPositionState);
    const resetModal = useResetRecoilState(modalForSymbolState);
    const adjustedPosition = calculateAdjustedPosition(spawnPosition);


    return !modalVisible ? null : (
        <Draggable handle=".modalDiv" cancel='.modalContent'>
            <ModalDiv 
                className='modalDiv'
                $position={adjustedPosition}
                $colorPalette={colorPalette} 
            >
                <CloseButton onClose={resetModal} />
                <ModalContent />
            </ModalDiv>
        </Draggable>
    );
}

Modal.propTypes = {
};