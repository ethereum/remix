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
}`

module.exports = contractStorage