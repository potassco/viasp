import {atom, selector} from 'recoil';

import {backendURLState} from './settingsState';

const defaultNumberofTransformationsState = 0;

export const currentSortState = atom({
    key: 'currentSortState',
    default: selector({
        key: 'currentSortState/Default',
        get: async ({get}) => {
            const backendURL = get(backendURLState);
            const response = await fetch(`${backendURL}/graph/current`);
            if (!response.ok) {
                throw new Error(response.statusText);
            }
            return response.json();
        }
    }),
});


export const numberOfTransformationsState = selector({
    key: 'numberOfTransformationsState',
    get: async ({get}) => {
        const currentSort = get(currentSortState);
        const backendURL = get(backendURLState);
        const response = await fetch(
            `${backendURL}/transformations/current`
        );
        if (!response.ok) {
            throw new Error(response.statusText);
        }
        return response.json();
    }
});
