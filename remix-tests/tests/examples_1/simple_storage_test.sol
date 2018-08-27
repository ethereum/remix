pragma solidity ^0.4.7;
import "./simple_storage.sol";

contract MyTest {
  SimpleStorage foo;

  function beforeAll() {
    foo = new SimpleStorage();
  }

  function initialValueShouldBe100() public constant returns (bool) {
    //return Assert.equal(foo.get(), 100, "initial value is not correct");
    return foo.get() == 100;
  }

  function initialValueShouldBe200() public constant returns (bool) {
    //return Assert.equal(foo.get(), 200, "initial value is not correct");
    return foo.get() == 200;
  }

  function shouldTriggerOneFail() public {
    Assert.equal(uint(1), uint(2), "the test 1 fails");
    Assert.equal(uint(1), uint(2), "the test 2 fails");
  }

  function shouldTriggerOnePass() public {
    Assert.equal(uint(1), uint(1), "the test 3 fails");
  }

}
