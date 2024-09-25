import React from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@iconify/react';
import clockwiseVerticalArrows from '@iconify/icons-emojione-monotone/clockwise-vertical-arrows';
import dragHandleRounded from '@iconify/icons-material-symbols/drag-handle-rounded';
import arrowDownSLine from '@iconify/icons-ri/arrow-down-s-line';
import closeLine from '@iconify/icons-ri/close-line';
import search from '@iconify/icons-ri/search-line';

export default function IconWrapper(props) {
    const {icon, ...rest} = props;
    if (icon === 'clockwiseVerticalArrows') {
        return <Icon icon={clockwiseVerticalArrows} {...rest} />;
    }
    if (icon === 'dragHandleRounded') {
        return <Icon icon={dragHandleRounded} {...rest} />;
    }
    if (icon === 'arrowDownDoubleFill') {
        return <Icon icon={arrowDownSLine} {...rest} />;
    }
    if (icon === 'search') {
        return <Icon icon={search} {...rest} />;
    }
    if (icon === 'close') {
        return <Icon icon={closeLine} {...rest} />;
    }
    return <Icon {...props} />;
}

IconWrapper.propTypes = {
    /**
     * Name of the icon to be displayed
     **/
    icon: PropTypes.string,
    /**
     * Additional props to be passed to the Icon component
     **/
    rest: PropTypes.object,
};