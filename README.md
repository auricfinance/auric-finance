# Auric Network Smart Contracts

## Functionality Brief

### Token
The main token contract is AUSC cloned from YAMv3 (who cloned from Compound). 
The token is an ERC20 token with rebasing functionality which additionally 
inherits governance features. The token should have an initial fixed supply
of 30,000,000 tokens. From this moment onwards, the supply will be regulated
by rebases matching the price of the token to the price of gold. The tokens
is burnable giving the users the option to burn their tokens. The burnability
must reduce the total supply of the tokens for the rebasing to be able to 
operate properly. Transfers to 0x0 address are forbidden. The token has
18 decimal places. The token is mintable. The rebaser and governance can mint
new tokens. The new tokens are subjected to rebases in the next rebasing rounds.

### Rebasing

The governance then can set the rebaser. The rebaser is the only address allowed to
initiate a rebase. The current implementation provides a rebaser called BasicMonetaryPolicy
that uses oracles to checkpoint price every hour, and maintains a running average price
of gold (XAU) and AUSC. If the price of AUSC diverts by more than 5% from XAU, anyone
externally owned account can initiate a rebase through this smart contract. The
restriction to exteranlly owned accounts is made to avoid possible market manipulations
(e.g. by flashloans) as the price of AUSC is to be taken from DEXes such as Uniswap.
The price of XAU is to be taken from Chainlink's oracle. The BasicMonetaryPolicy is
an abstract smart contract, i.e., it does not implement the functions for reading
the price from Uniswap and Chainlink. For the purposes of the audit, assume that the 
monetary policy used in production implements the two abstract functions and intergates
with both protocols correctly. For the testing purposes and demonstration of the
inteded functionality, the implementation provides a MockMonetaryPolicy which is used in tests.

To further reduce the market manipulation options, rebases driven by the BasicMonetaryPolicy
take into account prices of up to 1 hours ago. Therefore, prices are stored as pending
and projected into the running average 1 hour after. Thus, the contract will incur one hour
of a warm up period after the deployment. 

Both the price checkpointing method and rebase are triggered with every token ERC20
action with AUSC, but only if the action is performed by an externally owned account.
The monetary policy ensures that price checkpoint is recorded at most once every hour, and 
rebase occurs once every 24 hours at most. Given these triggers, a rebaser cannot be
an externally owned account. It if ever becomes an externally owned account, the transfers
of the token will start failing. 

On a negative rebase (a debase), the supply of the token decreases, and so does the
balance in users' accounts. On a positive rebase, the total supply increases, and so does
the balance in user's accounts, however, 10% of the supply increase is deducted and minted
to so-called secondary rewards pool (refer to distribution for more context).

### Distribution

The distribution happens through an SNX pool with a standard implementation, but the
potential overflow error fixed. The contract is called AuricRewards.As the pool implementation 
maintains state, it cannot work with rebasing assets. Therefore, the implementation works
with a two-tiered system. The pool itself will be distributing a placeholder token with
fixed supply, no rebase functionality, and no value. This token will be used for the state
of the pool to match the accounting. Additionally, the pool will be configured with an
escrow for the rebasing AUSC token, which does not maintain state. Upon withdrawal of the 
reward, the escrow will keep the placeholder token, and will transfer the AUSC token in
the correct proportion to the user.

Additionally, the withdrawal from the pool deduct 20% of the AUSC tokens and distributes
equally them among 4 specified accounts: a governance escrow, a security escrow, a DAO escrow,
and to the secondary rewards pool.

The numbers of tokens given by individual pools are driven by transferring the respective
numbers of tokens to the pool escrows. The intention is to distribute 56% of the initial
supply among these pools.

The secondary rewards pool is a rewards pool that can provide continous rewards to stakers.
It receives 5% of initial staking rewards, and 10% from every positive rebase. The pool
is also an SNX pool and follows the same ecsrow pattens for rebases. The address of the pool
is embedded in the rebaser, so it can change with rebaser changes.

### Governance

The governance is a clone of Compound's governance and consists of two parts. The first part
is counting votes that an account has. This part is embedded directly into the contract
through inheritance. Every account that wants to participate in governance should call function
delegate(address) on the AUSC token, which will checkpoint the number of votes that the account has.
The votes will be issued to the address provided as a parameter. Minting and transferring 
tokens ensures that votes are moved accordingly, creating new checkpoints whenever.

The proposing and voting is handled by a contract called GovernorAlpha. Any account
that holds at least 1% of all the tokens can make a proposal. A proposal consists of
a sequence of function calls, i.e., target contracts, target function signatures, parameters,
to be passed to those functions, and Ether values to be sent along. The governance proposal
is registered and can be voted on for 3 days. Each account has the voting power equivalent
to the number of votes it had when the proposal was registered. This means that voting
is not influenced by rebases that happen after the proposals are made.

