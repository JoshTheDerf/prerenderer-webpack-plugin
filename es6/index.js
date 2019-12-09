const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp-promise')
const Prerenderer = require('@prerenderer/prerenderer')

function PrerendererWebpackPlugin (...args) {
  // Normal args object.
  if (args.length === 1) {
    this._options = args[0] || {}

  // Backwards-compatibility with prerender-spa-plugin
  } else {
    let staticDir, routes

    args.forEach(arg => {
      if (typeof arg === 'string') staticDir = arg
      else if (Array.isArray(arg)) routes = arg
      else if (typeof arg === 'object') this._options = arg
    })

    staticDir ? this._options.staticDir = staticDir : null
    routes ? this._options.routes = routes : null
  }

  if (!this.options) this.options = {}
  this._options.server = this._options.server || {}
}

PrerendererWebpackPlugin.prototype.apply = function (compiler) {
  compiler.plugin('after-emit', (compilation, done) => {
    // For backwards-compatibility with prerender-spa-plugin
    if (!this.routes && this.paths) this.routes = this.paths

    const PrerendererInstance = new Prerenderer(this._options)

    PrerendererInstance.initialize()
    .then(() => {
      return PrerendererInstance.renderRoutes(this._options.routes || [])
    })
    .then(renderedRoutes => {
      return this._options.postProcessHtml ? this._options.postProcessHtml(renderedRoutes) : renderedRoutes
    })
    .then(processedRoutes => {
      const promises = Promise.all(processedRoutes.map(processedRoute => {
        const outputDir = path.join(this._options.outputDir || this._options.staticDir, processedRoute.route)
        const outputFile = path.join(outputDir, 'index.html')

        return mkdirp(outputDir)
        .then(() => {
          return new Promise((resolve, reject) => {
            fs.writeFile(outputFile, processedRoute.html.trim(), err => {
              if (err) reject(`[PrerendererWebpackPlugin] Unable to write rendered route to file "${outputFile}" \n ${err}`)
            })

            resolve()
          })
        })
        .catch(err => {
          if (typeof err === 'string') {
            err = `[PrerendererWebpackPlugin] Unable to create directory ${outputDir} for route ${processedRoute.route}. \n ${err}`
          }

          setTimeout(function () { throw err })
        })
      }))

      return promises
    })
    .then(r => {
      PrerendererInstance.destroy()
      done()
    })
    .catch(err => {
      PrerendererInstance.destroy()
      console.error('[PrerendererWebpackPlugin] Unable to prerender all routes!')
      setTimeout(function () { throw err })
    })
  })
}

module.exports = PrerendererWebpackPlugin
