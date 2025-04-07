import React, {Suspense, useEffect, useCallback, useMemo, useRef, useState} from 'react';
import './node.css';
import PropTypes, { symbol } from 'prop-types';
import {Symbol} from './Symbol.react';
import {
    NodeDiv,
    SuperNodeDiv,
    MiniNodeSpan,
    SetContainerDiv,
    SetValueSpan,
    RecursionButtonDiv,
    RecursionButtonTextDiv,
} from './Node.style';
import {NODE} from '../types/propTypes';
import AnimateHeight from 'react-animate-height';
import {IconWrapper} from '../LazyLoader';
import useResizeObserver from '@react-hook/resize-observer';
import { emToPixel, scrollParentToChild, any} from '../utils';
import debounce from 'lodash.debounce';
import { Constants } from '../constants';
import {
    useRecoilState,
    useRecoilValue,
    useSetRecoilState,
    useRecoilCallback,
} from 'recoil';
import {colorPaletteState} from '../atoms/settingsState';
import {
    nodeAtomByNodeUuidStateFamily,
    nodeIsExpandableVByNodeUuidStateFamily,
    nodeIsCollapsibleVByNodeUuidStateFamily,
    nodeShowMiniByNodeUuidStateFamily,
    nodeIsExpandVAllTheWayByNodeUuidStateFamily,
    longestSymbolInNodeByNodeUuidStateFamily,
    symbolUuidsByNodeUuidStateFamily,
} from '../atoms/nodesState';
import {
    changeXShiftWithinBoundsCallback,
} from '../hooks/mapShift';
import {
    allHighlightedSymbolsState,
    pulsatingHighlightsStateByNodeUuidStateFamily,
} from '../atoms/highlightsState';
import {
    contentDivState,
    shownRecursionState,
    isCurrentlyAnimatingHeightStateFamily,
} from '../atoms/currentGraphState';

