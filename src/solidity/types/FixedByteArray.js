'use strict'
var baseType = require('./baseType')

function FixedByteArray (decoder) {
  baseType(this, decoder)
}

module.exports = FixedByteArray
