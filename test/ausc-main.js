const { expectRevert, time } = require("@openzeppelin/test-helpers");
const AUSC = artifacts.require("AUSC");
const TimeLock = artifacts.require("TimeLock");
const GovernorAlpha = artifacts.require("GovernorAlpha");

contract.skip("Mainnet Governance Test", function (accounts) {

  describe("Mainnet Governance Test", function () {

    let config = { ausc : "0x1c7BBADc81E18F7177A95eb1593e5f5f35861B10",
      timelock : "0xf588903bcc1D6a9D13Fc624b2553479FEe8252d2",
      governor : "0x4f022d895E4cE277d0f54Db7e22660E528BfB5b4",
    }

    let ausc;
    let governor;
    let timelock;

    beforeEach(async function () {
      ausc = await AUSC.at(config.ausc);
      await ausc.mint(accounts[0], "400000" + "000000000000000000");
      governor = await GovernorAlpha.at(config.governor);
      timelock = await TimeLock.at(config.timelock);
      await ausc._setPendingGov(timelock.address);
      await timelock.executeTransaction(
        ausc.address,
        "0",
        "_acceptGov()",
        "0x",
        0
      );
      await timelock.setPendingAdmin(governor.address);
      await governor.__acceptAdmin();
    });

    it("votes", async function () {
      await ausc.delegate(accounts[0], { from: accounts[0] });
      await governor.propose(
        [ausc.address],
        [0],
        ["_setPendingGov(address)"],
        [web3.eth.abi.encodeParameter("address", accounts[0])],
        "sets new governance",
        { from: accounts[0] }
      );
      console.log((await governor.state(1)).toString());
      await time.advanceBlock();
      await time.advanceBlock();
      console.log((await governor.state(1)).toString());
      await governor.castVote(1, true, { from: accounts[0] });
      console.log((await governor.state(1)).toString());
      await time.advanceBlockTo(17281 + parseInt(await time.latestBlock()));
      console.log((await governor.state(1)).toString());

      await governor.queue(1, { from: accounts[0] });
      console.log((await governor.state(1)).toString());
      await time.increase(28 * 3600);
      console.log((await governor.state(1)).toString());
      await governor.execute(1, { from: accounts[0] });
      console.log((await governor.state(1)).toString());

      await ausc._acceptGov({from: accounts[0]});
    });
  });
});
