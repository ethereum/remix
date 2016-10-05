'use strict'
var locationDecoder = require('./locationDecoder')
var types = require('./types/list')

/**
  * Uint decode the given @arg variable
  *
  * @param {Object} variable - variable given by the AST
  * @return {Object} returns decoded info about the current type: { needsFreeStorageSlot, storageBytes, typeName, decoder}
  */
function Uint (variable) {
  var type
  if (variable.attributes.type.split(' ')) {
    type = variable.attributes.type.split(' ')[0]
  } else {
    type = variable.attributes.type
  }
  return {
    needsFreeStorageSlot: false,
    storageBytes: parseInt(type.replace('uint', '')) / 8,
    typeName: type,
    decoder: 'uint'
  }
}

/**
  * Address decode the given @arg variable
  *
  * @param {Object} variable - variable given by the AST
  * @return {Object} returns decoded info about the current type: { needsFreeStorageSlot, storageBytes, typeName, decoder}
  */
function Address (variable) {
  return {
    needsFreeStorageSlot: false,
    storageBytes: 20,
    typeName: 'address',
    decoder: 'address'
  }
}

/**
  * Bool decode the given @arg variable
  *
  * @param {Object} variable - variable given by the AST
  * @return {Object} returns decoded info about the current type: { needsFreeStorageSlot, storageBytes, typeName, decoder}
  */
function Bool (variable) {
  return {
    needsFreeStorageSlot: false,
    storageBytes: 1,
    typeName: 'bool',
    decoder: 'bool'
  }
}

/**
  * DynamicByteArray decode the given @arg variable
  *
  * @param {Object} variable - variable given by the AST
  * @return {Object} returns decoded info about the current type: { needsFreeStorageSlot, storageBytes, typeName, decoder}
  */
function DynamicByteArray (variable) {
  return {
    needsFreeStorageSlot: true,
    storageBytes: 32,
    typeName: 'bytes',
    decoder: 'dynamicByteArray'
  }
}

/**
  * FixedByteArray decode the given @arg variable
  *
  * @param {Object} variable - variable given by the AST
  * @return {Object} returns decoded info about the current type: { needsFreeStorageSlot, storageBytes, typeName, decoder}
  */
function FixedByteArray (variable) {
  var type
  if (variable.attributes.type.split(' ')) {
    type = variable.attributes.type.split(' ')[0]
  } else {
    type = variable.attributes.type
  }
  return {
    needsFreeStorageSlot: false,
    storageBytes: parseInt(type.replace('bytes', '')),
    typeName: variable.attributes.type.split(' ')[0],
    decoder: 'fixedByteArray'
  }
}

/**
  * Int decode the given @arg variable
  *
  * @param {Object} variable - variable given by the AST
  * @return {Object} returns decoded info about the current type: { needsFreeStorageSlot, storageBytes, typeName, decoder}
  */
function Int (variable) {
  var type
  if (variable.attributes.type.split(' ')) {
    type = variable.attributes.type.split(' ')[0]
  } else {
    type = variable.attributes.type
  }
  return {
    needsFreeStorageSlot: false,
    storageBytes: parseInt(type.replace('int', '')) / 8,
    typeName: type,
    decoder: 'int'
  }
}

/**
  * StringType decode the given @arg variable
  *
  * @param {Object} variable - variable given by the AST
  * @return {Object} returns decoded info about the current type: { needsFreeStorageSlot, storageBytes, typeName, decoder}
  */
function StringType (variable) {
  return {
    needsFreeStorageSlot: true,
    storageBytes: 32,
    typeName: 'string',
    decoder: 'stringType'
  }
}

/**
  * ArrayType decode the given @arg variable
  *
  * @param {Object} variable - variable given by the AST
  * @return {Object} returns decoded info about the current type: { needsFreeStorageSlot, storageBytes, typeName, decoder, arraySize, subArray}
  */
