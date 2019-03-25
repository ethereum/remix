const log = require('./utils/logs.js')
const merge = require('merge')
var remixLib = require('remix-lib')

var executionContext = remixLib.execution.executionContext
const Accounts = require('./methods/accounts.js')
const Blocks = require('./methods/blocks.js')
const Misc = require('./methods/misc.js')
const Net = require('./methods/net.js')
const Transactions = require('./methods/transactions.js')
const Whisper = require('./methods/whisper.js')

var Provider = function () {
  executionContext.setContext('vm', null, () => {}, (msg) => { console.log(msg) })

  this.Accounts = new Accounts()
  this.methods = {}
  this.methods = merge(this.methods, this.Accounts.methods())
  this.methods = merge(this.methods, (new Blocks()).methods())
  this.methods = merge(this.methods, (new Misc()).methods())
  this.methods = merge(this.methods, (new Net()).methods())
  this.methods = merge(this.methods, (new Transactions(this.Accounts.accounts)).methods())
  this.methods = merge(this.methods, (new Whisper()).methods())
}

Provider.prototype.sendAsync = function (payload, callback) {
  log.info('payload method is ', payload.method)

  let method = this.methods[payload.method]
  if (method) {
    console.log(payload)
    return method.call(method, payload, (err, result) => {
      if (err) {
        return callback(err)
      }
      let response = {'id': payload.id, 'jsonrpc': '2.0', 'result': result}
      callback(null, response)
    })
  }
  callback(new Error('unknown method ' + payload.method))
}

Provider.prototype.send = function (payload, callback) {
  this.sendAsync(payload, callback || function () {})
}

Provider.prototype.isConnected = function () {
  return true
}

Provider.prototype.init = async function () {
  const accounts = this.Accounts.accounts
  let setAccounts = (i) => {
    return new Promise((resolve, reject) => {
      const account = accounts[i]

      let stateManager = executionContext.vm().stateManager
      const address = account.address
      stateManager.getAccount(account.address, (error, account) => {
        if (error) return reject(error)
        account.balance = '0xf00000000000000001'
        console.log('available address : ', address)
        stateManager.putAccount(address, account, function cb (error, result) {
          console.log('setBalance', address)
          if (error) return reject(error)
          console.log(result)
          resolve()
        })
      })
    })
  }
  await setAccounts(0)
  await setAccounts(1)
  await setAccounts(2)
}

module.exports = Provider
