import React, { useState } from "react";
import { make_atoms_string, getNextHoverColor } from "../utils/index";
import './symbol.css';
import PropTypes from "prop-types";
import { SYMBOLIDENTIFIER } from "../types/propTypes";
import { useTransformations } from "../contexts/transformations";
import {styled, keyframes, css} from 'styled-components';
import { useColorPalette } from "../contexts/ColorPalette";


const symbolPulsate = keyframes`
    0% {
        box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.7);
    }

    100% {
        box-shadow: 0 0 0 10px rgba(0, 0, 0, 0);
    }
`;

const pulsate = css`
    animation: ${symbolPulsate} 1s 3;
`;

const SymbolElement = styled.span`
    margin: 1px 1px;
    display: flex;
    border-radius: 7pt;
    background: ${(props) => props.$backgroundColorStyle};
    padding: 1pt 2pt;
    min-height: 0;
    width: fit-content;
    width: -moz-fit-content;
    ${(props) => (props.$pulsate ? pulsate : '')};
`;

export function Symbol(props) {
    const { symbolIdentifier, isSubnode, handleClick } = props;
    const symbolIdentifierRef = React.useRef(symbolIdentifier.uuid);
    const [isHovered, setIsHovered] = useState(false);
    const colorPalette = useColorPalette();
    const {
        state: {
            explanationHighlightedSymbols,
            searchResultHighlightedSymbols
        },
    } = useTransformations();
    
    const [isMarked, setIsMarked] = useState(false);
    const [backgroundColorStyle, setBackgroundColorStyle] = useState('transparent');
    const [isPulsating, setIsPulsating] = useState(false);

    let atomString = make_atoms_string(symbolIdentifier.symbol)
    const suffix = `_${isSubnode ? "sub" : "main"}`

    React.useEffect(() => {
        if (isHovered) {
            return
        }
        const symbolid = symbolIdentifierRef.current;
        const searchResultHighlightIndices =
            searchResultHighlightedSymbols
                .flatMap((item, index) =>
                    [item.includes[item.selected].symbol_uuid].includes(symbolid) ? index : []
                )
                .filter((value, index, self) => self.indexOf(value) === index);
        
        if (searchResultHighlightIndices.length > 0) {
            setIsMarked(true);
            setIsPulsating(searchResultHighlightIndices.some((index) => searchResultHighlightedSymbols[index].recent));
            const uniqueColors = [
                ...new Set(
                    searchResultHighlightIndices
                        .map(
                            (index) =>
                                searchResultHighlightedSymbols[index].color
                        )
                        .reverse()
                ),
            ];

            const gradientStops = uniqueColors
                .map((color, index, array) => {
                    const start = (index / array.length) * 100;
                    const end = ((index + 1) / array.length) * 100;
                    return `${color} ${start}%, ${color} ${end}%`;
                })
                .join(', ');
            setBackgroundColorStyle(`linear-gradient(-45deg, ${gradientStops})`);
        }
        else {
            setIsMarked(false);
            setIsPulsating(false);
            setBackgroundColorStyle('transparent');
        }
    }, [isHovered, searchResultHighlightedSymbols]);

    React.useEffect(() => {
        if (isHovered) {
            return
        }
        const symbolid = symbolIdentifierRef.current;
        const reasonHighlightIndices = explanationHighlightedSymbols
            .flatMap((item, index) =>
                [item.tgt, item.src].includes(symbolid) ? index : []
            )
            .filter((value, index, self) => self.indexOf(value) === index);

        if (reasonHighlightIndices.length > 0) {
            setIsMarked(true);
            const uniqueColors = [
                ...new Set(
                    reasonHighlightIndices.map(
                        (index) => explanationHighlightedSymbols[index].color
                    ).reverse()
                ),
            ];

            const gradientStops = uniqueColors
                .map((color, index, array) => {
                    const start = (index / array.length) * 100;
                    const end = ((index + 1) / array.length) * 100;
                    return `${color} ${start}%, ${color} ${end}%`;
                })
                .join(', ');
            setBackgroundColorStyle(`linear-gradient(-45deg, ${gradientStops})`);
        }
        else {
            setIsMarked(false);
            setBackgroundColorStyle('transparent');
        }
    }, [isHovered, explanationHighlightedSymbols]);

    atomString = atomString.length === 0 ? "" : atomString;

    const [previousBackgroundColorStyle, setPreviousBackgroundColorStyle] = useState('transparent');
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
                )
            });
        }
    }, [explanationHighlightedSymbols, searchResultHighlightedSymbols, colorPalette.explanationHighlights, symbolIdentifier.has_reason]);

    const handleMouseLeave = React.useCallback(() => {
        setIsHovered(false);
        setBackgroundColorStyle(previousBackgroundColorStyle);
    }, [previousBackgroundColorStyle, setBackgroundColorStyle]);






    // const handleMouseEnter = () => setIsHovered(true);
    // const handleMouseLeave = () => setIsHovered(false);

    return (
        <SymbolElement
            id={symbolIdentifier.uuid + suffix}
            $marked={isMarked}
            $pulsate={isPulsating}
            $backgroundColorStyle={backgroundColorStyle}
            onClick={(e) => handleClick(e, symbolIdentifier)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {atomString}
        </SymbolElement>
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

}

