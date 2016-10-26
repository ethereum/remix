'use strict'
var baseType = require('./baseType')

function Struct (decoder) {
  baseType(this, decoder)
  this.members = decoder.members
}

module.exports = Struct
