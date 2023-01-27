// test/CarbonPathToken.test.js
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { signMetaTxRequest } = require("./metatransaction/signer");



describe('CarbonPathToken', () => {
  before(async function () {
    this.StableToken = await ethers.getContractFactory('CarbonPathToken')
    this.MinimalForwarder = await ethers.getContractFactory('MinimalForwarder')
  })

  beforeEach(async function () {
    this.forwarder = await this.MinimalForwarder.deploy();
    this.stableToken = await this.StableToken.deploy('test', '$TEST', this.forwarder.address)

  })

  describe('Mint', function () {
    it('only minter can have mint tokens', async function () {
      const [owner, addr1] = await ethers.getSigners()
      await expect(this.stableToken.connect(addr1).mint(addr1.address, 100)).to.be.revertedWith(
        'CarbonPathToken: must have minter role to mint'
      )
    })

    it('successful mint', async function () {
      const [owner] = await ethers.getSigners()
      await this.stableToken.mint(owner.address, 100)
      expect(await this.stableToken.balanceOf(owner.address)).to.equal(100)
    })

    it('assigned minter can also mint', async function () {
      const [owner, addr1] = await ethers.getSigners()
      await this.stableToken.grantMinter(addr1.address)

      await this.stableToken.connect(addr1).mint(addr1.address, 100)
      expect(await this.stableToken.balanceOf(addr1.address)).to.equal(100)
    })

    it('revoked minter cannot mint', async function () {
      const [owner, addr1] = await ethers.getSigners()
      await this.stableToken.grantMinter(addr1.address)

      await this.stableToken.connect(addr1).mint(addr1.address, 100)
      expect(await this.stableToken.balanceOf(addr1.address)).to.equal(100)

      await this.stableToken.revokeMinter(addr1.address)
      await expect(this.stableToken.connect(addr1).mint(addr1.address, 100)).to.be.revertedWith(
        'CarbonPathToken: must have minter role to mint'
      )
    })
  })

  describe('Transfer', function () {
    beforeEach(async function () {
      const [owner] = await ethers.getSigners()
      await this.stableToken.mint(owner.address, 100)
    })

    it('allow transfer between accounts', async function () {
      const [owner, addr1, addr2] = await ethers.getSigners()

      await this.stableToken.transfer(addr1.address, 50)
      expect(await this.stableToken.balanceOf(addr1.address)).to.equal(50)

      await this.stableToken.connect(addr1).transfer(addr2.address, 50)
      expect(await this.stableToken.balanceOf(addr2.address)).to.equal(50)
      expect(await this.stableToken.balanceOf(addr1.address)).to.equal(0)
    })

    it('revert on insufficient funds', async function () {
      const [owner, addr1] = await ethers.getSigners()
      await expect(this.stableToken.connect(addr1).transfer(owner.address, 50)).to.be.revertedWith(
        'ERC20: transfer amount exceeds balance'
      )
    })
  })

  describe('Burn', function () {
    beforeEach(async function () {
      const [owner] = await ethers.getSigners()
      await this.stableToken.mint(owner.address, 100)
    })
    it('only minter can burn tokens', async function () {
      const [owner, addr1] = await ethers.getSigners()
      await expect(this.stableToken.connect(addr1).burn(1)).to.be.revertedWith(
        'CarbonPathToken: must have minter role to burn'
      )
    })

    it('successful burn', async function () {
      const [owner] = await ethers.getSigners()
      expect(await this.stableToken.balanceOf(owner.address)).to.equal(100)
      await this.stableToken.burn(50)
      expect(await this.stableToken.balanceOf(owner.address)).to.equal(50)
    })

    it('revert on insufficient funds', async function () {
      const [owner] = await ethers.getSigners()
      expect(await this.stableToken.balanceOf(owner.address)).to.equal(100)
      await expect(this.stableToken.burn(200)).to.be.revertedWith(
        'ERC20: burn amount exceeds balance'
      )
    })
  })

  
  describe('Update Allowance', function () {
    it('increase allowance directly', async function () {
      const [owner, addr1, addr2] = await ethers.getSigners()
      await this.stableToken.connect(addr1).increaseAllowance(addr2.address, 1)
      expect(await this.stableToken.allowance(addr1.address,addr2.address)).to.equal(1)
    })

    it('increase allowance via meta-tx', async function () {
      const [owner, addr1, addr2,  relayer] = await ethers.getSigners()
      const forwarder = this.forwarder.connect(relayer);
      const stableToken = this.stableToken;

      const { request, signature } = await signMetaTxRequest(addr1.provider, forwarder, {
        from: addr1.address,
        to: stableToken.address,
        data: stableToken.interface.encodeFunctionData('increaseAllowance', [addr2.address, 1]),
      });
      
      await forwarder.execute(request, signature).then(tx => tx.wait());
      expect(await this.stableToken.allowance(addr1.address,addr2.address)).to.equal(1)
    })
  })
})


