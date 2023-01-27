// contracts/test/MockStableToken.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title A mock StableToken for testing.
 */
contract MockStableToken is ERC20 {
  constructor() ERC20("test", "$TEST") {
    // add initial supply
    _mint(_msgSender(), 30000000000000000000000);
  }
}
