const joi = require('joi')

// proxy to joi for option validation
exports.createSchema = fn => fn(joi)

exports.validate = (obj, schema, cb) => {
  joi.validate(obj, schema, {}, err => {
    if (err) {
      cb(err.message)
      throw err
    }
  })
}

exports.validateSync = (obj, schema) => {
  const result = joi.validate(obj, schema)
  if (result.error) {
    throw result.error
  }
}
