// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/PledgedLottery.sol";
import "../contracts/LotteryToken.sol";
import {console} from "forge-std/console.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title DeployYourContract
 * @notice 高级部署脚本，用于部署彩票智能合约系统
 * @dev 继承ScaffoldETHDeploy，提供：
 *      - 自动部署者设置和资金管理
 *      - 合约部署验证和配置
 *      - 网络适配和环境检测
 *      - 部署后的初始化和验证
 * 
 * 使用示例：
 * yarn deploy --file DeployYourContract.s.sol                    # 本地anvil链
 * yarn deploy --file DeployYourContract.s.sol --network sepolia  # 测试网（需要keystore）
 * yarn deploy --file DeployYourContract.s.sol --network mainnet  # 主网（需要keystore）
 */
contract DeployYourContract is ScaffoldETHDeploy {
    using stdJson for string;
    using Strings for uint256;
    
    // 部署的合约实例
    PledgedLottery public pledgedLottery;
    LotteryToken public lotteryToken;
    
    // 部署配置参数
    struct DeployConfig {
        address owner;              // 合约所有者
        uint256 ticketPrice;        // 彩票价格（可配置）
        uint256 roundDuration;      // 周期时长（可配置）
        bool isPaused;              // 初始状态
        string network;             // 网络名称
    }
    
    // 网络配置映射
    mapping(string => DeployConfig) public networkConfigs;
    
    // 当前部署配置
    DeployConfig public deployConfig;
    
    // 部署结果事件
    event ContractDeployed(
        string indexed network,
        address indexed pledgedLottery,
        address indexed lotteryToken,
        address owner,
        uint256 blockNumber
    );
    
    event DeploymentVerified(
        address pledgedLottery,
        address lotteryToken,
        bool verified
    );

    /**
     * @notice 主部署函数
     * @dev 使用ScaffoldEthDeployerRunner修饰符：
     *      - 设置正确的部署者账户并为其提供资金
     *      - 将合约地址和ABI导出到nextjs包
     *      - 支持多网络部署和环境检测
     */
    function run() external ScaffoldEthDeployerRunner {
        console.log("Starting Pledged Lottery System Deployment...");
        console.log("===========================================");
        
        // 1. 初始化网络配置
        _initializeNetworkConfigs();
        
        // 2. 检测和设置部署环境
        _setupDeploymentEnvironment();
        
        // 3. 预部署检查
        _preDeploymentChecks();
        
        // 4. 执行合约部署
        _deployContracts();
        
        // 5. 部署后验证
        _verifyDeployment();
        
        // 6. 初始化合约状态
        _initializeContracts();
        
        // 7. 输出部署信息
        _logDeploymentSummary();
        
        // 8. 生成部署报告
        _generateDeploymentReport();
        
        console.log("Deployment completed successfully!");
    }

    /**
     * @notice 初始化网络配置
     * @dev 为不同网络设置默认参数
     */
    function _initializeNetworkConfigs() internal {
        // 本地开发网络
        networkConfigs["anvil"] = DeployConfig({
            owner: address(0),              // 将在部署时设置
            ticketPrice: 0.01 ether,        // 低价方便测试
            roundDuration: 7 days,
            isPaused: false,
            network: "anvil"
        });
        
        // Sepolia 测试网
        networkConfigs["sepolia"] = DeployConfig({
            owner: address(0),
            ticketPrice: 0.01 ether,        // 测试网使用低价
            roundDuration: 7 days,
            isPaused: false,
            network: "sepolia"
        });
        
        // 以太坊主网
        networkConfigs["mainnet"] = DeployConfig({
            owner: address(0),
            ticketPrice: 0.01 ether,        // 主网正式价格
            roundDuration: 7 days,
            isPaused: true,                 // 主网初始为暂停状态
            network: "mainnet"
        });
        
        // Polygon 主网
        networkConfigs["polygon"] = DeployConfig({
            owner: address(0),
            ticketPrice: 0.01 ether,
            roundDuration: 7 days,
            isPaused: true,
            network: "polygon"
        });
        
        // Arbitrum 主网
        networkConfigs["arbitrum"] = DeployConfig({
            owner: address(0),
            ticketPrice: 0.01 ether,
            roundDuration: 7 days,
            isPaused: true,
            network: "arbitrum"
        });
        
        // Optimism 主网
        networkConfigs["optimism"] = DeployConfig({
            owner: address(0),
            ticketPrice: 0.01 ether,
            roundDuration: 7 days,
            isPaused: true,
            network: "optimism"
        });
        
        // Monad 测试网
        networkConfigs["monadTestnet"] = DeployConfig({
            owner: address(0),
            ticketPrice: 0.001 ether,       // 更低的价格方便测试
            roundDuration: 7 days,
            isPaused: false,                // 测试网默认不暂停
            network: "monadTestnet"
        });
    }
    
    /**
     * @notice 设置部署环境
     * @dev 检测网络并加载对应配置
     */
    function _setupDeploymentEnvironment() internal {
        // 检测当前网络
        string memory currentNetwork = _detectNetwork();
        console.log("Network detected:", currentNetwork);
        
        // 加载网络配置
        deployConfig = networkConfigs[currentNetwork];
        
        // 如果没有预设配置，使用默认配置
        if (bytes(deployConfig.network).length == 0) {
            console.log("WARNING: No predefined config for network, using default...");
            deployConfig = networkConfigs["anvil"];
            deployConfig.network = currentNetwork;
        }
        
        // 设置所有者地址
        deployConfig.owner = deployer;
        
        console.log("Configuration loaded:");
        console.log("  - Owner:", deployConfig.owner);
        console.log("  - Ticket Price:", deployConfig.ticketPrice);
        console.log("  - Round Duration:", deployConfig.roundDuration);
        console.log("  - Initially Paused:", deployConfig.isPaused);
    }
    
    /**
     * @notice 检测当前网络
     * @return 网络名称
     */
    function _detectNetwork() internal view returns (string memory) {
        uint256 chainId = block.chainid;
        
        if (chainId == 1) return "mainnet";
        if (chainId == 11155111) return "sepolia";
        if (chainId == 137) return "polygon";
        if (chainId == 42161) return "arbitrum";
        if (chainId == 10) return "optimism";
        if (chainId == 8453) return "base";
        if (chainId == 31337) return "anvil";
        if (chainId == 41717) return "monadTestnet";  // Monad 测试网链ID
        
        return "unknown";
    }
    
    /**
     * @notice 部署前检查
     * @dev 验证部署环境和参数
     */
    function _preDeploymentChecks() internal {
        console.log("Pre-deployment checks...");
        
        // 检查部署者余额
        require(deployer.balance > 0.1 ether, "Insufficient deployer balance");
        console.log("Deployer balance sufficient:", deployer.balance);
        
        // 检查配置参数
        require(deployConfig.owner != address(0), "Owner address not set");
        require(deployConfig.ticketPrice > 0, "Invalid ticket price");
        require(deployConfig.roundDuration > 0, "Invalid round duration");
        console.log("Configuration parameters valid");
        
        // 网络特定检查
        if (keccak256(abi.encodePacked(deployConfig.network)) == keccak256(abi.encodePacked("mainnet"))) {
            console.log("WARNING: Deploying to MAINNET - Please double-check all parameters!");
            require(deployConfig.isPaused == true, "Mainnet deployment should start paused");
        }
        
        console.log("All pre-deployment checks passed");
    }
    
    /**
     * @notice 执行合约部署
     * @dev 部署PledgedLottery和LotteryToken合约
     */
    function _deployContracts() internal {
        console.log("Deploying contracts...");
        
        // 部署主合约
        pledgedLottery = new PledgedLottery(deployConfig.owner);
        console.log("PledgedLottery deployed at:", address(pledgedLottery));
        
        // 获取LotteryToken地址
        lotteryToken = LotteryToken(payable(pledgedLottery.getLotteryTokenAddress()));
        console.log("LotteryToken deployed at:", address(lotteryToken));
        
        // 发出部署事件
        emit ContractDeployed(
            deployConfig.network,
            address(pledgedLottery),
            address(lotteryToken),
            deployConfig.owner,
            block.number
        );
        
        console.log("Contract deployment completed");
    }

    /**
     * @notice 部署后验证
     * @dev 验证合约部署成功且状态正确
     */
    function _verifyDeployment() internal {
        console.log("Verifying deployment...");
        
        // 基本部署验证
        require(address(pledgedLottery) != address(0), "PledgedLottery deployment failed");
        require(address(lotteryToken) != address(0), "LotteryToken deployment failed");
        console.log("Contract addresses valid");
        
        // 所有者验证
        require(pledgedLottery.owner() == deployConfig.owner, "PledgedLottery owner incorrect");
        require(lotteryToken.owner() == deployConfig.owner, "LotteryToken owner incorrect");
        console.log("Contract ownership verified");
        
        // 初始状态验证
        require(pledgedLottery.currentRound() == 1, "Initial round incorrect");
        require(lotteryToken.currentRound() == 1, "LotteryToken initial round incorrect");
        console.log("Initial state verified");
        
        // 合约关联验证
        require(pledgedLottery.getLotteryTokenAddress() == address(lotteryToken), "Contract linkage incorrect");
        require(lotteryToken.pledgedLotteryContract() == address(pledgedLottery), "Reverse linkage incorrect");
        console.log("Contract linkage verified");
        
        // 参数验证
        require(lotteryToken.TICKET_PRICE() > 0, "Ticket price not set");
        require(lotteryToken.ROUND_DURATION() > 0, "Round duration not set");
        console.log("Contract parameters verified");
        
        // 发出验证事件
        emit DeploymentVerified(
            address(pledgedLottery),
            address(lotteryToken),
            true
        );
        
        console.log("All deployment verifications passed");
    }
    
    /**
     * @notice 初始化合约状态
     * @dev 根据配置设置初始状态
     */
    function _initializeContracts() internal {
        if (deployConfig.isPaused) {
            console.log("Setting contracts to paused state...");
            
            pledgedLottery.pause();
            console.log("PledgedLottery paused");
        }
        
        console.log("Contract initialization completed");
    }
    
    /**
     * @notice 输出部署摘要
     * @dev 显示重要的部署信息
     */
    function _logDeploymentSummary() internal view {
        console.log("\n*** DEPLOYMENT SUMMARY ***");
        console.log("===========================================");
        console.log("Network:", deployConfig.network);
        console.log("Chain ID:", block.chainid);
        console.log("Block Number:", block.number);
        console.log("Timestamp:", block.timestamp);
        console.log("");
        
        console.log("Contract Addresses:");
        console.log("  PledgedLottery:", address(pledgedLottery));
        console.log("  LotteryToken:  ", address(lotteryToken));
        console.log("");
        
        console.log("Ownership:");
        console.log("  Owner:", deployConfig.owner);
        console.log("");
        
        console.log("Configuration:");
        console.log("  Ticket Price:", deployConfig.ticketPrice, "wei");
        console.log("  Round Duration:", deployConfig.roundDuration, "seconds");
        console.log("  Initially Paused:", deployConfig.isPaused);
        console.log("");
        
        console.log("Lottery Parameters:");
        console.log("  Total Win Rate:", lotteryToken.TOTAL_WIN_RATE(), "basis points (50%)");
        console.log("  Small Prize Rate:", lotteryToken.SMALL_PRIZE_RATE(), "basis points");
        console.log("  Medium Prize Rate:", lotteryToken.MEDIUM_PRIZE_RATE(), "basis points");
        console.log("  Big Prize Rate:", lotteryToken.BIG_PRIZE_RATE(), "basis points");
        console.log("  Super Prize Rate:", lotteryToken.SUPER_PRIZE_RATE(), "basis points");
        console.log("");
        
        console.log("Usage Instructions:");
        console.log("  1. Buy tickets: pledgedLottery.buyTicket{value: ticketPrice}()");
        console.log("  2. Scratch tickets: pledgedLottery.scratchTicket(tokenId)");
        console.log("  3. Claim prizes: pledgedLottery.claimPrize(tokenId)");
        console.log("  4. Batch claim: pledgedLottery.claimPrizes(tokenIds[])");
        console.log("  5. End round: pledgedLottery.finalizeRound() (owner only)");
        
        if (deployConfig.isPaused) {
            console.log("");
            console.log("WARNING: CONTRACTS ARE PAUSED - Remember to unpause before use!");
            console.log("    pledgedLottery.unpause() (owner only)");
        }
        
        console.log("===========================================");
    }
    
    /**
     * @notice 生成部署报告
     * @dev 创建详细的部署报告文件
     */
    function _generateDeploymentReport() internal {
        console.log("Generating deployment report...");
        
        // 创建 JSON 报告
        string memory report = string(
            abi.encodePacked(
                '{',
                '  "network": "', deployConfig.network, '",',
                '  "chainId": ', block.chainid.toString(), ',',
                '  "blockNumber": ', block.number.toString(), ',',
                '  "timestamp": ', block.timestamp.toString(), ',',
                '  "contracts": {',
                '    "pledgedLottery": "', _addressToString(address(pledgedLottery)), '",',
                '    "lotteryToken": "', _addressToString(address(lotteryToken)), '"',
                '  },',
                '  "configuration": {',
                '    "owner": "', _addressToString(deployConfig.owner), '",',
                '    "ticketPrice": "', deployConfig.ticketPrice.toString(), '",',
                '    "roundDuration": ', deployConfig.roundDuration.toString(), ',',
                '    "isPaused": ', deployConfig.isPaused ? 'true' : 'false',
                '  }',
                '}'
            )
        );
        
        // 在实际应用中，可以将报告写入文件
        // vm.writeFile("deployment-report.json", report);
        
        console.log("Deployment report generated");
    }
    
    /**
     * @notice 地址转字符串工具函数
     */
    function _addressToString(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
}