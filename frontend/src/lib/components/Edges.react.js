import React, { Suspense } from 'react';
import { useRecoilValue } from 'recoil';
import LineTo from 'react-lineto';
import PropTypes from 'prop-types';
import {useColorPalette} from '../contexts/ColorPalette';
import {useAnimationUpdater} from '../contexts/AnimationUpdater';
import { edgesState } from '../atoms/edgesState';

export function Edges() {
    const colorPalete = useColorPalette();
    const edges = useRecoilValue(edgesState);
    const {animationState} = useAnimationUpdater();

    React.useEffect(() => {
        console.log("Edges Updated")
    }, [edges])

    return (
        <Suspense fallback={<div>Loading...</div>}>
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
        </Suspense>
    );
}

Edges.propTypes = {
    /**
     * The ID used to identify this component in Dash callbacks.
     */
    id: PropTypes.string,
};
