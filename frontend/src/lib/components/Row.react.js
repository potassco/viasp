import React, { Suspense, useEffect, useRef, useState } from 'react';
import {styled, keyframes} from 'styled-components';
import {OverflowButton} from './OverflowButton.react';
import { Constants } from "../constants";
import './row.css';
import PropTypes, { bool } from 'prop-types';
import {RowHeader} from './RowHeader.react';
import {BranchSpace} from './BranchSpace.react';
import {
    useTransformations,
    TransformationContext,
} from '../contexts/transformations';
import {MAPZOOMSTATE, TRANSFORMATIONWRAPPER} from '../types/propTypes';
import {ColorPaletteContext} from '../contexts/ColorPalette';
import {make_default_nodes} from '../utils';
import {AnimationUpdater, useAnimationUpdater} from '../contexts/AnimationUpdater';
import {DragHandle} from './DragHandle.react';
import {useDebouncedAnimateResize} from '../hooks/useDebouncedAnimateResize';
import {useMapShift} from '../contexts/MapShiftContext';
import {useRecoilState, useRecoilValue} from 'recoil';
import {proxyTransformationStateFamily} from '../atoms/transformationsState';
import { nodeUuidsByTransforamtionStateFamily } from '../atoms/nodesState';
import {reorderTransformationDropIndicesState} from '../atoms/reorderTransformationDropIndices';

export class RowTemplate extends React.Component {
    static contextType = TransformationContext;
    constructor(props) {
        super(props);
        this.rowRef = React.createRef();
        this.intervalId = null;
    }


