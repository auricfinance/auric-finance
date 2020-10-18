const EscrowToken = artifacts.require("EscrowToken");
const config = require("./config.json");

module.exports = async function(deployer, network, accounts) {
  if (network === 'mainnet') {
    await deployer.deploy(EscrowToken);
    await EscrowToken.deployed();
  }
};

