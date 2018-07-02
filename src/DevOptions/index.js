const fs = require('fs')
const path = require('path')
const chalk = require("chalk");
const readPkg = require('read-pkg')
const defaultsDeep = require('lodash.defaultsdeep')
const {
  warn,
  error,
  ensureSlash,
  removeSlash
} = require('../shared-utils')
const {
  defaults,
  validate
} = require('../options')

module.exports = class DevOptions {

  constructor(context, {
    pkg
  } = {}) {
    this.context = context
    this.pkg = this.resolvePkg(pkg)

    // load user config
    const devOptions = this.loadDevOptions()
    this.config = defaultsDeep(devOptions, defaults())
  }

  resolvePkg(inlinePkg) {
    if (inlinePkg) {
      return inlinePkg
    } else if (fs.existsSync(path.join(this.context, 'package.json'))) {
      return readPkg.sync(this.context)
    } else {
      return {}
    }
  }

  loadDevOptions() {
    // vue.config.js
    let fileConfig, pkgConfig, resolved, resovledFrom
    const configPath = (path.resolve(this.context, 'hcdev.config.js'))
    if (fs.existsSync(configPath)) {
      try {
        fileConfig = require(configPath)
        if (!fileConfig || typeof fileConfig !== 'object') {
          error(
            `Error loading ${chalk.bold('hcdev.config.js')}: should export an object.`
          )
          fileConfig = null
        }
      } catch (e) {
        error(`Error loading ${chalk.bold('hcdev.config.js')}:`)
        throw e
      }
    }

    // package
    pkgConfig = this.pkg.vue
    if (pkgConfig && typeof pkgConfig !== 'object') {
      error(
        `Error loading hcdev config in ${chalk.bold(`package.json`)}: ` +
        `the "hcdev" field should be an object.`
      )
      pkgConfig = null
    }

    if (fileConfig) {
      if (pkgConfig) {
        warn(
          `"hcdev" field in package.json ignored ` +
          `due to presence of ${chalk.bold('hcdev.config.js')}.`
        )
        warn(
          `You should migrate it into ${chalk.bold('hcdev.config.js')} ` +
          `and remove it from package.json.`
        )
      }
      resolved = fileConfig
      resovledFrom = 'hcdev.config.js'
    } else if (pkgConfig) {
      resolved = pkgConfig
      resovledFrom = '"hcdev" field in package.json'
    }

    // normlaize some options
    if (typeof resolved.baseUrl === 'string') {
      resolved.baseUrl = resolved.baseUrl.replace(/^\.\//, '')
    }

    ensureSlash(resolved, 'baseUrl')
    removeSlash(resolved, 'outputDir')

    // validate options
    validate(resolved, msg => {
      error(
        `Invalid options in ${chalk.bold(resovledFrom)}: ${msg}`
      )
    })

    return resolved
  }
}
