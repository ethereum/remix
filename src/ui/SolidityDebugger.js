'use strict'
var style = require('./styles/basicStyles')
var SolidityStatePanel = require('./SolidityStatePanel')
var yo = require('yo-yo')
var ui = require('../helpers/ui')

function SolidityDebugger (_parent, _traceManager, _codeManager) {
  this.solidityStatePanel = new SolidityStatePanel(_parent, _traceManager, _codeManager)
  this.view
  var self = this
  _parent.register('newTraceLoaded', this, function () {
    self.view.style.display = 'block'
  })
  _parent.register('traceUnloaded', this, function () {
    self.view.style.display = 'none'
  })
}

SolidityDebugger.prototype.setCompilationResult = function (astList, compiledContracts) {
  this.solidityStatePanel.setCompilationResult(astList, compiledContracts)
}

SolidityDebugger.prototype.render = function () {
  var view = yo`<div id='soldebugger' style='display:none'>
        <div style=${ui.formatCss(style.container)}>
          <table>
            <tbody>  
              <tr>
               <td>
                  ${this.solidityStatePanel.render()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>`
  if (!this.view) {
    this.view = view
  }
  return view
}

module.exports = SolidityDebugger
