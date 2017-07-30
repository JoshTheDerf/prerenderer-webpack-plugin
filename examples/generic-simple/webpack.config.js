const Path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const PrerendererWebpackPlugin = require('../../index.js')
const ChromeRenderer = PrerendererWebpackPlugin.ChromeRenderer

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
    new PrerendererWebpackPlugin({
      staticDir: Path.join(__dirname, 'dist'),
      outputDir: Path.join(__dirname, 'prerendered'),
      routes: [ '/', '/about', '/some/deep/nested/route' ],

      renderer: new ChromeRenderer({
        inject: {
          foo: 'bar'
        }
      })
    })
  ]
}
