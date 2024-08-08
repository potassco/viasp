import React from 'react';
import PropTypes from 'prop-types';
import {useColorPalette} from '../contexts/ColorPalette';
import {RULEWRAPPER} from '../types/propTypes';
import {useHighlightedSymbol} from '../contexts/HighlightedSymbol';

export function RowHeader(props) {
    const {ruleWrapper} = props;
    const colorPalette = useColorPalette();
    const {highlightedRule} = useHighlightedSymbol();
    const hSpacing = 5;

    return (
        <div
            style={{
                backgroundColor: colorPalette.primary,
                color: colorPalette.light,
                borderColor: colorPalette.primary,
            }}
            className="txt-elem row_header"
        >
            {ruleWrapper.map(({rule, hash}) => {
                const thisRuleHighlightColors = highlightedRule
                    .map((r) => (r.rule_hash === hash ? r.color : ''))
                    .filter((e) => e !== '');
                return (
                    <div
                        key={hash}
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
                        {thisRuleHighlightColors.map((hc, i) => (
                            <span
                                key={i}
                                className='rule_highlight'
                                style={{
                                    backgroundColor: hc,
                                    marginLeft: `${
                                        2 * hSpacing + i * hSpacing
                                    }px`,
                                    transform: `translateY(${
                                        i % 2 === 0 ? '-80%' : '-20%'
                                    })`,
                                }}
                            />
                        ))}
                    </div>
                );
            })}
        </div>
    );
}

RowHeader.propTypes = {
    /**
     * The rule wrapper of the transformation
     */
    ruleWrapper: PropTypes.arrayOf(RULEWRAPPER),
};
