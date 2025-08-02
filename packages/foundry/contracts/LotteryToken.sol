//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LotteryToken
 * @dev 彩票NFT代币合约 - 用于创建和管理彩票NFT
 * 每个NFT代表一张彩票，通过原生代币购买铸造
 * 包含手动刮刮乐开奖机制，用户可以随时刮开自己的彩票查看中奖情况
 */
contract LotteryToken is ERC721, ERC721Enumerable, Ownable, ReentrancyGuard {
    
    /// @notice 单张彩票的价格（0.01 ETH）
    uint256 public constant TICKET_PRICE = 0.01 ether;
    
    /// @notice 彩票NFT的ID计数器
    uint256 private _tokenIdCounter = 1;
    
    /// @notice 当前活跃的彩票周期编号
    uint256 public currentRound;
    
    /// @notice 当前周期的开始时间戳
    uint256 public roundStartTime;
    
    /// @notice 每个彩票周期的持续时间（7天）
    uint256 public constant ROUND_DURATION = 7 days;
    
    /// @notice 小奖中奖概率 (30% * 总中奖率50% = 15%)
    uint256 public constant SMALL_PRIZE_RATE = 1500;
    
    /// @notice 中奖中奖概率 (15% * 总中奖率50% = 7.5%)
    uint256 public constant MEDIUM_PRIZE_RATE = 750;
    
    /// @notice 大奖中奖概率 (5% * 总中奖率50% = 2.5%)
    uint256 public constant BIG_PRIZE_RATE = 250;
    
    /// @notice 特等奖中奖概率 (0.5% * 总中奖率50% = 0.25%)
    uint256 public constant SUPER_PRIZE_RATE = 25;
    
    /// @notice 总中奖率 (50%)
    uint256 public constant TOTAL_WIN_RATE = 5000;
    
    /// @notice 彩票信息结构体
    struct TicketInfo {
        /// @notice 彩票所属的周期编号
        uint256 round;
        /// @notice 彩票是否已被刮开（开奖）
        bool isScratched;
        /// @notice 奖项类型：0=未中奖, 1=小奖, 2=中奖, 3=大奖, 4=特等奖
        uint256 prizeType;
        /// @notice 奖金金额（以wei为单位）
        uint256 prizeAmount;
        /// @notice 奖金是否已被领取
        bool isPrizeClaimed;
        /// @notice 彩票的随机种子（用于确定性开奖）
        bytes32 randomSeed;
    }
    
    /// @notice 每个周期的信息结构体
    struct RoundInfo {
        /// @notice 该周期内售出的彩票总数
        uint256 totalTickets;
        /// @notice 该周期内彩票销售总收入（ETH）
        uint256 totalSales;
        /// @notice 该周期的奖金池总额
        uint256 prizePool;
        /// @notice 该周期是否已结束
        bool isEnded;
        /// @notice 已发放的奖金总额
        uint256 totalPaidPrizes;
    }
    
    /// @notice 彩票ID到彩票信息的映射
    mapping(uint256 => TicketInfo) public tickets;
    
    /// @notice 每个周期的详细信息映射
    mapping(uint256 => RoundInfo) public rounds;
    
    /// @notice 用户地址到其拥有的彩票ID列表的映射
    mapping(address => uint256[]) public userTickets;
    
    /// @notice 新周期开始时触发
    /// @param round 周期编号
    /// @param startTime 开始时间戳
    event RoundStarted(uint256 indexed round, uint256 startTime);
    
    /// @notice 周期结束时触发
    /// @param round 周期编号
    /// @param totalTickets 该周期总彩票数
    /// @param prizePool 奖金池金额
    event RoundEnded(uint256 indexed round, uint256 totalTickets, uint256 prizePool);
    
    /// @notice 购买彩票时触发
    /// @param buyer 购买者地址
    /// @param tokenId 彩票NFT的ID
    /// @param round 购买彩票的周期
    event TicketPurchased(address indexed buyer, uint256 indexed tokenId, uint256 round);
    
    /// @notice 彩票被刮开时触发
    /// @param owner 彩票持有者地址
    /// @param tokenId 彩票ID
    /// @param prizeType 奖项类型
    /// @param prizeAmount 奖金金额
    event TicketScratched(address indexed owner, uint256 indexed tokenId, uint256 prizeType, uint256 prizeAmount);
    
    /// @notice 奖金被领取时触发
    /// @param winner 中奖者地址
    /// @param tokenId 中奖彩票ID
    /// @param prizeAmount 奖金金额
    event PrizeClaimed(address indexed winner, uint256 indexed tokenId, uint256 prizeAmount);

    /// @notice PledgedLottery合约地址
    address public pledgedLotteryContract;
    
    /// @notice 限制只有owner或PledgedLottery合约可以调用
    modifier onlyOwnerOrPledgedLottery() {
        require(msg.sender == owner() || msg.sender == pledgedLotteryContract, "Unauthorized");
        _;
    }
    /// @notice 初始化合约
    /// @param _owner 合约所有者地址
    /// @param _pledgedLotteryContract PledgedLottery合约地址
    constructor(address _owner, address _pledgedLotteryContract) ERC721("LotteryTicket", "LOTTERY") Ownable(_owner) {
        require(_pledgedLotteryContract != address(0), "Invalid PledgedLottery address");
        pledgedLotteryContract = _pledgedLotteryContract;
        currentRound = 1;
        roundStartTime = block.timestamp;
        
        emit RoundStarted(currentRound, roundStartTime);
    }
    
    /// @notice 限制只能在活跃周期内执行的操作
    modifier onlyActiveRound() {
        require(block.timestamp < roundStartTime + ROUND_DURATION, unicode"当前周期已结束");
        _;
    }
    
    /// @notice 购买彩票NFT
    /// @dev 需要支付精确的彩票价格，只能在活跃周期内购买
    function buyTicket() external payable onlyActiveRound nonReentrant {

        //可批量购买
        require(msg.value > 0, unicode"请至少支付0.01 ETH");
        require(msg.value % TICKET_PRICE == 0, unicode"彩票价格必须是0.01 ETH的整数倍");
        uint256 ticketCount = msg.value / TICKET_PRICE;
        require(ticketCount > 0, unicode"至少购买一张彩票");

        // 循环铸造多张彩票
        for (uint256 i = 0; i < ticketCount; i++) {
            uint256 tokenId = _tokenIdCounter;
            _tokenIdCounter++;
            
            // 生成彩票的随机种子，用于后续开奖
            bytes32 randomSeed = keccak256(abi.encodePacked(
                block.timestamp,
                block.prevrandao,
                msg.sender,
                tokenId,
                currentRound
            ));
            
            // 铸造NFT彩票给购买者
            _mint(msg.sender, tokenId);
            
            // 创建彩票信息
            tickets[tokenId] = TicketInfo({
                round: currentRound,
                isScratched: false,
                prizeType: 0,
                prizeAmount: 0,
                isPrizeClaimed: false,
                randomSeed: randomSeed
            });
            
            userTickets[msg.sender].push(tokenId);
            
            emit TicketPurchased(msg.sender, tokenId, currentRound);
        }
            
        // 更新周期统计信息
        RoundInfo storage round = rounds[currentRound];
        round.totalTickets += ticketCount;
        round.totalSales += msg.value;

    }
    
    /// @notice 代理购买彩票NFT（仅限PledgedLottery合约调用）
    /// @param buyer 实际购买者地址
    /// @dev 允许PledgedLottery合约代表用户购买彩票
    function buyTicketFor(address buyer) external payable onlyActiveRound nonReentrant {
        require(msg.value == TICKET_PRICE, unicode"彩票价格不正确");
        require(buyer != address(0), "Invalid buyer address");
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        // 生成彩票的随机种子，用于后续开奖
        bytes32 randomSeed = keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            buyer,
            tokenId,
            currentRound
        ));
        
        // 铸造NFT彩票给购买者
        _mint(buyer, tokenId);
        
        // 创建彩票信息
        tickets[tokenId] = TicketInfo({
            round: currentRound,
            isScratched: false,
            prizeType: 0,
            prizeAmount: 0,
            isPrizeClaimed: false,
            randomSeed: randomSeed
        });
        
        userTickets[buyer].push(tokenId);
        
        // 更新周期统计信息
        RoundInfo storage round = rounds[currentRound];
        round.totalTickets++;
        round.totalSales += msg.value;
        
        emit TicketPurchased(buyer, tokenId, currentRound);
    }
    
    /// @notice 刮开彩票查看中奖结果（刮刮乐机制）
    /// @param tokenId 要刮开的彩票ID
    /// @dev 只有彩票持有者可以刮开，每张彩票只能刮开一次
    function scratchTicket(uint256 tokenId) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, unicode"只有彩票持有者可以刮开");
        TicketInfo storage ticket = tickets[tokenId];
        require(!ticket.isScratched, unicode"彩票已被刮开");
        
        ticket.isScratched = true;
        
        // 基于随机种子计算中奖结果
        uint256 randomValue = uint256(ticket.randomSeed) % 10000;
        
        // 计算奖金池（当前周期销售额的100%用作奖金，无平台手续费）
        RoundInfo storage round = rounds[ticket.round];
        uint256 prizePool = round.totalSales;
        
        // 根据概率确定奖项类型和奖金
        if (randomValue < SUPER_PRIZE_RATE) {
            // 特等奖 - 0.25%概率
            ticket.prizeType = 4;
            ticket.prizeAmount = _calculatePrizeAmount(prizePool, 4);
        } else if (randomValue < SUPER_PRIZE_RATE + BIG_PRIZE_RATE) {
            // 大奖 - 2.5%概率
            ticket.prizeType = 3;
            ticket.prizeAmount = _calculatePrizeAmount(prizePool, 3);
        } else if (randomValue < SUPER_PRIZE_RATE + BIG_PRIZE_RATE + MEDIUM_PRIZE_RATE) {
            // 中奖 - 7.5%概率
            ticket.prizeType = 2;
            ticket.prizeAmount = _calculatePrizeAmount(prizePool, 2);
        } else if (randomValue < TOTAL_WIN_RATE) {
            // 小奖 - 15%概率
            ticket.prizeType = 1;
            ticket.prizeAmount = _calculatePrizeAmount(prizePool, 1);
        } else {
            // 未中奖 - 50%概率
            ticket.prizeType = 0;
            ticket.prizeAmount = 0;
        }
        
        emit TicketScratched(msg.sender, tokenId, ticket.prizeType, ticket.prizeAmount);
    }
    
    /// @notice 代理刮开彩票（仅限PledgedLottery合约调用）
    /// @param tokenId 要刮开的彩票ID
    /// @param scratcher 实际刮票者地址
    /// @dev 允许PledgedLottery合约代表用户刮票
    function scratchTicketFor(uint256 tokenId, address scratcher) external nonReentrant {
        require(msg.sender == pledgedLotteryContract, "Only PledgedLottery can call");
        require(ownerOf(tokenId) == scratcher, unicode"只有彩票持有者可以刮开");
        TicketInfo storage ticket = tickets[tokenId];
        require(!ticket.isScratched, unicode"彩票已被刮开");
        
        ticket.isScratched = true;
        
        // 基于随机种子计算中奖结果
        uint256 randomValue = uint256(ticket.randomSeed) % 10000;
        
        // 计算奖金池（当前周期销售额的100%用作奖金，无平台手续费）
        RoundInfo storage round = rounds[ticket.round];
        uint256 prizePool = round.totalSales;
        
        // 根据概率确定奖项类型和奖金
        if (randomValue < SUPER_PRIZE_RATE) {
            // 特等奖 - 0.25%概率
            ticket.prizeType = 4;
            ticket.prizeAmount = _calculatePrizeAmount(prizePool, 4);
        } else if (randomValue < SUPER_PRIZE_RATE + BIG_PRIZE_RATE) {
            // 大奖 - 2.5%概率
            ticket.prizeType = 3;
            ticket.prizeAmount = _calculatePrizeAmount(prizePool, 3);
        } else if (randomValue < SUPER_PRIZE_RATE + BIG_PRIZE_RATE + MEDIUM_PRIZE_RATE) {
            // 中奖 - 7.5%概率
            ticket.prizeType = 2;
            ticket.prizeAmount = _calculatePrizeAmount(prizePool, 2);
        } else if (randomValue < TOTAL_WIN_RATE) {
            // 小奖 - 15%概率
            ticket.prizeType = 1;
            ticket.prizeAmount = _calculatePrizeAmount(prizePool, 1);
        } else {
            // 未中奖 - 50%概率
            ticket.prizeType = 0;
            ticket.prizeAmount = 0;
        }
        
        emit TicketScratched(scratcher, tokenId, ticket.prizeType, ticket.prizeAmount);
    }
    
    /// @notice 根据奖项类型计算奖金金额
    /// @param prizePool 奖金池总额
    /// @param prizeType 奖项类型
    /// @return 该奖项的奖金金额
    function _calculatePrizeAmount(uint256 prizePool, uint256 prizeType) internal pure returns (uint256) {
        if (prizeType == 4) {
            // 特等奖：奖金池的40%
            return (prizePool * 4000) / 10000;
        } else if (prizeType == 3) {
            // 大奖：奖金池的30%
            return (prizePool * 3000) / 10000;
        } else if (prizeType == 2) {
            // 中奖：奖金池的20%
            return (prizePool * 2000) / 10000;
        } else if (prizeType == 1) {
            // 小奖：奖金池的10%
            return (prizePool * 1000) / 10000;
        }
        return 0;
    }
    
    /// @notice 领取彩票中奖奖金
    /// @param tokenId 中奖彩票的NFT ID
    /// @dev 只有彩票持有者可以领取，且只能领取一次
    function claimPrize(uint256 tokenId) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, unicode"只有彩票持有者可以领取奖金");
        TicketInfo storage ticket = tickets[tokenId];
        require(ticket.isScratched, unicode"请先刮开彩票");
        require(ticket.prizeType > 0, unicode"该彩票未中奖");
        require(!ticket.isPrizeClaimed, unicode"奖金已被领取");
        require(address(this).balance >= ticket.prizeAmount, unicode"合约余额不足");
        
        ticket.isPrizeClaimed = true;
        
        // 更新已发放奖金统计
        RoundInfo storage round = rounds[ticket.round];
        round.totalPaidPrizes += ticket.prizeAmount;
        
        // 转账奖金给中奖者
        (bool success, ) = payable(msg.sender).call{value: ticket.prizeAmount}("");
        require(success, unicode"奖金转账失败");
        
        emit PrizeClaimed(msg.sender, tokenId, ticket.prizeAmount);
    }
    
    /// @notice 代理领取彩票奖金（仅限PledgedLottery合约调用）
    /// @param tokenId 中奖彩票的NFT ID
    /// @param claimer 实际领取者地址
    /// @dev 允许PledgedLottery合约代表用户领取奖金
    function claimPrizeFor(uint256 tokenId, address claimer) external nonReentrant {
        require(msg.sender == pledgedLotteryContract, "Only PledgedLottery can call");
        require(ownerOf(tokenId) == claimer, unicode"只有彩票持有者可以领取奖金");
        TicketInfo storage ticket = tickets[tokenId];
        require(ticket.isScratched, unicode"请先刮开彩票");
        require(ticket.prizeType > 0, unicode"该彩票未中奖");
        require(!ticket.isPrizeClaimed, unicode"奖金已被领取");
        require(address(this).balance >= ticket.prizeAmount, unicode"合约余额不足");
        
        ticket.isPrizeClaimed = true;
        
        // 更新已发放奖金统计
        RoundInfo storage round = rounds[ticket.round];
        round.totalPaidPrizes += ticket.prizeAmount;
        
        // 转账奖金给中奖者
        (bool success, ) = payable(claimer).call{value: ticket.prizeAmount}("");
        require(success, unicode"奖金转账失败");
        
        emit PrizeClaimed(claimer, tokenId, ticket.prizeAmount);
    }
    
    /// @notice 结束当前周期并开始新周期
    /// @dev 只有合约所有者或PledgedLottery合约可以调用，必须在周期结束后才能执行
    function endCurrentRound() external onlyOwnerOrPledgedLottery {
        require(block.timestamp >= roundStartTime + ROUND_DURATION, unicode"当前周期尚未结束");
        require(!rounds[currentRound].isEnded, unicode"当前周期已经结束");
        
        // 设置当前周期的奖金池
        RoundInfo storage round = rounds[currentRound];
        round.prizePool = round.totalSales;
        round.isEnded = true;
        
        emit RoundEnded(currentRound, round.totalTickets, round.prizePool);
        
        // 开始新周期
        currentRound++;
        roundStartTime = block.timestamp;
        
        emit RoundStarted(currentRound, roundStartTime);
    }
    
    // ========== 查询函数 ==========
    
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
    /// @param round 周期编号
    /// @return 周期的完整信息结构体
    function getRoundInfo(uint256 round) external view returns (RoundInfo memory) {
        return rounds[round];
    }
    
    /// @notice 查询当前周期的剩余时间
    /// @return 当前周期的剩余秒数，如果已结束则返回0
    function getCurrentRoundTimeLeft() external view returns (uint256) {
        uint256 endTime = roundStartTime + ROUND_DURATION;
        if (block.timestamp >= endTime) return 0;
        return endTime - block.timestamp;
    }
    
    /// @notice 查询用户在指定周期购买的彩票数量
    /// @param user 用户地址
    /// @param round 周期编号
    /// @return 用户在该周期购买的彩票数量
    function getUserTicketCountInRound(address user, uint256 round) external view returns (uint256) {
        uint256[] memory userTicketIds = userTickets[user];
        uint256 count = 0;
        
        for (uint256 i = 0; i < userTicketIds.length; i++) {
            if (tickets[userTicketIds[i]].round == round) {
                count++;
            }
        }
        
        return count;
    }
    
    /// @notice 查询用户的中奖彩票
    /// @param user 用户地址
    /// @return winningTickets 中奖彩票ID数组
    /// @return prizeAmounts 对应的奖金金额数组
    function getUserWinningTickets(address user) external view returns (uint256[] memory winningTickets, uint256[] memory prizeAmounts) {
        uint256[] memory userTicketIds = userTickets[user];
        uint256 winningCount = 0;
        
        // 先计算中奖彩票数量
        for (uint256 i = 0; i < userTicketIds.length; i++) {
            if (tickets[userTicketIds[i]].prizeType > 0 && tickets[userTicketIds[i]].isScratched) {
                winningCount++;
            }
        }
        
        // 创建结果数组
        winningTickets = new uint256[](winningCount);
        prizeAmounts = new uint256[](winningCount);
        
        // 填充结果数组
        uint256 index = 0;
        for (uint256 i = 0; i < userTicketIds.length; i++) {
            uint256 tokenId = userTicketIds[i];
            if (tickets[tokenId].prizeType > 0 && tickets[tokenId].isScratched) {
                winningTickets[index] = tokenId;
                prizeAmounts[index] = tickets[tokenId].prizeAmount;
                index++;
            }
        }
    }
    
    /// @notice 接收ETH转账的回退函数
    /// @dev 允许合约接收直接的ETH转账
    receive() external payable {}
    
    // ========== 重写必需的函数 ==========
    
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}