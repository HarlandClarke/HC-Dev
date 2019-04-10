const {
  createSchema,
  validate
} = require('../shared-utils')

const schema = createSchema(joi => {

  const url = joi.object().keys({
    protocol: joi.string().required(),
    host: joi.string().required()
  })

  const multiProxyConfig = joi.object().keys({
    devSite: joi.object().keys({
      port: joi.number(),
      uiPort: joi.number(),
      urls: joi.array().items(url)
    }),
    sites: joi.array().items(joi.object().keys({
      port: joi.number(),
      uiPort: joi.number(),
      urls: joi.array().items(url)
    }))
  })

  const localRoute = joi.object().keys({
    route: joi.string().required(),
    dir: joi.string().required()
  })

  const remoteRoute = joi.object().keys({
    route: joi.string().required(),
    url: joi.string().required()
  })

  const scriptToInject = joi.object().keys({
    path: joi.string().required(),
    loadAsync: joi.boolean().required(),
    loadInHead: joi.boolean().required(),
    pattern: joi.any(),
    customRoute: joi.any(),
    matchRoutine: joi.func().arity(5)
  })

  return joi.object({
    port: joi.number().required(),
    agent: joi.any(),
    https: joi.boolean(),
    urls: joi.array().items(url),
    multiProxyConfig: multiProxyConfig,
    localRoutes: joi.array().items(localRoute),
    remoteRoutes: joi.array().items(remoteRoute),
    matchPatterns: joi.array().items(joi.string()),
    scriptsToInject: joi.array().items(scriptToInject),
    customCleanResponseBody: joi.func().arity(7),
    validateCerts: joi.boolean(),
    changeOrigin: joi.boolean(),
    autoRewrite: joi.boolean(),
    corsOptions: joi.any()
  })
})

exports.validate = (options, cb) => {
  validate(options, schema, cb)
}

exports.defaults = () => ({

  // Proxy host port
  port: 3000,

  // Proxy Agent
  agent: undefined,

  // Enable https
  https: false,

  // URLs to proxy
  urls: [],

  multiProxyConfig: undefined,

  // Local Routes to override
  localRoutes: [],

  // Remote Routes to override
  remoteRoutes: [],

  // Match Patterns for defining additional matches the request should be processed for.
  matchPatterns: [],

  // Scripts To Inject
  scriptsToInject: [],

  // Function for defining what
  customCleanResponseBody: undefined,

  // Validate certificates
  validateCerts: true,

  // changeOrigin
  changeOrigin: true,

  // autoRewrite
  autoRewrite: true,

  // cors options
  corsOptions: undefined

})
