import React from 'react';
import {make_atoms_string} from "../utils/index";
import './detail.css';
import PropTypes from "prop-types";
import {showError, useMessages} from '../contexts/UserMessages';
import { useShownDetail } from "../contexts/ShownDetail";
import {SIGNATURE, SYMBOL} from "../types/propTypes";
import {IoChevronDown, IoChevronForward, IoCloseSharp} from "react-icons/io5";
import { useRecoilValue } from "recoil";
import { backendUrlState, colorPaletteState, tokenState } from '../atoms/settingsState';


function DetailSymbolPill(props) {
    const {symbol} = props;
    const colorPalette = useRecoilValue(colorPaletteState);
    return <span className="detail_atom_view_content"
                 style={{
                     backgroundColor: colorPalette.light,
                     color: colorPalette.dark
                 }}>{make_atoms_string(symbol)}</span>

}

DetailSymbolPill.propTypes = {
    /**
     * The symbol to display.
     */
    symbol: SYMBOL
}


function DetailForSignature(props) {
    const {signature, symbols} = props;
    const [showChildren, setShowChildren] = React.useState(true);
    const openCloseSymbol = showChildren ? <IoChevronDown/> : <IoChevronForward/>
    return <div>
        <hr/>
        <h3 className="detail_atom_view_heading noselect"
            onClick={() => setShowChildren(!showChildren)}>{openCloseSymbol} {signature.name}/{signature.args}</h3>
        <hr/>
        <div className="detail_atom_view_content_container">
            {showChildren ? symbols.map(symbol => <DetailSymbolPill key={JSON.stringify(symbol)}
                                                                    symbol={symbol}/>) : null}</div>
    </div>
}

DetailForSignature.propTypes =
    {
        /**
         * The signature to display in the header
         */
        signature: SIGNATURE,
        /**
         * The atoms that should be shown for this exact signature
         */
        symbols: PropTypes.arrayOf(SYMBOL)
    }

function loadDataForDetail(backendURL, uuid, token) {
    return fetch(`${backendURL('detail')}/${uuid}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then((r) => {
            if (!r.ok) {
                throw new Error(
                    `${r.status} ${r.statusText}`
                );
            }
            return r.json();
        });
}

function CloseButton(props) {
    const {onClick} = props;
    return <span style={{'cursor': 'pointer'}} onClick={onClick}><IoCloseSharp size={20}/></span>
}

CloseButton.propTypes =
    {
        /**
         * The function to be called when the button is clicked.
         */
        onClick: PropTypes.func
    }

export function Detail() {
    const [data, setData] = React.useState(null);
    const [type, setType] = React.useState("Model");
    const backendUrl = useRecoilValue(backendUrlState);
    const [, message_dispatch] = useMessages();
    const backendURLRef = React.useRef(backendUrl);
    const messageDispatchRef = React.useRef(message_dispatch);
    const colorPalette = useRecoilValue(colorPaletteState);
    const { shownDetail: shows, setShownDetail } = useShownDetail();
    const clearDetail = () => setShownDetail(null);
    const {token} = tokenState;

    React.useEffect(() => {
        let mounted = true;
        if (shows !== null) {
            loadDataForDetail(backendURLRef.current, shows, token)
                .then(items => {
                    if (mounted) {
                        setData(items[1])
                        setType(items[0])

                    }
                })
                .catch((error) => { 
                    messageDispatchRef.current(
                        showError(`Failed to get stable model data ${error}`))
                });
        }
        return () => { mounted = false };
    }, [shows])

    return <div id="detailSidebar" style={{ backgroundColor: colorPalette.infoBackground, color: colorPalette.dark}}
                className={shows === null ? `detail`:`detail detail-open`}>
        <h3><CloseButton onClick={clearDetail}/>{type}</h3>
        {data===null ? 
            <div>Loading..</div> :
            data.map((resp) =>
            <DetailForSignature key={`${resp[0].name}/${resp[0].args}`} signature={resp[0]} symbols={resp[1]}
                                uuid={shows}/>)}
    </div>
}

Detail.propTypes = {}

export function getDetailOpenWidthRatio() {
    return parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
            '--detail-open-width'
        )
    ) / 100;
}