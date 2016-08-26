'use strict'
var BasicPanel = require('./BasicPanel')
var yo = require('yo-yo')
var util = require('../helpers/global')
var contractsHelper = require('../helpers/contracts')
var helper = require('../helpers/traceHelper')

function SolidityStatePanel (_parent, _traceManager, _codeManager) {
  this.parent = _parent
  this.traceManager = _traceManager
  this.codeManager = _codeManager
  this.basicPanel = new BasicPanel('Solidity State')
  this.init()
  this.disabled = false
}

SolidityStatePanel.prototype.render = function () {
  return yo`<div id='soliditystate' >${this.basicPanel.render()}</div>`
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
            self.codeManager.getCode(address, index, function (error, code) {
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
  var ctrName
  for (var k in util.compilationData.contracts) {
    var isCreation = helper.isContractCreation(address)
    var byteProp = isCreation ? 'bytecode' : 'runtimeBytecode'
    if (util.compilationData.contracts[k][byteProp] === code.byte) {
      ctrName = k
      break
    }
  }
  if (ctrName) {
    var stateVar = contractsHelper.getSolidityState(storage, util.compilationData.sources, ctrName)
    return JSON.stringify(stateVar)
  }
}

module.exports = SolidityStatePanel
