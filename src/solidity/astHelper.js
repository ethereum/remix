'use strict'
var AstWalker = require('../util/astWalker')

/**
  * return all contract definitions of the given @astList
  *
  * @param {Object} sourcesList - sources list (containing root AST node)
  * @return {Object} - returns a mapping from AST node ids to AST nodes for the contracts
  */
function getContractsDefinition (sourcesList) {
  var contracts = {}
  var walker = new AstWalker()
  walker.walkAstList(sourcesList, { 'ContractDefinition': function (node) {
    contracts[node.id] = node
    return false
  }})
  return contracts
}

/**
  * returns the linearized base contracts of the contract @arg id
  *
  * @param {Int} id - contract id to resolve
  * @param {Map} contracts  - all contracts defined in the current context
  * @return {Array} - array of base contracts in derived to base order as AST nodes.
  */
function getBaseContracts (id, contracts) {
  return contracts[id].attributes.linearizedBaseContracts.map(function (id) { return contracts[id] })
}

/**
  * return contract id given its name
  *
  * @param {Object} sourcesList - sources list (containing root AST node)
  * @param {String} contractName  - contract to resolve
  * @return {Int} - returns the id of the given @arg contractName
  */
function getContractId (sourcesList, contractName) {
  var id
  var walker = new AstWalker()
  walker.walkAstList(sourcesList, { 'ContractDefinition': function (node) {
    if (node.attributes && node.attributes.name === contractName) {
      id = node.id
    }
    return true
  }})
  return id
}

/**
  * return state var and type definition of the given contract
  *
  * @param {String} contractName - contract for which state var should be resolved
  * @param {Object} sourcesList - sources list (containing root AST node)
  * @return {Array} - return an array of AST node of all state variables (including inherited) (this will include all enum/struct declarations)
  */
function getStateVariables (contractName, sourcesList) {
  var id = getContractId(sourcesList, contractName)
  if (id) {
    var stateVar = []
    var contracts = getContractsDefinition(sourcesList)
    var baseContracts = getBaseContracts(id, contracts)
    baseContracts.reverse()
    for (var k in baseContracts) {
      var ctr = baseContracts[k]
      for (var i in ctr.children) {
        stateVar.push(ctr.children[i])
      }
    }
    return stateVar
  }
  return null
}

module.exports = {
  getStateVariables: getStateVariables,
  getContractId: getContractId,
  getContractsDefinition: getContractsDefinition,
  getBaseContracts: getContractsDefinition
}
