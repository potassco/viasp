import React, {Suspense} from 'react';
import PropTypes from 'prop-types';
import {useColorPalette} from '../contexts/ColorPalette';
import {useTransformations, setNodeIsExpandAllTheWay} from '../contexts/transformations';
import {NODE} from '../types/propTypes';
import {IconWrapper} from '../LazyLoader';
import rgba from 'color-rgba';

export function OverflowButton(props) {
    const {transformationId, nodes} = props;
    const [isIconRotated, setIsIconRotated] = React.useState(false);
    const colorPalette = useColorPalette();
    const {
        dispatch,
        state: {shownRecursion},
    } = useTransformations();

    function handleClick(e) {
        e.stopPropagation();
        nodes.forEach((node) => {
            if (shownRecursion.indexOf(node.uuid) === -1) {
                dispatch(
                    setNodeIsExpandAllTheWay(
                        transformationId,
                        node.uuid,
                        node.isExpandableV
                    )
                );
                node.recursive.forEach((subnode) =>
                    dispatch(
                        setNodeIsExpandAllTheWay(
                            transformationId,
                            subnode.uuid,
                            node.isExpandableV
                        )
                    )
                );
            } else {
                node.recursive.forEach((subnode) => {
                    dispatch(
                        setNodeIsExpandAllTheWay(
                            transformationId,
                            subnode.uuid,
                            subnode.isExpandableV
                        )
                    );
                });
                dispatch(
                    setNodeIsExpandAllTheWay(
                        transformationId,
                        node.uuid,
                        node.recursive.some((n) => n.isExpandableV)
                    )
                );
            }
        });
    }

    const expandableValues = nodes
        .map((node) => {
            if (shownRecursion.indexOf(node.uuid) === -1) {
                return node.isExpandableV;
            }
            return node.recursive.map((sn) => sn.isExpandableV).join(',');
        })
        .join(',');
    React.useEffect(() => {
        setIsIconRotated(!expandableValues.includes('true'));
    }, [expandableValues]);

    const [r, g, b, _] = rgba(colorPalette.dark);

    // Construct the new color
    const gradientColor1 = `rgba(${r}, ${g}, ${b}, 0.2)`;
    const gradientColor2 = `transparent`;

    return (
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
    );
}

OverflowButton.propTypes = {
    /**
     * The id of the transformation
     */
    transformationId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    /**
     * The nodes object of the transformation
     */
    nodes: PropTypes.arrayOf(NODE),
};



