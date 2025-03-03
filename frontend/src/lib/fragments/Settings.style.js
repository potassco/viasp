import {styled} from 'styled-components';
import {darken} from 'polished';
import {Constants} from '../constants';

export const SettingsDiv = styled.div`
    white-space: nowrap;
    float: right;
    display: flow-root;
    position: absolute;
    z-index: 10;
    right: 0;
    top: 0;
    margin-right: 1em;
    margin-top: 1.2em;
    /* width: 10%; */
    max-width: 40em;
    min-width: 7em;
`;

export const ClearMarkedDiv = styled.div`
    display: flex;
    justify-content: end;
`;

export const ClearMarkedSpan = styled.span`
    background: ${({$colorPalette}) => $colorPalette.primary};
    color: ${({$colorPalette}) => $colorPalette.light};
    padding: 0.7em 0.9em;
    font-family: monospace;
    border-radius: 0.7em;
    z-index: 20;
    cursor: pointer;

    &:hover {
        background: ${({$colorPalette}) =>
            darken(Constants.hoverColorDarkenFactor, $colorPalette.primary)};
    }

    &:active {
        background: ${({$colorPalette}) => $colorPalette.infoBackground};
    }

    &.fade-enter {
        opacity: 0;
    }
    &.fade-enter-active {
        opacity: 1;
        transition: opacity 0.8s;
    }
    &.fade-exit {
        opacity: 1;
    }
    &.fade-exit-active {
        opacity: 0;
        transition: opacity 0.8s;
    }
`;

export const DrawerDiv = styled.div`
    font-family: sans-serif;
    height: fit-content;
`;

export const DrawerContentDiv = styled.div`
    max-width: 500px;
    padding-top: 0.1em;
    padding-bottom: 0.1em;
`;