// contracts/CarbonPathNFT.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/// @title CarbonPathNFT
/// @author Bld.ai
/** @notice  - ERC721 token that bounds to a well. Contains the
geolocation of a well and additional metadata.
*/
/// @dev Based on the ERC721 contract of OpenZeppelin
contract CarbonPathNFT is Ownable, ERC721URIStorage {
  using Counters for Counters.Counter;
  Counters.Counter private _tokenIdCounter;

  /// @notice data structure to kept track of the tokens for each well
  struct EAVTokens {
    uint256 advanceEAVs;
    uint256 bufferPoolEAVs;
    uint256 retiredEAVs;
  }

  /// @notice Contract address of the Admin contract that have access to this NFT
  address private _adminAddress;

  /// @notice Mapping of the geoJson for each token
  mapping(uint256 => string) private geoJson;

  /// @notice Mapping of the metadata for each token
  mapping(uint256 => string) private metadata;

  /// @notice Mapping of the EAVToken data for each token
  mapping(uint256 => EAVTokens) private eavTokens;

  /// @notice emits when admin address is updated
  event UpdateAdminAddress(address adminAddress);

  /// @notice Require that the call came from an admin address.
  /// @dev admin can mint and update nfts
  modifier onlyAdmin() {
    require(_msgSender() == _adminAddress, "NFT: caller is not the admin");
    _;
  }

  /// @notice Require the address to be non-zero
  modifier nonZeroAddress(address _address) {
    require(_address != address(0), "NFT: zero address");
    _;
  }

  /// @notice Deploys the smart contract and sets the admin address
  constructor(address adminAddress) ERC721("CarbonPath NFT", "CPNFT") nonZeroAddress(adminAddress) {
    _adminAddress = adminAddress;

    emit UpdateAdminAddress(adminAddress);
  }

  /// @notice Set a new admin address.
  /// @dev can only be called by the owner, emits "UpdateAdminAddress" event
  /// @param _address The address that will be the new admin
  function setAdminAddress(address _address) external nonZeroAddress(_address) onlyOwner {
    _adminAddress = _address;
    emit UpdateAdminAddress(_address);
  }

  /// @notice Set the metadata for a tokenId
  /// @dev can only be called by the admin
  function setMetadata(uint256 tokenId, string calldata _metadata) external onlyAdmin {
    require(tokenId < _tokenIdCounter.current(), "NFT: must be minted");
    metadata[tokenId] = _metadata;
  }

  /// @notice Set the tokenURI for a tokenId
  /// @dev can only be called by the admin
  function setTokenURI(uint256 tokenId, string calldata tokenUri) external onlyAdmin {
    require(bytes(tokenUri).length > 0, "NFT: uri should be set");
    super._setTokenURI(tokenId, tokenUri);
  }

  /**
   * @notice Creates a new NFT for `to`.
   * Additionally sets URI, metadata, geoJSON for the token
   * Stores the number of advanced and buffer pool EAVs
   */
  /// @dev Can only be called by the admin
  /// @param to address which will receive the NFT
  /// @param advanceAmount number of advanced CPCO2 tokens for the token
  /// @param bufferAmount number of buffer pool CPCO2 tokens for the token
  /// @param tokenUri ipfs link for well documents
  /// @param _metadata contains well information
  /// @param _geoJson a geojson format for the permanence polygon of the well
  function mint(
    address to,
    uint256 advanceAmount,
    uint256 bufferAmount,
    string memory tokenUri,
    string memory _metadata,
    string memory _geoJson
  ) external onlyAdmin {
    require(bytes(tokenUri).length > 0, "NFT: uri should be set");
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

  /// @notice Updates the number of retired EAVS
  /// @dev total retired EAVs must not exceed Advanced + Buffer Pool EAVs
  /// @param tokenId tokenId of the well
  /// @param retiredAmount amount of CPCO2 tokens to be retired
  function updateRetiredEAVs(uint256 tokenId, uint256 retiredAmount) external onlyAdmin {
    EAVTokens storage eavs = eavTokens[tokenId];
    uint256 totalRetired = eavs.retiredEAVs + retiredAmount;

    require(
      eavs.advanceEAVs + eavs.bufferPoolEAVs >= totalRetired,
      "NFT: exceed max retired amount"
    );

    eavs.retiredEAVs = totalRetired;
  }

  /// @notice Returns the admin address set via {setAdminAddress}.
  /// @return adminAddress address of the admin
  function getAdminAddress() external view returns (address adminAddress) {
    return _adminAddress;
  }

  /// @notice Returns the number of advance EAVs in the tokenId.
  /// @param tokenId tokenId of the well
  /// @return advancedEAVsAmount amount of advanced EAVS for the tokenID
  function getAdvancedEAVs(uint256 tokenId) external view returns (uint256) {
    return eavTokens[tokenId].advanceEAVs;
  }

  /// @notice Returns the number of buffer pool EAVs in the tokenId.
  /// @param tokenId tokenId of the well
  /// @return bufferPoolEAVsAmount amount of buffer pool EAVS for the tokenID
  function getBufferPoolEAVs(uint256 tokenId) external view returns (uint256) {
    return eavTokens[tokenId].bufferPoolEAVs;
  }

  /// @notice Returns the number of retired EAVs in the tokenId.
  /// @param tokenId tokenId of the well
  /// @return retiredEAVsAmount amount of retired EAVS for the tokenID
  function getRetiredEAVs(uint256 tokenId) external view returns (uint256) {
    return eavTokens[tokenId].retiredEAVs;
  }

  /// @notice Returns the geoJson stored in the tokenId
  /// @param tokenId tokenId of the well
  /// @return geoJson geoJSON for the tokenID
  function getGeoJson(uint256 tokenId) external view returns (string memory) {
    return geoJson[tokenId];
  }

  /// @notice Returns the metadata stored in the tokenId
  /// @param tokenId tokenId of the well
  /// @return metadata metadata for the tokenID
  function getMetadata(uint256 tokenId) external view returns (string memory) {
    return metadata[tokenId];
  }
}
