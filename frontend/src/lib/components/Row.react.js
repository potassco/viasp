import React, {Suspense, useRef, useEffect} from 'react';
import {OverflowButton} from './OverflowButton.react';
import {Constants} from '../constants';
import './row.css';
import {RowSignalContainerDiv, RowContainerDiv, RowRowDiv} from './Row.style';
import PropTypes from 'prop-types';
import {RowHeader} from './RowHeader.react';
import {BranchSpace} from './BranchSpace.react';
import {ColorPaletteContext} from '../contexts/ColorPalette';
import {DragHandle} from './DragHandle.react';
import {useRecoilValue} from 'recoil';
import {proxyTransformationStateFamily} from '../atoms/transformationsState';
import {nodeUuidsByTransforamtionStateFamily} from '../atoms/nodesState';
import {reorderTransformationDropIndicesState} from '../atoms/reorderTransformationDropIndices';
import { mapShiftState } from '../atoms/mapShiftState';


export class RowTemplate extends React.Component {
    constructor(props) {
        super(props);
        this.rowRef = React.createRef();
        this.intervalId = null;
        this.setIsCurrentlyPickedUp = null;
        this.isCurrentlyPickedUp = false;
    }

    componentDidUpdate(prevProps, prevState) {
        if (
            this.props.itemSelected > Constants.rowAnimationPickupThreshold &&
            !this.isCurrentlyPickedUp
        ) {
            this.setIsCurrentlyPickedUp(true);
            this.isCurrentlyPickedUp = true;
        }
        if (
            this.props.itemSelected < Constants.rowAnimationPickupThreshold &&
            this.isCurrentlyPickedUp
        ) {
            this.isCurrentlyPickedUp = false;
            this.setIsCurrentlyPickedUp(false);
        }
    }

    componentWillUnmount() {
        if (this.isCurrentlyPickedUp) {
            this.isCurrentlyPickedUp = false;
            this.setIsCurrentlyPickedUp(false);
        }
    }

    render() {
        const {
            item: transformation,
            itemSelected,
            anySelected,
            dragHandleProps,
            commonProps,
        } = this.props;
        this.setIsCurrentlyPickedUp = commonProps.setIsCurrentlyPickedUp;


        return (
            <ColorPaletteContext.Consumer>
                {({rowShading}) => {
                    const scaleConstant = 0.005;
                    const shadowConstant = 15;
                    const scale = itemSelected * scaleConstant + 1;
                    const shadow =
                        itemSelected * shadowConstant + 0;
                    const background = rowShading[
                                (transformation.id + 1) %
                                    rowShading.length
                            ];

                    return (
                        <RowSignalContainerDiv
                            className={`row_signal_container ${transformation.id}`}
                            ref={this.rowRef}
                            key={transformation.id}
                            $scale={scale}
                            $shadow={shadow}
                            $background={background}
                        >
                            <Row
                                key={transformation.id}
                                transformationId={transformation.id}
                                dragHandleProps={dragHandleProps}
                            />
                        </RowSignalContainerDiv>
                    );
                }}
            </ColorPaletteContext.Consumer>
        );
    }
}

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
    /**
     * Common props passed identically to all RowTemplates
     **/
    commonProps: PropTypes.object,
};


export const Row = React.memo(
    (props) => {
        const {transformationId, dragHandleProps} = props;
        const rowbodyRef = useRef(null);
        const headerRef = useRef(null);
        const handleRef = useRef(null);
        const mapShift = useRecoilValue(mapShiftState);
        const tDropIndices = useRecoilValue(
            reorderTransformationDropIndicesState
        );
        const transformation = useRecoilValue(
            proxyTransformationStateFamily(transformationId)
        );
        const nodes = useRecoilValue(
            nodeUuidsByTransforamtionStateFamily(transformation.hash)
        );

        useEffect(() => {
            if (headerRef.current && handleRef.current) {
                const headerHeight = headerRef.current.offsetHeight;
                handleRef.current.style.top = `${headerHeight}px`;
            }
        }, []);

        const draggedRowCanBeDroppedHere =
            tDropIndices !== null
                ? tDropIndices.lower_bound <= transformationId &&
                  transformationId <= tDropIndices.upper_bound
                : true;

        return (
            <Suspense fallback={<div>Loading Row...</div>}>
                <RowContainerDiv
                    className={`row_container ${transformation.hash}`}
                    $draggedRowCanBeDroppedHere={draggedRowCanBeDroppedHere}
                >
                    {transformation.rules.length === 0 ||
                    typeof transformationId === 'undefined' ? null : (
                        <RowHeader
                            transformationId={transformationId}
                            transformationHash={transformation.hash}
                        />
                    )}
                    {dragHandleProps === null ||
                    transformation.adjacent_sort_indices === null ||
                    transformation.adjacent_sort_indices.lower_bound ===
                        transformation.adjacent_sort_indices
                            .upper_bound ? null : (
                        <DragHandle
                            ref={handleRef}
                            dragHandleProps={dragHandleProps}
                        />
                    )}
                    <RowRowDiv
                        ref={rowbodyRef}
                        className="row_row"
                        $onlyOneNode={nodes.length === 1}
                        $scale = {mapShift.scale}
                        $translation = {mapShift.translation.x}
                        $isConstraintsOnly = {transformation.is_constraints_only}
                        $background = {'transparent'}
                    >
                        {nodes.map((node) => (
                            <BranchSpace
                                key={`branch_space_${node}`}
                                transformationHash={transformation.hash}
                                transformationId={transformation.id}
                                nodeUuid={node}
                            />
                        ))}
                    </RowRowDiv>
                    <OverflowButton transformationHash={transformation.hash} />
                </RowContainerDiv>
            </Suspense>
        );
    },
    (prevProps, nextProps) => {
        return (
            prevProps?.transformationId === nextProps.transformationId &&
            prevProps?.dragHandleProps === nextProps.dragHandleProps
        );
    }
);

Row.propTypes = {
    /**
     * The Transformation wrapper object to be displayed
     */
    transformationId: PropTypes.number,
    /**
     * an object which should be spread as props on the HTML element to be used as the drag handle.
     * The whole item will be draggable by the wrapped element.
     **/
    dragHandleProps: PropTypes.object,
};
