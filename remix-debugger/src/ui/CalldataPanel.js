'use strict'
var DropdownPanel = require('./DropdownPanel')
var yo = require('yo-yo')

function CalldataPanel (_parent, _traceManager) {
  this.parent = _parent
  this.traceManager = _traceManager
  this.basicPanel = new DropdownPanel('Call Data', {json: true})
  this.init()
}

CalldataPanel.prototype.render = function () {
  return yo`<div id='calldatapanel' >${this.basicPanel.render()}</div>`
}

CalldataPanel.prototype.init = function () {
  var self = this
  this.parent.event.register('indexChanged', this, function (index) {
    if (index < 0) return
    if (self.parent.currentStepIndex !== index) return
    try {
      const calldata = self.traceManager.getCallDataAt(index)
      if (self.parent.currentStepIndex === index) {
        self.basicPanel.update(calldata)
      }
    } catch (error) {
      self.basicPanel.update({})
      console.log(error)
    }
  })
}

module.exports = CalldataPanel
