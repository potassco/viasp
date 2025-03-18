import {atom, selector} from 'recoil';

export const defaultBackendUrlState = 'http://localhost:5050';

export const backendUrlState = atom({
    key: 'backendURL',
    default: defaultBackendUrlState,
});

export const showDiffOnlyState = atom({
    key: 'showDiffOnlyState',
    default: true,
});

export const sessionState = atom({
    key: 'sessionState',
    default: null
})

export const availableColorThemesState = atom({
    key: 'allColorThemesState',
    default: null,
});

async function fetchColorTheme(backendURL, session) {
    const response = await fetch(`${backendURL}/graph/color_theme`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${session}`,
        },
    });
    if (!response.ok) {
        return 'ERROR';
    }
    return await response.json();
}

export const primaryColorState = atom({
    key: 'primaryColorState',
    default: selector({
        key: 'primaryColorState/Default',
        get: async ({get}) => {
            const backendURL = get(backendUrlState);
            const session = get(sessionState);
            if (backendURL === null || session === null) {
                return null;
            }
            return fetchColorTheme(backendURL, session);
        },
    }),
});

export const colorPaletteState = selector({
    key: 'colorPalette',
    get: ({get}) => {
        const primaryColor = get(primaryColorState);
        const availableColorThemes = get(availableColorThemesState);
        if (primaryColor === null) {
            return null;
        }
        document.documentElement.style.setProperty(
            '--hover-color',
            availableColorThemes[primaryColor].explanationHighlights[0]
        );
        return availableColorThemes[primaryColor];
    },
});