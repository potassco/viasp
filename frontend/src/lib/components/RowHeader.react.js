import React from 'react';
import PropTypes from 'prop-types';
import {RULEWRAPPER} from '../types/propTypes';
import { Constants } from "../constants";
import {useColorPalette} from '../contexts/ColorPalette';
import {Transition} from 'react-transition-group';
import { useTransformations } from '../contexts/transformations';
import {styled, keyframes, css} from 'styled-components';


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
    const {hash, thisRuleExplanationHighlights} = props;

    return (
        <RuleHighlightDotContainerDiv>
            {thisRuleExplanationHighlights.map((dot, i) => (
                <Transition
                    key={`${hash}_${dot.color}_${i}`}
                    mountOnEnter
                    unmountOnExit
                    appear={true}
                    in={dot.shown}
                    timeout={{enter: 0, appear:0, exit: Constants.ruleHighlightFadeDuration}}
                >
                    {(state) => (
                        <RuleHighlightDot
                            state={state}
                            color={dot.color}
                        />
                    )}
                </Transition>
            ))}
        </RuleHighlightDotContainerDiv>
    );
}

RuleHighlightDotContainer.propTypes = {
    hash: PropTypes.string,
    thisRuleExplanationHighlights: PropTypes.array,
};

const highlightAnimation = keyframes`
    0% {
        background-color: transparent;
    }
    20% {
        background-color: var(--highlight-color);
    }
    80% {
        background-color: var(--highlight-color);
    }
    100% {
        background-color: transparent;
    }
`;

const RuleTextDiv = styled.div`
    white-space: pre-wrap;
    padding: 0.3em 0;
    position: relative;
    width: fit-content;
    border-radius: 7px;
    transition: background-color 1s ease;
    ${(props) =>
        props.$highlight
            ? css`
                  animation: ${highlightAnimation} 3s ease;
                  --highlight-color: ${props.$highlight};
              `
            : ''}
`;

function Rule(props) {
    const {
        ruleWrapper: {hash, rule},
        multipleRules,
    } = props;
    const {state: {explanationHighlightedRules}} = useTransformations();
    const [thisRuleExplanationHighlights, setThisRuleExplanationHighlights] = React.useState([]);

    React.useEffect(() => {
        if (explanationHighlightedRules) {
            setThisRuleExplanationHighlights(explanationHighlightedRules.filter(
                (rh) => rh.rule_hash === hash
            ));
        }
    }, [explanationHighlightedRules, hash, setThisRuleExplanationHighlights]);

    const [highlightColor, setHighlightColor] = React.useState(null);
    React.useEffect(() => {
        if (multipleRules && thisRuleExplanationHighlights.length > 0) {
            const latestHighlight = thisRuleExplanationHighlights
                .map((rh) => rh.ruleBackgroundHighlight)
                .filter((h) => h !== 'transparent')
                .pop();
            setHighlightColor(latestHighlight);
        }
        return () => {};
    }, [thisRuleExplanationHighlights, multipleRules]);

    return (
        <div
            key={hash}
            className={`rule ${hash}`}
            style={{
                position: 'relative',
                width: 'fit-content',
            }}
        >
            <RuleTextDiv
                className="rule_text txt-elem"
                $highlight={highlightColor}
                dangerouslySetInnerHTML={{
                    __html: rule
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/\n/g, '<br>'),
                }}
            />
            {multipleRules ? (
                <RuleHighlightDotContainer
                    hash={hash}
                    thisRuleExplanationHighlights={
                        thisRuleExplanationHighlights
                    }
                />
            ) : null}
        </div>
    );
}

Rule.propTypes = {
    ruleWrapper: RULEWRAPPER,
    multipleRules: PropTypes.bool,
};

export function RowHeader(props) {
    const {ruleWrappers} = props;
    const colorPalette = useColorPalette();

    return (
        <div
            style={{
                backgroundColor: colorPalette.primary,
                color: colorPalette.light,
                borderColor: colorPalette.primary,
            }}
            className="txt-elem row_header"
        >
            {ruleWrappers.map((rw) => {
                return (
                    <Rule
                        key={rw.hash}
                        ruleWrapper={rw}
                        multipleRules={ruleWrappers.length > 1}
                    />
                );
            })}
        </div>
    );
}

RowHeader.propTypes = {
    /**
     * The rule wrapper of the transformation
     */
    ruleWrappers: PropTypes.arrayOf(RULEWRAPPER),
};
