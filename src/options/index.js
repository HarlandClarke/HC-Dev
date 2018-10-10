const { createSchema, validate } = require('../shared-utils')

const schema = createSchema(joi => {

    const url = joi.object().keys({
      protocol: joi.string().required(),
      host: joi.string().required()
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
      pattern: joi.object(),
      customRoute: joi.object(),
      matchRoutine: joi.func().arity(5)
    })

    return joi.object({
      port: joi.number().required(),
      agent: joi.object(),
      urls: joi.array().items(url),
      localRoutes: joi.array().items(localRoute),
      remoteRoutes: joi.array().items(remoteRoute),
      matchPatterns: joi.array().items(joi.string()),
      scriptsToInject: joi.array().items(scriptToInject),
      customCleanResponseBody: joi.func().arity(5),
      validateCerts: joi.boolean(),
      changeOrigin: joi.boolean(),
      autoRewrite: joi.boolean(),
      corsOptions: joi.object()
    })
  }
)

exports.validate = (options, cb) => {
  validate(options, schema, cb)
}

exports.defaults = () => ({

  // Proxy host port
  port: 3000,

  // Proxy Agent
  agent: null,

  // URLs to proxy
  urls: [],

  // Local Routes to override
  localRoutes: [],

  // Remote Routes to override
  remoteRoutes: [],

  // Match Patterns for defining additional matches the request should be processed for.
  matchPatterns: [],

  // Scripts To Inject
  scriptsToInject: [],

  // Function for defining what
  customCleanResponseBody: null,

  // Validate certificates
  validateCerts: null,

  // changeOrigin
  changeOrigin: null,

  // autoRewrite
  autoRewrite: null,

  // cors options
  corsOptions: null

})
