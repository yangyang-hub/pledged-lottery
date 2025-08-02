// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/YourContract.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @notice Mock ERC20 token for testing
 */
contract MockStakingToken is ERC20 {
    constructor() ERC20("StakingToken", "STAKE") {
        _mint(msg.sender, 1000000 * 10**18);
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * @notice Deploy script for PledgedLottery contract
 * @dev Inherits ScaffoldETHDeploy which:
 *      - Includes forge-std/Script.sol for deployment
 *      - Includes ScaffoldEthDeployerRunner modifier
 *      - Provides `deployer` variable
 * Example:
 * yarn deploy --file DeployYourContract.s.sol  # local anvil chain
 * yarn deploy --file DeployYourContract.s.sol --network optimism # live network (requires keystore)
 */
contract DeployYourContract is ScaffoldETHDeploy {
    /**
     * @dev Deployer setup based on `ETH_KEYSTORE_ACCOUNT` in `.env`:
     *      - "scaffold-eth-default": Uses Anvil's account #9 (0xa0Ee7A142d267C1f36714E4a8F75612F20a79720), no password prompt
     *      - "scaffold-eth-custom": requires password used while creating keystore
     *
     * Note: Must use ScaffoldEthDeployerRunner modifier to:
     *      - Setup correct `deployer` account and fund it
     *      - Export contract addresses & ABIs to `nextjs` packages
     */
    function run() external ScaffoldEthDeployerRunner {
        // Deploy mock staking token first (for local testing)
        MockStakingToken stakingToken = new MockStakingToken();
        console.logString(
            string.concat(
                "MockStakingToken deployed at: ",
                vm.toString(address(stakingToken))
            )
        );
        
        // Deploy PledgedLottery contract
        PledgedLottery lotteryContract = new PledgedLottery(address(stakingToken), deployer);
        console.logString(
            string.concat(
                "PledgedLottery deployed at: ",
                vm.toString(address(lotteryContract))
            )
        );
        
        // Optional: Mint some initial tokens to deployer for testing
        stakingToken.mint(deployer, 100000 * 10**18);
        console.logString("Minted 100,000 STAKE tokens to deployer for testing");
    }
}
