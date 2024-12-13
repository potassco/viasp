import {atom} from 'recoil';

const defaultCurrentSortState = '';
const defaultNumberofTransformationsState = 0;

export const currentSortState = atom({
    key: 'currentSortState',
    default: defaultCurrentSortState,
});


export const numberOfTransformationsState = atom({
    key: 'numberOfTransformationsState',
    default: defaultNumberofTransformationsState,
});