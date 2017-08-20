const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

const jsPreRule = {
    test: /\.js$/,
    enforce: 'pre',
    exclude: /node_modules/,
    loader: 'eslint-loader'
};

const jsRule = {
    test: /\.js$/,
    exclude: /node_modules/,
    loader: 'babel-loader'
};

const scssRule = {
    test: /\.scss$/,
    use: ExtractTextPlugin.extract({
        fallback: 'style-loader',
        use: ['css-loader', 'sass-loader']
    })
}

const mainConfig = {
    entry: './src/scripts-es6/cryptopunk.main.js',
    output: {
        filename: 'scripts/cryptopunk.js',
        path: path.resolve(__dirname, 'deploy')
    },
    module: {
        rules: [
            jsPreRule,
            scssRule,
            jsRule
        ]
    },
    plugins: [
        new ExtractTextPlugin('styles/[name].css'),
        new CopyPlugin([
            { from: "src/cryptopunk.html" }
        ])
    ]
};

const vectorsConfig = {
    entry: './src/scripts-es6/cryptopunk.testvector-transforms.js',
    output: {
        filename: 'transforms.js',
        path: path.resolve(__dirname, 'vectors')
    },
    module: {
        rules: [jsRule]
    }
};

module.exports = [mainConfig, vectorsConfig];