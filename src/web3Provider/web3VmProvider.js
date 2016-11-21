var util = require('../helpers/util')
var Web3 = require('web3')

function web3VmProvider () {
  var self = this
  this.web3 = new Web3()
  this.vm
  this.txs = {}
  this.vms = {}
  this.eth = {}
  this.debug = {}
  this.eth.getCode = function (address, cb) { return self.getCode(address, cb) }
  this.eth.getTransaction = function (hash, cb) { return self.getTransaction(hash, cb) }
  this.eth.getTransactionFromBlock = function (blockNumber, txIndex, cb) { return self.getTransactionFromBlock(blockNumber, txIndex, cb) }
  this.eth.getBlockNumber = function (cb) { return self.getBlockNumber(cb) }
  this.debug.traceTransaction = function (hash, options, cb) { return self.traceTransaction(hash, options, cb) }
  this.debug.storageAt = function (blockNumber, txIndex, address, cb) { return self.storageAt(blockNumber, txIndex, address, cb) }
  this.providers = { 'HttpProvider': function (url) {} }
  this.currentProvider = {'host': 'vm provider'}
}

web3VmProvider.prototype.setVM = function (vm) {
  var self = this
  this.vm = vm
  this.vm.on('beforeTx', function (data) {
    var hash = util.hexConvert(data.hash())
    self.txs[hash] = data
    self.vms[hash] = self.vm.copy()
  })
}

web3VmProvider.prototype.getCode = function (address, cb) {
  this.vm.stateManager.getContractCode(address, function (error, result) {
    cb(error, util.hexConvert(result))
  })
}

web3VmProvider.prototype.setProvider = function (provider) {}

web3VmProvider.prototype.traceTransaction = function (txHash, options, cb) {
  var vm = this.vms[txHash]
  var tx = this.txs[txHash]
  var vmtrace = {
    gas: '0x0',
    return: '0x0',
    structLogs: []
  }
  vm.on('step', function (data) {
    var step = {
      stack: util.hexListConvert(data.stack),
      memory: util.formatMemory(data.memory),
      storage: data.storage,
      op: data.opcode.name,
      pc: data.pc,
      gasCost: data.opcode.fee.toString(),
      gas: data.gasLeft.toString()
    }
    vmtrace.structLogs.push(step)
  })
  vm.on('afterTx', function (data) {
    cb(null, vmtrace)
  })
  vm.runTx({
    tx: tx,
    skipBalance: true,
    skipNonce: true
  }, function (error, result) {
    if (error) {
      cb(error)
    }
  })
}

web3VmProvider.prototype.storageAt = function (blockNumber, txIndex, address, cb) { cb(null, {}) }

web3VmProvider.prototype.getBlockNumber = function (cb) { cb(null, 'vm provider') }

web3VmProvider.prototype.getTransaction = function (txHash, cb) {
  if (this.txs[txHash]) {
    var dataTx = this.txs[txHash]
    var tx = {}
    tx.hash = txHash
    tx.from = util.hexConvert(dataTx.getSenderAddress())
    if (dataTx.to && dataTx.to.length) {
      tx.to = util.hexConvert(dataTx.to)
    }
    tx.data = util.hexConvert(dataTx.data)
    tx.input = util.hexConvert(dataTx.input)
    tx.gas = util.hexConvert(dataTx.gas)
    if (dataTx.value) {
      tx.value = util.hexConvert(dataTx.value)
    }
    if (cb) {
      cb(null, tx)
    }
    return tx
  } else {
    if (cb) {
      cb('unable to retrieve tx ' + txHash, null)
    }
  }
}

web3VmProvider.prototype.getTransactionFromBlock = function (blockNumber, txIndex, cb) {
  var mes = 'not supposed to be needed by remix in vmmode'
  console.log(mes)
  if (cb) {
    cb(mes, null)
  }
}

module.exports = web3VmProvider
