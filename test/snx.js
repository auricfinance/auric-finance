const { time } = require("@openzeppelin/test-helpers");
const AUSC = artifacts.require("AUSC");
const PoolEscrow = artifacts.require("PoolEscrow");
const TestToken = artifacts.require("TestToken");
const EscrowToken = artifacts.require("EscrowToken");
const AuricRewards = artifacts.require("AuricRewards");

contract("Rewards Test", function (accounts) {
  const owner = accounts[0];
  const notifier = accounts[1];
  const secondary = accounts[2];
  const name = "AUSCM";
  const symbol = "AUSC";
  const supply = "30000000";
  const halfSupply = "15000000";
  const decimalZeroes = "000000000000000000";
  let ausc;
  let lp;
  let escrowToken;
  let poolEscrow;
  let pool;

  describe("Basic initialization", function () {
    beforeEach(async function () {
      escrowToken = await EscrowToken.new({ from : owner});
      ausc = await AUSC.new({ from: owner });
      await ausc.initialize(name, symbol, 18, owner, supply + decimalZeroes);
      lp = await TestToken.new({ from: owner });
      await lp.mint(owner, supply + decimalZeroes, {from: owner});
      pool = await AuricRewards.new(escrowToken.address, lp.address, {
        from: owner,
      });
      poolEscrow = await PoolEscrow.new(escrowToken.address, pool.address, ausc.address, secondary, secondary, secondary, secondary);
      await ausc.transfer(poolEscrow.address, supply + decimalZeroes, {
        from: owner,
      });
    });

    it("set rewards distribution", async function () {
      await pool.setRewardDistribution(notifier, { from: owner });
      assert.equal(await pool.rewardDistribution(), notifier);
    });

    it("set escrow", async function () {
      await pool.setRewardDistribution(notifier, { from: owner });
      assert.equal(await pool.rewardDistribution(), notifier);
      await pool.setEscrow(poolEscrow.address, { from: owner });
      assert.equal(await pool.escrow(), poolEscrow.address);
    });

    it("transfer and notify", async function () {
      await pool.setRewardDistribution(notifier, { from: owner });
      await pool.setEscrow(poolEscrow.address, { from: owner });
      assert.equal(await pool.escrow(), poolEscrow.address);
      await escrowToken.transfer(pool.address, supply + decimalZeroes, {
        from: owner,
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
      assert.isTrue((await ausc.balanceOf(owner)).toString() > "0");
    });

    it("double notify", async function () {
      await pool.setRewardDistribution(notifier, { from: owner });
      await pool.setEscrow(poolEscrow.address, { from: owner });
      assert.equal(await pool.escrow(), poolEscrow.address);
      await escrowToken.transfer(pool.address, supply + decimalZeroes, {
        from: owner,
      });
      await pool.notifyRewardAmount(halfSupply + decimalZeroes, { from: notifier });
      await pool.notifyRewardAmount(halfSupply + decimalZeroes, { from: notifier });
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
      console.log((await pool.earnedAusc(owner)).toString());
      await pool.exit({from: owner});
      assert.isTrue((await ausc.balanceOf(owner)).toString() > "0");

    });
  });
});
