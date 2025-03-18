import { selectorFamily, waitForAll } from 'recoil';
import { currentSortState } from './currentGraphState';
import { backendUrlState, sessionState } from './settingsState';

const getTransformationFromServer = async (backendURL, id, currentSort, session) => {
    return fetch(
        `${backendURL}/graph/transformations`, 
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session}`,
            },
            body: JSON.stringify({id, currentSort})
        }
    )
};


export const transformationStateFamily = selectorFamily({
    key: 'transformationState',
    get: 
        id => 
        async ({get}) => {
            const currentSort = get(currentSortState);
            const backendURL = get(backendUrlState);
            const session = get(sessionState);
            const response = await getTransformationFromServer(backendURL, id, currentSort, session);
            if (!response.ok) {
                throw new Error(response.statusText);
            }
            return response.json();
        },
});

export const proxyTransformationStateFamily = selectorFamily({
    key: 'proxyTransformationState',
    get: 
        (id) => 
        async ({get}) => {
            const [transformation] = get(waitForAll([transformationStateFamily(id)]));
            return transformation;
        },
    set: (id) => ({set}, newValue) => set(transformationStateFamily(id), newValue),
});

export const ruleWrapperStateFamily = selectorFamily({
    key: 'ruleWrapperState',
    get:
        ({transformationId, ruleIndex}) =>
        ({get}) => {
            const [transformation] = get(
                waitForAll([transformationStateFamily(transformationId)])
            );
            const rules = transformation.rules;
            return {
                _type: 'RuleWrapper_RECOIL',
                str_: rules.str_[ruleIndex],
                hash: rules.hash[ruleIndex],
                highlights: [],
            };
        },
    set:
        (id) =>
        ({set}, newValue) =>
            set(transformationStateFamily(id), newValue),
});

export const ruleWrapperByHashStateFamily = selectorFamily({
    key: 'ruleWrapperByHashState',
    get:
        ({transformationId, ruleHash}) =>
        ({get}) => {
            const [transformation] = get(
                waitForAll([transformationStateFamily(transformationId)])
            );
            const rules = transformation.rules;
            const ruleIndex = rules.hash.indexOf(ruleHash);
            return {
                _type: 'RuleWrapper_RECOIL',
                str_: rules.str_[ruleIndex],
                hash: rules.hash[ruleIndex],
                highlights: [],
            };
        },
    set:
        (id) =>
        ({set}, newValue) =>
            set(transformationStateFamily(id), newValue),
});