Each account can make a vote, either for or against the proposal. At the end of the voting
period, the proposal either passes or not. The contracts have the capability of enforcing
a voting quorum, but as this often becomes an issue for on-chain governance, the quorum
is currently set to be 0%. The democratic principles of quorum are substituted for a long
enough window given to the parties to express their opinions (3 days at the moment).

If the vote passes, it is not immediately executed. Instead, it is passed enqueued inside
the TimeLock contract for some amount of time. All the participants of Auric Network
can see that the transaction is lined up for executing, and they can choose to exit
the network if they disagree with its effects. After the time lock expires, the transaction
can be executed. It is the intention for the timelock to become configured as the governance
contract on all the governable components. 

Governance principles can be changed if new governance is deployed on-chain, and the
current governance executes the trasfer of its governing power according to its own
governing principles that are currently in place.

### Deployment

**Token.** The only contract needed to be deployed for the token is AUSC. It
will be deployed by the main address that will have the right to intialize the 
contract, including setting the original governance. The intention is that the
governance will be the TimeLock contract, after the original configuration of
the platform concludes. When initializing the contract, the deployer specifies 
the governance. The governance then can use the minting feature to mint the 
initial supply of tokens to themsleves (intended to be 30,000,000).

**Distribution.** After the original 30,000,000 get minted, the owner will
create a Uniswap pool. It will deposit 44% of all tokens to the pool, matched
with Ether. The owner then intends to buy 50% of these tokens back at the market
price. The remaining 56% will be distributed into reward pool escrows. The owner
will deploy all the reward pools, their escrows, and placeholder tokens. The
owner will then transfer AUSC tokens to the escrows (giving the AUSC-ETH a 3x
multiplier), load the pools with the placeholder tokens, and notify to the pools
to activate the reward distribution.

A secondary reward pool will be deployed separately. The pool will have a very long
distribution interval (about 1 year). Thus, it will be distributing them very slowly. 
The escrow will be accepting tokens from all the other reward pools, and from the 
rebaser, whenever they become available as described above. The staking commodity will
ETH-AUSC Uniswap LP token, which is not subjected to rebases. A long position in the 
staking pool should give the taking participants an advantage as they will be entitled
to receive a portion of rewards from future rebases, and future staking rewards as they
are transferred to the escow. Since to stake had the form of Uniswap LP token, it is
not subjected to rebases.

The governance needs to be set for all escrows. The governance will be the timelock,
ensuring that the recipients of the endowments can be changed.

NOTE TO AUDITORS: Double check this principle. 

**Rebases.** Following the token deployment, the deployer deploys the MoneteryPolicy
connected to the Uniswap pool and the Chainlink XAU oracle. Rebasing will be activated
immediately, but the first rebase will not happen for the first 24 hours. The deployer will
set the rebaser, and will be able to do this as the governance is not configured yet.

**Governance.** To enable the governance, the deployer needs to deploy GovernorAlpha
and the TimeLock. The TimeLock needs to be set as a governor of the AUSC contract,
and then it immediately accept governace as it does not enforce time limits
before it is initialized. After this, the governor can be set inside the TimeLock,
and the GovernorAlpha can accept its governing role. From now on, the TimeLock will
be enforcing the rules.

TODO: Test rebases with other numbers as well, not only 1/2
TODO: Cleanup
TODO: Test burning

## Notes to Auditors

The code is greatly cloned from YAM and subsequently from Compound, and from SNX.
All the codebases had gone through audits before. The tests are focused on the functionality
that differs. Additional tests may arrive during the audit.

The main concern for the audit is to ensure that:

- The rewards are distributed correctly as the rebases happen
- The governance can happen regardless of rebases
- The secondary rewards design pool is not susceptible to attacks
- No market manipulation is possible to influence the rebase functionality

The audit should assume that the monetary policy is properly integrated with the Chainlink's
oracle and with Uniswap.


## Goerli Deployment (Outdated)

1. Test LP Token (AUSC LP UNI V2):  0xee45ff229cb500bf35f72d2e4f795e9efef5855c
2. AUSC(M) Token: 0xC366BdbDdAE86202f34324623AFD61f87502d56B
3. Auric Rewards SNX Pool: 0x7c239712cf362f031e31a8740ce5623b6850f298
4. Monetary Policy: 0x31bf3af523409205437bfb1b15ecfb8d56521655

## Development instructions

1. Clone the repository
2. Use `npm install` to install the dependencies
3. Use `npx truffle build` to build the smart contracts and produce ABI
4. Use `npx ganache-cli` and from different terminla `npm t` to run tests
5. Use `npm run test-cov` to run test coverage
