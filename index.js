const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp-promise')
// const compileToHTML = require('./lib/compile-to-html')
const Prerenderer = require('./lib/prerenderer')

function SimpleHtmlPrecompiler (options) {
  this._options = options || {}

  if (options.inject && !options.injectName) options.injectName = '__PRERENDER_INJECTED'
}

SimpleHtmlPrecompiler.prototype.apply = function (compiler) {
  compiler.plugin('after-emit', (compilation, done) => {
    // For backwards-compatibility with prerender-spa-plugin
    if (!this.routes && this.paths) this.routes = this.paths

    const PrerendererInstance = new Prerenderer(this._options)

    PrerendererInstance.initialize()
    .then(() => {
      return PrerendererInstance.renderRoutes(this._options.routes || [], this._options)
    })
    .then(renderedRoutes => {
      const {route, html} = renderedRoutes

      if (this._options.postProcessHtml) {
        renderedRoutes.html = this._options.postProcessHtml({
          html,
          route
        })
      }

      return renderedRoutes
    })
    .then(processedRoutes => {
      const promises = Promise.all(processedRoutes.map(processedRoute => {
        const outputDir = path.join(this._options.outputDir || this._options.staticDir, processedRoute.route)
        const outputFile = path.join(outputDir, 'index.html')

        return mkdirp(outputDir)
        .then(() => {
          return new Promise((resolve, reject) => {
            fs.writeFile(outputFile, processedRoute.html.trim(), err => {
              if (err) reject(`[PrerenderChromePlugin] Unable to write rendered route to file "${outputFile}" \n ${err}`)
            })

            resolve()
          })
        })
        .catch(err => {
          if (typeof err === 'string') {
            err = `[PrerenderChromePlugin] Unable to create directory ${outputDir} for route ${processedRoute.route}. \n ${err}`
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
      console.error('[PrerenderChromePlugin] Unable to prerender all routes!')
      setTimeout(function () { throw err })
    })
  })
}

module.exports = SimpleHtmlPrecompiler
