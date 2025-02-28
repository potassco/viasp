import {styled} from 'styled-components';


export const BranchSpaceDiv = styled.div`
    display: flex;
    justify-content: center;
    overflow: hidden;
    max-width: 75%;
    flex: 0 0 ${({$spaceMultiplier}) => $spaceMultiplier*100}%;
`;