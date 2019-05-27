'use strict'

module.exports = {
  contract: `
contract proxy {
    struct testStruct {
        int one;
        uint two;
    }
}
contract intLocal {
    constructor () public {
      proxy.testStruct memory p;
      uint8 ui8 = 130;
      uint16 ui16 = 456;
      uint32 ui32 = 4356;
      uint64 ui64 = 3543543543;
      uint128 ui128 = 234567;
      uint256 ui256 = 115792089237316195423570985008687907853269984665640564039457584007880697216513;
      uint ui = 123545666;
      int8 i8 = -45;
      int16 i16 = -1234;
      int32 i32 = 3455;
      int64 i64 = -35566;
      int128 i128 = -444444;
      int256 i256 = 3434343;
      int i = -32432423423;    
      int32 ishrink = 2;   
      level11();
      level12();
      level11();
    }
    
    function level11() public {
      uint8 ui8 = 123;
      level12();
    }
    function level12() public {
      uint8 ui81 = 12;
    }
  }
`}
