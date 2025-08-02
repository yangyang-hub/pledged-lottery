//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import {console} from "forge-std/console.sol";
import {LotteryToken} from "./LotteryToken.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PledgedLottery
 * @dev 彩票系统主合约 - 管理彩票周期、奖金池和奖金发放
 * 基于NFT的彩票系统，支持7天周期、手动刮刮乐开奖、50%综合中奖率
 * 无平台手续费，所有销售收入用作奖金池
 */
contract PledgedLottery is Ownable, ReentrancyGuard, Pausable {
    
    /// @notice 彩票NFT合约地址
    LotteryToken public immutable lotteryToken;
    
    /// @notice 每个彩票周期的持续时间（7天）
    uint256 public constant ROUND_DURATION = 7 days;
    
    /// @notice 当前活跃的彩票周期编号
    uint256 public currentRound;
    
    /// @notice 当前周期的开始时间戳
    uint256 public roundStartTime;
    
    /// @notice 合约的总收入（用于统计）
    uint256 public totalRevenue;
    
    /// @notice 总发放奖金（用于统计）
    uint256 public totalPrizePaid;
    
    /// @notice 批量奖金领取的奖金信息结构体
    struct PrizeInfo {
        /// @notice 彩票ID
        uint256 tokenId;
        /// @notice 奖金金额
        uint256 amount;
    }
    
    /// @notice 彩票购买统计事件
    /// @param buyer 购买者地址
    /// @param round 购买周期
    /// @param ticketId 彩票ID
    /// @param amount 支付金额
    event TicketPurchased(address indexed buyer, uint256 indexed round, uint256 ticketId, uint256 amount);
    
    /// @notice 周期结束事件
    /// @param round 结束的周期号
    /// @param totalTickets 该周期总彩票数
    /// @param prizePool 奖金池金额
    event RoundFinalized(uint256 indexed round, uint256 totalTickets, uint256 prizePool);
    
    /// @notice 奖金领取事件
    /// @param winner 中奖者地址
    /// @param round 中奖周期
    /// @param amount 奖金金额
    /// @param ticketCount 中奖彩票数量
    event PrizesClaimed(address indexed winner, uint256 indexed round, uint256 amount, uint256 ticketCount);
    
    /// @notice 紧急提取事件
    /// @param owner 合约所有者
    /// @param amount 提取金额
    event EmergencyWithdraw(address indexed owner, uint256 amount);

    /// @notice 初始化合约
    /// @param _owner 合约所有者地址
    constructor(address _owner) Ownable(_owner) {
        lotteryToken = new LotteryToken(_owner, address(this));
        currentRound = 1;
        roundStartTime = block.timestamp;
    }
    
    /// @notice 限制只能在活跃周期内执行的操作
    modifier onlyActiveRound() {
        require(block.timestamp < roundStartTime + ROUND_DURATION, unicode"当前周期已结束");
        _;
    }
    
    /// @notice 购买彩票
    /// @dev 代理调用LotteryToken合约的buyTicketFor函数
    function buyTicket() external payable onlyActiveRound whenNotPaused nonReentrant {
        // 记录收入
        totalRevenue += msg.value;
        
        // 将ETH转发给LotteryToken合约并调用buyTicketFor
        lotteryToken.buyTicketFor{value: msg.value}(msg.sender);
        
        emit TicketPurchased(msg.sender, currentRound, lotteryToken.totalSupply(), msg.value);
    }
    
    /// @notice 刮开彩票（刮刮乐机制）
    /// @param tokenId 要刮开的彩票ID
    function scratchTicket(uint256 tokenId) external whenNotPaused {
        // 使用scratchTicketFor代理调用
        lotteryToken.scratchTicketFor(tokenId, msg.sender);
    }
    
    /// @notice 领取单张彩票奖金
    /// @param tokenId 中奖彩票的NFT ID
    function claimPrize(uint256 tokenId) external whenNotPaused nonReentrant {
        // 获取奖金金额用于统计
        LotteryToken.TicketInfo memory ticketInfo = lotteryToken.getTicketInfo(tokenId);
        uint256 prizeAmount = ticketInfo.prizeAmount;
        
        // 调用LotteryToken合约的claimPrizeFor函数
        lotteryToken.claimPrizeFor(tokenId, msg.sender);
        
        // 更新统计
        totalPrizePaid += prizeAmount;
    }
    
    /// @notice 批量领取多张彩票奖金
    /// @param tokenIds 中奖彩票ID数组
    /// @dev 用户可以一次性领取多张中奖彩票的奖金，降低gas成本
    function claimPrizes(uint256[] calldata tokenIds) external whenNotPaused nonReentrant {
        require(tokenIds.length > 0, unicode"彩票ID数组不能为空");
        require(tokenIds.length <= 50, unicode"一次最多领取50张彩票奖金"); // 防止gas超限
        
        uint256 totalAmount = 0;
        uint256 validTickets = 0;
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            
            // 检查是否为有效的中奖彩票
            try lotteryToken.ownerOf(tokenId) returns (address owner) {
                if (owner == msg.sender) {
                    LotteryToken.TicketInfo memory ticketInfo = lotteryToken.getTicketInfo(tokenId);
                    
                    if (ticketInfo.isScratched && ticketInfo.prizeType > 0 && !ticketInfo.isPrizeClaimed) {
                        try lotteryToken.claimPrizeFor(tokenId, msg.sender) {
                            totalAmount += ticketInfo.prizeAmount;
                            validTickets++;
                        } catch {
                            // 如果某张彩票领取失败，继续处理其他彩票
                            continue;
                        }
                    }
                }
            } catch {
                // 如果彩票不存在，继续处理其他彩票
                continue;
            }
        }
        
        require(validTickets > 0, unicode"没有可领取的中奖彩票");
        
        // 更新统计
        totalPrizePaid += totalAmount;
        
        // 获取当前周期（从第一张有效彩票获取）
        uint256 round = currentRound;
        if (tokenIds.length > 0) {
            LotteryToken.TicketInfo memory firstTicketInfo = lotteryToken.getTicketInfo(tokenIds[0]);
            round = firstTicketInfo.round;
        }
        
        emit PrizesClaimed(msg.sender, round, totalAmount, validTickets);
    }
    
    /// @notice 结束当前周期并开始新周期
    /// @dev 只有合约所有者可以调用，必须在周期结束后才能执行
    function finalizeRound() external onlyOwner {
        require(block.timestamp >= roundStartTime + ROUND_DURATION, unicode"当前周期尚未结束");
        
        // 调用LotteryToken合约结束当前周期
        lotteryToken.endCurrentRound();
        
        // 获取当前周期信息用于事件
        LotteryToken.RoundInfo memory roundInfo = lotteryToken.getRoundInfo(currentRound);
        
        emit RoundFinalized(currentRound, roundInfo.totalTickets, roundInfo.prizePool);
        
        // 更新本合约的周期信息
        currentRound++;
        roundStartTime = block.timestamp;
    }
    
    // ========== 管理员函数 ==========
    
    /// @notice 暂停合约（紧急情况下使用）
    function pause() external onlyOwner {
        _pause();
    }
    
    /// @notice 恢复合约运行
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /// @notice 紧急提取合约余额（仅在紧急情况下使用）
    /// @dev 只有在合约暂停状态下才能执行
    function emergencyWithdraw() external onlyOwner whenPaused {
        uint256 balance = address(this).balance;
        require(balance > 0, unicode"合约余额为零");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, unicode"提取失败");
        
        emit EmergencyWithdraw(owner(), balance);
    }
    
    // ========== 查询函数 ==========
    
    /// @notice 查询指定用户拥有的所有彩票
    /// @param user 用户地址
    /// @return 用户拥有的彩票ID数组
    function getUserTickets(address user) external view returns (uint256[] memory) {
        return lotteryToken.getUserTickets(user);
    }
    
    /// @notice 查询指定彩票的详细信息
    /// @param tokenId 彩票NFT ID
    /// @return round 彩票所属周期
    /// @return isScratched 是否已刮开
    /// @return prizeType 奖项类型
    /// @return prizeAmount 奖金金额
    /// @return isPrizeClaimed 奖金是否已领取
    /// @return randomSeed 随机种子
    function getTicketInfo(uint256 tokenId) external view returns (
        uint256 round,
        bool isScratched,
        uint256 prizeType,
        uint256 prizeAmount,
        bool isPrizeClaimed,
        bytes32 randomSeed
    ) {
        LotteryToken.TicketInfo memory ticketInfo = lotteryToken.getTicketInfo(tokenId);
        return (
            ticketInfo.round,
            ticketInfo.isScratched,
            ticketInfo.prizeType,
            ticketInfo.prizeAmount,
            ticketInfo.isPrizeClaimed,
            ticketInfo.randomSeed
        );
    }
    
    /// @notice 查询指定周期的基本信息
    /// @param round 周期编号
    /// @return totalTickets 总彩票数
    /// @return totalSales 总销售额
    /// @return prizePool 奖金池
    /// @return isEnded 是否已结束
    function getRoundInfo(uint256 round) external view returns (
        uint256 totalTickets,
        uint256 totalSales,
        uint256 prizePool,
        bool isEnded
    ) {
        LotteryToken.RoundInfo memory roundInfo = lotteryToken.getRoundInfo(round);
        return (
            roundInfo.totalTickets,
            roundInfo.totalSales,
            roundInfo.prizePool,
            roundInfo.isEnded
        );
    }
    
    /// @notice 查询当前周期的剩余时间
    /// @return 当前周期的剩余秒数，如果已结束则返回0
    function getCurrentRoundTimeLeft() external view returns (uint256) {
        return lotteryToken.getCurrentRoundTimeLeft();
    }
    
    /// @notice 查询用户的中奖彩票信息
    /// @param user 用户地址
    /// @return winningTickets 中奖彩票ID数组
    /// @return prizeAmounts 对应的奖金金额数组
    function getUserWinningTickets(address user) external view returns (uint256[] memory winningTickets, uint256[] memory prizeAmounts) {
        return lotteryToken.getUserWinningTickets(user);
    }
    
    /// @notice 查询用户在指定周期购买的彩票数量
    /// @param user 用户地址
    /// @param round 周期编号
    /// @return 用户在该周期购买的彩票数量
    function getUserTicketCountInRound(address user, uint256 round) external view returns (uint256) {
        return lotteryToken.getUserTicketCountInRound(user, round);
    }
    
    /// @notice 查询合约的基本统计信息
    /// @return currentRound_ 当前周期号
    /// @return totalRevenue_ 总收入
    /// @return totalPrizePaid_ 总发放奖金
    /// @return systemBalance 系统总余额（包括LotteryToken合约余额）
    function getContractStats() external view returns (
        uint256 currentRound_,
        uint256 totalRevenue_,
        uint256 totalPrizePaid_,
        uint256 systemBalance
    ) {
        return (
            currentRound,
            totalRevenue,
            totalPrizePaid,
            address(this).balance + address(lotteryToken).balance
        );
    }
    
    /// @notice 查询彩票价格
    /// @return 单张彩票的价格（wei）
    function getTicketPrice() external view returns (uint256) {
        return lotteryToken.TICKET_PRICE();
    }
    
    /// @notice 查询LotteryToken合约地址
    /// @return LotteryToken合约的地址
    function getLotteryTokenAddress() external view returns (address) {
        return address(lotteryToken);
    }
    
    /// @notice 接收ETH转账的回退函数
    /// @dev 允许合约接收直接的ETH转账，用于奖金池充值
    receive() external payable {
        totalRevenue += msg.value;
    }
    
    /// @notice 回退函数
    /// @dev 处理无法匹配的函数调用
    fallback() external payable {
        totalRevenue += msg.value;
    }
}