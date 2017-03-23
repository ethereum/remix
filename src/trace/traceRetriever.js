'use strict'
var util = require('../helpers/global')

function TraceRetriever () {
}

TraceRetriever.prototype.getTrace = function (txHash, callback) {
  var options = {
    disableStorage: true,
    disableMemory: false,
    disableStack: false,
    fullStorage: false
  }
  var start = new Date().getTime()
  util.web3.debug.traceTransaction(txHash, options, function (error, result) {
    var end = (new Date().getTime() - start) / 1000
    console.log('TraceRetriever.prototype.getTrace ' + end)
    console.log(error)
    callback(error, result)
  })
}

module.exports = TraceRetriever
