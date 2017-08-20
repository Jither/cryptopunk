const path = require('path');

module.exports = {
    entry: './src/scripts-es6/cryptopunk.testvector-transforms.js',
    output: {
        filename: 'transforms.js',
        path: path.resolve(__dirname, 'vectors')
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader'
            }
        ]
    }
};