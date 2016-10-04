'use strict'

module.exports = {
  /**
   * parse the type and return an object representing the type (returns only basic fields)
   *
   * @param {Object} variable - variable declaration given by the AST
   * @return {Object} - return parsed information about the current variable:
   *                    fullType: full decoded type (int256, string, int256[][], etc... )
   *                    storageBytes: size in storage of the type
   */
  decodeBasicType: function (variable) {
    var ret = {}
    ret.fullType = this.extractType(variable.attributes.type)
    ret.storageBytes = this.getStorageBytes(ret.fullType)
    return ret
  },

  /**
  * parse the full type
  *
  * @param {String} fullType - type given by the AST (ex: uint[2] storage ref[2])
  * @return {String} return the first part of the full type. keep the array dim declaration (uint[2][2] in that case)
  */
  extractType: function (fullType) {
    var dim = []
    if (fullType.indexOf('[') !== -1) {
      dim = getTotalDimensions(fullType)
    }
    if (fullType.indexOf(' ') !== -1) {
      var splitted = fullType = fullType.split(' ')
      if (fullType.indexOf('struct') === 0) {
        fullType = splitted[0] + ' ' + splitted[1]
      } else {
        fullType = splitted[0]
      }
    }
    fullType = fullType.split('[')[0]
    if (dim.length) {
      fullType = fullType + dim.join('')
    }
    return fullType
  },

  /**
   * return parse the type and return an object representing the type
   *
   * @param {Object} variable - variable declaration given by the AST
   * @param {Object} stateDeclarations  - all state declarations given by the AST (including struct and enum type declaration)
   * @return {Object} - return parsed information about the current variable:
   *                    arraySize: size of the array (only of applicable)
   *                    subArray: subArray description (only of applicable)
   *                    slotUsed: number of slot used by the type (always > 0)
   *                    enum: contain enum value declaration for the current type (only for enum type)
   *                    members: contain members variable declaration for the current type (only for struct type)
   */
  decodeType: function (variable, stateDefinitions) {
    var ret = this.decodeBasicType(variable)
    ret.slotsUsed = 0
    if (ret.fullType === 'enum') {
      ret.enum = this.getEnum(variable, stateDefinitions)
    }
    if (ret.fullType === 'string' || ret.fullType === 'bytes') {
      ret.slotsUsed = 1
    }
    if (ret.fullType.indexOf('struct') === 0) {
      var membersDetails = this.getStructMembers(variable, stateDefinitions)
      ret.members = membersDetails.members
      ret.slotsUsed = membersDetails.slotsUsed
      ret.storageBytes = 32 * membersDetails.slotsUsed
    }
    if (ret.fullType.indexOf('[') !== -1) { // is array
      ret = this.decodeArrayType(variable, stateDefinitions, ret)
    }
    return ret
  },

  /**
     * parse the type and return an object representing the type
     *
     * @param {Object} variable - variable declaration given by the AST
     * @param {Object} stateDeclarations  - all state declarations given by the AST (including struct and enum type declaration)
     * @param {Object} ret - basic type decoded, returned by the function decodeBasicType
     * @return {Object} - arraySize: size of the array (only of applicable)
     *                    subArray: subArray description (only of applicable)
     *                    slotUsed: number of slot used by the type (always > 0)
     */
  decodeArrayType: function (variable, stateDefinitions, ret) {
    ret.arraySize = this.getArraySize(ret.fullType)
    var storageBytes = ret.storageBytes
    var subArrayType = ret.fullType.substring(0, ret.fullType.lastIndexOf('['))
    if (subArrayType.indexOf('[') !== -1) {
      var subArray = JSON.parse(JSON.stringify(variable))
      subArray.attributes.type = subArrayType
      ret.subArray = this.decodeType(subArray, stateDefinitions)
      storageBytes = 32
      if (ret.subArray.arraySize !== 'dynamic') {
        storageBytes = ret.subArray.arraySize * ret.subArray.storageBytes
      }
    }
    ret.slotsUsed = 1
    if (ret.arraySize !== 'dynamic') {
      ret.slotsUsed = Math.ceil(ret.arraySize * storageBytes / 32)
    }
    return ret
  },

  /**
   * parse the size of the type
   *
   * @param {String} fullType - full type, value returned by the function extractType
   * @return {Int|String} - return the size on storage of the type (bytes)
   *                        return 'unapplicable' if the size could not be determmined directly (struct)
   *                        return 'dynamic' if dynamic size
   */
  getStorageBytes: function (fullType) {
    if (fullType.indexOf('[') !== -1) {
      fullType = fullType.substring(0, fullType.indexOf('['))
    }
    if (fullType === 'string' || fullType === 'bytes') {
      size = 'dynamic'
    } else if (fullType === 'bool' || fullType === 'enum') {
      size = 8
    } else if (fullType === 'address' || fullType === 'contract') {
      size = 160
    } else {
      var numberMatch = /[0-9]+/g
      var size = fullType.match(numberMatch)
      if (size !== '') {
        size = parseInt(size)
      }
      if (fullType.indexOf('bytes') === 0) {
        size = 8 * size
      }
    }
    size = isNaN(size) ? size : size / 8 // bytes
    return size
  },

  /**
   * return the dim of the current array
   *
   * @param {String} fullType - full type, value returned by the function extractType
   * @return {String|Int} return 'dynamic' if dynamic array | return size of the array
   */
  getArraySize: function (fullType) {
    if (fullType.indexOf('[') !== -1) {
      var squareBracket = /\[([0-9]+|\s*)\]/g
      var dim = fullType.match(squareBracket)
      if (dim.length === 0) {
        return null
      } else {
        var size = dim[dim.length - 1]
        if (size === '[]') {
          return 'dynamic'
        } else {
          return parseInt(dim[dim.length - 1].replace('[', '').replace(']'))
        }
      }
    }
  },

  /**
   * retrieve enum declaration of the given @arg variable
   *
   * @param {Object} variable - variable declaration
   * @param {Object} stateDeclarations  - all state declarations given by the AST (including struct and enum type declaration)
   * @return [] containing all value declaration of the current enum type
   */
  getEnum: function (variable, stateDeclaration) {
    for (var k in stateDeclaration) {
      var dec = stateDeclaration[k]
      if (dec.name === 'EnumDefinition' && variable.attributes.type.indexOf('enum ' + dec.attributes.name) === 0) {
        return dec.children
      }
    }
    return null
  },

  /**
   * retrieve variable declared in the given @arg variable
   *
   * @param {Object} variable - variable declaration
   * @param {Object} stateDeclarations  - all state declarations given by the AST (including struct and enum type declaration)
   * @return [] containing all variables declaration of the current struct type
   */
  getStructMembers: function (variable, stateDeclaration) {
    var ret = []
    for (var k in stateDeclaration) {
      var dec = stateDeclaration[k]
      if (dec.name === 'StructDefinition' && variable.attributes.type.indexOf('struct ' + dec.attributes.name) === 0) {
        var location = {
          offset: 0,
          slot: 0
        }
        for (var i in dec.children) {
          var member = dec.children[i]
          var type = this.decodeType(member, stateDeclaration)
          var loc = this.walkStorage(type, location)
          ret.push({
            name: member.attributes.name,
            type: type,
            location: loc.currentLocation
          })
          location = loc.nextLocation
        }
        break
      }
    }
    return {
      members: ret,
      slotsUsed: loc.nextLocation.slot
    }
  },

  /**
    * determine what will be the location of the current @arg type and the start location of the next type in storage
    *
    * @param {Object} type - current type (object returned by the getType function)
    * @param {Object} location - location in storage of the type.
    * @return {Object} return the location of the current type and the location of the next type in storage
    */
  walkStorage: function (type, location) {
    var usedLocation = getStartLocation(type, location)
    return {
      currentLocation: usedLocation,
      nextLocation: getEndLocation(type, usedLocation)
    }
  }
}

function getTotalDimensions (fullType) {
  var ret = []
  if (fullType.indexOf('[') !== -1) {
    var squareBracket = /\[([0-9]+|\s*)\]/g
    var dim = fullType.match(squareBracket)
    return dim
  }
  return ret
}

function getStartLocation (type, location) {
  if (typeNeedNewSlot(type, location) || location.offset + type.storageBytes >= 32) {
    return {
      slot: location.slot + 1,
      offset: 0
    }
  } else {
    return {
      slot: location.slot,
      offset: location.offset
    }
  }
}

function getEndLocation (type, location) {
  if (type.slotsUsed > 0) {
    return {
      slot: location.slot + (type.slotsUsed - 1),
      offset: 32
    }
  } else {
    return {
      slot: location.slot,
      offset: location.offset + type.storageBytes
    }
  }
}

/**
   * determine if the given @arg type need to start from a new slot
   *
   * @param {Object} type - current type (object returned by the getType function)
   * @param {Object} location - location in storage of the type.
   * @return true if the type needs a new storage
   */
function typeNeedNewSlot (type, location) {
  return (type.storageBytes === 'dynamic' || type.arraySize || type.members || type.fullType === 'string' || type.fullType === 'bytes')
}
