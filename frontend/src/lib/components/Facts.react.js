import './facts.css';
import React from 'react';
import { Constants } from "../constants";
import {Node} from './Node.react';
import { useColorPalette} from '../contexts/ColorPalette';
import {OverflowButton} from './OverflowButton.react';
import {useTransformations} from '../contexts/transformations';
import {make_default_nodes} from '../utils';
import {useDebouncedAnimateResize} from '../hooks/useDebouncedAnimateResize';

export function Facts() {
    const {
        state: {transformationDropIndices, transformationNodesMap},
    } = useTransformations();
    const colorPalette = useColorPalette();
    const [fact, setFact] = React.useState(make_default_nodes()[0]);
    const [style, setStyle] = React.useState({
        background: colorPalette.rowShading[0],
        opacity: 1.0,
        width: '100%',
    });
    const branchSpaceRef = React.useRef(null);
    const rowbodyRef = React.useRef(null);
    const transformationIdRef = React.useRef('-1');

    useDebouncedAnimateResize(rowbodyRef, transformationIdRef);

    React.useEffect(() => {
        if (transformationNodesMap && transformationNodesMap['-1']) {
            setFact(transformationNodesMap['-1'][0]);
        }
    }, [transformationNodesMap]);

    React.useEffect(() => {
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
        <div className="row_container facts_banner" >
            <div className="row_row" style={style} ref={rowbodyRef}>
                <div
                    className="branch_space"
                    key={fact.uuid}
                    style={{flex: '0 0 100%'}}
                    ref={branchSpaceRef}
                >
                    <Node
                        key={fact.uuid}
                        node={fact}
                        isSubnode={false}
                        branchSpace={branchSpaceRef}
                        transformationId={transformationIdRef.current}
                    />
                </div>
            </div>
            { !fact.showMini && (fact.isExpandableV || fact.isCollapsibleV) ?  (
            <OverflowButton
                transformationId={transformationIdRef.current}
                nodes={[fact]}
            /> ) : null }
        </div>
    );
}

Facts.propTypes = {};
