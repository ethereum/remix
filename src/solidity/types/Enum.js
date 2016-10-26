'use strict'
var baseType = require('./baseType')

function Enum (decoder) {
  baseType(this, decoder)
  this.enum = decoder.enum
}

module.exports = Enum
