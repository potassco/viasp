import React from "react";
import PropTypes from "prop-types";
import {useColorPalette} from "../contexts/ColorPalette";
import { RULEWRAPPER } from "../types/propTypes";

export function RowHeader(props) {
    const { ruleWrapper } = props;
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
            {ruleWrapper.map(({rule, highlight}) => (
                <div
                    key={rule}
                    style={{whiteSpace: 'pre-wrap', padding: '4px 0', fontWeight: highlight ? 'bold' : 'normal'}}
                    dangerouslySetInnerHTML={{
                        __html: rule
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/\n/g, '<br>'),
                    }}
                />
            ))}
        </div>
    );
}

RowHeader.propTypes = {
    /**
     * The rule wrapper of the transformation
     */
    ruleWrapper: PropTypes.arrayOf(RULEWRAPPER),
};
