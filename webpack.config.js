const path = require('path');
const MiniCSSExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
	mode: 'development',
    entry: './src/scripts-es6/cryptopunk.main.js',
    output: {
        filename: 'scripts/cryptopunk.js',
        path: path.resolve(__dirname, 'deploy')
	},
	performance: { hints: false },

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
                use: [
					{
						loader: MiniCSSExtractPlugin.loader
					},
					'css-loader',
					'sass-loader'
				]
            },
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader'
            }
        ]
    },
    plugins: [
        new MiniCSSExtractPlugin({
			filename: 'styles/[name].css'
		}),
        new CopyPlugin([
            { from: "src/cryptopunk.html" }
        ])
    ]
};
