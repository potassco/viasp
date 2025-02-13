import React from 'react';
import './edges.css';
import {
    useRecoilValue,
    noWait,
} from 'recoil';
import LineTo from 'react-lineto';
import PropTypes from 'prop-types';
import {useColorPalette} from '../contexts/ColorPalette';
import { edgesState } from '../atoms/edgesState';
import {isAnimatingState} from '../atoms/currentGraphState';


export function Edges() {
    const colorPalete = useColorPalette();
    const edgesLoadable = useRecoilValue(noWait(edgesState));
    const isAnimating = useRecoilValue(isAnimatingState);

    const createEdges = (edges, isAnimating) => {
        return edges.map((link) => {
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
                        className={isAnimating ? 'edge-leave' : 'edge-enter'}
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
                        className={isAnimating ? 'edge-leave' : 'edge-enter'}
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
                    className={isAnimating ? 'edge-leave' : 'edge-enter'}
                />
            );
        });
    };

    switch (edgesLoadable.state) {
        case 'hasValue':
            return createEdges(edgesLoadable.contents, isAnimating);
        default:
            return null;
    }
}

Edges.propTypes = {
    /**
     * The ID used to identify this component in Dash callbacks.
     */
    id: PropTypes.string,
};
