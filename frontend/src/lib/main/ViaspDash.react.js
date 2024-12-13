import React, {Suspense} from 'react';
import PropTypes from 'prop-types';
import {MAPZOOMSTATE} from '../types/propTypes';
import {RowTemplate} from '../components/Row.react';
import {Boxrow} from '../components/BoxRow.react';
import '../components/main.css';
import {Facts} from '../components/Facts.react';
import {Edges} from '../components/Edges.react';
import {Arrows} from '../components/Arrows.react';
import {ShownNodesProvider} from '../contexts/ShownNodes';
import {ContentDivProvider, useContentDiv} from '../contexts/ContentDivContext';
import { MapShiftProvider, useMapShift } from '../contexts/MapShiftContext';
import {
    TransformationProvider,
    useTransformations,
    setTransformationDropIndices,
} from '../contexts/transformations';
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
import debounce from 'lodash.debounce';
import { RecoilRoot, useRecoilState } from 'recoil';
import {
    currentSortState,
    numberOfTransformationsState,
} from '../recoil/currentSortState';
import { zoomButtonPressedState } from '../recoil/zoomState';

function GraphContainer(props) {
    const {notifyDash, scrollContainer} = props;
    const {
        state: {
            transformations,
            clingraphGraphics,
            transformationDropIndices,
            explanationHighlightedSymbols,
        },
        dispatch: dispatchTransformation,
        setSortAndFetchGraph,
    } = useTransformations();
    const draggableListRef = React.useRef(null);
    const {clearHighlightedSymbol} = useHighlightedSymbol();
    const clingraphUsed = clingraphGraphics.length > 0;
    const {backendURL} = useSettings();
    const [currentSort, setCurrentSort] = useRecoilState(currentSortState)
    const [numberOfTransformations, setNumberOfTransformations] = useRecoilState(numberOfTransformationsState)

    function onMoveEnd(newList, movedItem, oldIndex, newIndex) {
        if (
            transformationDropIndices.lower_bound <= newIndex &&
            newIndex <= transformationDropIndices.upper_bound
        ) {
            clearHighlightedSymbol();
            setNewSortAndSetRecoil(oldIndex, newIndex);
            setSortAndFetchGraph(oldIndex, newIndex);
        }
        dispatchTransformation(setTransformationDropIndices(null));
    }

    async function fetchCurrentSortAndSetRecoil() {
        try {
            const response = await fetch(`${backendURL('graph/current')}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            setCurrentSort(data)
        } catch (error) {
            console.error('Error fetching current sort', error);
        }
        try {
            const response = await fetch(`${backendURL('transformations/current')}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            setNumberOfTransformations(data.number_of_transformations);
        } catch (error) {
            console.error('Error fetching number of Transformations', error);
        }
    }

    async function setNewSortAndSetRecoil(oldIndex,newIndex) {
        try {
            const response = await fetch(`${backendURL('graph/sorts')}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    moved_transformation: {
                        old_index: oldIndex,
                        new_index: newIndex,
                    },
                }),
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            setCurrentSort(data.hash);
        } catch (error) {
            console.error('Error setting new sort', error);
        }
    }

    React.useEffect(() => {
        fetchCurrentSortAndSetRecoil()
    }, []); // eslint-disable-line react-hooks/exhaustive-deps


    const graphContainerRef = React.useRef(null);
    return (
        <div className="graph_container" ref={graphContainerRef}>
            <Facts />
            <Suspense fallback={<div>Loading...</div>}>
                <Settings />
            </Suspense>
            <DraggableList
                ref={draggableListRef}
                itemKey="hash"
                template={RowTemplate}
                list={transformations}
                onMoveEnd={onMoveEnd}
                container={() => scrollContainer.current}
                autoScrollRegionSize={200}
                padding={0}
                unsetZIndex={true}
            />
            {clingraphUsed ? <Boxrow /> : null}
            {explanationHighlightedSymbols.length === 0 ? null : <Arrows />}
            {transformations.length === 0 ? null : <Edges />}
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
    const {notifyDash} = props;
    const contentDivRef = useContentDiv();


    return (
        <>
            <div className="content" id="content" ref={contentDivRef}>
                <ZoomInteraction/>
                <GraphContainer
                    notifyDash={notifyDash}
                    scrollContainer={contentDivRef}
                />
            </div>
        </>
    );
}

MainWindow.propTypes = {
    /**
     * Objects passed to this functions will be available to Dash callbacks.
     */
    notifyDash: PropTypes.func,
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
        // Update the constants with the config prop
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
                                                <TransformationProvider>
                                                    <HighlightedSymbolProvider>
                                                        <SearchUserInputProvider>
                                                            <div>
                                                                <UserMessages />
                                                                <MainWindow
                                                                    notifyDash={
                                                                        notifyDash
                                                                    }
                                                                />
                                                            </div>
                                                        </SearchUserInputProvider>
                                                    </HighlightedSymbolProvider>
                                                </TransformationProvider>
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