function ArrayType (variable, stateDefinitions) {
  var arraySize
  var storageBytes

  var dimensions = totalDimensions(variable.attributes.type)

  var underlyingType = extractUnderlyingType(variable.attributes.type)
  var type = underlyingType + dimensions.join('')
  var underlyingVar = JSON.parse(JSON.stringify(variable))
  underlyingVar.attributes.type = underlyingType
  underlyingType = decode(underlyingVar, stateDefinitions)

  arraySize = getArraySize(type)

  var subArray = getSubArrayDecoder(type, variable, stateDefinitions)

  if (subArray && subArray.arraySize !== 'dynamic') {
    storageBytes = subArray.arraySize * subArray.storageBytes // size on storage of one item of the array
  } else {
    storageBytes = underlyingType.storageBytes
  }

  storageBytes = Math.ceil(storageBytes * (arraySize === 'dynamic' ? 1 : arraySize)) // size on storage of one the whole array

  return {
    needsFreeStorageSlot: true,
    storageBytes: storageBytes,
    typeName: type,
    arraySize: arraySize,
    subArray: subArray,
    decoder: 'arrayType'
  }
}

/**
  * Enum decode the given @arg variable
  *
  * @param {Object} variable - variable given by the AST
  * @return {Object} returns decoded info about the current type: { needsFreeStorageSlot, storageBytes, typeName, decoder}
  */
function Enum (variable, stateDefinitions) {
  var extracted = variable.attributes.type.split(' ')
  return {
    needsFreeStorageSlot: false,
    storageBytes: 1,
    typeName: extracted[0] + ' ' + extracted[1],
    enum: getEnum(variable, stateDefinitions),
    decoder: 'enum'
  }
}

/**
  * Struct decode the given @arg variable
  *
  * @param {Object} variable - variable given by the AST
  * @return {Object} returns decoded info about the current type: { needsFreeStorageSlot, storageBytes, typeName, decoder, members}
  */
function Struct (variable, stateDefinitions) {
  var extracted = variable.attributes.type.split(' ')
  var type = extracted[0] + ' ' + extracted[1]
  var membersDetails = getStructMembers(type, stateDefinitions)
  return {
    needsFreeStorageSlot: true,
    storageBytes: membersDetails.storageBytes,
    typeName: type,
    members: membersDetails.members,
    decoder: 'struct'
  }
}

/**
  * retrieve enum declaration of the given @arg variable
  *
  * @param {Object} variable - variable declaration
  * @param {Object} stateDefinitions  - all state declarations given by the AST (including struct and enum type declaration)
  * @return {Array} - containing all value declaration of the current enum type
  */
function getEnum (variable, stateDefinitions) {
  for (var k in stateDefinitions) {
    var dec = stateDefinitions[k]
    if (dec.name === 'EnumDefinition' && variable.attributes.type.indexOf('enum ' + dec.attributes.name) === 0) {
      return dec.children
    }
  }
  return null
}

/**
  * retrieve variable declared in the given @arg variable
  *
  * @param {String} typeName - name of the struct type (e.g struct <name>)
  * @param {Object} stateDefinitions  - all state definition given by the AST (including struct and enum type declaration)
  * @return {Array} containing all members of the current struct type
  */
function getStructMembers (typeName, stateDefinitions) {
  var ret = []
  for (var k in stateDefinitions) {
    var dec = stateDefinitions[k]
    if (dec.name === 'StructDefinition' && typeName.indexOf('struct ' + dec.attributes.name) === 0) {
      var location = {
        offset: 0,
        slot: 0
      }
      for (var i in dec.children) {
        var member = dec.children[i]
        var decoded = decode(member, stateDefinitions)
        var type = new types[decoded.decoder](decoded)
        var loc = locationDecoder.walkStorage(type, location)
        ret.push({
          name: member.attributes.name,
          type: type,
          location: loc.currentLocation
        })
        location = loc.endLocation
      }
      break
    }
  }
  return {
    members: ret,
    storageBytes: 32 * (1 + loc.endLocation.slot)
  }
}

/**
  * get the array dimensions
  *
  * @param {String} fullType - type given by the AST variable declaration
  * @return {Array} containing all the dimensions and size of the array (e.g ['[3]', '[]'] )
  */
