const HDWalletProvider = require('@truffle/hdwallet-provider');
  
module.exports = {
  networks: {
    development: {
     host: "127.0.0.1",
     port: 8545,
     network_id: "*",
     gas: 6721975,
    },
  },
  mocha: {
    timeout: 1200000
  },
  plugins: ["solidity-coverage"],
  compilers: {
    solc: {
      version: "0.5.16",
      settings: {
       optimizer: {
         enabled: true,
         runs: 150
       },
      }
    }
  }
}

