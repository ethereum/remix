var Web3 = require('web3')
var remixLib = require('remix-lib')
var executionContext = remixLib.execution.executionContext

var Accounts = function () {
  this.web3 = new Web3()
  // TODO: make it random and/or use remix-libs
  this.accounts = [this.web3.eth.accounts.create(['abcd']), this.web3.eth.accounts.create(['ef12']), this.web3.eth.accounts.create(['ef34'])]

  let setAccounts = (i) => {
    const account = this.accounts[i]
    this.accounts[account.address.toLowerCase()] = account
    this.accounts[account.address.toLowerCase()].privateKey = Buffer.from(this.accounts[account.address.toLowerCase()].privateKey.slice(2), 'hex')

    console.log('isVM', executionContext.isVM())
    console.log('provider', executionContext.getProvider())
    let stateManager = executionContext.vm().stateManager
    const address = account.address
    stateManager.getAccount(account.address, (error, account) => {
      if (error) return console.log(error)
      account.balance = '0xf00000000000000001'
      console.log('available address : ', address)
      stateManager.putAccount(address, account, function cb (error) {
        if (error) console.log(error)
      })
    })
  }

  setAccounts(0)
  setAccounts(1)
  setAccounts(2)
}

Accounts.prototype.methods = function () {
  return {
    eth_accounts: this.eth_accounts.bind(this)
  }
}

Accounts.prototype.eth_accounts = function (payload, cb) {
  return cb(null, this.accounts.map((x) => x.address))
}

module.exports = Accounts
