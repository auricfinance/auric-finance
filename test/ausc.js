const { expectRevert, time } = require("@openzeppelin/test-helpers");
const AUSC = artifacts.require("AUSC");
const MockRebaser = artifacts.require("MockRebaser");
const TestToken = artifacts.require("TestToken");
const TimeLock = artifacts.require("TimeLock");
const GovernorAlpha = artifacts.require("MockGovernorAlpha");

contract("AUSC Test", function (accounts) {
  const owner = accounts[0];
  const treasury = accounts[1];
  const name = "AUSCM";
  const symbol = "AUSC";
  const supply = "30000000";
  const half = "15000000";
  const decimalZeroes = "000000000000000000";
  const decimalNines = "999999999999999999";
  let ausc;

  describe("Basic initialization and other functions", function () {
    beforeEach(async function () {
      ausc = await AUSC.new({ from: owner });
      await ausc.initialize(name, symbol, 18, owner, supply + decimalZeroes);
    });

    it("symbol and decimals are correct after initialization", async function () {
      assert.equal(await ausc.decimals(), 18);
      assert.equal(await ausc.name(), "AUSCM");
      assert.equal(await ausc.symbol(), "AUSC");
      assert.equal(await ausc.totalSupply(), supply + decimalZeroes);
      assert.equal(await ausc.balanceOf(owner), supply + decimalZeroes);
      console.log((await ausc.balanceOfUnderlying(owner)).toString());
      console.log((await ausc.maxScalingFactor()).toString());
      assert.equal(await ausc.maxScalingFactor(), "3859736307910539847452366166956263595108999488");
      assert.equal(await ausc.balanceOfUnderlying(owner), "30000000000000000000000000000000");
    });

    it("ERC20 functions", async function () {
      await ausc.approve(treasury, "100", {from : owner});
      assert.equal(await ausc.allowance(owner, treasury), "100");
      await ausc.increaseAllowance(treasury, "100", {from : owner});
      assert.equal(await ausc.allowance(owner, treasury), "200");
      await ausc.decreaseAllowance(treasury, "10", {from : owner});
      assert.equal(await ausc.allowance(owner, treasury), "190");
      await ausc.transferFrom(owner, treasury, "90", {from : treasury});
      assert.equal(await ausc.balanceOf(treasury), "90");
      assert.equal(await ausc.allowance(owner, treasury), "100");
      await ausc.decreaseAllowance(treasury, "100000", {from : owner});
      assert.equal(await ausc.allowance(owner, treasury), "0");
    });

    it("Minting and burning", async function () {
      assert.equal(await ausc.balanceOf(owner), supply + decimalZeroes);
      await ausc.burn(half + decimalZeroes, {from : owner});
      assert.equal(await ausc.balanceOf(owner), half + decimalZeroes);
      assert.equal(await ausc.totalSupply(), half + decimalZeroes);
    });

    it("token rescue by governance", async function () {
      const token = await TestToken.new({ from: owner });
      await token.mint(ausc.address, supply + decimalZeroes, {from: owner});
      await expectRevert(
	ausc.rescueTokens(token.address, owner, supply + decimalZeroes, {from : treasury}),
        "only governance"
      );
      await ausc.rescueTokens(token.address, owner, supply + decimalZeroes, {from : owner});
      assert.equal(await token.balanceOf(owner), supply + decimalZeroes);
    });

    it("changing governance", async function () {
      await expectRevert(
        ausc._setPendingGov(treasury, {from : treasury}),
        "only governance"
      );
      await expectRevert(
        ausc._acceptGov({from : treasury}),
        "!pending"
      );
      await ausc._setPendingGov(treasury, {from : owner});
      assert.equal(await ausc.gov(), owner);
      await ausc._acceptGov({from : treasury}),
      assert.equal(await ausc.gov(), treasury);
    });
  });

  describe("Rebasing", function () {
    let rebaser;

    beforeEach(async function () {
      ausc = await AUSC.new({ from: owner });
      await ausc.initialize(name, symbol, 18, owner, supply + decimalZeroes);
      rebaser = await MockRebaser.new(ausc.address, treasury);
      await ausc._setRebaser(rebaser.address, {
        from: owner,
      });
    });

    it("setting monetary policy", async function () {
      assert.equal(await ausc.rebaser(), rebaser.address);
    });

    it("positive rebase", async function () {
      await rebaser.setAUSCPrice(20);
      await rebaser.setXAUPrice(10);
      await rebaser.recordPrice();
      // increase time to get the pending price projected
      // and to get rebase after 24 hours
      await time.increase(24 * 3600);
      await rebaser.recordPrice();
      await rebaser.rebase();
      const twice = "60000000";
      const ownerBalance = "57000000";
      const treasuryBudget = "2999999"; // -1 rounding error
      // console.log((await ausc.totalSupply()).toString());
      // console.log((await ausc.balanceOf(owner)).toString());
      // console.log((await ausc.balanceOf(treasury)).toString());
      assert.equal(await ausc.totalSupply(), twice + decimalZeroes);
      assert.equal(await ausc.balanceOf(owner), ownerBalance + decimalZeroes);
      assert.equal(await ausc.balanceOf(treasury), treasuryBudget + decimalNines);
    });

    it("negative rebase", async function () {
      await rebaser.setAUSCPrice(10);
      await rebaser.setXAUPrice(20);
      await rebaser.recordPrice();
      // increase time to get the pending price projected
      // and to get rebase after 24 hours
      await time.increase(24 * 3600);
      await rebaser.recordPrice();
      await rebaser.rebase();
      const half = "15000000";
      assert.equal(await ausc.totalSupply(), half + decimalZeroes);
      assert.equal(await ausc.balanceOf(owner), half + decimalZeroes);
      assert.equal(await ausc.balanceOf(treasury), 0);
    });

    it("no rebase", async function () {
      await ausc._setRebaser(owner, {
        from: owner,
      });
      await ausc.rebase(0, 0, true, {from: owner});
      assert.equal(await ausc.totalSupply(), supply + decimalZeroes);
      assert.equal(await ausc.balanceOf(owner), supply + decimalZeroes);
      assert.equal(await ausc.balanceOf(treasury), 0);
    });
  });

  describe("Governance", function () {

    let rebaser;

    beforeEach(async function () {
      ausc = await AUSC.new({ from: owner });
      await ausc.initialize(name, symbol, 18, owner, supply + decimalZeroes);
      rebaser = await MockRebaser.new(ausc.address, treasury);
      await ausc._setRebaser(rebaser.address, {
        from: owner,
      });
    });

    it("votes", async function () {
      let long30 = "30000000000000000000000000000000";

      await ausc.delegate(owner, { from : owner });
      //assert.equal(await ausc.getCurrentVotes(owner), long30);
      await ausc.transfer(treasury, supply + decimalZeroes);
      //assert.equal(await ausc.getCurrentVotes(owner), "0");
      await ausc.delegate(treasury, {from : treasury});
      //assert.equal(await ausc.getCurrentVotes(treasury), long30);

      console.log((await ausc.getCurrentVotes(treasury)).toString());
      await rebaser.setAUSCPrice(20);
      await rebaser.setXAUPrice(10);
      await rebaser.recordPrice();
      await rebaser.rebase();

      console.log((await ausc.balanceOf(treasury)).toString());
      console.log((await ausc.getCurrentVotes(treasury)).toString());
      console.log((await ausc.balanceOfUnderlying(owner)).toString());
      console.log((await ausc.getCurrentVotes(owner)).toString());
      await ausc.delegate(treasury, {from : treasury});
      console.log((await ausc.getCurrentVotes(treasury)).toString());
    });

    it("complex governace", async function () {
      // Goal: AUSC rebaser change
      // 0. Deploy and configure timelock + governance
      // 1. Deploy new rebaser (a new monetary policy)
      // 2. Give 40% votes to owner, 60% goest to treasury
      // 3. Both parties call delegate to themselves
      // 4. Treasury makes a proposal
      // 5. Treasury votes for, owner votes against
      // 6. Vote passes and gets executed through timelock

      timelock = await TimeLock.new( {from : owner});
      await ausc._setPendingGov(timelock.address, {from: owner});
      await timelock.executeTransaction(ausc.address, "0", "_acceptGov()", "0x", 0);
      assert.equal(await ausc.gov(), timelock.address); 
      governorAlpha = await GovernorAlpha.new(timelock.address, ausc.address);
      await timelock.setPendingAdmin(governorAlpha.address, {from : owner});
      assert.isTrue(await timelock.admin_initialized()); 
      await governorAlpha.__acceptAdmin({from : owner});
      assert.equal(await timelock.admin(), governorAlpha.address); 

      const rebaser = await MockRebaser.new(ausc.address, treasury);
      await expectRevert(ausc._setRebaser(rebaser.address, {
        from: owner,
      }), "only governance"
      );
      
      const percent60 = "18000000" + decimalZeroes;
      await ausc.transfer(treasury, percent60, {from : owner});
      await ausc.delegate(treasury, {from : treasury});
      await ausc.delegate(owner, {from : owner});
      console.log((await ausc.getCurrentVotes(owner)).toString());
      console.log((await ausc.getCurrentVotes(treasury)).toString());

      await governorAlpha.propose([ausc.address], ["0"], ["_setRebaser(address)"], [web3.eth.abi.encodeParameter("address", rebaser.address)], "sets new rebaser", {from : treasury});
      console.log((await governorAlpha.state(1)).toString());
      await time.advanceBlock();
      await time.advanceBlock();
      console.log((await governorAlpha.state(1)).toString());
      await governorAlpha.castVote(1, true, {from : treasury});
      await governorAlpha.castVote(1, false, {from : owner});
      console.log((await governorAlpha.state(1)).toString());
      await time.advanceBlockTo(100 + parseInt(await time.latestBlock()));
      console.log((await governorAlpha.state(1)).toString());

      await governorAlpha.queue(1, {from : owner});
      console.log((await governorAlpha.state(1)).toString());
      await time.increase(24 * 3600);
      console.log((await governorAlpha.state(1)).toString());
      await governorAlpha.execute(1, {from : treasury});
      console.log((await governorAlpha.state(1)).toString());

      assert.equal(await ausc.rebaser(), rebaser.address);
    });
  });

});
