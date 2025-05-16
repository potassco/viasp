const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const commonConfig = require('./webpack.config.js');
const colorPalette = require('./viasp_dash/colorPalette.json');
const frontend_config = require('./viasp_dash/config.json');

module.exports = (env, argv) => {
    const config = commonConfig(env, argv);

    config.mode = 'development';
    config.devtool = 'inline-source-map';
    config.devServer = {
        static: {
            directory: path.join(__dirname, '/'),
        },
        hot: true,
        open: true,
        port: 8050,
    };

    config.plugins = [
        ...config.plugins,
        new HtmlWebpackPlugin({
            template: './index.html',
            filename: 'index.html',
        }),
        new webpack.DefinePlugin({
            'window.colorTheme': JSON.stringify(colorPalette.colorThemes),
            'window.config': JSON.stringify(frontend_config),
            'window.backendURL': JSON.stringify('http://127.0.0.1:5050'),
        }),
    ];

    return config;
};
