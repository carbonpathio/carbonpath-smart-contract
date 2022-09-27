const { ethers } = require('hardhat')
require('dotenv').config({ path: '../.env' })

// scripts/deployNFT.js
async function main() {
  const [deployer] = await ethers.getSigners()
  const { CP_FEE_ADDRESS, BUFFER_ADDRESS, NONPROFIT_ADDRESS, STABLE_TOKEN_ADDRESS } = process.env

  const CarbonPathNFTFactory = await ethers.getContractFactory('CarbonPathNFT')
  const CarbonPathAdminFactory = await ethers.getContractFactory('CarbonPathAdmin')
  const CarbonPathTokenFactory = await ethers.getContractFactory('CarbonPathToken')

  const CarbonPathToken = await CarbonPathTokenFactory.deploy('Carbon Path Token', '$CPC02e')
  console.log('Carbon Path Token Address: ', CarbonPathToken.address)

  const CarbonPathNFT = await CarbonPathNFTFactory.deploy(deployer.address)
  console.log('Carbon Path NFT Address: ', CarbonPathNFT.address)

  const CarbonPathAdmin = await CarbonPathAdminFactory.deploy(
    CarbonPathNFT.address,
    CarbonPathToken.address,
    STABLE_TOKEN_ADDRESS
  )

  console.log('Carbon Path Admin Address: ', CarbonPathAdmin.address)

  await CarbonPathNFT.setAdminAddress(CarbonPathAdmin.address)
  console.log('Admin has been linked to the NFT')

  await CarbonPathToken.grantMinter(CarbonPathAdmin.address)
  console.log('Admin has been linked to the Token')

  await CarbonPathAdmin.setCpFeeAddress(CP_FEE_ADDRESS)
  console.log('CP Fee Wallet has been setup')

  await CarbonPathAdmin.setNonProfitAddress(NONPROFIT_ADDRESS)
  console.log('Non Profit Wallet has been setup')

  await CarbonPathAdmin.setBufferPoolAddress(BUFFER_ADDRESS)
  console.log('Buffer Pool Wallet has been setup')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
