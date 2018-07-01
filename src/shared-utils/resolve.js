exports.ensureSlash = (config, key) => {
  let val = config[key]
  if (typeof val === 'string') {
    if (!/^https?:/.test(val)) {
      val = val.replace(/^([^/.])/, '/$1')
    }
    config[key] = val.replace(/([^/])$/, '$1/')
  }
}

exports.removeSlash = (config, key) => {
  if (typeof config[key] === 'string') {
    config[key] = config[key].replace(/^\/|\/$/g, '')
  }
}
