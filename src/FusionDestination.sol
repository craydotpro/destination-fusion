// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { ERC20 } from "solmate/src/tokens/ERC20.sol";
import { SafeTransferLib } from "solmate/src/utils/SafeTransferLib.sol";

import { CrayOrder, CrayOrders, FullFilledOrder, FullFillCrayOrderInput, InitiateArgs, DestinationAction } from "cray/src/interfaces/CrayStructs.sol";
import { CrayGateway } from "cray/src/CrayGateway.sol";
import { CrayOrderVerifier } from "cray/src/CrayOrderVerifier.sol";
import { CrayOrderLib } from "cray/src/lib/CrayOrderLib.sol";

import { OneInchPositionLib } from "./lib/OneInchPositionLib.sol";

import { SwapParams } from "./interfaces/ISwap.sol";
import { AdvancePosition } from "./interfaces/IPosition.sol";

contract FusionDestination is CrayGateway, ReentrancyGuard {
  using SafeTransferLib for ERC20;
  using ECDSA for bytes32;
  using CrayOrderLib for CrayOrder;
  using OneInchPositionLib for AdvancePosition;

  bytes32 private constant ADVANCE_POSITION_TYPEHASH =
    keccak256(
      "AdvancePosition(address maker,address makerAsset,uint256 makerAmount,address takerAsset,uint256 triggerPrice,uint256 deadline,bool isStopLoss)"
    );

  bytes32 private immutable _DOMAIN_SEPARATOR;

  mapping(bytes32 => bool) public executedAdvancePositions;

  event AdvancePositionExecuted(bytes32 id);

  constructor(
    CrayOrderVerifier _orderVerifier,
    address _craySigner,
    address _executer
  ) CrayGateway(_orderVerifier, _craySigner, _executer) {
    _DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version)"),
                keccak256(bytes("AdvancePosition")),
                keccak256(bytes("1"))
            )
        );
  }

  function fullFillOrder(
    FullFillCrayOrderInput memory input_,
    bytes calldata craySignature,
    SwapParams calldata swapParams
  ) public {
    bytes32 crayId = input_.order.hash();

    _verify(input_, craySignature);

    if (swapParams.swapData.length > 0) {
      _transferFundsToGatewayAndApprove(
        msg.sender,
        swapParams.makerAsset,
        input_.outputAmount,
        swapParams.swapContract
      );
      // Handle the swap using the provided swap contract and data
      _handleSwap(swapParams.swapContract, swapParams.swapData);
    } else {
      _transferFundsFromSolver(input_);
    }
    _markOrderFullFilled(input_);
    if (input_.order.action.gasLimit > 0) {
      _executeAction(input_);
    }
    emit OrderFullFilled(crayId);
  }

  // SL TP
  function executeAdvancePositions(
    AdvancePosition calldata advancePosition,
    bytes calldata userSignature
  ) public nonReentrant {
    bytes32 id = advancePosition.hash();
    require(!executedAdvancePositions[id], "Position already Executed");
    require(block.timestamp <= advancePosition.deadline, "Position expired");

    _verifyAdvancePosition(advancePosition, userSignature);
    // do we check expiry??
    // check current price of token from oracle
    // transfer funds to gateway
    _transferFundsToGatewayAndApprove(
      advancePosition.maker,
      advancePosition.makerAsset,
      advancePosition.makerAmount,
      advancePosition.swapContract
    );
    _handleSwap(advancePosition.swapContract, advancePosition.swapData);
    executedAdvancePositions[id] = true;
    emit AdvancePositionExecuted(id);
  }

  function _handleSwap(address to1inch, bytes calldata swapData) internal {
    (bool success, bytes memory returnData) = to1inch.call(swapData);

    if (!success) {
      if (returnData.length > 0) {
        // Try to extract and bubble up the revert reason
        assembly {
          let returndata_size := mload(returnData)
          revert(add(32, returnData), returndata_size)
        }
      } else {
        revert("Swap failed silently");
      }
    }
  }

  function _transferFundsToGatewayAndApprove(
    address maker,
    address makerAsset,
    uint256 amount,
    address swapContract
  ) internal {
    ERC20(makerAsset).safeTransferFrom(maker, address(this), amount);
    // Approve the swap contract to spend the maker asset
    if (ERC20(makerAsset).allowance(address(this), swapContract) == 0) {
      ERC20(makerAsset).safeApprove(swapContract, type(uint256).max);
    }
  }

  function _verifyAdvancePosition(
    AdvancePosition calldata pos,
    bytes calldata signature
  ) internal view {
    bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _DOMAIN_SEPARATOR, pos.hash()));
    require(digest.recover(signature) == pos.maker, "Invalid signature");
  }
}
