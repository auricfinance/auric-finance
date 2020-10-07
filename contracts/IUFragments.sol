pragma solidity 0.5.16;

interface IUFragments {
  function rebase(uint256 epoch, uint256 supplyDelta, bool positive) external;
}
