import {atom} from 'recoil';

const defaultBackendUrlState = 'http://localhost:5050';
const defaultColorPalette = {}

export const backendUrlState = atom({
    key: 'backendURL',
    default: defaultBackendUrlState
})

export const colorPaletteState = atom({
    key: 'colorPalette',
    default: defaultColorPalette
})