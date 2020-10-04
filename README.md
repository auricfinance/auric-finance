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
be called by smart contracts. The testnet deployment uses a mock oracle where
prices can be set manually.

The monetary policy provides another public method for invoking a rebase.
The rebase will trigger if the prices differ by more than 5%. This way,
the rebasing mechanism is fully decentralized. 

The rewards pool is a clone of the SNX rewards pool. The pool cannot handle
rebasing assets. The most suitable solution is to distribute AUSC in the form
of Uniswap LP tokens. Those tokens do not rebase, and AUSC can be unwrapped
from them. These tokens are not available on testnet, therefore we have
a mock LP token with a fixed supply.

Governance is not implemented. It requires some clarifications.

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
