import React, {useState, useRef} from 'react';
import {make_atoms_string, getNextHoverColor} from '../utils/index';
import './symbol.css';
import PropTypes from 'prop-types';
import {SYMBOLIDENTIFIER} from '../types/propTypes';
import {useTransformations} from '../contexts/transformations';
import {styled, keyframes, css} from 'styled-components';
import {useColorPalette} from '../contexts/ColorPalette';
import {useContentDiv} from '../contexts/ContentDivContext';
import {Constants} from '../constants';
import {useMessages, showError} from '../contexts/UserMessages';

import {useRecoilValue, useRecoilState, useSetRecoilState} from 'recoil';
import {backendURLState} from '../atoms/settingsState';
import {currentSortState} from '../atoms/currentSortState';
import {
    ruleBackgroundHighlightsByTransformationStateFamily,
    ruleDotHighlightsByTransformationStateFamily,
} from '../atoms/transformationsState';

const symbolPulsate = ($pulsatingColor) => keyframes`
    0% {
        box-shadow: 0 0 0 0 ${$pulsatingColor};
    }

    100% {
        box-shadow: 0 0 0 1em rgba(0, 0, 0, 0);
    }
`;

const pulsate = ($pulsatingColor) => css`
    animation: ${symbolPulsate($pulsatingColor)} 1s infinite;
`;

const SymbolElementSpan = styled.span`
    margin: 1px 1px;
    display: flex;
    border-radius: 7pt;
    background: ${(props) => props.$backgroundColorStyle};
    padding: 1pt 2pt;
    min-height: 0;
    width: fit-content;
    width: -moz-fit-content;
    ${(props) => (props.$pulsate ? pulsate(props.$pulsatingColor) : '')};
`;

async function fetchReasonOf(backendURL, sourceId, nodeId, currentSort) {
    const r = await fetch(`${backendURL}/graph/reason`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            sourceid: sourceId,
            nodeid: nodeId,
            currentSort: currentSort,
        }),
    });
    if (!r.ok) {
        throw new Error(`${r.status} ${r.statusText}`);
    }
    return await r.json();
}

function scrollParentToChild(parent, child) {
    var parentRect = parent.getBoundingClientRect();
    var parentViewableArea = {
        height: parent.clientHeight,
        width: parent.clientWidth,
    };

    var childRect = child.getBoundingClientRect();
    var isViewable =
        childRect.top >= parentRect.top &&
        childRect.bottom <= parentRect.top + parentViewableArea.height;

    if (!isViewable) {
        parent.scrollTo({
            top:
                childRect.top -
                parentRect.top +
                parent.scrollTop -
                parent.clientHeight / 2,
            behavior: 'smooth',
        });
    }
}



