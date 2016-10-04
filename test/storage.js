'use strict'
var tape = require('tape')
var contractStorageResources = require('./resources/contractStorage')
var stateDecoder = require('../src/solidity/stateDecoder')
var solc = require('solc')

tape('Storage', function (t) {
  t.test('Storage.typedecoder', function (st) {
    var output = solc.compile(contractStorageResources.testSimpleStorage, 0) // 1 activates the optimiser
    var state = stateDecoder.getStateVariableLocations('testSimpleStorage', output.sources)
    console.log(JSON.stringify(state, null, '\t'))
    checkType(st, state[0].type, 'uint32', 4)
    checkLocation(state[0].location, 0, 0)

    checkType(st, state[1].type, 'uint256', 32)
    checkLocation(state[1].location, 1, 0)

    checkType(st, state[2].type, 'uint256', 32)
    checkLocation(state[2].location, 2, 0)

    checkType(st, state[3].type, 'uint256[1]', 32)
    checkLocation(state[3].location, 3, 0)
    st.equal(state[3].type.arraySize, 1)

    checkType(st, state[4].type, 'uint256[][1][4]', 32)
    checkLocation(state[4].location, 4, 0)
    st.equal(state[4].type.arraySize, 4)

    checkType(st, state[4].type.subArray, 'uint256[][1]', 32)
    st.equal(state[4].type.subArray.arraySize, 1)

    checkType(st, state[4].type.subArray.subArray, 'uint256[]', 32)
    st.equal(state[4].type.subArray.subArray.arraySize, 'dynamic')

    checkType(st, state[5].type, 'int16', 2)
    checkLocation(state[5].location, 8, 0)

    checkType(st, state[6].type, 'struct structDef', 64)
    checkLocation(state[6].location, 9, 0)
    checkType(st, state[6].type.members[0].type, 'uint256', 32)
    checkType(st, state[6].type.members[1].type, 'string', 'dynamic')

    checkType(st, state[8].type, 'int32', 4)
    checkLocation(state[6].location, 17, 0)

    checkType(st, state[9].type, 'int16', 2)
    checkLocation(state[6].location, 17, 4)
    st.end()
  })
})

function checkLocation (location, slot, offset) {
}

function checkType (st, variable, fullType, storageBytes) {
  st.equal(variable.fullType, fullType)
  st.equal(variable.storageBytes, storageBytes)
}
