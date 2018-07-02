const { createSchema, validate } = require('../shared-utils')

const schema = createSchema(joi => joi.object({
  port: joi.number().required(),
  agent: joi.object(),
  urls: joi.array(),
  localRoutes: joi.array(),
  matchPatterns: joi.array(),
  customCleanResponseBody: joi.func()
}))

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

  // Match Patterns for defining additional matches the request should be processed for.
  matchPatterns: [],

  // Function for defining what
  customCleanResponseBody: null

})
