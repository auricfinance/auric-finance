pragma solidity 0.5.16;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IUFragments.sol";

contract BasicMonetaryPolicy {

  using SafeMath for uint256;

  address public ausc;
  uint256[] public pricesAUX = new uint256[](12);
  uint256[] public pricesAUSC = new uint256[](12);
  uint256 public averageAUX;
  uint256 public averageAUSC;
  uint256 public lastUpdate;
  uint256 public frequency = 1 hours;
  uint256 public counter = 0;
  uint256 public constant WINDOW_SIZE = 12;
  uint256 public epoch = 1;

  constructor (address token) public {
    ausc = token;
  }

  function recordPrice() external {
    if (msg.sender != tx.origin) {
      // smart contracts could manipulate data via flashloans,
      // thus we forbid them from updating the price
      return;
    }

    if (block.timestamp < lastUpdate + frequency) {
      // addition is running on timestamps, this will never overflow
      // we leave at least the specified period between two updates
      return;
    }

    uint256 priceAUX = getPriceAUX();
    uint256 priceAUSC = getPriceAUSC();
    lastUpdate = block.timestamp;

    if (counter < WINDOW_SIZE) {
      // still in the warming up phase
      pricesAUX[counter] = priceAUX;
      pricesAUSC[counter] = priceAUSC;
      averageAUX = averageAUX.mul(counter).add(priceAUX).div(counter.add(1));
      averageAUSC = averageAUSC.mul(counter).add(priceAUSC).div(counter.add(1));
      counter++;
    } else {
      uint256 index = counter % WINDOW_SIZE;
      averageAUX = averageAUX.mul(WINDOW_SIZE).sub(pricesAUX[index]).add(priceAUX).div(WINDOW_SIZE);
      averageAUSC = averageAUSC.mul(WINDOW_SIZE).sub(pricesAUSC[index]).add(priceAUSC).div(WINDOW_SIZE);
      pricesAUX[index] = priceAUX;
      pricesAUSC[index] = priceAUSC;
      counter++;
    }
  }

  function rebase() external {
    // todo: do not rebase more frequently than once per hour
    // todo: update prices before rebasing

    // only rebase if there is a 5% difference between the price of AUX and AUSC
    uint256 highThreshold = averageAUX.mul(105).div(100);
    uint256 lowThreshold = averageAUX.mul(95).div(100);

    if (averageAUSC > highThreshold) {
      // AUSC is too expensive, this is a positive rebase increasing the supply
      uint256 currentSupply = IERC20(ausc).totalSupply();
      uint256 desiredSupply = currentSupply.mul(averageAUSC).div(averageAUX);
      // Cannot underflow as desiredSupply > currentSupply, the result is positive
      //int256 delta = int256(desiredSupply - currentSupply); 
      uint256 delta = desiredSupply.mul(1e18).div(currentSupply).sub(1e18); 
      IUFragments(ausc).rebase(epoch, delta, true);
      //IUFragments(ausc).rebase(epoch, delta);
      epoch++;
    } else if (averageAUSC < lowThreshold) {
      // AUSC is too cheap, this is a negative rebase decreasing the supply
      uint256 currentSupply = IERC20(ausc).totalSupply();
      uint256 desiredSupply = currentSupply.mul(averageAUSC).div(averageAUX);
      // Cannot overflow as desiredSupply > currentSupply
      //int256 delta = int256(desiredSupply - currentSupply); 
      //IUFragments(ausc).rebase(epoch, delta);
      // uint256 delta = uint256(currentSupply - desiredSupply); 
      uint256 delta = uint256(1e18).sub(desiredSupply.mul(1e18).div(currentSupply)); 
      IUFragments(ausc).rebase(epoch, delta, false);
      epoch++;
    }
    // else the price is within bounds
  }

  function getPriceAUX() public view returns (uint256);
  function getPriceAUSC() public view returns (uint256);
}
