
'use strict'
var BN = require('ethereumjs-util').BN
var utileth = require('ethereumjs-util')

module.exports = {
  decodeInt: function (value, type) {
    var bigNumber = new BN(value.replace('0x', ''), 16)
    if (type.innerType === 'uint') {
      return bigNumber.toString(10)
    } else if (type.innerType === 'int') {
      if (isNegative(bigNumber, type)) {
        return utileth.fromSigned(utileth.toUnsigned(bigNumber)).toString(10)
      } else {
        return bigNumber.toString(10)
      }
    }
  },

  decodeEnum: function (value, type) {
    value = parseInt(value)
    if (type.enum) {
      return type.enum[value].attributes.name
    } else {
      return value
    }
  },

  decodeBool: function (value, type) {
    return value !== '0x00'
  },

  decodeString: function (value, type) {
    value = value.replace('0x', '')
    var ret = ''
    for (var k = 0; k < value.length; k += 2) {
      var raw = value.substr(k, 2)
      var str = String.fromCharCode(parseInt(raw, 16))
      ret += str
    }
    return ret
  }
}

function isNegative (value, type) {
  var binary = value.toString(2)
  return binary.length < type.size ? false : binary[0] === '1'
}
