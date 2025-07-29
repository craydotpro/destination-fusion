// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.17;

struct AdvancePosition {
  address maker;
  address makerAsset;
  uint256 makerAmount;
  address takerAsset;
  uint256 triggerPrice;
  uint256 deadline;
  bool isStopLoss;
  address swapContract;
  bytes swapData;
}
