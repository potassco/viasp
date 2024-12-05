import React, {createContext, useContext, useRef} from 'react';
import PropTypes from 'prop-types';

const ContentDivContext = createContext();

export const ContentDivProvider = ({children}) => {
    const contentDivRef = useRef(null);
    return (
        <ContentDivContext.Provider value={contentDivRef}>
            {children}
        </ContentDivContext.Provider>
    );
};

ContentDivProvider.propTypes = {
    /**
     * The subtree that requires access to this context.
     */
    children: PropTypes.element,
};

export const useContentDiv = () => {
    return useContext(ContentDivContext);
};
