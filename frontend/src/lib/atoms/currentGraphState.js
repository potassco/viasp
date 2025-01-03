import {atom, selector} from 'recoil';

import {backendURLState} from './settingsState';

const defaultShownRecursion = [];

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


export const shownRecursionState = atom({
    key: 'shownRecursionState',
    default: defaultShownRecursion,
});


const getClingraphsFromServer = async (
    backendUrl,
    currentSort
) => {
    return fetch(`${backendUrl}/clingraph/children`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({currentSort}),
    });
};

export const clingraphState = atom({
    key: 'clingraphGraphicsState',
    default: selector({
        key: 'clingraphGraphicsState/Default',
        get: async ({get}) => {
            const backendURL = get(backendURLState);
            const currentSort = get(currentSortState);
            const response = await getClingraphsFromServer(
                backendURL,
                currentSort
            );
            if (!response.ok) {
                throw new Error(response.statusText);
            }
            const clingraphs = await response.json();
            return clingraphs.map((child) => ({
                ...child,
                loading: false,
                showMini: false
            }));
        }
    }),
})