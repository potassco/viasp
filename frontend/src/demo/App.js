/* eslint no-magic-numbers: 0 */
import React, {StrictMode} from 'react';
import colorPaletteData from '../../viasp_dash/colorPalette.json';
import config from '../../viasp_dash/config.json';
import ViaspDash from '../lib/main/ViaspDash.react';


const App = () => {
    const backend_url = "http://localhost:5050";
    return (
        <StrictMode>
            <ViaspDash
                id="viasp-react"
                backendURL={backend_url}
                setProps={() => {}}
                colorPalette={colorPaletteData.colorThemes.blue}
                config={config}
            />
        </StrictMode>
    );
};


export default App;