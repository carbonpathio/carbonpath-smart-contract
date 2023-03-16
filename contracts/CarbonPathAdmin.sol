// contracts/CarbonPathAdmin.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./CarbonPathNFT.sol";
import "./CarbonPathToken.sol";

/// @title CarbonPathAdmin
/// @author Bld.ai
/** @notice  a contract that handles different interactions with
CarbonPathToken (CPCO2) and CarbonPathNFT and serves as an admin for
both contracts. Users can buy CPC02 tokens and retire them for a
 certain well.
*/
contract CarbonPathAdmin is AccessControl {
  using SafeERC20 for IERC20;
  using SafeERC20 for CarbonPathToken;

  /// @dev 1000 = 100%, this can support 1 decimal place
  uint256 public constant BASE_PERCENTAGE = 1000;

  /// @notice 5% is of buffer pool tokens goes to a nonProfitAddress
  uint256 public constant NON_PROFIT_PERCENTAGE = 50; // 5%

  /// @notice 1 CPCO2 Token  = 30 cUSD
  uint256 public constant EXCHANGE_RATE = 30;

  bytes32 private constant MINTER_ROLE = keccak256("MINTER_ROLE");

  /// @notice CarbonPathNFT contract that will hold the well NFTs
  CarbonPathNFT public immutable carbonPathNFT;

  /// @notice CPCO2 tokens users can buy/retire
  CarbonPathToken public immutable carbonPathToken;

  /// @notice StableToken (cUSD) used to buy CPCO2 tokens
  IERC20 public immutable stableToken;

  /// @notice Address that will receive a portion of the advanced CPCO2 tokens as fee
  address public cpFeeAddress;

  /// @notice Address that will receive the 95% of the buffer pool CPCO2 tokens
  address public bufferPoolAddress;

  /// @notice Address that will receive the 5% of the buffer pool CPCO2 tokens
  address public nonProfitAddress;

  /// @notice Address that can sell CPCO2 tokens via the contract
  /// @dev Only seller can call "sell" and "withdraw" functions
  address public sellerAddress;

  /// @notice Require that the call came from an admin address.
  /// @dev admin can set addresses and grant roles
  modifier onlyAdmin() {
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Admin: must be an admin");
    _;
  }

  /// @notice Require that the call came from a minter address.
  /// @dev minter can set mint wells and update its tokenURI and metadata
  modifier onlyMinter() {
    require(hasRole(MINTER_ROLE, _msgSender()), "Admin: must be a minter");
    _;
  }

  /// @notice Require that the call came from the seller address.
  /// @dev seller can sell() and withdraw()
  modifier onlySeller() {
    require(_msgSender() == sellerAddress, "Admin: caller is not seller");
    _;
  }

  /// @notice Require the address to be non-zero
  modifier nonZeroAddress(address _address) {
    require(_address != address(0), "Admin: zero address");
    _;
  }

  /// @notice Require the amount to be greater than zero
  modifier nonZeroAmount(uint256 amount) {
    require(amount > 0, "Admin: amount > 0");
    _;
  }

  /// @notice Deploys the smart contract sets all the address
  /// @dev Assigns `_msgSender()` as an admin and a minter
  constructor(
    address _nftContractAddress,
    address _tokenContractAddress,
    address _stableTokenAddress,
    address _cpFeeAddress,
    address _bufferPoolAddress,
    address _nonProfitAddress,
    address _sellerAddress
  )
    nonZeroAddress(_nftContractAddress)
    nonZeroAddress(_tokenContractAddress)
    nonZeroAddress(_stableTokenAddress)
    nonZeroAddress(_cpFeeAddress)
    nonZeroAddress(_bufferPoolAddress)
    nonZeroAddress(_nonProfitAddress)
    nonZeroAddress(_sellerAddress)
  {
    carbonPathNFT = CarbonPathNFT(_nftContractAddress);
    carbonPathToken = CarbonPathToken(_tokenContractAddress);
    stableToken = IERC20(_stableTokenAddress);

    cpFeeAddress = _cpFeeAddress;
    bufferPoolAddress = _bufferPoolAddress;
    nonProfitAddress = _nonProfitAddress;
    sellerAddress = _sellerAddress;

    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _setupRole(MINTER_ROLE, _msgSender());
  }

  /// @notice Grant Minter Role to the address
  /// @dev can only be called by the admin
  /// @param _address The address that will be a minter
  function grantMinter(address _address) external onlyAdmin nonZeroAddress(_address) {
    _grantRole(MINTER_ROLE, _address);
  }

  /// @notice Revoke Minter Role to the address
  /// @dev can only be called by the admin
  /// @param _address The address that will removed as minter
  function revokeMinter(address _address) external onlyAdmin nonZeroAddress(_address) {
    _revokeRole(MINTER_ROLE, _address);
  }

  /// @notice Sets the receiver of the CP Fee
  /// @dev can only be called by the admin
  /// @param _address The address that will be the receiver of the CP Fee
  function setCpFeeAddress(address _address) external onlyAdmin nonZeroAddress(_address) {
    cpFeeAddress = _address;
  }

  /// @notice Sets the receiver of the nonProfitFee
  /// @dev can only be called by the admin
  /// @param _address The address that will be the receiver of the non-profit fee
  function setNonProfitAddress(address _address) external onlyAdmin nonZeroAddress(_address) {
    nonProfitAddress = _address;
  }

  /// @notice Sets the receiver of the buffer pool tokens
  /// @dev can only be called by the admin
  /// @param _address The address that will be the receiver of the buffer pool tokens
  function setBufferPoolAddress(address _address) external onlyAdmin nonZeroAddress(_address) {
    bufferPoolAddress = _address;
  }

  /// @notice Sets the receiver of the buffer pool tokens
  /**
   * @dev Sets the seller address and returns back all tokens that haven't been sold
     Can only be called by an admin
   */
  /// @param _address The address that can sell CPCO2 Tokens
  function setSellerAddress(address _address) external onlyAdmin nonZeroAddress(_address) {
    uint256 balance = carbonPathToken.balanceOf(address(this));
    address oldSellerAddress = sellerAddress;
    sellerAddress = _address;

    if (balance > 0) {
      carbonPathToken.safeTransfer(oldSellerAddress, balance);
    }
  }

  /**
   * @notice Creates a new NFT for `to`.
   * Additionally sets URI/metadata and geoJSON for the NFT.
   * This also handles airdropping of tokens to
   * set recipients
   *
   * CPCO2 Tokens will be received by the following addresses
   * cpFeeAddress will receive advanceAmount * cpFeePercentage
   * operatorAddress will receive advanceAmount * (1 - cpFeePercentage)
   * bufferPoolAddress will receive bufferAmount * .95
   * nonProfitAddress will receive bufferAmount * .05
   *
   */
  /// @dev Can only be called by the minter
  /// @param to address which will receive the NFT
  /// @param advanceAmount number of advanced CPCO2 tokens to be minted
  /// @param cpFeePercentage percentage of advanced CPCO2 tokens to that will be transferred to cpFeeAddress
  /// @param bufferAmount number of buffer pool CPCO2 tokens to be minted
  /// @param operatorAddress address that will be receiving the advanced CPCO2 tokens
  /// @param tokenUri ipfs link for well documents
  /// @param metadata contains well information
  /// @param geoJson a geojson format for the permanence polygon of the well
  function mint(
    address to,
    uint256 advanceAmount,
    uint256 cpFeePercentage,
    uint256 bufferAmount,
    address operatorAddress,
    string memory tokenUri,
    string memory metadata,
    string memory geoJson
  ) external onlyMinter nonZeroAddress(to) nonZeroAddress(operatorAddress) {
    require(cpFeePercentage <= BASE_PERCENTAGE, "Admin: percentage <= 1000");

    carbonPathNFT.mint(to, advanceAmount, bufferAmount, tokenUri, metadata, geoJson);

    uint256 cpFee = _calculateCPFee(advanceAmount, cpFeePercentage);
    uint256 nonProfitFee = _calculateNonProfitFee(bufferAmount);

    //Mint Carbon Path Tokens
    carbonPathToken.mint(address(this), advanceAmount + bufferAmount);

    // Transfer advance amount
    carbonPathToken.safeTransfer(cpFeeAddress, cpFee);
    carbonPathToken.safeTransfer(operatorAddress, advanceAmount - cpFee);

    // Transfer buffer amount
    carbonPathToken.safeTransfer(nonProfitAddress, nonProfitFee);
    carbonPathToken.safeTransfer(bufferPoolAddress, bufferAmount - nonProfitFee);
  }

  /// @notice updates the token URI of a minted token
  /// @dev Can only be called by the minter
  function updateTokenURI(uint256 tokenId, string memory tokenUri) external onlyMinter {
    carbonPathNFT.setTokenURI(tokenId, tokenUri);
  }

  /// @notice updates the metadata of a minted token
  /// @dev Can only be called by the minter
  function updateMetadata(uint256 tokenId, string calldata metadata) external onlyMinter {
    carbonPathNFT.setMetadata(tokenId, metadata);
  }

  /**
   * @notice Retire the CPCO2 token for a well
   * This will also update the retire amount in the NFT Contract
   */
  /// @param tokenId tokenId of the minter well which will be retired to
  /// @param amount amount of CPCO2 tokens to be retired
  function retire(uint256 tokenId, uint256 amount) external nonZeroAmount(amount) {
    require(carbonPathToken.balanceOf(_msgSender()) >= amount, "Admin: not enough balance");

    // Update number of retired EAVS
    carbonPathNFT.updateRetiredEAVs(tokenId, amount);

    //Burn the tokens
    carbonPathToken.burnFrom(_msgSender(), amount);
  }

  /**
   * @notice Transfer CPCO2 Tokens for Selling
   *
   * Since only CarbonPath Wallets are allowed as sellers
   * All CPCO2 Tokens transferred in the contract are considered
   * sellable.
   */
  /// @dev Can only be called by the seller
  /// @param amount amount of CPCO2 tokens to be sold
  function sell(uint256 amount) external onlySeller nonZeroAmount(amount) {
    require(carbonPathToken.balanceOf(_msgSender()) >= amount, "Admin: not enough balance");

    carbonPathToken.safeTransferFrom(_msgSender(), address(this), amount);
  }

  /// @notice Withdraw stored CPCO2 Tokens and remove them as sellable
  /// @dev Can only be called by the seller
  /// @param amount amount of CPCO2 tokens to be withdrawn
  function withdraw(uint256 amount) external onlySeller nonZeroAmount(amount) {
    require(carbonPathToken.balanceOf(address(this)) >= amount, "Admin: not enough balance");

    carbonPathToken.safeTransfer(_msgSender(), amount);
  }

  /**
   * @notice Buy CPCO2 Tokens from the contract
   * This automatically transfer cUSD to the seller address
   */
  /// @param cpAmount amount of CPCO2 tokens to be bought
  function buy(uint256 cpAmount) external nonZeroAmount(cpAmount) {
    require(carbonPathToken.balanceOf(address(this)) >= cpAmount, "Admin: not enough balance");

    uint256 requiredAmount = _calculateStableTokenAmount(cpAmount);
    require(
      stableToken.balanceOf(_msgSender()) >= requiredAmount,
      "Admin: not enough stable token"
    );

    stableToken.safeTransferFrom(_msgSender(), sellerAddress, requiredAmount);
    carbonPathToken.safeTransfer(_msgSender(), cpAmount);
  }

  /// @notice helper function to calculate cpFee
  /// @param amount base amount
  /// @param cpFeePercentage fee percentage
  /// @return cpFee fee based on the cpFeePercentage
  function _calculateCPFee(uint256 amount, uint256 cpFeePercentage) private pure returns (uint256) {
    return (amount * cpFeePercentage) / BASE_PERCENTAGE;
  }

  /// @notice helper function to calculate NonProfitFee (5%)
  /// @param amount base amount
  /// @return nonProfitFee nonprofit fee
  function _calculateNonProfitFee(uint256 amount) private pure returns (uint256) {
    return (amount * NON_PROFIT_PERCENTAGE) / BASE_PERCENTAGE;
  }

  /// @notice helper function to calculate cUSD needed for CPCO2 tokens
  /// @param cpAmount amount of CPCO2 tokens
  /// @return cUSDAmount cUSD worth of cpAmount
  function _calculateStableTokenAmount(uint256 cpAmount) private pure returns (uint256) {
    return cpAmount * EXCHANGE_RATE;
  }
}
