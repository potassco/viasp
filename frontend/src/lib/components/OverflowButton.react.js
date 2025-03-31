import React, {Suspense} from 'react';
import PropTypes from 'prop-types';
import {IconWrapper} from '../LazyLoader';
import { lighten } from 'polished';
import { styled } from 'styled-components';
import {Constants} from '../constants';
import {
    useRecoilValue,
    noWait,
    useRecoilCallback,
} from 'recoil';
import {overflowButtonState, rowHasOverflowButtonState } from '../atoms/currentGraphState';
import {
    nodeUuidsByTransforamtionStateFamily,
    nodeIsExpandVAllTheWayByNodeUuidStateFamily,
    nodeIsCollapsibleVByNodeUuidStateFamily,
} from '../atoms/nodesState';
import { colorPaletteState } from '../atoms/settingsState';

const BauchbindeDiv = styled.div`
    @property --gradPoint {
        syntax: '<percentage>';
        inherits: false;
        initial-value: 100%;
    }
    @property --color1 {
        syntax: '<color>';
        inherits: false;
        initial-value: ${(props) => props.$gradientColor1};
    }
    @property --color2 {
        syntax: '<color>';
        inherits: false;
        initial-value: ${(props) => props.$gradientColor2};
    }

    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(
        var(--color1) var(--gradPoint),
        var(--color2) calc(var(--gradPoint) + 100%)
    );
    height: 1.1em;
    transition: --gradPoint 500ms;
    ${(props) =>
        props.$showButton ? `--gradPoint: 0%;` : `--gradPoint: 100%;`}

`;


const BauchbindeTextDiv = styled.div`
    position: relative;
    text-align: center;
    overflow: hidden;
`;

export function OverflowButton(props) {
    const {transformationHash} = props;
    const colorPalette = useRecoilValue(colorPaletteState);
    const overflowButtonLoadable = useRecoilValue(
        noWait(overflowButtonState(transformationHash))
    );
    const rowHasOverflowButtonLoadable = useRecoilValue(
        noWait(rowHasOverflowButtonState(transformationHash))
    );

    const toggleOverflowButton = useRecoilCallback(
        ({snapshot, set}) =>
            async () => {
                const nodeUuidsByTransformation = await snapshot.getPromise(
                    nodeUuidsByTransforamtionStateFamily(transformationHash)
                );
                set(rowHasOverflowButtonState(transformationHash), true);
                nodeUuidsByTransformation.forEach((nodeUuid) => {
                    set(
                        nodeIsExpandVAllTheWayByNodeUuidStateFamily(nodeUuid),
                        (oldValue) => !oldValue
                    );
                    set(
                        nodeIsCollapsibleVByNodeUuidStateFamily(nodeUuid),
                        (oldValue) => !oldValue
                    );
                })
                set(rowHasOverflowButtonState(transformationHash), false);
            },
        [transformationHash]
    );

    function handleClick(e) {
        e.stopPropagation();
        toggleOverflowButton();
    }

    const gradientColor1 = `transparent`;
    // Construct the new color
    const gradientColor2 = lighten(
        Constants.overflowButtonColorLightenFactor,
        colorPalette.dark
    );
    const arrowColor = lighten(
        Constants.overflowButtonArrowColorLightenFactor,
        colorPalette.dark
    )

    const overwriteShowButton = rowHasOverflowButtonLoadable.state === 'hasValue'
        ? rowHasOverflowButtonLoadable.contents
        : false
    if (overflowButtonLoadable.state !== 'hasValue' && !overwriteShowButton) {
        return null;
    }
    const overflowButton = overflowButtonLoadable.contents;

    const showButton = overwriteShowButton 
        ? true
        : (!overflowButton.rowAllNodesShowMini &&
            (overflowButton.rowIsExpandableV ||
                overflowButton.rowIsCollapsibleV)
        ); 

    return (
        <BauchbindeDiv
            $gradientColor1={gradientColor1}
            $gradientColor2={gradientColor2}
            $showButton={showButton}
            className={'bauchbinde overflowbutton'}
            onClick={showButton ? handleClick : null}
        >
            {showButton ? (
                <BauchbindeTextDiv className={'bauchbinde_text'}>
                    <Suspense fallback={<div>^</div>}>
                        <IconWrapper
                            icon={'arrowDownDoubleFill'}
                            className={
                                !overflowButton.rowIsExpandableV
                                    ? 'rotate_icon'
                                    : ''
                            }
                            height={'1.2em'}
                            color={arrowColor}
                        />
                    </Suspense>
                </BauchbindeTextDiv>
            ) : null}
        </BauchbindeDiv>
    );
}

OverflowButton.propTypes = {
    /**
     * The hash of the transformation
     */
    transformationHash: PropTypes.string,
};



