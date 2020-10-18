const TimeLock = artifacts.require("TimeLock");
const config = require("./config.json");

module.exports = async function(deployer, network, accounts) {
  if (network === 'mainnet') {
    await deployer.deploy(TimeLock);
    await TimeLock.deployed();
  }
};

