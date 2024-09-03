import React from 'react';
import PropTypes from 'prop-types';
import {RULEWRAPPER} from '../types/propTypes';
import * as Constants from '../constants';
import {useColorPalette} from '../contexts/ColorPalette';
import {useHighlightedSymbol} from '../contexts/HighlightedSymbol';

function Rule(props) {
    const {
        ruleWrapper: {hash, rule},
        multipleRules,
    } = props;
    const {highlightedRule} = useHighlightedSymbol();

    const thisRuleHighlightColors = 
            highlightedRule
                .map((r) => (r.rule_hash === hash ? r.color : ''))
                .filter((e) => e !== '')

    return (
        <div
            key={hash}
            className={`rule ${hash}`}
            style={{position: 'relative', width: 'fit-content'}}
        >
            <div
                key={rule}
                style={{
                    whiteSpace: 'pre-wrap',
                    padding: '4px 0',
                    position: 'relative',
                    width: 'fit-content',
                }}
                dangerouslySetInnerHTML={{
                    __html: rule
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/\n/g, '<br>'),
                }}
            />
            {!multipleRules ? null : thisRuleHighlightColors.map((hc, i) => (
                <span
                    key={i}
                    className="rule_highlight"
                    style={{
                        backgroundColor: hc,
                        marginLeft: `${Constants.hSpacing + i * Constants.hSpacing}px`,
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
                return <Rule key={rw.hash} ruleWrapper={rw} multipleRules={ruleWrappers.length > 1}/>;
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
