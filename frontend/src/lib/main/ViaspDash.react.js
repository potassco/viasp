import React, {Suspense, useEffect, useRef} from 'react';
import PropTypes from 'prop-types';
import {MAPZOOMSTATE} from '../types/propTypes';
import {RowTemplate, Row} from '../components/Row.react';
import {Boxrow} from '../components/BoxRow.react';
import '../components/main.css';
import {Facts} from '../components/Facts.react';
import {Edges} from '../components/Edges.react';
import {Arrows} from '../components/Arrows.react';
import {Modal} from '../components/Modal.react';
import {
    UserMessagesProvider,
} from '../contexts/UserMessages';
import {Settings} from '../LazyLoader';
import {UserMessages} from '../components/messages';
import DraggableList from 'react-draggable-list';
import {MapInteraction} from 'react-map-interaction';
import {Constants} from '../constants';
import {
    RecoilRoot,
    useRecoilState,
    useRecoilValue,
    useResetRecoilState,
    useSetRecoilState,
    useRecoilCallback
} from 'recoil';
import {
    contentDivState,
    currentSortState,
    numberOfTransformationsState,
    usingClingraphState,
    shownRecursionState,
    isCurrentlyResizedState,
    isCurrentlyZoomingState,
    isCurrentlyPickedUpState,
    isCurrentlyBeingReorderedState,
} from '../atoms/currentGraphState';
import { zoomButtonPressedState } from '../atoms/zoomState';
import {
    backendUrlState,
    colorPaletteState,
    defaultBackendUrlState,
    tokenState
} from '../atoms/settingsState';
import {clearAllHighlightsCallback} from '../hooks/highlights';
import {
    draggableListSelectedItem,
    reorderTransformationDropIndicesState,
} from '../atoms/reorderTransformationDropIndices';
import {
    doKeyZoomScaleCallback,
    doKeyZoomTranslateCallback,
    handleExternalMapChangeCallback,
} from '../hooks/mapShift';
import {mapShiftState} from '../atoms/mapShiftState';
import useResizeObserver from '@react-hook/resize-observer';

