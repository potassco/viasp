import './facts.css';
import React, {useRef, useEffect, useState, Suspense} from 'react';
import { Constants } from "../constants";
import {Node} from './Node.react';
import { useColorPalette} from '../contexts/ColorPalette';
import {OverflowButton} from './OverflowButton.react';
import {useTransformations} from '../contexts/transformations';
import {make_default_nodes} from '../utils';
import {useDebouncedAnimateResize} from '../hooks/useDebouncedAnimateResize';

import { useRecoilValue } from 'recoil';
import { transformationStateFamily } from '../atoms/transformationsState';
import { nodeUuidsByTransforamtionStateFamily } from '../atoms/nodesState';    
import { BranchSpace } from './BranchSpace.react';

export function Facts() {
    const {
        state: {transformationDropIndices, transformationNodesMap},
    } = useTransformations();
    const [nodeUuid] = useRecoilValue(
        nodeUuidsByTransforamtionStateFamily("-1")
    );

    const colorPalette = useColorPalette();
    const [fact, setFact] = useState(make_default_nodes()[0]);
    const [style, setStyle] = useState({
        background: colorPalette.rowShading[0],
        opacity: 1.0,
        width: '100%',
    });
    const rowbodyRef = useRef(null);
    const transformationIdRef = useRef('-1');

    useDebouncedAnimateResize(rowbodyRef, transformationIdRef);

    useEffect(() => {
        if (transformationNodesMap && transformationNodesMap['-1']) {
            setFact(transformationNodesMap['-1'][0]);
        }
    }, [transformationNodesMap]);

    useEffect(() => {
        if (transformationDropIndices !== null) {
            setStyle((prevStyle) => ({
                ...prevStyle,
                opacity: 1 - Constants.opacityMultiplier,
            }));
        } else {
            setStyle((prevStyle) => ({...prevStyle, opacity: 1.0}));
        }
    }, [transformationDropIndices]);


    if (fact === null) {
        return <div className="row_container"></div>;
    }
    return (
        <div className="row_container facts_banner">
            <div className="row_row" style={style} ref={rowbodyRef}>
                <Suspense fallback={<div>Loading...</div>}>
                    <BranchSpace
                        key={`branch_space_${nodeUuid}`}
                        transformationHash={'-1'}
                        transformationId={'-1'}
                        nodeUuid={nodeUuid}
                    />
                </Suspense>
            </div>
            {!fact.showMini && (fact.isExpandableV || fact.isCollapsibleV) ? (
                <OverflowButton
                    transformationId={transformationIdRef.current}
                    nodes={[fact]}
                />
            ) : null}
        </div>
    );
}

Facts.propTypes = {};
