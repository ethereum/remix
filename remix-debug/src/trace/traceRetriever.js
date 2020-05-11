'use strict'

function TraceRetriever (options) {
  this.web3 = options.web3
}

TraceRetriever.prototype.getTrace = function (txHash) {
  return new Promise((resolve, reject) => {
    const options = {
      disableStorage: true,
      disableMemory: false,
      disableStack: false,
      fullStorage: false
    }
    this.web3.debug.traceTransaction(txHash, options, function (error, result) {
      if (error) return reject(error)
      resolve(result)
    })
  })
}

module.exports = TraceRetriever
