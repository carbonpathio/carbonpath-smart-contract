// test/CarbonPathNFT.test.js
const { expect } = require('chai')
const metadata = require('./data/mockData.json')
const GEOJSON1 = require('./data/GEOJSON1.json')
const keccak256 = require('keccak256')

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
const CP_FEE_ADDRESS = "0x0000000000000000000000000000000000000001"
const BUFFER_POOL_ADDRESS = "0x0000000000000000000000000000000000000002"
const NON_PROFIT_ADDRESS = "0x0000000000000000000000000000000000000003"
const SELLER_ADDRESS = "0x0000000000000000000000000000000000000004"

describe('CarbonPathAdmin', function () {
  before(async function () {
    this.StableToken = await ethers.getContractFactory('MockStableToken')
    this.Token = await ethers.getContractFactory('CarbonPathToken')
    this.Admin = await ethers.getContractFactory('CarbonPathAdmin')
    this.NFT = await ethers.getContractFactory('CarbonPathNFT')
  })

  describe("Deployment", function() {
    it('revert if no address is given', async function () {
    const [owner] = await ethers.getSigners()

    this.stableToken = await this.StableToken.deploy()

    this.token = await this.Token.deploy('test', '$TEST')

    this.nft = await this.NFT.deploy(owner.address)
    await this.nft.deployed()

    await expect(this.Admin.deploy(
      ZERO_ADDRESS,
      this.token.address,
      this.stableToken.address,
      CP_FEE_ADDRESS,
      BUFFER_POOL_ADDRESS,
      NON_PROFIT_ADDRESS,
      SELLER_ADDRESS
    )).to.be.revertedWith("Admin: zero address")

    await expect(this.Admin.deploy(
      this.nft.address,
      ZERO_ADDRESS,
      this.stableToken.address,
      CP_FEE_ADDRESS,
      BUFFER_POOL_ADDRESS,
      NON_PROFIT_ADDRESS,
      SELLER_ADDRESS
    )).to.be.revertedWith("Admin: zero address")

    await expect(this.Admin.deploy(
      this.nft.address,
      this.token.address,
      ZERO_ADDRESS,
      CP_FEE_ADDRESS,
      BUFFER_POOL_ADDRESS,
      NON_PROFIT_ADDRESS,
      SELLER_ADDRESS
    )).to.be.revertedWith("Admin: zero address")
    })
  })

  beforeEach(async function () {
    const [owner] = await ethers.getSigners()

    this.stableToken = await this.StableToken.deploy()

    this.token = await this.Token.deploy('test', '$TEST')

    this.nft = await this.NFT.deploy(owner.address)
    await this.nft.deployed()

    this.admin = await this.Admin.deploy(
      this.nft.address,
      this.token.address,
      this.stableToken.address,
      CP_FEE_ADDRESS,
      BUFFER_POOL_ADDRESS,
      NON_PROFIT_ADDRESS,
      SELLER_ADDRESS
    )
    await this.admin.deployed()

    await this.nft.setAdminAddress(this.admin.address)
    await this.token.grantMinter(this.admin.address)
  })

  describe('Grant Roles', function() {
    it('only admin can grant minter role', async function() {
      const [owner, addr1] = await ethers.getSigners()
      
      await expect(this.admin.connect(addr1).grantMinter(addr1.address)).to.be.revertedWith("Admin: must be an admin")
      await this.admin.connect(owner).grantMinter(addr1.address)

      expect(await this.admin.hasRole(keccak256('MINTER_ROLE'), addr1.address)).to.be.true
    })

    it('only admin can revoke minter role', async function() {
      const [owner, addr1] = await ethers.getSigners()
      await this.admin.connect(owner).grantMinter(addr1.address)
      
      expect(await this.admin.hasRole(keccak256('MINTER_ROLE'), addr1.address)).to.be.true
      await expect(this.admin.connect(addr1).revokeMinter(owner.address)).to.be.revertedWith("Admin: must be an admin")
      
      await this.admin.connect(owner).revokeMinter(addr1.address)
      expect(await this.admin.hasRole(keccak256('MINTER_ROLE'), addr1.address)).to.be.false
    })

    it('should be a non zero address', async function() {
      const [owner] = await ethers.getSigners()
      
      await expect(this.admin.grantMinter(ZERO_ADDRESS)).to.be.revertedWith("Admin: zero address")
      await expect(this.admin.revokeMinter(ZERO_ADDRESS)).to.be.revertedWith("Admin: zero address")
    })
 
  })

  describe('Set Addresses', function() {
    it('only admin can set addresses', async function() {
      const [owner, addr1, addr2] = await ethers.getSigners()
      
      await expect(this.admin.connect(addr1).setCpFeeAddress(addr1.address)).to.be.revertedWith("Admin: must be an admin")
      await expect(this.admin.connect(addr1).setNonProfitAddress(addr1.address)).to.be.revertedWith("Admin: must be an admin")
      await expect(this.admin.connect(addr1).setBufferPoolAddress(addr1.address)).to.be.revertedWith("Admin: must be an admin")

      await this.admin.setCpFeeAddress(addr2.address)
      expect(await this.admin.cpFeeAddress()).to.be.equal(addr2.address)

      await this.admin.setNonProfitAddress(addr2.address)
      expect(await this.admin.nonProfitAddress()).to.be.equal(addr2.address)

      await this.admin.setBufferPoolAddress(addr2.address)
      expect(await this.admin.bufferPoolAddress()).to.be.equal(addr2.address)
      
    })

    it('should not be a zero address', async function() {
      const [owner, addr1, addr2] = await ethers.getSigners()
      
      await expect(this.admin.setCpFeeAddress(ZERO_ADDRESS)).to.be.revertedWith("Admin: zero address")
      await expect(this.admin.setNonProfitAddress(ZERO_ADDRESS)).to.be.revertedWith("Admin: zero address")
      await expect(this.admin.setBufferPoolAddress(ZERO_ADDRESS)).to.be.revertedWith("Admin: zero address")
      
    })
  })


  describe('Mint NFT', function () {
    beforeEach(async function () {
      const [owner, cpFeeAddr, bufferAddr, nonProfitAddr] = await ethers.getSigners()

      await this.admin.setCpFeeAddress(cpFeeAddr.address)
      await this.admin.setNonProfitAddress(nonProfitAddr.address)
      await this.admin.setBufferPoolAddress(bufferAddr.address)
    })

    
    it('handle required fields', async function () {
      const [owner, addr1] = await ethers.getSigners()
      await expect(
        this.admin.mint(
          ZERO_ADDRESS,
          10,
          250,
          10,
          addr1.address,
          'http://localhost/token/0/',
          JSON.stringify(metadata),
          JSON.stringify(GEOJSON1)
        )
      ).to.be.revertedWith("Admin: zero address")

      await expect(
        this.admin.mint(
          owner.address,
          10,
          250,
          10,
          addr1.address,
          '',
          JSON.stringify(metadata),
          JSON.stringify(GEOJSON1)
        )
      ).to.be.revertedWith('NFT: uri should be set')

      await expect(
        this.admin.mint(
          owner.address,
          10,
          250,
          10,
          ZERO_ADDRESS,
          'http://localhost/token/0/',
          JSON.stringify(metadata),
          JSON.stringify(GEOJSON1)
        )
      ).to.be.revertedWith('Admin: zero address')

      await expect(
        this.admin.mint(
          owner.address,
          10,
          1001,
          10,
          addr1.address,
          'http://localhost/token/0/',
          JSON.stringify(metadata),
          JSON.stringify(GEOJSON1)
        )
      ).to.be.revertedWith('Admin: percentage <= 1000')
    })

    it('only minters can mint', async function () {
      const [owner, addr1] = await ethers.getSigners()

      await expect(
        this.admin.connect(addr1).mint(
          owner.address,
          10,
          250,
          10,
          ZERO_ADDRESS,
          'http://localhost/token/0/',
          JSON.stringify(metadata),
          JSON.stringify(GEOJSON1)
        )
      ).to.be.revertedWith('Admin: must be a minter')
    })

    it('successfully mint a token', async function () {
      const [owner, cpFeeAddr, bufferAddr, nonProfitAddr, operatorAddr] = await ethers.getSigners()
      await this.admin.mint(
        owner.address,
        20,
        250,
        20,
        operatorAddr.address,
        'http://localhost/token/0/',
        JSON.stringify(metadata),
        JSON.stringify(GEOJSON1)
      )

      const tokenOwner = await this.nft.ownerOf(0)
      expect(tokenOwner).to.equal(owner.address)

      const tokenURI = await this.nft.tokenURI(0)
      expect(tokenURI).to.equal('http://localhost/token/0/')

      const cpFeeAddrBalance = await this.token.balanceOf(cpFeeAddr.address)
      expect(cpFeeAddrBalance).to.equal(5)

      const operatorAddrBalance = await this.token.balanceOf(operatorAddr.address)
      expect(operatorAddrBalance).to.equal(15)

      const bufferAddrBalance = await this.token.balanceOf(bufferAddr.address)
      expect(bufferAddrBalance).to.equal(19)

      const nonProfitAddrBalance = await this.token.balanceOf(nonProfitAddr.address)
      expect(nonProfitAddrBalance).to.equal(1)

      const totalSupply = await this.token.totalSupply()
      expect(totalSupply).to.be.equal(40)
    })

    it('truncated decimal places when airdropping tokens', async function () {
      const [owner, cpFeeAddr, bufferAddr, nonProfitAddr, operatorAddr] = await ethers.getSigners()
      await this.admin.mint(
        owner.address,
        19,
        240,
        19,
        operatorAddr.address,
        'http://localhost/token/0/',
        JSON.stringify(metadata),
        JSON.stringify(GEOJSON1)
      )

      const tokenOwner = await this.nft.ownerOf(0)
      expect(tokenOwner).to.equal(owner.address)

      const tokenURI = await this.nft.tokenURI(0)
      expect(tokenURI).to.equal('http://localhost/token/0/')

      const cpFeeAddrBalance = await this.token.balanceOf(cpFeeAddr.address)
      expect(cpFeeAddrBalance).to.equal(4)

      const operatorAddrBalance = await this.token.balanceOf(operatorAddr.address)
      expect(operatorAddrBalance).to.equal(15)

      const bufferAddrBalance = await this.token.balanceOf(bufferAddr.address)
      expect(bufferAddrBalance).to.equal(19)

      const nonProfitAddrBalance = await this.token.balanceOf(nonProfitAddr.address)
      expect(nonProfitAddrBalance).to.equal(0)

      const totalSupply = await this.token.totalSupply()
      expect(totalSupply).to.be.equal(38)
    })
  })

  describe('Update Token URI', function () {
    beforeEach(async function () {
      const [owner, cpFeeAddr, bufferAddr, nonProfitAddr, operatorAddr] = await ethers.getSigners()

      await this.admin.setCpFeeAddress(cpFeeAddr.address)
      await this.admin.setNonProfitAddress(nonProfitAddr.address)
      await this.admin.setBufferPoolAddress(bufferAddr.address)

      await this.admin.mint(
        owner.address,
        20,
        250,
        20,
        operatorAddr.address,
        'http://localhost/token/0/',
        JSON.stringify(metadata),
        JSON.stringify(GEOJSON1)
      )
    })

    it('only minter address can update URI', async function () {
      const [owner, addr1] = await ethers.getSigners()
      await expect(this.admin.connect(addr1).updateTokenURI(0, 'test')).to.be.revertedWith(
        'Admin: must be a minter'
      )
    })

    it('can only update minted NFTs', async function () {
      const [owner, addr1] = await ethers.getSigners()
      await expect(this.admin.updateTokenURI(1, 'test')).to.be.revertedWith(
        'ERC721URIStorage: URI set of nonexistent token'
      )
    })

    it('sucessful update', async function () {
      const [owner, addr1] = await ethers.getSigners()
      await this.admin.updateTokenURI(0, 'test')

      const tokenURI = await this.nft.tokenURI(0)
      expect(tokenURI).to.be.equal('test')
    })
  })


  describe('Update Metadata', function () {
    beforeEach(async function () {
      const [owner, cpFeeAddr, bufferAddr, nonProfitAddr, operatorAddr] = await ethers.getSigners()

      await this.admin.setCpFeeAddress(cpFeeAddr.address)
      await this.admin.setNonProfitAddress(nonProfitAddr.address)
      await this.admin.setBufferPoolAddress(bufferAddr.address)

      await this.admin.mint(
        owner.address,
        20,
        250,
        20,
        operatorAddr.address,
        'http://localhost/token/0/',
        JSON.stringify(metadata),
        JSON.stringify(GEOJSON1)
      )
    })

    it('only minter address can update URI', async function () {
      const [owner, addr1] = await ethers.getSigners()
      await expect(this.admin.connect(addr1).updateMetadata(0, 'test')).to.be.revertedWith(
        'Admin: must be a minter'
      )
    })

    it('can only update minted NFTs', async function () {
      const [owner, addr1] = await ethers.getSigners()
      await expect(this.admin.updateMetadata(1, 'test')).to.be.revertedWith(
        'NFT: must be minted'
      )
    })

    it('sucessful update', async function () {
      const [owner, addr1] = await ethers.getSigners()
      await this.admin.updateMetadata(0, 'test')

      const tokenURI = await this.nft.getMetadata(0)
      expect(tokenURI).to.be.equal('test')
    })
  })

  describe('Retire NFT', function () {
    beforeEach(async function () {
      const [owner, cpFeeAddr, bufferAddr, nonProfitAddr, operatorAddr] = await ethers.getSigners()

      await this.admin.setCpFeeAddress(cpFeeAddr.address)
      await this.admin.setNonProfitAddress(nonProfitAddr.address)
      await this.admin.setBufferPoolAddress(bufferAddr.address)

      await this.admin.mint(
        owner.address,
        20,
        250,
        20,
        operatorAddr.address,
        'http://localhost/token/0/',
        JSON.stringify(metadata),
        JSON.stringify(GEOJSON1)
      )
    })
    it('retired token must be at least 1', async function () {
      const [owner, cpFeeAddr, bufferAddr, nonProfitAddr, operatorAddr] = await ethers.getSigners()
      await expect(this.admin.connect(operatorAddr).retire(0, 0)).to.be.revertedWith(
        'Admin: amount > 0'
      )
    })
    it('not enough balance', async function () {
      const [owner, cpFeeAddr, bufferAddr, nonProfitAddr, operatorAddr] = await ethers.getSigners()
      await expect(this.admin.connect(operatorAddr).retire(0, 16)).to.be.revertedWith(
        'Admin: not enough balance'
      )
    })

    it('requires increase allowance', async function () {
      const [owner, cpFeeAddr, bufferAddr, nonProfitAddr, operatorAddr] = await ethers.getSigners()

      await expect(this.admin.connect(operatorAddr).retire(0, 15)).to.be.revertedWith(
        'ERC20: insufficient allowance'
      )
    })

    it('successful retire', async function () {
      const [owner, cpFeeAddr, bufferAddr, nonProfitAddr, operatorAddr] = await ethers.getSigners()

      // Allows the market to burn 15 CP coins
      await this.token.connect(operatorAddr).increaseAllowance(this.admin.address, 15)

      await this.admin.connect(operatorAddr).retire(0, 15)
      const remainingBalance = await this.token.balanceOf(operatorAddr.address)
      expect(remainingBalance).to.be.equal(0)

      const totalSupply = await this.token.totalSupply()
      expect(totalSupply).to.be.equal(25) // burned 15 tokens
    })
  })

  describe('Sell Tokens', function () {
    beforeEach(async function () {
      const [owner, sellerAddr] = await ethers.getSigners()

      await this.admin.setSellerAddress(sellerAddr.address)
    })

    it('only admin can set seller address', async function () {
      const [owner, sellerAddr, buyerAddr] = await ethers.getSigners()
      await expect(this.admin.connect(buyerAddr).setSellerAddress(buyerAddr.address)).to.be.revertedWith(
        'Admin: must be an admin'
      )

      await this.admin.setSellerAddress(sellerAddr.address)
      expect(await this.admin.sellerAddress()).to.be.equal(sellerAddr.address)
    })

    it('seller cannot be a zero address', async function () {
      const [owner] = await ethers.getSigners()
      await expect(this.admin.setSellerAddress(ZERO_ADDRESS)).to.be.revertedWith('Admin: zero address')
    })

    it('only seller address can sell tokens', async function () {
      const [owner, sellerAddr, buyerAddr] = await ethers.getSigners()
      await expect(this.admin.connect(buyerAddr).sell(1)).to.be.revertedWith(
        'Admin: caller is not seller'
      )
    })

    it('amount should be at least 1', async function () {
      const [owner, sellerAddr] = await ethers.getSigners()

      await this.token.mint(sellerAddr.address, 10)
      await expect(this.admin.connect(sellerAddr).sell(0)).to.be.revertedWith(
        'Admin: amount > 0'
      )
    })

    it('should have enough balance', async function () {
      const [owner, sellerAddr] = await ethers.getSigners()

      await this.token.mint(sellerAddr.address, 10)
      await expect(this.admin.connect(sellerAddr).sell(11)).to.be.revertedWith(
        'Admin: not enough balance'
      )
    })

    it('successful sell', async function () {
      const [owner, sellerAddr] = await ethers.getSigners()
      await this.token.connect(sellerAddr).increaseAllowance(this.admin.address, 10)
      await this.token.mint(sellerAddr.address, 10)
      await this.admin.connect(sellerAddr).sell(10)

      const balanceAdmin = await this.token.balanceOf(this.admin.address)
      expect(balanceAdmin).to.be.equal(10)

      const balanceSeller = await this.token.balanceOf(sellerAddr.address)
      expect(balanceSeller).to.be.equal(0)
    })
  })

  describe('Withdraw Tokens', function () {
    beforeEach(async function () {
      const [owner, sellerAddr] = await ethers.getSigners()

      await this.admin.setSellerAddress(sellerAddr.address)
    })

    it('only seller address can withdraw tokens', async function () {
      const [owner, sellerAddr, buyerAddr] = await ethers.getSigners()
      await expect(this.admin.connect(buyerAddr).withdraw(1)).to.be.revertedWith(
        'Admin: caller is not seller'
      )
    })

    it('amount should be at least 1', async function () {
      const [owner, sellerAddr] = await ethers.getSigners()

      await this.token.mint(sellerAddr.address, 10)
      await expect(this.admin.connect(sellerAddr).withdraw(0)).to.be.revertedWith(
        'Admin: amount > 0'
      )
    })

    it('should have enough balance', async function () {
      const [owner, sellerAddr] = await ethers.getSigners()

      await expect(this.admin.connect(sellerAddr).withdraw(1)).to.be.revertedWith(
        'Admin: not enough balance'
      )
    })

    it('successful withdraw', async function () {
      const [owner, sellerAddr] = await ethers.getSigners()
      await this.token.connect(sellerAddr).increaseAllowance(this.admin.address, 10)
      await this.token.mint(sellerAddr.address, 10)
      await this.admin.connect(sellerAddr).sell(10)

      const beforeWithdrawAdmin = await this.token.balanceOf(this.admin.address)
      expect(beforeWithdrawAdmin).to.be.equal(10)

      const beforeWithdrawSeller = await this.token.balanceOf(sellerAddr.address)
      expect(beforeWithdrawSeller).to.be.equal(0)

      await this.admin.connect(sellerAddr).withdraw(5)

      const afterWithdrawAdmin = await this.token.balanceOf(this.admin.address)
      expect(afterWithdrawAdmin).to.be.equal(5)

      const afterWithdrawSeller = await this.token.balanceOf(sellerAddr.address)
      expect(afterWithdrawSeller).to.be.equal(5)
    })
    
    it('transfer seller address', async function () {
      const [owner, sellerAddr, transferAddress] = await ethers.getSigners()
      await this.token.connect(sellerAddr).increaseAllowance(this.admin.address, 10)
      await this.token.mint(sellerAddr.address, 10)
      await this.admin.connect(sellerAddr).sell(10)

      expect(await this.token.balanceOf(this.admin.address)).to.be.equal(10)
      expect(await this.token.balanceOf(sellerAddr.address)).to.be.equal(0)

      await this.admin.setSellerAddress(transferAddress.address)

      // Token should have been returned back to the old seller
      expect(await this.token.balanceOf(this.admin.address)).to.be.equal(0)
      expect(await this.token.balanceOf(sellerAddr.address)).to.be.equal(10)
    })

    it('transfer seller address no token sold', async function () {
      const [owner, sellerAddr, transferAddress] = await ethers.getSigners()
      await this.token.connect(sellerAddr).increaseAllowance(this.admin.address, 10)
      await this.token.mint(sellerAddr.address, 10)
      await this.admin.connect(sellerAddr).sell(10)

      expect(await this.token.balanceOf(this.admin.address)).to.be.equal(10)
      expect(await this.token.balanceOf(sellerAddr.address)).to.be.equal(0)

      await this.admin.setSellerAddress(transferAddress.address)

      // Token should have been returned back to the old seller
      expect(await this.token.balanceOf(this.admin.address)).to.be.equal(0)
      expect(await this.token.balanceOf(sellerAddr.address)).to.be.equal(10)

      await this.admin.setSellerAddress(sellerAddr.address)

      expect(await this.token.balanceOf(this.admin.address)).to.be.equal(0)
      expect(await this.token.balanceOf(transferAddress.address)).to.be.equal(0)
    })
  })

  describe('Buy Tokens', function () {
    beforeEach(async function () {
      const [owner, sellerAddr] = await ethers.getSigners()

      await this.admin.setSellerAddress(sellerAddr.address)
    })

    it('amount should be at least 1', async function () {
      const [owner, sellerAddr, buyerAddr] = await ethers.getSigners()

      await expect(this.admin.connect(buyerAddr).buy(0)).to.be.revertedWith(
        'Admin: amount > 0'
      )
    })

    it('should have enough balance', async function () {
      const [owner, sellerAddr, buyerAddr] = await ethers.getSigners()

      await expect(this.admin.connect(buyerAddr).buy(1)).to.be.revertedWith(
        'Admin: not enough balance'
      )
    })

    it('should have enough stable token', async function () {
      const [owner, sellerAddr, buyerAddr] = await ethers.getSigners()

      await this.token.mint(sellerAddr.address, 10)

      await this.token.connect(sellerAddr).increaseAllowance(this.admin.address, 10)
      await this.admin.connect(sellerAddr).sell(10)

      await expect(this.admin.connect(buyerAddr).buy(1)).to.be.revertedWith(
        'Admin: not enough stable token'
      )
    })
    it('successful buy', async function () {
      const [owner, sellerAddr, buyerAddr] = await ethers.getSigners()
      await this.token.connect(sellerAddr).increaseAllowance(this.admin.address, 10)
      const amountPow = 30

      await this.stableToken.connect(buyerAddr).increaseAllowance(this.admin.address, amountPow)
      await this.token.mint(sellerAddr.address, 10)
      await this.admin.connect(sellerAddr).sell(10)

      await this.stableToken.transfer(buyerAddr.address, amountPow)

      const beforeBuyBuyer = await this.stableToken.balanceOf(buyerAddr.address)
      expect(beforeBuyBuyer).to.be.equal(amountPow)

      const beforeBuySeller = await this.stableToken.balanceOf(sellerAddr.address)
      expect(beforeBuySeller).to.be.equal(0)

      await this.admin.connect(buyerAddr).buy(1)

      const afterBuyBuyer = await this.stableToken.balanceOf(buyerAddr.address)
      expect(afterBuyBuyer).to.be.equal(0)

      const afterBuySeller = await this.stableToken.balanceOf(sellerAddr.address)
      expect(afterBuySeller).to.be.equal(amountPow)
    })
  })
})
