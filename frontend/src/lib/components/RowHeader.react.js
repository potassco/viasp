import React, {Suspense} from 'react';
import PropTypes from 'prop-types';
import { Constants } from "../constants";
import {Transition} from 'react-transition-group';
import {styled} from 'styled-components';
import { useRecoilValue, waitForAll } from 'recoil';
import {colorPaletteState} from '../atoms/settingsState';
import {
    ruleWrapperByHashStateFamily,
    transformationStateFamily,
} from '../atoms/transformationsState';
import {
    ruleBackgroundHighlightsStateFamily,
    ruleDotHighlightsStateFamily,
} from '../atoms/highlightsState';

const RuleHighlightDotDiv = styled.span`
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background-color: ${(props) => props.$color};
    transition: opacity ${() => Constants.ruleHighlightFadeDuration}ms ease,
        transform ${() => Constants.ruleHighlightFadeDuration}ms ease;
    opacity: 0;
    transform: translateX(-1ex);
    &.enter,
    &.entered {
        opacity: 1;
        transform: translateX(0ex);
    }
    &.exit,
    &.exited {
        opacity: 0;
        transform: translateX(-1ex);
    }
`;
        
const RuleHighlightDotContainerDiv = styled.div`
    position: absolute;
    left: 100%;
    top: 50%;
    transform: translateY(-50%);
    width: auto;
    height: 9px;
    display: flex;
    justify-content: space-between;
    gap: 0.3em;
    align-items: center;
    margin-left: 0.7em;
`;

function RuleHighlightDot(props) {
    const {state, color} = props;

    return (
        <RuleHighlightDotDiv
            className={state}
            $color={color}
        />
    );
}

RuleHighlightDot.propTypes = {
    state: PropTypes.string,
    color: PropTypes.string,
};


function RuleHighlightDotContainer(props) {
    const {transformationHash, ruleHash} = props;

    const ruleDotHighlights = useRecoilValue(
        ruleDotHighlightsStateFamily(transformationHash)
    ).filter((highlight) => highlight.ruleHash === ruleHash);

    return (
        <Suspense fallback={<div></div>}>
            <RuleHighlightDotContainerDiv>
                {ruleDotHighlights?.map((dot, i) => (
                    <Transition
                        key={`${ruleHash}_${dot.color}_${i}`}
                        mountOnEnter
                        unmountOnExit
                        appear={true}
                        in={dot.shown}
                        timeout={{
                            enter: 0,
                            appear: 0,
                            exit: Constants.ruleHighlightFadeDuration,
                        }}
                    >
                        {(state) => (
                            <RuleHighlightDot state={state} color={dot.color} />
                        )}
                    </Transition>
                ))}
            </RuleHighlightDotContainerDiv>
        </Suspense>
    );
}

RuleHighlightDotContainer.propTypes = {
    transformationHash: PropTypes.string,
    ruleHash: PropTypes.string,
};

const RuleTextDiv = styled.div`
    white-space: pre-wrap;
    padding: 0.3em 0;
    position: relative;
    width: fit-content;
    border-radius: 7px;
    transition: background-color 1s ease;
    background-color: ${(props) => props.$backgroundColor};
`;

function Rule(props) {
    const {
        transformationId,
        transformationHash,
        ruleHash,
        multipleRules,
    } = props;
    const ruleWrapper = useRecoilValue(
        ruleWrapperByHashStateFamily({
            transformationId,
            ruleHash,
        })
    );
    const ruleHighlights = useRecoilValue(
        ruleBackgroundHighlightsStateFamily(transformationHash)
    ).filter((highlight) => highlight.ruleHash === ruleHash);

    return (
        <div
            key={ruleWrapper.hash}
            className={`rule ${ruleWrapper.hash}`}
            style={{
                position: 'relative',
                width: 'fit-content',
            }}
        >
            <RuleTextDiv
                className="rule_text txt-elem"
                $backgroundColor={
                    !multipleRules
                        ? 'transparent'
                        : ruleHighlights[0]?.color
                }
                dangerouslySetInnerHTML={{
                    __html: ruleWrapper.str_
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/\n/g, '<br>'),
                }}
            />
            {multipleRules ? (
                <RuleHighlightDotContainer
                    transformationHash={transformationHash}
                    ruleHash={ruleHash}
                />
            ) : null}
        </div>
    );
}

Rule.propTypes = {
    transformationId: PropTypes.number,
    transformationHash: PropTypes.string,
    ruleHash: PropTypes.string,
    multipleRules: PropTypes.bool,
};

export function RowHeader(props) {
    const {transformationId, transformationHash} = props;
    const colorPalette = useRecoilValue(colorPaletteState);
    const [recoilTransformation] = useRecoilValue(
        waitForAll([transformationStateFamily(transformationId)])
    );
    const ruleHashes = recoilTransformation.rules.hash;
        
    return (
        <div
            style={{
                backgroundColor: colorPalette.primary,
                color: colorPalette.light,
                borderColor: colorPalette.primary,
            }}
            className="txt-elem row_header"
        >
            {typeof transformationId === 'undefined' ? null : (
                <Suspense fallback={<div>Loading...</div>}>
                    {ruleHashes.map((rh) => {
                        return (
                            <Rule
                                key={rh}
                                transformationId={transformationId}
                                transformationHash={transformationHash}
                                ruleHash={rh}
                                multipleRules={ruleHashes.length > 0}
                            />
                        );
                    })}
                </Suspense>
            )}
        </div>
    );
}

RowHeader.propTypes = {
    /**
     * The rule wrapper of the transformation
     */
    transformationId: PropTypes.number,
    /**
     * The rule hash of the transformation
     */
    transformationHash: PropTypes.string,
};
