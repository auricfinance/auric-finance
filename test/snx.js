const { time } = require("@openzeppelin/test-helpers");
const UFragments = artifacts.require("UFragments");
const AuricRewards = artifacts.require("AuricRewards");

contract("Rewards Test", function (accounts) {
  const owner = accounts[0];
  const notifier = accounts[1];
  const name = "AUSCM";
  const symbol = "AUSC";
  const supply = "30000000";
  const decimalZeroes = "000000000000000000";
  let fragments;
  let lp;
  let pool;

  describe("Basic initialization", function () {
    beforeEach(async function () {
      fragments = await UFragments.new({ from: owner });
      await fragments.initialize(name, symbol, owner);
      lp = await UFragments.new({ from: owner });
      await lp.initialize(name, symbol, owner);
      pool = await AuricRewards.new(fragments.address, lp.address, {
        from: owner,
      });
      await fragments.transfer(notifier, supply + decimalZeroes, {
        from: owner,
      });
    });

    it("set rewards distribution", async function () {
      await pool.setRewardDistribution(notifier, { from: owner });
      assert.equal(await pool.rewardDistribution(), notifier);
    });

    it("transfer and notify", async function () {
      await pool.setRewardDistribution(notifier, { from: owner });
      await fragments.transfer(pool.address, supply + decimalZeroes, {
        from: notifier,
      });
      await pool.notifyRewardAmount(supply + decimalZeroes, { from: notifier });
      const stake = "10000";
      await lp.approve(pool.address, stake, { from: owner });
      await pool.stake(stake, { from: owner });
      let previous = "0";
      for (let i = 0; i < 3; i++) {
        await time.increase(3600);
        let earned = await pool.earned(owner, { from: owner });
        assert.isTrue(earned.toString() > previous);
        previous = earned.toString();
      }
      await pool.exit({from: owner});
      assert.isTrue((await fragments.balanceOf(owner)).toString() > "0");
    });
  });
});
