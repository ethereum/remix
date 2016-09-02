'use strict'
var BN = require('ethereumjs-util').BN
var utileth = require('ethereumjs-util')
var varUtil = require('./variable')

module.exports = {
  /**
   * decode array
   *
   * @param {Object} type - current type (object returned by the getType function)
   * @param {Map} storageContent - storage
   * @param {Object} location - location in the storage { offset, slot }
   * @return {Array} return the decoded array
   */
  decodeArray: function (type, storageContent, location) {
    return this.decodeArrayItems(type, storageContent, 0, location)
  },

  /**
   * decode array items
   *
   * @param {Object} type - current type (object returned by the getType function)
   * @param {Map} storageContent - storage
   * @param {Object} location - location in the storage { offset, slot }
   * @return {Array} return the decoded array items
   */
  decodeArrayItems: function (type, storageContent, depth, location) {
    var ret = []
    var size = type.dim[depth]
    if (size === 'dynamic') {
      size = storageContent[formatHexKey(location.slot.toString(16))]
      size = parseInt(size)
      var pointer = getDynamicPointer(location)
      location.offset = 0
      location.slot = new BN(pointer.replace('0x', ''), 16)
    }
    if (type.dim.length - 1 > depth) {
      depth++
      for (var k = 0; k < size; k++) {
        ret.push(this.decodeArrayItems(type, storageContent, depth, location))
        location = moveNextArray(location)
      }
    } else {
      for (var i = 0; i < size; i++) {
        ret.push(this.decodeType(type, storageContent, location))
        location = moveNextItemInArray(type, location)
      }
    }
    return ret
  },

  /**
   * decode int/uint
   *
   * @param {Object} type - current type (object returned by the getType function)
   * @param {Map} storageContent - storage
   * @param {Object} location - location in the storage { offset, slot }
   * @return {String} return the decoded int/uint
   */
  decodeInt: function (type, storageContent, location) {
    var value = getValue(type, storageContent, location)
    value = extractValue(value, type, location)
    var bigNumber = new BN(value.replace('0x', ''), 16)
    if (type.innerType === 'uint') {
      return bigNumber.toString(10)
    } else if (type.innerType === 'int') {
      if (isNegative(bigNumber)) {
        return '-' + bigNumber.sub(new BN(new Array(value.length + 1).join('f'), 16)).sub(new BN(1)).toString(10) // return utileth.fromSigned(utileth.toUnsigned(bigNumber)).toString(10)
      } else {
        return bigNumber.toString(10)
      }
    }
  },

  /**
   * decode struct
   *
   * @param {Object} type - current type (object returned by the getType function)
   * @param {Map} storageContent - storage
   * @param {Object} location - location in the storage { offset, slot }
   * @return {Map} return the decoded struct
   */
  decodeStruct: function (type, storageContent, location) {
    var ret = {}
    for (var k in type.members) {
      var member = type.members[k]
      location = {
        slot: add(member.location.slot, location.slot),
        offset: member.location.offset
      }
      ret[member.name] = this.decode(member.type, storageContent, location)
    }
    return ret
  },

  /**
   * decode bool
   *
   * @param {Object} type - current type (object returned by the getType function)
   * @param {Map} storageContent - storage
   * @param {Object} location - location in the storage { offset, slot }
   * @return {Array} return the decoded bool
   */
  decodeBool: function (type, storageContent, location) {
    var value = getValue(type, storageContent, location)
    value = extractValue(value, type, location)
    return value !== '0x00'
  },

  /**
   * decode enum
   *
   * @param {Object} type - current type (object returned by the getType function)
   * @param {Map} storageContent - storage
   * @param {Object} location - location in the storage { offset, slot }
   * @return {Array} return the decoded enum
   */
  decodeEnum: function (type, storageContent, location) {
    var value = getValue(type, storageContent, location)
    value = extractValue(value, type, location)
    value = parseInt(value)
    if (type.enum) {
      return type.enum[value].attributes.name
    }
    return ''
  },

  /**
   * decode address
   *
   * @param {Object} type - current type (object returned by the getType function)
   * @param {Map} storageContent - storage
   * @param {Object} location - location in the storage { offset, slot }
   * @return {Array} return the decoded address
   */
  decodeAddress: function (type, storageContent, location) {
    var value = getValue(type, storageContent, location)
    return extractValue(value, type, location)
  },

  /**
   * decode bytes array
   *
   * @param {Object} type - current type (object returned by the getType function)
   * @param {Map} storageContent - storage
   * @param {Object} location - location in the storage { offset, slot }
   * @return {Array} return the decoded bytes array
   */
  decodeBytes: function (type, storageContent, location) {
    if (type.size === 'dynamic') {
      return this.decodeDynamicBytes(type, storageContent, location)
    } else {
      var value = getValue(type, storageContent, location)
      return extractValue(value, type, location)
    }
  },

  /**
   * decode dynamic bytes array
   *
   * @param {Object} type - current type (object returned by the getType function)
   * @param {Map} storageContent - storage
   * @param {Object} location - location in the storage { offset, slot }
   * @return {Array} return the decoded bytes array
   */
  decodeDynamicBytes: function (type, storageContent, location) {
    var value = getValue(type, storageContent, location)
    var key = getDynamicPointer(location)
    if (storageContent[key] && storageContent[key] !== '0x') {
      var ret = ''
      var length = parseInt(value) - 1
      var slots = Math.ceil(length / 64)
      var currentSlot = storageContent[key]
      key = new BN(key.replace('0x', ''), 16)
      for (var k = 0; k < slots; k++) {
        ret += currentSlot.replace('0x', '')
        key = key.add(new BN(1))
        currentSlot = storageContent['0x' + key.toString(16)]
      }
      ret = ret.substr(0, length)
      return ret
    } else {
      var size = value.substr(value.length - 2, 2)
      return value.substr(0, parseInt(size, 16) + 2)
    }
  },

  /**
   * decode string
   *
   * @param {Object} type - current type (object returned by the getType function)
   * @param {Map} storageContent - storage
   * @param {Object} location - location in the storage { offset, slot }
   * @return {Array} return the decoded string
   */
  decodeString: function (type, storageContent, location) {
    var value = this.decodeBytes(type, storageContent, location)
    value = value.replace('0x', '')
    var ret = ''
    for (var k = 0; k < value.length; k += 2) {
      var raw = value.substr(k, 2)
      var str = String.fromCharCode(parseInt(raw, 16))
      ret += str
    }
    return ret
  },

  /**
   * decode the given @arg type
   *
   * @param {Object} type - current type (object returned by the getType function)
   * @param {Map} storageContent - storage
   * @param {Object} location - location in the storage { offset, slot }
   * @return {Array} return the decoded type
   */
  decode: function (type, storageContent, location) {
    if (varUtil.isArray(type)) {
      return this.decodeArray(type, storageContent, location)
    } else {
      return this.decodeType(type, storageContent, location)
    }
  },

  /**
   * decode the given @arg type (the decode function should be used to decode array)
   *
   * @param {Object} type - current type (object returned by the getType function)
   * @param {Map} storageContent - storage
   * @param {Object} location - location in the storage { offset, slot }
   * @return {Array} return the decoded type
   */
  decodeType: function (type, storageContent, location) {
    if (varUtil.isInt(type)) {
      return this.decodeInt(type, storageContent, location)
    } else if (varUtil.isStruct(type)) {
      return this.decodeStruct(type, storageContent, location)
    } else if (varUtil.isBool(type)) {
      return this.decodeBool(type, storageContent, location)
    } else if (varUtil.isAddress(type)) {
      return this.decodeAddress(type, storageContent, location)
    } else if (varUtil.isBytes(type)) {
      return this.decodeBytes(type, storageContent, location)
    } else if (varUtil.isEnum(type)) {
      return this.decodeEnum(type, storageContent, location)
    } else if (varUtil.isString(type)) {
      return this.decodeString(type, storageContent, location)
    }
  }
}

