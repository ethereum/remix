'use strict'

module.exports = {
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
  getType: function (variable, stateDeclarations) {
    var ret = {}
    ret.originalType = variable.attributes.type
    ret.innerType = this.getInnerType(variable)
    ret.size = this.getSize(variable, ret.innerType)
    ret.memSize = isNaN(ret.size) ? ret.size : ret.size / 4
    ret.dim = []
    var dimension = this.getDim(variable, ret.innerType)
    if (ret.innerType === 'enum') {
      ret.enum = this.getEnum(variable, stateDeclarations)
    }
    if (ret.innerType === 'bytes') {
      ret.isBytes = true
    }
    var membersParsing
    if (ret.innerType.indexOf('struct') === 0) {
      membersParsing = this.getStructMembers(variable, stateDeclarations)
      ret.members = membersParsing.members
      ret.slotsUsed = membersParsing.slotsUsed
      ret.membersSlotsUsed = membersParsing.slotsUsed
      ret.isStruct = true
    }
    if (dimension.length > 0) { // array
      var slotUsed = 0
      for (var k = 0; k < dimension.length; k++) {
        var arraySize = dimension[k]
        if (arraySize === 'dynamic') {
          slotUsed++
          break
        }

        try {
          arraySize = parseInt(arraySize)
          ret.dim.push(arraySize)
        } catch (e) {
          ret.dim.push(arraySize)
        }

        if (ret.members) {
          slotUsed += arraySize * membersParsing.slotsUsed
        } else {
          var storageSize = isNaN(ret.memSize) ? 64 : ret.memSize
          slotUsed += Math.ceil(arraySize * storageSize / 64)
        }
      }
      ret.slotsUsed = slotUsed
      ret.dim.reverse()
      ret.isArray = true
    } else {
      ret.slotsUsed = 1
    }
    return ret
  },

  /**
   * parse the size of the type
   *
   * @param {Object} variable - variable declaration
   * @param {String} innerType - base type
   * @return {Int|String} - return the size of the type
   *                        return 'unapplicable' if the size could not be determmined (struct)
   *                        return 'dynamic' if dynamic size
   */
  getSize: function (variable, innerType) {
    if (innerType.indexOf('struct') === 0) {
      return 'unapplicable'
    }
    var type = variable.attributes.type
    type = this.extractType(type)
    if (type.indexOf('[') !== -1) {
      type = type.substring(0, type.indexOf('['))
    }
    if (type === 'string' || type === 'bytes') {
      return 'dynamic'
    } else if (type === 'bool' || type === 'enum') {
      return 8
    } else if (type === 'address') {
      return 160
    }
    var size = type.replace(innerType, '')
    if (size !== '') {
      size = parseInt(size)
    }
    if (innerType === 'bytes') {
      size = 8 * size
    }
    return size
  },

  /**
   * parse the number of dimension of the type
   *
   * @param {Object} variable - variable declaration
   * @param {String} innerType - base type
   * @return [] containing the number of dimension of the given @arg variable
   *            return empty array for type that does not have dimension (int, uint, etc .. (not array))
   */
  getDim: function (variable, innerType) {
    var ret = []
    if (variable.attributes.type.indexOf('[') !== -1) {
      var squareBracket = /\[([0-9]+|\s*)\]/g
      var type = variable.attributes.type
      var dim = type.match(squareBracket)
      if (dim && dim.length > 0) {
        for (var k in dim) {
          if (dim[k] === '[]') {
            ret.push('dynamic')
          } else {
            ret.push(parseInt(dim[k].replace('[', '').replace(']', '')))
          }
        }
      }
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
          var type = this.getType(member, stateDeclaration)
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
    return (type.size === 'dynamic' || location.offset + type.memSize >= 64 || type.isArray || type.isStruct /* || type.isBytes*/)
  },

  /**
   * determine what will be the location of the current @arg type and the start location of the next type in storage
   *
   * @param {Object} type - current type (object returned by the getType function)
   * @param {Object} location - location in storage of the type.
   * @return {Object} return the location of the current type and the location of the next type in storage
   */
  walkStorage: function (type, location) {
    if (location.offset > 0 && this.typeNeedNewSlot(type, location)) {
      location = {
        slot: location.slot + 1,
        offset: 0
      }
    }
    var currentLocation = {
      slot: location.slot,
      offset: location.offset
    }
    if (this.typeNeedNewSlot(type, location)) {
      location.offset = 0
      location.slot = location.slot + type.slotsUsed
    } else {
      location.offset = location.offset + type.memSize
    }
    return {
      currentLocation: currentLocation,
      nextLocation: {
        slot: location.slot,
        offset: location.offset
      }
    }
  },

  /**
   * retrieve the innerType
   *
   * @param {Object} variable - variable declaration
   * @return {String} return the base type
   */
  getInnerType: function (variable) {
    var types = ['uint', 'int', 'bytes', 'string', 'address', 'struct', 'bool', 'enum']
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
   * @return {String} return the first part of the full type (uint[2] in that case)
   */
  extractType: function (fullType) {
    if (fullType.indexOf(' ') !== -1) {
      fullType = fullType.split(' ')[0]
    }
    return fullType
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
    return type.innerType === 'address'
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
