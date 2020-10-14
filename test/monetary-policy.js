const { time } = require("@openzeppelin/test-helpers");
const MockMonetaryPolicy = artifacts.require("MockMonetaryPolicy");
const AUSC = artifacts.require("AUSC");

contract("Monetary Policy Test", function (accounts) {
  const owner = accounts[0];
  const treasury = accounts[1];
  const name = "AUSCM";
  const symbol = "AUSC";
  const supply = "30000000";
  const decimalZeroes = "000000000000000000";
  let ausc;
  let monetaryPolicy;

  describe("Average computation test", function () {

    beforeEach(async function () {
      ausc = await AUSC.new({ from: owner });
      await ausc.initialize(name, symbol, 18, owner, supply + decimalZeroes);
      monetaryPolicy = await MockMonetaryPolicy.new(ausc.address, treasury);
      await ausc._setRebaser(monetaryPolicy.address, {
        from: owner,
      });
    });

    it("running average constant, no time waiting", async function () {
      await monetaryPolicy.setAUSCPrice(20);
      await monetaryPolicy.setAUXPrice(10);
      for (let i = 0; i < 25; i++) {
        await monetaryPolicy.recordPrice();
      }
      assert.equal(await monetaryPolicy.averageAUSC(), "0");
      assert.equal(await monetaryPolicy.averageAUX(), "0");
      assert.equal(await monetaryPolicy.pendingAUSCPrice(), "20");
      assert.equal(await monetaryPolicy.pendingAUXPrice(), "10");
      assert.equal(await monetaryPolicy.counter(), "0");
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
      // the first time was just setting pending values
      assert.equal(await monetaryPolicy.counter(), "23");
    });

    it("moving the window, with time waiting", async function () {
      await monetaryPolicy.setAUSCPrice(10);
      await monetaryPolicy.setAUXPrice(10);
      await monetaryPolicy.recordPrice();
      // first round only sets the pending price
      assert.equal(await monetaryPolicy.averageAUSC(), "0");
      assert.equal(await monetaryPolicy.averageAUX(), "0");
      for (let i = 0; i < 12; i++) {
        time.increase(3600);
        await monetaryPolicy.recordPrice();
      }
      // now we have a pending price 10/10
      await monetaryPolicy.setAUSCPrice(130);
      await monetaryPolicy.setAUXPrice(34);
      time.increase(3600);
      await monetaryPolicy.recordPrice();
      // no now we have a pending price 130/34
      time.increase(3600);
      await monetaryPolicy.recordPrice();
      // no now we have a pending price 130/34, and it was once projected
      assert.equal(await monetaryPolicy.averageAUSC(), "20");
      assert.equal(await monetaryPolicy.averageAUX(), "12");
    });
  });
});
