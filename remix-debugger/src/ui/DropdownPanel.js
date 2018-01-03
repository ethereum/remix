'use strict'
var yo = require('yo-yo')
var remixLib = require('remix-lib')
var ui = remixLib.helpers.ui
var styleDropdown = require('./styles/dropdownPanel')
var TreeView = require('./TreeView')
var EventManager = remixLib.EventManager

var csjs = require('csjs-inject')
var styleGuide = remixLib.ui.styleGuide
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
  .eyeButton {
    ${styles.rightPanel.debuggerTab.button_Debugger}
    color: ${styles.rightPanel.debuggerTab.button_Debugger_icon_Color};
    margin: 3px;
    float: right;
  }
  .eyeButton:hover {
    color: ${styles.rightPanel.debuggerTab.button_Debugger_icon_HoverColor};
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
    this.view.querySelector('.dropdownpanel .fa-refresh').style.display = 'none'
    this.message(message)
  }
}

DropdownPanel.prototype.setLoading = function () {
  if (this.view) {
    this.view.querySelector('.dropdownpanel .dropdownrawcontent').style.display = 'none'
    this.view.querySelector('.dropdownpanel .dropdowncontent').style.display = 'none'
    this.view.querySelector('.dropdownpanel .fa-refresh').style.display = 'inline-block'
    this.message('')
  }
}

DropdownPanel.prototype.setUpdating = function () {
  if (this.view) {
    this.view.querySelector('.dropdownpanel .dropdowncontent').style.color = 'gray'
  }
}

DropdownPanel.prototype.update = function (_data, _header) {
  if (this.view) {
    this.view.querySelector('.dropdownpanel .fa-refresh').style.display = 'none'
    this.view.querySelector('.dropdownpanel .dropdowncontent').style.display = 'block'
    this.view.querySelector('.dropdownpanel .dropdowncontent').style.color = 'black'
    this.view.querySelector('.dropdownpanel .dropdownrawcontent').innerText = JSON.stringify(_data, null, '\t')
    this.view.querySelector('.dropdownpanel button.btn').style.display = 'block'
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
    <div class='${css.title} title' onclick=${function () { self.toggle() }}>
      <div class='${css.icon} fa fa-caret-right'></div>
      <div class=${css.name}>${this.name}</div><span></span>
    </div>
    <div class='dropdownpanel' style=${ui.formatCss(styleDropdown.content)} style='display:none'>
      <button onclick=${function () { self.toggleRaw() }} title='raw' class="${css.eyeButton} btn fa fa-eye" type="button">
      </button>
      <i class="fa fa-refresh" style=${ui.formatCss(styleDropdown.inner, overridestyle, {display: 'none', 'margin-left': '4px', 'margin-top': '4px', 'animation': 'spin 2s linear infinite'})} aria-hidden="true"></i>
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
  var raw = this.view.querySelector('.dropdownpanel .dropdownrawcontent')
  var formatted = this.view.querySelector('.dropdownpanel .dropdowncontent')
  raw.style.display = raw.style.display === 'none' ? 'block' : 'none'
  formatted.style.display = formatted.style.display === 'none' ? 'block' : 'none'
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
