var gray = require('ansi-gray')
const winston = require('winston')
var timestamp = require('time-stamp')
var supportsColor = require('color-support')

function hasFlag (flag) {
  return ((typeof (process) !== 'undefined') && (process.argv.indexOf('--' + flag) !== -1))
}

function addColor (str) {
  if (hasFlag('no-color')) {
    return str
  }

  if (hasFlag('color')) {
    return gray(str)
  }

  if (supportsColor()) {
    return gray(str)
  }

  return str
}
function getTimestamp () {
  return '[' + addColor(timestamp('HH:mm:ss')) + ']'
}

// create winston logger format
const logFmt = winston.format.printf((info) => {
  return `${getTimestamp()} ${info.level}: ${info.message}`
})
const wfmt = winston.format.combine(
    winston.format.colorize({ all: true }),
    logFmt
)

class Log {
  constructor () {
    this.logger = winston.createLogger({
      level: 'error',
      transports: [new winston.transports.Console()],
      format: wfmt
    })
  }
  setVerbosity (v) {
    this.logger.configure({
      level: v,
      transports: [new winston.transports.Console()],
      format: wfmt
    })
  }
}

module.exports = {
  Log
}
