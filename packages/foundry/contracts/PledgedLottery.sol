//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import {console} from "forge-std/console.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title PledgedLottery
 * @dev 质押彩票智能合约系统
 * 用户可通过质押代币参与资金池，彩票参与者通过代币铸造NFT参与抽奖
 * 每个周期为7天，奖金动态调整确保资金池质押收益
 */
contract PledgedLottery is ERC721, Ownable, ReentrancyGuard {
    IERC20 public immutable stakingToken;
    
    uint256 public constant CYCLE_DURATION = 7 days;
    uint256 public constant TICKET_PRICE = 0.01 ether;
    uint256 public constant MIN_STAKE_AMOUNT = 1000 * 10**18; // 最小质押量
    
    uint256 public currentCycle;
    uint256 public cycleStartTime;
    uint256 private _tokenIdCounter;
    
    // 奖项配置 (小奖、中奖、大奖概率: 40%, 8%, 2%)
    uint256 public constant SMALL_PRIZE_RATE = 4000; // 40%
    uint256 public constant MEDIUM_PRIZE_RATE = 800;  // 8% 
    uint256 public constant BIG_PRIZE_RATE = 200;     // 2%
    uint256 public constant TOTAL_WIN_RATE = 5000;    // 50%
    
    struct CycleInfo {
        uint256 totalStaked;
        uint256 totalTickets;
        uint256 totalSales;
        uint256 rewardPool;
        bool isFinalized;
        mapping(address => uint256) stakedAmounts;
        mapping(address => uint256) stakingRewards;
    }
    
    struct TicketInfo {
        uint256 cycle;
        address owner;
        bool isRedeemed;
        uint256 prizeType; // 0: 未中奖, 1: 小奖, 2: 中奖, 3: 大奖
        uint256 prizeAmount;
    }
    
    mapping(uint256 => CycleInfo) public cycles;
    mapping(uint256 => TicketInfo) public tickets;
    mapping(address => uint256[]) public userTickets;
    mapping(uint256 => address[]) public cycleStakers;
    
    event CycleStarted(uint256 indexed cycle, uint256 startTime);
    event TokensStaked(address indexed staker, uint256 amount, uint256 cycle);
    event TokensUnstaked(address indexed staker, uint256 amount, uint256 cycle);
    event TicketMinted(address indexed buyer, uint256 indexed tokenId, uint256 cycle);
    event LotteryDrawn(uint256 indexed cycle, uint256 totalWinners);
    event PrizeClaimed(address indexed winner, uint256 indexed tokenId, uint256 prizeAmount, uint256 prizeType);
    event StakingRewardClaimed(address indexed staker, uint256 amount, uint256 cycle);

    constructor(
        address _stakingToken,
        address _owner
    ) ERC721("LotteryTicket", "TICKET") Ownable(_owner) {
        stakingToken = IERC20(_stakingToken);
        currentCycle = 1;
        cycleStartTime = block.timestamp;
        
        emit CycleStarted(currentCycle, cycleStartTime);
    }
    
    modifier onlyActiveCycle() {
        require(block.timestamp < cycleStartTime + CYCLE_DURATION, "Cycle ended");
        _;
    }
    
    modifier onlyEndedCycle(uint256 cycle) {
        require(cycle < currentCycle, "Cycle not ended");
        _;
    }

    function stakeTokens(uint256 amount) external onlyActiveCycle nonReentrant {
        require(amount >= MIN_STAKE_AMOUNT, "Insufficient stake amount");
        require(stakingToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        CycleInfo storage cycle = cycles[currentCycle];
        
        if (cycle.stakedAmounts[msg.sender] == 0) {
            cycleStakers[currentCycle].push(msg.sender);
        }
        
        cycle.stakedAmounts[msg.sender] += amount;
        cycle.totalStaked += amount;
        
        emit TokensStaked(msg.sender, amount, currentCycle);
    }
    
    function unstakeTokens(uint256 amount) external nonReentrant {
        CycleInfo storage cycle = cycles[currentCycle];
        require(cycle.stakedAmounts[msg.sender] >= amount, "Insufficient staked amount");
        
        cycle.stakedAmounts[msg.sender] -= amount;
        cycle.totalStaked -= amount;
        
        require(stakingToken.transfer(msg.sender, amount), "Transfer failed");
        
        emit TokensUnstaked(msg.sender, amount, currentCycle);
    }
    
    function buyTicket() external payable onlyActiveCycle nonReentrant {
        require(msg.value == TICKET_PRICE, "Incorrect ticket price");
        
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        
        _mint(msg.sender, tokenId);
        
        tickets[tokenId] = TicketInfo({
            cycle: currentCycle,
            owner: msg.sender,
            isRedeemed: false,
            prizeType: 0,
            prizeAmount: 0
        });
        
        userTickets[msg.sender].push(tokenId);
        
        CycleInfo storage cycle = cycles[currentCycle];
        cycle.totalTickets++;
        cycle.totalSales += msg.value;
        
        emit TicketMinted(msg.sender, tokenId, currentCycle);
    }
    
    function finalizeCycle() external onlyOwner {
        require(block.timestamp >= cycleStartTime + CYCLE_DURATION, "Cycle not ended");
        require(!cycles[currentCycle].isFinalized, "Cycle already finalized");
        
        _drawLottery();
        _distributeRewards();
        
        cycles[currentCycle].isFinalized = true;
        
        currentCycle++;
        cycleStartTime = block.timestamp;
        
        emit CycleStarted(currentCycle, cycleStartTime);
    }
    
    function _drawLottery() internal {
        CycleInfo storage cycle = cycles[currentCycle];
        uint256 totalTickets = cycle.totalTickets;
        
        if (totalTickets == 0) return;
        
        uint256 totalPrizePool = cycle.totalSales;
        uint256 dynamicAdjustment = _calculateDynamicAdjustment(cycle.totalSales, cycle.totalStaked);
        
        // 动态调整奖金池大小
        uint256 adjustedPrizePool = (totalPrizePool * dynamicAdjustment) / 10000;
        cycle.rewardPool = totalPrizePool - adjustedPrizePool;
        
        // 计算各奖项数量
        uint256 expectedWinners = (totalTickets * TOTAL_WIN_RATE) / 10000;
        uint256 bigPrizeWinners = (expectedWinners * BIG_PRIZE_RATE) / TOTAL_WIN_RATE;
        uint256 mediumPrizeWinners = (expectedWinners * MEDIUM_PRIZE_RATE) / TOTAL_WIN_RATE;
        uint256 smallPrizeWinners = expectedWinners - bigPrizeWinners - mediumPrizeWinners;
        
        // 计算奖金金额
        uint256 bigPrizeAmount = bigPrizeWinners > 0 ? (adjustedPrizePool * 5000) / (10000 * bigPrizeWinners) : 0;
        uint256 mediumPrizeAmount = mediumPrizeWinners > 0 ? (adjustedPrizePool * 3000) / (10000 * mediumPrizeWinners) : 0;
        uint256 smallPrizeAmount = smallPrizeWinners > 0 ? (adjustedPrizePool * 2000) / (10000 * smallPrizeWinners) : 0;
        
        // 随机分配奖项
        uint256 winnersCount = 0;
        for (uint256 i = 1; i <= totalTickets; i++) {
            uint256 tokenId = _tokenIdCounter - totalTickets + i;
            uint256 randomValue = _generateRandom(tokenId, totalTickets);
            
            if (randomValue < BIG_PRIZE_RATE && bigPrizeWinners > 0) {
                tickets[tokenId].prizeType = 3;
                tickets[tokenId].prizeAmount = bigPrizeAmount;
                bigPrizeWinners--;
                winnersCount++;
            } else if (randomValue < BIG_PRIZE_RATE + MEDIUM_PRIZE_RATE && mediumPrizeWinners > 0) {
                tickets[tokenId].prizeType = 2;
                tickets[tokenId].prizeAmount = mediumPrizeAmount;
                mediumPrizeWinners--;
                winnersCount++;
            } else if (randomValue < TOTAL_WIN_RATE && smallPrizeWinners > 0) {
                tickets[tokenId].prizeType = 1;
                tickets[tokenId].prizeAmount = smallPrizeAmount;
                smallPrizeWinners--;
                winnersCount++;
            }
        }
        
        emit LotteryDrawn(currentCycle, winnersCount);
    }
    
    function _distributeRewards() internal {
        CycleInfo storage cycle = cycles[currentCycle];
        address[] memory stakers = cycleStakers[currentCycle];
        
        if (cycle.totalStaked == 0 || cycle.rewardPool == 0) return;
        
        for (uint256 i = 0; i < stakers.length; i++) {
            address staker = stakers[i];
            uint256 stakedAmount = cycle.stakedAmounts[staker];
            
            if (stakedAmount > 0) {
                uint256 reward = (cycle.rewardPool * stakedAmount) / cycle.totalStaked;
                cycle.stakingRewards[staker] = reward;
            }
        }
    }
    
    function _calculateDynamicAdjustment(uint256 totalSales, uint256 totalStaked) internal pure returns (uint256) {
        if (totalStaked == 0) return 5000; // 50% 默认奖金池比例
        
        uint256 salesStakeRatio = (totalSales * 10000) / totalStaked;
        
        if (salesStakeRatio >= 10000) {
            return 7000; // 销售额 >= 质押总额，奖金池70%
        } else if (salesStakeRatio >= 5000) {
            return 6000; // 销售额 >= 50%质押总额，奖金池60%
        } else {
            return 4000; // 销售额 < 50%质押总额，奖金池40%，确保质押收益
        }
    }
    
    function _generateRandom(uint256 tokenId, uint256 totalTickets) internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            tokenId,
            totalTickets,
            msg.sender
        ))) % 10000;
    }
    
    function claimPrize(uint256 tokenId) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        TicketInfo storage ticket = tickets[tokenId];
        require(!ticket.isRedeemed, "Prize already claimed");
        require(ticket.prizeType > 0, "No prize to claim");
        require(cycles[ticket.cycle].isFinalized, "Cycle not finalized");
        
        ticket.isRedeemed = true;
        
        (bool success, ) = payable(msg.sender).call{value: ticket.prizeAmount}("");
        require(success, "Prize transfer failed");
        
        emit PrizeClaimed(msg.sender, tokenId, ticket.prizeAmount, ticket.prizeType);
    }
    
    function claimStakingReward(uint256 cycle) external onlyEndedCycle(cycle) nonReentrant {
        CycleInfo storage cycleInfo = cycles[cycle];
        require(cycleInfo.isFinalized, "Cycle not finalized");
        
        uint256 reward = cycleInfo.stakingRewards[msg.sender];
        require(reward > 0, "No rewards to claim");
        
        cycleInfo.stakingRewards[msg.sender] = 0;
        
        (bool success, ) = payable(msg.sender).call{value: reward}("");
        require(success, "Reward transfer failed");
        
        emit StakingRewardClaimed(msg.sender, reward, cycle);
    }
    
    // View functions
    function getStakedAmount(address staker, uint256 cycle) external view returns (uint256) {
        return cycles[cycle].stakedAmounts[staker];
    }
    
    function getStakingReward(address staker, uint256 cycle) external view returns (uint256) {
        return cycles[cycle].stakingRewards[staker];
    }
    
    function getUserTickets(address user) external view returns (uint256[] memory) {
        return userTickets[user];
    }
    
    function getTicketInfo(uint256 tokenId) external view returns (TicketInfo memory) {
        return tickets[tokenId];
    }
    
    function getCycleInfo(uint256 cycle) external view returns (
        uint256 totalStaked,
        uint256 totalTickets,
        uint256 totalSales,
        uint256 rewardPool,
        bool isFinalized
    ) {
        CycleInfo storage cycleInfo = cycles[cycle];
        return (
            cycleInfo.totalStaked,
            cycleInfo.totalTickets,
            cycleInfo.totalSales,
            cycleInfo.rewardPool,
            cycleInfo.isFinalized
        );
    }
    
    function getCurrentCycleTimeLeft() external view returns (uint256) {
        uint256 endTime = cycleStartTime + CYCLE_DURATION;
        if (block.timestamp >= endTime) return 0;
        return endTime - block.timestamp;
    }
    
    // Emergency functions
    function emergencyWithdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Emergency withdraw failed");
    }
    
    receive() external payable {}
}