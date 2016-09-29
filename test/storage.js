'use strict'
var tape = require('tape')
var contractStorageResources = require('./resources/contractStorage')
var contractsHelper = require('../src/solidity/contracts')
var solc = require('solc')

tape('Storage', function (t) {
  t.test('Storage.decode', function (st) {
    var output = solc.compile(contractStorageResources.source, 0) // 1 activates the optimiser
    console.log(output)
    var storageLocation = contractsHelper.getStorageLocationOf('testStorage', output.sources)
    var storage = contractStorageResources.storage
    var decoded = contractsHelper.decodeState(storageLocation, storage)
    st.equal(decoded.ui1, '32')
    st.equal(decoded.ui8, '32')
    st.equal(decoded.ui16, '123')
    st.equal(decoded.ui32, '256')
    st.equal(decoded.ui64, '500')
    st.equal(decoded.ui128, '2877')
    st.equal(decoded.ui256, '3467899')
    st.equal(decoded.ui, '123456784534564345')

    st.equal(decoded.i1, '32')
    st.equal(decoded.i8, '-32')
    st.equal(decoded.i16, '-3342')
    st.equal(decoded.i32, '-1')
    st.equal(decoded.i64, '-344442')
    st.equal(decoded.i128, '-3456787698678')
    st.equal(decoded.i256, '-2345667')
    st.equal(decoded.i, '-1234546787')

    st.equal(decoded.enum1, 'third')
    st.equal(decoded.bo, true)
    st.equal(decoded.a1, '0x2AD803b9A828044875245E8EB88183fF74DC5D80'.toLocaleLowerCase())

    st.equal(decoded.b, '0xDF'.toLocaleLowerCase())
    st.equal(decoded.b1, '0x06'.toLocaleLowerCase())
    st.equal(decoded.b8, '0x0603040AA6'.toLocaleLowerCase())
    st.equal(decoded.b16, '0x0603040AA60603040AA60603040AA60b0'.toLocaleLowerCase())
    st.equal(decoded.b32, '0x0603040AA60603040AA60603040AA60b003040AA60603040AA60603040AA60b0'.toLocaleLowerCase())

    st.equal(decoded.str, '_string_')
    st.equal(decoded.longStr, '_string__string__string__string__string__string__string__string__string__string__string__string__string__string__string__string__string__string__string__string__string__string__string__string__string__string__string__string__string__string__string__string__string__string__string__string_')

    st.equal(decoded.depthArray[0][0], '-233333')
    st.equal(decoded.depthArray[0][1], '-233334')
    st.equal(decoded.depthArray[0][1], '-233334')
    st.equal(decoded.depthArray[0][2], '-233335')
    st.equal(decoded.depthArray[1][1], '-233436')
    st.equal(decoded.depthArray[1][2], '-233436')

    st.equal(decoded.strArray[0], 'value1')
    st.equal(decoded.strArray[1], 'value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_')
    st.equal(decoded.strArray[2], 'value3')

    st.equal(decoded.structArray[0][0].i, '-2345678')
    st.equal(decoded.structArray[0][0].strArray[0], 'value1')
    st.equal(decoded.structArray[0][0].strArray[1], 'value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_')

    st.equal(decoded.structArray[1][0].i, '-25678')
    st.equal(decoded.structArray[1][0].strArray[0], 'value1')
    st.equal(decoded.structArray[1][0].strArray[1], 'value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_value1_')
    st.end()
  })
})
