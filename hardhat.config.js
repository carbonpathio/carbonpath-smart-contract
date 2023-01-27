// hardhat.config.js
require('@nomiclabs/hardhat-waffle')
require('dotenv').config({ path: './.env' })
require('hardhat-deploy')
require('hardhat-gas-reporter')

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

module.exports = {
  networks: {
    localhost: {
      url: 'http://127.0.0.1:8545',
    },
    alfajores: {
      url: 'https://alfajores-forno.celo-testnet.org',
      accounts: {
        mnemonic: process.env.MNEMONIC_CELO,
        //path: "m/44'/52752'/0'/0",
        path: "m/44'/60'/0'/0",
      },
      //chainId: 44787
    },
    celo: {
      url: 'https://forno.celo.org',
      accounts: {
        mnemonic: process.env.MNEMONIC_CELO,
        //path: "m/44'/52752'/0'/0",
        path: "m/44'/60'/0'/0",
      },
      chainId: 42220,
    },
  },
  solidity: {
    version: '0.8.16',
    settings: {
      optimizer: {
        enabled: false,
        runs: 200,
      },
    },
  },
  gasReporter: {
    currency: 'USD',
    enabled: true, // set to false to disable gas reporting
    showTimeSpent: true,
  },
}
