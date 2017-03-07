'use strict'
var traceHelper = require('../helpers/traceHelper')
var util = require('../helpers/global')

class StorageResolver {
  constructor (_debugger) {
    this.debugger = _debugger
    this.clear()
    _debugger.event.register('newTraceLoaded', () => {
      this.clear()
    })
  }

  storageRange (callback) {
    resolveAddress(this.debugger.traceManager, this.debugger.currentStepIndex, (error, address) => {
      if (error) {
        callback(error)
      } else {
        if (traceHelper.isContractCreation(address)) {
          callback(null, {})
        } else {
          if (util.web3.debug.storageRangeAt) {
            if (this.isComplete(address)) {
              callback(null, this.fromCache(address))
            } else {
              var start = '0x0'
              var maxSize = 10000
              // we just load the entire storage here. that stuff is used by FullStoragesChanges.js.
              // assume 10000 is enough for now
              // TODO: improve that later
              storageRangeAtInternal(this.debugger.tx, address, start, maxSize, (error, result) => {
                console.log('requesting storageRange ' + result)
                if (error) {
                  callback(error)
                } else {
                  this.toCache(address, result, true)
                  callback(null, result)
                }
              })
            }
          } else {
            callback('no storageRangeAt endpoint found')
          }
        }
      }
    })
  }

  storageSlotValue (slot, callback) {
    resolveAddress(this.debugger.traceManager, this.debugger.currentStepIndex, (error, address) => {
      if (error) {
        callback(error)
      } else {
        var slotValue = this.fromCache(address, slot)
        slotValue = slotValue.value
        if (slotValue) {
          callback(null, slotValue)
        } else {
          // we load the asked slot and the next 1000 slots

          storageRangeAtInternal(this.debugger.tx, address, slot, 1000, (error, result) => {
            console.log('requesting storageSlotValue ' + slot + ' ' + result)
            var slotValue = result[0].value
            if (error) {
              callback(error)
            } else {
              this.toCache(address, result)
              callback(null, {
                key: slot,
                slotValue: slotValue
              })
            }
          })
        }
      }
    })
  }

  isComplete (address) {
    return this.storageByAddress[address] && this.storageByAddress[address].complete
  }

  fromCache (address, slot) {
    if (!this.storageByAddress[address]) {
      return null
    }
    return slot ? this.storageByAddress[address].storage[slot] : this.storageByAddress[address].storage
  }

  toCache (address, storage, complete) {
    if (!this.storageByAddress[address]) {
      this.storageByAddress[address] = {}
    }
    this.storageByAddress[address].storage = Object.assign(this.storageByAddress[address].storage || {}, storage)
    if (complete !== undefined) {
      this.storageByAddress[address].complete = complete
    }
  }

  clear () {
    this.storageByAddress = {}
  }
}

function resolveAddress (traceManager, currentStep, callback) {
  traceManager.getCurrentCalledAddressAt(currentStep, (error, result) => {
    if (error) {
      callback(error)
    } else {
      callback(null, result)
    }
  })
}

function storageRangeAtInternal (tx, address, start, maxSize, callback) {
  util.web3.debug.storageRangeAt(
    tx.blockHash, tx.transactionIndex === undefined ? tx.hash : tx.transactionIndex,
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
