// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import {
  CrayOrder,
  CrayOrders,
  FullFilledOrder,
  FullFillCrayOrderInput,
  InitiateArgs,
  DestinationAction
} from "cray/src/interfaces/CrayStructs.sol";
import { CrayGateway } from "cray/src/CrayGateway.sol";
import { CrayOrderVerifier } from "cray/src/CrayOrderVerifier.sol";
import { CrayOrderLib } from "cray/src/lib/CrayOrderLib.sol";
import { ERC20 } from "solmate/src/tokens/ERC20.sol";
import { SafeTransferLib } from "solmate/src/utils/SafeTransferLib.sol";


struct SwapParams {
  address makerAsset;
  address swapContract;
  bytes swapData;
}
contract FusionDestination is CrayGateway {
  using CrayOrderLib for CrayOrder;
  using SafeTransferLib for ERC20;
  
  constructor(
    CrayOrderVerifier _orderVerifier,
    address _craySigner,
    address _executer
  ) CrayGateway(_orderVerifier, _craySigner, _executer) {}

  function fullFillOrder(
    FullFillCrayOrderInput memory input_,
    bytes calldata craySignature,
    SwapParams calldata swapParams
  ) public {
    bytes32 crayId = input_.order.hash();

    _verify(input_, craySignature);

    if (swapParams.swapData.length > 0) {
      _transferFundsToGateway(input_, swapParams);
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

  function _transferFundsToGateway(
    FullFillCrayOrderInput memory input_,
    SwapParams memory swapParams
  ) internal {
    if (input_.outputAmount < input_.order.output.minAmountOut) revert MinAmountNotMet();
    ERC20(swapParams.makerAsset).safeTransferFrom(msg.sender, address(this), input_.outputAmount);
    // Approve the swap contract to spend the maker asset
    ERC20(swapParams.makerAsset).safeApprove(swapParams.swapContract, input_.outputAmount);
  }
}
