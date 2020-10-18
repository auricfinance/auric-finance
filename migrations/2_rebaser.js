const Rebaser = artifacts.require("Rebaser");
const config = require("./config.json");

module.exports = async function(deployer, network, accounts) {
  if (network === 'mainnet') {
    console.log(config.ausc, config.secondaryPool);
    await deployer.deploy(Rebaser, config.ausc, config.secondaryPool);
    await Rebaser.deployed();
  }
};

