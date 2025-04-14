import { styled, css, keyframes } from 'styled-components';
import { Constants } from '../constants';

const msInSecond = 1000;
export const pulsateElementKeyframes = ($pulsatingColor) => keyframes`
    0% {
        box-shadow: 0 0 0 0 ${$pulsatingColor};
    }

    100% {
        box-shadow: 0 0 0 1em rgba(0, 0, 0, 0);
    }
`;

export const pulsate = ($pulsatingColor) => css`
    animation: ${pulsateElementKeyframes($pulsatingColor)} 1s ${Constants.searchResultHighlightDuration / msInSecond};
`;

export const SymbolElementSpan = styled.span`
    margin: 1px 1px;
    display: flex;
    border-radius: 7pt;
    background: ${(props) => props.$backgroundColor};
    padding: 1pt 2pt;
    min-height: 0;
    width: fit-content;
    width: -moz-fit-content;
    ${(props) => (props.$pulsate ? pulsate(props.$pulsatingColor) : '')};
    ${(props) => (props.$hasReason ?
        '&:hover {background-color: var(--hover-color);}' : '')};
`;
