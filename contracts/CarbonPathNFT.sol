// contracts/CarbonPathNFT.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Carbon Path NFT
 */
contract CarbonPathNFT is Ownable, ERC721URIStorage, ReentrancyGuard {
  using SafeMath for uint256;
  using Counters for Counters.Counter;

  // Contract address of the Admin contract that can access this token
  address private _adminAddress;

  struct EAVTokens {
    uint256 advanceEAVs;
    uint256 bufferPoolEAVs;
    uint256 retiredEAVs;
  }

  Counters.Counter private _tokenIdCounter;

  mapping(uint256 => string) private geoJson; // mapping of tokenId to geoJson
  mapping(uint256 => string) private metadata; // mapping of tokenId to metadata
  mapping(uint256 => EAVTokens) private eavTokens; // mapping of tokenId to number of EAVTokens

  constructor(address adminAddress) ERC721("Carbon Path NFT", "CPNFT") {
    require(adminAddress != address(0), "CarbonPathNFT: zero address for admin");
    _adminAddress = adminAddress;
  }

  /**
   * @dev Require that the call came from the admin address.
   */
  modifier onlyAdmin() {
    require(_msgSender() == _adminAddress, "CarbonPathNFT: caller is not the admin");
    _;
  }

  /**
   * @dev Returns whether `address` is allowed to manage `tokenId`.
   *
   * Requirements:
   * - `tokenId` must exist.
   */
  function _isAdminOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
    return (_isApprovedOrOwner(spender, tokenId) || spender == _adminAddress);
  }

  /**
   * @dev Returns the market address set via {setAdminAddress}.
   *
   */
  function getAdminAddress() public view returns (address adminAddress) {
    return _adminAddress;
  }

  /**
   * @dev Returns the number of advance EAVs in the tokenId
   *
   */
  function getAdvancedEAVs(uint256 tokenId) public view returns (uint256) {
    return eavTokens[tokenId].advanceEAVs;
  }

  /**
   * @dev Returns the number of buffer pool EAVs in the tokenId
   *
   */
  function getBufferPoolEAVs(uint256 tokenId) public view returns (uint256) {
    return eavTokens[tokenId].bufferPoolEAVs;
  }

  /**
   * @dev Returns the number of retired EAVs in the tokenId
   *
   */
  function getRetiredEAVs(uint256 tokenId) public view returns (uint256) {
    return eavTokens[tokenId].retiredEAVs;
  }

  /**
   * @dev Returns the geoJSON stored in the tokenId
   *
   */
  function getGeoJson(uint256 tokenId) public view returns (string memory) {
    return geoJson[tokenId];
  }

  /**
   * @dev Returns the metadata stored in the tokenId
   *
   */
  function getMetadata(uint256 tokenId) public view returns (string memory) {
    return metadata[tokenId];
  }

  /**
   * @dev Set a new admin address.
   *
   * Requirements:
   * - the caller must be the owner.
   */
  function setAdminAddress(address _address) public onlyOwner {
    require(_address != address(0), "CarbonPathNFT: zero address for admin");

    _adminAddress = _address;
  }

  /**
   * @dev Set the metadata for a tokenId.
   *
   * Requirements:
   * - the caller must be the owner or an admin
   */
  function setMetadata(uint256 tokenId, string calldata _metadata) external {
    require(_isAdminOrOwner(_msgSender(), tokenId), "CarbonPathNFT: must be an admin or an owner");
    metadata[tokenId] = _metadata;
  }

  /**
   * @dev Set the tokenURI for a tokenId.
   *
   * Requirements:
   * - the caller must be the owner.
   */
  function setTokenURI(uint256 tokenId, string calldata tokenUri) external {
    require(_isAdminOrOwner(_msgSender(), tokenId), "CarbonPathNFT: must be an admin or an owner");
    require(bytes(tokenUri).length > 0, "CarbonPathNFT: uri should be set");
    super._setTokenURI(tokenId, tokenUri);
  }

  /**
   * @dev Creates a new NFT for `to`.
   * Additionally sets URI, metadata, geoJSON for the token
   * Stores the number of advanced and buffer pool EAVs
   *
   * Requirements:
   * - Only the admin address can mint
   */
  function mint(
    address to,
    uint256 advanceAmount,
    uint256 bufferAmount,
    string memory tokenUri,
    string memory _metadata,
    string memory _geoJson
  ) public virtual nonReentrant onlyAdmin {
    require(bytes(tokenUri).length > 0, "CarbonPathNFT: uri should be set");
    uint256 tokenId = _tokenIdCounter.current();
    EAVTokens storage eavs = eavTokens[tokenId];

    //set metadata , geoJSON and number of EAVs
    metadata[tokenId] = _metadata;
    geoJson[tokenId] = _geoJson;

    eavs.advanceEAVs = advanceAmount;
    eavs.bufferPoolEAVs = bufferAmount;
    eavs.retiredEAVs = 0;

    _tokenIdCounter.increment();
    super._safeMint(to, tokenId);
    super._setTokenURI(tokenId, tokenUri);
  }

  /**
   * @dev update the number of RetiredEAVs
   *
   * Requirements:
   * - Only the admin address can update
   */
  function updateRetiredEAVs(uint256 tokenId, uint256 retiredAmount) public virtual onlyAdmin {
    EAVTokens storage eavs = eavTokens[tokenId];
    uint256 totalRetired = eavs.retiredEAVs + retiredAmount;

    require(
      eavs.advanceEAVs + eavs.bufferPoolEAVs >= totalRetired,
      "CarbonPathNFT: retired amount will exceed minted amount"
    );

    eavs.retiredEAVs = totalRetired;
  }
}
