// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.17;

/**
 * @title IOrderMixin
 * @notice Interface for order processing logic in the 1inch Limit Order Protocol.
 */

type MakerTraits is uint256;
type TakerTraits is uint256;
type Address is uint256;

interface IOrderMixin {
  struct Order {
    uint256 salt;
    Address maker;
    Address receiver;
    Address makerAsset;
    Address takerAsset;
    uint256 makingAmount;
    uint256 takingAmount;
    MakerTraits makerTraits;
  }
}

struct SwapParams {
  address makerAsset;
  address swapContract;
  bytes swapData;
}