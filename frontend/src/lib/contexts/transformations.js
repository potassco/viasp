import React from "react";
import {showError, useMessages} from "./UserMessages";
import {useSettings} from "./Settings";
import PropTypes from "prop-types";
import { computeSortHash } from "../utils/index";

function fetchTransformations(backendURL) {
    return fetch(`${backendURL("graph/transformations")}`).then(r => {
        if (r.ok) {
            return r.json()
        }
        throw new Error(r.statusText);

    });
}

function fetchSorts(backendURL) {
    return fetch(`${backendURL("graph/sorts")}`).then(r => {
        if (r.ok) {
            return r.json()
        }
        throw new Error(r.statusText);

    });
}

async function canBeDropped(
    transformations,
    possibleSorts,
    currentDragged,
    hash
) {
    if (currentDragged !== '') {
        const sort = transformations.map((t) => t.hash);
        const oldIndex = sort.findIndex((h) => h === currentDragged);
        const [removed] = sort.splice(oldIndex, 1);
        let newIndex = sort.findIndex((h) => h === hash);
        if (newIndex >= oldIndex) {
            newIndex += 1;
        }
        sort.splice(newIndex, 0, removed);
        const newHash = await computeSortHash(sort);
        return possibleSorts?.includes(newHash) ? newHash : '';
    }
    return '';
}


const initialState = {
    transformations: [],
    possibleSorts: [],
    currentSort: '',
    currentDragged: '',
};

const HIDE_TRANSFORMATION = 'APP/TRANSFORMATIONS/HIDE';
const SHOW_TRANSFORMATION = 'APP/TRANSFORMATIONS/SHOW';
const TOGGLE_TRANSFORMATION = 'APP/TRANSFORMATIONS/TOGGLE';
const SHOW_ONLY_TRANSFORMATION = 'APP/TRANSFORMATIONS/ONLY';
const ADD_TRANSFORMATION = 'APP/TRANSFORMATIONS/ADD';
const ADD_SORT = 'APP/TRANSFORMATIONS/ADDSORT';
const SET_CURRENT_SORT = 'APP/TRANSFORMATIONS/SETCURRENTSORT';
const REORDER_TRANSFORMATION = 'APP/TRANSFORMATIONS/REORDER';
const SET_CURRENT_DRAGGED = 'APP/TRANSFORMATIONS/SETDRAGGED';
const hideTransformation = (t) => ({type: HIDE_TRANSFORMATION, t})
const showTransformation = (t) => ({type: SHOW_TRANSFORMATION, t})
const toggleTransformation = (t) => ({type: TOGGLE_TRANSFORMATION, t})
const showOnlyTransformation = (t) => ({type: SHOW_ONLY_TRANSFORMATION, t})
const addTransformation = (t) => ({type: ADD_TRANSFORMATION, t})
const addSort = (s) => ({ type: ADD_SORT, s })
const setCurrentSort = (s) => ({ type: SET_CURRENT_SORT, s})
const reorderTransformation = (oldIndex, newIndex) => ({type: REORDER_TRANSFORMATION, oldIndex, newIndex})
const setCurrentDragged = (h) => ({type: SET_CURRENT_DRAGGED, h});
const TransformationContext = React.createContext();

const transformationReducer = (state = initialState, action) => {
    if (action.type === ADD_TRANSFORMATION) {
        return {
            ...state,
            transformations: state.transformations.concat({transformation: action.t, shown: true, hash: action.t.hash, canDrop: ''})
        }
    }
    if (action.type === SHOW_ONLY_TRANSFORMATION) {
        return {
            ...state,
            transformations: state.transformations.map(container => container.transformation.id !== action.t.id ? {
                transformation: container.transformation,
                shown: false
            } : {
                transformation: container.transformation,
                shown: true
            })
        }
    }
    if (action.type === SHOW_TRANSFORMATION) {
        return {
            ...state,
            transformations: state.transformations.map(container => container.transformation === action.t ? {
                transformation: container.transformation,
                shown: true
            } : container)
        }
    }
    if (action.type === HIDE_TRANSFORMATION) {
        return {
            ...state,
            transformations: state.transformations.map(container => container.transformation === action.t ? {
                transformation: container.transformation,
                shown: false
            } : container)
        }
    }
    if (action.type === TOGGLE_TRANSFORMATION) {
        return {
            ...state,
            transformations: state.transformations.map(container => container.transformation === action.t ? {
                transformation: container.transformation,
                shown: !container.shown
            } : container)
        }
    }
    if (action.type === REORDER_TRANSFORMATION) {
        let transformations = [...state.transformations];
        const [removed] = transformations.splice(action.oldIndex, 1);
        transformations.splice(action.newIndex, 0, removed);
        transformations = transformations.map((t,i) => {
            return {transformation: {...t.transformation, id: i}, shown: t.shown, hash: t.hash, canDrop: ''}
        })
        return {
            ...state,
            transformations
        }
    }
    if (action.type === ADD_SORT) {
        if (state.currentSort === "") {
            return {
                ...state,
                possibleSorts: state.possibleSorts.concat([action.s]),
                currentSort: action.s
            }
        }
        return {
            ...state,
            possibleSorts: state.possibleSorts.concat([action.s])
        }
    }
    if (action.type === SET_CURRENT_SORT) {
        return {
            ...state,
            currentSort: action.s
        }
    }
    if (action.type === SET_CURRENT_DRAGGED) {
        const newTransformations = state.transformations.map(t => {
            const newT = {...t};
            canBeDropped(
                    state.transformations,
                    state.possibleSorts,
                    action.h,
                    t.hash
                ).then((ans) => {
                    newT.canDrop = ans;
                });
            return newT;
        });
        return {
            ...state,
            currentDragged: action.h,
            transformations: newTransformations
        }
    }
    return {...state}
}

const TransformationProvider = ({children}) => {
    const [, message_dispatch] = useMessages()
    const { backendURL} = useSettings();
    const [state, dispatch] = React.useReducer(transformationReducer, initialState);
    const backendUrlRef = React.useRef(backendURL);
    const messageDispatchRef = React.useRef(message_dispatch);


    React.useEffect(() => {
        let mounted = true;
        fetchSorts(backendUrlRef.current).catch(error => {
            messageDispatchRef.current(showError(`Failed to get dependency sorts: ${error}`))
        })
            .then(items => {
                if (mounted) {
                    items.map((s) => dispatch(addSort(s)))
                }
            })
        fetchTransformations(backendUrlRef.current).catch(error => {
            messageDispatchRef.current(showError(`Failed to get transformations: ${error}`))
        })
            .then(items => {
                if (mounted) {
                    items.map((t) => (dispatch(addTransformation(t))))
                }
            })
        return () => { mounted = false };
    }, []);

    return <TransformationContext.Provider value={{state, dispatch}}>{children}</TransformationContext.Provider>
}

const useTransformations = () => React.useContext(TransformationContext);

TransformationProvider.propTypes = {
    /**
     * The subtree that requires access to this context.
     */
    children: PropTypes.element,
}
export {
    TransformationProvider,
    TransformationContext,
    useTransformations,
    toggleTransformation,
    showOnlyTransformation,
    reorderTransformation,
    setCurrentDragged,
};
