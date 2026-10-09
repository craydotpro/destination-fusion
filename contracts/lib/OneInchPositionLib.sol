// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
import {AdvancePosition} from "../interfaces/IPosition.sol";

library OneInchPositionLib {
    bytes32 private constant ADVANCE_POSITION_TYPEHASH =
        keccak256(
            "AdvancePosition(address maker,address makerAsset,uint256 makerAmount,address takerAsset,uint256 triggerPrice,uint256 deadline,bool isStopLoss)"
        );

    function hash(AdvancePosition calldata pos) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    ADVANCE_POSITION_TYPEHASH,
                    pos.maker,
                    pos.makerAsset,
                    pos.makerAmount,
                    pos.takerAsset,
                    pos.triggerPrice,
                    pos.deadline,
                    pos.isStopLoss
                )
            );
    }
}