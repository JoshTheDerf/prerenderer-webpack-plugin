<h1 align="center">Prerenderer Webpack Plugin</h1>
<p align="center">
  <em>Fast, flexible prerendering for sites and SPAs built with webpack.</em>
</p>

<p align="center"><img width="300" src="/assets/logo.png?raw=true"></p>

---

<div align="center">

[![npm version](https://img.shields.io/npm/v/prerenderer-webpack-plugin.svg)]()
[![npm downloads](https://img.shields.io/npm/dt/prerenderer-webpack-plugin.svg)]()
[![Dependency Status](https://img.shields.io/david/tribex/prerenderer-webpack-plugin.svg)](https://david-dm.org/tribex/prerenderer-webpack-plugin)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](https://standardjs.com/)
[![license](https://img.shields.io/github/license/tribex/prerenderer-webpack-plugin.svg)]()

</div>

---

<div align="center">

[![NPM](https://nodei.co/npm/prerenderer-webpack-plugin.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/prerenderer-webpack-plugin/)

</div>

## About prerenderer-webpack-plugin

**Note: This package will be deprecated in favor of [prerender-spa-plugin](https://github.com/chrisvfritz/prerender-spa-plugin) v3. This package will stay up-to-date with `prerenderer` until `prerender-spa-plugin` v3 is released.**

The goal of this plugin is to provide a simple prerendering solution that is easily extensible and usable for any site or single-page-app built with webpack.

It's implemented as a webpack wrapper for [prerenderer](https://github.com/tribex/prerenderer).
For more up-to-date and complete documentation, see that repository.

Plugins for other task runners and build systems are planned.

## Example Usage (`webpack.config.js`)
```js
const path = require('path')
const PrerendererWebpackPlugin = require('prerenderer-webpack-plugin')
const PuppeteerRenderer = require('@prerenderer/puppeteer-renderer') // or `@prerenderer/jsdom-renderer`

module.exports = {
  plugins: [
    ...
    new PrerendererWebpackPlugin({
      // Required - The path to the webpack-outputted app to prerender.
      staticDir: path.join(__dirname, 'dist'),
      // Required - Routes to render.
      routes: [ '/', '/about', '/some/deep/nested/route' ],

      // or new JSDOMRenderer()
      renderer: new PuppeteerRenderer()
    })
  ]
}
```

Now, if you're not familiar with the concept of *prerendering*, you might predictably ask...

## What is Prerendering?

Recently, SSR (Server Side Rendering) has taken the JavaScript front-end world by storm. The fact that you can now render your sites and apps on the server before sending them to your clients is an absolutely *revolutionary* idea (and totally not what everyone was doing before JS client-side apps got popular in the first place...)

However, the same criticisms that were valid for PHP, ASP, JSP, (and such) sites are valid for server-side rendering today. It's slow, breaks fairly easily, and is difficult to implement properly.

Thing is, despite what everyone might be telling you, you probably don't *need* SSR. You can get almost all the advantages of it (without the disadvantages) by using **prerendering.** Prerendering is basically firing up a headless browser, loading your app's routes, and saving the results to a static HTML file. You can then serve it with whatever static-file-serving solution you were using previously. It *just works* with HTML5 navigation and the likes. No need to change your code or add server-side rendering workarounds.

In the interest of transparency, there are some use-cases where prerendering might not be a great idea.

- **Tons of routes** - If your site has hundreds or thousands of routes, prerendering will be really slow. Sure you only have to do it once per update, but it could take ages. Most people don't end up with thousands of static routes, but just in-case...
- **Dynamic Content** - If your render routes that have content that's specific to the user viewing it or other dynamic sources, you should make sure you have placeholder components that can display until the dynamic content loads on the client-side. Otherwise it might be a tad weird.

## Available Renderers
- `@prerenderer/renderer-jsdom` - Uses [jsdom](https://npmjs.com/package/jsdom). Extremely fast, but unreliable and cannot handle advanced usages. May not work with all front-end frameworks and apps.
- `@prerenderer/renderer-puppeteer` - Uses [puppeteer](https://github.com/GoogleChrome/puppeteer) to render pages in headless Chrome. Simpler and more reliable than the previous `ChromeRenderer`.

## Removed in `prerenderer 0.6.0`:
- `prerenderer.BrowserRenderer` - Opens the system default browser to render the page. (Use `@prerenderer/renderer-jsdom` or `@prerenderer/renderer-puppeteer` instead.)
- `prerenderer.ChromeRenderer` - Uses Google Chrome in headless mode over RDP.  (Use `@prerenderer/renderer-puppeteer` instead.)


### Which renderer should I use?

**Use `@prerenderer/renderer-puppeteer` if:** You're prerendering up to a couple hundred pages (bye-bye RAM!).

**Use `@prerenderer/renderer-jsdom` if:** You need to prerender thousands upon thousands of pages, but quality isn't all that important, and you're willing to work around issues for more advanced cases. (Programmatic SVG support, etc.)

## Documentation

### Plugin Options

| Option           | Type                                      | Required? | Default                 | Description                                                                                                                                 |
|------------------|-------------------------------------------|-----------|-------------------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| staticDir        | String                                    | Yes       | None                    | The root path to serve your app from.                                                                                                       |
| indexPath        | String                                    | No        | `staticDir/index.html`  | The index file to fall back on for SPAs.                                                                                                    |
| removeWhitespace | Boolean                                   | No        |                         | Strip whitespace in-between tags in the resulting HTML. May cause issues in your app, use with caution.                                     |
| server           | Object                                    | No        | None                    | App server configuration options (See below)                                                                                                |
| renderer         | Renderer Instance or Configuration Object | No        | `new BrowserRenderer()` | The renderer you'd like to use to prerender the app. It's recommended that you specify this, but if not it will default to BrowserRenderer. |

#### Server Options

| Option | Type    | Required? | Default                    | Description                            |
|--------|---------|-----------|----------------------------|----------------------------------------|
| port   | Integer | No        | First free port after 8000 | The port for the app server to run on. |

---

---

### `@prerenderer/renderer-jsdom` Options

| Option                   | Type                   | Required? | Default                  | Description                                                                                                                                                                                         |
|--------------------------|------------------------|-----------|--------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| maxConcurrentRoutes      | Number                 | No        | 0 (No limit)             | The number of routes allowed to be rendered at the same time. Useful for breaking down massive batches of routes into smaller chunks.                                                               |
| inject                   | Object                 | No        | None                     | An object to inject into the global scope of the rendered page before it finishes loading. Must be `JSON.stringifiy`-able. The property injected to is `window['__PRERENDER_INJECTED']` by default. |
| injectProperty           | String                 | No        | `'__PRERENDER_INJECTED'` | The property to mount `inject` to during rendering.                                                                                                                                                 |
| renderAfterDocumentEvent | String                 | No        | None                     | Wait to render until the specified event is fired on the document. (You can fire an event like so: `document.dispatchEvent(new Event('custom-render-trigger'))`                                     |
| renderAfterElementExists | String (Selector)      | No        | None                     | Wait to render until the specified element is detected using `document.querySelector`                                                                                                               |
| renderAfterTime          | Integer (Milliseconds) | No        | None                     | Wait to render until a certain amount of time has passed.                                                                                                                                           |

### `@prerenderer/renderer-puppeteer` Options

| Option                   | Type                   | Required? | Default                  | Description                                                                                                                                                                                         |
|--------------------------|------------------------|-----------|--------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| maxConcurrentRoutes      | Number                 | No        | 0 (No limit)             | The number of routes allowed to be rendered at the same time. Useful for breaking down massive batches of routes into smaller chunks.                                                               |
| inject                   | Object                 | No        | None                     | An object to inject into the global scope of the rendered page before it finishes loading. Must be `JSON.stringifiy`-able. The property injected to is `window['__PRERENDER_INJECTED']` by default. |
| injectProperty           | String                 | No        | `'__PRERENDER_INJECTED'` | The property to mount `inject` to during rendering.                                                                                                                                                 |
| renderAfterDocumentEvent | String                 | No        | None                     | Wait to render until the specified event is fired on the document. (You can fire an event like so: `document.dispatchEvent(new Event('custom-render-trigger'))`                                     |
| renderAfterElementExists | String (Selector)      | No        | None                     | Wait to render until the specified element is detected using `document.querySelector`                                                                                                               |
| renderAfterTime          | Integer (Milliseconds) | No        | None                     | Wait to render until a certain amount of time has passed.                                                                                                                                           |

---

## Caveats

- For obvious reasons, `prerenderer` only works for SPAs that route using the HTML5 history API. `index.html#/hash/route` URLs will unfortunately not work.
- Whatever client-side rendering library you're using should be able to at least replace any server-rendered content or diff with it.
  - For **Vue.js 1** use [`replace: false`](http://vuejs.org/api/#replace) on root components.
  - For **Vue.js 2**  Ensure your root component has the same id as the prerendered element it's replacing. Otherwise you'll end up with duplicated content.

## License (MIT)

```
Copyright (c) 2017 Joshua Michael Bemenderfer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Credits
- Originally forked and rewritten from [prerender-spa-plugin](https://github.com/chrisvfritz/prerender-spa-plugin) by [Chris Fritz](https://github.com/chrisvfritz). Thanks Chris!

## Maintainers

<table>
  <tbody>
    <tr>
      <td align="center">
        <a href="https://github.com/tribex">
          <img width="150" height="150" src="https://github.com/tribex.png?v=3&s=150">
          </br>
          Joshua Bemenderfer
        </a>
      </td>
    </tr>
  <tbody>
</table>
