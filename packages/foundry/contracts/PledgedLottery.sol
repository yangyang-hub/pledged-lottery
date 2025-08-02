//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import {console} from "forge-std/console.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PledgedLottery
 * @dev 质押彩票智能合约系统
 * 用户可通过质押代币参与资金池，彩票参与者通过代币铸造NFT参与抽奖
 * 每个周期为7天，奖金动态调整确保资金池质押收益
 */
contract PledgedLottery is ERC721, Ownable, ReentrancyGuard {
    
    /// @notice 每个彩票周期的持续时间（7天）
    uint256 public constant CYCLE_DURATION = 7 days;
    
    /// @notice 单张彩票的价格（0.1）
    uint256 public constant TICKET_PRICE = 0.1 ether;
    
    /// @notice 最小质押量（1）
    uint256 public constant MIN_STAKE_AMOUNT = 1 ether;
    
    /// @notice 当前活跃的彩票周期编号
    uint256 public currentCycle;
    
    /// @notice 当前周期的开始时间戳
    uint256 public cycleStartTime;
    
    /// @notice 彩票NFT的ID计数器
    uint256 private _tokenIdCounter;
    
    /// @notice 小奖中奖率（基于总中奖率的占比，实际概率40%）
    uint256 public constant SMALL_PRIZE_RATE = 4000;
    
    /// @notice 中奖中奖率（基于总中奖率的占比，实际概率8%）
    uint256 public constant MEDIUM_PRIZE_RATE = 800;
    
    /// @notice 大奖中奖率（基于总中奖率的占比，实际概率2%）
    uint256 public constant BIG_PRIZE_RATE = 200;
    
    /// @notice 总中奖率（50%的彩票会中奖）
    uint256 public constant TOTAL_WIN_RATE = 5000;
    
    /// @notice 每个彩票周期的信息结构体
    struct CycleInfo {
        /// @notice 该周期内总质押代币数量
        uint256 totalStaked;
        /// @notice 该周期内售出的彩票总数
        uint256 totalTickets;
        /// @notice 该周期内彩票销售总收入（ETH）
        uint256 totalSales;
        /// @notice 分配给质押者的奖励池金额
        uint256 rewardPool;
        /// @notice 该周期是否已完成（抽奖和奖励分配）
        bool isFinalized;
        /// @notice 每个地址在该周期的质押数量
        mapping(address => uint256) stakedAmounts;
        /// @notice 每个地址在该周期可领取的质押奖励
        mapping(address => uint256) stakingRewards;
    }
    
    /// @notice 彩票信息结构体
    struct TicketInfo {
        /// @notice 彩票所属的周期编号
        uint256 cycle;
        /// @notice 彩票持有者地址
        address owner;
        /// @notice 奖金是否已被领取
        bool isRedeemed;
        /// @notice 奖项类型：0=未中奖, 1=小奖, 2=中奖, 3=大奖
        uint256 prizeType;
        /// @notice 奖金金额（以wei为单位）
        uint256 prizeAmount;
    }
    
    /// @notice 每个周期的详细信息映射
    mapping(uint256 => CycleInfo) public cycles;
    
    /// @notice 彩票ID到彩票信息的映射
    mapping(uint256 => TicketInfo) public tickets;
    
    /// @notice 用户地址到其拥有的彩票ID列表的映射
    mapping(address => uint256[]) public userTickets;
    
    /// @notice 每个周期参与质押的用户地址列表
    mapping(uint256 => address[]) public cycleStakers;
    
    /// @notice 新周期开始时触发
    /// @param cycle 周期编号
    /// @param startTime 开始时间戳
    event CycleStarted(uint256 indexed cycle, uint256 startTime);
    
    /// @notice 用户质押代币时触发
    /// @param staker 质押者地址
    /// @param amount 质押数量
    /// @param cycle 质押的周期
    event TokensStaked(address indexed staker, uint256 amount, uint256 cycle);
    
    /// @notice 用户取消质押时触发
    /// @param staker 取消质押者地址
    /// @param amount 取消质押数量
    /// @param cycle 取消质押的周期
    event TokensUnstaked(address indexed staker, uint256 amount, uint256 cycle);
    
    /// @notice 购买彩票时触发
    /// @param buyer 购买者地址
    /// @param tokenId 彩票NFT的ID
    /// @param cycle 购买彩票的周期
    event TicketMinted(address indexed buyer, uint256 indexed tokenId, uint256 cycle);
    
    /// @notice 彩票抽奖完成时触发
    /// @param cycle 抽奖的周期
    /// @param totalWinners 总中奖人数
    event LotteryDrawn(uint256 indexed cycle, uint256 totalWinners);
    
    /// @notice 奖金被领取时触发
    /// @param winner 中奖者地址
    /// @param tokenId 中奖彩票ID
    /// @param prizeAmount 奖金金额
    /// @param prizeType 奖项类型
    event PrizeClaimed(address indexed winner, uint256 indexed tokenId, uint256 prizeAmount, uint256 prizeType);
    
    /// @notice 质押奖励被领取时触发
    /// @param staker 质押者地址
    /// @param amount 奖励金额
    /// @param cycle 奖励来源周期
    event StakingRewardClaimed(address indexed staker, uint256 amount, uint256 cycle);

    /// @notice 初始化合约
    /// @param _owner 合约所有者地址
    constructor(address _owner) ERC721("LotteryTicket", "TICKET") Ownable(_owner) {
        currentCycle = 1;
        cycleStartTime = block.timestamp;   
        
        emit CycleStarted(currentCycle, cycleStartTime);
    }
    
    /// @notice 限制只能在活跃周期内执行的操作
    /// @dev 检查当前时间是否在周期结束时间之前
    modifier onlyActiveCycle() {
        require(block.timestamp < cycleStartTime + CYCLE_DURATION, "Cycle ended");
        _;
    }
    
    /// @notice 限制只能对已结束周期执行的操作
    /// @param cycle 要检查的周期编号
    /// @dev 检查指定周期是否已经结束
    modifier onlyEndedCycle(uint256 cycle) {
        require(cycle < currentCycle, "Cycle not ended");
        _;
    }

    /// @notice 质押代币到当前周期
    /// @dev 用户需要先授权合约使用其代币，只能在活跃周期内执行
    function stakeTokens() public payable onlyActiveCycle nonReentrant {
        require(msg.value >= MIN_STAKE_AMOUNT, "Insufficient stake amount");
        
        CycleInfo storage cycle = cycles[currentCycle];
        
        // 如果是第一次质押，将用户添加到质押者列表
        if (cycle.stakedAmounts[msg.sender] == 0) {
            cycleStakers[currentCycle].push(msg.sender);
        }
        
        cycle.stakedAmounts[msg.sender] += msg.value;
        cycle.totalStaked += msg.value;
        
        emit TokensStaked(msg.sender, msg.value, currentCycle);
    }
    
    /// @notice 取消质押的代币
    /// @param amount 要取消质押的代币数量
    /// @dev 只能取消当前周期内的质押，且不能超过已质押的数量
    function unstakeTokens(uint256 amount) external nonReentrant {
        CycleInfo storage cycle = cycles[currentCycle];
        require(cycle.stakedAmounts[msg.sender] >= amount, "Insufficient staked amount");
        
        cycle.stakedAmounts[msg.sender] -= amount;
        cycle.totalStaked -= amount;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit TokensUnstaked(msg.sender, amount, currentCycle);
    }
    
    /// @notice 购买彩票NFT
    /// @dev 需要支付精确的彩票价格（0.1 ETH），只能在活跃周期内购买
    function buyTicket() external payable onlyActiveCycle nonReentrant {
        require(msg.value == TICKET_PRICE, "Incorrect ticket price");
        
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        
        // 铸造NFT彩票给购买者
        _mint(msg.sender, tokenId);
        
        // 创建彩票信息
        tickets[tokenId] = TicketInfo({
            cycle: currentCycle,
            owner: msg.sender,
            isRedeemed: false,
            prizeType: 0,  // 初始为未中奖
            prizeAmount: 0
        });
        
        userTickets[msg.sender].push(tokenId);
        
        // 更新周期统计信息
        CycleInfo storage cycle = cycles[currentCycle];
        cycle.totalTickets++;
        cycle.totalSales += msg.value;
        
        emit TicketMinted(msg.sender, tokenId, currentCycle);
    }
    
    /// @notice 结束当前周期并开始新周期
    /// @dev 只有合约所有者可以调用，必须在周期结束后才能执行
    function finalizeCycle() external onlyOwner {
        require(block.timestamp >= cycleStartTime + CYCLE_DURATION, "Cycle not ended");
        require(!cycles[currentCycle].isFinalized, "Cycle already finalized");
        
        // 执行抽奖和奖励分配
        _drawLottery();
        _distributeRewards();
        
        cycles[currentCycle].isFinalized = true;
        
        // 开始新周期
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
    
    /// @notice 分配质押奖励
    /// @dev 根据质押数量和总质押量计算奖励，并分配给质押者
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
    
    /// @notice 计算奖金池的动态调整系数
    /// @param totalSales 当前周期的彩票销售总收入
    /// @param totalStaked 当前周期的总质押量
    /// @return 动态调整系数（基数为10000）
    /// @dev 动态调整算法:
    /// - 销售额 ≥ 质押总额: 奖金池占总销售额的70%
    /// - 销售额 ≥ 50%质押总额: 奖金池占总销售额的60%  
    /// - 销售额 < 50%质押总额: 奖金池占总销售额的40%
    /// 这样设计可以确保在彩票销售不佳时，质押者仍然有合理的收益
    function _calculateDynamicAdjustment(uint256 totalSales, uint256 totalStaked) internal pure returns (uint256) {
        if (totalStaked == 0) return 5000; // 默认情况下奖金池占 50%
        
        // 计算销售额与质押总量的比例（放大万倍以避免精度损失）
        uint256 salesStakeRatio = (totalSales * 10000) / totalStaked;
        
        if (salesStakeRatio >= 10000) {
            return 7000; // 销售额 ≥ 质押总额，奖金池 70%
        } else if (salesStakeRatio >= 5000) {
            return 6000; // 销售额 ≥ 50%质押总额，奖金池 60%
        } else {
            return 4000; // 销售额 < 50%质押总额，奖金池 40%，确保质押收益
        }
    }
    
    /// @notice 生成伪随机数给彩票抽奖使用
    /// @param tokenId 彩票NFT的ID
    /// @param totalTickets 当前周期的彩票总数
    /// @return 0到9999之间的伪随机数
    /// @dev 使用多个不可预测的区块链参数组合生成随机数:
    /// - block.timestamp: 当前区块的时间戳
    /// - block.prevrandao: 上一个区块的随机值 (EIP-4399)
    /// - tokenId: 彩票的唯一ID
    /// - totalTickets: 彩票总数，增加随机性  
    /// - msg.sender: 调用者地址
    /// 注意: 这不是真正的随机数，存在被矿工操纵的风险
    function _generateRandom(uint256 tokenId, uint256 totalTickets) internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            tokenId,
            totalTickets,
            msg.sender
        ))) % 10000; // 返回 0-9999 的随机数
    }
    
    /// @notice 领取彩票中奖奖金
    /// @param tokenId 中奖彩票的NFT ID
    /// @dev 只有彩票持有者可以领取，且只能领取一次
    function claimPrize(uint256 tokenId) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        TicketInfo storage ticket = tickets[tokenId];
        require(!ticket.isRedeemed, "Prize already claimed");
        require(ticket.prizeType > 0, "No prize to claim");
        require(cycles[ticket.cycle].isFinalized, "Cycle not finalized");
        
        ticket.isRedeemed = true;
        
        // 转账奖金给中奖者
        (bool success, ) = payable(msg.sender).call{value: ticket.prizeAmount}("");
        require(success, "Prize transfer failed");
        
        emit PrizeClaimed(msg.sender, tokenId, ticket.prizeAmount, ticket.prizeType);
    }
    
    /// @notice 领取指定周期的质押奖励
    /// @param cycle 要领取奖励的周期编号
    /// @dev 只能领取已结束周期的奖励，且每个地址每个周期只能领取一次
    function claimStakingReward(uint256 cycle) external onlyEndedCycle(cycle) nonReentrant {
        CycleInfo storage cycleInfo = cycles[cycle];
        require(cycleInfo.isFinalized, "Cycle not finalized");
        
        uint256 reward = cycleInfo.stakingRewards[msg.sender];
        require(reward > 0, "No rewards to claim");
        
        // 清零奖励以防止重复领取
        cycleInfo.stakingRewards[msg.sender] = 0;
        
        // 转账奖励给质押者
        (bool success, ) = payable(msg.sender).call{value: reward}("");
        require(success, "Reward transfer failed");
        
        emit StakingRewardClaimed(msg.sender, reward, cycle);
    }
    
    // ========== 查询函数 ==========
    
    /// @notice 查询指定用户在指定周期的质押数量
    /// @param staker 质押者地址
    /// @param cycle 周期编号
    /// @return 质押的代币数量
    function getStakedAmount(address staker, uint256 cycle) external view returns (uint256) {
        return cycles[cycle].stakedAmounts[staker];
    }
    
    /// @notice 查询指定用户在指定周期的可领取奖励
    /// @param staker 质押者地址
    /// @param cycle 周期编号
    /// @return 可领取的奖励金额
    function getStakingReward(address staker, uint256 cycle) external view returns (uint256) {
        return cycles[cycle].stakingRewards[staker];
    }
    
    /// @notice 查询指定用户拥有的所有彩票ID
    /// @param user 用户地址
    /// @return 用户拥有的彩票ID数组
    function getUserTickets(address user) external view returns (uint256[] memory) {
        return userTickets[user];
    }
    
    /// @notice 查询指定彩票的详细信息
    /// @param tokenId 彩票NFT ID
    /// @return 彩票的完整信息结构体
    function getTicketInfo(uint256 tokenId) external view returns (TicketInfo memory) {
        return tickets[tokenId];
    }
    
    /// @notice 查询指定周期的基本信息
    /// @param cycle 周期编号
    /// @return totalStaked 该周期内的总质押量
    /// @return totalTickets 该周期内售出的彩票总数
    /// @return totalSales 该周期内的彩票销售总收入
    /// @return rewardPool 分配给质押者的奖励池金额
    /// @return isFinalized 该周期是否已完成结算
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
    
    /// @notice 查询当前周期的剩余时间
    /// @return 当前周期的剩余秒数，如果已结束则返回0
    function getCurrentCycleTimeLeft() external view returns (uint256) {
        uint256 endTime = cycleStartTime + CYCLE_DURATION;
        if (block.timestamp >= endTime) return 0;
        return endTime - block.timestamp;
    }
    
    
    /// @notice 接收ETH转账的回退函数
    /// @dev 允许合约接收直接的ETH转账
    receive() external payable {}
}