/// This contract is for testing purposes only and will never be deployed

pragma solidity 0.5.16;

contract MockOracle {

  uint256 priceAUSC = 1;
  uint256 priceAUX = 1;

  constructor () public {
  }

  function setAUSCPrice(uint256 price) external {
    priceAUSC = price;
  }

  function setAUXPrice(uint256 price) external {
    priceAUX = price;
  }

  function getPriceAUSC() public view returns (uint256) {
    return priceAUSC;
  }

  function getPriceAUX() public view returns (uint256) {
    return priceAUX;
  }
}

