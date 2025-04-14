import {styled} from 'styled-components';

const MODALWIDTH = 220;
const MODALDISTANCETOEDGE = 60;
export function calculateAdjustedPosition(spawnPosition) {
    return {
        top: spawnPosition.top,
        left: Math.min(
        spawnPosition.left,
        window.innerWidth - MODALWIDTH - MODALDISTANCETOEDGE
        ),
    };
};
export const ModalDiv = styled.div`
    top: ${(props) => props.$position.top}px;
    left: ${(props) => props.$position.left}px;
    width: ${MODALWIDTH}px;

    position: absolute;
    background-color: white;
    border: 3pt solid;
    border-radius: 0.7em;
    padding: 10px;
    z-index: 1000;
    line-break: anywhere;

    background-color: ${({$colorPalette}) => $colorPalette.light};
    color: ${({$colorPalette}) => $colorPalette.dark};
    border-color: ${({$colorPalette}) => $colorPalette.primary};

    margin: 12pt 3% 12pt 3%;

    &:hover {
        transition: drop-shadow 0.1s;
        filter: drop-shadow(0 0 0.14em #333);

        .button {
            display: flex;
        }
    }

    .button {
        display: none;
    }
`;

export const StyledList = styled.ul`
    list-style-type: none;
    padding: 0;
    margin: 0;
`;

export const StyledListItem = styled.li`
    background-color: ${({$colorPalette}) => $colorPalette.light};
    color: ${({$colorPalette}) => $colorPalette.dark};
    padding: 5px 0px 5px 15px;
    margin: 5px 5px;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
`;

export const ModalHeaderDiv = styled.div`
    color: ${({$colorPalette}) => $colorPalette.primary};
    font-weight: bold;
    margin: 1px 1px;
    display: flex;
    border-radius: 7pt;
    padding: 1pt 2pt;
    min-height: 0;
    width: fit-content;
    width: -moz-fit-content;
`;

export const ModalHeaderSpan = styled.span`
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
`;
