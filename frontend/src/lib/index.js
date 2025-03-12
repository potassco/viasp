/* eslint-disable import/prefer-default-export */
import ViaspDash from './main/ViaspDash.react';
import React from 'react';
import ReactDOM from 'react-dom';

const colorPalette = window.colorTheme;
const config = window.config;
const backendURL = window.backendURL;

ReactDOM.render(
    <ViaspDash
        id={'viasp-react'}
        backendURL={backendURL}
        setProps={() => {}}
        colorPalette={colorPalette}
        config={config}
    />,
    document.getElementById('root')
);

if (module.hot) {
    module.hot.accept('./main/ViaspDash.react', () => {
        const NextApp = require('./main/ViaspDash.react').default;
        ReactDOM.render(
            <NextApp
                id={'viasp-react'}
                backendURL={backendURL}
                setProps={() => {}}
                colorPalette={colorPalette}
                config={config}
            />,
            document.getElementById('root')
        )
    });
}
