import {styled} from "styled-components";
import {pulsate} from "./Symbol.style";

export const MiniNodeSpan = styled.span`
    background-color: ${({$colorPalette}) => $colorPalette.primary};
    color: ${({$colorPalette}) => $colorPalette.primary};
    display: flex;
    border-radius: 0.3em;
    border: 1pt solid;
    margin: 12pt 3% 12pt 3%;
    position: relative;
    width: 0.57em;
    height: 0.57em;
    ${(props) => (props.$pulsate ? pulsate(props.$pulsatingColor) : '')};

    &:hover {
        transition: drop-shadow 0.1s;
        filter: drop-shadow(0 0 0.14em #333);
    }
`;


export const NodeDiv = styled.div`
    background-color: ${({$colorPalette}) => $colorPalette.light};
    color: ${({$colorPalette}) => $colorPalette.primary};
    
    border-radius: 0.7em;
    border: 1pt solid;
    margin: 12pt 3% 12pt 3%;
    position: relative;
    height: max-content;
    overflow: hidden;

    &:hover {
        transition: drop-shadow 0.1s;
        filter: drop-shadow(0 0 0.14em #333);
    }
`;

export const SuperNodeDiv = styled(NodeDiv)`
    background-color: transparent;
    &:hover {
        filter: none;
    }
`;

export const SetValueSpan = styled.span`
    width: fit-content;
    margin: 0.38em 1em 0.38em 1em;

    position: relative;
    flex: 0 0 auto;
    display: flex;
    flex-flow: row wrap;
    justify-content: center;
    align-items: center;

    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
`;

export const SetContainerDiv = styled.div`
    width: fit-content;
    position: relative;
    line-height: 18pt;
    min-height: 18pt;
    cursor: pointer;

    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    color: ${({$colorPalette}) => $colorPalette.dark};
`;

export const RecursionButtonDiv = styled.div`
    position: absolute;
    right: 0;
    top: 0;

    &:hover {
        box-shadow:
            0 0.28em 0.57em 0 rgba(0, 0, 0, 0.2),
            0 0.43em 0.71em 0 rgba(0, 0, 0, 0.2);
        transition: 0.3s ease-in-out;
        -moz-transition: 0.3s ease-in-out;
        -webkit-transition: 0.3s ease-in-out;
    }
`
export const RecursionButtonTextDiv = styled.div`
    cursor: pointer;
    font-size: 1pt;
    font-weight: bold;
    border-radius: 0em 0.57em 0em 0.28em;
    padding: 1px;
    vertical-align: middle;
    text-align: center;
    width: auto;

    background-color: ${({$colorPalette}) => $colorPalette.primary};
    color: ${({$colorPalette}) => $colorPalette.light};
`;