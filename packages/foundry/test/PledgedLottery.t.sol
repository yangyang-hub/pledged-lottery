//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import {Test, console} from "forge-std/Test.sol";
import {PledgedLottery} from "../contracts/PledgedLottery.sol";
import {LotteryToken} from "../contracts/LotteryToken.sol";

contract PledgedLotteryTest is Test {
    
    PledgedLottery public pledgedLottery;
    LotteryToken public lotteryToken;
    
    address public owner;
    address public user1;
    address public user2;
    address public user3;
    
    uint256 public constant TICKET_PRICE = 0.01 ether;
    uint256 public constant ROUND_DURATION = 7 days;
    
    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        user3 = makeAddr("user3");
        
        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);
        vm.deal(user3, 100 ether);
        
        pledgedLottery = new PledgedLottery(owner);
        lotteryToken = LotteryToken(payable(pledgedLottery.getLotteryTokenAddress()));
        
        console.log("Contract deployed successfully");
        console.log("PledgedLottery address:", address(pledgedLottery));
        console.log("LotteryToken address:", address(lotteryToken));
    }
    
    function testInitialState() public view {
        assertEq(pledgedLottery.currentRound(), 1);
        assertEq(pledgedLottery.getTicketPrice(), TICKET_PRICE);
        
        (uint256 currentRound, uint256 totalRevenue, uint256 totalPrizePaid, uint256 balance) = pledgedLottery.getContractStats();
        assertEq(currentRound, 1);
        assertEq(totalRevenue, 0);
        assertEq(totalPrizePaid, 0);
        assertEq(balance, 0);
    }
    
    function testBuyTicket() public {
        vm.startPrank(user1);
        
        pledgedLottery.buyTicket{value: TICKET_PRICE}();
        
        uint256[] memory userTickets = pledgedLottery.getUserTickets(user1);
        assertEq(userTickets.length, 1);
        assertEq(userTickets[0], 1);
        
        (uint256 round, bool isScratched, uint256 prizeType, uint256 prizeAmount, bool isPrizeClaimed,) = pledgedLottery.getTicketInfo(1);
        assertEq(round, 1);
        assertEq(isScratched, false);
        assertEq(prizeType, 0);
        assertEq(prizeAmount, 0);
        assertEq(isPrizeClaimed, false);
        
        vm.stopPrank();
    }
    
    function testBuyTicketInvalidPrice() public {
        vm.startPrank(user1);
        
        vm.expectRevert();
        pledgedLottery.buyTicket{value: TICKET_PRICE - 1}();
        
        vm.expectRevert();
        pledgedLottery.buyTicket{value: TICKET_PRICE + 1}();
        
        vm.stopPrank();
    }
    
    function testScratchTicket() public {
        vm.prank(user1);
        pledgedLottery.buyTicket{value: TICKET_PRICE}();
        
        vm.startPrank(user1);
        pledgedLottery.scratchTicket(1);
        
        (, bool isScratched, uint256 prizeType,,, ) = pledgedLottery.getTicketInfo(1);
        assertEq(isScratched, true);
        assertTrue(prizeType >= 0 && prizeType <= 4);
        
        vm.stopPrank();
    }
    
    function testScratchTicketPermissions() public {
        vm.prank(user1);
        pledgedLottery.buyTicket{value: TICKET_PRICE}();
        
        vm.prank(user2);
        vm.expectRevert();
        pledgedLottery.scratchTicket(1);
        
        vm.prank(user1);
        pledgedLottery.scratchTicket(1);
        
        vm.prank(user1);
        vm.expectRevert();
        pledgedLottery.scratchTicket(1);
    }
    
    function testClaimPrize() public {
        uint256 ticketCount = 20;
        uint256[] memory ticketIds = new uint256[](ticketCount);
        
        vm.startPrank(user1);
        
        for (uint256 i = 0; i < ticketCount; i++) {
            pledgedLottery.buyTicket{value: TICKET_PRICE}();
            ticketIds[i] = i + 1;
        }
        
        for (uint256 i = 0; i < ticketCount; i++) {
            pledgedLottery.scratchTicket(ticketIds[i]);
        }
        
        uint256 initialBalance = user1.balance;
        bool foundWinner = false;
        
        for (uint256 i = 0; i < ticketCount; i++) {
            (, , uint256 prizeType, uint256 prizeAmount, bool isPrizeClaimed, ) = pledgedLottery.getTicketInfo(ticketIds[i]);
            
            if (prizeType > 0 && !isPrizeClaimed) {
                foundWinner = true;
                pledgedLottery.claimPrize(ticketIds[i]);
                
                assertGt(user1.balance, initialBalance);
                
                (, , , , bool newIsPrizeClaimed, ) = pledgedLottery.getTicketInfo(ticketIds[i]);
                assertEq(newIsPrizeClaimed, true);
                
                break;
            }
        }
        
        assertTrue(foundWinner);
        
        vm.stopPrank();
    }
    
    function testRoundManagement() public {
        assertEq(pledgedLottery.currentRound(), 1);
        assertGt(pledgedLottery.getCurrentRoundTimeLeft(), 0);
        
        vm.prank(user1);
        pledgedLottery.buyTicket{value: TICKET_PRICE}();
        
        (uint256 totalTickets, uint256 totalSales, uint256 prizePool, bool isEnded) = pledgedLottery.getRoundInfo(1);
        assertEq(totalTickets, 1);
        assertEq(totalSales, TICKET_PRICE);
        assertEq(isEnded, false);
        
        vm.warp(block.timestamp + ROUND_DURATION + 1);
        
        pledgedLottery.finalizeRound();
        
        assertEq(pledgedLottery.currentRound(), 2);
        assertEq(pledgedLottery.getCurrentRoundTimeLeft(), ROUND_DURATION);
        
        (, , , bool isEnded2) = pledgedLottery.getRoundInfo(1);
        assertEq(isEnded2, true);
    }
    
    function testCannotEndRoundEarly() public {
        vm.expectRevert();
        pledgedLottery.finalizeRound();
    }
    
    function testCannotBuyTicketAfterRoundEnd() public {
        vm.warp(block.timestamp + ROUND_DURATION + 1);
        
        vm.prank(user1);
        vm.expectRevert();
        pledgedLottery.buyTicket{value: TICKET_PRICE}();
    }
    
    function testPauseFunctionality() public {
        pledgedLottery.pause();
        
        vm.prank(user1);
        vm.expectRevert();
        pledgedLottery.buyTicket{value: TICKET_PRICE}();
        
        pledgedLottery.unpause();
        
        vm.prank(user1);
        pledgedLottery.buyTicket{value: TICKET_PRICE}();
    }
    
    function testPrizeDistribution() public {
        uint256 totalTickets = 100;
        uint256[] memory prizeTypeCounts = new uint256[](5);
        
        vm.startPrank(user1);
        
        for (uint256 i = 0; i < totalTickets; i++) {
            pledgedLottery.buyTicket{value: TICKET_PRICE}();
            pledgedLottery.scratchTicket(i + 1);
            
            (, , uint256 prizeType, , , ) = pledgedLottery.getTicketInfo(i + 1);
            prizeTypeCounts[prizeType]++;
        }
        
        vm.stopPrank();
        
        uint256 totalWinners = prizeTypeCounts[1] + prizeTypeCounts[2] + prizeTypeCounts[3] + prizeTypeCounts[4];
        uint256 actualWinRate = (totalWinners * 10000) / totalTickets;
        
        console.log("Total tickets:", totalTickets);
        console.log("No prize:", prizeTypeCounts[0]);
        console.log("Small prize:", prizeTypeCounts[1]);
        console.log("Medium prize:", prizeTypeCounts[2]);
        console.log("Big prize:", prizeTypeCounts[3]);
        console.log("Super prize:", prizeTypeCounts[4]);
        console.log("Total winners:", totalWinners);
        console.log("Actual win rate:", actualWinRate, "basis points");
        
        assertTrue(actualWinRate >= 3000 && actualWinRate <= 7000, "Win rate should be around 50%");
    }
    
    function testQueryFunctions() public {
        vm.startPrank(user1);
        pledgedLottery.buyTicket{value: TICKET_PRICE}();
        pledgedLottery.buyTicket{value: TICKET_PRICE}();
        vm.stopPrank();
        
        vm.startPrank(user2);
        pledgedLottery.buyTicket{value: TICKET_PRICE}();
        vm.stopPrank();
        
        uint256[] memory user1Tickets = pledgedLottery.getUserTickets(user1);
        uint256[] memory user2Tickets = pledgedLottery.getUserTickets(user2);
        
        assertEq(user1Tickets.length, 2);
        assertEq(user2Tickets.length, 1);
        
        assertEq(pledgedLottery.getUserTicketCountInRound(user1, 1), 2);
        assertEq(pledgedLottery.getUserTicketCountInRound(user2, 1), 1);
        
        (uint256 currentRound, uint256 totalRevenue, , uint256 contractBalance) = pledgedLottery.getContractStats();
        assertEq(currentRound, 1);
        assertEq(totalRevenue, 3 * TICKET_PRICE);
        assertEq(contractBalance, 3 * TICKET_PRICE);
    }
    
    function testReceiveEther() public {
        uint256 initialRevenue = pledgedLottery.totalRevenue();
        
        (bool success,) = payable(address(pledgedLottery)).call{value: 1 ether}("");
        assertTrue(success);
        
        assertEq(pledgedLottery.totalRevenue(), initialRevenue + 1 ether);
    }
}