function NodeContent(props) {
    const {
        nodeUuid,
        setHeight,
        parentRef,
        transformationId,
        transformationHash,
        subnodeIndex,
    } = props;
    const colorPalette = useRecoilValue(colorPaletteState);
    const highlightedSymbols = useRecoilValue(allHighlightedSymbolsState);
    const contentToShow = useRecoilValue(
        symbolUuidsByNodeUuidStateFamily({
            transformationHash,
            nodeUuid,
            subnodeIndex,
        })
    );
    const setIsExpandableV = useSetRecoilState(
        nodeIsExpandableVByNodeUuidStateFamily(nodeUuid)
    );
    const setIsCollapsibleV = useSetRecoilState(
        nodeIsCollapsibleVByNodeUuidStateFamily(nodeUuid)
    );
    const [isExpandVAllTheWay, setIsExpandVAllTheWay] = useRecoilState(
        nodeIsExpandVAllTheWayByNodeUuidStateFamily(nodeUuid)
    );
    const setLongestSymbol = useSetRecoilState(
        longestSymbolInNodeByNodeUuidStateFamily(nodeUuid)
    );
    const isSubnode = typeof subnodeIndex !== 'undefined';

    const isMounted = useRef(false);
    const setContainerRef = useRef(null);
    const lastWidthRef = useRef(0);
    const lastSymbolHeightRef = useRef({});

    /*
     * Y of symbols in node
     */
    const getSymbolHeight = useCallback((symbolUuid) => {
        const childElement = setContainerRef.current?.querySelector(
            `div[data-uuid="${symbolUuid}"]`
        );

        const parentElement = parentRef.current;

        if (!childElement || !parentElement) {
            return 0;
        }
        const childRect = childElement.getBoundingClientRect();
        const parentRect = parentElement.getBoundingClientRect();
        const belowLineMargin = 6;
        return childRect.top +
                childRect.height -
                parentRect.top +
                belowLineMargin;
    }, [parentRef]);

    const symbolHeightForAllSymbols = useCallback((symbols) => {
        const currentWidth = setContainerRef.current?.offsetWidth;
        if (currentWidth === lastWidthRef.current) {
            return lastSymbolHeightRef.current;
        }
        lastWidthRef.current = currentWidth;
        const symbolYPositions = {};
        symbols.forEach((s) => {
            symbolYPositions[s] = getSymbolHeight(s);
        });
        lastSymbolHeightRef.current = symbolYPositions;
        return symbolYPositions;
    }, [getSymbolHeight]);

    const setHeightFromContent = useCallback(
        (contentToShow, highlightedSymbols, isExpandVAllTheWay) => {
            const getNewHeight = () => {
                const symbolYPositions = symbolHeightForAllSymbols(contentToShow);
                const lowestSymbolHeight = Math.max(
                    emToPixel(Constants.minimumNodeHeight),
                    ...contentToShow.map((s) => symbolYPositions[s])
                );
                const isNodeInsignificantlyBiggerThanStandardNodeHeight =
                    lowestSymbolHeight * Constants.foldNodeThreshold <
                    emToPixel(Constants.standardNodeHeight);
                if (
                    isNodeInsignificantlyBiggerThanStandardNodeHeight
                ) {
                    setIsExpandableV(false);
                    setIsCollapsibleV(false)
                    return lowestSymbolHeight;
                }
                if (
                    isExpandVAllTheWay
                ) {
                    setIsExpandableV(false);
                    return lowestSymbolHeight;
                }


                const markedItems = contentToShow.filter((s) =>
                    highlightedSymbols.map((h) => h.symbolUuid).includes(s)
                );
                if (
                    markedItems.length > 0 &&
                    any(
                        markedItems.map(
                            (item) =>
                                symbolYPositions[item] >
                                emToPixel(Constants.standardNodeHeight)
                        )
                    )
                ) {
                    const newHeight = Math.max(
                        emToPixel(Constants.minimumNodeHeight),
                        ...contentToShow
                            .filter((s) => markedItems.includes(s))
                            .map((s) => symbolYPositions[s])
                    );
                    const isNodeInsignificantlyBiggerThanMaxNodeHeight =
                        newHeight * Constants.foldNodeThreshold >
                        lowestSymbolHeight;
                    if (isNodeInsignificantlyBiggerThanMaxNodeHeight) {
                        setIsExpandableV(false);
                        return lowestSymbolHeight;
                    }
                    setIsExpandableV(true);
                    return newHeight;
                }
                const newHeight = Math.min(
                    emToPixel(Constants.standardNodeHeight),
                    Math.max(
                        emToPixel(Constants.minimumNodeHeight),
                        ...contentToShow.map((s) =>
                            symbolYPositions[s]
                                ? symbolYPositions[s]
                                : 0
                        )
                    )
                );
                setIsExpandableV(true);
                return newHeight;
            };
            setHeight(getNewHeight());
        },
        [setHeight, setIsExpandableV, setIsCollapsibleV,  symbolHeightForAllSymbols
        ]
    );

    const debouncedSetHeightFromContent = useMemo(() => {
        return debounce(setHeightFromContent, Constants.DEBOUNCETIMEOUT);
    }, [setHeightFromContent]);

    useEffect(() => {
        if (isMounted.current) {
            debouncedSetHeightFromContent(
                contentToShow,
                highlightedSymbols,
                isExpandVAllTheWay
            );
        } else {
            isMounted.current = true;
        }
        return () => {
            debouncedSetHeightFromContent.cancel();
        };
    }, [
        debouncedSetHeightFromContent,
        contentToShow,
        highlightedSymbols,
        isExpandVAllTheWay,
    ]);
    useResizeObserver(setContainerRef, () => {
        debouncedSetHeightFromContent(
            contentToShow,
            highlightedSymbols,
            isExpandVAllTheWay
        );
    });

    /*
     * look for longest symbol in node
     * Run exactly once, after initial render
     */
    const symbolLengthManager = () => {
        if (!setContainerRef.current) {
            return;
        }
        const symbolElements =
            setContainerRef.current.querySelectorAll('.set_value > div');
        let maxWidth = 23;
        symbolElements.forEach((el) => {
            const w = el.getBoundingClientRect().width;
            if (w > maxWidth) {
                maxWidth = w;
            }
        });
        setLongestSymbol(maxWidth);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(symbolLengthManager, []);

    const renderedSymbols = contentToShow.map((s) => {
        return (
            <div key={s} data-uuid={s}>
                <Symbol
                    symbolUuid={s}
                    isSubnode={isSubnode}
                    nodeUuid={nodeUuid}
                    transformationHash={transformationHash}
                    transformationId={transformationId}
                />
            </div>
        );
    });

    return (
        <SetContainerDiv
            className={`set_container ${
                contentToShow.length === 0 ? 'hidden' : ''
            }`}
            ref={setContainerRef}
            $colorPalette={colorPalette}
        >
            <SetValueSpan className={'set_value'}>
                {renderedSymbols.length > 0 ? renderedSymbols : ''}
            </SetValueSpan>
        </SetContainerDiv>
    );
}

NodeContent.propTypes = {
    /**
     * The id of the node
     */
    nodeUuid: PropTypes.string,
    /**
     * The function to be called to set the node height
     */
    setHeight: PropTypes.func,
    /**
     * The ref to the parent node
     */
    parentRef: PropTypes.object,
    /**
     * The id of the transformation the node belongs to
     */
    transformationId: PropTypes.string,
    /**
     * The transformation hash
     */
    transformationHash: PropTypes.string,
    /**
     * The index of the subnode, optional
     */
    subnodeIndex: PropTypes.number,
};

function MiniNode(props) {
    const {nodeUuid, transformationHash} = props;
    const colorPalette = useRecoilValue(colorPaletteState);
    const contentDiv = useRecoilValue(contentDivState);
    const miniNodeRef = useRef(null);
    const changeXShiftWithinBounds = useRecoilCallback(
        changeXShiftWithinBoundsCallback,
        []
    );

    const pulsatingState = useRecoilValue(
        pulsatingHighlightsStateByNodeUuidStateFamily({
            transformationHash,
            nodeUuid
        })
    )
    if (pulsatingState.isPulsating) {
        scrollParentToChild(
            contentDiv.current,
            miniNodeRef.current,
            changeXShiftWithinBounds
        );
    }

    return (
        <MiniNodeSpan
            className={`mini ${nodeUuid}`}
            $colorPalette={colorPalette}
            $pulsate={pulsatingState.isPulsating}
            $pulsatingColor={pulsatingState.color}
            ref={miniNodeRef}
        />
    );
}

MiniNode.propTypes = {
    /**
     * The id of the node
     * */
    nodeUuid: PropTypes.string,
    /**
     * The transformation hash
     * */
    transformationHash: PropTypes.string,
};

function RecursionButton(props) {
    const {node} = props;
    const colorPalette = useRecoilValue(colorPaletteState);
    const setShownRecursionState = useSetRecoilState(shownRecursionState);

    function handleClick(e) {
        e.stopPropagation();

        setShownRecursionState((old) => {
            if (old.includes(node.uuid)) {
                return old.filter((n) => n !== node.uuid);
            }
            return [...old, node.uuid];
        })
    }

    return (
        <RecursionButtonDiv
            className={'recursion_button'}
            onClick={handleClick}
        >
            {node.recursive.length === 0 ? null : (
                <RecursionButtonTextDiv
                    className={'recursion_button_text'}
                    $colorPalette={colorPalette}
                >
                    <Suspense fallback={<div>R</div>}>
                        <IconWrapper
                            icon={'clockwiseVerticalArrows'}
                            width="9"
                            height="9"
                        />
                    </Suspense>
                </RecursionButtonTextDiv>
            )}
        </RecursionButtonDiv>
    );
}

RecursionButton.propTypes = {
    /**
     * object containing the node data to be displayed
     * */
    node: NODE,
};



export function Node(props) {
    const {
        transformationHash,
        nodeUuid,
        branchSpace,
        transformationId,
        subnodeIndex,
    } = props;
    const node = useRecoilValue(
        nodeAtomByNodeUuidStateFamily({
            transformationHash,
            nodeUuid,
            subnodeIndex,
        })
    );
    const colorPalette = useRecoilValue(colorPaletteState);
    const [height, setHeight] = useState(
        emToPixel(Constants.minimumNodeHeight)
    );
    const animateHeightRef = useRef(null);
    const [showMini, setShowMini] = useRecoilState(
        nodeShowMiniByNodeUuidStateFamily(nodeUuid)
    );
    const longestSymbol = useRecoilValue(
        longestSymbolInNodeByNodeUuidStateFamily(nodeUuid)
    );
    const setIsResizing = useSetRecoilState(
        isCurrentlyAnimatingHeightStateFamily(nodeUuid)
    );

    const manageShowMini = useCallback(() => {
        if (longestSymbol > 0 && branchSpace.current) {
            const branchSpaceWidth = branchSpace.current.offsetWidth;
            if (branchSpaceWidth === 0) {
                return;
            }
            if (
                longestSymbol + emToPixel(Constants.HOverflowThresholdInEm) >
                branchSpaceWidth
            ) {
                setShowMini(true);
                return;
            }
            setShowMini(false);
        }
    }, [longestSymbol, branchSpace, setShowMini]);

    const debouncedManageShowMini = useMemo(() => {
        return debounce(manageShowMini, Constants.DEBOUNCETIMEOUT);
    }, [manageShowMini]);

    useEffect(() => {
        debouncedManageShowMini();
        return () => {
            debouncedManageShowMini.cancel();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branchSpace.current?.offsetWidth]);
    const contentDiv = useRecoilValue(contentDivState);

    useResizeObserver(contentDiv, debouncedManageShowMini);
    useEffect(() => {
        debouncedManageShowMini();
        return () => {
            debouncedManageShowMini.cancel();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [longestSymbol]);

    const timerRef = useRef(null);
    const startAnimateHeight = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        setIsResizing(true);
        timerRef.current = setTimeout(() => {
            setIsResizing(false);
        }, Constants.isAnimatingTimeout);
    };

    const endAnimateHeight = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            setIsResizing(false);
        }, Constants.isAnimatingTimeout);
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    return (
        <>
            {showMini ? (
                <MiniNode
                    id={node.uuid}
                    transformationHash={transformationHash}
                    nodeUuid={nodeUuid}
                />
            ) : (
                <NodeDiv
                    id={node.uuid}
                    className={`txt-elem ${node.uuid}`}
                    $colorPalette={colorPalette}
                >
                    <AnimateHeight
                        id={`${node.uuid}_animate_height`}
                        duration={500}
                        height={height}
                        ref={animateHeightRef}
                        contentClassName={`set_too_high ${
                            node.loading === true ? 'loading' : null
                        }`}
                        onHeightAnimationStart={startAnimateHeight}
                        onHeightAnimationEnd={endAnimateHeight}
                    >
                        <NodeContent
                            nodeUuid={nodeUuid}
                            setHeight={setHeight}
                            parentRef={animateHeightRef}
                            transformationId={transformationId}
                            transformationHash={transformationHash}
                            subnodeIndex={subnodeIndex}
                        />
                        <RecursionButton node={node} />
                    </AnimateHeight>
                </NodeDiv>
            )}
        </>
    );
}

Node.propTypes = {
    /**
     * String containing the transformation hash
     */
    transformationHash: PropTypes.string,
    /**
     * String containing the node uuid
     */
    nodeUuid: PropTypes.string,
    /**
     * If the node is a subnode of a recursive node
     */
    isSubnode: PropTypes.bool,
    /**
     * The ref to the branch space the node sits in
     */
    branchSpace: PropTypes.object,
    /**
     * The id of the transformation the node belongs to
     */
    transformationId: PropTypes.string,
    /**
     * The index of the subnode, optional
     */
    subnodeIndex: PropTypes.number,
};

export function RecursiveSuperNode(props) {
    const {transformationHash, nodeUuid, branchSpace, transformationId} = props;
    const node = useRecoilValue(
        nodeAtomByNodeUuidStateFamily({transformationHash, nodeUuid})
    );
    const colorPalette = useRecoilValue(colorPaletteState);
    const longestSymbol = useRecoilValue(
        longestSymbolInNodeByNodeUuidStateFamily(nodeUuid)
    );
    const [showMini, setShowMini] = useRecoilState(
        nodeShowMiniByNodeUuidStateFamily(nodeUuid)
    );

    const manageShowMini = useCallback(() => {
        if (longestSymbol > 0 && branchSpace.current) {
            const branchSpaceWidth = branchSpace.current.offsetWidth;
            if (
                longestSymbol +
                    emToPixel(
                        Constants.HOverflowThresholdForRecursiveNodesInEm
                    ) >
                branchSpaceWidth
            ) {
                setShowMini(true);
                return;
            }
            setShowMini(false);
        }
    }, [longestSymbol, branchSpace, setShowMini]);

    const debouncedManageShowMini = useMemo(() => {
        return debounce(manageShowMini, Constants.DEBOUNCETIMEOUT);
    }, [manageShowMini]);

    
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useResizeObserver(branchSpace, debouncedManageShowMini)
    useEffect(() => {
        debouncedManageShowMini();
        return () => {
            debouncedManageShowMini.cancel();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [longestSymbol]);


    return (
        <>
        {showMini ? (
            <MiniNode
                id={node.uuid}
                transformationHash={transformationHash}
                nodeUuid={nodeUuid}
            />
        ) : (
        <SuperNodeDiv
            className={node.uuid}
            id={node.uuid}
            $colorPalette={colorPalette}
        >
                <>
                    <RecursionButton node={node} />
                    {node.recursive.map((subnode, i) => {
                        return (
                            <Node
                                key={subnode.uuid}
                                transformationHash={transformationHash}
                                nodeUuid={nodeUuid}
                                branchSpace={branchSpace}
                                transformationId={transformationId}
                                subnodeIndex={i}
                            />
                        );
                    })}
                </>
            </SuperNodeDiv>
            )}
        </>
    );
}

RecursiveSuperNode.propTypes = {
    /**
     * The transformation hash
     */
    transformationHash: PropTypes.string,
    /**
     * The node uuid
     */
    nodeUuid: PropTypes.string,
    /**
     * The ref to the branch space
     */
    branchSpace: PropTypes.object,
    /**
     * The id of the transformation the node belongs to
     */
    transformationId: PropTypes.string,
};
