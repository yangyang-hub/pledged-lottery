// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../contracts/PledgedLottery.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract PledgedLotteryTest is Test {
    PledgedLottery public lotteryContract;
    MockERC20 public stakingToken;
    
    address public owner = makeAddr("owner");
    address public staker1 = makeAddr("staker1");
    address public staker2 = makeAddr("staker2");
    address public player1 = makeAddr("player1");
    address public player2 = makeAddr("player2");
    
    uint256 public constant TICKET_PRICE = 0.01 ether;
    uint256 public constant MIN_STAKE_AMOUNT = 1000 * 10**18;
    uint256 public constant CYCLE_DURATION = 7 days;

    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy mock staking token
        stakingToken = new MockERC20();
        
        // Deploy lottery contract
        lotteryContract = new PledgedLottery(address(stakingToken), owner);
        
        // Mint tokens to test users
        stakingToken.mint(staker1, 10000 * 10**18);
        stakingToken.mint(staker2, 10000 * 10**18);
        
        // Give ETH to players
        vm.deal(player1, 10 ether);
        vm.deal(player2, 10 ether);
        
        vm.stopPrank();
    }

    function testInitialState() public view {
        assertEq(lotteryContract.currentCycle(), 1);
        assertEq(address(lotteryContract.stakingToken()), address(stakingToken));
        assertEq(lotteryContract.owner(), owner);
    }

    function testStakeTokens() public {
        vm.startPrank(staker1);
        
        // Approve tokens
        stakingToken.approve(address(lotteryContract), MIN_STAKE_AMOUNT);
        
        // Stake tokens
        lotteryContract.stakeTokens(MIN_STAKE_AMOUNT);
        
        // Check staked amount
        assertEq(lotteryContract.getStakedAmount(staker1, 1), MIN_STAKE_AMOUNT);
        
        vm.stopPrank();
    }

    function testStakeTokensRequiresMinimumAmount() public {
        vm.startPrank(staker1);
        
        stakingToken.approve(address(lotteryContract), MIN_STAKE_AMOUNT - 1);
        
        vm.expectRevert("Insufficient stake amount");
        lotteryContract.stakeTokens(MIN_STAKE_AMOUNT - 1);
        
        vm.stopPrank();
    }

    function testUnstakeTokens() public {
        vm.startPrank(staker1);
        
        // First stake
        stakingToken.approve(address(lotteryContract), MIN_STAKE_AMOUNT);
        lotteryContract.stakeTokens(MIN_STAKE_AMOUNT);
        
        // Then unstake
        lotteryContract.unstakeTokens(MIN_STAKE_AMOUNT / 2);
        
        assertEq(lotteryContract.getStakedAmount(staker1, 1), MIN_STAKE_AMOUNT / 2);
        
        vm.stopPrank();
    }

    function testBuyTicket() public {
        vm.startPrank(player1);
        
        // Buy ticket
        lotteryContract.buyTicket{value: TICKET_PRICE}();
        
        // Check ticket ownership
        assertEq(lotteryContract.ownerOf(1), player1);
        
        // Check ticket info
        (uint256 cycle, address owner, bool isRedeemed, uint256 prizeType, uint256 prizeAmount) = 
            lotteryContract.getTicketInfo(1);
        
        assertEq(cycle, 1);
        assertEq(owner, player1);
        assertEq(isRedeemed, false);
        assertEq(prizeType, 0);
        assertEq(prizeAmount, 0);
        
        vm.stopPrank();
    }

    function testBuyTicketRequiresCorrectPrice() public {
        vm.startPrank(player1);
        
        vm.expectRevert("Incorrect ticket price");
        lotteryContract.buyTicket{value: TICKET_PRICE - 1}();
        
        vm.expectRevert("Incorrect ticket price");
        lotteryContract.buyTicket{value: TICKET_PRICE + 1}();
        
        vm.stopPrank();
    }

    function testCannotBuyTicketAfterCycleEnds() public {
        // Fast forward past cycle duration
        vm.warp(block.timestamp + CYCLE_DURATION + 1);
        
        vm.startPrank(player1);
        
        vm.expectRevert("Cycle ended");
        lotteryContract.buyTicket{value: TICKET_PRICE}();
        
        vm.stopPrank();
    }

    function testFinalizeCycle() public {
        // Setup: stake tokens and buy tickets
        vm.startPrank(staker1);
        stakingToken.approve(address(lotteryContract), MIN_STAKE_AMOUNT * 2);
        lotteryContract.stakeTokens(MIN_STAKE_AMOUNT * 2);
        vm.stopPrank();
        
        vm.startPrank(player1);
        lotteryContract.buyTicket{value: TICKET_PRICE}();
        lotteryContract.buyTicket{value: TICKET_PRICE}();
        vm.stopPrank();
        
        // Fast forward to end of cycle
        vm.warp(block.timestamp + CYCLE_DURATION);
        
        // Finalize cycle
        vm.startPrank(owner);
        lotteryContract.finalizeCycle();
        vm.stopPrank();
        
        // Check that cycle incremented
        assertEq(lotteryContract.currentCycle(), 2);
        
        // Check that previous cycle is finalized
        (, , , , bool isFinalized) = lotteryContract.getCycleInfo(1);
        assertTrue(isFinalized);
    }

    function testCannotFinalizeCycleEarly() public {
        vm.startPrank(owner);
        
        vm.expectRevert("Cycle not ended");
        lotteryContract.finalizeCycle();
        
        vm.stopPrank();
    }

    function testOnlyOwnerCanFinalizeCycle() public {
        vm.warp(block.timestamp + CYCLE_DURATION);
        
        vm.startPrank(staker1);
        
        vm.expectRevert();
        lotteryContract.finalizeCycle();
        
        vm.stopPrank();
    }

    function testDynamicPrizePoolAdjustment() public {
        // Create a scenario with low sales relative to staking
        vm.startPrank(staker1);
        stakingToken.approve(address(lotteryContract), MIN_STAKE_AMOUNT * 10);
        lotteryContract.stakeTokens(MIN_STAKE_AMOUNT * 10);
        vm.stopPrank();
        
        vm.startPrank(player1);
        lotteryContract.buyTicket{value: TICKET_PRICE}();
        vm.stopPrank();
        
        // Finalize cycle
        vm.warp(block.timestamp + CYCLE_DURATION);
        vm.startPrank(owner);
        lotteryContract.finalizeCycle();
        vm.stopPrank();
        
        // Check that reward pool exists (indicating dynamic adjustment worked)
        (, , , uint256 rewardPool, ) = lotteryContract.getCycleInfo(1);
        assertTrue(rewardPool > 0);
    }

    function testClaimStakingReward() public {
        // Setup staking and tickets
        vm.startPrank(staker1);
        stakingToken.approve(address(lotteryContract), MIN_STAKE_AMOUNT);
        lotteryContract.stakeTokens(MIN_STAKE_AMOUNT);
        vm.stopPrank();
        
        vm.startPrank(player1);
        lotteryContract.buyTicket{value: TICKET_PRICE}();
        vm.stopPrank();
        
        // Finalize cycle
        vm.warp(block.timestamp + CYCLE_DURATION);
        vm.startPrank(owner);
        lotteryContract.finalizeCycle();
        vm.stopPrank();
        
        // Claim staking reward
        uint256 initialBalance = staker1.balance;
        uint256 expectedReward = lotteryContract.getStakingReward(staker1, 1);
        
        if (expectedReward > 0) {
            vm.startPrank(staker1);
            lotteryContract.claimStakingReward(1);
            vm.stopPrank();
            
            assertEq(staker1.balance, initialBalance + expectedReward);
            assertEq(lotteryContract.getStakingReward(staker1, 1), 0);
        }
    }

    function testCannotClaimStakingRewardForActiveCycle() public {
        vm.startPrank(staker1);
        
        vm.expectRevert("Cycle not ended");
        lotteryContract.claimStakingReward(1);
        
        vm.stopPrank();
    }

    function testGetUserTickets() public {
        vm.startPrank(player1);
        
        lotteryContract.buyTicket{value: TICKET_PRICE}();
        lotteryContract.buyTicket{value: TICKET_PRICE}();
        
        uint256[] memory tickets = lotteryContract.getUserTickets(player1);
        assertEq(tickets.length, 2);
        assertEq(tickets[0], 1);
        assertEq(tickets[1], 2);
        
        vm.stopPrank();
    }

    function testGetCycleInfo() public {
        vm.startPrank(staker1);
        stakingToken.approve(address(lotteryContract), MIN_STAKE_AMOUNT);
        lotteryContract.stakeTokens(MIN_STAKE_AMOUNT);
        vm.stopPrank();
        
        vm.startPrank(player1);
        lotteryContract.buyTicket{value: TICKET_PRICE}();
        vm.stopPrank();
        
        (uint256 totalStaked, uint256 totalTickets, uint256 totalSales, uint256 rewardPool, bool isFinalized) = 
            lotteryContract.getCycleInfo(1);
            
        assertEq(totalStaked, MIN_STAKE_AMOUNT);
        assertEq(totalTickets, 1);
        assertEq(totalSales, TICKET_PRICE);
        assertEq(rewardPool, 0); // Not finalized yet
        assertEq(isFinalized, false);
    }

    function testGetCurrentCycleTimeLeft() public {
        uint256 timeLeft = lotteryContract.getCurrentCycleTimeLeft();
        assertLe(timeLeft, CYCLE_DURATION);
        assertGt(timeLeft, 0);
        
        // Fast forward to end
        vm.warp(block.timestamp + CYCLE_DURATION);
        timeLeft = lotteryContract.getCurrentCycleTimeLeft();
        assertEq(timeLeft, 0);
    }

    function testEmergencyWithdraw() public {
        // Add some ETH to contract
        vm.deal(address(lotteryContract), 1 ether);
        
        uint256 initialBalance = owner.balance;
        
        vm.startPrank(owner);
        lotteryContract.emergencyWithdraw();
        vm.stopPrank();
        
        assertEq(owner.balance, initialBalance + 1 ether);
        assertEq(address(lotteryContract).balance, 0);
    }

    function testOnlyOwnerCanEmergencyWithdraw() public {
        vm.startPrank(staker1);
        
        vm.expectRevert();
        lotteryContract.emergencyWithdraw();
        
        vm.stopPrank();
    }

    function testReceiveFunction() public {
        vm.deal(player1, 1 ether);
        
        vm.startPrank(player1);
        (bool success, ) = address(lotteryContract).call{value: 0.5 ether}("");
        assertTrue(success);
        vm.stopPrank();
        
        assertEq(address(lotteryContract).balance, 0.5 ether);
    }

    function testLotteryIntegration() public {
        // Complete integration test
        
        // 1. Multiple stakers stake tokens
        vm.startPrank(staker1);
        stakingToken.approve(address(lotteryContract), MIN_STAKE_AMOUNT * 2);
        lotteryContract.stakeTokens(MIN_STAKE_AMOUNT * 2);
        vm.stopPrank();
        
        vm.startPrank(staker2);
        stakingToken.approve(address(lotteryContract), MIN_STAKE_AMOUNT);
        lotteryContract.stakeTokens(MIN_STAKE_AMOUNT);
        vm.stopPrank();
        
        // 2. Multiple players buy tickets
        vm.startPrank(player1);
        for(uint i = 0; i < 5; i++) {
            lotteryContract.buyTicket{value: TICKET_PRICE}();
        }
        vm.stopPrank();
        
        vm.startPrank(player2);
        for(uint i = 0; i < 3; i++) {
            lotteryContract.buyTicket{value: TICKET_PRICE}();
        }
        vm.stopPrank();
        
        // 3. Finalize cycle
        vm.warp(block.timestamp + CYCLE_DURATION);
        vm.startPrank(owner);
        lotteryContract.finalizeCycle();
        vm.stopPrank();
        
        // 4. Check results
        (uint256 totalStaked, uint256 totalTickets, uint256 totalSales, uint256 rewardPool, bool isFinalized) = 
            lotteryContract.getCycleInfo(1);
            
        assertEq(totalStaked, MIN_STAKE_AMOUNT * 3);
        assertEq(totalTickets, 8);
        assertEq(totalSales, TICKET_PRICE * 8);
        assertGt(rewardPool, 0);
        assertTrue(isFinalized);
        
        // 5. Verify staking rewards are distributed
        uint256 staker1Reward = lotteryContract.getStakingReward(staker1, 1);
        uint256 staker2Reward = lotteryContract.getStakingReward(staker2, 1);
        
        // Staker1 should get 2/3 of rewards (staked 2x MIN_STAKE_AMOUNT vs staker2's 1x)
        assertGt(staker1Reward, staker2Reward);
        assertApproxEqRel(staker1Reward, staker2Reward * 2, 0.01e18); // 1% tolerance
    }
}