async function postCurrentSort(backendUrl, currentSort, oldIndex, newIndex, token) {
    const r = await fetch(`${backendUrl}/graph/sorts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            current_sort: currentSort,
            moved_transformation: {
                old_index: oldIndex,
                new_index: newIndex,
            },
        }),
    });
    if (r.ok) {
        return r.json();
    }
    throw new Error(r.statusText);
}

function GraphContainer(props) {
    const {notifyDash, scrollContainer} = props;
    const draggableListRef = React.useRef(null);
    const clingraphUsed = useRecoilValue(usingClingraphState);
    const backendUrl = useRecoilValue(backendUrlState);
    const colorPalette = useRecoilValue(colorPaletteState);
    const token = useRecoilValue(tokenState);
    const setDraggableSelectedItem = useSetRecoilState(draggableListSelectedItem)
    const [currentSort, setCurrentSort] = useRecoilState(currentSortState)
    const tDropIndices = useRecoilValue(reorderTransformationDropIndicesState);
    const [transformationsList, setTransformationsList] = useRecoilState(numberOfTransformationsState);
    const resetTransformationsList = useResetRecoilState(numberOfTransformationsState);
    const setIsCurrentlyPickedUp = useSetRecoilState(isCurrentlyPickedUpState);
    const clearHighlights = useRecoilCallback(clearAllHighlightsCallback, []);
    const resetShownRecursion = useResetRecoilState(shownRecursionState);
    const setIsCurrentlyBeingReordered = useSetRecoilState(isCurrentlyBeingReorderedState);


    function onMoveEnd(newList, movedItem, oldIndex, newIndex) {
        if (
            tDropIndices.lower_bound <= newIndex &&
            newIndex <= tDropIndices.upper_bound
        ) {
            setDraggableSelectedItem(null);
            resetShownRecursion();
            clearHighlights();
            // setTransformationsList([]);
            postCurrentSort(backendUrl, currentSort, oldIndex, newIndex, token).then(
                (data) => {
                    setCurrentSort(data.hash);
                }
            );
            // resetTransformationsList();
        }
    }

    const graphContainerRef = React.useRef(null);
    return (
        currentSort === "ERROR" ? <div>No graph found. Invalid token?</div> :
        <div className="graph_container" ref={graphContainerRef}>
            <Facts />
            <Settings />
            <DraggableList
                ref={draggableListRef}
                itemKey={(i) => i.id}
                template={RowTemplate}
                list={transformationsList}
                onMoveEnd={onMoveEnd}
                onDragStart={(item) => {
                    setDraggableSelectedItem(item.id);
                }}
                onDragEnd={() => {
                    setDraggableSelectedItem(null);
                }}
                container={() => scrollContainer.current}
                autoScrollRegionSize={200}
                padding={0}
                unsetZIndex={true}
                commonProps={{setIsCurrentlyPickedUp, rowShading: colorPalette.rowShading}}
            />
            {clingraphUsed ? <Boxrow /> : null}
            <Arrows />
            {transformationsList.length === 0 ? null : <Edges />}
            <Modal />
        </div>
    );
}

GraphContainer.propTypes = {
    /**
     * Objects passed to this functions will be available to Dash callbacks.
     */
    notifyDash: PropTypes.func,
    /**
     * Reference to the scrollable div containing the list of rows
     * This is used to calculate the scroll region for the draggable list
     */
    scrollContainer: PropTypes.object,
};

function ZoomInteraction() {
    const [zoomBtnPressed, setZoomBtnPressed] = useRecoilState(
        zoomButtonPressedState
    );
    const mapShift = useRecoilValue(mapShiftState);
    const doKeyZoomScale = useRecoilCallback(doKeyZoomScaleCallback, []);
    const doKeyZoomTranslate = useRecoilCallback(doKeyZoomTranslateCallback, []);
    const handleMapChange = useRecoilCallback(handleExternalMapChangeCallback, []);
    const setIsCurrentlyZooming = useSetRecoilState(
        isCurrentlyZoomingState
    );
    
    const timerRef = useRef(null);
    useEffect(() => {
        setIsCurrentlyZooming(true);
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            setIsCurrentlyZooming(false);
        }, Constants.isAnimatingTimeout);
    }, [mapShift, setIsCurrentlyZooming]);


    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.keyCode === Constants.zoomToggleBtn) {
                setZoomBtnPressed(true);
            }
            if (Constants.zoomInBtns.includes(event.key) && zoomBtnPressed) {
                event.preventDefault();
                doKeyZoomScale(+1);
            }
            if (Constants.zoomOutBtns.includes(event.key) && zoomBtnPressed) {
                event.preventDefault();
                doKeyZoomScale(-1);
            }
            if (event.keyCode === Constants.KEY_RIGHT && zoomBtnPressed) {
                event.preventDefault();
                doKeyZoomTranslate(-1);
            }
            if (event.keyCode === Constants.KEY_LEFT && zoomBtnPressed) {
                event.preventDefault();
                doKeyZoomTranslate(1);
            }
        };

        const handleKeyUp = (event) => {
            if (event.keyCode === Constants.zoomToggleBtn) {
                setZoomBtnPressed(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [doKeyZoomTranslate, doKeyZoomScale, setZoomBtnPressed, zoomBtnPressed]);


    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
            }}
        >
            <MapInteraction
                minScale={1}
                value={mapShift}
                onChange={({translation, scale}) =>
                    handleMapChange(zoomBtnPressed, {translation, scale})
                }
            >
                {() => {
                    return zoomBtnPressed ? (
                        <div
                            className="scroll_overlay"
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                backgroundColor: 'transparent',
                                zIndex: 1,
                            }}
                        ></div>
                    ) : null;
                }}
            </MapInteraction>
        </div>
    );
}

function MainWindow(props) {
    const {notifyDash, backendUrl, colorPalette, token} = props;
    
    const setBackendURLRecoil = useSetRecoilState(backendUrlState);
    React.useLayoutEffect(() => {
        setBackendURLRecoil(backendUrl);
    }, [backendUrl, setBackendURLRecoil]);
    
    const contentDivRef = useRef(null);
    const setContentDiv = useSetRecoilState(contentDivState);
    const setToken = useSetRecoilState(tokenState);
    React.useLayoutEffect(() => {
        setToken(token);
    }, [token, setToken]);

    const setColorPaletteRecoil = useSetRecoilState(colorPaletteState);
    React.useLayoutEffect(() => {
        setColorPaletteRecoil(colorPalette);
        document.documentElement.style.setProperty(
            '--hover-color',
            colorPalette.explanationHighlights[0]
        );
    }, [colorPalette, setColorPaletteRecoil]);

    const setIsCurrentlyResizing = useSetRecoilState(isCurrentlyResizedState);
    const timerRef = useRef(null);
    useResizeObserver(contentDivRef, () => {
        setIsCurrentlyResizing(true);
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            setIsCurrentlyResizing(false);
        }, Constants.isAnimatingTimeout);
    });

    useEffect(() => {
        setContentDiv(contentDivRef);
    }, [setContentDiv]);

    return (
        <div className="content" id="content" ref={contentDivRef}>
            <ZoomInteraction/>
            <Suspense fallback={<div>Loading...</div>}>
                <GraphContainer
                    notifyDash={notifyDash}
                    scrollContainer={contentDivRef}
                />
            </Suspense>
        </div>
    );
}

MainWindow.propTypes = {
    /**
     * Objects passed to this functions will be available to Dash callbacks.
     */
    notifyDash: PropTypes.func,
    /**
     * The url to the viasp backend server
     */
    backendUrl: PropTypes.string,
    /**
     * Colors to be used in the application.
     */
    colorPalette: PropTypes.object,
    /**
     * The token for the encoding
     */
    token: PropTypes.string,
};

/**
 * ViaspDash is the main dash component
 */
export default function ViaspDash(props) {
    const {id, backendURL, setProps, colorPalette, config} = props;
    function notifyDash(clickedOn) {
        setProps({clickedOn: clickedOn});
    }
    const [encodingId, setEncodingId] = React.useState(null);

    React.useEffect(() => {
        Object.assign(Constants, config);
    }, [config]);

    React.useLayoutEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token') || '0';
        setEncodingId(token);
    }, []);

    return (
        <div id={id}>
            <RecoilRoot>
                <UserMessagesProvider>
                    <>
                        <UserMessages />
                        <MainWindow
                            notifyDash={notifyDash}
                            backendUrl={backendURL}
                            colorPalette={colorPalette}
                            token={encodingId}
                        />
                    </>
                </UserMessagesProvider>
            </RecoilRoot>
        </div>
    );
}

ViaspDash.propTypes = {
    /**
     * The ID used to identify this component in Dash callbacks.
     */
    id: PropTypes.string,

    /**
     * Dash-assigned callback that should be called to report property changes
     * to Dash, to make them available for callbacks.
     */
    setProps: PropTypes.func,
    /**
     * Colors to be used in the application.
     */
    colorPalette: PropTypes.object,
    /**
     * Object to set by the notifyDash callback
     */
    clickedOn: PropTypes.object,

    /**
     * The url to the viasp backend server
     */
    backendURL: PropTypes.string,
    /**
     * Constants to be used in the application.
     */
    config: PropTypes.object,
};

ViaspDash.defaultProps = {
    colorPalette: {},
    clickedOn: {},
    backendURL: defaultBackendUrlState,
};
