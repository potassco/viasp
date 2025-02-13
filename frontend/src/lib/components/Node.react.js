import React, {Suspense, useEffect, useCallback, useMemo, useRef, useState} from 'react';
import './node.css';
import PropTypes from 'prop-types';
import {Symbol} from './Symbol.react';
import {useColorPalette} from '../contexts/ColorPalette';
import {styled} from 'styled-components';
import {useSettings} from '../contexts/Settings';
import {NODE} from '../types/propTypes';
import {useFilters} from '../contexts/Filters';
import AnimateHeight from 'react-animate-height';
import {IconWrapper} from '../LazyLoader';
import useResizeObserver from '@react-hook/resize-observer';
import { emToPixel} from '../utils';
import debounce from 'lodash.debounce';
import { Constants } from '../constants';
import {useRecoilState, useRecoilValue, useSetRecoilState} from 'recoil';
import {
    nodeAtomByNodeUuidStateFamily,
    nodeIsExpandableVByNodeUuidStateFamily,
    nodeIsCollapsibleVByNodeUuidStateFamily,
    nodeShowMiniByNodeUuidStateFamily,
    nodeIsExpandVAllTheWayByNodeUuidStateFamily,
    longestSymbolInNodeByNodeUuidStateFamily,
} from '../atoms/nodesState';
import {allHighlightedSymbolsState} from '../atoms/highlightsState';
import {
    shownRecursionState,
    isCurrentlyAnimatingHeightStateFamily,
} from '../atoms/currentGraphState';
import { ContentDivProvider, useContentDiv } from '../contexts/ContentDivContext';

function any(iterable) {
    for (let index = 0; index < iterable.length; index++) {
        if (iterable[index]) {
            return true;
        }
    }
    return false;
}


function NodeContent(props) {
    const {
        nodeUuid,
        setHeight,
        parentRef,
        transformationId,
        transformationHash,
        subnodeIndex,
    } = props;
    const {state} = useSettings();
    const colorPalette = useColorPalette();
    const [{activeFilters}] = useFilters();
    const highlightedSymbols = useRecoilValue(allHighlightedSymbolsState);
    const recoilNode = useRecoilValue(
        nodeAtomByNodeUuidStateFamily({
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
    const symbolYPosition = useRef({});
    const setLongestSymbol = useSetRecoilState(
        longestSymbolInNodeByNodeUuidStateFamily(nodeUuid)
    );

    const isSubnode = typeof subnodeIndex !== 'undefined';

    let contentToShow;
    if (state.show_all) {
        contentToShow = recoilNode.atom.map((s) => s.uuid);
    } else {
        contentToShow = recoilNode.diff.map((s) => s.uuid);
    }

    const isMounted = useRef(false);
    const setContainerRef = useRef(null);

    /*
     * Y Position of symbols in node
     */
    const symbolVisibilityManager = useCallback(
        (symbolUuid) => {
            const childElement = setContainerRef.current?.querySelector(
                `div[data-uuid="${symbolUuid}"]`
            );

            const parentElement = parentRef.current;

            if (!childElement || !parentElement) {
                return;
            }
            const childRect = childElement.getBoundingClientRect();
            const parentRect = parentElement.getBoundingClientRect();
            const belowLineMargin = 27;
            symbolYPosition.current = {
                ...symbolYPosition.current,
                [symbolUuid]: childRect.top - parentRect.top + belowLineMargin,
            };
        },
        [parentRef]
    );
    const debouncedSymbolVisibilityManager = useCallback(
        (s) => {
            const debouncedFunction = debounce(
                () => symbolVisibilityManager(s),
                Constants.DEBOUNCETIMEOUT
            );
            debouncedFunction();
        },
        [symbolVisibilityManager]
    );

    const setHeightFromContent = useCallback(
        (contentToShow, highlightedSymbols, isExpandVAllTheWay) => {
            const getNewHeight = () => {
                const lowestSymbolHeight = Math.max(
                    emToPixel(Constants.minimumNodeHeight),
                    ...contentToShow.map((s) => symbolYPosition.current[s])
                );
                const isNodeInsignificantlyBiggerThanStandardNodeHeight =
                    lowestSymbolHeight * Constants.foldNodeThreshold <
                    emToPixel(Constants.standardNodeHeight);
                if (
                    isNodeInsignificantlyBiggerThanStandardNodeHeight
                ) {
                    setIsExpandableV(false);
                    setIsExpandVAllTheWay(false);
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
                                symbolYPosition.current[item] >
                                emToPixel(Constants.standardNodeHeight)
                        )
                    )
                ) {
                    const newHeight = Math.max(
                        emToPixel(Constants.minimumNodeHeight),
                        ...contentToShow
                            .filter((s) => markedItems.includes(s))
                            .map((s) => symbolYPosition.current[s])
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
                            symbolYPosition.current[s]
                                ? symbolYPosition.current[s]
                                : 0
                        )
                    )
                );
                setIsExpandableV(true);
                return newHeight;
            };
            setHeight(getNewHeight());
        },
        [setHeight, setIsExpandableV, setIsCollapsibleV, setIsExpandVAllTheWay]
    );
    const debouncedSetHeightFromContent = useMemo(() => {
        return debounce(setHeightFromContent, Constants.DEBOUNCETIMEOUT);
    }, [setHeightFromContent]);

    useEffect(() => {
        contentToShow.forEach((s) => {
            debouncedSymbolVisibilityManager(s);
        });
    }, [debouncedSymbolVisibilityManager, contentToShow]);
    useResizeObserver(setContainerRef, () => {
        contentToShow.forEach((s) => {
            debouncedSymbolVisibilityManager(s);
        });
    });

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

    const classNames2 = `set_value`;
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
        <div
            className={`set_container ${
                recoilNode.loading === true ? 'hidden' : ''
            }`}
            style={{color: colorPalette.dark}}
            ref={setContainerRef}
        >
            <span className={classNames2}>
                {renderedSymbols.length > 0 ? renderedSymbols : ''}
            </span>
        </div>
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

function RecursionButton(props) {
    const {node} = props;
    const colorPalette = useColorPalette();
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
        <div className={'recursion_button'} onClick={handleClick}>
            {node.recursive.length === 0 ? null : (
                <div
                    className={'recursion_button_text'}
                    style={{
                        backgroundColor: colorPalette.primary,
                        color: colorPalette.light,
                    }}
                >
                    <Suspense fallback={<div>R</div>}>
                        <IconWrapper
                            icon={'clockwiseVerticalArrows'}
                            width="9"
                            height="9"
                        />
                    </Suspense>
                </div>
            )}
        </div>
    );
}