function totalDimensions (fullType) {
  var ret = []
  if (fullType.indexOf('[') !== -1) {
    var squareBracket = /\[([0-9]+|\s*)\]/g
    var dim = fullType.match(squareBracket)
    return dim
  }
  return ret
}

/**
  * return the size of the current array
  *
  * @param {String} typeName - short type ( e.g uint[][4] )
  * @return {String|Int} return 'dynamic' if dynamic array | return size of the array
  */
function getArraySize (typeName) {
  if (typeName.indexOf('[') !== -1) {
    var squareBracket = /\[([0-9]+|\s*)\]/g
    var dim = typeName.match(squareBracket)
    var size = dim[dim.length - 1]
    if (size === '[]') {
      return 'dynamic'
    } else {
      return parseInt(dim[dim.length - 1].replace('[', '').replace(']'))
    }
  }
}

/**
  * get the decoder which decode the sub array of the current @arg arrayType
  *
  * @param {String} typeName - short type ( e.g uint[][4] )
  * @param {Object} variable - variable given by the AST
  * @param {Object} stateDefinitions - all state stateDefinitions given by the AST (including struct and enum type declaration)
  * @return {Object} return the array decoder
  */
function getSubArrayDecoder (typeName, variable, stateDefinitions) {
  var subArray = null
  var subArrayType = typeName.substring(0, typeName.lastIndexOf('['))
  if (subArrayType.indexOf('[') !== -1) {
    subArray = JSON.parse(JSON.stringify(variable))
    subArray.attributes.type = subArrayType
    subArray = decode(subArray, stateDefinitions)
  }
  return subArray
}

/**
  * extract the underlying type
  *
  * @param {String} fullType - type given by the AST (ex: uint[2] storage ref[2])
  * @return {String} return the first part of the full type. don not keep the array declaration ( uint[2] storage ref[2] will return uint)
  */
function extractUnderlyingType (fullType) {
  var splitted = fullType.split(' ')
  if (fullType.indexOf('enum') === 0 || fullType.indexOf('struct') === 0) {
    return splitted[0] + ' ' + splitted[1]
  }
  if (splitted.length > 0) {
    fullType = splitted[0]
  }
  if (fullType[fullType.length - 1] === ']') {
    return fullType.substring(0, fullType.indexOf('['))
  }
  return fullType
}

var decoders = {
  'address': Address,
  'array': ArrayType,
  'bool': Bool,
  'bytes': DynamicByteArray,
  'bytesX': FixedByteArray,
  'enum': Enum,
  'string': StringType,
  'struct': Struct,
  'int': Int,
  'intX': Int,
  'uint': Uint,
  'uintX': Uint
}

/**
  * parse the full type
  *
  * @param {String} fullType - type given by the AST (ex: uint[2] storage ref[2])
  * @return {String} returns the token type (used to instanciate the right decoder) (uint[2] storage ref[2] will return 'array', uint256 will return uintX)
  */
function extractTokenType (fullType) {
  if (fullType.indexOf('[') !== -1) {
    return 'array'
  }
  if (fullType.indexOf(' ') !== -1) {
    fullType = fullType.split(' ')[0]
  }
  return fullType.replace(/[0-9]+/g, 'X')
}

/**
  * parse the type and return an object representing the type
  *
  * @param {Object} variable - variable declaration given by the AST
  * @param {Object} stateDefinitions - all state stateDefinitions given by the AST (including struct and enum type declaration)
  * @return {Object} - return the corresponding decoder
  */
function decode (variable, stateDefinitions) {
  var currentType = extractTokenType(variable.attributes.type)
  return new decoders[currentType](variable, stateDefinitions)
}

module.exports = {
  decode: decode,
  Uint: Uint,
  Address: Address,
  Bool: Bool,
  DynamicByteArray: DynamicByteArray,
  FixedByteArray: FixedByteArray,
  Int: Int,
  StringType: StringType,
  ArrayType: ArrayType,
  Enum: Enum,
  Struct: Struct
}
