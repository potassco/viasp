import React, {useState, useEffect} from 'react';
import Draggable from 'react-draggable';

import PulseLoader from 'react-spinners/PulseLoader';
import {Constants} from '../constants';

import { SymbolElementSpan } from './Symbol.style';
import {
    StyledListItem,
    StyledList,
    ModalDiv,
    ModalHeaderDiv,
    ModalHeaderSpan,
    calculateModalPosition
} from './Modal.style';

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
import { isAnimatingState, shownRecursionState } from '../atoms/currentGraphState';


function ModalHeader() {
    const colorPalette = useRecoilValue(colorPaletteState);
    const resetModal = useResetRecoilState(modalForSymbolState);
    const originSymbol = useRecoilValue(modalForSymbolState);

    return (
        <ModalHeaderSpan>
            <ModalHeaderDiv
                className="modalHeader txt-elem"
                $colorPalette={colorPalette}
            >
                {originSymbol.repr}
            </ModalHeaderDiv>
            <CloseButton onClose={resetModal} />
        </ModalHeaderSpan>
    );
}

ModalHeader.propTypes = {
};

function ModalContent() {
    const colorPalette = useRecoilValue(colorPaletteState);
    const modalContent = useRecoilValue(modalContentState);
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
                $backgroundColor={colorPalette.light}
                $hasReason={symbol.reason_uuid !== null}
                onClick={onClickHandler}
            >
                {symbol.reason_repr}
            </SymbolElementSpan>
        </StyledListItem>
    ));

    return (
        <div className="modalContent">
            <ModalHeader />
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
    const [spawnPosition, setSpawnPosition] =
        useState({x: 0, y: 0});
    const modalForSymbol = useRecoilValue(modalForSymbolState);
    const recursion = useRecoilValue(shownRecursionState);
    const isAnimating = useRecoilValue(isAnimatingState)

    useEffect(() => {
        if (isAnimating) {
            return;
        }
        const newPosition = calculateModalPosition(
            modalVisible,
            modalForSymbol.nodeId,
            modalForSymbol.supernodeId,
        );
        if (newPosition) {
            setSpawnPosition(newPosition);
        }
    }, [modalVisible, modalForSymbol, recursion, isAnimating]);

    // If modal is not visible, don't render anything
    if (!modalVisible) { 
        return null 
    };

    return (
        <div style={{position: 'relative', width: '100%', height: '0'}}>
            <Draggable
                handle=".modalDiv"
                cancel=".modalContent"
                defaultPosition={spawnPosition}
                position={spawnPosition}
                onStop={(e, data) => {
                    setSpawnPosition({x: data.x, y: data.y});
                }}
            >
                <ModalDiv
                    className="modalDiv"
                    $position={spawnPosition}
                    $colorPalette={colorPalette}
                >
                    <ModalContent />
                </ModalDiv>
            </Draggable>
        </div>
    );
}

Modal.propTypes = {
};