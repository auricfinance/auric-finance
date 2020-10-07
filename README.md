# Auric Network Smart Contracts

## Functionality Brief

The main token contract is UFragments cloned from Based Money (who cloned
from Ampleforth). The contract will be deployed by the main address that 
will become the deployer and will have the right to intialize the contract.
When initializing the contract, the deployer specifies the owner who receives
the entire initial supply of tokens, which is set to be 30,000,000.

The owner then can set monetary policy. The monetary policy is allowed
to initiate rebases. The implemented monetary policy uses a decentralized
oracle to record prices of AUX and AUSC. The price of AUSC will be taken
from Uniswap. The price of AUX will be taken from Chainlink's oracle.
The policy records the price at most once every hour. The method for recording
the price is public, but in order to avoid market data manipulation, it cannot
be called by smart contracts. The method is also hooked up to the token contract
itself. If a transaction is invoked by an externally owned account, then it will
attempt to create the price checkpoint on the oracle.
The testnet deployment uses a mock oracle where prices can be set manually.

The monetary policy provides another public method for invoking a rebase.
The rebase will trigger if the prices differ by more than 5%, at most once per day. 
This way, the rebasing mechanism is fully decentralized. Additionally, the
rebase is linked with any smart contract actions on the token itself. If the
token transaction is initiated by an externally owned account and rebase should 
happen (last rebase was 24 hours ago, and the price differs), the token will trigger
the rebase via the monetary policy. 

TODO: Add rebase hook to the token
TODO: Add rebase at most once per day
TODO: Make the rebase read data at most 1 hour ago
TODO: Add price recording to token txs

The rewards pool is a clone of the SNX rewards pool. The pool cannot handle
rebasing assets. Therefore, the pool will be distributing a placeholder token
with a fixed supply, and there will be a gateway placed in front of the pool itself
which will convert placeholder tokens to AUSC and hand those over to the user.
Visually, the user will not even know that some placeholder tokens exist.

TODO: Create a gateway for the SNX pool.

The configuration will consist of the set of 15 (to be clarified) SNX pools, which
will be incentivized with 56% of all AUSC tokens (indirectly, via gateways). The tokens
to stake will be either ERC20 tokens that do not rebase (the full list is pending),
or UNI LP tokens for assets that do rebase (Ampleforth, YAM, etc.). The remaining
44% will be transferred to a Uniswap pool, bound to Ether at ~$0.01 per token. This will
produce UNI V2 LP tokens, which should be escrowed in an external service.

On a positive rebase, some fixed percentage XX of the rebase value should be given to specific
addresses managed by the governance. This can be achieved by the rebase approach used 
by YAMv3. This contract record balances in fractional units, and scales them by a scaling
factor. On the positive rebase, the scaling factor increase will be reduced by XX percent.
Instead of increasing the factor by the full percentage, the specified addresses will be
issued fractional units to receive the XX percent. 

TODO: Switch from Based to YAMv3 contract: https://github.com/yam-finance/yamV3/blob/master/contracts/token/YAM.sol
TODO: Test rebases with other numbers as well, not only 1/2
TODO: Cleanup

Governance is not implemented yet. It will have the privileges of an owner, i.e., the
ownership will be transferred to the governance contract, and if votes pass,
the governance will be able to make appropriate calls.

TODO: Use YAM governance https://github.com/yam-finance/yamV3/blob/master/contracts/token/YAMGovernance.sol

## Launch

The following steps will need to be made for the launch:

1. Deploy the AUSC token with initial supply 30,000,000.
2. Create the AUSC/ETH Uniswap pool with 44% tokens and ETH equivalent of $0.01 per token.
   Lock the LP tokens in some time-lock service.
3. Market buy the AUSC tokens at the market price.
4. Deploy and configure monetary policy and the price oracle refencing the Uniswap pool.
5. Deploy gateways to each SNX pool, and bind them to placeholder tokens.
6. Take the 56% of the AUSC tokens and bind them to the respective gateways and placeholder tokens. 
7. Load the AUSC tokens to the gateways, and the placehoder tokens to the pools, with the AUSC/ETH 
   pool getting 3x multiplier on the reward.
8. Open the website for public staking. Pools that start distributing rewards before having a stake
   will lock the tokens forever. 
9. Notify the pools that stakes are available and rewards should be distributed.
10. Deploy governance and transfer token ownership (this can be done earlier in the process).




## Goerli Deployment

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
