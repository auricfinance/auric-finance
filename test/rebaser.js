const { time } = require("@openzeppelin/test-helpers");
const MockRebaser = artifacts.require("MockRebaser");
const AUSC = artifacts.require("AUSC");

contract("Monetary Policy Test", function (accounts) {
  const owner = accounts[0];
  const treasury = accounts[1];
  const name = "AUSCM";
  const symbol = "AUSC";
  const supply = "30000000";
  const decimalZeroes = "000000000000000000";
  let ausc;
  let rebaser;

  describe("Average computation test", function () {

    beforeEach(async function () {
      ausc = await AUSC.new({ from: owner });
      await ausc.initialize(name, symbol, 18, owner, supply + decimalZeroes);
      rebaser = await MockRebaser.new(ausc.address, treasury);
      await ausc._setRebaser(rebaser.address, {
        from: owner,
      });
    });

    it("running average constant, no time waiting", async function () {
      await rebaser.setAUSCPrice(20);
      await rebaser.setXAUPrice(10);
      for (let i = 0; i < 25; i++) {
        await rebaser.recordPrice();
      }
      assert.equal(await rebaser.averageAUSC(), "0");
      assert.equal(await rebaser.averageXAU(), "0");
      assert.equal(await rebaser.pendingAUSCPrice(), "20");
      assert.equal(await rebaser.pendingXAUPrice(), "10");
      assert.equal(await rebaser.counter(), "0");
    });

    it("running average constant, with time waiting", async function () {
      await rebaser.setAUSCPrice(20);
      await rebaser.setXAUPrice(10);
      for (let i = 0; i < 24; i++) {
        await rebaser.recordPrice();
        await time.increase(3600);
      }
      assert.equal(await rebaser.averageAUSC(), "20");
      assert.equal(await rebaser.averageXAU(), "10");
      // the first time was just setting pending values
      assert.equal(await rebaser.counter(), "23");
    });

    it("moving the window, with time waiting", async function () {
      await rebaser.setAUSCPrice(10);
      await rebaser.setXAUPrice(10);
      await rebaser.recordPrice();
      // first round only sets the pending price
      assert.equal(await rebaser.averageAUSC(), "0");
      assert.equal(await rebaser.averageXAU(), "0");
      for (let i = 0; i < 12; i++) {
        time.increase(3600);
        await rebaser.recordPrice();
      }
      // now we have a pending price 10/10
      await rebaser.setAUSCPrice(130);
      await rebaser.setXAUPrice(34);
      time.increase(3600);
      await rebaser.recordPrice();
      // no now we have a pending price 130/34
      time.increase(3600);
      await rebaser.recordPrice();
      // no now we have a pending price 130/34, and it was once projected
      assert.equal(await rebaser.averageAUSC(), "20");
      assert.equal(await rebaser.averageXAU(), "12");
    });
  });
});
