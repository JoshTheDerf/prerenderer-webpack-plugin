const childProcess = require('child_process')
const waitPort = require('wait-port')
const CRI = require('chrome-remote-interface')

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
 * It's much preferred that you set the browserCommand option instead.
 *
 * @param {String} platform An optional platform name to look for. Mostly used for testing.
 * @returns {Promise<string>} The command used to launch chrome.
 */
async function getChromeStartCommand (platform) {
  if (platformCommands[platform || process.platform]) {
    let foundValid = false

    const promises = platformCommands[platform || process.platform].map(command => {
      return new Promise((resolve, reject) => {
        // Spawn a new process to attempt to detect if the binary exists.
        const proc = childProcess.exec(`${command} --headless`, (error) => {
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

/**
 * Attempts to spawn a chrome renderer process using child_process.spawn. Retries up to five times.
 *
 * @param
 * @returns
 */
async function createRenderProcess (processArgs, renderPort, maxRetries) {
  return new Promise((resolve, reject) => {
    const proc = childProcess.spawn(
      processArgs[0],
      processArgs.slice(1),
      {maxBuffer: 1048576}
    )

    let hasPort = false

    proc.on('close', () => {
      if (hasPort === true) return

      if (maxRetries <= 0) {
        reject(new Error('[PrerenderChromePlugin] Unable to start Chrome. No more retries. (You should probably set the browserCommand option.)'))
        return
      }

      maxRetries--

      createRenderProcess(processArgs, renderPort, maxRetries)
      .then(proc => resolve(proc))
    })

    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'development') {
      proc.stdout.on('data', (d) => {
        console.info(`Chrome STDOUT: ${d}`)
      })

      proc.stderr.on('data', d => {
        console.error(`Chrome STDERR: ${d}`)
      })
    }

    waitPort({
      host: 'localhost',
      port: renderPort
    })
    .then(portDetected => {
      hasPort = portDetected
      resolve(proc)
    })
  })
}

async function prepareTab (connectionOptions, url, options) {
  return new Promise(async (resolve, reject) => {
    const tab = await CRI.New(connectionOptions)
    const client = await CRI(Object.assign({}, connectionOptions, {tab}))
    const {Page} = client

    await Page.enable()

    // Chrome 61+
    try {
      await Page.addScriptToEvaluateOnNewDocument({
        source: `(function () { window['${options.injectName}'] = ${JSON.stringify(options.inject)}; })();`
      })
    // Chrome 56 - 60?
    } catch (e) {
      await Page.addScriptToEvaluateOnLoad({
        scriptSource: `(function () { window['${options.injectName}'] = ${JSON.stringify(options.inject)}; })();`
      })
    }

    Page.domContentEventFired(() => {
      resolve({client, tab})
    })

    await Page.navigate({url})
  })
}

const getPageContents = function (options) {
  options = options || {}

  return new Promise((resolve, reject) => {
    function captureDocument () {
      const doctype = new window.XMLSerializer().serializeToString(document.doctype)
      const outerHTML = document.documentElement.outerHTML

      const result = {
        route: window.location.pathname,
        html: doctype + outerHTML
      }

      return JSON.stringify(result)
    }

    // CAPTURE WHEN AN EVENT FIRES ON THE DOCUMENT
    if (options.captureAfterDocumentEvent) {
      document.addEventListener(options.captureAfterDocumentEvent, () => resolve(captureDocument()))

    // CAPTURE ONCE A SPECIFC ELEMENT EXISTS
    } else if (options.captureAfterElementExists) {
      // TODO: Try and get something MutationObserver-based working.
      setInterval(() => {
        if (document.querySelector(options.captureAfterElementExists)) resolve(captureDocument())
      }, 100)

    // CAPTURE AFTER A NUMBER OF MILLISECONDS
    } else if (options.captureAfterTime) {
      setTimeout(() => resolve(captureDocument()), options.captureAfterTime)

    // DEFAULT: RUN IMMEDIATELY
    } else {
      resolve(captureDocument())
    }
  })
}

class ChromeRDPRenderer {
  constructor (options) {
    this._browserProcess = null
    this._browserCommand = null
    this._options = options
  }

  async initialize () {
    this._browserCommand = this._options.browserCommand || await getChromeStartCommand()

    const splitCommand = this._browserCommand ? this._browserCommand.split(' ') : null
    const rendererPort = this._options.rendererPort
    const maxLaunchRetries = this._options.maxLaunchRetries || 5

    if (!splitCommand) {
      return Promise.reject('[PrerenderChromePlugin] Unable to start Chrome. (You should probably set the browserCommand option.)')
    }

    const processArguments = [
      ...splitCommand,
      '--headless',
      `--remote-debugging-port=${rendererPort}`
    ]

    if (this._options.rendererArguments) {
      processArguments.unshift(this._options._rendererArguments)
    }

    return createRenderProcess(processArguments, rendererPort, maxLaunchRetries)
    .then(browserProcess => {
      this._browserProcess = browserProcess
      return browserProcess
    })
  }

  async renderRoutes (routes, serverPort) {
    const options = this._options

    const connectionOptions = {
      host: '127.0.0.1',
      port: options.rendererPort
    }

    const handlers = await Promise.all(routes.map(route => {
      return prepareTab(connectionOptions, `http://localhost:${options.serverPort}${route}`, options)
    }))

    const handlerPromises = Promise.all(handlers.map(async (handler) => {
      const {client, tab} = handler
      const {Runtime} = client

      await CRI.Activate(Object.assign({}, connectionOptions, {id: tab.id}))

      const {result} = await Runtime.evaluate({
        expression: `(${getPageContents})(${JSON.stringify(options)})`,
        awaitPromise: true
      })

      const parsedResult = JSON.parse(result.value)

      await client.close()
      return Promise.resolve(parsedResult)
    }))
    .catch(e => {
      handlers.forEach(handler => { handler.client.close() })
      throw e
    })

    return handlerPromises
  }

  destroy () {
    // FIXME: Maybe we should use a more graceful shutdown?
    this._browserProcess.kill()
  }
}

module.exports = ChromeRDPRenderer
