# CLAUDE.md - Pledged Lottery Project Documentation

## 项目概述

**Pledged Lottery** 是一个基于以太坊的去中心化NFT彩票系统，专为Monad区块链设计。该项目采用刮刮乐机制，提供公平透明的彩票游戏体验，具有25%的综合中奖率和四级奖励体系。

### 核心特性
- 🎟️ **NFT彩票系统**: 每张彩票都是独特的ERC-721 NFT
- 🪙 **刮刮乐机制**: 手动开奖，增加游戏互动性
- 🎯 **25%综合中奖率**: 四级奖励体系（特等奖、大奖、中奖、小奖）
- ⚡ **实时运行**: 持续运行的彩票系统，无时间限制
- 💰 **零平台费用**: 100%销售收入用作奖金池
- 🔒 **公平透明**: 基于区块链的随机数生成

## 技术架构

### 技术栈
- **区块链**: Ethereum, Solidity ^0.8.0
- **智能合约框架**: Foundry
- **前端**: Next.js 15, TypeScript, TailwindCSS
- **Web3库**: Wagmi v2, Viem v2, RainbowKit v2
- **NFT标准**: ERC-721, ERC-721Enumerable
- **安全性**: OpenZeppelin合约库

### 项目结构
```
pledged-lottery/
├── packages/
│   ├── foundry/              # 智能合约和区块链相关
│   │   ├── contracts/        # Solidity智能合约
│   │   │   ├── PledgedLottery.sol    # 主彩票合约
│   │   │   └── LotteryToken.sol      # NFT彩票合约
│   │   ├── script/           # 部署脚本
│   │   ├── test/             # 合约测试
│   │   ├── foundry.toml      # Foundry配置
│   │   └── Makefile          # 构建脚本
│   └── nextjs/               # 前端应用
│       ├── app/              # Next.js App Router页面
│       ├── components/       # React组件
│       │   └── pledged-lottery/  # 彩票专用组件
│       ├── hooks/            # 自定义React hooks
│       ├── utils/            # 工具函数
│       └── scaffold.config.ts # Scaffold-ETH配置
├── package.json              # 主工作区配置
└── yarn.lock                 # 依赖锁定文件
```

## 智能合约详解

### 1. PledgedLottery.sol - 主合约
**位置**: `packages/foundry/contracts/PledgedLottery.sol`

**职责**:
- 管理彩票系统和奖金池
- 代理LotteryToken合约调用
- 处理批量奖金领取
- 提供系统管理功能

**核心功能**:
- `buyTicket()`: 购买彩票NFT
- `scratchTicket(uint256 tokenId)`: 刮开彩票
- `claimPrize(uint256 tokenId)`: 领取单张彩票奖金
- `claimPrizes(uint256[] calldata tokenIds)`: 批量领取奖金

### 2. LotteryToken.sol - NFT彩票合约
**位置**: `packages/foundry/contracts/LotteryToken.sol`

**职责**:
- 铸造和管理彩票NFT
- 实现刮刮乐开奖逻辑
- 管理奖金发放
- 维护系统统计数据

**核心功能**:
- `buyTicket()`: 直接购买彩票
- `buyTicketFor(address buyer)`: 代理购买彩票
- `scratchTicket(uint256 tokenId)`: 刮开彩票查看结果
- `claimPrize(uint256 tokenId)`: 领取奖金

**奖项体系**:
- 特等奖: 0.25%概率，奖金池40%
- 大奖: 2.5%概率，奖金池30%
- 中奖: 7.5%概率，奖金池20%
- 小奖: 15%概率，奖金池10%
- 未中奖: 75%概率

**重要常量**:
- `TICKET_PRICE = 0.01 ether`: 单张彩票价格
- `TOTAL_WIN_RATE = 2500`: 总中奖率25% (以万分比表示)

## 前端应用详解

### Next.js应用结构
基于Next.js 15和App Router，采用Scaffold-ETH v2架构。

**核心组件**:
- `app/page.tsx`: 主页面，集成所有功能模块
- `components/pledged-lottery/LotterySection.tsx`: 彩票购买和周期信息
- `components/pledged-lottery/RewardsSection.tsx`: 彩票管理和奖金领取
- `components/pledged-lottery/CycleInfo.tsx`: 周期状态显示
- `components/pledged-lottery/AdminPanel.tsx`: 管理员面板

