const init = require('../init')

function Web3Providers () {
  this.modes = {}
}

Web3Providers.prototype.addProvider = function (type, obj) {
  if (type === 'INTERNAL') {
    const web3 = init.loadWeb3()
    this.addWeb3(type, web3)
  } else {
    init.extendWeb3(obj)
    this.addWeb3(type, obj)
  }
}

Web3Providers.prototype.get = function (type, cb) {
  if (this.modes[type]) {
    cb(null, this.modes[type])
  } else {
    cb('error: this provider has not been setup (' + type + ')', null)
  }
}

Web3Providers.prototype.addWeb3 = function (type, web3) {
  this.modes[type] = web3
}

module.exports = Web3Providers
