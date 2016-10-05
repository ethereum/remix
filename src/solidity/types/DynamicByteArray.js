'use strict'
var baseType = require('./baseType')

function DynamicByteArray (decoder) {
  baseType(this, decoder)
}

module.exports = DynamicByteArray
