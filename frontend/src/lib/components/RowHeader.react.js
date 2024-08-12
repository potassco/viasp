import React from 'react';
import PropTypes from 'prop-types';
import {RULEWRAPPER} from '../types/propTypes';
import * as Constants from '../constants';
import {useColorPalette} from '../contexts/ColorPalette';
import {useHighlightedSymbol} from '../contexts/HighlightedSymbol';

function Rule(props) {
    const {ruleWrapper} = props;
    const {highlightedRule} = useHighlightedSymbol();
    // const [thisRuleHighlightColors, setThisRuleHighlightColors] =
    //     React.useState([]);

    // React.useEffect(() => {
    //     setThisRuleHighlightColors(
    //         highlightedRule
    //             .map((r) => (r.rule_hash === ruleWrapper.hash ? r.color : ''))
    //             .filter((e) => e !== '')
    //     );
    // }, [highlightedRule, ruleWrapper.hash]);

    const thisRuleHighlightColors = 
            highlightedRule
                .map((r) => (r.rule_hash === ruleWrapper.hash ? r.color : ''))
                .filter((e) => e !== '')

    return (
        <div
            key={ruleWrapper.hash}
            style={{position: 'relative', width: 'fit-content'}}
        >
            <div
                key={ruleWrapper.rule}
                style={{
                    whiteSpace: 'pre-wrap',
                    padding: '4px 0',
                    position: 'relative',
                    width: 'fit-content',
                }}
                dangerouslySetInnerHTML={{
                    __html: ruleWrapper.rule
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/\n/g, '<br>'),
                }}
            />
            {thisRuleHighlightColors.map((hc, i) => (
                <span
                    key={i}
                    className="rule_highlight"
                    style={{
                        backgroundColor: hc,
                        marginLeft: `${2 * Constants.hSpacing + i * Constants.hSpacing}px`,
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
};

export function RowHeader(props) {
    const {ruleWrapper} = props;
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
            {ruleWrapper.map((rw) => {
                return <Rule key={rw.hash} ruleWrapper={rw} />;
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
