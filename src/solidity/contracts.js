'use strict'
var AstWalker = require('../util/astWalker')
var decoder = require('./stateDecoder')
var varUtil = require('./variable')

module.exports = {
  /**
   * return the state of the given @arg contractName
   *
   * @param {Map} storageContent  - contract storage
   * @param {astList} astList  - AST nodes of all the sources
   * @param {String} contractName  - contract for which state var should be resolved
   * @return {Map} - return the state of the contract
   */
  getSolidityState: function (storageContent, astList, contractName) {
    var locations = this.getStorageLocationOf(contractName, astList)
    return this.decodeState(locations, storageContent)
  },

  /**
   * decode the ctr state storage
   *
   * @param {Array} storage location  - location of all state variables
   * @param {Map} storageContent  - storage
   * @return {Map} - decoded state variable
   */
  decodeState: function (storageLocations, storageContent) {
    if (storageContent['0x']) {
      storageContent['0x00'] = storageContent['0x']
    }
    var ret = {}
    for (var k in storageLocations) {
      var stateVar = storageLocations[k]
      var location = {
        slot: stateVar.location.slot,
        offset: stateVar.location.offset
      }
      ret[stateVar.name] = decoder.decode(stateVar.type, storageContent, location)
    }
    return ret
  },

  /**
   * return all storage location variables of the given @arg contractName
   *
   * @param {String} contractName  - name of the contract
   * @param {Object} astList  - AST nodes of all the sources
   * @return {Object} - return the location of all contract variables in the storage
   */
  getStorageLocationOf: function (contractName, astList) {
    var stateDefinitions = this.getStateDefinition(astList, contractName)
    var ret = []
    var location = {
      offset: 0,
      slot: 0
    }
    for (var k in stateDefinitions) {
      var variable = stateDefinitions[k]
      if (variable.name === 'VariableDeclaration') {
        var type = varUtil.getType(variable, stateDefinitions)
        var loc = varUtil.walkStorage(type, location)
        ret.push({
          name: variable.attributes.name,
          type: type,
          location: loc.currentLocation
        })
        location = loc.nextLocation
      }
    }
    return ret
  },

  /**
   * return state var and type definition of the given contract
   *
   * @param {Object} astList  - AST nodes of all the sources
   * @param {String} contractName  - contract for which state var should be resolved
   * @return {Object} - return the AST node of found state var
   */
  getStateDefinition: function (astList, contractName) {
    var id = this.getContractId(astList, contractName)
    if (id) {
      var stateVar = []
      var contracts = this.getContractsDefinition(astList)
      var baseContracts = this.getBaseContracts(astList, id, contracts)
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
    this.walkAstList(astList, { 'ContractDefinition': function (node) {
      if (node.attributes && node.attributes.name === contractName) {
        id = node.id
      }
      return true
    }})
    return id
  },

  /**
   * return all the based contracts defined given @arg contract name
   *
   * @param {Object} astList  - AST nodes of all the sources
   * @param {Int} id  - contract id for which based contracts should be resolved
   * @param {Map} contracts  - all contracts defined in the current context
   * @return {Object} - return the AST node of found contract
   */
  getBaseContracts: function (astList, id, contracts) {
    var contract = contracts[id]
    var baseContracts = []
    for (var k in contract.attributes.linearizedBaseContracts) {
      var subId = contract.attributes.linearizedBaseContracts[k]
      baseContracts.unshift(contracts[subId])
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
    var contracts = {}
    this.walkAstList(astList, { 'ContractDefinition': function (node) {
      contracts[node.id] = node
      return false
    }})
    return contracts
  },

  /**
   * walk the given @astList
   *
   * @param {Object} astList  - ASTs of all the sources
   * @param {Function} - callback used by AstWalker to compute response
   */
  walkAstList: function (astList, callback) {
    var walker = new AstWalker()
    for (var k in astList) {
      walker.walk(astList[k].AST, callback)
    }
  }
}
