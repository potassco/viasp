import React, {useEffect, useState, useMemo, useCallback} from 'react';
import './box.css';
import PropTypes from 'prop-types';
import {styled} from 'styled-components'
import {debounce} from 'lodash';
import useResizeObserver from '@react-hook/resize-observer';
import { Constants } from "../constants";
import {emToPixel} from '../utils';
import { useRecoilState, useRecoilValue } from 'recoil';
import { clingraphAtomByUuidState } from '../atoms/clingraphState';
import {backendUrlState, colorPaletteState} from '../atoms/settingsState';
import { nodeShowMiniByNodeUuidStateFamily } from '../atoms/nodesState';
import { contentDivState } from '../atoms/currentGraphState';


const BoxDiv = styled.div`
    backgroundcolor: ${({$colorPalette}) => $colorPalette.primary};
    color: ${({$colorPalette}) => $colorPalette.primary};
    border-radius: 1px 1px 1px 1px;
    border: 2px solid;
    margin: 25px 5px 15px 5px;
    position: relative;

    &:hover {
        transition: drop-shadow .1s;
        filter: drop-shadow(0 0 2px #333);
    }
`;

export function Box(props) {
    const {clingraphUuid, branchSpace} = props;
    const clingraphAtom = useRecoilValue(
        clingraphAtomByUuidState(clingraphUuid)
    );
    const colorPalette = useRecoilValue(colorPaletteState);
    const backendUrl = useRecoilValue(backendUrlState);
    const clingraphUrl = `${backendUrl}/clingraph/${clingraphUuid}.svg`;
    const [imageSize, setImageSize] = useState({width: 0, height: 0});
    const [showMini, setShowMini] = useRecoilState(
        nodeShowMiniByNodeUuidStateFamily(clingraphUuid)
    );
    const contentDiv = useRecoilValue(contentDivState);

    

    // get size of image
    useEffect(() => {
        let mounted = true;
        if (mounted && clingraphUuid && !clingraphAtom.loading) {
            const img = new Image();
            img.onload = function () {
                setImageSize({width: img.width, height: img.height});
            };
            img.src = clingraphUrl;
        }
        return () => {
            mounted = false;
        };
    }, [clingraphUuid, clingraphAtom.loading, clingraphUrl]);

    // manage show mini
    const manageShowMini = useCallback(() => {
        if (imageSize.width > 0 && branchSpace.current) {
            const branchSpaceWidth = branchSpace.current.offsetWidth;
            if (
                imageSize.width +
                    emToPixel(
                        Constants.HOverflowThresholdForRecursiveNodesInEm
                    ) >
                branchSpaceWidth
            ) {
                setShowMini(true);
                return;
            }
            setShowMini(false);
        }
    }, [imageSize.width, branchSpace, setShowMini]);

    const debouncedManageShowMini = useMemo(() => {
        return debounce(manageShowMini, Constants.DEBOUNCETIMEOUT);
    }, [manageShowMini]);


    useResizeObserver(contentDiv, debouncedManageShowMini);
    /* eslint-disable react-hooks/exhaustive-deps */
    useEffect(debouncedManageShowMini, [imageSize.width]);

    return (
        <BoxDiv
            id={clingraphUuid}
            className={clingraphUuid}
            $colorPalette={colorPalette}
        >
            {showMini ? (
                <div
                    style={{
                        backgroundColor: colorPalette.primary,
                        color: colorPalette.primary,
                    }}
                    className="mini"
                />
            ) : (
                <div
                    style={{
                        backgroundColor: colorPalette.primary,
                        color: colorPalette.primary,
                    }}
                >
                    {clingraphAtom.loading ? (
                        <div className={'loading'} style={imageSize}></div>
                    ) : (
                        <img
                            className="svg"
                            src={clingraphUrl}
                            // width={`30px`}
                            alt="Clingraph"
                        />
                    )}
                </div>
            )}
        </BoxDiv>
    );
}

Box.propTypes = {
    /**
     * The uuid of the clingraph node
     */
    clingraphUuid: PropTypes.string,
    /**
     * The ref to the branch space the node sits in
     */
    branchSpace: PropTypes.object,
};
