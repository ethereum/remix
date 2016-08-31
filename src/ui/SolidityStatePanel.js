'use strict'
var BasicPanel = require('./BasicPanel')
var yo = require('yo-yo')
var contractsHelper = require('../solidity/contracts')
var helper = require('../helpers/traceHelper')

function SolidityStatePanel (_parent, _traceManager, _codeManager) {
  this.parent = _parent
  this.traceManager = _traceManager
  this.codeManager = _codeManager
  this.basicPanel = new BasicPanel('Solidity State')
  this.init()
  this.disabled = false
  this.astList
  this.compiledContracts
  this.cache = new Cache()
}

SolidityStatePanel.prototype.render = function () {
  return yo`<div id='soliditystate' >${this.basicPanel.render()}</div>`
}

SolidityStatePanel.prototype.setCompilationResult = function (astList, compiledContracts) {
  this.astList = astList
  this.compiledContracts = compiledContracts
}

SolidityStatePanel.prototype.init = function () {
  var self = this
  this.parent.register('indexChanged', this, function (index) {
    if (self.disabled) return
    if (index < 0) return
    if (self.parent.currentStepIndex !== index) return

    self.traceManager.getStorageAt(index, self.parent.tx, function (error, storage) {
      if (error) {
        console.log(error)
        self.basicPanel.data = ''
      } else if (self.parent.currentStepIndex === index) {
        self.traceManager.getCurrentCalledAddressAt(index, function (error, address) {
          if (!error) {
            self.codeManager.getCode(address, function (error, code) {
              if (!error) {
                self.basicPanel.data = self.formatSolState(address, code, storage)
              }
            })
          }
        })
      }
      self.basicPanel.update()
    }, self.address)
  })
}

SolidityStatePanel.prototype.formatSolState = function (address, code, storage) {
  var ctrName = this.cache.contractNameByAddress[address]
  if (!ctrName) {
    for (var k in this.compiledContracts) {
      var isCreation = helper.isContractCreation(address)
      var byteProp = isCreation ? 'bytecode' : 'runtimeBytecode'
      if ('0x' + this.compiledContracts[k][byteProp] === code.bytes) {
        ctrName = k
        break
      }
    }
  }

  if (ctrName) {
    this.cache.contractNameByAddress[address] = ctrName
    var storageLocation = this.cache.storageLocationByContract[ctrName]
    if (!storageLocation) {
      storageLocation = contractsHelper.getStorageLocationOf(ctrName, this.astList)
      this.cache.storageLocationByContract[ctrName] = storageLocation
    }
    var stateVar = contractsHelper.decodeState(storageLocation, storage)
    return JSON.stringify(stateVar, null, ' ')
  } else {
    return 'cannot found contract for address ' + address
  }
}

function Cache () {
  this.contractNameByAddress = {}
  this.storageLocationByContract = {}
  this.clear = function () {
    this.storageLocationByContract = {}
    this.contractNameByAddress = {}
  }
}

module.exports = SolidityStatePanel
