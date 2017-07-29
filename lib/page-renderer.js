const CDP = require('chrome-remote-interface')

const getPageContents = function (options) {
  options = options || {}

  return new Promise((resolve, reject) => {
    function captureDocument () {
      const doctype = new window.XMLSerializer().serializeToString(document.doctype)
      const outerHTML = document.documentElement.outerHTML

      const result = {
        path: window.location.pathname,
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

function renderPage (config) {
  return new Promise((resolve, reject) => {
    CDP(
      {
        host: config.devToolsHost,
        port: config.devToolsPort
      },
    async (client) => {
      const {Page, Runtime} = client

      try {
        await Page.enable()
        await Page.navigate({url: config.url})
        await Page.loadEventFired()

        const {result} = await Runtime.evaluate({
          expression: `(${getPageContents})(${config && config.options ? JSON.stringify(config.options) : ''})`,
          awaitPromise: true
        })

        const parsedResult = JSON.parse(result.value)

        await client.close()
        resolve(parsedResult.html.trim())
      } catch (err) {
        await client.close()
        reject(err)
      }
    }).on('error', (err) => {
      reject(err)
    })
  })
}

module.exports = renderPage
