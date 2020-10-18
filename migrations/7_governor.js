const GovernorAlpha = artifacts.require("GovernorAlpha");
const config = require("./config.json");

module.exports = async function(deployer, network, accounts) {
  if (network === 'mainnet') {
    await deployer.deploy(GovernorAlpha, config.timelock, config.ausc);
    await GovernorAlpha.deployed();
  }
};