function getValue (type, storageContent, location) {
  var hexSlot
  if (!isNaN(location.slot)) {
    hexSlot = location.slot.toString(16)
  } else {
    hexSlot = location.slot
  }
  hexSlot = formatHexKey(hexSlot)
  var slotValue = storageContent[hexSlot]
  if (!slotValue) {
    return ''
  }
  return slotValue
}

function extractValue (slotValue, type, location) {
  slotValue = slotValue.replace('0x', '')
  var offset = slotValue.length - location.offset - type.memSize
  if (offset >= 0) {
    return '0x' + slotValue.substr(offset, type.memSize)
  } else if (offset + type.memSize > 0) {
    return '0x' + slotValue.substr(0, type.memSize + offset)
  } else {
    return '0x0'
  }
}

function formatHexKey (hexSlot) {
  hexSlot = hexSlot.replace('0x', '')
  hexSlot = hexSlot.length > 1 ? hexSlot : '0' + hexSlot
  hexSlot = '0x' + hexSlot
  return hexSlot
}

function getDynamicPointer (location) {
  var remoteSlot = (new BN(location.slot)).toString(16)
  remoteSlot = formatHexKey(remoteSlot)
  var key = utileth.sha3(utileth.setLengthLeft(remoteSlot, 32))
  return utileth.bufferToHex(key)
}

function add (value1, value2) {
  return toBN(value1).add(toBN(value2))
}

function toBN (value) {
  if (value instanceof BN) {
    return value
  } else if (value.indexOf && value.indexOf('0x') === 0) {
    value = new BN(value.replace('Ox', ''), 16)
  } else if (!isNaN(value)) {
    value = new BN(value)
  }
  return value
}

function moveNextArray (location) {
  return {
    offset: 0,
    slot: location.slot + 1
  }
}

function moveNextItemInArray (type, location) {
  if (type.size === 'dynamic' || location.offset + type.memSize >= 64) {
    location.offset = 0
    location.slot = add(location.slot, 1)
  } else if (type.isStruct) {
    location.offset = 0
    location.slot = add(location.slot, type.membersSlotsUsed)
  } else {
    location.offset = location.offset + type.memSize
  }
  return location
}

function isNegative (value) {
  var binary = value.toString(2)
  return binary.length < 4 ? false : binary[0] === '1'
}
