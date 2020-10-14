pragma solidity 0.5.16;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IAUSC.sol";

contract BasicMonetaryPolicy {

  using SafeMath for uint256;

  uint256 public constant BASE = 1e18;
  uint256 public constant WINDOW_SIZE = 12;

  address public ausc;
  uint256[] public pricesAUX = new uint256[](12);
  uint256[] public pricesAUSC = new uint256[](12);
  uint256 public pendingAUXPrice = 0;
  uint256 public pendingAUSCPrice = 0;
  bool public noPending = true;
  uint256 public averageAUX;
  uint256 public averageAUSC;
  uint256 public lastUpdate;
  uint256 public frequency = 1 hours;
  uint256 public counter = 0;
  uint256 public epoch = 1;
  address public treasury;

  uint256 public lastRebase = 0;
  uint256 public constant REBASE_DELAY = 24 hours;

  constructor (address token, address _treasury) public {
    ausc = token;
    treasury = _treasury;
    lastRebase = block.timestamp;
  }

  function checkRebase() external {
    // ausc ensures that we do not have smart contracts rebasing
    require (msg.sender == address(ausc), "only through ausc");
    rebase();
    recordPrice();
  }

  function recordPrice() public {
    if (msg.sender != tx.origin && msg.sender != address(ausc)) {
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

    if (noPending) {
      // we start recording with 1 hour delay
      pendingAUXPrice = priceAUX;
      pendingAUSCPrice = priceAUSC;
      noPending = false;
    } else if (counter < WINDOW_SIZE) {
      // still in the warming up phase
      averageAUX = averageAUX.mul(counter).add(pendingAUXPrice).div(counter.add(1));
      averageAUSC = averageAUSC.mul(counter).add(pendingAUSCPrice).div(counter.add(1));
      pricesAUX[counter] = pendingAUXPrice;
      pricesAUSC[counter] = pendingAUSCPrice;
      pendingAUXPrice = priceAUX;
      pendingAUSCPrice = priceAUSC;
      counter++;
    } else {
      uint256 index = counter % WINDOW_SIZE;
      averageAUX = averageAUX.mul(WINDOW_SIZE).sub(pricesAUX[index]).add(pendingAUXPrice).div(WINDOW_SIZE);
      averageAUSC = averageAUSC.mul(WINDOW_SIZE).sub(pricesAUSC[index]).add(pendingAUSCPrice).div(WINDOW_SIZE);
      pricesAUX[index] = pendingAUXPrice;
      pricesAUSC[index] = pendingAUSCPrice;
      pendingAUXPrice = priceAUX;
      pendingAUSCPrice = priceAUSC;
      counter++;
    }
  }

  function rebase() public {
    if (lastRebase.add(REBASE_DELAY) > block.timestamp) {
      // do not rebase more than once per day
      return;
    }

    // only rebase if there is a 5% difference between the price of AUX and AUSC
    uint256 highThreshold = averageAUX.mul(105).div(100);
    uint256 lowThreshold = averageAUX.mul(95).div(100);

    if (averageAUSC > highThreshold) {
      // AUSC is too expensive, this is a positive rebase increasing the supply
      uint256 currentSupply = IERC20(ausc).totalSupply();
      uint256 desiredSupply = currentSupply.mul(averageAUSC).div(averageAUX);
      uint256 treasuryBudget = desiredSupply.sub(currentSupply).mul(10).div(100);
      desiredSupply = desiredSupply.sub(treasuryBudget);

      // Cannot underflow as desiredSupply > currentSupply, the result is positive
      // delta = (desiredSupply / currentSupply) * 100 - 100
      uint256 delta = desiredSupply.mul(BASE).div(currentSupply).sub(BASE);
      IAUSC(ausc).rebase(epoch, delta, true);
      IAUSC(ausc).mint(treasury, treasuryBudget);
      epoch++;
    } else if (averageAUSC < lowThreshold) {
      // AUSC is too cheap, this is a negative rebase decreasing the supply
      uint256 currentSupply = IERC20(ausc).totalSupply();
      uint256 desiredSupply = currentSupply.mul(averageAUSC).div(averageAUX);

      // Cannot overflow as desiredSupply > currentSupply
      // delta = 100 - (desiredSupply / currentSupply) * 100
      uint256 delta = uint256(BASE).sub(desiredSupply.mul(BASE).div(currentSupply));
      IAUSC(ausc).rebase(epoch, delta, false);
      epoch++;
    }
    // else the price is within bounds
  }

  function getPriceAUX() public view returns (uint256);
  function getPriceAUSC() public view returns (uint256);
}
