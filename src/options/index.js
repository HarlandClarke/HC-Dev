const { createSchema, validate } = require('../shared-utils')

const schema = createSchema(joi => joi.object({
  port: joi.number(),
  urls: joi.array(),
  localRoutes: joi.array(),
}))

exports.validate = (options, cb) => {
  validate(options, schema, cb)
}

exports.defaults = () => ({

  // Proxy host port
  port: 3000,

  // URLs to proxy
  urls: [],

  // Local Routes to override
  localRoutes: []

})