export function Symbol(props) {
    const {
        symbolIdentifier,
        isSubnode,
        handleClick,
        nodeUuid,
        transformationId,
    } = props;
    const symbolIdentifierRef = useRef(symbolIdentifier.uuid);
    const symbolElementRef = useRef(null);
    const [isHovered, setIsHovered] = useState(false);
    const colorPalette = useColorPalette();
    const {
        state: {explanationHighlightedSymbols, searchResultHighlightedSymbols},
    } = useTransformations();

    const [backgroundColorStyle, setBackgroundColorStyle] =
        useState('transparent');
    const [isPulsating, setIsPulsating] = useState(false);
    const [pulsatingColor, setPulsatingColor] = useState('transparent');

    let atomString = make_atoms_string(symbolIdentifier.symbol);
    const suffix = `_${isSubnode ? 'sub' : 'main'}`;
    const contentDivRef = useContentDiv();
    const backendURL = useRecoilValue(backendURLState);
    const currentSort = useRecoilValue(currentSortState);
    const setRuleBackgroundHighlights = useSetRecoilState(
        ruleBackgroundHighlightsByTransformationStateFamily(transformationId)
    );
    const setRuleDotHighlights = useSetRecoilState(
        ruleDotHighlightsByTransformationStateFamily(transformationId)
    );
    const isShowingExplanation = useRef(false);
    const timeoutIdRef = useRef(null);
    const [, messageDispatch] = useMessages();


    function middlewareAddExplanationHighlightedSymbol(data) {
        const explanationRuleOfSymbol = {
            shown: true,
            sourceId: data.source_symbol_id,
            color: 'red',
        };
        setRuleBackgroundHighlights((old) => ({
            ...old,
            [data.rule_hash]: old[data.rule_hash].toSpliced(
                0,
                0,
                explanationRuleOfSymbol
            ),
        }));
        setRuleDotHighlights((old) => ({
            ...old,
            [data.rule_hash]: old[data.rule_hash].concat(
                explanationRuleOfSymbol
            ),
        }));

        timeoutIdRef.current = setTimeout(() => {
            setRuleBackgroundHighlights((old) => ({
                ...old,
                [data.rule_hash]: old[data.rule_hash].filter(
                    (explanationRuleOfSymbol) =>
                        explanationRuleOfSymbol.sourceId !==
                        data.source_symbol_id
                ),
            }));
        }, Constants.ruleHighlightFadeDuration);
    }

    function middlewareRemoveExplanationHighlightedSymbol(data) {
        console.log('removing explanation', data);
        setRuleBackgroundHighlights((old) => ({
            ...old,
            [data.rule_hash]: old[data.rule_hash].filter(
                (explanationRuleOfSymbol) =>
                    explanationRuleOfSymbol.sourceId !== data.source_symbol_id
            ),
        }));
        setRuleDotHighlights((old) => {
            return {
                ...old,
                [data.rule_hash]: old[data.rule_hash].map((dot) => {
                    if (dot.sourceId === data.source_symbol_id) {
                        console.log('removing explanation');
                        return {
                            ...dot,
                            shown: false,
                        };
                    }
                    return dot;
                }),
            };
        });
        setTimeout(() => {
            setRuleDotHighlights((old) => ({
                ...old,
                [data.rule_hash]: old[data.rule_hash].filter((dot) => {
                    return dot.sourceId !== data.source_symbol_id;
                }),
            }));
        }, Constants.ruleHighlightFadeDuration);
    }

    const handleClickWithinSymbol = async (e) => {
        e.stopPropagation();
        if (!symbolIdentifier.has_reason) {
            return;
        }
        try {
            const data = await fetchReasonOf(
                backendURL,
                symbolIdentifier.uuid,
                nodeUuid,
                currentSort
            );
            if (data.symbols.some((tgt) => tgt === null)) {
                return;
            }
            if (!isShowingExplanation.current) {
                middlewareAddExplanationHighlightedSymbol(
                    {
                        arrows: data.symbols,
                        rule_hash: data.rule,
                        source_symbol_id: symbolIdentifier.uuid,
                        colors: colorPalette.explanationHighlights,
                    },
                );
                isShowingExplanation.current = true;
            } else {
                middlewareRemoveExplanationHighlightedSymbol(
                    {
                        arrows: data.symbols,
                        rule_hash: data.rule,
                        source_symbol_id: symbolIdentifier.uuid,
                        colors: colorPalette.explanationHighlights,
                    },
                );
                isShowingExplanation.current = false;
            }
        } catch (error) {
            messageDispatch(showError(`Failed to get reason: ${error}`));
        }
    };

    React.useEffect(() => {
        if (isHovered) {
            return;
        }
        const symbolid = symbolIdentifierRef.current;
        const searchResultHighlightIndices = searchResultHighlightedSymbols
            .flatMap((item, index) =>
                [item.includes[item.selected]].includes(symbolid) ? index : []
            )
            .filter((value, index, self) => self.indexOf(value) === index);
        const reasonHighlightIndices = explanationHighlightedSymbols
            .flatMap((item, index) =>
                [item.tgt, item.src].includes(symbolid) ? index : []
            )
            .filter((value, index, self) => self.indexOf(value) === index);

        if (
            searchResultHighlightIndices.some(
                (index) => searchResultHighlightedSymbols[index].recent
            )
        ) {
            setIsPulsating(true);
            setPulsatingColor(
                searchResultHighlightedSymbols.filter((s) => s.recent)[0].color
            );
        } else {
            setIsPulsating(false);
            setPulsatingColor('transparent');
        }
        if (
            searchResultHighlightIndices.length > 0 ||
            reasonHighlightIndices.length > 0
        ) {
            const searchResultUniqueColors = [
                ...new Set(
                    searchResultHighlightIndices
                        .map(
                            (index) =>
                                searchResultHighlightedSymbols[index].color
                        )
                        .reverse()
                ),
            ];
            const reasonUniqueColors = [
                ...new Set(
                    reasonHighlightIndices
                        .map(
                            (index) =>
                                explanationHighlightedSymbols[index].color
                        )
                        .reverse()
                ),
            ];

            const gradientStops = searchResultUniqueColors
                .concat(reasonUniqueColors)
                .map((color, index, array) => {
                    const start = (index / array.length) * 100;
                    const end = ((index + 1) / array.length) * 100;
                    return `${color} ${start}%, ${color} ${end}%`;
                })
                .join(', ');
            setBackgroundColorStyle(
                `linear-gradient(-45deg, ${gradientStops})`
            );
        } else {
            setBackgroundColorStyle('transparent');
        }

        if (
            searchResultHighlightIndices.some(
                (index) => searchResultHighlightedSymbols[index].recent
            )
        ) {
            scrollParentToChild(
                contentDivRef.current,
                symbolElementRef.current
            );
        }
    }, [
        isHovered,
        searchResultHighlightedSymbols,
        explanationHighlightedSymbols,
        contentDivRef,
        symbolElementRef,
    ]);

    atomString = atomString.length === 0 ? '' : atomString;

    const [previousBackgroundColorStyle, setPreviousBackgroundColorStyle] =
        useState('transparent');

    const handleMouseEnter = React.useCallback(() => {
        setIsHovered(true);
        if (symbolIdentifier.has_reason) {
            setBackgroundColorStyle((prev) => {
                setPreviousBackgroundColorStyle(prev);
                return getNextHoverColor(
                    explanationHighlightedSymbols,
                    searchResultHighlightedSymbols,
                    symbolIdentifierRef.current,
                    colorPalette.explanationHighlights
                );
            });
        }
    }, [
        explanationHighlightedSymbols,
        searchResultHighlightedSymbols,
        colorPalette.explanationHighlights,
        symbolIdentifier.has_reason,
    ]);

    const handleMouseLeave = React.useCallback(() => {
        setIsHovered(false);
        setBackgroundColorStyle(previousBackgroundColorStyle);
    }, [previousBackgroundColorStyle, setBackgroundColorStyle]);

    // const handleMouseEnter = () => setIsHovered(true);
    // const handleMouseLeave = () => setIsHovered(false);

    return (
        <SymbolElementSpan
            id={symbolIdentifier.uuid + suffix}
            $pulsate={isPulsating}
            $pulsatingColor={pulsatingColor}
            $backgroundColorStyle={backgroundColorStyle}
            onClick={handleClickWithinSymbol}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            ref={symbolElementRef}
        >
            {atomString}
        </SymbolElementSpan>
    );
}

Symbol.propTypes = {
    /**
     * The symbolidentifier of the symbol to display
     */
    symbolIdentifier: SYMBOLIDENTIFIER,
    /**
     * If the symbol is a subnode
     */
    isSubnode: PropTypes.bool,
    /**
     * All symbols that are currently highlighted
     */
    highlightedSymbols: PropTypes.array,
    /**
     * The function to be called if the symbol is clicked on
     */
    handleClick: PropTypes.func,
    /**
     * The uuid of the node that the symbol is in
     */
    nodeUuid: PropTypes.string,
    /**
     * The id of the transformation that the symbol is in
     */
    transformationId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};
