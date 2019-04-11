const browserSync = require('browser-sync')
const getCssOnlyEmittedAssetsNames = require('./lib/getCssOnlyEmittedAssetsNames')

const DevOptions = require('./DevOptions')

const HCDev = require('./HCDev')

const defaultPluginOptions = {

  // Base config from browser-sync-webpack-plugin
  reload: true,
  name: 'hcdev-webpack-plugin',
  callback: undefined,
  injectCss: false
}

class HCDevPlugin {
  constructor(browserSyncOptions, pluginOptions) {

    const devOptions = new DevOptions(process.cwd())

    this.options = Object.assign({}, defaultPluginOptions, devOptions.config, pluginOptions)

    // Set the default for the ui port
    if (!this.options.uiPort) {
      this.options.uiPort = this.options.port + 1
    }

    for (let iSite = 0; iSite < this.options.sites.length; iSite++) {
      const site = this.options.sites[iSite]
      if (!site.uiPort) {
        site.uiPort = site.port + 1
      }
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
    this.options.sites.forEach((site) => {
      site.bs = browserSync.create("siteProxy-" + site.port)
    })
  }

  GetBrowserSyncConfig() {
    return this.hcDev.GetBrowserSyncConfig()
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

        this.options.sites.forEach((site) => {

          const config = this.hcDev.GetMultiSiteBrowserSyncConfig(site)
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
