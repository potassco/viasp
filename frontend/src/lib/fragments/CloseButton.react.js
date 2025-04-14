import React from 'react';
import PropTypes from 'prop-types';
import { useRecoilValue } from 'recoil';
import {colorPaletteState} from '../atoms/settingsState';
import IconWrapper from './IconWrapper.react';
import { styled } from 'styled-components';

const CloseButtonDiv = styled.button`
    position: relative;
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center; 
    padding: 0;
    height: 1.5em; 
    width: 1.5em; 
`;
export function CloseButton(props) {
    const {onClose} = props;
    const colorPalette = useRecoilValue(colorPaletteState);

    return (
        <CloseButtonDiv onClick={onClose} className="close button">
            <IconWrapper
                icon="close"
                height="1.5em"
                color={colorPalette.primary}
                className="close"
            />
        </ CloseButtonDiv>
    );
}

CloseButton.propTypes = {
    /**
     * The function to call when the close button is clicked.
     */
    onClose: PropTypes.func,
};
