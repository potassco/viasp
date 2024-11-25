import React, {createContext, useContext, useState} from 'react';
import PropTypes from 'prop-types';

const SearchUserInputContext = createContext();

export const SearchUserInputProvider = ({children}) => {
    const [searchUserInput, setSearchUserInput] = useState('');
    return (
        <SearchUserInputContext.Provider
            value={[searchUserInput, setSearchUserInput]}
        >
            {children}
        </SearchUserInputContext.Provider>
    );
};

SearchUserInputProvider.propTypes = {
    /**
     * The subtree that requires access to this context.
     */
    children: PropTypes.element,
};

export const useSearchUserInput = () => {
    return useContext(SearchUserInputContext);
};
