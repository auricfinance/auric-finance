pragma solidity 0.5.16;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IAUSC.sol";

contract BasicRebaser {

  using SafeMath for uint256;

  event Updated(uint256 xau, uint256 ausc);
  event NoUpdateXAU();
  event NoUpdateAUSC();

  uint256 public constant BASE = 1e18;
  uint256 public constant WINDOW_SIZE = 12;

  address public ausc;
  uint256[] public pricesXAU = new uint256[](12);
  uint256[] public pricesAUSC = new uint256[](12);
  uint256 public pendingXAUPrice = 0;
  uint256 public pendingAUSCPrice = 0;
  bool public noPending = true;
  uint256 public averageXAU;
  uint256 public averageAUSC;
  uint256 public lastUpdate;
  uint256 public frequency = 1 hours;
  uint256 public counter = 0;
  uint256 public epoch = 1;
  address public secondaryPool;

  uint256 public lastRebase = 0;
  uint256 public constant REBASE_DELAY = 24 hours;

  constructor (address token, address _secondaryPool) public {
    ausc = token;
    secondaryPool = _secondaryPool;
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

    (bool successXAU, uint256 priceXAU) = getPriceXAU();
    (bool successAUSC, uint256 priceAUSC) = getPriceAUSC();
    if (!successAUSC) {
      // price of AUSC was not returned properly
      emit NoUpdateAUSC();
      return;
    }
    if (!successXAU) {
      // price of XAU was not returned properly
      emit NoUpdateXAU();
      return;
    }
    lastUpdate = block.timestamp;

    if (noPending) {
      // we start recording with 1 hour delay
      pendingXAUPrice = priceXAU;
      pendingAUSCPrice = priceAUSC;
      noPending = false;
    } else if (counter < WINDOW_SIZE) {
      // still in the warming up phase
      averageXAU = averageXAU.mul(counter).add(pendingXAUPrice).div(counter.add(1));
      averageAUSC = averageAUSC.mul(counter).add(pendingAUSCPrice).div(counter.add(1));
      pricesXAU[counter] = pendingXAUPrice;
      pricesAUSC[counter] = pendingAUSCPrice;
      pendingXAUPrice = priceXAU;
      pendingAUSCPrice = priceAUSC;
      counter++;
    } else {
      uint256 index = counter % WINDOW_SIZE;
      averageXAU = averageXAU.mul(WINDOW_SIZE).sub(pricesXAU[index]).add(pendingXAUPrice).div(WINDOW_SIZE);
      averageAUSC = averageAUSC.mul(WINDOW_SIZE).sub(pricesAUSC[index]).add(pendingAUSCPrice).div(WINDOW_SIZE);
      pricesXAU[index] = pendingXAUPrice;
      pricesAUSC[index] = pendingAUSCPrice;
      pendingXAUPrice = priceXAU;
      pendingAUSCPrice = priceAUSC;
      counter++;
    }
    emit Updated(pendingXAUPrice, pendingAUSCPrice);
  }

  function rebase() public {
    if (lastRebase.add(REBASE_DELAY) > block.timestamp) {
      // do not rebase more than once per day
      return;
    }

    // only rebase if there is a 5% difference between the price of XAU and AUSC
    uint256 highThreshold = averageXAU.mul(105).div(100);
    uint256 lowThreshold = averageXAU.mul(95).div(100);

    if (averageAUSC > highThreshold) {
      // AUSC is too expensive, this is a positive rebase increasing the supply
      uint256 currentSupply = IERC20(ausc).totalSupply();
      uint256 desiredSupply = currentSupply.mul(averageAUSC).div(averageXAU);
      uint256 secondaryPoolBudget = desiredSupply.sub(currentSupply).mul(10).div(100);
      desiredSupply = desiredSupply.sub(secondaryPoolBudget);

      // Cannot underflow as desiredSupply > currentSupply, the result is positive
      // delta = (desiredSupply / currentSupply) * 100 - 100
      uint256 delta = desiredSupply.mul(BASE).div(currentSupply).sub(BASE);
      IAUSC(ausc).rebase(epoch, delta, true);
      IAUSC(ausc).mint(secondaryPool, secondaryPoolBudget);
      epoch++;
    } else if (averageAUSC < lowThreshold) {
      // AUSC is too cheap, this is a negative rebase decreasing the supply
      uint256 currentSupply = IERC20(ausc).totalSupply();
      uint256 desiredSupply = currentSupply.mul(averageAUSC).div(averageXAU);

      // Cannot overflow as desiredSupply > currentSupply
      // delta = 100 - (desiredSupply / currentSupply) * 100
      uint256 delta = uint256(BASE).sub(desiredSupply.mul(BASE).div(currentSupply));
      IAUSC(ausc).rebase(epoch, delta, false);
      epoch++;
    }
    // else the price is within bounds
  }

  function getPriceXAU() public view returns (bool, uint256);
  function getPriceAUSC() public view returns (bool, uint256);
}
