import React from 'react';
import PropTypes from 'prop-types';
import {RULEWRAPPER} from '../types/propTypes';
import * as Constants from '../constants';
import {useColorPalette} from '../contexts/ColorPalette';
import {useHighlightedSymbol} from '../contexts/HighlightedSymbol';

const checkNewArrayHasNoNewElements = (oldArray, newArray) => {
    if (oldArray === newArray) {
        return true;
    }
    if (oldArray === null || newArray === null) {
        return false;
    }

    // Check if the new array is produced by removing element from the old array
    if (newArray.length < oldArray.length) {
        for (let i = 0; i < newArray.length; ++i) {
            if (oldArray.indexOf(newArray[i]) === -1) {
                return false;
            }
        }
        return true;
    }

    if (oldArray.length !== newArray.length) {
        return false;
    }

    for (let i = 0; i < oldArray.length; ++i) {
        if (oldArray[i] !== newArray[i]) {
            return false;
        }
    }
    return true;
};

const arraysEqual = (oldArray, newArray) => {
    if (oldArray === newArray) {
        return true;
    }
    if (oldArray === null || newArray === null) {
        return false;
    }

    if (oldArray.length !== newArray.length) {
        return false;
    }

    for (let i = 0; i < oldArray.length; ++i) {
        if (oldArray[i] !== newArray[i]) {
            return false;
        }
    }
    return true;
}

function Rule(props) {
    const {
        ruleWrapper: {hash, rule},
        multipleRules,
    } = props;
    const {highlightedRule, backgroundHighlightColor} = useHighlightedSymbol();

    const [thisRuleHighlightDotColors, setThisRuleHighlightDotColors] =
        React.useState([]);

    const thisRuleHighlightDotColorsRef = React.useRef(thisRuleHighlightDotColors);
    React.useEffect(() => {
        thisRuleHighlightDotColorsRef.current = thisRuleHighlightDotColors;
    });

    
    
    React.useEffect(() => {
        if (!multipleRules) {
            setThisRuleHighlightDotColors([]);
        }
        else {
            const newHighlightColors = highlightedRule
            .map((r) => (r.rule_hash === hash ? r.color : ''))
            .filter((e) => e !== '');
            if (!arraysEqual(thisRuleHighlightDotColorsRef.current, newHighlightColors)) {
                setThisRuleHighlightDotColors(newHighlightColors);
            }
        }
    }, [highlightedRule, hash, multipleRules]);
    
    return (
        <div
            key={hash}
            className={`rule ${hash}`}
            style={{
                position: 'relative',
                width: 'fit-content',
            }}
        >
            <div
                key={rule}
                className="rule_text"
                style={{
                    backgroundColor: multipleRules ? backgroundHighlightColor[hash] : 'transparent',
                }}
                dangerouslySetInnerHTML={{
                    __html: rule
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/\n/g, '<br>'),
                }}
            />
            {thisRuleHighlightDotColors.map((hc, i) => (
                <span
                    key={i}
                    className="rule_highlight_dot"
                    style={{
                        backgroundColor: hc,
                        marginLeft: `${
                            Constants.hSpacing + i * Constants.hSpacing
                        }px`,
                        transform: `translateY(${
                            i % 2 === 0 ? '-80%' : '-20%'
                        })`,
                    }}
                />
            ))}
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
