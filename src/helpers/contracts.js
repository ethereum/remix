'use strict'
var AstWalker = require('../util/astWalker')
var decoder = require('./solidityStateDecoder.js')

module.exports = {
  getSolidityState: function (storage, astList, contractName) {
    var locations = this.getStorageLocationOf(contractName, astList)
    var ret = []
    for (var k in locations) {
      var stateVar = locations[k]
      stateVar.value = decoder.decode(stateVar, storage)
      ret.push(stateVar)
    }
    return ret
  },

  /**
   * return storage location of the given @arg variable name
   *
   * @param {String} variableName  - name of the variable
   * @param {Object} astList  - AST nodes of all the sources
   * @param {String} contractName  - contract for which state var should be resolved
   * @return {Object} - return the location of the given var in storage
   */
  getStorageLocationOf: function (contractName, astList) {
    var stateVars = this.getStateVariables(astList, contractName)
    var ret = []
    var location = {
      offset: 0,
      slot: 0
    }
    for (var k in stateVars) {
      var variable = stateVars[k]
      var varLength = this.getVariableLength(variable)
      ret.push({
        name: variable.attributes.name,
        location: location,
        length: varLength
      })
      location = this.getNextLocation(varLength, location)
    }
    return ret
  },

  getVariableLength: function (variable) {
    console.log(variable.attributes.type)
    return 2
  },

  getNextLocation: function (variableLength, location) {
    if (variableLength === -1) { // dynamic type
      return {
        slot: location.slot + 1,
        offset: 0
      }
    } else {
      return {
        slot: location.offset + variableLength > 32 ? location.slot : location.slot + 1,
        offset: location.slot + variableLength > 32 ? 0 : location.offset + variableLength
      }
    }
  },

  /**
   * return state var of the given contract
   *
   * @param {Object} astList  - AST nodes of all the sources
   * @param {String} contractName  - contract for which state var should be resolved
   * @return {Object} - return the AST node of found state var
   */
  getStateVariables: function (astList, contractName) {
    var id = this.getContractId(astList, contractName)
    if (id) {
      var stateVar = []
      var ctrs = this.getContractsDefinition(astList)
      var baseContracts = this.getBaseContracts(astList, id, ctrs)
      for (var k in baseContracts) {
        var ctr = baseContracts[k]
        for (var i in ctr.children) {
          var child = ctr.children[i]
          if (child.name === 'VariableDeclaration') {
            stateVar.push(child)
          }
        }
      }
      return stateVar
    }
    return null
  },

  /**
   * return contract id given his name
   *
   * @param {Object} astList  - AST nodes of all the sources
   * @param {String} contractName  - contract for which based contracts should be resolved
   * @return {Object} - return the AST node of found contract
   */
  getContractId: function (astList, contractName) {
    var id
    this.walkAstList(astList, { 'ContractDefinition': function (node) {
      if (node.attributes && node.attributes.name === contractName) {
        id = node.id
        return false
      } else {
        return true
      }
    }})
    return id
  },

  /**
   * return all the based contracts defined given @arg contract name
   *
   * @param {Object} astList  - AST nodes of all the sources
   * @param {String} contractName  - contract for which based contracts should be resolved
   * @return {Object} - return the AST node of found contract
   */
  getBaseContracts: function (astList, id, ctrs) {
    var contract = ctrs[id]
    var baseContracts = []
    for (var k in contract.attributes.linearizedBaseContracts) {
      var subId = contract.attributes.linearizedBaseContracts[k]
      baseContracts.unshift(ctrs[subId])
    }
    return baseContracts
  },

  /**
   * return all contract definitions of the given @astList
   *
   * @param {Object} astList  - AST nodes of all the sources
   * @return {Object} - return the AST node of found contract
   */
  getContractsDefinition: function (astList) {
    var callback = {}
    var ctrs = {}
    callback.ContractDefinition = function (node) {
      ctrs[node.id] = node
      return false
    }
    this.walkAstList(astList, callback)
    return ctrs
  },

  walkAstList: function (astList, callback) {
    var walker = new AstWalker()
    for (var k in astList) {
      walker.walk(astList[k].AST, callback)
    }
  }
}
