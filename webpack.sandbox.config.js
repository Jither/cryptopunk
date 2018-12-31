const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
	mode: 'development',
    entry: './src/scripts-es6/sandbox.js',
    output: {
        filename: 'scripts/sandbox.js',
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
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader'
            }
        ]
    },
    plugins: [
        new CopyPlugin([
            { from: "src/sandbox.html" }
        ])
    ]
};
