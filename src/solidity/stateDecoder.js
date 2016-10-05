var decoder = require('./stateDecoder')
var astHelper = require('./astHelper')
var decoders = require('./decoders')
var types = require('./types/list')
var locationDecoder = require('./locationDecoder')

/**
  * decode the contract state storage
  *
  * @param {Array} storage location  - location of all state variables
  * @param {Map} storageContent  - storage
  * @return {Map} - decoded state variable
  */
function decodeState (storageLocations, storageContent) {
  if (storageContent['0x']) {
    storageContent['0x00'] = storageContent['0x']
    storageContent['0x'] = undefined
  }
  var ret = {}
  for (var k in storageLocations) {
    var stateVar = storageLocations[k]
    ret[stateVar.name] = decoder.decode(stateVar.type, storageContent, stateVar.location)
  }
  return ret
}

/**
  * return all storage location variables of the given @arg contractName
  *
  * @param {String} contractName  - name of the contract
  * @param {Object} astList  - AST nodes of all the sources
  * @return {Object} - return the location of all contract variables in the storage
  */
function stateVariableLocations (contractName, astList) {
  var stateDefinitions = astHelper.getStateVariables(contractName, astList)
  var ret = []
  if (!stateDefinitions) {
    return ret
  }
  var location = {
    offset: 0,
    slot: 0
  }
  for (var k in stateDefinitions) {
    var variable = stateDefinitions[k]
    if (variable.name === 'VariableDeclaration') {
      var decoded = decoders.decode(variable, stateDefinitions)
      var type = new types[decoded.decoder](decoded)
      var loc = locationDecoder.walkStorage(type, location)
      ret.push({
        name: variable.attributes.name,
        type: type,
        location: loc.currentLocation
      })
      location = loc.endLocation
    }
  }
  return ret
}

/**
  * return the state of the given @a contractName as a json object
  *
  * @param {Map} storageContent  - contract storage
  * @param {astList} astList  - AST nodes of all the sources
  * @param {String} contractName  - contract for which state var should be resolved
  * @return {Map} - return the state of the contract
  */
function solidityState (storageContent, astList, contractName) {
  var locations = stateVariableLocations(contractName, astList)
  return decodeState(locations, storageContent)
}

module.exports = {
  solidityState: solidityState,
  stateVariableLocations: stateVariableLocations,
  decodeState: decodeState
}
