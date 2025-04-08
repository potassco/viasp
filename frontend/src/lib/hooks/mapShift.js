import {
    xShiftState,
    zoomShiftState,
    mapShiftState,
} from '../atoms/mapShiftState';
import {contentDivState} from '../atoms/currentGraphState';
import {Constants} from '../constants';
import {emToPixel} from '../utils';
import { useRecoilCallback } from 'recoil';

export const calculateTranslationBounds = (mapShift, contentDivRef) => {
    const contentWidth = contentDivRef.current.clientWidth;
    const rowWidth = contentWidth * mapShift.scale;
    return {
        scale: 1,
        translation: {
            xMax: 0,
            xMin: contentWidth - rowWidth,
        },
    };
}

function clampTranslation(desiredTranslation, translationBounds) {
    const {x, y} = desiredTranslation;
    let {xMax, xMin} = translationBounds.translation;
    xMin = typeof xMin !== 'undefined' ? xMin : -Infinity;
    xMax = typeof xMax !== 'undefined' ? xMax : Infinity;
    return {
        x: clamp(xMin, x, xMax),
        y: y,
    };
}


function clamp(min, value, max) {
    return Math.max(min, Math.min(value, max));
}

const coordChange = (coordinate, scaleRatio) => {
    return scaleRatio * coordinate - coordinate;
};

export const doKeyZoomScaleCallback = ({snapshot, set}) => async(dir) => {
    const mapShift = await snapshot.getPromise(mapShiftState);
    const contentDivRef = await snapshot.getPromise(contentDivState);
    const translationBounds = calculateTranslationBounds(mapShift, contentDivRef);
    let newScale = mapShift.scale + Constants.zoomBtnDiff * dir;
    if (newScale < translationBounds.scale) {
        newScale = 1;
    }
    const contentWidth = contentDivRef.current.clientWidth;
    const rowWidth = contentWidth * mapShift.scale;
    const focalPoint = {
        x: -mapShift.translation.x + rowWidth / 2
    };


    const scaleRatio = newScale / (mapShift.scale !== 0 ? mapShift.scale : 1);

    const focalPtDelta = {
        x: coordChange(focalPoint.x, scaleRatio),
    };

    const newTranslation = clampTranslation({
        x: mapShift.translation.x - focalPtDelta.x,
        y: 0,
    }, translationBounds);
    set(xShiftState, newTranslation.x);
    set(zoomShiftState, newScale);
}

export const doKeyZoomTranslateCallback = ({snapshot, set}) => async(dir) => {
    const mapShift = await snapshot.getPromise(mapShiftState);
    const contentDivRef = await snapshot.getPromise(contentDivState);
    const translationBounds = calculateTranslationBounds(mapShift, contentDivRef);
    const newXShiftValue =
        mapShift.translation.x +
        emToPixel(Constants.zoomBtnTranslationDiff) * dir;

    if (newXShiftValue < translationBounds.translation.xMin) {
        return;
    }
    if (newXShiftValue > translationBounds.translation.xMax) {
        return;
    }

    set(xShiftState, newXShiftValue);
}

export const setxShiftWithinBoundsCallback = ({snapshot, set}) => async (xShift) => {
    const mapShift = await snapshot.getPromise(mapShiftState);
    const contentDivRef = await snapshot.getPromise(contentDivState);
    const translationBounds = calculateTranslationBounds(mapShift, contentDivRef);
    const newTranslation = clampTranslation({
        x: xShift,
        y: 0,
    }, translationBounds);
    set(xShiftState, newTranslation.x);
}

export const changeXShiftWithinBoundsCallback =
    ({snapshot, set}) =>
    async (xDiff) => {
        const mapShift = await snapshot.getPromise(mapShiftState);
        const contentDivRef = await snapshot.getPromise(contentDivState);
        const translationBounds = calculateTranslationBounds(
            mapShift,
            contentDivRef
        );
        const newTranslation = clampTranslation(
            {
                x: mapShift.translation.x + xDiff,
                y: 0,
            },
            translationBounds
        );
        set(xShiftState, newTranslation.x);
    }

export const handleExternalMapChangeCallback = ({snapshot, set}) => async (zoomButtonPressed, {translation, scale}) => {
    if (!zoomButtonPressed) {
        return;
    }
    const newTranslation = {...translation}
    let newScale = scale;
    const mapShift = await snapshot.getPromise(mapShiftState);
    const contentDivRef = await snapshot.getPromise(contentDivState);

    const translationBounds = calculateTranslationBounds(
        mapShift,
        contentDivRef
    );

    if (newTranslation.x < translationBounds.translation.xMin) {
        newTranslation.x = translationBounds.translation.xMin;
    }
    if (newTranslation.x > translationBounds.translation.xMax) {
        newTranslation.x = translationBounds.translation.xMax;
    }
    if (newScale < translationBounds.scale) {
        newScale = translationBounds.scale;
    }
    set(xShiftState, newTranslation.x);
    set(zoomShiftState, newScale);
}