### Web3集成
**配置文件**: `packages/nextjs/scaffold.config.ts`

**网络支持**:
- Monad Testnet (主网络)
- Foundry本地网络 (开发环境)

**主要hooks**:
- `useScaffoldReadContract`: 读取合约数据
- `useScaffoldWriteContract`: 执行合约交易

## 测试框架

### Foundry测试
**测试文件**: `packages/foundry/test/PledgedLottery.t.sol`

**测试覆盖**:
- 合约初始状态验证
- 彩票购买流程
- 刮奖机制测试
- 权限控制验证
- 奖金领取流程
- 周期管理功能
- 暂停/恢复机制
- 奖项分布统计

**运行测试**:
```bash
yarn foundry:test
```

## 开发工作流

### 环境要求
- Node.js >= v20.18.3
- Yarn包管理器
- Git

### 快速开始
```bash
# 1. 安装依赖
yarn install

# 2. 启动本地区块链
yarn chain

# 3. 部署智能合约
yarn deploy

# 4. 启动前端应用
yarn start

# 5. 运行测试
yarn test
```

### 可用脚本
```bash
# 智能合约相关
yarn foundry:compile     # 编译合约
yarn foundry:test        # 运行测试
yarn foundry:deploy      # 部署合约
yarn foundry:clean       # 清理编译缓存

# 前端相关
yarn next:dev           # 启动开发服务器
yarn next:build         # 构建生产版本
yarn next:lint          # 代码检查

# 代码质量
yarn format             # 格式化代码
yarn lint               # 检查代码质量
```

### 配置文件说明
- `foundry.toml`: Foundry智能合约框架配置
- `scaffold.config.ts`: Scaffold-ETH前端配置
- `package.json`: 主工作区和各包的依赖管理

## 部署和配置

### 网络配置
项目配置了多个网络支持，主要包括：
- **Monad Testnet**: 主要目标网络
- **Local Development**: Foundry本地网络
- **其他测试网**: Sepolia, Base Sepolia等

### 环境变量
在`packages/foundry/.env`和`packages/nextjs/.env.local`中配置：
- `ALCHEMY_API_KEY`: Alchemy API密钥
- `ETHERSCAN_API_KEY`: 区块浏览器API密钥
- `WALLET_CONNECT_PROJECT_ID`: WalletConnect项目ID

### 合约部署流程
1. 配置目标网络参数
2. 设置部署者私钥
3. 运行部署脚本
4. 验证合约代码（可选）

## 安全考虑

### 智能合约安全
- **重入攻击保护**: 使用OpenZeppelin的ReentrancyGuard
- **权限控制**: 关键功能仅限合约所有者
- **暂停机制**: 紧急情况下可暂停系统
- **随机性**: 基于区块链数据生成随机种子
- **资金安全**: 自动化奖金分发机制

### 前端安全
- **钱包连接**: 使用RainbowKit安全连接
- **交易确认**: 用户主动确认每笔交易
- **错误处理**: 完善的异常处理机制

## 贡献指南

### 代码规范
- 智能合约: 遵循Solidity最佳实践
- 前端代码: 使用TypeScript严格模式
- 代码格式: 使用Prettier自动格式化
- 提交信息: 遵循常规提交格式

### 开发流程
1. Fork项目仓库
2. 创建特性分支
3. 进行开发和测试
4. 提交代码并创建PR
5. 代码审查和合并

## 故障排除

### 常见问题
1. **合约部署失败**: 检查网络配置和私钥设置
2. **前端连接问题**: 确认RPC端点和网络ID
3. **交易失败**: 检查gas限制和余额
4. **测试不通过**: 确认Foundry版本和依赖

### 调试工具
- `yarn debug`: 进入合约调试界面
- Browser DevTools: 前端调试
- Foundry debugger: 智能合约调试

## 许可证

本项目基于MIT许可证开源。详见[LICENSE](LICENSE)文件。

## 免责声明

本项目仅用于教育和演示目的。请在使用前充分理解智能合约的风险，并遵守当地法律法规。开发者不对任何资金损失负责。

---

**最后更新**: 2024年9月21日
**项目版本**: v0.0.1
**文档版本**: v1.0.0