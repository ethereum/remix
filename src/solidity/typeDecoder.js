'use strict'

module.exports = {
  decodeBasicType: function (variable) {
    var ret = {}
    ret.originalType = variable.attributes.type
    ret.typeCategory = this.getTypeCategory(variable)
    ret.fullType = this.extractType(variable)
    ret.storageBytes = this.getStorageBytes(variable, ret.typeCategory)
    return ret
  },

  /**
   * return parse the type and return an object representing the type
   *
   * @param {Object} variable - variable declaration given by the AST
   * @param {Object} stateDeclarations  - all state declarations given by the AST (including struct and enum type declaration)
   * @return {Object} - return parsed information about the current variable:
   *                    originalType: long type name given by the AST (ex: int[2] storage ref[2])
   *                    innerType: base type to decode (int, uint, bytes, etc..)
   *                    size: size of the type
   *                    memSize: size in the storage (hex)
   *                    dim: dim > 0 is array. contains the size of underlying array
   *                    slotUsed: number of slot used by the type (always > 0)
   *                    enum: contain enum value declaration for the current type (only for enum type)
   *                    members: contain members variable declaration for the current type (only for struct type)
   *                    isBytes: bool
   *                    isArray: bool
   *                    isStruct: bool
   */
  decodeType: function (variable, stateDefinitions) {
    var ret = this.decodeBasicType(variable)
    if (ret.typeCategory === 'enum') {
      ret.enum = this.getEnum(variable, stateDefinitions)
      ret.isEnum = true
    }
    if (ret.typeCategory === 'bytes' || ret.typeCategory === 'string') {
      ret.isBytes = true
    }
    var membersParsing
    if (ret.typeCategory.indexOf('struct') === 0) {
      membersParsing = this.getStructMembers(variable, stateDefinitions)
      ret.members = membersParsing.members
      ret.slotsUsed = membersParsing.slotsUsed
      ret.isStruct = true
    }
    if (ret.type.indexOf('[') !== -1) {
      ret.arrayBaseType = this.extractBaseType(ret.fullType)
      ret.dim = this.getDim(variable)
      var subArrayType = variable.attributes.type.subtring(0, variable.attributes.type.lastIndexOf('['))
      if (subArrayType.indexOf('[') !== -1) {
        var subArray = JSON.parse(JSON.stringify(variable))
        subArray.attributes.type = subArrayType
        ret.subArray = this.decodeType(subArray, stateDefinitions)
      }
    }
    /*
    if (ret.dim.length > 0) { // array
      var slotUsedByArray = []
      this.getSlotsUsedByArray(ret.dim, ret, 0, slotUsedByArray)
      ret.slotsUsed = slotUsedByArray[0]
      ret.isArray = true
    } else {
      ret.slotsUsed = 1
    }*/
    return ret
  },

  getSlotsUsedByArray: function (dimension, type, depth, slotUsedByArray) {
    if (dimension[depth] === 'dynamic') {
      slotUsedByArray.push(1) // 1 slot
    } else {
      if (depth === dimension.length - 1) {
        var storageSize = isNaN(type.memSize) ? 64 : type.memSize
        slotUsedByArray.push(Math.ceil(dimension[depth] * storageSize / 64))
      } else {
        var slotUsed = 0
        var currentDepth = depth + 1
        var slotUsedByInternalArray = []
        for (var k = 0; k < dimension[depth]; k++) {
          this.getSlotsUsedByArray(dimension, type, currentDepth, slotUsedByInternalArray)
          slotUsed += slotUsedByInternalArray[slotUsedByInternalArray.length - 1]
        }
        slotUsedByArray.push(slotUsed)
      }
    }
  },

  /**
   * parse the size of the type
   *
   * @param {Object} variable - variable declaration
   * @param {String} innerType - base type
   * @return {Int|String} - return the size on storage of the type (bytes)
   *                        return 'unapplicable' if the size could not be determmined directly (struct)
   *                        return 'dynamic' if dynamic size
   */
  getStorageBytes: function (variable, typeCategory) {
    if (typeCategory.indexOf('struct') === 0) {
      return 'unapplicable'
    }
    var type = variable.attributes.type
    type = this.extractType(type)
    if (type.indexOf('[') !== -1) {
      type = type.substring(0, type.indexOf('['))
    }
    if (type === 'string' || type === 'bytes') {
      size = 'dynamic'
    } else if (type === 'bool' || type === 'enum') {
      size = 8
    } else if (type === 'address' || type === 'contract') {
      size = 160
    } else {
      var size = type.replace(typeCategory, '')
      if (size !== '') {
        size = parseInt(size)
      }
    }
    if (typeCategory === 'bytes') {
      size = 8 * size
    }
    size = isNaN(size) ? size : size / 8 // bytes
    return size
  },
  
  /**
   * return the dim of the current array
   *
   * @param {Object} variable - variable declaration
   * @return {String} containing the dim of the array ([] if dynamic array)
   */
  getDim: function (variable) {
    if (variable.attributes.type.indexOf('[') !== -1) {
      var squareBracket = /\[([0-9]+|\s*)\]/g
      var type = variable.attributes.type
      var dim = type.match(squareBracket)
      if (dim.length === 0) {
        return null
      } else {
        return dim[dim.length - 1]
      }
    }
  },

  /**
   * parse the number of dimension of the type
   *
   * @param {Object} variable - variable declaration
   * @return [] containing the number of dimension of the given @arg variable
   *            return empty array for type that does not have dimension (int, uint, etc .. (not array))
   */
  getDimensionDeclaration: function (variable) {
    var ret = []
    if (variable.attributes.type.indexOf('[') !== -1) {
      var squareBracket = /\[([0-9]+|\s*)\]/g
      var type = variable.attributes.type
      var dim = type.match(squareBracket)
      return dim
      /*if (dim && dim.length > 0) {
        for (var k in dim) {
          if (dim[k] === '[]') {
            ret.push('dynamic')
          } else {
            ret.push(parseInt(dim[k].replace('[', '').replace(']', '')))
          }
        }
      }*/
    }
    return ret
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
   * determine if the given @arg type need to start from a new slot
   *
   * @param {Object} type - current type (object returned by the getType function)
   * @param {Object} location - location in storage of the type.
   * @return true if the type needs a new storage
   */
  typeNeedNewSlot: function (type, location) {
    return (type.size === 'dynamic' || location.offset + type.memSize > 64 || type.isArray || type.isStruct /* || type.isBytes*/)
  },

  /**
   * determine what will be the location of the current @arg type and the start location of the next type in storage
   *
   * @param {Object} type - current type (object returned by the getType function)
   * @param {Object} location - location in storage of the type.
   * @return {Object} return the location of the current type and the location of the next type in storage
   */
  walkStorage: function (type, location) {
    var currentLocation = {
      slot: location.slot,
      offset: location.offset
    }
    var nextLocation = {
      slot: location.slot,
      offset: location.offset
    }
    if (location.offset > 0 && this.typeNeedNewSlot(type, location)) {
      currentLocation = {
        slot: location.slot + 1,
        offset: 0
      }
    }
    if (this.typeNeedNewSlot(type, location)) {
      nextLocation.offset = 0
      nextLocation.slot = currentLocation.slot + type.slotsUsed
    } else {
      nextLocation.offset = currentLocation.offset + type.memSize
      if (nextLocation.offset >= 64) {
        nextLocation.offset = 0
        nextLocation.slot = currentLocation.slot + 1
      }
    }
    return {
      currentLocation: currentLocation,
      nextLocation: nextLocation
    }
  },

  /**
   * retrieve the innerType
   *
   * @param {Object} variable - variable declaration
   * @return {String} return the base type
   */
  getTypeCategory: function (variable) {
    var types = ['uint', 'int', 'bytes', 'string', 'address', 'struct', 'bool', 'enum', 'contract']
    for (var k in types) {
      if (this.extractType(variable.attributes.type).indexOf(types[k]) !== -1) {
        if (types[k] === 'struct') {
          var type = variable.attributes.type.split(' ')
          return type[0] + ' ' + type[1] // struct <typename>
        } else {
          return types[k]
        }
      }
    }
  },

  /**
   * extract the first part of the full type
   *
   * @param {String} fullType - type given by the AST (ex: uint[2] storage ref[2])
   * @return {String} return the first part of the full type. keep the array dim declaration (uint[2][2] in that case)
   */
  extractType: function (fullType) {
    var dim = []
    if (fullType.indexOf('[') !== -1) {
      var dim = this.getDimensionDeclaration(fullType)
    }
    if (fullType.indexOf(' ') !== -1) {
      fullType = fullType.split(' ')[0] 
    }    
    fullType = fullType.split('[')[0]
    if (dim.length) {
      fullType = fullType + dim.join('')
    }
    return fullType
  },
  
   /**
   * extract the first part of the full type and remove array declaration
   *
   * @param {String} fullType - type given by the AST (ex: uint[2] storage ref[2])
   * @return {String} return the first part of the full type (uint in that case)
   */
  extractBaseType: function (fullType) {
    if (type.indexOf('[') !== -1) {
      type = type.substring(0, type.indexOf('['))
    }
    return type
  },

  /**
   * check the type
   *
   * @param {Object} type - current type (object returned by the getType function)
   * @return {bool} true if type is an int
   */
  isInt: function (type) {
    return (type.innerType === 'int' || type.innerType === 'uint')
  },

  /**
   * check the type
   *
   * @param {Object} type - current type (object returned by the getType function)
   * @return {bool} true if type is an array
   */
  isArray: function (type) {
    return type.isArray
  },

  /**
     * check the type
     *
     * @param {Object} type - current type (object returned by the getType function)
     * @return {bool} true if type is a struct
     */
  isStruct: function (type) {
    return type.members instanceof Array
  },

  /**
     * check the type
     *
     * @param {Object} type - current type (object returned by the getType function)
     * @return {bool} true if type is a bool
     */
  isBool: function (type) {
    return type.innerType === 'bool'
  },

  /**
     * check the type
     *
     * @param {Object} type - current type (object returned by the getType function)
     * @return {bool} true if type is an address
     */
  isAddress: function (type) {
    return type.innerType === 'address' || type.innerType === 'contract'
  },

  /**
     * check the type
     *
     * @param {Object} type - current type (object returned by the getType function)
     * @return {bool} true if type is a bytes array
     */
  isBytes: function (type) {
    return type.innerType === 'bytes'
  },

  /**
     * check the type
     *
     * @param {Object} type - current type (object returned by the getType function)
     * @return {bool} true if type is and enum
     */
  isEnum: function (type) {
    return type.innerType === 'enum'
  },

  /**
     * check the type
     *
     * @param {Object} type - current type (object returned by the getType function)
     * @return {bool} true if type is a string
     */
  isString: function (type) {
    return type.innerType === 'string'
  }
}

