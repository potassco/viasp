import {styled} from 'styled-components';
import {darken} from 'polished';
import {Constants} from '../constants';

export const SearchInput = styled.input`
    color: ${(props) => props.$colorPalette.light};
    background-color: ${({$colorPalette}) =>
            $colorPalette.primary};

    width: 100%;
    border-radius: 0.4em;
    padding: 0.7em 3em 0.7em 0.8em;
    border: 0px;

    &:focus {
        outline: none;
    }

    &:hover {
        background-color: ${({$colorPalette}) =>
            darken(Constants.hoverColorDarkenFactor, $colorPalette.primary)};
    }
`;

export const SearchInputContainerDiv = styled.div`
    justify-content: end;
    align-items: center;
    display: flex;
`;

export const SearchBarDiv = styled.div`
    width: ${(props) => props.$inputWidth}em;
    max-width: 90vw;
    position: relative;
`;

export const SearchDiv = styled.div`
    display: flex;
    justify-content: end;
`;