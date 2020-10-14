pragma solidity 0.5.16;

import "../BasicMonetaryPolicy.sol";
import "./MockOracle.sol";

contract MockMonetaryPolicy is BasicMonetaryPolicy, MockOracle {

  constructor (address token, address _treasury) BasicMonetaryPolicy(token, _treasury) public {
  }

}
