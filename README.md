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
The goal of this plugin is to provide a simple prerendering solution that is easily extensible and useble for any site or single-page-app built with webpack.

It's implemented as a webpack wrapper for [prerenderer](https://github.com/tribex/prerenderer).
For more up-to-date and complete documentation, see that repository.

Plugins for other task runners and build systems are planned.

## Example Usage (`webpack.config.js`)
```js
const path = require('path')
const PrerendererWebpackPlugin = require('prerenderer-webpack-plugin')
const ChromeRenderer = PrerendererWebpackPlugin.ChromeRenderer

module.exports = {
  plugins: [
    ...
    new PrerendererWebpackPlugin({
      // Required - The path to the webpack-outputted app to prerender.
      staticDir: path.join(__dirname, 'dist'),
      // Required - Routes to render.
      routes: [ '/', '/about', '/some/deep/nested/route' ],

      // Optional - This is the default.
      renderer: new ChromeRenderer({
        // If this is omitted, ChromeRenderer will *attempt* to find a valid installed version based on your platform. No promises.
        command: 'start chrome' // Windows
        // More optional renderer arguments.
      })
    })
  ]
}
```

Now, if you're not familiar with the concept of *prerendering*, you might predictably ask...

## What is Prerendering?

Recently, SSR (Server Side Rendering) has taken the JavaScript front-end world by storm. The fact that you can now render your sites and apps on the server before sending them to your clients is an absolutely *revolutionary* idea (and totally not what everyone was doing before JS client-side apps got popular in the first place...)

However, the same criticisms that were valid for the PHP, ASP, JSP, and the likes sites of yore are valid for server-side rendering today. It's slow, breaks fairly easily, and is difficult to implement properly.

Thing is, despite what everyone might be telling you, you probably don't *need* SSR. You can get almost all the advantages of it (without the disadvantages) by using **prerendering.** Prerendering is basically firing up a headless browser, loading your app's routes, and saving the results to a static HTML file. You can then serve it with whatever static-file-serving solution you were using previously. It *just works* with HTML5 navigation and the likes. No need to change your code or add server-side rendering workarounds.

In the interest of transparency, there are some use-cases where prerendering might not be a great idea.

- **Tons of routes** - If your site has hundreds or thousands of routes, prerendering will be really slow. Sure you only have to do it once per update, but it could take ages. Most people don't end up with thousands of static routes, but just in-case...
- **Dynamic Content** - If your render routes that have content that's specific to the user viewing it or other dynamic sources, you should make sure you have placeholder components that can display until the dynamic content loads on the client-side. Otherwise it might be a tad weird.

## Available Renderers
- Chromium / Google Chrome Headless over RDP (builtin) - `PrerendererWebpackPlugin.ChromeRenderer`

## Documentation

## Plugin Options

| Option    | Type                        | Required? | Default                | Description                                                                                                                                      |
|-----------|-----------------------------|-----------|------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| staticDir | String                      | Yes       | None                   | The root path to serve your app from.                                                                                                            |
| outputDir | String                      | No        | `staticDir`            | The path to output the rendered app to.                                                                                                          |
| routes    | Array:String               | Yes       | `[]`                   | Routes to prerender.                                                                                                                             |
| server    | Object                      | No        | None                   | App server configuration options (See below)                                                                                                     |
| renderer  | Renderer Instance or Object | No        | `new ChromeRenderer()` | The renderer you'd like to use to prerender the app. It's recommended that you specify this, but if not it will attempt to start ChromeRenderer. |

### Server Options

| Option | Type    | Required? | Default                    | Description                            |
|--------|---------|-----------|----------------------------|----------------------------------------|
| port   | Integer | No        | First free port after 8000 | The port for the app server to run on. |

---

### ChromeRenderer Options

| Option                   | Type                   | Required?        | Default                    | Description                                                                                                                                                                                         |
|--------------------------|------------------------|------------------|----------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| inject                   | Object                 | No               | None                       | An object to inject into the global scope of the rendered page before it finishes loading. Must be `JSON.stringifiy`-able. The property injected to is `window['__PRERENDER_INJECTED']` by default. |
| injectProperty           | String                 | No               | `'__PRERENDER_INJECTED'`   | The property to mount `inject` to during rendering.                                                                                                                                                 |
| renderAfterDocumentEvent | String                 | No               | None                       | Wait to render until the specified event is fired on the document. (You can fire an event like so: `document.dispatchEvent(new Event('custom-render-trigger'))`                                     |
| renderAfterElementExists | String (Selector)      | No               | None                       | Wait to render until the specified element is detected using `document.querySelector`                                                                                                               |
| renderAfterTime          | Integer (Milliseconds) | No               | None                       | Wait to render until a certain amount of time has passed.                                                                                                                                           |
| maxLaunchRetries         | Integer                | No               | 5                          | Max amount of times to try and start the render program before erroring out.                                                                                                                        |
| port                     | Integer                | No               | Auto-detect available port | The port to run Chrome's RDP on.                                                                                                                                                                    |
| command                  | String                 | No (Recommended) | Auto-detect                | The command to use to start Chrome or Chromium. Auto-detection is unreliable, so I'd recommend setting it.                                                                                          |
| arguments                | Array:String          | No               | None                       | Additional arguments to pass to Chrome.                                                                                                                                                             |

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
- Originally ported from [prerender-spa-plugin](https://github.com/chrisvfritz/prerender-spa-plugin) by [Chris Fritz](https://github.com/chrisvfritz). Thanks Chris!

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
