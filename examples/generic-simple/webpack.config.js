var Path = require('path')
var CopyWebpackPlugin = require('copy-webpack-plugin')
var PrerenderSpaPlugin = require('../../index.js')

module.exports = {
  entry: [ './src/main.js' ],
  output: {
    path: './dist',
    filename: '[name].js'
  },
  plugins: [
    new CopyWebpackPlugin([{
      from: 'src/static',
      to: '.'
    }]),
    new PrerenderSpaPlugin({
      staticDir: Path.join(__dirname, 'dist'),
      outputDir: Path.join(__dirname, 'prerendered'),
      routes: [ '/', '/test', '/deep/long/route' ],
      // injectName: '__PRERENDER_INJECTED',
      inject: {
        injectedProperty: 'Example'
      }
    })
  ]
}
