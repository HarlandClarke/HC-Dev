const browserSync = require('browser-sync')
const getCssOnlyEmittedAssetsNames = require('./lib/getCssOnlyEmittedAssetsNames')

const DevOptions = require('./DevOptions');

const HCDev = require('./HCDev');

const defaultPluginOptions = {

  // Base config from browser-sync-webpack-plugin
  reload: true,
  name: 'hcdev-webpack-plugin',
  callback: undefined,
  injectCss: false
}

class HCDevPlugin {
  constructor(browserSyncOptions, pluginOptions) {

    const devOptions = new DevOptions(process.cwd());

    this.options = Object.assign({}, defaultPluginOptions, devOptions.config, pluginOptions)

    if (!this.options.multiProxyConfig) {
      console.log('Creating multiProxyConfig as it was missing')
      this.options.multiProxyConfig = {
        devSite: undefined,
        sites: []
      }
    }
    if (!this.options.multiProxyConfig.devSite) {
      console.log('Creating multiProxyConfig.devSite as it was missing')
      this.options.multiProxyConfig.devSite = {
        port: this.options.port,
        uiPort: this.options.port + 1,
        urls: this.options.urls.slice(0)
      }
    }

    for (let iSite = 0; iSite < this.options.multiProxyConfig.sites.length; iSite++) {
      const site = this.options.multiProxyConfig.sites[iSite];
      if (!site.uiPort) {
        site.uiPort = site.port + 1;
      }
    }

    // Cleanup data
    if (this.options.port) {
      delete this.options.port;
    }

    if (this.options.urls) {
      delete this.options.urls;
    }

    // Build custom browserSyncConfig
    this.hcDev = new HCDev(this.options)
    const customBrowserSyncConfig = this.hcDev.GetBrowserSyncConfig()

    //
    this.browserSyncOptions = Object.assign({}, customBrowserSyncConfig, browserSyncOptions)

    // Configure devSite BrowserSync
    this.browserSync = browserSync.create(this.options.name)
    this.isWebpackWatching = false
    this.isBrowserSyncRunning = false

    // Configure Proxies for multiProxyConfig
    this.options.multiProxyConfig.sites.forEach((site) => {
      site.bs = browserSync.create("siteProxy-" + site.port);
    });
  }

  apply(compiler) {
    const watchRunCallback = () => {
      this.isWebpackWatching = true
    }
    const compilationCallback = () => {
      if (this.isBrowserSyncRunning && this.browserSyncOptions.notify) {
        this.browserSync.notify('Rebuilding...')
      }
    }
    const doneCallback = stats => {
      if (!this.isWebpackWatching) {
        return
      }

      if (!this.isBrowserSyncRunning) {
        this.browserSync.init(this.browserSyncOptions, this.options.callback)

        this.options.multiProxyConfig.sites.forEach((site) => {

          const config = this.hcDev.GetMultispotSiteBrowserSyncConfig(site)
          site.bs.init(config)

        })

        this.isBrowserSyncRunning = true
      }

      if (this.options.reload) {
        this.browserSync.reload(this.options.injectCss && getCssOnlyEmittedAssetsNames(stats))
      }
    }

    if (typeof compiler.hooks !== 'undefined') {
      compiler.hooks.watchRun.tap(HCDevPlugin.name, watchRunCallback)
      compiler.hooks.compilation.tap(HCDevPlugin.name, compilationCallback)
      compiler.hooks.done.tap(HCDevPlugin.name, doneCallback)
    } else {
      compiler.plugin('watch-run', (watching, callback) => {
        watchRunCallback()
        callback(null, null)
      })
      compiler.plugin('compilation', compilationCallback)
      compiler.plugin('done', doneCallback)
    }
  }
}

module.exports = HCDevPlugin
