const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
	mode: 'production',
    entry: './benchmarks/scripts-es6/hashes.js',
	performance: { hints: false },
    output: {
        filename: 'scripts/hashes.js',
        path: path.resolve(__dirname, 'benchmarks')
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader'
            }
        ]
    },
    plugins: [
        new CopyPlugin([
            { from: "node_modules/lodash/lodash.min.js", to: "libs" },
            { from: "node_modules/benchmark/benchmark.js", to: "libs" }
        ])
    ]
};