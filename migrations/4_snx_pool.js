const AuricRewards = artifacts.require("AuricRewards");
const config = require("./config.json");

module.exports = async function(deployer, network, accounts) {
  if (network === 'mainnet') {
    await deployer.deploy(AuricRewards, config.escrowToken, config.usdc);
    await AuricRewards.deployed();
  }
};

