pragma solidity >=0.4.9 <0.6.0;
contract arr {
    uint[] users;
    
    bytes access_rights_per_user;
    
    uint user_index;
     
    address owner;
    
    string grr = "message";
    
    uint[100] last_100_users;
    
    constructor(address owner1) public {
       owner = owner1;
       user_index = 0;
    }
    
    function addUser(uint id, byte rights) public{
        users[user_index] = id;
        last_100_users[user_index % 100] = id;
        access_rights_per_user[user_index] = rights;
        user_index++;
    }
    
    function resetState() public{
        require(msg.sender == owner, grr);
        delete users;
        delete access_rights_per_user;
        delete last_100_users;
    }  
    
    function bla(string memory bal) public {
        grr = bal;
    }
}