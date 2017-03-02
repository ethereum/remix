'use strict'
var traceHelper = require('../helpers/traceHelper')
var util = require('../helpers/global')

class StorageResolver {
  constructor () {
    this.clear()
  }

  storageRangeAt (beforeTx, address, callback) {
    if (traceHelper.isContractCreation(address)) {
      callback(null, {})
    } else {
      if (util.web3.debug.storageRangeAt) {
        if (this.isComplete(address)) {
          callback(null, this.fromCache(address))
        } else {
          var start = 0
          var maxSize = 10000
          // we just load the entire storage here. that stuff is used by FullStoragesChanges.js.
          // assume 10000 is enough for now
          // TODO: improve that later
          storageRangeAtInternal(beforeTx, address, start, maxSize, (error, result) => {
            if (error) {
              callback(error)
            } else {
              this.toCache(address, result, true)
              callback(result)
            }
          })
        }
      } else {
        callback('no storageRangeAt endpoint found')
      }
    }
  }

  storageSlotValue (beforeTx, address, slot, callback) {
    var slotValue = this.fromCache(address, slot)
    if (slotValue) {
      callback(null, slotValue)
    } else {
      // we load the asked slot and the next 1000 slots
      storageRangeAtInternal(beforeTx, address, slot, 1000, (error, result) => {
        if (error) {
          callback(error)
        } else {
          this.toCache(address, result)
          callback(result)
        }
      })
    }
  }

  isComplete (address) {
    return this.storageByAddress[address] && this.storageByAddress[address].complete
  }

  fromCache (address, slot) {
    return slot ? this.storageByAddress[address].storage[slot] : this.storageByAddress[address].storage
  }

  toCache (address, storage, complete) {
    this.storageByAddress[address].storage = Object.assign(this.storageByAddress[address].storage || {}, storage)
    if (complete !== undefined) {
      this.storageByAddress[address].complete = complete
    }
  }

  clear () {
    this.storageByAddress = {}
  }
}

function storageRangeAtInternal (beforeTx, address, start, maxSize, callback) {
  util.web3.debug.storageRangeAt(
    beforeTx.blockHash, beforeTx.transactionIndex === undefined ? beforeTx.hash : beforeTx.transactionIndex,
    address,
    start,
    maxSize,
    (error, result) => {
      if (error) {
        callback(error)
      } else if (result.storage) {
        callback(null, result.storage)
      } else {
        callback('storage has not been provided')
      }
    })
}

module.exports = StorageResolver
