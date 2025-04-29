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
    AggregateValueDiv,
    calculateModalPosition,
    DEFAULTMODALHEIGHT,
    DEFAULTMODALWIDTH,
    ResizeHandle,
    MAXMODALSIZEMULTIPLIER,
    ModalContentWrapper,
} from './Modal.style';
import {AGGREGATEREASONIDENTIFIER} from '../types/propTypes';
import {PropTypes} from 'prop-types';

import {useRecoilValue, useResetRecoilState, useRecoilCallback} from 'recoil';
import { colorPaletteState } from '../atoms/settingsState';
import {
    modalForSymbolState,
    modalVisibleState,
    modalContentState,
} from '../atoms/modalState';
import {handleModalHighlightCallback} from '../hooks/highlights';

import { CloseButton } from '../fragments/CloseButton.react';
import { contentDivState, isAnimatingState, shownRecursionState } from '../atoms/currentGraphState';


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

function AggregateGround(props) {
    const {aggregate, onClickHandler} = props;
    const colorPalette = useRecoilValue(colorPaletteState);
    return (
        <div className="txt-elem" style={{padding: '1pt 2pt'}}>
            {aggregate.sign !== '' ? <span>{aggregate.sign} </span> : null}
            {aggregate.lower_bound !== '' ? (
                <span>
                    {aggregate.lower_bound}
                    {' <= '}
                </span>
            ) : null}
            <AggregateValueDiv $colorPalette={colorPalette}>
                {aggregate.value}
            </AggregateValueDiv>

            {aggregate.function !== '' ? (
                <span>
                    {' #'}
                    {aggregate.function}
                </span>
            ) : null}

            {' {'}
            {aggregate.elements.length > 0 ? (
                <StyledList className="aggregateContent txt-elem">
                    {aggregate.elements.map((element, i) => (
                        <StyledListItem key={i} $colorPalette={colorPalette}>
                            {element.term}
                            {' : '}
                            {element.conditions.map((symbol, j) => (
                                <SymbolElementSpan
                                    key={j}
                                    id={
                                        (symbol.symbol_uuid !== null
                                            ? symbol.symbol_uuid
                                            : 'noUuid_' + i) + '_modal'
                                    }
                                    $pulsate={false}
                                    $pulsatingColor={null}
                                    $backgroundColor={colorPalette.light}
                                    $hasReason={symbol.symbol_uuid !== null}
                                    onClick={onClickHandler}
                                >
                                    {symbol.symbol_repr}
                                    {j < element.conditions.length - 1
                                        ? ', '
                                        : ';'}
                                </SymbolElementSpan>
                            ))}
                        </StyledListItem>
                    ))}
                </StyledList>
            ) : null}
            {'} '}
            {aggregate.upper_bound !== '' ? (
                <span>
                    {' <= '}
                    {aggregate.upper_bound}
                </span>
            ) : null}
        </div>
    );
}

AggregateGround.propTypes = {
    aggregate: AGGREGATEREASONIDENTIFIER,
    onClickHandler: PropTypes.func,
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
        <StyledListItem key={symbol.reason_repr} $colorPalette={colorPalette}>
            {
                symbol.aggregate_repr === "null" ?
                    <SymbolElementSpan
                        id={
                            (symbol.reason_uuid !== null
                                ? symbol.reason_uuid
                                : 'noUuid_' + i) + '_modal'
                        }
                        $pulsate={false}
                        $pulsatingColor={null}
                        $backgroundColor={colorPalette.light}
                        $hasReason={symbol.reason_uuid !== null}
                        onClick={onClickHandler}
                    >
                        {symbol.reason_repr}
                    </SymbolElementSpan> :
                    <AggregateGround aggregate={JSON.parse(symbol.aggregate_repr)} onClickHandler={onClickHandler}/>
                    }
        </StyledListItem>
    ));

    return (
        <ModalContentWrapper className="modalContentWrapper">
            <ModalHeader />
            <StyledList
                className="modalContent txt-elem"
                $isModalContent={true}
                style={{flex: 1}}
            >
                {contentToShow}
            </StyledList>
        </ModalContentWrapper>
    );
}

