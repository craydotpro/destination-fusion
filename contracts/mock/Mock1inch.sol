// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import { ERC20 } from "solmate/src/tokens/ERC20.sol";
import { IOrderMixin } from "../interfaces/ISwap.sol";
/// @dev A dummy ERC20 token with a mint function for testing.
contract DummyERC20 is ERC20 {
  constructor() ERC20("Dummy", "DUM", 18) {}

  function mint(address to, uint256 amount) public {
    // solmate’s _mint is internal; we can call it here.
    _mint(to, amount);
  }
}

contract Mock1Inch {
  address public outputToken;
  address public solver;
  uint256 public amount;

  constructor(address _outputToken, uint256 _amountOut, address _solver) {
    outputToken = _outputToken;
    solver = _solver;
    amount = _amountOut;
  }

  event SwapCalled(address indexed caller, bytes data);
  event SwapFailed(address indexed caller);

  function fillOrderArgs(
    IOrderMixin.Order calldata order,
    bytes32 r,
    bytes32 vs,
    uint256 amount,
    bytes calldata traits,
    bytes calldata args
  ) external payable returns (uint256, uint256, bytes32) {
    emit SwapCalled(solver, msg.data);
    // ERC20(outputToken).transfer(solver, amount);
    return (1, 2, keccak256("mockOrder"));
  }

  fallback() external payable {
    // fallback to handle raw calldata
    // uint256 mockAmountOut = 1000 * 1e6;
    // ERC20(outputToken).transfer(msg.sender, mockAmountOut);
    revert("Mock1Inch: Swap fallback called unexpectedly");
  }

  receive() external payable {}
}
