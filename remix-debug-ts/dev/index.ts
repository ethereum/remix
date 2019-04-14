'use strict'
import EthDebugger from  './src/Ethdebugger'
import TransactionDebugger from './src/debugger/debugger'
import CmdLine from './src/cmdline'

import StorageViewer from './src/storage/storageViewer'
import StorageResolver from './src/storage/storageResolver'

import SolidityDecoder from './src/solidity-decoder'

import remixLib from 'remix-lib'
import BreakpointManager from remixLib.code.BreakpointManager

/*
  Use of breakPointManager :

  var breakPointManager = new BreakpointManager(this.debugger, (sourceLocation) => {
    return line/column from offset (sourceLocation)
  })
  this.debugger.setBreakpointManager(breakPointManager)
*/
module.exports = {
  EthDebugger: EthDebugger,
  TransactionDebugger: TransactionDebugger,
  /**
   * constructor
   *
   * @param {Object} _debugger - type of EthDebugger
   * @return {Function} _locationToRowConverter - function implemented by editor which return a column/line position for a char source location
   */
  BreakpointManager: BreakpointManager,
  SolidityDecoder: SolidityDecoder,
  storage: {
    StorageViewer: StorageViewer,
    StorageResolver: StorageResolver
  },
  CmdLine: CmdLine
}

