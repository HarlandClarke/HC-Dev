# HC-Dev

Harland Clarke Development Proxy for use in local dev testing of front end websites

## Install

```console
$ npm install --save-dev HarlandClarke/hc-dev
```

## How To Use

1. Modern Implementation (Webpack Plugin)
2. Legacy Implementation (BrowserSync Configuration Factory)
3. Configuration is accomplished by using the hcdev.config.js config file

### Webpack Plugin

In order to use this utility, you must be adding the plugin to your Webpack configuration. If using Vue-CLI, this is done within vue.config.js.

``` js

const HCDevPlugin = require('hc-dev');

module.exports = {
  lintOnSave: false,
  configureWebpack: {
    output: {
      path: __dirname + "/dist"
    },
    plugins: [
      new HCDevPlugin()
    ]
  }
}

```

### BrowerSync Configuration (Legacy Implementation)

In order to use this utility, you must be using BrowserSync and use the GetBrowserSyncConfig command to generate an appropriate configuration for BrowserSync from the config file mentioned above. An example of how this can be done can be seen below, using the Vue-CLI config file to reference the incorporate the HC-Dev platform.

``` js

const BrowserSyncPlugin = require('browser-sync-webpack-plugin')
const HCDev = require('hc-dev');
const hcDev = new HCDev();

module.exports = {
  lintOnSave: false,
  configureWebpack: {
    output: {
      path: __dirname + "/dist"
    },
    plugins: [
      new BrowserSyncPlugin(hcDev.GetBrowserSyncConfig())
    ]
  }
}

```

### Configuration File (hcdev.config.js)

Configure your local project by placing hcdev.config.js in the root of the project alongside package.json

The file format should be something like the following:

`hcdev.config.js`

```js

module.exports = {

  // Proxy Port
  port: 3000,

  // Proxy UI Port
  uiPort: 3001,

  // Validate Certificates
  validateCerts: true,

  // Change Origin
  changeOrigin: true,

  // Autorewrite Url
  autoRewrite: true,

  // Proxy agent to use (optional)
  agent: new ProxyAgent('pac+http://someproxyserver.hosted.com/proxy.PAC'),

  // URLs to serve up on localhost (optional)
  urls: [
    {
      protocol: 'https://',
      host: 'uat.SomeHCFrontEndSite.com'
    }
  ],

  sites: [
    {
      port: 3010,
      uiPort: 3011,
      urls: [
        {
          protocol: 'https://',
          host: 'uat.SomeSecondaryHCFrontEndSite.com'
        }
      ]
    },
    {
      port: 3012,
      uiPort: 3013,
      urls: [
        {
          protocol: 'https://',
          host: 'uat.SomeOtherSecondaryHCFrontEndSite.com'
        }
      ]
    }
  ],

  // Forces location redirects to use http vs https
  forceHttpLocationRedirects: true,

  // Include local websocket redirect for HMR
  includeLocalWebsocketProxy: true,

  // Default local websocket port for HMR
  localWebsocketPort: 8080,

  // Local Routes to override (optional)
  localRoutes: [
    {
      route: '/resources/store/configurator/promo_products',
      dir: './dist'
    }
  ],

  // Remote Routes to override (optional)
  remoteRoutes: [
    {
      route: '/localApp',
      url: 'http://localhost:8080'
    }
  ],

  // Match Patterns for defining additional matches the request should be processed for. (optional)
  matchPatterns: [
    'example.txt',
    '/someDirectory/example.html'
  ],

  // Match Routines for defining additional matches the request should be processed for. If all requests, just return true. (optional)
  matchRoutine: (config, req, protocol, host) => {

  },

  // Scripts To Inject
  scriptsToInject: [{
    // The path of the script to include
    path: '/store/scripts/gallery.js',
    // Indicates if the script should be loaded async or not
    loadAsync: true,
    // Indicates if the script should be added before the closing head tag instead of the closing body tag
    loadInHead: false,
    // URL match pattern for which pages the script should be injected
    pattern: new RegEx('.jsp','g'),
    // The custom route which needs to be overriden. Similar to the localRoute above, but specific to this script. (optional)
    customRoute: {
      '/store/scripts/gallery.js': '/localApp/app.js'
    },
    // The routine used for matching which pages this script should be included for. If all requests, just return true.
    matchRoutine: (config, req, protocol, host, finalBody) => {
      // Match only jsp pages
      if (req.url.indexOf('dynoGallery=true') > -1){
        return req.url.includes('.jsp');
      }
      return false;
    },

  // Links To Inject
  linksToInject: [{
    // The link ref type
    ref: 'stylesheet',
    // The path of the script to include
    path: '/styles/someStylesheet.css',
    // Indicates if the script should be added before the closing head tag instead of the closing body tag
    loadInHead: false,
    // URL match pattern for which pages the script should be injected
    pattern: new RegEx('.jsp','g'),
    // The custom route which needs to be overriden. Similar to the localRoute above, but specific to this script. (optional)
    customRoute: {
      '/store/scripts/gallery.js': '/localApp/app.js'
    },
    // The routine used for matching which pages this script should be included for. If all requests, just return true.
    matchRoutine: (config, req, protocol, host, finalBody) => {
      // Match only jsp pages
      if (req.url.indexOf('dynoGallery=true') > -1){
        return req.url.includes('.jsp');
      }
      return false;
    }
  }],

  // Custom Clean Body Response Function (optional)
  customCleanBodyResponse: (config, req, protocol, host, finalBody, newHost, newPort) => {

    // Modify js enviro param to be Dev
    let configHostRegex = new RegExp("config[\"host\"] = {\"env\":\"UAT\"}");
    finalBody = finalBody.replace(configHostRegex, "config[\"host\"] = {\"env\":\"DEV\"}");

    // Adjust Bazaarvoice
    finalBody = finalBody.replace(/bazaarvoice.com/g, "localhost:" + config.port);

    // Return the final body
    return finalBody;

  }
}

```

#### port

Defines the proxy port which should host the local dev server site

#### uiPort (optional)

Defines the proxy port which should host the proxy UI interface. If not provided, is one greater than the port.

#### validateCerts

Indicates if the certificate chain should be validated or not

#### changeOrigin

Changes the origin of the host header to the target URL

#### autoRewrite

Rewrites the location host/port on (301/302/307/308) redirects based on requested host/port.

#### agent

Defines the proxy agent which should be used for all requests. Useful for situations where you are behind a corporate proxy

#### urls

Array defining the protocl & url of the website(s) to proxy

#### sites

Array defining the secondary sites to proxy as well to handle redirects to/from the primary dev site

#### forceHttpLocationRedirects

Forces location based redirects to use http vs https

#### includeLocalWebsocketProxy

Adds a proxy for websockets to the port of your choosing. Used for HMR in a Webpack system.

#### localWebsocketPort

The localhost port the Webpack HMR websocket is listening on

#### localRoutes

Array defining the routes to expose local build files which override files hosted on the front end site being proxied

#### remoteRoutes

Array defining the routes to expose remote URLs (can be locally hosted URLs) which override files hosted on the front end site being proxied

#### matchPatterns

Array defining the match patterns for which requests should be processed by the code

#### customCleanBodyResponse

Function used to apply custom cleaning of the response before pushing back to the browser

## Development of HC-Dev

To debug in a Vue-Cli Project:

``` bash

npx --node-arg=--inspect vue-cli-service serve

```
