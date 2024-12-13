import {atomFamily} from 'recoil';

const defaultTransformationsState = '';

export const transformation = atomFamily({
    key: 'transformation',
    default: defaultTransformationsState,
});