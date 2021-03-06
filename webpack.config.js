'use strict';

const webpack = require('webpack');
const path = require('path');

module.exports = {
    mode: 'production',
    entry: {
        bundle: '/dist/app.js',
        beets: '/dist/beets.js'
    },
    output: {
        path: path.resolve(__dirname, 'docs/js'),
        filename: '[name].min.js'
    },
    resolve: {
        fallback: {
            fs: false,
            path: false,
            http: require.resolve('stream-http'),
            url: require.resolve('url/'),
            https: require.resolve('https-browserify'),
            zlib: require.resolve('browserify-zlib'),
            assert: require.resolve('assert/'),
            stream: require.resolve('stream-browserify'),
            os: require.resolve('os-browserify'),
            buffer: require.resolve('buffer'),
            crypto: require.resolve('crypto-browserify')
        }
    },
    plugins: [
        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery',
            'window.jQuery': 'jquery'
        }),
        new webpack.ProvidePlugin({
            process: 'process/browser'
        }),
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer']
        })
    ],
    module: {
        rules: [
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            },
            {
                test: require.resolve('jquery'),
                loader: 'expose-loader',
                options: {
                    exposes: ['$', 'jQuery']
                }
            }
        ]
    },
    target: 'web'
};
