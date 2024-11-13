import React from 'react';
import LineTo from 'react-lineto';
import PropTypes from 'prop-types';
import {useColorPalette} from '../contexts/ColorPalette';
import {useTransformations} from '../contexts/transformations';
import {useAnimationUpdater} from '../contexts/AnimationUpdater';
import {styled} from 'styled-components';

const EdgesContainer = styled.div``;

export function Edges() {
    const colorPalete = useColorPalette();
    const {
        state: {edges},
    } = useTransformations();
    const {animationState} = useAnimationUpdater();

    React.useEffect(() => {
        console.log('Scale: ', animationState.graph_zoom);
    }, [animationState]);

    return (
        <>
            {edges.map((link) => {
                if (link.recursion_anchor_keyword === 'in') {
                    return (
                        <LineTo
                            key={link.source + '-' + link.target}
                            from={link.source}
                            fromAnchor={'top center'}
                            toAnchor={'top center'}
                            to={link.target}
                            zIndex={1}
                            borderColor={colorPalete.primary}
                            borderStyle={link.style}
                            borderWidth={1}
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
                            borderColor={colorPalete.primary}
                            borderStyle={link.style}
                            borderWidth={1}
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
                        borderColor={colorPalete.primary}
                        borderStyle={link.style}
                        borderWidth={1}
                        within={`row_container ${link.transformation_hash}`}
                    />
                );
            })}
        </>
    );
}

Edges.propTypes = {
    /**
     * The ID used to identify this component in Dash callbacks.
     */
    id: PropTypes.string,
};
