import React, {createContext, useContext, useState} from 'react';
import PropTypes from 'prop-types';
import {Constants} from '../constants';
import {useContentDiv} from './ContentDivContext';
import {emToPixel} from '../utils';

const MapShiftContext = createContext();
export const useMapShift = () => useContext(MapShiftContext);

const coordChange = (coordinate, scaleRatio) => {
  return (scaleRatio * coordinate) - coordinate;
};

function clamp(min, value, max) {
    return Math.max(min, Math.min(value, max));
}

export const MapShiftProvider = ({children}) => {
    const [mapShiftValue, setMapShiftValue] = useState({
        translation: {x: 0, y: 0},
        scale: 1,
    });
    const [translationBounds, setTranslationBounds] = useState({
        translation: {xMin: 0, xMax: 0},
        scale: 1,
    });
    const contentDivRef = useContentDiv();


    const setNewTranslationBounds = (newScale) => {
        const contentWidth = contentDivRef.current.clientWidth;
        const rowWidth = contentWidth * newScale;
        setTranslationBounds({
            scale: 1,
            translation: {
                xMax: 0,
                xMin: contentWidth - rowWidth,
            },
        });
    }

    function clampTranslation(desiredTranslation) {
        const {x, y} = desiredTranslation;
        let {xMax, xMin} = translationBounds.translation;
        xMin = typeof xMin !== "undefined" ? xMin : -Infinity;
        xMax = typeof xMax !== "undefined" ? xMax : Infinity;
        return {
            x: clamp(xMin, x, xMax),
            y: y,
        };
    }

    function scaleFromPoint(newScale, focalPt) {
        const {translation, scale} = mapShiftValue;
        const scaleRatio = newScale / (scale !== 0 ? scale : 1);

        const focalPtDelta = {
            x: coordChange(focalPt.x, scaleRatio),
        };

        const newTranslation = {
            x: translation.x - focalPtDelta.x,
            y: 0,
        };
        setMapShiftValue({
            scale: newScale,
            translation: clampTranslation(newTranslation),
        });
    }

    const doKeyZoomScale = (dir) => {
        let newScale = mapShiftValue.scale + Constants.zoomBtnDiff * dir;
        if (newScale < translationBounds.scale) {
            newScale = 1;
        }
        setNewTranslationBounds(newScale);

        const contentWidth =
            contentDivRef.current.getBoundingClientRect().width;
        const rowWidth = contentWidth * mapShiftValue.scale;
        const x = -mapShiftValue.translation.x + rowWidth/2;

        const focalPoint = {x};
        scaleFromPoint(newScale, focalPoint);
    }

    const doKeyZoomTranslate = (dir) => {
        setMapShiftValue((oldShiftValue) => {
            const newShiftValue =
                oldShiftValue.translation.x + dir * emToPixel(Constants.zoomBtnTranlsaltionDiff);

            if (newShiftValue < translationBounds.translation.xMin) {
                return oldShiftValue;
            }
            if (newShiftValue > translationBounds.translation.xMax) {
                return oldShiftValue;
            }

            return {
                ...oldShiftValue,
                translation: {
                    ...oldShiftValue.translation,
                    x: newShiftValue
                },
            };
        });
    };

    return (
        <MapShiftContext.Provider
            value={{
                mapShiftValue,
                setMapShiftValue,
                translationBounds,
                setTranslationBounds,
                doKeyZoomScale,
                doKeyZoomTranslate,
            }}
        >
            {children}
        </MapShiftContext.Provider>
    );
};

MapShiftProvider.propTypes = {
    /**
     * The subtree that requires access to this context.
     */
    children: PropTypes.element,
};


