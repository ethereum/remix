'use strict'

module.exports = {
  decode: function (variable, storage) {
    var slotValue = storage[variable.location.slot]
    if (variable.length === -1) {
      return slotValue
    } else {
      var value = slotValue.substr(slotValue.length - variable.location.offset - variable.length, variable.length)
      return value
    }
  }
}
