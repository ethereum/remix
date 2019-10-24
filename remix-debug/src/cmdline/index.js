var Web3 = require('web3')
var Debugger = require('../debugger/debugger.js')
var ContextManager = require('./contextManager.js')
var EventManager = require('events')

class CmdLine {

  constructor () {
    this.events = new EventManager()
    this.lineColumnPos = null
    this.rawLocation = null
  }

  connect (providerType, url) {
    if (providerType !== 'http') throw new Error('unsupported provider type')
    this.web3 = new Web3(new Web3.providers.HttpProvider(url))
  }

  loadCompilationData (inputJson, outputJson) {
    let data = {}
    data.data = outputJson
    data.source = { sources: inputJson.sources }
    this.loadCompilationResult(data)
  }

  loadCompilationResult (compilationResult) {
    this.compilation = {}
    this.compilation.lastCompilationResult = compilationResult
  }

  initDebugger (cb) {
    const self = this
    this.contextManager = new ContextManager()

    this.debugger = new Debugger({
      web3: this.contextManager.getWeb3(),
      compiler: this.compilation
    })

    this.contextManager.event.register('providerChanged', () => {
      self.debugger.updateWeb3(self.contextManager.getWeb3())
    })

    this.contextManager.initProviders()

    this.contextManager.addProvider('debugger_web3', this.web3)
    this.contextManager.switchProvider('debugger_web3', cb)
  }

  getSource () {
    const self = this

    let lineColumnPos = this.lineColumnPos

    if (!lineColumnPos || !lineColumnPos.start) return []

    let content = self.compilation.lastCompilationResult.source.sources[this.filename].content.split('\n')

    let source = []

    let line
    line = content[lineColumnPos.start.line - 2]
    if (line !== undefined) {
      source.push('    ' + (lineColumnPos.start.line - 1) + ':  ' + line)
    }
    line = content[lineColumnPos.start.line - 1]
    if (line !== undefined) {
      source.push('    ' + lineColumnPos.start.line + ':  ' + line)
    }

    let currentLineNumber = lineColumnPos.start.line
    let currentLine = content[currentLineNumber]
    source.push('=>  ' + (currentLineNumber + 1) + ':  ' + currentLine)

    let startLine = lineColumnPos.start.line
    for (var i = 1; i < 4; i++) {
      let line = content[startLine + i]
      source.push('    ' + (startLine + i + 1) + ':  ' + line)
    }

    return source
  }

  getCurrentLine () {
    let lineColumnPos = this.lineColumnPos
    if (!lineColumnPos) return ''
    let currentLineNumber = lineColumnPos.start.line
    let content = this.compilation.lastCompilationResult.source.sources[this.filename].content.split('\n')
    return content[currentLineNumber]
  }

  startDebug (txNumber, filename, cb) {
    const self = this
    this.filename = filename
    this.txHash = txNumber
    this.debugger.debug(null, txNumber, null, () => {
      self.debugger.event.register('newSourceLocation', function (lineColumnPos, rawLocation) {
        self.lineColumnPos = lineColumnPos
        self.rawLocation = rawLocation
        self.events.emit('source', [lineColumnPos, rawLocation])
      })

      self.debugger.vmDebuggerLogic.event.register('solidityState', (data) => {
        self.solidityState = data
        self.events.emit('globals', data)
      })

      // TODO: this doesnt work too well, it should request the data instead...
      self.debugger.vmDebuggerLogic.event.register('solidityLocals', (data) => {
        if (JSON.stringify(data) === '{}') return
        self.solidityLocals = data
        self.events.emit('locals', data)
      })

      if (cb) {
        // TODO: this should be an onReady event
        setTimeout(cb, 1000)
      }
    })
  }

  getVars () {
    return {
      locals: this.solidityLocals,
      contract: this.solidityState
    }
  }

  triggerSourceUpdate () {
    this.events.emit('source', [this.lineColumnPos, this.rawLocation])
  }

  stepJumpNextBreakpoint () {
    this.debugger.step_manager.jumpNextBreakpoint()
  }

  stepJumpPreviousBreakpoint () {
    this.debugger.step_manager.jumpPreviousBreakpoint()
  }

