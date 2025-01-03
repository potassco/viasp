import React, {Suspense, useEffect} from 'react';
import PropTypes from 'prop-types';
import {useColorPalette} from '../contexts/ColorPalette';
import {IconWrapper} from '../LazyLoader';
import rgba from 'color-rgba';
import {useRecoilValue, useRecoilState, noWait} from 'recoil';
import {overflowButtonState, shownRecursionState} from '../atoms/currentGraphState';
import { nodesByTransformationHash } from '../atoms/nodesState';

export function OverflowButton(props) {
    const {transformationHash} = props;
    const [isIconRotated, setIsIconRotated] = React.useState(false);
    const colorPalette = useColorPalette();
    const shownRecursion = useRecoilValue(shownRecursionState);
    const overflowButtonLoadable = useRecoilValue(
        noWait(overflowButtonState(transformationHash))
    );
    const [recoilNodes, setRecoilNodes] = useRecoilState(nodesByTransformationHash(transformationHash));

    function handleClick(e) {
        e.stopPropagation();
        recoilNodes.forEach((node) => {
            if (shownRecursion.indexOf(node.uuid) === -1) {
                // dispatch(
                //     setNodeIsExpandAllTheWay(
                //         transformationId,
                //         node.uuid,
                //         node.isExpandableV
                //     )
                // );
                // node.recursive.forEach((subnode) =>
                //     dispatch(
                //         setNodeIsExpandAllTheWay(
                //             transformationId,
                //             subnode.uuid,
                //             node.isExpandableV
                //         )
                //     )
                // );
                setRecoilNodes((oldNodes) => [
                    ...oldNodes.filter((n) => n.uuid !== node.uuid),
                    {
                        ...node,
                        isExpandVAllTheWay: node.isExpandableV,
                        recursive: node.recursive.map((sn) => ({
                            ...sn,
                            isExpandVAllTheWay: node.isExpandableV,
                        })),
                    },
                ]);
            } else {
                //     dispatch(
                //         setNodeIsExpandAllTheWay(
                //             transformationId,
                //             subnode.uuid,
                //             subnode.isExpandableV
                //         )
                //     );
                // });
                // dispatch(
                //     setNodeIsExpandAllTheWay(
                //         transformationId,
                //         node.uuid,
                //         node.recursive.some((n) => n.isExpandableV)
                //     )
                // );
                setRecoilNodes((oldNodes) => [
                    ...oldNodes.filter((n) => n.uuid !== node.uuid),
                    {
                        ...node,
                        isExpandVAllTheWay: node.recursive.some((n) => n.isExpandableV),
                        recursive: node.recursive.map((sn) => ({
                            ...sn,
                            isExpandVAllTheWay: sn.isExpandableV,
                        })),
                    },
                ]);
            }
        });
    }

    const expandableValues = recoilNodes
        .map((node) => {
            if (shownRecursion.indexOf(node.uuid) === -1) {
                return node.isExpandableV;
            }
            return node.recursive.map((sn) => sn.isExpandableV).join(',');
        })
        .join(',');
    useEffect(() => {
        setIsIconRotated(!expandableValues.includes('true'));
    }, [expandableValues]);

    const [r, g, b, _] = rgba(colorPalette.dark);

    // Construct the new color
    const gradientColor1 = `rgba(${r}, ${g}, ${b}, 0.2)`;
    const gradientColor2 = `transparent`;

    if (overflowButtonLoadable.state !== 'hasValue') {
        return null;
    }
    const overflowButton = overflowButtonLoadable.contents;

    const showButton =
        !overflowButton.allNodesShowMini &&
        (overflowButton.isExpandableV || overflowButton.isCollapsibleV); 

    return showButton ? (
        <div
            style={{
                background: `linear-gradient(to top, ${gradientColor1}, ${gradientColor2})`,
                height: '1em',
            }}
            className={'bauchbinde'}
            onClick={handleClick}
        >
            <div className={'bauchbinde_text'}>
                <Suspense fallback={<div>...</div>}>
                    <IconWrapper
                        icon={'arrowDownDoubleFill'}
                        className={isIconRotated ? 'rotate_icon' : ''}
                    />
                </Suspense>
            </div>
        </div>
    ) : null;
}

OverflowButton.propTypes = {
    /**
     * The hash of the transformation
     */
    transformationHash: PropTypes.string,
};



