const PoolEscrow = artifacts.require("PoolEscrow");
const config = require("./config.json");

module.exports = async function(deployer, network, accounts) {
  if (network === 'mainnet') {
    await deployer.deploy(PoolEscrow, config.escrowToken, config.pool, config.ausc, config.secondaryPool, config.development, config.governance, config.dao );
    await PoolEscrow.deployed();
  }
};

