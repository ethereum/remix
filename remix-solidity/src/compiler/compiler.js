'use strict'

var solc = require('solc/wrapper')
var solcABI = require('solc/abi')

var webworkify = require('webworkify')

var compilerInput = require('./compiler-input')

var remixLib = require('remix-lib')
var EventManager = remixLib.EventManager

var txHelper = require('./txHelper')

/*
  trigger compilationFinished, compilerLoaded, compilationStarted, compilationDuration
*/
export class Compiler {
  constructor (handleImportCall) {
    this.event = new EventManager()
    this.state = {
      compileJSON: null,
      worker: null,
      handleImportCall,
      currentVersion: null,
      lastCompilationResult: {
        data: null,
        source: null
      }
    }
    this._trackCompilationDuration()
  }

  compile (source, optimize) {
    this.event.trigger('compilationStarted', [])
    this._internalCompile(source, optimize)
  }

  _onCompilerLoaded (version) {
    this.state.currentVersion = version
    this.event.trigger('compilerLoaded', [version])
  }

  _trackCompilationDuration () {
    var compilationStartTime = null
    this.event.register('compilationFinished', (success, data, source) => {
      if (success && compilationStartTime) {
        this.event.trigger('compilationDuration', [(new Date().getTime()) - compilationStartTime])
      }
      compilationStartTime = null
    })

    this.event.register('compilationStarted', () => {
      compilationStartTime = new Date().getTime()
    })
  }

  _internalCompile (source, optimize) {
    if (!this.state.compileJSON) throw new Error('no compiler loaded')
    this.state.compileJSON(source, optimize ? 1 : 0)
  }

  loadVersion (usingWorker, url) {
    // Set a safe fallback until the new one is loaded
    this.state.compileJSON = () => {
      this._compilationFinished({ error: { formattedMessage: 'Compiler not yet loaded.' } })
    }
    console.log('Loading ' + url + ' ' + (usingWorker ? 'with worker' : 'without worker'))
    this.event.trigger('loadingCompiler', [url, usingWorker])

    if (usingWorker) {
      this._loadWorker(url)
    } else {
      this._loadInternal(url)
    }
  }

  _loadWorker (url) {
    let self = this
    if (this.state.worker !== null) {
      this.state.worker.terminate()
    }
    this.state.worker.workerer = webworkify(require('./compiler-worker.js'))
    var jobs = []
    this.state.worker.addEventListener('message', function (msg) {
      var data = msg.data
      switch (data.cmd) {
        case 'versionLoaded':
          self._onCompilerLoaded(data.data)
          break
        case 'compiled':
          var result
          try {
            result = JSON.parse(data.data)
          } catch (exception) {
            result = { 'error': 'Invalid JSON output from the compiler: ' + exception }
          }
          var sources = {}
          if (data.job in jobs !== undefined) {
            sources = jobs[data.job].sources
            delete jobs[data.job]
          }
          self._compilationFinished(result, data.missingInputs, sources)
          break
      }
    })
    this.state.worker.onerror = function (msg) {
      self._compilationFinished({ error: 'Worker error: ' + msg.data })
    }
    this.state.worker.addEventListener('error', function (msg) {
      self._compilationFinished({ error: 'Worker error: ' + msg.data })
    })
    this.state.compileJSON = (source, optimize) => {
      jobs.push({sources: source})
      this.state.worker.postMessage({cmd: 'compile', job: jobs.length - 1, input: compilerInput(source.sources, {optimize: optimize, target: source.target})})
    }
    this.state.worker.postMessage({cmd: 'loadVersion', data: url})
  }

  _loadInternal (url) {
    let self = this
    delete window.Module
    // NOTE: workaround some browsers?
    window.Module = undefined

    var newScript = document.createElement('script')
    newScript.type = 'text/javascript'
    newScript.src = url
    document.getElementsByTagName('head')[0].appendChild(newScript)
    var check = window.setInterval(function () {
      if (!window.Module) {
        return
      }
      window.clearInterval(check)
      self._onInternalCompilerLoaded()
    }, 200)
  }

