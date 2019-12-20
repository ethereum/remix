const async = require('async')
const { BN, privateToAddress, isValidPrivate, stripHexPrefix, toChecksumAddress } = require('ethereumjs-util')
const crypto = require('crypto')
const { EventEmitter } = require('events')

const TxRunner = require('./execution/txRunner')
const txHelper = require('./execution/txHelper')
const EventManager = require('./eventManager')
const executionContext = require('./execution/execution-context')
const { resultToRemixTx } = require('./helpers/txResultHelper')

module.exports = class UniversalDApp {

  constructor (config) {
    this.events = new EventEmitter()
    this.event = new EventManager()
    this.config = config

    this.txRunner = new TxRunner({}, {
      config: config,
      detectNetwork: (cb) => {
        executionContext.detectNetwork(cb)
      },
      personalMode: () => {
        return executionContext.getProvider() === 'web3' ? this.config.get('settings/personal-mode') : false
      }
    })
    this.accounts = {}
    executionContext.event.register('contextChanged', this.resetEnvironment.bind(this))
  }

  // TODO : event should be triggered by Udapp instead of TxListener
  /** Listen on New Transaction. (Cannot be done inside constructor because txlistener doesn't exist yet) */
  startListening (txlistener) {
    txlistener.event.register('newTransaction', (tx) => {
      this.events.emit('newTransaction', tx)
    })
  }

  resetEnvironment () {
    this.accounts = {}
    if (executionContext.isVM()) {
      this._addAccount('3cd7232cd6f3fc66a57a6bedc1a8ed6c228fff0a327e169c2bcc5e869ed49511', '0x56BC75E2D63100000')
      this._addAccount('2ac6c190b09897cd8987869cc7b918cfea07ee82038d492abce033c75c1b1d0c', '0x56BC75E2D63100000')
      this._addAccount('dae9801649ba2d95a21e688b56f77905e5667c44ce868ec83f82e838712a2c7a', '0x56BC75E2D63100000')
      this._addAccount('d74aa6d18aa79a05f3473dd030a97d3305737cbc8337d940344345c1f6b72eea', '0x56BC75E2D63100000')
      this._addAccount('71975fbf7fe448e004ac7ae54cad0a383c3906055a65468714156a07385e96ce', '0x56BC75E2D63100000')
    }
    // TODO: most params here can be refactored away in txRunner
    this.txRunner = new TxRunner(this.accounts, {
      // TODO: only used to check value of doNotShowTransactionConfirmationAgain property
      config: this.config,
      // TODO: to refactor, TxRunner already has access to executionContext
      detectNetwork: (cb) => {
        executionContext.detectNetwork(cb)
      },
      personalMode: () => {
        return executionContext.getProvider() === 'web3' ? this.config.get('settings/personal-mode') : false
      }
    })
    this.txRunner.event.register('transactionBroadcasted', (txhash) => {
      executionContext.detectNetwork((error, network) => {
        if (error || !network) return
        this.event.trigger('transactionBroadcasted', [txhash, network.name])
      })
    })
  }

  resetAPI (transactionContextAPI) {
    this.transactionContextAPI = transactionContextAPI
  }

  /**
   * Create a VM Account
   * @param {{privateKey: string, balance: string}} newAccount The new account to create
   */
  createVMAccount (newAccount) {
    const { privateKey, balance } = newAccount
    if (executionContext.getProvider() !== 'vm') {
      throw new Error('plugin API does not allow creating a new account through web3 connection. Only vm mode is allowed')
    }
    this._addAccount(privateKey, balance)
    const privKey = Buffer.from(privateKey, 'hex')
    return '0x' + privateToAddress(privKey).toString('hex')
  }

  newAccount (password, passwordPromptCb, cb) {
    if (!executionContext.isVM()) {
      if (!this.config.get('settings/personal-mode')) {
        return cb('Not running in personal mode')
      }
      passwordPromptCb((passphrase) => {
        executionContext.web3().personal.newAccount(passphrase, cb)
      })
    } else {
      let privateKey
      do {
        privateKey = crypto.randomBytes(32)
      } while (!isValidPrivate(privateKey))
      this._addAccount(privateKey, '0x56BC75E2D63100000')
      cb(null, '0x' + privateToAddress(privateKey).toString('hex'))
    }
  }

  /** Add an account to the list of account (only for Javascript VM) */
  _addAccount (privateKey, balance) {
    if (!executionContext.isVM()) {
      throw new Error('_addAccount() cannot be called in non-VM mode')
    }

    if (this.accounts) {
      privateKey = Buffer.from(privateKey, 'hex')
      const address = privateToAddress(privateKey)

      // FIXME: we don't care about the callback, but we should still make this proper
      let stateManager = executionContext.vm().stateManager
      stateManager.getAccount(address, (error, account) => {
        if (error) return console.log(error)
        account.balance = balance || '0xf00000000000000001'
        stateManager.putAccount(address, account, function cb (error) {
          if (error) console.log(error)
        })
      })

      this.accounts[toChecksumAddress('0x' + address.toString('hex'))] = { privateKey, nonce: 0 }
    }
  }

  /** Return the list of accounts */
  getAccounts (cb) {
    return new Promise((resolve, reject) => {
      const provider = executionContext.getProvider()
      switch (provider) {
        case 'vm': {
          if (!this.accounts) {
            if (cb) cb('No accounts?')
            reject('No accounts?')
            return
          }
          if (cb) cb(null, Object.keys(this.accounts))
          resolve(Object.keys(this.accounts))
        }
          break
        case 'web3': {
          if (this.config.get('settings/personal-mode')) {
            return executionContext.web3().personal.getListAccounts((error, accounts) => {
              if (cb) cb(error, accounts)
              if (error) return reject(error)
              resolve(accounts)
            })
          } else {
            executionContext.web3().eth.getAccounts((error, accounts) => {
              if (cb) cb(error, accounts)
              if (error) return reject(error)
              resolve(accounts)
            })
          }
        }
          break
        case 'injected': {
          executionContext.web3().eth.getAccounts((error, accounts) => {
            if (cb) cb(error, accounts)
            if (error) return reject(error)
            resolve(accounts)
          })
        }
      }
    })
  }

  /** Get the balance of an address */
  getBalance (address, cb) {
    address = stripHexPrefix(address)

    if (!executionContext.isVM()) {
      executionContext.web3().eth.getBalance(address, (err, res) => {
        if (err) {
          cb(err)
        } else {
          cb(null, res.toString(10))
        }
      })
    } else {
      if (!this.accounts) {
        return cb('No accounts?')
      }

      executionContext.vm().stateManager.getAccount(Buffer.from(address, 'hex'), (err, res) => {
        if (err) {
          cb('Account not found')
        } else {
          cb(null, new BN(res.balance).toString(10))
        }
      })
    }
  }

  /** Get the balance of an address, and convert wei to ether */
  getBalanceInEther (address, callback) {
    this.getBalance(address, (error, balance) => {
      if (error) {
        callback(error)
      } else {
        callback(null, executionContext.web3().fromWei(balance, 'ether'))
      }
    })
  }

  pendingTransactionsCount () {
    return Object.keys(this.txRunner.pendingTxs).length
  }

  /**
    * deploy the given contract
    *
    * @param {String} data    - data to send with the transaction ( return of txFormat.buildData(...) ).
    * @param {Function} callback    - callback.
    */
  createContract (data, confirmationCb, continueCb, promptCb, callback) {
    this.runTx({data: data, useCall: false}, confirmationCb, continueCb, promptCb, (error, txResult) => {
      // see universaldapp.js line 660 => 700 to check possible values of txResult (error case)
      callback(error, txResult)
    })
  }

  /**
    * call the current given contract
    *
    * @param {String} to    - address of the contract to call.
    * @param {String} data    - data to send with the transaction ( return of txFormat.buildData(...) ).
    * @param {Object} funAbi    - abi definition of the function to call.
    * @param {Function} callback    - callback.
    */
  callFunction (to, data, funAbi, confirmationCb, continueCb, promptCb, callback) {
    const useCall = funAbi.stateMutability === 'view' || funAbi.stateMutability === 'pure'
    this.runTx({to, data, useCall}, confirmationCb, continueCb, promptCb, (error, txResult) => {
      // see universaldapp.js line 660 => 700 to check possible values of txResult (error case)
      callback(error, txResult)
    })
  }

  context () {
    return (executionContext.isVM() ? 'memory' : 'blockchain')
  }

  getABI (contract) {
    return txHelper.sortAbiFunction(contract.abi)
  }

  getFallbackInterface (contractABI) {
    return txHelper.getFallbackInterface(contractABI)
  }

  getInputs (funABI) {
    if (!funABI.inputs) {
      return ''
    }
    return txHelper.inputParametersDeclarationToString(funABI.inputs)
  }

  /**
   * This function send a tx only to javascript VM or testnet, will return an error for the mainnet
   * SHOULD BE TAKEN CAREFULLY!
   *
   * @param {Object} tx    - transaction.
   */
  sendTransaction (tx) {
    return new Promise((resolve, reject) => {
      executionContext.detectNetwork((error, network) => {
        if (error) return reject(error)
        if (network.name === 'Main' && network.id === '1') {
          return reject(new Error('It is not allowed to make this action against mainnet'))
        }
        this.silentRunTx(tx, (error, result) => {
          if (error) return reject(error)
          try {
            resolve(resultToRemixTx(result))
          } catch (e) {
            reject(e)
          }
        })
      })
    })
  }

  /**
   * This function send a tx without alerting the user (if mainnet or if gas estimation too high).
   * SHOULD BE TAKEN CAREFULLY!
   *
   * @param {Object} tx    - transaction.
   * @param {Function} callback    - callback.
   */
  silentRunTx (tx, cb) {
    this.txRunner.rawRun(
      tx,
      (network, tx, gasEstimation, continueTxExecution, cancelCb) => { continueTxExecution() },
      (error, continueTxExecution, cancelCb) => { if (error) { cb(error) } else { continueTxExecution() } },
      (okCb, cancelCb) => { okCb() },
      cb
    )
  }

  runTx (args, confirmationCb, continueCb, promptCb, cb) {
    const self = this
    async.waterfall([
      function getGasLimit (next) {
        if (self.transactionContextAPI.getGasLimit) {
          return self.transactionContextAPI.getGasLimit(next)
        }
        next(null, 3000000)
      },
      function queryValue (gasLimit, next) {
        if (args.value) {
          return next(null, args.value, gasLimit)
        }
        if (args.useCall || !self.transactionContextAPI.getValue) {
          return next(null, 0, gasLimit)
        }
        self.transactionContextAPI.getValue(function (err, value) {
          next(err, value, gasLimit)
        })
      },
      function getAccount (value, gasLimit, next) {
        if (args.from) {
          return next(null, args.from, value, gasLimit)
        }
        if (self.transactionContextAPI.getAddress) {
          return self.transactionContextAPI.getAddress(function (err, address) {
            next(err, address, value, gasLimit)
          })
        }
        self.getAccounts(function (err, accounts) {
          let address = accounts[0]

          if (err) return next(err)
          if (!address) return next('No accounts available')
          if (executionContext.isVM() && !self.accounts[address]) {
            return next('Invalid account selected')
          }
          next(null, address, value, gasLimit)
        })
      },
      function runTransaction (fromAddress, value, gasLimit, next) {
        const tx = { to: args.to, data: args.data.dataHex, useCall: args.useCall, from: fromAddress, value: value, gasLimit: gasLimit, timestamp: args.data.timestamp }
        const payLoad = { funAbi: args.data.funAbi, funArgs: args.data.funArgs, contractBytecode: args.data.contractBytecode, contractName: args.data.contractName, contractABI: args.data.contractABI, linkReferences: args.data.linkReferences }
        let timestamp = Date.now()
        if (tx.timestamp) {
          timestamp = tx.timestamp
        }

        self.event.trigger('initiatingTransaction', [timestamp, tx, payLoad])
        self.txRunner.rawRun(tx, confirmationCb, continueCb, promptCb,
          function (error, result) {
            let eventName = (tx.useCall ? 'callExecuted' : 'transactionExecuted')
            self.event.trigger(eventName, [error, tx.from, tx.to, tx.data, tx.useCall, result, timestamp, payLoad])

            if (error && (typeof (error) !== 'string')) {
              if (error.message) error = error.message
              else {
                try { error = 'error: ' + JSON.stringify(error) } catch (e) {}
              }
            }
            next(error, result)
          }
        )
      }
    ], cb)
  }
}
