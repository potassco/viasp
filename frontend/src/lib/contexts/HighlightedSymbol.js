import React from "react";
import PropTypes from "prop-types";
import { useSettings } from "./Settings";
import { useColorPalette } from "../contexts/ColorPalette";
import { useMessages, showError } from "./UserMessages";

function fetchReasonOf(backendURL, sourceId, nodeId) {
    return fetch(`${backendURL("graph/reason")}`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({"sourceid": sourceId, "nodeid": nodeId})
    }).then(r => {
        if (!r.ok) {
            throw new Error(`${r.status} ${r.statusText}`);
        }
        return r.json()
    });
}
const defaultHighlightedSymbol = [];

const HighlightedSymbolContext = React.createContext(defaultHighlightedSymbol);

export const useHighlightedSymbol = () => React.useContext(HighlightedSymbolContext);
export const HighlightedSymbolProvider = ({ children }) => {
    const [highlightedSymbol, setHighlightedSymbol] = React.useState(defaultHighlightedSymbol);
    const colorPalette = useColorPalette();
    const colorArray = Object.values(colorPalette.explanationHighlights);
    const [, message_dispatch] = useMessages()
    const messageDispatchRef = React.useRef(message_dispatch);


    const {backendURL} = useSettings();
    const backendUrlRef = React.useRef(backendURL);

    const getNextColor = React.useCallback(
        (currentHighlightedSymbol) => {
            const colorCounter = {};
            colorArray.forEach((i) => (colorCounter[i] = 0));

            const distinctExplanationsColors = currentHighlightedSymbol.reduce(
                (acc, item) => {
                    const key = `${item.src}-${item.color}`;
                    if (!acc.some((i) => `${i.src}-${i.color}` === key)) {
                        acc.push(item);
                    }
                    return acc;
                },
                []
            );
            distinctExplanationsColors.forEach((item) => {
                colorCounter[item.color] = colorCounter[item.color] + 1;
            });

            let leastOccurences = Infinity;
            let leastOccuringColor = '';
            colorArray.forEach((color) => {
                if (colorCounter[color] < leastOccurences) {
                    leastOccurences = colorCounter[color];
                    leastOccuringColor = color;
                }
            });
            return leastOccuringColor
        },
        [colorArray]
    );

    const toggleHighlightedSymbol = React.useCallback(
        (arrows, currentHighlightedSymbol) => {
            var arrowsSrcTgt = [];
            var arrowsColors = [];
            currentHighlightedSymbol.forEach((item) => {
                arrowsSrcTgt.push(
                    JSON.stringify({
                        src: item.src,
                        tgt: item.tgt,
                        srcNode: item.srcNode,
                    })
                );
                arrowsColors.push(item.color);
            });
            const c = `${getNextColor(currentHighlightedSymbol)}`;

            arrows.forEach((a) => {
                var value = JSON.stringify(a);
                var index = arrowsSrcTgt.indexOf(value);
                if (index === -1) {
                    arrowsSrcTgt.push(JSON.stringify(a));
                    arrowsColors.push(c);
                } else {
                    arrowsSrcTgt.splice(index, 1);
                    arrowsColors.splice(index, 1);
                }
            });
            setHighlightedSymbol(
                arrowsSrcTgt.map((item, i) => {
                    var obj = JSON.parse(item);
                    obj.color = arrowsColors[i];
                    return obj;
                })
            );
        },
        [setHighlightedSymbol, getNextColor]
    );

    const getNextHoverColor = React.useCallback(
        (currentHighlightedSymbol, symbol) => {
            const searchSymbolSourceIndex = currentHighlightedSymbol
                .map((item) => item.src)
                .indexOf(symbol);
            if (searchSymbolSourceIndex !== -1) {
                return {backgroundColor: currentHighlightedSymbol[searchSymbolSourceIndex].color};
            }
            const g = getNextColor(currentHighlightedSymbol);
            return {backgroundColor: g};
        },
        [getNextColor]
    );


    const toggleReasonOf = React.useCallback((sourceid, nodeId, currentHighlightedSymbol) => {
        fetchReasonOf(backendUrlRef.current, sourceid, nodeId).then(reasons => {
            if (reasons.every(tgt => tgt !== null)) {
                toggleHighlightedSymbol(reasons, currentHighlightedSymbol);
            }})
            .catch((error) => {
                messageDispatchRef.current(
                    showError(`Failed to get reason: ${error}`)
                )
            });
    }, [messageDispatchRef, toggleHighlightedSymbol]);

    return (
        <HighlightedSymbolContext.Provider
            value={{
                highlightedSymbol,
                toggleHighlightedSymbol,
                setHighlightedSymbol,
                toggleReasonOf,
                getNextHoverColor,
            }}
        >
            {children}
        </HighlightedSymbolContext.Provider>
    );
}

HighlightedSymbolProvider.propTypes = {
    /**
     * The subtree that requires access to this context.
     */
    children: PropTypes.element,
}