    componentDidUpdate(prevProps, prevState) {
        // if (
        //     this.props.itemSelected > prevProps.itemSelected &&
        //     this.context.state.transformationDropIndices !==
        //         this.props.item.adjacent_sort_indices &&
        //     prevProps.itemSelected !== this.props.itemSelected
        // ) {
        //     this.context.dispatch(
        //         setTransformationDropIndices(this.props.item.adjacent_sort_indices)
        //     )
        // }
        // if (
        //     this.props.itemSelected < prevProps.itemSelected &&
        //     this.context.state.transformationDropIndices ===
        //         this.props.item.adjacent_sort_indices &&
        //     prevProps.itemSelected !== this.props.itemSelected
        // ) {
        //     this.context.dispatch(setTransformationDropIndices(null));
        // }
        if (this.props.itemSelected > Constants.rowAnimationPickupThreshold && this.intervalId === null) {
            this.intervalId = setInterval(() => {
                const element = this.rowRef.current;
                if (element === null) {
                    return;
                }
                this.setAnimationState((oldValue) => ({
                    ...oldValue,
                    [this.props.item.id]: {
                        ...oldValue[this.props.item.id],
                        width: element.clientWidth,
                        height: element.clientHeight,
                        top: element.offsetTop,
                        left: element.offsetLeft,
                    },
                }));
            }, Constants.rowAnimationIntervalInMs);
        }
        if (this.props.itemSelected < Constants.rowAnimationPickupThreshold && this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    componentWillUnmount() {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
        }
    }

    render() {
        const {item: transformation, itemSelected, anySelected, dragHandleProps} = this.props;

        return (
            <AnimationUpdater.Consumer>
                {({setAnimationState}) => {
                    this.setAnimationState = setAnimationState;
                    return (
                        <TransformationContext.Consumer>
                            {({state: {transformationDropIndices}}) => {
                                return (
                                    <ColorPaletteContext.Consumer>
                                        {({rowShading}) => {
                                            const scaleConstant = 0.005;
                                            const shadowConstant = 15;
                                            const scale =
                                                itemSelected * scaleConstant +
                                                1;
                                            const shadow =
                                                itemSelected * shadowConstant +
                                                0;
                                            const background = rowShading;
                                                

                                            const containerStyle = {
                                                position: 'relative',
                                                maxHeight: '100%',
                                                transform: `scale(${scale})`,
                                                transformOrigin: 'left',
                                                boxShadow: `rgba(0, 0, 0, 0.3) 0px ${shadow}px ${
                                                    2 * shadow
                                                }px 0px`,
                                                background:
                                                    background[
                                                        (transformation.id + 1) %
                                                            background.length
                                                    ],
                                                opacity: 1,
                                            };
                                            return (
                                                <div
                                                    className="row_signal_container"
                                                    style={containerStyle}
                                                    ref={this.rowRef}
                                                    key={transformation}
                                                >
                                                    <Row
                                                        key={
                                                            transformation
                                                        }
                                                        transformation={
                                                            transformation
                                                        }
                                                        dragHandleProps={
                                                            dragHandleProps
                                                        }
                                                        itemSelected={
                                                            itemSelected > Constants.rowAnimationPickupThreshold
                                                        }
                                                        anySelected={
                                                            anySelected
                                                        }
                                                    />
                                                </div>
                                            );
                                        }}
                                    </ColorPaletteContext.Consumer>
                                );
                            }}
                        </TransformationContext.Consumer>
                    );
                }}
            </AnimationUpdater.Consumer>
        );
    }
}

// export const RowTemplate = (props) => {
//     const {
//         item: transformation,
//         itemSelected,
//         anySelected,
//         dragHandleProps,
//     } = props;
//     const {state: contextState, dispatch} = React.useContext(TransformationContext);
//     const {rowShading} = React.useContext(ColorPaletteContext);
//     const {setAnimationState} = React.useContext(AnimationUpdater);
//     const [tDropIndices, setTDropIndices] = useRecoilState(reorderTransformationDropIndices);
//     const [recoilItemSelectedState, setRecoilItemSelectedState] = useRecoilState(draggableListSelectedItem);
//     const rowRef = useRef(null);
//     const [canBeDropped, setCanBeDropped] = useState(false);
//     const [transformations, setTransformations] = useState([]);
//     const [possibleSorts, setPossibleSorts] = useState([]);
//     const [intervalId, setIntervalId] = useState(null);
//     const prevPropsRef = useRef();
//     useEffect(() => {
//         prevPropsRef.current = props;
//     });



//     useEffect(() => {
//         setTransformations(contextState.transformations);
//         setPossibleSorts(contextState.possibleSorts);
//     }, [contextState.transformations, contextState.possibleSorts]);

//     useEffect(() => {
//         if (
//             itemSelected > Constants.rowAnimationPickupThreshold &&
//             recoilItemSelectedState !== transformation.id
//             // prevPropsRef.current.itemSelected !== itemSelected
//         ) {
//             setRecoilItemSelectedState(transformation.id);
//         }
//         if (
//             itemSelected < Constants.rowAnimationPickupThreshold &&
//             recoilItemSelectedState === transformation.id 
//         ) {
//             setRecoilItemSelectedState(null);
//         }
//         if (
//             itemSelected > Constants.rowAnimationPickupThreshold &&
//             intervalId === null
//         ) {
//             const id = setInterval(() => {
//                 const element = rowRef.current;
//                 if (element === null) {
//                     return;
//                 }
//                 setAnimationState((oldValue) => ({
//                     ...oldValue,
//                     [transformation.id]: {
//                         ...oldValue[transformation.id],
//                         width: element.clientWidth,
//                         height: element.clientHeight,
//                         top: element.offsetTop,
//                         left: element.offsetLeft,
//                     },
//                 }));
//             }, Constants.rowAnimationIntervalInMs);
//             setIntervalId(id);
//         }
//         if (
//             itemSelected < Constants.rowAnimationPickupThreshold &&
//             intervalId !== null
//         ) {
//             clearInterval(intervalId);
//             setIntervalId(null);
//         }
//         return () => {
//             if (intervalId !== null) {
//                 clearInterval(intervalId);
//             }
//         };
//     }, [itemSelected, intervalId, setAnimationState, transformation.id, recoilItemSelectedState, setRecoilItemSelectedState]);

//     const scaleConstant = 0.005;
//     const shadowConstant = 15;
//     const scale = itemSelected * scaleConstant + 1;
//     const shadow = itemSelected * shadowConstant + 0;
//     const background = rowShading;
//     const thisCanDrop =
//         contextState.transformationDropIndices !== null
//             ? contextState.transformationDropIndices.lower_bound <=
//                   transformation.id &&
//               transformation.id <=
//                   contextState.transformationDropIndices.upper_bound
//             : false;

//     const containerStyle = {
//         position: 'relative',
//         maxHeight: '100%',
//         transform: `scale(${scale})`,
//         transformOrigin: 'left',
//         boxShadow: `rgba(0, 0, 0, 0.3) 0px ${shadow}px ${2 * shadow}px 0px`,
//         background: background[(transformation.id + 1) % background.length],
//         opacity:
//             thisCanDrop || itemSelected
//                 ? 1
//                 : 1 - Constants.opacityMultiplier * anySelected,
//     };

//     return (
//         <div
//             className="row_signal_container"
//             style={containerStyle}
//             ref={rowRef}
//         >
//             {transformation === null ? null : (
//                 <Row
//                     key={transformation}
//                     transformation={transformation}
//                     dragHandleProps={dragHandleProps}
//                     itemSelected={
//                         itemSelected > Constants.rowAnimationPickupThreshold
//                     }
//                 />
//             )}
//         </div>
//     );
// };


RowTemplate.propTypes = {
    /**
     * The Transformation object to be displayed
     **/
    item: PropTypes.object,
    /**
     * It starts at 0, and quickly increases to 1 when the item is picked up by the user.
     */
    itemSelected: PropTypes.number,
    /**
     * It starts at 0, and quickly increases to 1 when any item is picked up by the user.
     */
    anySelected: PropTypes.number,
    /**
     * an object which should be spread as props on the HTML element to be used as the drag handle.
     * The whole item will be draggable by the wrapped element.
     **/
    dragHandleProps: PropTypes.object,
};

const RowContainer = styled.div`
    opacity: ${(props) =>
        props.$draggedRowCanBeDroppedHere ? 1 : 1 - Constants.opacityMultiplier};
    transition: opacity 0.5s ease-out;
`;

export const Row = React.memo((props) => {
    const {transformation, dragHandleProps} = props;
    const {
        state: {transformationNodesMap},
    } = useTransformations();
    const [nodes, setNodes] = useState(make_default_nodes());
    const rowbodyRef = useRef(null);
    const headerRef = useRef(null);
    const handleRef = useRef(null);
    const {mapShiftValue: transform} = useMapShift();
    const tDropIndices = useRecoilValue(reorderTransformationDropIndicesState);

    const recoiltransformation = useRecoilValue(
        proxyTransformationStateFamily(transformation.id)
    );

    const recoilNodes = useRecoilValue(
        nodeUuidsByTransforamtionStateFamily(recoiltransformation.hash)
    )

    // useDebouncedAnimateResize(rowbodyRef, transformationIdRef);

    React.useEffect(() => {
        if (headerRef.current && handleRef.current) {
            const headerHeight = headerRef.current.offsetHeight;
            handleRef.current.style.top = `${headerHeight}px`;
        }
    }, []);


    React.useEffect(() => {
        if (
            transformationNodesMap &&
            transformationNodesMap[recoiltransformation.id]
        ) {
            setNodes(transformationNodesMap[recoiltransformation.id]);
        }
    }, [transformationNodesMap, recoiltransformation.id]);

    const draggedRowCanBeDroppedHere =
        tDropIndices !==
        null
            ? tDropIndices.lower_bound <=
                    transformation.id &&
                transformation.id <=
                    tDropIndices.upper_bound
            : true;

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <RowContainer
                className={`row_container ${recoiltransformation.hash}`}
                $draggedRowCanBeDroppedHere={draggedRowCanBeDroppedHere}
            >
                {recoiltransformation.rules.length === 0 ||
                typeof transformation.id === 'undefined' ? null : (
                    <RowHeader
                        transformationId={transformation.id}
                        transformationHash={recoiltransformation.hash}
                    />
                )}
                {dragHandleProps === null ||
                recoiltransformation.adjacent_sort_indices === null ||
                recoiltransformation.adjacent_sort_indices.lower_bound ===
                    recoiltransformation.adjacent_sort_indices
                        .upper_bound ? null : (
                    <DragHandle
                        ref={handleRef}
                        dragHandleProps={dragHandleProps}
                    />
                )}
                <Suspense fallback={<div>Loading...</div>}>
                    <div
                        ref={rowbodyRef}
                        className="row_row"
                        style={{
                            width: `${
                                recoilNodes.length === 1
                                    ? 100
                                    : transform.scale * 100
                            }%`,
                            transform: `translateX(${
                                recoilNodes.length === 1
                                    ? 0
                                    : transform.translation.x
                            }px)`,
                        }}
                    >
                        {recoilNodes.map((node) => (
                            <BranchSpace
                                key={`branch_space_${node}`}
                                transformationHash={recoiltransformation.hash}
                                transforamtionId={recoiltransformation.id}
                                nodeUuid={node}
                            />
                        ))}
                    </div>
                </Suspense>
                {!recoiltransformation.allNodesShowMini &&
                (recoiltransformation.isExpandableV ||
                    recoiltransformation.isCollapsibleV) ? (
                    <OverflowButton
                        transformationId={recoiltransformation.id}
                        nodes={nodes}
                    />
                ) : null}
            </RowContainer>
        </Suspense>
    );
}, 
    (prevProps, nextProps) => {
        return prevProps?.transformation.id === nextProps.transformation.id &&
            prevProps?.dragHandleProps === nextProps.dragHandleProps
});

Row.propTypes = {
    /**
     * The Transformation wrapper object to be displayed
     */
    transformation: PropTypes.object,
    /**
     * an object which should be spread as props on the HTML element to be used as the drag handle.
     * The whole item will be draggable by the wrapped element.
     **/
    dragHandleProps: PropTypes.object,
    /**
     *
     */
    itemSelected: PropTypes.bool,
    /**
     *
     */
    anySelected: PropTypes.number,
};


