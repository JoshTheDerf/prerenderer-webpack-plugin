const Server = require('./server')
const Renderer = require('./renderers/chrome')
const PortFinder = require('portfinder')

class Prerenderer {
  constructor (options) {
    this._options = options || {}
    this._server = null
    this._renderer = null
  }

  async initialize () {
    this._server = new Server(this._options)
    this._renderer = new Renderer(this._options)

    // Initialization is separate from construction because... Science?
    this._options.serverPort = this._options.serverPort || await PortFinder.getPortPromise() || 13010
    await this._server.initialize()

    this._options.rendererPort = this._options.rendererPort || await PortFinder.getPortPromise() || 13020
    await this._renderer.initialize()

    return Promise.resolve()
  }

  destroy () {
    this._renderer.destroy()
    this._server.destroy()
  }

  renderRoutes (routes) {
    return this._renderer.renderRoutes(routes)
    .then(r => {
      return r
    })
  }
}

module.exports = Prerenderer
