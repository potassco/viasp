import React from "react";
import PropTypes from "prop-types";
import { useSettings } from "./Settings";
import { useColorPalette } from "../contexts/ColorPalette";
import { useMessages, showError } from "./UserMessages";
import * as Constants from "../constants";

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
const defaultHighlightedRule = []; 
// HighlightedRule { rule_hash: string, color: string, source_id: string }

const HighlightedSymbolContext = React.createContext(defaultHighlightedSymbol);

export const useHighlightedSymbol = () => React.useContext(HighlightedSymbolContext);
export const HighlightedSymbolProvider = ({ children }) => {
    const [highlightedSymbol, setHighlightedSymbol] = React.useState(defaultHighlightedSymbol);
    const [highlightedRule, setHighlightedRule] = React.useState(
        defaultHighlightedRule
    );
    const [backgroundHighlightColor, setBackgroundHighlightColor] = React.useState({});
    const colorPalette = useColorPalette();
    const colorArray = colorPalette.explanationHighlights;
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
            var c = `${getNextColor(currentHighlightedSymbol)}`;

            arrows.forEach((a) => {
                var value = JSON.stringify(a);
                var index = arrowsSrcTgt.indexOf(value);
                if (index === -1) {
                    arrowsSrcTgt.push(JSON.stringify(a));
                    arrowsColors.push(c);
                } else {
                    arrowsSrcTgt.splice(index, 1);
                    c = arrowsColors.splice(index, 1)[0];
                }
            });
            setHighlightedSymbol(
                arrowsSrcTgt.map((item, i) => {
                    var obj = JSON.parse(item);
                    obj.color = arrowsColors[i];
                    return obj;
                })
            );
            return c;
        },
        [setHighlightedSymbol, getNextColor]
    );

    const toggleHighlightedRule = React.useCallback(
        (source_id, rule_hash, color, currentHighlightedRule, currentBackgroundHighlightColors) => {
            var rulesSrcColor = [];
            var backgroundHighlightColor = currentBackgroundHighlightColors;
            currentHighlightedRule.forEach((item) => {
                rulesSrcColor.push(
                    JSON.stringify({
                        rule_hash: item.rule_hash,
                        color: item.color,
                        source_id: item.source_id,
                    })
                );
            });
            


            var value = JSON.stringify({rule_hash, color, source_id});
            var index = rulesSrcColor.indexOf(value);
            if (index === -1) {
                rulesSrcColor.push(value);
                backgroundHighlightColor[rule_hash] = color;
            } else {
                rulesSrcColor.splice(index, 1);
                if (Object.hasOwn(backgroundHighlightColor, rule_hash)) {
                    delete backgroundHighlightColor[rule_hash];
                }
            }
            setHighlightedRule(rulesSrcColor.map((item) => JSON.parse(item)));
            setBackgroundHighlightColor(backgroundHighlightColor);
            setTimeout(() => {
                setBackgroundHighlightColor((prev) => {
                    var new_backgroundHighlightColor = {...prev};
                    if (
                        Object.hasOwn(new_backgroundHighlightColor, rule_hash)
                    ) {
                        delete new_backgroundHighlightColor[rule_hash];
                    }
                    return new_backgroundHighlightColor;
                });
            }, Constants.ruleHighlightDuration);
        },
        [setHighlightedRule, setBackgroundHighlightColor]
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


    const toggleReasonOf = React.useCallback(
        (
            sourceid,
            nodeId,
            currentHighlightedSymbol,
            currentHighlightedRule,
            currentBackgroundHighlightColors
        ) => {
            fetchReasonOf(backendUrlRef.current, sourceid, nodeId)
                .then((res) => {
                    const reasons = res.symbols;
                    const rule_hash = res.rule;

                    var new_color = null;
                    if (reasons.every((tgt) => tgt !== null)) {
                        new_color = toggleHighlightedSymbol(
                            reasons,
                            currentHighlightedSymbol
                        );
                    }
                    if (rule_hash !== "") {
                        toggleHighlightedRule(
                            sourceid,
                            rule_hash,
                            new_color,
                            currentHighlightedRule,
                            currentBackgroundHighlightColors
                        );
                    }
                })
                .catch((error) => {
                    messageDispatchRef.current(
                        showError(`Failed to get reason: ${error}`)
                    );
                });
        },
        [messageDispatchRef, toggleHighlightedSymbol, toggleHighlightedRule]
    );

    const clearHighlightedSymbol = React.useCallback(() => {
        setHighlightedSymbol([]);
        setHighlightedRule([]);
        setBackgroundHighlightColor({});
    }, [setHighlightedSymbol, setHighlightedRule, setBackgroundHighlightColor]);

    return (
        <HighlightedSymbolContext.Provider
            value={{
                highlightedSymbol,
                toggleHighlightedSymbol,
                clearHighlightedSymbol,
                highlightedRule,
                backgroundHighlightColor,
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
