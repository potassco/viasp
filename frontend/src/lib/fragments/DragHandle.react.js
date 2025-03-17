import React, {Suspense} from 'react';
import PropTypes from 'prop-types';
import {IconWrapper} from '../LazyLoader';
import {styled} from 'styled-components';
import {useRecoilValue} from 'recoil';
import {colorPaletteState} from '../atoms/settingsState';

const HandleDiv = styled.div`
    width: 20px;
    height: 20px;
    cursor: move;
    position: absolute;
    top: 0;
    left: 0;
`;

export function DragHandle(props) {
    const {handleName} = props;
    const colorPalette = useRecoilValue(colorPaletteState);
    
    return (
        <HandleDiv className={`${handleName} button`}>
            <Suspense fallback={<div>=</div>}>
                <IconWrapper
                    icon={'dragIndicator'}
                    hidden={false}
                    color={colorPalette.primary}
                />
            </Suspense>
        </HandleDiv>
    );

}

DragHandle.propTypes = {
    /**
     * The name of the handle to be displayed
     */
    handleName: PropTypes.string,
};