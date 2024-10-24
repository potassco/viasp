/* eslint no-magic-numbers: 0 */
import React from 'react';
import colorPaletteData from '../../../backend/src/viasp/server/colorPalette.json';

import { ViaspDash } from '../lib';

const App = () => {
    const backend_url = "http://localhost:5050";
    const [clickedOn, setClickedOn] = React.useState(null);
    return (
        <div>
            <ViaspDash
                id="myID"
                backendURL={backend_url}
                setProps={setClickedOn}
                colorPalette={colorPaletteData.colorThemes.blue}
            />
        </div>
    );
};


export default App;