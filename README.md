# HC-Dev
Harland Clarke Development Proxy for use in local dev testing of front end websites

## How To Use
1. Configuration is accomplished by using the hcdev.config.js config file
2. Implementaiton is performed by using the BrowserSync configuration export

### Configuration File (hcdev.config.js)
Configure your local project by placing hcdev.config.js in the root of the project alongside package.json

The file format should be something like the following:

`hcdev.config.js`
``` js
module.exports = {

  // Proxy Port
  port: 3000,

  // Proxy agent to use (optional)
  agent: new ProxyAgent('pac+http://someproxyserver.hosted.com/proxy.PAC'),

  // URLs to serve up on localhost (optional)
  urls: [
    {
      protocol: 'https://',
      host: 'uat.SomeHCFrontEndSite.com'
  ],

  // Local Routes to override (optional)
  localRoutes: [
    {
      route: '/resources/store/configurator/promo_products',
      dir: './dist'
    }
  ],

  // Match Patterns for defining additional matches the request should be processed for.
  matchPatterns: [
    'example.txt',
    '/someDirectory/example.html'
  ],

  // Custom Clean Body Response Function (optional)
  customCleanBodyResponse: (config, req, protocol, host, finalBody) => {

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

#### agent
Defines the proxy agent which should be used for all requests. Useful for situations where you are behind a corporate proxy

#### urls
Array defining the protocl & url of the website(s) to proxy

#### localRoutes
Array defining the routes to expose local build files which override files hosted on the front end site being proxied

#### matchPatterns
Array defining the match patterns for which requests should be processed by the code

#### customCleanBodyResponse
Function used to apply custom cleaning of the response before pushing back to the browser

### BrowerSync Configuration
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
