const path = require('path');

module.exports = {
	mode: 'production',
	entry: './src/scripts-es6/cryptopunk.testvector-transforms.js',
	performance: { hints: false },
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