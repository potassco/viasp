import React from 'react';
import PropTypes from 'prop-types';
import { useRecoilValue } from 'recoil';
import {colorPaletteState} from '../atoms/settingsState';
import IconWrapper from './IconWrapper.react';
import { styled } from 'styled-components';

const CloseButtonDiv = styled.button`
    position: absolute;
    top: 0;
    right: 0;
    background: none;
    border: none;
    font-size: 16px;
    cursor: pointer;
`;

export function CloseButton(props) {
    const {onClose} = props;
    const colorPalette = useRecoilValue(colorPaletteState);

    return (
        <CloseButtonDiv onClick={onClose} className="close button">
            <IconWrapper
                icon="close"
                height="1em"
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
