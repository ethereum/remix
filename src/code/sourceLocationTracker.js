'use strict'
var EventManager = require('../lib/eventManager')
var util = require('../helpers/global')
var helper = require('../helpers/traceHelper')
var SourceMappingDecoder = require('../util/sourceMappingDecoder')

/**
 * Process the source code location for the current executing bytecode
 */
function SourceLocationTracker (_codeManager) {
  this.codeManager = _codeManager
  util.extend(this, new EventManager())
  this.sourceMappingDecoder = new SourceMappingDecoder()
}

/**
 * Return the source location associated with the given @arg index
 *
 * @param {String} address - object containing attributes {source} and {length}
 * @param {Int} index - array returned by the function 'getLinebreakPositions'
 * @param {Object} contractDetails - AST of compiled contracts
 * @param {Function} cb - callback function
 */
SourceLocationTracker.prototype.getSourceLocation = function (address, index, contractsDetails, cb) {
  var self = this
  this.codeManager.getCode(address, function (error, result) {
    if (!error) {
      var sourceMap = getSourceMap(address, result.bytes, contractsDetails)
      if (sourceMap) {
        cb(null, self.sourceMappingDecoder.atIndex(index, sourceMap))
      } else {
        cb('no srcmap associated with the code ' + address)
      }
    } else {
      cb(error)
    }
  })
}

function srcmapRuntime (contract) {
  return contract.srcmapRuntime ? contract.srcmapRuntime : contract['srcmap-runtime']
}

function getSourceMap (address, code, contractsDetails) {
  var isCreation = helper.isContractCreation(address)
  var byteProp = isCreation ? 'bytecode' : 'runtimeBytecode'
  for (var k in contractsDetails) {
    if ('0x' + contractsDetails[k][byteProp] === code) {
      return isCreation ? contractsDetails[k].srcmap : srcmapRuntime(contractsDetails[k])
    }
  }
  return null
}

module.exports = SourceLocationTracker
