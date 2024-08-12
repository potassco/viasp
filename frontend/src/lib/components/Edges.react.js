import React from "react";
import LineTo from "react-lineto";
import PropTypes from "prop-types";
import {useColorPalette} from "../contexts/ColorPalette";
import {useTransformations} from '../contexts/transformations';

export function Edges(props) {
    const colorPalete = useColorPalette();
    const {
        state: {edges},
    } = useTransformations();

    return <>
            {edges.map(link => {
                if (link.recursion_anchor_keyword === 'in') {
                    return (
                        <LineTo
                            key={link.source + '-' + link.target}
                            from={link.source}
                            fromAnchor={'top center'}
                            toAnchor={'top center'}
                            to={link.target}
                            zIndex={1}
                            borderColor={colorPalete.dark}
                            borderStyle={link.style}
                            borderWidth={1}
                            delay={1000}
                            within={`row_container ${link.transformation_hash}`}
                        />
                    );
                }
                if (link.recursion_anchor_keyword === 'out') {
                    return (
                        <LineTo
                            key={link.source + '-' + link.target}
                            from={link.source}
                            fromAnchor={'bottom center'}
                            toAnchor={'bottom center'}
                            to={link.target}
                            zIndex={1}
                            borderColor={colorPalete.dark}
                            borderStyle={link.style}
                            borderWidth={1}
                            delay={1000}
                            within={`row_container ${link.transformation_hash}`}
                        />
                    );
                }
                return (
                    <LineTo
                        key={link.source + '-' + link.target}
                        from={link.source}
                        fromAnchor={'bottom center'}
                        toAnchor={'top center'}
                        to={link.target}
                        zIndex={5}
                        borderColor={colorPalete.dark}
                        borderStyle={link.style}
                        borderWidth={1}
                        delay={1000}
                        within={`row_container ${link.transformation_hash}`}
                        />
                );
                }
            )}
        </>
    }

        

Edges.propTypes = {
    /**
     * The ID used to identify this component in Dash callbacks.
     */
    id: PropTypes.string,
}
