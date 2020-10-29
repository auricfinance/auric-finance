const { time, expectRevert } = require("@openzeppelin/test-helpers");
const AUSC = artifacts.require("AUSC");
const PoolEscrow = artifacts.require("PoolEscrow");
const TestToken = artifacts.require("TestToken");
const EscrowToken = artifacts.require("EscrowToken");
const SecondaryEscrowToken = artifacts.require("SecondaryEscrowToken");
const AuricRewards = artifacts.require("AuricRewards");

contract("Rewards Test", function (accounts) {
  const owner = accounts[0];
  const notifier = accounts[1];
  const secondary = accounts[2];
  const name = "AUSCM";
  const symbol = "AUSC";
  const supply = "30000000";
  const halfSupply = "15000000";
  const one = "1";
  const decimalZeroes = "000000000000000000";
  let ausc;
  let lp;
  let escrowToken;
  let secondaryEscrowToken;
  let poolEscrow;
  let secondaryEscrow;
  let pool;
  let secondaryPool;

  describe("Basic initialization", function () {
    beforeEach(async function () {
      escrowToken = await EscrowToken.new({ from: owner });
      ausc = await AUSC.new({ from: owner });
      await ausc.initialize(name, symbol, 18, owner, supply + decimalZeroes);
      lp = await TestToken.new({ from: owner });
      await lp.mint(owner, supply + decimalZeroes, { from: owner });
      pool = await AuricRewards.new(escrowToken.address, lp.address, {
        from: owner,
      });
      poolEscrow = await PoolEscrow.new(
        escrowToken.address,
        pool.address,
        ausc.address,
        secondary,
        secondary,
        secondary,
        secondary,
        { from: owner }
      );
      await ausc.transfer(poolEscrow.address, supply + decimalZeroes, {
        from: owner,
      });
      secondaryEscrowToken = await SecondaryEscrowToken.new({ from: owner });
      secondaryPool = await AuricRewards.new(
        escrowToken.address,
        secondaryEscrowToken.address,
        {
          from: owner,
        }
      );
      secondaryEscrow = await PoolEscrow.new(
        secondaryEscrowToken.address,
        secondaryPool.address,
        ausc.address,
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
        { from: owner }
      );
      await secondaryPool.setRewardDistribution(secondaryEscrow.address, {from : owner});
      await secondaryEscrowToken.addMinter(
        secondaryEscrow.address,
        { from: owner }
      );
      await poolEscrow.setSecondary(secondaryEscrow.address, { from: owner });
    });

    it("pool escrow setters", async function () {
      assert.equal(await poolEscrow.governance(), owner);
      assert.equal(await poolEscrow.governancePool(), secondary);
      assert.equal(await poolEscrow.dao(), secondary);
      assert.equal(await poolEscrow.development(), secondary);
      assert.equal(await poolEscrow.secondary(), secondaryEscrow.address);
      assert.equal(await poolEscrow.pool(), pool.address);
      assert.equal(await poolEscrow.shareToken(), escrowToken.address);
      assert.equal(await poolEscrow.ausc(), ausc.address);

      await expectRevert(
        poolEscrow.setSecondary(owner, { from: accounts[3] }),
        "only governance"
      );
      await poolEscrow.setSecondary(owner, { from: owner });
      assert.equal(await poolEscrow.secondary(), owner);

      await expectRevert(
        poolEscrow.setDao(owner, { from: accounts[3] }),
        "only governance"
      );
      await poolEscrow.setDao(owner, { from: owner });
      assert.equal(await poolEscrow.dao(), owner);

      await expectRevert(
        poolEscrow.setDevelopment(owner, { from: accounts[3] }),
        "only governance"
      );
      await poolEscrow.setDevelopment(owner, { from: owner });
      assert.equal(await poolEscrow.development(), owner);

      await expectRevert(
        poolEscrow.setGovernancePool(owner, { from: accounts[3] }),
        "only governance"
      );
      await poolEscrow.setGovernancePool(owner, { from: owner });
      assert.equal(await poolEscrow.governancePool(), owner);

      await expectRevert(
        poolEscrow.setGovernance(owner, { from: accounts[3] }),
        "only governance"
      );
      await poolEscrow.setGovernance(secondary, { from: owner });
      assert.equal(await poolEscrow.governance(), secondary);
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
      await pool.notifyRewardAmount(one + decimalZeroes, { from: notifier });
      const stake = "10000";
      await lp.approve(pool.address, stake, { from: owner });
      await pool.stake(stake, { from: owner });
      let previous = "0";
      for (let i = 0; i < 3; i++) {
        await time.increase(3);
        let earned = await pool.earned(owner, { from: owner });
        console.log(previous.toString());
        console.log(earned.toString());
        assert.isTrue(earned.toString() > previous);
        previous = earned.toString();
      }
      await time.increase(15 * 24 * 3600);
      await pool.exit({ from: owner });
      assert.isTrue((await ausc.balanceOf(owner)).toString() > "0");
      assert.isTrue(
        (await ausc.balanceOf(secondaryEscrow.address)).toString() > "0"
      );
      console.log(secondaryEscrowToken.address);
      console.log(secondaryPool.address);
      console.log(secondaryEscrow.address);
      console.log((await secondaryEscrowToken.balanceOf(secondaryPool.address)).toString());
      assert.isTrue(
        (
          await secondaryEscrowToken.balanceOf(secondaryPool.address)
        ).toString() > "0"
      );
    });

    it("double notify", async function () {
      await pool.setRewardDistribution(notifier, { from: owner });
      await pool.setEscrow(poolEscrow.address, { from: owner });
      assert.equal(await pool.escrow(), poolEscrow.address);
      await escrowToken.transfer(pool.address, supply + decimalZeroes, {
        from: owner,
      });
      await pool.notifyRewardAmount(one + decimalZeroes, {
        from: notifier,
      });
      await pool.notifyRewardAmount(one + decimalZeroes, {
        from: notifier,
      });
      const stake = "10000";
      await lp.approve(pool.address, stake, { from: owner });
      await pool.stake(stake, { from: owner });
      let previous = "0";
      for (let i = 0; i < 3; i++) {
        await time.increase(1);
        let earned = await pool.earned(owner, { from: owner });
        console.log(previous.toString());
        console.log(earned.toString());
        assert.isTrue(earned.toString() > previous.toString());
        previous = earned.toString();
      }
      await time.increase(15 * 24 * 3600);
      console.log((await pool.earnedAusc(owner)).toString());
      await pool.exit({ from: owner });
      assert.isTrue((await ausc.balanceOf(owner)).toString() > "0");
    });
  });
});
