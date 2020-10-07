//const UFragments = artifacts.require("UFragments");
const YAM = artifacts.require("YAM");
const MockMonetaryPolicy = artifacts.require("MockMonetaryPolicy");

contract.only("UFramegments Test", function (accounts) {
  const owner = accounts[0];
  const name = "AUSCM";
  const symbol = "AUSC";
  const supply = "30000000";
  const decimalZeroes = "000000000000000000";
  let fragments;

  describe("Basic initialization", function () {
    beforeEach(async function () {
      fragments = await YAM.new({ from: owner });
      await fragments.initialize(name, symbol, 18, owner, supply + decimalZeroes);
    });

    it("symbol and decimals are correct after initialization", async function () {
      assert.equal(await fragments.decimals(), 18);
      assert.equal(await fragments.name(), "AUSCM");
      assert.equal(await fragments.symbol(), "AUSC");
      assert.equal(await fragments.totalSupply(), supply + decimalZeroes);
      assert.equal(await fragments.balanceOf(owner), supply + decimalZeroes);
    });
  });

  describe("Rebasing", function () {
    let monetaryPolicy;

    beforeEach(async function () {
      //fragments = await UFragments.new({ from: owner });
      fragments = await YAM.new({ from: owner });
      await fragments.initialize(name, symbol, 18, owner, supply + decimalZeroes);
      // await fragments.initialize(name, symbol, owner);
      monetaryPolicy = await MockMonetaryPolicy.new(fragments.address);
      await fragments._setRebaser(monetaryPolicy.address, {
      //await fragments.setMonetaryPolicy(monetaryPolicy.address, {
        from: owner,
      });
    });

    it("setting monetary policy", async function () {
      // assert.equal(await fragments.monetaryPolicy(), monetaryPolicy.address);
      assert.equal(await fragments.rebaser(), monetaryPolicy.address);
    });

    it("positive rebase", async function () {
      await monetaryPolicy.setAUSCPrice(20);
      await monetaryPolicy.setAUXPrice(10);
      await monetaryPolicy.recordPrice();
      await monetaryPolicy.rebase();
      const twice = "60000000";
      console.log((await fragments.totalSupply()).toString());
      assert.equal(await fragments.totalSupply(), twice + decimalZeroes);
      assert.equal(await fragments.balanceOf(owner), twice + decimalZeroes);
    });

    it("negative rebase", async function () {
      await monetaryPolicy.setAUSCPrice(10);
      await monetaryPolicy.setAUXPrice(20);
      await monetaryPolicy.recordPrice();
      await monetaryPolicy.rebase();
      const half = "15000000";
      assert.equal(await fragments.totalSupply(), half + decimalZeroes);
      assert.equal(await fragments.balanceOf(owner), half + decimalZeroes);
    });
  });
});
