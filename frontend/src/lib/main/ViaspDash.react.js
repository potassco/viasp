import React, {Suspense, useEffect, useRef} from 'react';
import PropTypes from 'prop-types';
import {MAPZOOMSTATE} from '../types/propTypes';
import {RowTemplate, Row} from '../components/Row.react';
import {Boxrow} from '../components/BoxRow.react';
import '../components/main.css';
import {Facts} from '../components/Facts.react';
import {Edges} from '../components/Edges.react';
import {Arrows} from '../components/Arrows.react';
import {ShownNodesProvider} from '../contexts/ShownNodes';
import {ContentDivProvider, useContentDiv} from '../contexts/ContentDivContext';
import { MapShiftProvider, useMapShift } from '../contexts/MapShiftContext';
import {ColorPaletteProvider} from '../contexts/ColorPalette';
import {HighlightedNodeProvider} from '../contexts/HighlightedNode';
import {SearchUserInputProvider} from '../contexts/SearchUserInput';
import {
    UserMessagesProvider,
} from '../contexts/UserMessages';
import {Settings} from '../LazyLoader';
import {UserMessages} from '../components/messages';
import {
    DEFAULT_BACKEND_URL,
    SettingsProvider,
    useSettings,
} from '../contexts/Settings';
import {FilterProvider} from '../contexts/Filters';
import {
    HighlightedSymbolProvider,
    useHighlightedSymbol,
} from '../contexts/HighlightedSymbol';
import {
    useAnimationUpdater,
    AnimationUpdaterProvider,
} from '../contexts/AnimationUpdater';
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
import {backendUrlState, colorPaletteState} from '../atoms/settingsState'
import {clearAllHighlightsCallback} from '../atoms/highlightsState';
import {
    draggableListSelectedItem,
    reorderTransformationDropIndicesState,
} from '../atoms/reorderTransformationDropIndices';
import useResizeObserver from '@react-hook/resize-observer';

async function postCurrentSort(backendUrl, currentSort, oldIndex, newIndex) {
    const r = await fetch(`${backendUrl}/graph/sorts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
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
    // const {clearHighlightedSymbol} = useHighlightedSymbol();
    const clingraphUsed = useRecoilValue(usingClingraphState);
    const backendUrl = useRecoilValue(backendUrlState);
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
            postCurrentSort(backendUrl, currentSort, oldIndex, newIndex).then(
                (data) => {
                    setCurrentSort(data.hash);
                }
            );
            // resetTransformationsList();
        }
    }

    const graphContainerRef = React.useRef(null);
    return (
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
                commonProps={{setIsCurrentlyPickedUp}}
            />
            {clingraphUsed ? <Boxrow /> : null}
            <Arrows />
            {transformationsList.length === 0 ? null : <Edges />}
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
    const {
        mapShiftValue,
        setMapShiftValue,
        translationBounds,
        setTranslationBounds,
        doKeyZoomScale,
        doKeyZoomTranslate,
    } = useMapShift();
    const {setAnimationState} = useAnimationUpdater();
    const setAnimationStateRef = React.useRef(setAnimationState);
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
    }, [mapShiftValue, setIsCurrentlyZooming]);

    const contentDivRef = useContentDiv();

    React.useEffect(() => {
        const setAnimationState = setAnimationStateRef.current;
        setAnimationState((oldValue) => ({
            ...oldValue,
            graph_zoom: {
                translation: {x: 0, y: 0},
                scale: 1,
            },
        }));
        return () => {
            setAnimationState((v) => {
                const {graph_zoom: _, ...rest} = v;
                return rest;
            });
        };
    }, []);

    const setNewTranslationBounds = React.useCallback(
        (newScale) => {
            const contentWidth = contentDivRef.current.clientWidth;
            const rowWidth = contentWidth * newScale;
            setTranslationBounds({
                scale: 1,
                translation: {
                    xMax: 0,
                    xMin: contentWidth - rowWidth,
                },
            });
        },
        [contentDivRef, setTranslationBounds]
    );

    React.useEffect(() => {
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
    }, [
        zoomBtnPressed,
        translationBounds,
        setNewTranslationBounds,
        setMapShiftValue,
        doKeyZoomScale,
        doKeyZoomTranslate,
        setZoomBtnPressed
    ]);

    const handleMapChange = ({translation, scale}) => {
        if (zoomBtnPressed) {
            const newTranslation = {...translation};
            let newScale = scale;

            setNewTranslationBounds(newScale);

            setMapShiftValue(() => {
                if (newTranslation.x < translationBounds.translation.xMin) {
                    newTranslation.x = translationBounds.translation.xMin;
                }
                if (newTranslation.x > translationBounds.translation.xMax) {
                    newTranslation.x = translationBounds.translation.xMax;
                }
                if (newScale < translationBounds.scale) {
                    newScale = translationBounds.scale;
                }
                return {
                    translation: newTranslation,
                    scale: newScale,
                };
            });
        }
    };

    React.useEffect(() => {
        setAnimationState((oldValue) => ({
            ...oldValue,
            graph_zoom: {
                ...oldValue.graph_zoom,
                translation: {
                    x: mapShiftValue.translation.x,
                },
            },
        }));
    }, [mapShiftValue, setAnimationState]);

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
                minScale={translationBounds.scale}
                value={mapShiftValue}
                onChange={({translation, scale}) =>
                    handleMapChange({translation, scale})
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
    const {notifyDash, backendUrl, colorPalette} = props;
    
    const setBackendURLRecoil = useSetRecoilState(backendUrlState);
    React.useLayoutEffect(() => {
        setBackendURLRecoil(backendUrl);
    }, [backendUrl, setBackendURLRecoil]);
    
    const contentDivRef = useContentDiv();
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
};

/**
 * ViaspDash is the main dash component
 */
export default function ViaspDash(props) {
    const {id, backendURL, setProps, colorPalette, config} = props;

    function notifyDash(clickedOn) {
        setProps({clickedOn: clickedOn});
    }

    React.useEffect(() => {
        Object.assign(Constants, config);
    }, [config]);

    return (
        <div id={id}>
            <RecoilRoot>
                <ColorPaletteProvider colorPalette={colorPalette}>
                    <SettingsProvider backendURL={backendURL}>
                        <HighlightedNodeProvider>
                            <ContentDivProvider>
                                <MapShiftProvider>
                                    <FilterProvider>
                                        <AnimationUpdaterProvider>
                                            <UserMessagesProvider>
                                                <ShownNodesProvider>
                                                    <HighlightedSymbolProvider>
                                                        <SearchUserInputProvider>
                                                            <div>
                                                                <UserMessages />
                                                                <MainWindow
                                                                    notifyDash={
                                                                        notifyDash
                                                                    }
                                                                    backendUrl={
                                                                        backendURL
                                                                    }
                                                                    colorPalette={
                                                                        colorPalette
                                                                    }
                                                                />
                                                            </div>
                                                        </SearchUserInputProvider>
                                                    </HighlightedSymbolProvider>
                                                </ShownNodesProvider>
                                            </UserMessagesProvider>
                                        </AnimationUpdaterProvider>
                                    </FilterProvider>
                                </MapShiftProvider>
                            </ContentDivProvider>
                        </HighlightedNodeProvider>
                    </SettingsProvider>
                </ColorPaletteProvider>
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
    backendURL: DEFAULT_BACKEND_URL,
};
