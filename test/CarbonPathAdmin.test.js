// test/CarbonPathAdmin.test.js
const { expect } = require('chai')
const { ethers } = require('hardhat');
const metadata = require('./data/mockData.json')
const GEOJSON1 = require('./data/GEOJSON1.json')
const { signMetaTxRequest } = require("./metatransaction/signer");

describe('CarbonPathAdmin', function () {
  before(async function () {
    this.MinimalForwarder = await ethers.getContractFactory('MinimalForwarder')
    this.StableToken = await ethers.getContractFactory('MockStableToken')
    this.Token = await ethers.getContractFactory('CarbonPathToken')
    this.Admin = await ethers.getContractFactory('CarbonPathAdmin')
    this.NFT = await ethers.getContractFactory('CarbonPathNFT')

  })

  beforeEach(async function () {
    const [owner] = await ethers.getSigners()
    this.forwarder = await this.MinimalForwarder.deploy();
    this.stableToken = await this.StableToken.deploy()

    this.token = await this.Token.deploy('test', '$TEST', this.forwarder.address)

    this.nft = await this.NFT.deploy(owner.address)
    await this.nft.deployed()

    this.admin = await this.Admin.deploy(
      this.nft.address,
      this.token.address,
      this.stableToken.address,
      this.forwarder.address
    )
    await this.admin.deployed()

    await this.nft.setAdminAddress(this.admin.address)
    await this.token.grantMinter(this.admin.address)
  })

  describe('Mint NFT', function () {
    beforeEach(async function () {
      const [owner, cpFeeAddr, bufferAddr, nonProfitAddr] = await ethers.getSigners()

      await this.admin.setCpFeeAddress(cpFeeAddr.address)
      await this.admin.setNonProfitAddress(nonProfitAddr.address)
      await this.admin.setBufferPoolAddress(bufferAddr.address)
    })

    it('token uri is required', async function () {
      const [owner, addr1] = await ethers.getSigners()
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
      ).to.be.revertedWith('CarbonPathNFT: uri should be set')
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
        'CarbonPathAdmin: must have minter role to update URI'
      )
    })

    it('can only update minted NFTs', async function () {
      const [owner, addr1] = await ethers.getSigners()
      await expect(this.admin.updateTokenURI(1, 'test')).to.be.revertedWith(
        'ERC721: invalid token ID'
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
        'CarbonPathAdmin: must have minter role to update Metadata'
      )
    })

    it('can only update minted NFTs', async function () {
      const [owner, addr1] = await ethers.getSigners()
      await expect(this.admin.updateMetadata(1, 'test')).to.be.revertedWith(
        'ERC721: invalid token ID'
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
        'CarbonPathAdmin: retired amount must be at least 1'
      )
    })
    it('not enough balance', async function () {
      const [owner, cpFeeAddr, bufferAddr, nonProfitAddr, operatorAddr] = await ethers.getSigners()
      await expect(this.admin.connect(operatorAddr).retire(0, 16)).to.be.revertedWith(
        'CarbonPathAdmin: not enough balance'
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

    it('successful retire via meta-tx', async function () {
      const [owner, cpFeeAddr, bufferAddr, nonProfitAddr, operatorAddr, relayer] = await ethers.getSigners()
      const forwarder = this.forwarder.connect(relayer);
      const token = this.token;

      // Allows the market to burn 15 CP coins
      const { request:requestAllowance, signature:signatureAllowance } = await signMetaTxRequest(operatorAddr.provider, forwarder, {
        from: operatorAddr.address,
        to:  token.address,
        data: token.interface.encodeFunctionData('increaseAllowance', [this.admin.address, 15]),
      });
      
      await forwarder.execute(requestAllowance, signatureAllowance).then(tx => tx.wait());

      const { request, signature } = await signMetaTxRequest(operatorAddr.provider, forwarder, {
        from: operatorAddr.address,
        to:  this.admin.address,
        data: this.admin.interface.encodeFunctionData('retire', [0, 15]),
      });
      
      await forwarder.execute(request, signature).then(tx => tx.wait());

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

    it('only seller address can sell tokens', async function () {
      const [owner, sellerAddr, buyerAddr] = await ethers.getSigners()
      await expect(this.admin.connect(buyerAddr).sell(1)).to.be.revertedWith(
        'CarbonPathAdmin: caller is not the seller'
      )
    })

    it('amount should be at least 1', async function () {
      const [owner, sellerAddr] = await ethers.getSigners()

      await this.token.mint(sellerAddr.address, 10)
      await expect(this.admin.connect(sellerAddr).sell(0)).to.be.revertedWith(
        'CarbonPathAdmin: sell amount must be at least 1'
      )
    })

    it('should have enough balance', async function () {
      const [owner, sellerAddr] = await ethers.getSigners()

      await this.token.mint(sellerAddr.address, 10)
      await expect(this.admin.connect(sellerAddr).sell(11)).to.be.revertedWith(
        'CarbonPathAdmin: not enough balance'
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
        'CarbonPathAdmin: caller is not the seller'
      )
    })

    it('amount should be at least 1', async function () {
      const [owner, sellerAddr] = await ethers.getSigners()

      await this.token.mint(sellerAddr.address, 10)
      await expect(this.admin.connect(sellerAddr).withdraw(0)).to.be.revertedWith(
        'CarbonPathAdmin: withdraw amount must be at least 1'
      )
    })

    it('should have enough balance', async function () {
      const [owner, sellerAddr] = await ethers.getSigners()

      await expect(this.admin.connect(sellerAddr).withdraw(1)).to.be.revertedWith(
        'CarbonPathAdmin: not enough balance'
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
        'CarbonPathAdmin: buy amount must be at least 1'
      )
    })

    it('should have enough balance', async function () {
      const [owner, sellerAddr, buyerAddr] = await ethers.getSigners()

      await expect(this.admin.connect(buyerAddr).buy(1)).to.be.revertedWith(
        'CarbonPathAdmin: not enough balance'
      )
    })

    it('should have enough stable token', async function () {
      const [owner, sellerAddr, buyerAddr] = await ethers.getSigners()

      await this.token.mint(sellerAddr.address, 10)

      await this.token.connect(sellerAddr).increaseAllowance(this.admin.address, 10)
      await this.admin.connect(sellerAddr).sell(10)

      await expect(this.admin.connect(buyerAddr).buy(1)).to.be.revertedWith(
        'CarbonPathAdmin: not enough stable token'
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
