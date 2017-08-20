const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: './src/scripts-es6/cryptopunk.main.js',
    output: {
        filename: 'scripts/cryptopunk.js',
        path: path.resolve(__dirname, 'deploy')
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                enforce: 'pre',
                exclude: /node_modules/,
                loader: 'eslint-loader'
            },
            {
                test: /\.scss$/,
                use: ExtractTextPlugin.extract({
                    fallback: 'style-loader',
                    use: ['css-loader', 'sass-loader']
                })
            },
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader'
            }
        ]
    },
    plugins: [
        new ExtractTextPlugin('styles/[name].css'),
        new CopyPlugin([
            { from: "src/cryptopunk.html" }
        ])
    ]
};
