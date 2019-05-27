pragma solidity ^0.5.0;
import "./simple_string.sol";

contract StringTest {
  SimpleString foo;

  function beforeAll() public {
    foo = new SimpleString();
  }

  function initialValueShouldBeHello() public returns (bool) {
    return Assert.equal(foo.get(), "Hello world!", "initial value is not correct");
  }

  function valueShouldNotBeHelloWordl() public returns (bool) {
    return Assert.notEqual(foo.get(), "Hello wordl!", "value should not be hello world");
  }

  function valueShouldBeHelloWorld() public returns (bool) {
    return Assert.equal(foo.get(), "Hello wordl!", "initial value is not correct");
  }
}
