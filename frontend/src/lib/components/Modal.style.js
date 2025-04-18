import {styled} from 'styled-components';
import {emToPixel} from '../utils';

const MODALWIDTH = 220;
const MODALPADDING = 10;
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
    width: ${MODALWIDTH}px;

    position: absolute;
    border: 3pt solid;
    border-radius: 0.7em;
    padding: ${MODALPADDING}px;
    z-index: 1000;
    line-break: anywhere;

    background-color: ${({$colorPalette}) => $colorPalette.light};
    color: ${({$colorPalette}) => $colorPalette.dark};
    border-color: ${({$colorPalette}) => $colorPalette.primary};

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

export const AggregateValueDiv = styled.span`
    color: ${({$colorPalette}) => $colorPalette.primary};
    font-weight: bold;
`;

export function calculateModalPosition(modalVisible, nodeId, supernodeId, contentDiv) {
    if (!modalVisible) {
        return null;
    }
    let rect = {}

    const supernodeElement = document.getElementById(supernodeId);
    const nodeElement = document.getElementById(nodeId);
    if (nodeElement !== null) {
        rect = nodeElement.getBoundingClientRect();
    } else if (supernodeElement !== null) {
        rect = supernodeElement.getBoundingClientRect();
    } else {
        return null;
    }
    const scrollY = contentDiv.current.scrollTop;

    
    const margin = emToPixel(1);
    const viewportWidth = window.innerWidth;
    const totalModalWidth = MODALWIDTH + 2 * MODALPADDING + margin;
    const hasSpaceOnRight = rect.right + totalModalWidth < viewportWidth;
    const hasSpaceOnLeft = rect.left > totalModalWidth;

    const newPosition = {};
    console.log({scrollY});

    if (hasSpaceOnRight) {
        newPosition.x = rect.right + margin;
        newPosition.y = rect.top + rect.height / 2 - 100 + scrollY;
    } else if (hasSpaceOnLeft) {
        newPosition.x = rect.left - totalModalWidth;
        newPosition.y = rect.top + rect.height / 2 - 100 + scrollY;
    } else {
        // Position below the node, horizontally centered
        newPosition.x = Math.max(
            margin,
            rect.left + rect.width / 2 - totalModalWidth / 2
        );
        // Make sure it doesn't go off-screen to the right
        newPosition.x = Math.min(
            newPosition.x,
            viewportWidth - totalModalWidth - margin
        );
        newPosition.y = rect.bottom + margin + scrollY;
    }
    return newPosition;
}