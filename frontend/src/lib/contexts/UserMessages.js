import React from 'react';
import PropTypes from 'prop-types';

import {useRecoilValue} from 'recoil';
import {backendUrlState, tokenState} from '../atoms/settingsState';

export const initialState = {activeMessages: []};
export const ERROR = 'APP/MESSAGES/ERROR';
export const WARN = 'APP/MESSAGES/WARN';
export const showError = (message) => ({type: ERROR, text: message});
export const showWarn = (message) => ({type: WARN, text: message});
export const messageReducer = (state = initialState, action) => {
    if (action.type === ERROR) {
        return {
            ...state,
            activeMessages: state.activeMessages.concat({
                text: action.text,
                level: 'error',
            }),
        };
    }
    if (action.type === WARN) {
        return {
            ...state,
            activeMessages: state.activeMessages.concat({
                text: action.text,
                level: 'warn',
            }),
        };
    }
    return {...state};
};

function fetchWarnings(backendURL, token) {
    return fetch(`${backendURL}/control/warnings`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    }).then((r) => {
        if (r.ok) {
            return r.json();
        }
        throw new Error(r.statusText);
    });
}

function unpackMessageFromBackend(message) {
    if (message.reason.value === 'FAILURE') {
        return {
            type: ERROR,
            text: `The program contains a rule that will cause false behaviour! Remove/Rephrase the following rule: ${message.ast}`,
        };
    }
    if (message.reason.value === 'relaxer') {
        return {
            type: WARN,
            text: message.message,
        };
    }
    return {
        type: WARN,
        text: `The program contains a rule that is not supported! The graph shown might be faulty! ${message.ast}`,
    };
}

const UserMessagesContext = React.createContext([]);
export const useMessages = () => React.useContext(UserMessagesContext);
export const UserMessagesProvider = ({children}) => {
    const [state, dispatch] = React.useReducer(messageReducer, initialState);
    const backendUrl = useRecoilValue(backendUrlState);
    const backendUrlRef = React.useRef(backendUrl);
    const token = useRecoilValue(tokenState);
    React.useEffect(() => {
        let mounted = true;
        fetchWarnings(backendUrlRef.current, token)
            .catch((error) => {
                showError(`Failed to get transformations: ${error}`);
            })
            .then((items) => {
                if (mounted) {
                    items
                        .map((e) => unpackMessageFromBackend(e))
                        .map((e) => dispatch(e));
                }
            });
        return () => (mounted = false);
    }, []);

    return (
        <UserMessagesContext.Provider value={[state, dispatch]}>
            {children}
        </UserMessagesContext.Provider>
    );
};

UserMessagesProvider.propTypes = {
    /**
     * The subtree that requires access to this context.
     */
    children: PropTypes.element,
};
