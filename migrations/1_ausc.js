const AUSC = artifacts.require("AUSC");

module.exports = async function(deployer, network, accounts) {
  if (network === 'mainnet') {
    await deployer.deploy(AUSC);
    await AUSC.deployed();
  }
};

