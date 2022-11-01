// contracts/CarbonPathToken.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title CarbonPath Token
 */
contract CarbonPathToken is AccessControl, ERC20 {
  bytes32 private constant MINTER_ROLE = keccak256("MINTER_ROLE");

  constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {
    // Setup initial permission for contract deployer
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _grantRole(MINTER_ROLE, _msgSender());
  }

  /**
   * @dev Grant Minter Role to the address
   *
   * Requirements:
   * - the caller must have the `DEFAULT_ADMIN_ROLE`.
   */
  function grantMinter(address account) public {
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "CarbonPathToken: must be an admin");
    _grantRole(MINTER_ROLE, account);
  }

  /**
   * @dev Revoke Minter Role to the address
   *
   * Requirements:
   * - the caller must have the `DEFAULT_ADMIN_ROLE`.
   */
  function revokeMinter(address account) public {
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "CarbonPathToken: must be an admin");
    _revokeRole(MINTER_ROLE, account);
  }

  /**
   * @dev Mints Carbon Path Tokens.
   *
   * Requirements:
   * - the caller must have the `MINTER_ROLE`.
   */
  function mint(address account, uint256 amount) public {
    require(hasRole(MINTER_ROLE, _msgSender()), "CarbonPathToken: must have minter role to mint");
    _mint(account, amount);
  }

  /**
   * @dev Destroys `amount` tokens from the caller.
   *
   * See {ERC20-_burn}.
   *
   * Requirements:
   *
   * - the caller must have `MINTER_ROLE`
   */
  function burn(uint256 amount) public virtual {
    require(hasRole(MINTER_ROLE, _msgSender()), "CarbonPathToken: must have minter role to burn");
    _burn(_msgSender(), amount);
  }

  /**
   * @dev Destroys `amount` tokens from `account`, deducting from the caller's
   * allowance.
   *
   * See {ERC20-_burn} and {ERC20-allowance}.
   *
   * Requirements:
   *
   * - the caller must have allowance for ``accounts``'s tokens of at least
   * `amount`.
   * - the caller must have `MINTER_ROLE`
   */
  function burnFrom(address account, uint256 amount) public virtual {
    require(hasRole(MINTER_ROLE, _msgSender()), "CarbonPathToken: must have minter role to burn");
    _spendAllowance(account, _msgSender(), amount);
    _burn(account, amount);
  }
}
