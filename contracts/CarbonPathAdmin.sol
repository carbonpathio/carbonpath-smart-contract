// contracts/CarbonpathAdmin.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./CarbonPathNFT.sol";
import "./CarbonPathToken.sol";

/**
 * @title Carbon Path Admin
 */
contract CarbonPathAdmin is Ownable, AccessControl, ReentrancyGuard {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;
  using SafeERC20 for CarbonPathToken;

  CarbonPathNFT public immutable carbonPathNFT;
  CarbonPathToken public immutable carbonPathToken;
  IERC20 public immutable stableToken;

  address public cpFeeAddress;
  address public bufferPoolAddress;
  address public nonProfitAddress;
  address public sellerAddress;

  mapping(address => uint256) private sellerTokensAmount; // Keep track of the current amount a wallet is selling

  uint256 public constant BASE_PERCENTAGE = 1000; // 100%, to support 1 decimal place
  uint256 public constant NON_PROFIT_PERCENTAGE = 50; // 5%
  uint256 public constant EXCHANGE_RATE = 30;

  bytes32 private constant MINTER_ROLE = keccak256("MINTER_ROLE");

  constructor(
    address _nftContractAddress,
    address _tokenContractAddress,
    address _stableTokenAddress
  ) {
    require(_nftContractAddress != address(0), "CarbonPathAdmin: zero address for nft");
    require(_tokenContractAddress != address(0), "CarbonPathAdmin: zero address for token");
    require(_stableTokenAddress != address(0), "CarbonPathAdmin: zero address for stable token");

    carbonPathNFT = CarbonPathNFT(_nftContractAddress);
    carbonPathToken = CarbonPathToken(_tokenContractAddress);
    stableToken = IERC20(_stableTokenAddress);

    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _setupRole(MINTER_ROLE, _msgSender());
    sellerAddress = _msgSender();
  }

  function _calculateCPFee(uint256 amount, uint256 cpFeePercentage) private pure returns (uint256) {
    return (amount * cpFeePercentage) / BASE_PERCENTAGE;
  }

  function _calculateNonProfitFee(uint256 amount) private pure returns (uint256) {
    return (amount * NON_PROFIT_PERCENTAGE) / BASE_PERCENTAGE;
  }

  function _calculateStableTokenAmount(uint256 cpAmount) private pure returns (uint256) {
    return cpAmount * EXCHANGE_RATE;
  }

  /**
   * @dev Require that the call came from the seller address.
   */
  modifier onlySeller() {
    require(_msgSender() == sellerAddress, "CarbonPathAdmin: caller is not the seller");
    _;
  }

  /**
   * @dev Grant Minter Role to the address
   *
   * Requirements:
   * - the caller must have the `DEFAULT_ADMIN_ROLE`.
   */
  function grantMinter(address account) public {
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "CarbonPathAdmin: must be an admin");
    _grantRole(MINTER_ROLE, account);
  }

  /**
   * @dev Revoke Minter Role to the address
   *
   * Requirements:
   * - the caller must have the `DEFAULT_ADMIN_ROLE`.
   */
  function revokeMinter(address account) public {
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "CarbonPathAdmin: must be an admin");
    _revokeRole(MINTER_ROLE, account);
  }

  /**
   * @dev Sets the receiver of CP Fee
   *
   * Requirements:
   * - the caller must have the `DEFAULT_ADMIN_ROLE`.
   */
  function setCpFeeAddress(address _address) public {
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "CarbonPathAdmin: must have admin role");
    require(_address != address(0), "CarbonPathAdmin: zero address");
    cpFeeAddress = _address;
  }

  /**
   * @dev Sets the receiver of Non Profit Percentage
   *
   * Requirements:
   * - the caller must have the `DEFAULT_ADMIN_ROLE`.
   */
  function setNonProfitAddress(address _address) public {
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "CarbonPathAdmin: must have admin role");
    require(_address != address(0), "CarbonPathAdmin: zero address");
    nonProfitAddress = _address;
  }

  /**
   * @dev Sets the receiver of Buffer Pool Tokens
   *
   * Requirements:
   * - the caller must have the `DEFAULT_ADMIN_ROLE`.
   */
  function setBufferPoolAddress(address _address) public {
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "CarbonPathAdmin: must have admin role");
    require(_address != address(0), "CarbonPathAdmin: zero address");
    bufferPoolAddress = _address;
  }

  /**
   * @dev Sets the seller address and returns back all tokens that haven't been sold
   *
   * Requirements:
   * - the caller must have the `DEFAULT_ADMIN_ROLE`.
   */
  function setSellerAddress(address _address) public nonReentrant {
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "CarbonPathAdmin: must have admin role");
    require(_address != address(0), "CarbonPathAdmin: zero address");
    uint256 oldSellerAmount = sellerTokensAmount[sellerAddress];
    uint256 balance = carbonPathToken.balanceOf(address(this));

    if (balance > 0 && oldSellerAmount > 0) {
      if (balance < oldSellerAmount) {
        carbonPathToken.safeTransfer(sellerAddress, balance);
      } else {
        carbonPathToken.safeTransfer(sellerAddress, oldSellerAmount);
      }
    }
    sellerTokensAmount[sellerAddress] = 0;
    sellerTokensAmount[_address] = 0;
    sellerAddress = _address;
  }

  /**
   * @dev Creates a new token for `to`.
   * Additionally sets URI for the token.
   *
   * Requirements:
   * - the caller must have the `MINTER_ROLE`.
   */
  function mint(
    address to,
    uint256 advanceAmount,
    uint256 cpFeePercentage,
    uint256 bufferAmount,
    address operatorAddress,
    string memory tokenUri,
    string memory metadata,
    string memory geoJson
  ) public virtual nonReentrant {
    require(hasRole(MINTER_ROLE, _msgSender()), "CarbonPathAdmin: must have minter role to mint");
    require(cpFeePercentage <= BASE_PERCENTAGE, "CarbonPathAdmin: Percentage must not exceed 100%");
    require(operatorAddress != address(0), "CarbonPathAdmin: zero address for operator");
    carbonPathNFT.mint(to, advanceAmount, bufferAmount, tokenUri, metadata, geoJson);

    uint256 cpFee = _calculateCPFee(advanceAmount, cpFeePercentage);
    uint256 nonProfitFee = _calculateNonProfitFee(bufferAmount);

    //Mint Carbon Path Tokens
    carbonPathToken.mint(address(this), advanceAmount + bufferAmount);

    // Transfer advance amount
    carbonPathToken.safeTransfer(cpFeeAddress, cpFee);
    carbonPathToken.safeTransfer(operatorAddress, advanceAmount - cpFee);

    // Tranfer buffer amount
    carbonPathToken.safeTransfer(nonProfitAddress, nonProfitFee);
    carbonPathToken.safeTransfer(bufferPoolAddress, bufferAmount - nonProfitFee);
  }

  /**
   * @dev updates the token URI of a minted token
   *
   * Requirements:
   * - the caller must have the `MINTER_ROLE`.
   */
  function updateTokenURI(uint256 tokenId, string memory tokenUri) public virtual nonReentrant {
    require(
      hasRole(MINTER_ROLE, _msgSender()),
      "CarbonPathAdmin: must have minter role to update URI"
    );

    carbonPathNFT.setTokenURI(tokenId, tokenUri);
  }

  /**
   * @dev Retire the carbon token for a well
   *
   */
  function retire(uint256 tokenId, uint256 amount) public virtual nonReentrant {
    require(amount > 0, "CarbonPathAdmin: retired amount must be at least 1");
    require(
      carbonPathToken.balanceOf(_msgSender()) >= amount,
      "CarbonPathAdmin: not enough balance"
    );

    // Update number of retired EAVS
    carbonPathNFT.updateRetiredEAVs(tokenId, amount);

    //Burn the tokens
    carbonPathToken.burnFrom(_msgSender(), amount);
  }

  /**
   * @dev Transfer CarbonPathToken for Selling
   *
   * Requirements:
   * - the caller must be the seller address.
   */
  function sell(uint256 amount) public virtual onlySeller nonReentrant {
    require(amount > 0, "CarbonPathAdmin: sell amount must be at least 1");
    require(
      carbonPathToken.balanceOf(_msgSender()) >= amount,
      "CarbonPathAdmin: not enough balance"
    );

    sellerTokensAmount[sellerAddress] += amount;
    carbonPathToken.safeTransferFrom(_msgSender(), address(this), amount);
  }

  /**
   * @dev Withdraw stored CarbonPathTokens
   *
   * Requirements:
   * - the caller must be the seller address.
   */
  function withdraw(uint256 amount) public virtual onlySeller nonReentrant {
    require(amount > 0, "CarbonPathAdmin: withdraw amount must be at least 1");
    require(
      carbonPathToken.balanceOf(address(this)) >= amount,
      "CarbonPathAdmin: not enough balance"
    );

    sellerTokensAmount[sellerAddress] -= amount;
    carbonPathToken.safeTransfer(_msgSender(), amount);
  }

  /**
   * @dev Buy coins for selling
   *
   */
  function buy(uint256 cpAmount) public virtual nonReentrant {
    require(cpAmount > 0, "CarbonPathAdmin: buy amount must be at least 1");
    require(
      carbonPathToken.balanceOf(address(this)) >= cpAmount,
      "CarbonPathAdmin: not enough balance"
    );

    uint256 requiredAmount = _calculateStableTokenAmount(cpAmount);
    require(
      stableToken.balanceOf(_msgSender()) >= requiredAmount,
      "CarbonPathAdmin: not enough stable token"
    );

    sellerTokensAmount[sellerAddress] -= cpAmount;

    stableToken.safeTransferFrom(_msgSender(), sellerAddress, requiredAmount);
    carbonPathToken.safeTransfer(_msgSender(), cpAmount);
  }
}
