var contractStorage = {}

contractStorage.testSimpleStorage = `
contract testSimpleStorage1 {
    uint32 uibase1;
}

contract testSimpleStorage is testSimpleStorage1 {
    uint ui1;
    uint ui2;
    uint[1] ui3;
    uint[][1][4] ui4;
    
    int16 i16;
    
    struct structDef {
        uint ui;
        string str;
    }
    
    structDef structDec;
    
    structDef[3] arrayStructDec;
    
    int32 i32;
    int16 i16_2;
    
    enum enumDef {
        first,
        second,
        third
    }
    
    enumDef enumDec;
    bool boolean;
    
    uint[][2][][3] ui5;
    
    string _string;
}`

contractStorage.testSimpleStorage2 = `
contract testSimpleStorage2 {
    uint32 ui32;
    uint8 ui2;
    uint64 ui3;
    bytes4 _bytes4;
    bytes32 _bytes32;
    string _string;
    string[2] stringArray;
    bytes[] bytesArray;
}`

module.exports = contractStorage