RecursionButton.propTypes = {
    /**
     * object containing the node data to be displayed
     * */
    node: NODE,
};


const NodeDiv = styled.div`
    background-color: ${({$colorPalette}) => $colorPalette.light};
    color: ${({$colorPalette}) => $colorPalette.primary};
    overflow: hidden;

    border-radius: 0.7em;
    border: 1pt solid;
    margin: 12pt 3% 12pt 3%;
    position: relative;
    height: max-content;
    overflow: hidden;

    &:hover {
        transition: drop-shadow 0.1s;
        filter: drop-shadow(0 0 0.14em #333);
    }
`;

const SuperNodeDiv = styled(NodeDiv)`
    background-color: transparent;
    &:hover {
        filter: none;
    }
`;

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

    const colorPalette = useColorPalette();
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(debouncedManageShowMini, [branchSpace.current?.offsetWidth]);
    const contentDiv = useContentDiv();
    useResizeObserver(contentDiv, debouncedManageShowMini);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(debouncedManageShowMini, [longestSymbol]);

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

    return (
        <NodeDiv
            id={node.uuid}
            className={`txt-elem ${node.uuid}`}
            $colorPalette={colorPalette}
        >
            {showMini ? (
                <div
                    style={{
                        backgroundColor: colorPalette.primary,
                        color: colorPalette.primary,
                    }}
                    className={'mini'}
                />
            ) : (
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
            )}
        </NodeDiv>
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
    const colorPalette = useColorPalette();
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
    // useEffect(debouncedManageShowMini, [branchSpace.current?.offsetWidth]);
    useResizeObserver(branchSpace, debouncedManageShowMini)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(debouncedManageShowMini, [longestSymbol]);


    return (
        <SuperNodeDiv
            className={node.uuid}
            id={node.uuid}
            $colorPalette={colorPalette}
        >
            {showMini ? (
                <div
                    style={{
                        backgroundColor: colorPalette.primary,
                        color: colorPalette.primary,
                    }}
                    className={'mini'}
                />
            ) : (
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
            )}
        </SuperNodeDiv>
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
