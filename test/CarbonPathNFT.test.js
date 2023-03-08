// test/CarbonPathNFT.test.js
const { expect } = require('chai')
const metadata = require('./data/mockData.json')
const GEOJSON1 = require('./data/GEOJSON1.json')

describe('CarbonPathNFT', function () {
  before(async function () {
    this.NFT = await ethers.getContractFactory('CarbonPathNFT')
  })

  beforeEach(async function () {
    const [owner] = await ethers.getSigners()
    this.nft = await this.NFT.deploy(owner.address)
    await this.nft.deployed()
  })

  describe("Deployment", function() {
    it('revert if no admin address is given', async function () {
      const [owner] = await ethers.getSigners()
      await expect(this.NFT.deploy("0x0000000000000000000000000000000000000000")).to.be.revertedWith("NFT: zero address")

    })
  })

  describe('Admin Address', function () {
    it('getAdminAddress returns the admin address set on deploy', async function () {
      const [owner] = await ethers.getSigners()
      const adminAddress = await this.nft.getAdminAddress()
      expect(adminAddress).to.equal(owner.address)
    })

    it("setAdminAddress can't be called by non owner", async function () {
      const [owner, addr1] = await ethers.getSigners()
      await expect(this.nft.connect(addr1).setAdminAddress(addr1.address)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
    })


    it('Admin address should not be the zero address', async function () {
      const [owner] = await ethers.getSigners()
      await expect(
        this.nft.setAdminAddress('0x0000000000000000000000000000000000000000')
      ).to.be.revertedWith('NFT: zero address')
    })

    
    it("sucessful setAdminAddress call", async function () {
      const [owner, addr1] = await ethers.getSigners()
      await expect(this.nft.setAdminAddress(addr1.address)).to.emit(this.nft, "UpdateAdminAddress").withArgs(addr1.address)
    })
  })

  describe('Mint Token', function () {
    it("mint can't be called by an address that's not an admin", async function () {
      const [owner, addr1] = await ethers.getSigners()
      await expect(
        this.nft
          .connect(addr1)
          .mint(
            addr1.address,
            20,
            20,
            'http://localhost/token/0/',
            JSON.stringify(metadata),
            JSON.stringify(GEOJSON1)
          )
      ).to.be.revertedWith('NFT: caller is not the admin')
    })

    it('token uri is required', async function () {
      const [owner] = await ethers.getSigners()
      await expect(
        this.nft.mint(owner.address, 20, 20, '', JSON.stringify(metadata), JSON.stringify(GEOJSON1))
      ).to.be.revertedWith('NFT: uri should be set')
    })

    it('successfully mint a token', async function () {
      const [owner] = await ethers.getSigners()
      await this.nft.mint(
        owner.address,
        20,
        10,
        'http://localhost/token/0/',
        JSON.stringify(metadata),
        JSON.stringify(GEOJSON1)
      )

      const tokenOwner = await this.nft.ownerOf(0)
      expect(tokenOwner).to.equal(owner.address)

      const tokenURI = await this.nft.tokenURI(0)
      expect(tokenURI).to.equal('http://localhost/token/0/')

      const geoJSON = await this.nft.getGeoJson(0)
      expect(geoJSON).to.equal( JSON.stringify(GEOJSON1))

      const tokenMetadata = await this.nft.getMetadata(0)
      expect(tokenMetadata).to.equal(JSON.stringify(metadata))

      const advancedAmount = await this.nft.getAdvancedEAVs(0)
      expect(advancedAmount).to.equal(20)

      const bufferAmount = await this.nft.getBufferPoolEAVs(0)
      expect(bufferAmount).to.equal(10)
    })
  })
  
  describe('Update Retired EAVs', function () {
    beforeEach(async function () {
      const [owner] = await ethers.getSigners()
      await this.nft.mint(
        owner.address,
        20,
        10,
        'http://localhost/token/0/',
        JSON.stringify(metadata),
        JSON.stringify(GEOJSON1)
      )
    })

    it("can't be called by an address that's not an admin", async function () {
      const [owner, addr1] = await ethers.getSigners()
      await expect(this.nft.connect(addr1).updateRetiredEAVs(0, 1)).to.be.revertedWith(
        'NFT: caller is not the admin'
      )
    })

    it('burn amount will exceed stored advance and buffer pool amount', async function () {
      await expect(this.nft.updateRetiredEAVs(0, 31)).to.be.revertedWith(
        'NFT: exceed max retired amount'
      )
    })

    it('burn amount is equal stored advance and buffer pool amount', async function () {
      this.nft.updateRetiredEAVs(0, 30)

      const retiredAmount = await this.nft.getRetiredEAVs(0)
      expect(retiredAmount).to.be.equal(30)
    })

    it('burn amount is less than stored advance and buffer pool amount', async function () {
      this.nft.updateRetiredEAVs(0, 19)
      const retiredAmount = await this.nft.getRetiredEAVs(0)
      expect(retiredAmount).to.be.equal(19)
    })
  })

  describe('Update Token URI', function () {
    beforeEach(async function () {
      const [owner] = await ethers.getSigners()
      await this.nft.mint(
        owner.address,
        20,
        10,
        'http://localhost/token/0/',
        JSON.stringify(metadata),
        JSON.stringify(GEOJSON1)
      )
    })

    it("can't be called by an address that's not an admin", async function () {
      const [owner, addr1] = await ethers.getSigners()
      await expect(this.nft.connect(addr1).setTokenURI(0, 'test')).to.be.revertedWith(
        'NFT: caller is not the admin'
      )
    })

    it('token uri is required', async function () {
      await expect(this.nft.setTokenURI(0, '')).to.be.revertedWith('NFT: uri should be set')
    })

    it('cannot update if the token is not yet minted', async function () {
      await expect(this.nft.setTokenURI(1, 'test')).to.be.revertedWith('ERC721URIStorage: URI set of nonexistent token')
    })

    it('successful change', async function () {
      await this.nft.setTokenURI(0, 'test')

      const tokenURI = await this.nft.tokenURI(0)
      expect(tokenURI).to.be.equal('test')
    })
  })

  describe('Update Metadata', function () {
    beforeEach(async function () {
      const [owner] = await ethers.getSigners()
      await this.nft.mint(
        owner.address,
        20,
        10,
        'http://localhost/token/0/',
        JSON.stringify(metadata),
        JSON.stringify(GEOJSON1)
      )
    })

    it("can't be called by an address that's not an admin", async function () {
      const [owner, addr1] = await ethers.getSigners()
      await expect(this.nft.connect(addr1).setMetadata(0, 'test')).to.be.revertedWith(
        'NFT: caller is not the admin'
      )
    })

    it('cannot update if the token is not yet minted', async function () {
      await expect(this.nft.setMetadata(1, 'test')).to.be.revertedWith('NFT: must be minted')
    })

    it('successful change', async function () {
      await this.nft.setMetadata(0, 'test')

      const metadata = await this.nft.getMetadata(0)
      expect(metadata).to.be.equal('test')
    })
  })
})
