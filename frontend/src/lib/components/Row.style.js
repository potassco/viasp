import {styled} from 'styled-components';
import {Constants} from '../constants';

export const RowSignalContainerDiv = styled.div`
    position: relative;
    max-height: 100%;
    opacity: 1;
    transform: ${({$scale}) => `scale(${$scale})`}; 
    transform-origin: left;
    box-shadow: rgba(0, 0, 0, 0.3) 0px ${({$shadow}) => $shadow}px 
        ${({$shadow}) => 2 * $shadow}px 0px;
    background: ${({$background}) => $background};,
`;

export const RowContainerDiv = styled.div`
    opacity: ${(props) =>
        props.$draggedRowCanBeDroppedHere
            ? 1
            : 1 - Constants.opacityMultiplier};
    transition: opacity 0.5s ease-out;
    justify-content: space-around;
    background: transparent;
    padding-top: 1em;
`;

export const RowRowDiv = styled.div`
    display: flex;
    justify-content: space-around;
    align-content: center;
    background: ${({$background}) => $background};
    overflow: hidden;


    width: ${({$onlyOneNode, $scale}) => ($onlyOneNode ? 100 : $scale*100)}%;
    transform: translateX(${({$onlyOneNode, $translation}) => ($onlyOneNode ? 0 : $translation)}px);
    padding-bottom: ${({$isConstraintsOnly}) => ($isConstraintsOnly ? '2em' : '0')};
`;