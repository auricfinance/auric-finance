pragma solidity 0.5.16;

interface IUFragments {
  function rebase(uint256 epoch, int256 supplyDelta) external;
}
