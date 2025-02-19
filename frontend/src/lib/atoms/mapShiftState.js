import {atom, selector} from 'recoil';

const defaultXShiftState = 0;
const defaultZoomShiftState = 1;

export const xShiftState = atom({
    key: 'xShiftState',
    default: defaultXShiftState,
});

export const zoomShiftState = atom({
    key: 'zoomShiftState',
    default: defaultZoomShiftState,
});

export const mapShiftState = selector({
    key: 'mapShiftState',
    get: ({get}) => {
        const xShift = get(xShiftState);
        const zoomShift = get(zoomShiftState);
        return {
            translation: {x: xShift, y: 0},
            scale: zoomShift
        };
    },
});



export const translationBoundsState = atom({
    key: 'translationBoundsState',
    default: {
        translation: {xMin: 0, xMax: 0},
        scale: 1,
    },
});