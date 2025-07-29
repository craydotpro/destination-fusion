// contracts/FunToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import { ERC20, ERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract MockERC20 is ERC20, ERC20Permit {
  uint8 private _customDecimals = 18; // Store custom decimals internally
  uint256 constant initialSupply = 1000000 * (10 ** 18);

  constructor(
    string memory name,
    string memory symbol,
    uint8 decimals_
  ) ERC20(name, symbol) ERC20Permit(name) {
    _customDecimals = decimals_;
  }
  function mint(address to, uint256 amount) public {
    _mint(to, amount);
  }

  function decimals() public view override returns (uint8) {
    return _customDecimals;
  }
}
