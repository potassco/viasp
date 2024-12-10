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
import { emToPixel } from '../utils';

function GraphContainer(props) {
    const {notifyDash, scrollContainer, transform} = props;
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

    function onMoveEnd(newList, movedItem, oldIndex, newIndex) {
        if (
            transformationDropIndices.lower_bound <= newIndex &&
            newIndex <= transformationDropIndices.upper_bound
        ) {
            clearHighlightedSymbol();
            setSortAndFetchGraph(oldIndex, newIndex);
        }
        dispatchTransformation(setTransformationDropIndices(null));
    }

    const graphContainerRef = React.useRef(null);
    return (
        <div className="graph_container" ref={graphContainerRef}>
            <Facts transform={transform} />
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
                commonProps={{transform}}
            />
            {clingraphUsed ? <Boxrow transform={transform} /> : null}
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
    /**
     * The current zoom transformation of the graph
     */
    transform: MAPZOOMSTATE,
};

function MainWindow(props) {
    const {notifyDash} = props;
    const {setAnimationState} = useAnimationUpdater();
    const setAnimationStateRef = React.useRef(setAnimationState);
    const [zoomBtnPressed, setZoomBtnPressed] = React.useState(false);
    const {
        mapShiftValue,
        setMapShiftValue,
        translationBounds,
        setTranslationBounds,
        doKeyZoomScale,
        doKeyZoomTranslate,
    } = useMapShift();
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

    const setNewTranslationBounds = React.useCallback((newScale) => {
        const contentWidth = contentDivRef.current.clientWidth;
        const rowWidth = contentWidth * newScale;
        setTranslationBounds({
            scale: 1,
            translation: {
                xMax: 0,
                xMin: contentWidth - rowWidth,
            },
        });
    }, [contentDivRef, setTranslationBounds]);

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
        doKeyZoomTranslate]);



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

    // observe scroll position
    // Add a state for the scroll position
    const [scrollPosition, setScrollPosition] = React.useState(0);

    // Add an effect to update the scroll position state when the contentDiv scrolls
    React.useEffect(() => {
        const contentDiv = contentDivRef.current;
        const handleScroll = debounce((event) => {
            requestAnimationFrame(() => {
                setScrollPosition(event.target.scrollTop);
            });
        }, 100);

        if (contentDiv) {
            contentDiv.addEventListener('scroll', handleScroll);
        }

        return () => {
            if (contentDiv) {
                contentDiv.removeEventListener('scroll', handleScroll);
            }
        };
    }, [contentDivRef]);

    React.useEffect(() => {
        setAnimationState((oldValue) => ({
            ...oldValue,
            graph_zoom: {
                ...oldValue.graph_zoom,
                translation: {
                    x: mapShiftValue.translation.x,
                    y: scrollPosition,
                },
            },
        }));
    }, [mapShiftValue, scrollPosition, setAnimationState]);

    return (
        <>
            <div className="content" id="content" ref={contentDivRef}>
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
                <GraphContainer
                    notifyDash={notifyDash}
                    scrollContainer={contentDivRef}
                    transform={mapShiftValue}
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
