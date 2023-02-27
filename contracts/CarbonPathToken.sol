// contracts/CarbonPathToken.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title CarbonPathToken
/// @author Bld.ai
/** @notice ERC20 mintable and burnable token that represents
locked carbon emission.
*/
/// @dev Based on the ERC20 contract of OpenZeppelin
contract CarbonPathToken is AccessControl, ERC20 {
  bytes32 private constant MINTER_ROLE = keccak256("MINTER_ROLE");

  /// @notice Require that the call came from an admin address.
  /// @dev admin can grant minter roles
  modifier onlyAdmin() {
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Token: must be an admin");
    _;
  }

  /// @notice Require that the call came from a minter address.
  /// @dev minter can set mint and burn tokens
  modifier onlyMinter() {
    require(hasRole(MINTER_ROLE, _msgSender()), "Token: must be a minter");
    _;
  }

  /// @notice Require the address to be non-zero
  modifier nonZeroAddress(address _address) {
    require(_address != address(0), "Token: zero address");
    _;
  }

  /// @notice Deploys the smart contract setting the name and symbol of the ERC20 Token
  /// @dev Assigns `_msgSender()` as an admin and a minter
  constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {
    // Setup initial permission for contract deployer
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _grantRole(MINTER_ROLE, _msgSender());
  }

  /// @notice Grant Minter Role to the address
  /// @dev can only be called by the admin
  /// @param _address The address that will be a minter
  function grantMinter(address _address) external nonZeroAddress(_address) onlyAdmin {
    _grantRole(MINTER_ROLE, _address);
  }

  /// @notice Revoke Minter Role to the address
  /// @dev can only be called by the admin
  /// @param _address The address that will removed as minter
  function revokeMinter(address _address) external nonZeroAddress(_address) onlyAdmin {
    _revokeRole(MINTER_ROLE, _address);
  }

  /// @notice Mints Carbon Path Tokens.
  /// @dev can only be called by the minter
  /// @param _address address that will receive the minted tokens
  /// @param amount amount of tokens to be minted
  function mint(address _address, uint256 amount) external onlyMinter {
    _mint(_address, amount);
  }

  /// @notice Destroys `amount` tokens from the caller
  /// @dev  See {ERC20-_burn}
  /// @param amount amount of tokens to be destroyed
  function burn(uint256 amount) external onlyMinter {
    _burn(_msgSender(), amount);
  }

  /// @notice Destroys `amount` tokens from `_address`, deducting from the caller's allowance
  /// @dev  See {ERC20-_burn} and {ERC20-allowance}.
  /// @param _address address which the tokens will be burned from
  /// @param amount amount of tokens to be destroyed
  function burnFrom(address _address, uint256 amount) external onlyMinter {
    _spendAllowance(_address, _msgSender(), amount);
    _burn(_address, amount);
  }
}
