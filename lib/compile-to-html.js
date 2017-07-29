var Hapi = require('hapi')
var Inert = require('inert')
var Path = require('path')
var ChildProcess = require('child_process')
var PortFinder = require('portfinder')
const waitPort = require('wait-port')
const renderPage = require('./page-renderer')

const platformCommands = {
  darwin: [
    'open -a "Google Chrome"'
  ],
  win32: [
    'start chrome'
  ],
  linux: [
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser'
  ]
}

/**
 * Attempts to find a valid instance of chrome on the user's system by guessing commands and seeing if any work. Really hacky.
 * It's much preferred that you set the chromeInstance option instead.
 *
 * @param {String} platform An optional platform name to look for. Mostly used for testing.
 * @returns {Promise<string>} The command used to launch chrome.
 */
async function getDefaultChromeInstance (platform) {
  if (platformCommands[platform || process.platform]) {
    let foundValid = false

    const promises = platformCommands[platform || process.platform].map(command => {
      return new Promise((resolve, reject) => {
        // Spawn a new process to attempt to detect if the binary exists.
        const proc = ChildProcess.exec(`${command} --headless`, (error) => {
          if (!error && !foundValid) {
            // Found a valid command.
            proc.kill()
            foundValid = true
            resolve(command)
          }

          resolve(null)
        })
      })
    })

    return Promise.all(promises)
    .then(result => {
      const command = result.find(r => !!r)
      console.info(`Found Valid Chrome Binary: ${command}`)

      return command
    })
  }

  Promise.resolve(null)
}

module.exports = function (staticDir, route, options, callback) {
  const serveAndPrerenderRoute = async function () {
    try {
      let serverPort = options.serverPort || await PortFinder.getPortPromise()
      if (!serverPort) serverPort = 8181

      const maxLaunchRetries = options.maxLaunchRetries || 5

      const Server = new Hapi.Server({
        connections: {
          routes: {
            files: {
              relativeTo: staticDir
            }
          }
        }
      })

      Server.connection({ port: serverPort })

      Server.register(Inert, function (error) {
        if (error) throw error
        var indexPath = options.indexPath ? options.indexPath : Path.join(staticDir, 'index.html')

        Server.route({
          method: 'GET',
          path: route,
          handler: function (request, reply) {
            reply.file(
              indexPath
            )
          }
        })

        Server.route({
          method: 'GET',
          path: '/{param*}',
          handler: {
            directory: {
              path: '.',
              redirectToSlash: true,
              index: true,
              showHidden: true
            }
          }
        })

        Server.start(async function (error) {
          // If port is already bound, try again with another port
          if (error) return serveAndPrerenderRoute()

          let devToolsPort = options.devToolsPort || await PortFinder.getPortPromise()
          if (!devToolsPort) devToolsPort = 9222

          const chromeInstance = options.chromeInstance || await getDefaultChromeInstance()
          const splitInstance = chromeInstance ? chromeInstance.split(' ') : null

          if (!splitInstance) {
            callback()
            throw new Error('Unable to start Chrome. (Did you forget to set the chromeInstance option?)')
          }

          var browserArguments = [
            ...splitInstance.slice(1),
            '--headless',
            `--remote-debugging-port=${devToolsPort}`
          ]

          if (options.browserArguments) {
            browserArguments.unshift(options.browserArguments)
          }

          const createRenderProcess = function (maxRetries) {
            return new Promise((resolve, reject) => {
              const proc = ChildProcess.spawn(
                splitInstance[0],
                browserArguments,
                {maxBuffer: 1048576}
              )

              let hasPort = false

              proc.on('close', () => {
                if (hasPort === true) return

                if (maxRetries <= 0) {
                  reject(new Error('Unable to start Chrome. (Did you forget to set the chromeInstance option?)'))
                  return
                }

                maxRetries--

                createRenderProcess(maxRetries)
                .then(proc => resolve(proc))
              })

              proc.stdout.on('data', (d) => {
                console.log(`Chrome STDOUT: ${d}`)
              })

              proc.stderr.on('data', d => {
                console.log(`Chrome STDERR: ${d}`)
              })

              waitPort({
                host: 'localhost',
                port: devToolsPort
              })
              .then(portDetected => {
                hasPort = portDetected
                resolve(proc)
              })
            })
          }

          createRenderProcess(maxLaunchRetries)
          .then(async function (proc) {
            return {
              proc,
              rendered: await renderPage({
                url: `http://localhost:${serverPort}${route}`,
                devToolsHost: 'localhost',
                devToolsPort,
                options
              })
            }
          })
          .then(renderResponse => {
            const {proc, rendered} = renderResponse

            Server.stop()
            proc.kill()

            callback(rendered)
          })
          .catch(e => {
            console.error(e)
          })
        })
      })
    } catch (e) {
      throw e
    }
  }
  serveAndPrerenderRoute()
}