ModalContent.propTypes = {
};

export function Modal() {
    const colorPalette = useRecoilValue(colorPaletteState);
    const modalVisible = useRecoilValue(modalVisibleState);
    const [spawnPosition, setSpawnPosition] = useState({x: 0, y: 0});
    const modalForSymbol = useRecoilValue(modalForSymbolState);
    const recursion = useRecoilValue(shownRecursionState);
    const isAnimating = useRecoilValue(isAnimatingState);
    const contentDiv = useRecoilValue(contentDivState);
    const modalContent = useRecoilValue(modalContentState);
    // Reference to the modal content element to measure actual content size
    const contentRef = React.useRef(null);

    // Initialize with default size but make it stateful
    const [size, setSize] = useState({
        width: DEFAULTMODALWIDTH,
        height: DEFAULTMODALHEIGHT,
    });

    // Calculate content dimensions to set max resize limits
    const [contentDimensions, setContentDimensions] = useState({
        width: 0,
        height: 0,
    });

    // Update content dimensions when modal content changes
    useEffect(() => {
        if (contentRef.current) {
            // Give the browser time to render the content
            setTimeout(() => {
                // Get the actual content size including what's currently hidden by overflow
                const contentWidth = contentRef.current.scrollWidth;
                const contentHeight = contentRef.current.scrollHeight;

                setContentDimensions({
                    width: contentWidth,
                    height: contentHeight,
                });
            }, 100);
        }
    }, [modalContent, modalVisible]);

    useEffect(() => {
        if (isAnimating) {
            return;
        }
        const newPosition = calculateModalPosition(
            modalVisible,
            modalForSymbol.nodeId,
            modalForSymbol.supernodeId,
            contentDiv
        );
        if (newPosition) {
            setSpawnPosition(newPosition);
        }
    }, [modalVisible, modalForSymbol, recursion, isAnimating, contentDiv]);

    // Handle resize functionality
    const handleResize = (mouseDownEvent) => {
        mouseDownEvent.preventDefault();
        const startSize = {...size};
        const startPosition = {
            x: mouseDownEvent.clientX,
            y: mouseDownEvent.clientY,
        };

        function onMouseMove(mouseMoveEvent) {
            const maxWidth = contentDimensions.width * MAXMODALSIZEMULTIPLIER;
            const maxHeight = contentDimensions.height * MAXMODALSIZEMULTIPLIER;

            const newWidth = Math.max(
                DEFAULTMODALWIDTH,
                Math.min(
                    maxWidth,
                    startSize.width + (mouseMoveEvent.clientX - startPosition.x)
                )
            );

            const newHeight = Math.max(
                DEFAULTMODALHEIGHT,
                Math.min(
                    maxHeight, 
                    startSize.height +
                        (mouseMoveEvent.clientY - startPosition.y)
                )
            );

            setSize({
                width: newWidth,
                height: newHeight,
            });
        }

        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp, {once: true});
    };

    // If modal is not visible, don't render anything
    if (!modalVisible) {
        return null;
    }

    return (
        <div style={{position: 'relative', width: '100%', height: '0'}}>
            <Draggable
                handle=".modalDiv"
                cancel=".modalContent, .resizeHandle"
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
                    $size={size}
                >
                    <div
                        ref={contentRef}
                        style={{height: '100%', width: '100%'}}
                    >
                        <ModalContent />
                    </div>
                    <ResizeHandle
                        className="resizeHandle"
                        $colorPalette={colorPalette}
                        onMouseDown={handleResize}
                    />
                </ModalDiv>
            </Draggable>
        </div>
    );
}

Modal.propTypes = {
};