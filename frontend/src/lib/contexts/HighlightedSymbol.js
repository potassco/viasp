import React from "react";
import PropTypes from "prop-types";
import { useSettings } from "./Settings";
import { useColorPalette } from "../contexts/ColorPalette";
import { useMessages, showError } from "./UserMessages";
import { Constants } from "../constants";
import {
    useTransformations,
    toggleExplanationHighlightedSymbol,
} from './transformations';

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
// HighlightedSymbol { src: string, tgt: string, srcNode: string, color: string }
const defaultSearchResultHighlightedSymbol = [];
// SearchResultHighlightedSymbol { node_id: string, symbol_id: string, color: string, recent: boolean }
const defaultHighlightedRule = []; 
// HighlightedRule { rule_hash: string, color: string, source_id: string }

const HighlightedSymbolContext = React.createContext(defaultHighlightedSymbol);

export const useHighlightedSymbol = () => React.useContext(HighlightedSymbolContext);
export const HighlightedSymbolProvider = ({ children }) => {
    const [highlightedSymbol, setHighlightedSymbol] = React.useState(
        defaultHighlightedSymbol
    );
    const [searchResultHighlightedSymbol, setSearchResultHighlightedSymbol] =
        React.useState(defaultSearchResultHighlightedSymbol);
    const [highlightedRule, setHighlightedRule] = React.useState(
        defaultHighlightedRule
    );
    const [backgroundHighlightColor, setBackgroundHighlightColor] = React.useState({});
    const [ruleDotHighlightColor, setRuleDotHighlightColor] =
        React.useState({});
    const colorPalette = useColorPalette();
    const {dispatch: dispatchT} = useTransformations();
    const colorArray = colorPalette.explanationHighlights;
    const [, message_dispatch] = useMessages();
    const messageDispatchRef = React.useRef(message_dispatch);

    const {backendURL} = useSettings();
    const backendUrlRef = React.useRef(backendURL);

    const getNextColor = React.useCallback(
        (currentHighlightedSymbol, currentSearchResultHighlightedSymbol) => {
            const arrayOfAllHighlights = []
            const colorCounter = {};
            colorArray.forEach((i) => (colorCounter[i] = 0));

            currentHighlightedSymbol.forEach((item) => {
                arrayOfAllHighlights.push({
                    src: item.src,
                    tgt: item.tgt,
                    srcNode: item.srcNode,
                    color: item.color,
                });
            });
            currentSearchResultHighlightedSymbol.forEach((item) => {
                arrayOfAllHighlights.push({
                    src: item.symbol_id,
                    tgt: null,
                    srcNode: item.node_id,
                    color: item.color,
                });
            });

            const distinctExplanationsColors = arrayOfAllHighlights.reduce(
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
            return leastOccuringColor;
        },
        [colorArray]
    );

    const toggleHighlightedSymbol = React.useCallback(
        (arrows, currentHighlightedSymbol, currentSearchResultHighlightedSymbol) => {
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
            var c = `${getNextColor(
                currentHighlightedSymbol,
                currentSearchResultHighlightedSymbol
            )}`;

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
        (
            source_id,
            rule_hash,
            color,
            currentHighlightedRule,
            currentBackgroundHighlightColors,
            currentRuleDotHighlightColor
        ) => {
            var rulesSrcColor = [];
            var backgroundHighlightColor = currentBackgroundHighlightColors;
            var ruleDotHighlightColor = currentRuleDotHighlightColor;
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

                var new_ruleDotHighlightColorObject = {
                    color: color, 
                    markedForDeletion: false,
                    markedForInsertion: true
                };
                if (
                    ruleDotHighlightColor[rule_hash] &&
                    ruleDotHighlightColor[rule_hash].length >= 0
                ) {
                    ruleDotHighlightColor[rule_hash].push(new_ruleDotHighlightColorObject);
                } else {
                    ruleDotHighlightColor[rule_hash] = [new_ruleDotHighlightColorObject];
                }
            } else {
                rulesSrcColor.splice(index, 1);
                if (backgroundHighlightColor[rule_hash]) {
                    delete backgroundHighlightColor[rule_hash];
                }
                if (ruleDotHighlightColor[rule_hash]) {
                    ruleDotHighlightColor[rule_hash] = ruleDotHighlightColor[
                        rule_hash
                    ].map((item) => {
                        if (item.color === color) {
                            item.markedForDeletion = true;
                            item.markedForInsertion = false;
                        }
                        return item;
                    });
                }
            }
            setHighlightedRule(rulesSrcColor.map((item) => JSON.parse(item)));
            setRuleDotHighlightColor(ruleDotHighlightColor);
            setBackgroundHighlightColor(backgroundHighlightColor);
            setTimeout(() => {
                setBackgroundHighlightColor((prev) => {
                    var new_backgroundHighlightColor = {...prev};
                    if (new_backgroundHighlightColor[rule_hash]) {
                        delete new_backgroundHighlightColor[rule_hash];
                    }
                    return new_backgroundHighlightColor;
                });
            }, Constants.ruleHighlightDuration);
        },
        [setHighlightedRule, setBackgroundHighlightColor, setRuleDotHighlightColor]
    );

    const getNextHoverColor = React.useCallback(
        (
            currentHighlightedSymbol,
            currentSearchResultHighlightedSymbol, 
            symbol
        ) => {
            const searchSymbolSourceIndex = currentHighlightedSymbol
                .map((item) => item.src)
                .indexOf(symbol);
            if (searchSymbolSourceIndex !== -1) {
                return {
                    backgroundColor:
                        currentHighlightedSymbol[searchSymbolSourceIndex].color,
                };
            }
            const g = getNextColor(
                currentHighlightedSymbol,
                currentSearchResultHighlightedSymbol
            );
            return {backgroundColor: g};
        },
        [getNextColor]
    );

    const toggleReasonOf = React.useCallback(
        (
            sourceid,
            nodeId,
            currentHighlightedSymbol,
            currentSearchResultHighlightedSymbol,
            currentHighlightedRule,
            currentBackgroundHighlightColors,
            currentRuleDotHighlightColor,
        ) => {
            fetchReasonOf(backendUrlRef.current, sourceid, nodeId)
                .then((res) => {
                    const reasons = res.symbols;
                    const rule_hash = res.rule;

                    var new_color = null;
                    if (reasons.every((tgt) => tgt !== null)) {
                        new_color = toggleHighlightedSymbol(
                            reasons,
                            currentHighlightedSymbol,
                            currentSearchResultHighlightedSymbol
                        );
                    }
                    if (rule_hash !== '') {
                        toggleHighlightedRule(
                            sourceid,
                            rule_hash,
                            new_color,
                            currentHighlightedRule,
                            currentBackgroundHighlightColors,
                            currentRuleDotHighlightColor
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

    const setSearchResultSymbolHighlight = React.useCallback(
        (
            symbolid,
            nodeid,
            currentHighlightedSymbol,
            currentSearchResultHighlightedSymbol,
        ) => {
            var symbolColor = [];
            currentSearchResultHighlightedSymbol.forEach((item) => {
                symbolColor.push(
                    JSON.stringify({
                        symbolid: item.symbol_id,
                        nodeid: item.node_id,
                        color: item.color,
                        recent: item.recent,
                    })
                );
            });

            var c = `${getNextColor(currentHighlightedSymbol, currentSearchResultHighlightedSymbol)}`;

            var value = JSON.stringify({
                symbol_id: symbolid, 
                node_id: nodeid, 
                color: c, 
                recent: true
            });
            var index = symbolColor.indexOf(value);
            if (index === -1) {
                symbolColor.push(value);
            } else {
                symbolColor.splice(index, 1);
            }
            setSearchResultHighlightedSymbol(symbolColor.map(
                (item) => JSON.parse(item)
            ));
            setTimeout(() => {
                setSearchResultHighlightedSymbol((prev) => {
                    var new_searchResultHighlightedSymbol = [...prev];
                    var thisSearchResultHighlightedSymbol =
                        new_searchResultHighlightedSymbol.find(
                            (item) =>
                                item.symbol_id === symbolid &&
                                item.node_id === nodeid
                        );
                    
                    if (thisSearchResultHighlightedSymbol && thisSearchResultHighlightedSymbol.recent) {
                        thisSearchResultHighlightedSymbol.recent = false;
                    }
                    return new_searchResultHighlightedSymbol;
                });
            }, Constants.searchResultHighlightDuration);
        },
        [setSearchResultHighlightedSymbol, getNextColor]
    );

    const clearHighlightedSymbol = React.useCallback(() => {
        setHighlightedSymbol([]);
        setHighlightedRule([]);
        setBackgroundHighlightColor({});
        setRuleDotHighlightColor({});
    }, [setHighlightedSymbol, setHighlightedRule, setBackgroundHighlightColor]);

    const unmarkInsertedSymbolHighlightDot = React.useCallback(
        (hash, ruleDotHighlightColor, currentRuleDotHighlightColor) => {
            if (currentRuleDotHighlightColor[hash]) {
                currentRuleDotHighlightColor[hash] =
                    currentRuleDotHighlightColor[hash].map((item) => {
                        if (
                            item.color === ruleDotHighlightColor &&
                            item.markedForInsertion
                        ) {
                            item.markedForInsertion = false;
                        }
                        return item;
                    });
            }
            setRuleDotHighlightColor(currentRuleDotHighlightColor);
        },
        [setRuleDotHighlightColor]
    );

    const removeDeletedSymbolHighlightDot = React.useCallback(
        (hash, ruleDotHighlightColor, currentRuleDotHighlightColor) => {
            if (currentRuleDotHighlightColor[hash]) {
                currentRuleDotHighlightColor[hash] =
                    currentRuleDotHighlightColor[hash].filter(item => (
                        !(item.color === ruleDotHighlightColor && item.markedForDeletion)
                    ));
            }
            setRuleDotHighlightColor(currentRuleDotHighlightColor);
        },
        [setRuleDotHighlightColor]
    );

    return (
        <HighlightedSymbolContext.Provider
            value={{
                highlightedSymbol,
                searchResultHighlightedSymbol,
                toggleHighlightedSymbol,
                clearHighlightedSymbol,
                highlightedRule,
                backgroundHighlightColor,
                ruleDotHighlightColor,
                toggleReasonOf,
                setSearchResultSymbolHighlight,
                getNextHoverColor,
                unmarkInsertedSymbolHighlightDot,
                removeDeletedSymbolHighlightDot,
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
