import {atom} from 'recoil';

const defaultBackendURLState = 'http://localhost:5050';

export const backendURLState = atom({
    key: 'backendURL',
    default: defaultBackendURLState
})