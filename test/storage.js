'use strict'
var tape = require('tape')
var contractStorageResources = require('./resources/contractStorage')
var stateDecoder = require('../src/solidity/stateDecoder')
var solcWrapper = require('solc/wrapper')

tape('Storage', function (t) {
  console.log('loading last compiler version...')
  solcWrapper().loadRemoteVersion('latest', function (err, compiler) {
    if (err) {
      t.fail(err)
    } else {
      test(t, compiler)
    }
  })
})

function test (t, solc) {
  t.test('Storage.typedecoder.all', function (st) {
    var output = solc.compile(contractStorageResources.testSimpleStorage, 0) // 1 activates the optimiser
    var state = stateDecoder.stateVariableLocations('testSimpleStorage', output.sources)

    checkType(st, state[0].type, 'uint32', 4)
    checkLocation(st, state[0].location, 0, 0)

    checkType(st, state[1].type, 'uint256', 32)
    checkLocation(st, state[1].location, 1, 0)

    checkType(st, state[2].type, 'uint256', 32)
    checkLocation(st, state[2].location, 2, 0)

    checkType(st, state[3].type, 'uint256[1]', 32)
    checkLocation(st, state[3].location, 3, 0)
    st.equal(state[3].type.arraySize, 1)

    checkType(st, state[4].type, 'uint256[][1][4]', 128)
    checkLocation(st, state[4].location, 4, 0)
    st.equal(state[4].type.arraySize, 4)

    checkType(st, state[4].type.subArray, 'uint256[][1]', 32)
    st.equal(state[4].type.subArray.arraySize, 1)

    checkType(st, state[4].type.subArray.subArray, 'uint256[]', 32)
    st.equal(state[4].type.subArray.subArray.arraySize, 'dynamic')

    checkType(st, state[5].type, 'int16', 2)
    checkLocation(st, state[5].location, 8, 0)

    checkType(st, state[6].type, 'struct structDef', 64)
    checkLocation(st, state[6].location, 9, 0)
    checkType(st, state[6].type.members[0].type, 'uint256', 32)
    checkType(st, state[6].type.members[1].type, 'string', 32)

    checkType(st, state[7].type, 'struct structDef[3]', 192)

    checkType(st, state[8].type, 'int32', 4)
    checkLocation(st, state[8].location, 17, 0)

    checkType(st, state[9].type, 'int16', 2)
    checkLocation(st, state[9].location, 17, 4)

    checkType(st, state[10].type, 'enum enumDef', 1)
    checkLocation(st, state[10].location, 17, 6)

    checkType(st, state[11].type, 'bool', 1)
    checkLocation(st, state[11].location, 17, 7)

    checkType(st, state[12].type, 'uint256[][2][][3]', 96)
    checkLocation(st, state[12].location, 18, 0)
    st.equal(state[12].type.arraySize, 3)
    st.equal(state[12].type.subArray.arraySize, 'dynamic')
    st.equal(state[12].type.subArray.subArray.arraySize, 2)
    st.equal(state[12].type.subArray.subArray.subArray.arraySize, 'dynamic')

    checkType(st, state[13].type, 'string', 32)
    checkLocation(st, state[13].location, 21, 0)
    st.end()
  })

  t.test('Storage.typedecoder.string', function (st) {
    var output = solc.compile(contractStorageResources.testSimpleStorage2, 0) // 1 activates the optimiser
    var state = stateDecoder.stateVariableLocations('testSimpleStorage2', output.sources)

    checkType(st, state[0].type, 'uint32', 4)
    checkLocation(st, state[0].location, 0, 0)

    checkType(st, state[1].type, 'uint8', 1)
    checkLocation(st, state[1].location, 0, 4)

    checkType(st, state[2].type, 'uint64', 8)
    checkLocation(st, state[2].location, 0, 5)

    checkType(st, state[3].type, 'bytes4', 4)
    checkLocation(st, state[3].location, 0, 13)

    checkType(st, state[4].type, 'bytes32', 32)
    checkLocation(st, state[4].location, 1, 0)

    checkType(st, state[5].type, 'string', 32)
    checkLocation(st, state[5].location, 2, 0)

    checkType(st, state[6].type, 'string[2]', 64)
    checkLocation(st, state[6].location, 3, 0)
    st.equal(state[6].type.arraySize, 2)

    checkType(st, state[7].type, 'bytes[]', 32)
    checkLocation(st, state[7].location, 5, 0)
    st.equal(state[7].type.arraySize, 'dynamic')

    st.end()
  })
}

function checkLocation (st, location, slot, offset) {
  st.equal(location.slot, slot)
  st.equal(location.offset, offset)
}

function checkType (st, type, fullType, storageBytes) {
  st.equal(type.typeName, fullType)
  st.equal(type.storageBytes, storageBytes)
}