  stepOverForward (solidityMode) {
    this.debugger.step_manager.stepOverForward(solidityMode)
  }

  stepOverBack (solidityMode) {
    this.debugger.step_manager.stepOverBack(solidityMode)
  }

  stepIntoForward (solidityMode) {
    this.debugger.step_manager.stepIntoForward(solidityMode)
  }

  stepIntoBack (solidityMode) {
    this.debugger.step_manager.stepIntoBack(solidityMode)
  }

  jumpTo (step) {
    this.debugger.step_manager.jumpTo(step)
  }

  getTraceLength () {
    if (!this.debugger.step_manager) return 0
    return this.debugger.step_manager.traceLength
  }

  getCodeFirstStep () {
    if (!this.debugger.step_manager) return 0
    return this.debugger.step_manager.calculateFirstStep()
  }

  getCodeTraceLength () {
    if (!this.debugger.step_manager) return 0
    return this.debugger.step_manager.calculateCodeLength()
  }

  nextStep () {
    if (!this.debugger.step_manager) return 0
    return this.debugger.step_manager.nextStep()
  }

  previousStep () {
    if (!this.debugger.step_manager) return 0
    return this.debugger.step_manager.previousStep()
  }

  currentStep () {
    if (!this.debugger.step_manager) return 0
    return this.debugger.step_manager.currentStepIndex
  }

  canGoNext () {
    return this.currentStep() < this.getCodeTraceLength()
  }

  canGoPrevious () {
    return this.currentStep() > this.getCodeFirstStep()
  }

  unload () {
    return this.debugger.unload()
  }

  showActions() {
    const actions = []
    actions.push('actions: ')

    if (this.canGoPrevious()) {
      actions.push('(p)revious')
    }
    if (this.canGoNext()) {
      actions.push('(n)ext')
    }

    actions.push('(vl) var local')
    actions.push('(vg) var global')
    actions.push('(vc) var contract')

    console.log('')
    console.log(actions.join(' | '))
  }

  simplifyVars(data) {
    if (!data) return
    const newData = {}

    Object.keys(data).forEach((key) => {
      const field = data[key]
      newData[`${key} (${field.type})`] = field.value
    })

    for (const debugVar of Object.keys(newData)) {
      const value = newData[debugVar]
      console.log(`${debugVar}: ` + `${value}`)
    }
  }

  getVarsInLine(localVars, contractVars, globalVars, line) {
    if (!line) return {}
    let foundVars = {}

    let varList = [localVars, contractVars, globalVars]
    varList.forEach((variables) => {
      Object.keys(variables).forEach((varName) => {
        if (line.indexOf(varName) >= 0) {
          const value = variables[varName]
          foundVars[varName] = value
        }
      })
    })

    return foundVars
  }

  async getGlobals(txHash) {
    const globals = {}

    let tx = await this.web3.eth.getTransaction(txHash)
    let block = await this.web3.eth.getBlock(tx.blockHash)

    globals['block.blockHash'] = { type: 'bytes32', value: tx.blockHash }
    globals['block.number'] = { type: 'uint256', value: tx.blockNumber }
    globals['block.coinbase'] = { type: 'address payable', value: block.miner }
    globals['block.difficulty'] = { type: 'uint256', value: block.difficulty.toString() }
    globals['block.gaslimit'] = { type: 'uint256', value: block.gasLimit }
    globals['block.timestamp'] = { type: 'uint256', value: block.timestamp }
    globals['msg.sender'] = { type: 'address payable', value: tx.from }
    globals['msg.gas'] = { type: 'uint256', value: tx.gas }
    globals['msg.gasPrice'] = { type: 'uint256', value: tx.gasPrice.toString() }
    globals['msg.value'] = { type: 'uint256', value: tx.value.toString() }
    globals['now'] = { type: 'uint256', value: block.timestamp }

    return globals
  }

  displayLocals () {
    console.dir('= displayLocals')
    console.dir(this.solidityLocals)
  }

  displayGlobals () {
    console.dir('= displayGlobals')
    console.dir(this.solidityState)
  }

}

module.exports = CmdLine

