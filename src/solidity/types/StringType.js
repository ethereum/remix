'use strict'
var baseType = require('./baseType')

function StringType (decoder) {
  baseType(this, decoder)
}

module.exports = StringType

