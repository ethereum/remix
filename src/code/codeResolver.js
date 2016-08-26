'use strict'
var codeUtils = require('./codeUtils')
var util = require('../helpers/global')

module.exports = {
  bytes: {}, // bytes code by contract addesses
  codes: {}, // assembly items instructions list by contract addesses
  instructionsIndexByBytesOffset: {}, // mapping between bytes offset and instructions index.

  resolveCode: function (address, callBack) {
    var cache = this.getExecutingCodeFromCache(address)
    if (cache) {
      callBack(address, cache)
      return
    }

    var self = this
    this.loadCode(address, function (code) {
      callBack(address, self.cacheExecutingCode(address, code))
    })
  },

  loadCode: function (address, callback) {
    console.log('loading new code from web3 ' + address)
    util.web3.eth.getCode(address, function (error, result) {
      if (error) {
        console.log(error)
      } else {
        callback(result)
      }
    })
  },

  cacheExecutingCode: function (address, hexCode) {
    var codes = this.formatCode(hexCode)
    this.bytes[address] = hexCode
    this.codes[address] = codes.code
    this.instructionsIndexByBytesOffset[address] = codes.instructionsIndexByBytesOffset
    return this.getExecutingCodeFromCache(address)
  },

  formatCode: function (hexCode) {
    var code = codeUtils.nameOpCodes(new Buffer(hexCode.substring(2), 'hex'))
    return {
      code: code[0],
      instructionsIndexByBytesOffset: code[1]
    }
  },

  getExecutingCodeFromCache: function (address) {
    if (this.codes[address]) {
      return {
        code: this.codes[address],
        instructionsIndexByBytesOffset: this.instructionsIndexByBytesOffset[address],
        bytes: this.bytes[address]
      }
    } else {
      return null
    }
  },

  getInstructionIndex: function (address, pc) {
    return this.getExecutingCodeFromCache(address).instructionsIndexByBytesOffset[pc]
  }
}
