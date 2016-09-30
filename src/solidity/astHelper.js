'use strict'
var AstWalker = require('../util/astWalker')

module.exports = {
  /**
   * return state var and type definition of the given contract
   *
   * @param {Object} astList  - AST nodes of all the sources
   * @param {String} contractName  - contract for which state var should be resolved
   * @return {Array} - return the AST node of found state var
   */
  getStateDefinition: function (astList, contractName) {
    var id = this.getContractId(astList, contractName)
    if (id) {
      var stateVar = []
      var contracts = getContractsDefinition(astList)
      var baseContracts = getBaseContracts(astList, id, contracts)
      for (var k in baseContracts) {
        var ctr = baseContracts[k]
        for (var i in ctr.children) {
          stateVar.push(ctr.children[i])
        }
      }
      return stateVar
    }
    return null
  },

  /**
   * return contract id given its name
   *
   * @param {Object} astList  - AST nodes of all the sources
   * @param {String} contractName  - contract for which based contracts should be resolved
   * @return {Object} - return the AST node of found contract
   */
  getContractId: function (astList, contractName) {
    var id
    var walker = new AstWalker()
    walker.walkAstList(astList, { 'ContractDefinition': function (node) {
      if (node.attributes && node.attributes.name === contractName) {
        id = node.id
      }
      return true
    }})
    return id
  },

  getContractsDefinition: getContractsDefinition,
  getBaseContracts: getContractsDefinition
}

/**
   * return all contract definitions of the given @astList
   *
   * @param {Object} astList  - AST nodes of all the sources
   * @return {Object} - return the AST node of found contract
   */
function getContractsDefinition (astList) {
  var contracts = {}
  var walker = new AstWalker()
  walker.walkAstList(astList, { 'ContractDefinition': function (node) {
    contracts[node.id] = node
    return false
  }})
  return contracts
}

/**
 * returns the linearized base contracts of the contract @arg id
 *
 * @param {Object} astList  - AST nodes of all the sources
 * @param {Int} id  - contract id for which based contracts should be resolved
 * @param {Map} contracts  - all contracts defined in the current context
 * @return {Object} - return the AST node of found contract
 */
function getBaseContracts (astList, id, contracts) {
  var baseContracts = contracts[id].attributes.linearizedBaseContracts.map(function (id) { return contracts[id]})
  baseContracts.reverse()
  return baseContracts
/*
 var contract = contracts[id]
 var baseContracts = []
 for (var k in contract.attributes.linearizedBaseContracts) {
   var subId = contract.attributes.linearizedBaseContracts[k]
   baseContracts.unshift(contracts[subId])
 }
 return baseContracts
 */
}
