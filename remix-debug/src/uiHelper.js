'use strict'
module.exports = {
  formatMemory: function (mem, width) {
    const ret = {}
    if (!mem) {
      return ret
    }

    if (!mem.substr) {
      mem = mem.join('') // geth returns an array, eth return raw string
    }

    for (let k = 0; k < mem.length; k += (width * 2)) {
      const memory = mem.substr(k, width * 2)
      const content = this.tryConvertAsciiFormat(memory)
      ret['0x' + (k / 2).toString(16)] = content.raw + '\t' + content.ascii
    }
    return ret
  },

  tryConvertAsciiFormat: function (memorySlot) {
    const ret = { ascii: '', raw: '' }
    for (let k = 0; k < memorySlot.length; k += 2) {
      const raw = memorySlot.substr(k, 2)
      let ascii = String.fromCharCode(parseInt(raw, 16))
      ascii = ascii.replace(/[^\w\s]/, '?')
      if (ascii === '') {
        ascii = '?'
      }
      ret.ascii += ascii
      ret.raw += raw
    }
    return ret
  },

  /**
   * format @args css1, css2, css3 to css inline style
   *
   * @param {Object} css1 - css inline declaration
   * @param {Object} css2 - css inline declaration
   * @param {Object} css3 - css inline declaration
   * @param {Object} ...
   * @return {String} css inline style
   *                  if the key start with * the value is direcly appended to the inline style (which should be already inline style formatted)
   *                  used if multiple occurences of the same key is needed
   */
  formatCss: function (css1, css2) {
    let ret = ''
    for (let arg in arguments) {
      for (let k in arguments[arg]) {
        if (arguments[arg][k] && ret.indexOf(k) === -1) {
          if (k.indexOf('*') === 0) {
            ret += arguments[arg][k]
          } else {
            ret += k + ':' + arguments[arg][k] + ';'
          }
        }
      }
    }
    return ret
  },

  normalizeHex: function (hex) {
    if (hex.indexOf('0x') === 0) {
      hex = hex.replace('0x', '')
    }
    hex = hex.replace(/^0+/, '')
    return '0x' + hex
  },

  normalizeHexAddress: function (hex) {
    if (hex.indexOf('0x') === 0) hex = hex.replace('0x', '')
    if (hex.length >= 40) {
      const reg = /(.{40})$/.exec(hex)
      if (reg) {
        return '0x' + reg[0]
      }
    } else {
      return '0x' + (new Array(40 - hex.length + 1).join('0')) + hex
    }
  },

  runInBrowser: function () {
    return typeof window !== 'undefined'
  }
}