  _onInternalCompilerLoaded () {
    var compiler
    if (typeof (window) === 'undefined') {
      compiler = require('solc')
    } else {
      compiler = solc(window.Module)
    }

    this.state.compileJSON = (source, optimize) => {
      var missingInputs = []
      var missingInputsCallback = function (path) {
        missingInputs.push(path)
        return { error: 'Deferred import' }
      }

      var result
      try {
        var input = compilerInput(source.sources, {optimize: optimize, target: source.target})
        result = compiler.compile(input, missingInputsCallback)
        result = JSON.parse(result)
      } catch (exception) {
        result = { error: { formattedMessage: 'Uncaught JavaScript exception:\n' + exception, severity: 'error', mode: 'panic' } }
      }

      this._compilationFinished(result, missingInputs, source)
    }
    this._onCompilerLoaded(compiler.version())
  }

  _compilationFinished (data, missingInputs, source) {
    var noFatalErrors = true // ie warnings are ok

    function isValidError (error) {
      // The deferred import is not a real error
      // FIXME: maybe have a better check?
      if (/Deferred import/.exec(error.message)) {
        return false
      }

      return error.severity !== 'warning'
    }

    if (data['error'] !== undefined) {
      // Ignore warnings (and the 'Deferred import' error as those are generated by us as a workaround
      if (isValidError(data['error'])) {
        noFatalErrors = false
      }
    }
    if (data['errors'] !== undefined) {
      data['errors'].forEach(function (err) {
        // Ignore warnings and the 'Deferred import' error as those are generated by us as a workaround
        if (isValidError(err)) {
          noFatalErrors = false
        }
      })
    }

    if (!noFatalErrors) {
      // There are fatal errors - abort here
      this.lastCompilationResult = null
      this.event.trigger('compilationFinished', [false, data, source])
    } else if (missingInputs !== undefined && missingInputs.length > 0) {
      this.event.trigger('compilationFinished', [false, data, source])
    } else {
      data = this.updateInterface(data)

      this.state.lastCompilationResult = {
        data: data,
        source: source
      }
      this.event.trigger('compilationFinished', [true, data, source])
    }
  }

  /**
    * return the contract obj of the given @arg name. Uses last compilation result.
    * return null if not found
    * @param {String} name    - contract name
    * @returns contract obj and associated file: { contract, file } or null
    */
  getContract (name) {
    if (this.lastCompilationResult.data && this.lastCompilationResult.data.contracts) {
      return txHelper.getContract(name, this.lastCompilationResult.data.contracts)
    }
    return null
  }

  /**
    * call the given @arg cb (function) for all the contracts. Uses last compilation result
    * @param {Function} cb    - callback
    */
  visitContracts (cb) {
    if (this.lastCompilationResult.data && this.lastCompilationResult.data.contracts) {
      return txHelper.visitContracts(this.lastCompilationResult.data.contracts, cb)
    }
    return null
  }

  /**
    * return the compiled contracts from the last compilation result
    * @return {Object}     - contracts
    */
  getContracts () {
    if (this.lastCompilationResult.data && this.lastCompilationResult.data.contracts) {
      return this.lastCompilationResult.data.contracts
    }
    return null
  }

   /**
    * return the sources from the last compilation result
    * @param {Object} cb    - map of sources
    */
  getSources () {
    if (this.lastCompilationResult.source) {
      return this.lastCompilationResult.source.sources
    }
    return null
  }

  /**
    * return the sources @arg fileName from the last compilation result
    * @param {Object} cb    - map of sources
    */
  getSource (fileName) {
    if (this.lastCompilationResult.source) {
      return this.lastCompilationResult.source.sources[fileName]
    }
    return null
  }

  /**
    * return the source from the last compilation result that has the given index. null if source not found
    * @param {Int} index    - index of the source
    */
  getSourceName (index) {
    if (this.lastCompilationResult.data && this.lastCompilationResult.data.sources) {
      return Object.keys(this.lastCompilationResult.data.sources)[index]
    }
    return null
  }

  truncateVersion (version) {
    var tmp = /^(\d+.\d+.\d+)/.exec(version)
    if (tmp) {
      return tmp[1]
    }
    return version
  }

  updateInterface (data) {
    txHelper.visitContracts(data.contracts, (contract) => {
      data.contracts[contract.file][contract.name].abi = solcABI.update(this.truncateVersion(this.state.currentVersion), contract.object.abi)
    })
    return data
  }
}
