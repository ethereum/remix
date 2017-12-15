var test = require('tape')
var remixLib = require('remix-lib')

var StatRunner = require('../../src/analysis/staticAnalysisRunner')
var compilerInput = remixLib.helpers.compiler.compilerInput

var solc = require('solc/wrapper')
var compiler = solc(require('../../soljson'))

var fs = require('fs')
var path = require('path')

function compile (fileName) {
  var content = fs.readFileSync(path.join(__dirname, 'test-contracts', fileName), 'utf8')
  return JSON.parse(compiler.compileStandardWrapper(compilerInput(content)))
}

test('staticAnalysisIssues.functionParameterPassingError', function (t) {
  // https://github.com/ethereum/browser-solidity/issues/889#issuecomment-351746474
  t.plan(2)
  var res = compile('functionParameters.sol')

  var module = require('../../src/analysis/modules/checksEffectsInteraction')

  var statRunner = new StatRunner()

  t.doesNotThrow(() => {
    statRunner.runWithModuleList(res, [{ name: module.name, mod: new module.Module() }], (reports) => {
    })
  }, true, 'Analysis should not throw')

  statRunner.runWithModuleList(res, [{ name: module.name, mod: new module.Module() }], (reports) => {
    t.ok(!reports.some((mod) => mod.report.some((rep) => rep.warning.includes('INTERNAL ERROR')), 'Should not have internal errors'))
  })
})
