import React from 'react';
import PropTypes from 'prop-types';
import {RULEWRAPPER} from '../types/propTypes';
import * as Constants from '../constants';
import {useColorPalette} from '../contexts/ColorPalette';
import {Transition} from 'react-transition-group';
import { useTransformations, unmarkInsertedSymbolHighlightDot, removeDeletedSymbolHighlightDot } from '../contexts/transformations';
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
    10% {
        background-color: var(--highlight-color);
    }
    90% {
        background-color: var(--highlight-color);
    }
    100% {
        background-color: transparent;
    }
`;

const RuleTextDiv = styled.div`
    white-space: pre-wrap;
    padding: 4px 0;
    position: relative;
    width: fit-content;
    border-radius: 7px;
    transition: background-color 1s ease;
    ${({highlight}) =>
        highlight
        ? css`
            animation: ${highlightAnimation} 3s ease;
            --highlight-color: ${highlight};
        `
        : ''}
`;

function Rule(props) {
    const {
        ruleWrapper: {hash, rule},
        multipleRules,
    } = props;
    const {dispatch: dispatchT, state: {explanationHighlightedRules}} = useTransformations();
    const [thisRuleExplanationHighlights, setThisRuleExplanationHighlights] = React.useState([]);

    React.useEffect(() => {
        if (explanationHighlightedRules) {
            setThisRuleExplanationHighlights(explanationHighlightedRules.filter(
                (rh) => rh.rule_hash === hash
            ));
        }
    }, [explanationHighlightedRules, hash, setThisRuleExplanationHighlights]);

    React.useEffect(() => {
        if (thisRuleExplanationHighlights.length > 0) {
            // console.log({thisRuleExplanationHighlights});
        }
    }, [thisRuleExplanationHighlights]);

    const [highlightColor, setHighlightColor] = React.useState(null);
    React.useEffect(() => {
        if (thisRuleExplanationHighlights.length > 0) {
            const latestHighlight =
                thisRuleExplanationHighlights[
                    thisRuleExplanationHighlights.length - 1
                ];
            setHighlightColor(latestHighlight.color);
            const timer = setTimeout(() => setHighlightColor(null), Constants.ruleHighlightDuration);
            return () => {
                setHighlightColor(null);
                clearTimeout(timer);
            };
        }
        return () => {};
    }, [thisRuleExplanationHighlights]);

    

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
                // key={rule}
                className="rule_text"
                highlight={highlightColor}
                dangerouslySetInnerHTML={{
                    __html: rule
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/\n/g, '<br>'),
                }}
            />
            <RuleHighlightDotContainer hash={hash} thisRuleExplanationHighlights={thisRuleExplanationHighlights} />
        </div>
    );
    // return (
    //     <div
    //         key={hash}
    //         className={`rule ${hash}`}
    //         style={{
    //             position: 'relative',
    //             width: 'fit-content',
    //         }}
    //     >
    //         <div
    //             key={rule}
    //             className="rule_text"
    //             style={{
    //                 backgroundColor:
    //                     multipleRules &&
    //                     thisRuleExplanationHighlights[
    //                         thisRuleExplanationHighlights.length - 1
    //                     ]?.markedForInsertion
    //                         ? thisRuleExplanationHighlights[
    //                               thisRuleExplanationHighlights.length - 1
    //                           ]?.color
    //                         : 'transparent',
    //             }}
    //             dangerouslySetInnerHTML={{
    //                 __html: rule
    //                     .replace(/</g, '&lt;')
    //                     .replace(/>/g, '&gt;')
    //                     .replace(/\n/g, '<br>'),
    //             }}
    //         />
    //         {!thisRuleExplanationHighlights || !multipleRules
    //             ? null
    //             : thisRuleExplanationHighlights.map((hc, i) => 
    //                       <span
    //                           key={`${hash}_${hc.color}_${i}`}
    //                           className={`rule_highlight_dot 
    //                             ${hc.markedForInsertion ? 'fade-in' : ''}
    //                             ${hc.markedForDeletion ? 'fade-out' : ''}
    //                         `}
    //                           style={{
    //                               backgroundColor: hc.color,
    //                               marginLeft: `${
    //                                   Constants.hSpacing +
    //                                   i * Constants.hSpacing
    //                               }px`,
    //                               animationDuration: `${Constants.ruleHighlightFadeDuration}ms`,
    //                           }}
    //                             onAnimationEnd={(e) => {
    //                                 if (e.target.className.includes('fade-out')) {
    //                                     removeDeletedSymbolHighlightDot(
    //                                         hash,
    //                                         hc.color,
    //                                         ruleDotHighlightColor
    //                                     );
    //                                     dispatchT(

    //                                     )
    //                                 }
    //                                 if (e.target.className.includes('fade-in')) {
    //                                     dispatchT(unmarkInsertedSymbolHighlightDot(
    //                                           hash,
    //                                           hc.color,
    //                                           ruleDotHighlightColor
    //                                     ));
    //                                 }
    //                             }}
    //                       />
    //               )}
    //     </div>
    // );
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
                        multipleRules={true} //{ruleWrappers.length > 1}
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
