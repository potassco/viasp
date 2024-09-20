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
    const {
        backgroundHighlightColor,
        ruleDotHighlightColor,
        unmarkInsertedSymbolHighlightDot,
        removeDeletedSymbolHighlightDot,
    } = useHighlightedSymbol();

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
                    backgroundColor: multipleRules
                        ? backgroundHighlightColor[hash]
                        : 'transparent',
                }}
                dangerouslySetInnerHTML={{
                    __html: rule
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/\n/g, '<br>'),
                }}
            />
            {!ruleDotHighlightColor[hash] || !multipleRules
                ? null
                : ruleDotHighlightColor[hash].map((hc, i) => (
                      <span
                          key={`${hash}_${hc.color}_${i}`}
                          className={`rule_highlight_dot 
                                ${hc.markedForInsertion ? 'fade-in' : ''}
                                ${hc.markedForDeletion ? 'fade-out' : ''}
                            `}
                          style={{
                              backgroundColor: hc.color,
                              marginLeft: `${
                                  Constants.hSpacing + i * Constants.hSpacing
                              }px`,
                              animationDuration: `${Constants.ruleHighlightFadeDuration}ms`,
                          }}
                          onAnimationEnd={(e) => {
                              if (e.target.className.includes('fade-out')) {
                                  removeDeletedSymbolHighlightDot(
                                      hash,
                                      hc.color,
                                      ruleDotHighlightColor
                                  );
                              }
                              if (e.target.className.includes('fade-in')) {
                                  unmarkInsertedSymbolHighlightDot(
                                      hash,
                                      hc.color,
                                      ruleDotHighlightColor
                                  );
                              }
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
