const { time } = require("@openzeppelin/test-helpers");
const UFragments = artifacts.require("UFragments");
const MockMonetaryPolicy = artifacts.require("MockMonetaryPolicy");

contract("Monetary Policy Test", function (accounts) {
  const owner = accounts[0];
  const name = "AUSCM";
  const symbol = "AUSC";
  const supply = "30000000";
  const decimalZeroes = "000000000000000000";
  let fragments;
  let monetaryPolicy;

  describe("Average computation test", function () {

    beforeEach(async function () {
      fragments = await UFragments.new({ from: owner });
      await fragments.initialize(name, symbol, owner);
      monetaryPolicy = await MockMonetaryPolicy.new(fragments.address);
      await fragments.setMonetaryPolicy(monetaryPolicy.address, {
        from: owner,
      });
    });

    it("running average constant, no time waiting", async function () {
      await monetaryPolicy.setAUSCPrice(20);
      await monetaryPolicy.setAUXPrice(10);
      for (let i = 0; i < 24; i++) {
        await monetaryPolicy.recordPrice();
      }
      assert.equal(await monetaryPolicy.averageAUSC(), "20");
      assert.equal(await monetaryPolicy.averageAUX(), "10");
      assert.equal(await monetaryPolicy.counter(), "1");
    });

    it("running average constant, with time waiting", async function () {
      await monetaryPolicy.setAUSCPrice(20);
      await monetaryPolicy.setAUXPrice(10);
      for (let i = 0; i < 24; i++) {
        await monetaryPolicy.recordPrice();
        await time.increase(3600);
      }
      assert.equal(await monetaryPolicy.averageAUSC(), "20");
      assert.equal(await monetaryPolicy.averageAUX(), "10");
      assert.equal(await monetaryPolicy.counter(), "24");
    });

    it("moving the window, with time waiting", async function () {
      await monetaryPolicy.setAUSCPrice(10);
      await monetaryPolicy.setAUXPrice(10);
      for (let i = 0; i < 12; i++) {
        await monetaryPolicy.recordPrice();
        time.increase(3600);
      }
      await monetaryPolicy.setAUSCPrice(130);
      await monetaryPolicy.setAUXPrice(34);
      await monetaryPolicy.recordPrice();
      assert.equal(await monetaryPolicy.averageAUSC(), "20");
      assert.equal(await monetaryPolicy.averageAUX(), "12");
    });
  });
});
