'use strict'
var yo = require('yo-yo')
var ui = require('../helpers/ui')
var styleDropdown = require('./styles/dropdownPanel')
var TreeView = require('./TreeView')
var EventManager = require('../lib/eventManager')
const copy = require('clipboard-copy')

var csjs = require('csjs-inject')
var styleGuide = require('./styles/style-guide')
var styles = styleGuide()

var css = csjs`
  .title {
    margin-top: 10px;
    ${styles.rightPanel.debuggerTab.dropdown_Debugger}
    display: flex;
    align-items: center;
  }
  .name {
    font-weight: bold;
  }
  .icon {
    color: ${styles.rightPanel.debuggerTab.button_Debugger_icon_Color};
    margin-right: 5%;
  }
  .dropdownContainer {
    display: flex;
    align-items: baseline;
    justify-content: center;
  }
  .copyToClipboard {
    margin-left: 5px;
    color: ${styles.rightPanel.debuggerTab.button_Debugger_icon_Color};
  }
  .copyToClipboard:hover {
    color: ${styles.rightPanel.debuggerTab.button_Debugger_icon_HoverColor};
    cursor: pointer;
  }
  .dropdownContent {
    background-color: red;
  }
`

function DropdownPanel (_name, _opts) {
  this.event = new EventManager()
  if (!_opts) {
    _opts = {}
  }
  this.name = _name
  this.header = ''
  this.json = _opts.json
  if (this.json) {
    this.treeView = new TreeView(_opts)
  }
  this.view
}

DropdownPanel.prototype.setMessage = function (message) {
  if (this.view) {
    this.view.querySelector('.dropdownpanel .dropdownrawcontent').style.display = 'none'
    this.view.querySelector('.dropdownpanel .dropdowncontent').style.display = 'none'
    this.message(message)
  }
}

DropdownPanel.prototype.setLoading = function () {
  if (this.view) {
    this.view.querySelector('.dropdownpanel .dropdownrawcontent').style.display = 'none'
    this.view.querySelector('.dropdownpanel .dropdowncontent').style.display = 'none'
    this.message('')
  }
}

DropdownPanel.prototype.update = function (_data, _header) {
  if (this.view) {
    this.view.querySelector('.dropdownpanel .dropdowncontent').style.display = 'block'
    this.view.querySelector('.dropdownpanel .dropdownrawcontent').innerText = JSON.stringify(_data, null, '\t')
    this.view.querySelector('.title span').innerText = _header || ' '
    this.message('')
    if (this.json) {
      this.treeView.update(_data)
    }
  }
}

DropdownPanel.prototype.setContent = function (node) {
  if (this.view) {
    var parent = this.view.querySelector('.dropdownpanel div.dropdowncontent')
    parent.replaceChild(node, parent.firstElementChild)
  }
}

DropdownPanel.prototype.render = function (overridestyle) {
  var content = yo`<div>Empty</div>`
  if (this.json) {
    content = this.treeView.render({})
  }
  overridestyle === undefined ? {} : overridestyle
  var self = this
  var view = yo`
    <div>
      <style>
        @-moz-keyframes spin {
          to { -moz-transform: rotate(359deg); }
        }
        @-webkit-keyframes spin {
          to { -webkit-transform: rotate(359deg); }
        }
        @keyframes spin {
          to {transform:rotate(359deg);}
        }
      </style>
      <div class=${css.dropdownContainer}>
        <div class='${css.title} title' onclick=${function () { self.toggle() }}>
          <div class='${css.icon} fa fa-caret-right'></div>
          <div class=${css.name}>${this.name}</div><span></span>
        </div>
        <div onclick=${function () { self.toggleRaw() }} title='Copy raw' class="${css.copyToClipboard} fa fa-clipboard"></div>
      </div>
        <div class='dropdownpanel' style=${ui.formatCss(styleDropdown.content)} style='display:none'>
          <div style=${ui.formatCss(styleDropdown.inner, overridestyle)} class='dropdowncontent'>${content}</div>
          <div style=${ui.formatCss(styleDropdown.inner, overridestyle)} class='dropdownrawcontent' style='display:none'></div>
          <div style=${ui.formatCss(styleDropdown.inner, overridestyle)} class='message' style='display:none'></div>
        </div>
    </div>`
  if (!this.view) {
    this.view = view
  }
  return view
}

DropdownPanel.prototype.toggleRaw = function () {
  var raw = this.view.querySelector('.dropdownpanel .dropdownrawcontent').innerText
  copy(raw)
}

DropdownPanel.prototype.toggle = function () {
  var el = this.view.querySelector('.dropdownpanel')
  var caret = this.view.querySelector('.title').firstElementChild
  if (el.style.display === '') {
    el.style.display = 'none'
    caret.className = `${css.icon} fa fa-caret-right`
    this.event.trigger('hide', [])
  } else {
    el.style.display = ''
    caret.className = `${css.icon} fa fa-caret-down`
    this.event.trigger('show', [])
  }
}

DropdownPanel.prototype.hide = function () {
  if (this.view) {
    var caret = this.view.querySelector('.title').firstElementChild
    var el = this.view.querySelector('.dropdownpanel')
    el.style.display = 'none'
    caret.className = `${css.icon} fa fa-caret-right`
    this.event.trigger('hide', [])
  }
}

DropdownPanel.prototype.show = function () {
  if (this.view) {
    var caret = this.view.querySelector('.title').firstElementChild
    var el = this.view.querySelector('.dropdownpanel')
    el.style.display = ''
    caret.className = `${css.icon} fa fa-caret-down`
    this.event.trigger('show', [])
  }
}

DropdownPanel.prototype.message = function (message) {
  if (this.view) {
    var mes = this.view.querySelector('.dropdownpanel .message')
    mes.innerText = message
    mes.style.display = (message === '') ? 'none' : 'block'
  }
}

module.exports = DropdownPanel
