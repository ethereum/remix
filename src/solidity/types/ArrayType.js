'use strict'
var baseType = require('./baseType')

function ArrayType (decoder) {
  baseType(this, decoder)
  this.arraySize = decoder.arraySize
  this.subArray = decoder.subArray
}

module.exports = ArrayType
