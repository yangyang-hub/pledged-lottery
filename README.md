# 🎲 Pledged Lottery - 质押彩票系统

一个基于以太坊的去中心化NFT彩票系统，采用刮刮乐机制，支持公平透明的彩票游戏体验。

## ✨ 特性

- 🎟️ **NFT彩票系统**: 每张彩票都是一个独特的NFT，可收藏和转让
- 🪙 **刮刮乐机制**: 手动开奖，增加游戏乐趣和互动性
- 🎯 **50%综合中奖率**: 四级奖励体系，高中奖概率
- ⏰ **7天周期制**: 每个彩票周期持续7天，自动轮换
- 💰 **零平台费用**: 100%销售收入用作奖金池
- 🔒 **公平透明**: 基于区块链的随机数生成，确保公平性
- 📱 **现代化界面**: 响应式Web3前端，支持多种钱包连接

## 🏆 奖励体系

| 奖项等级 | 中奖概率 | 奖金比例 | 描述 |
|---------|----------|----------|------|
| 特等奖 | 0.25% | 40% | 奖金池的40% |
| 大奖 | 2.5% | 30% | 奖金池的30% |
| 中奖 | 7.5% | 20% | 奖金池的20% |
| 小奖 | 15% | 10% | 奖金池的10% |
| 未中奖 | 75% | 0% | 无奖金 |

**综合中奖率**: 25% (0.25% + 2.5% + 7.5% + 15%)

## 🛠 技术栈

- **区块链**: Ethereum, Solidity ^0.8.0
- **智能合约框架**: Foundry
- **前端**: Next.js 14, TypeScript, TailwindCSS
- **Web3库**: Wagmi, Viem, RainbowKit
- **NFT标准**: ERC-721, ERC-721Enumerable
- **安全性**: OpenZeppelin合约库

## 📋 系统要求

开始之前，请确保安装以下工具：

- [Node.js (>= v20.18.3)](https://nodejs.org/en/download/)
- [Yarn](https://classic.yarnpkg.com/en/docs/install/)
- [Git](https://git-scm.com/downloads)

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd pledged-lottery
```

### 2. 安装依赖

```bash
yarn install
```

### 3. 启动本地区块链网络

```bash
yarn chain
```

此命令会使用Foundry启动本地以太坊网络，用于开发和测试。

### 4. 部署智能合约

```bash
yarn deploy
```

这会将智能合约部署到本地网络上。合约代码位于 `packages/foundry/contracts` 目录。

### 5. 启动前端应用

```bash
yarn start
```

访问 `http://localhost:3000` 查看应用界面。

### 6. 运行测试

```bash
yarn foundry:test
```

## 🏗 项目结构

```
pledged-lottery/
├── packages/
│   ├── foundry/              # 智能合约和区块链相关
│   │   ├── contracts/        # Solidity智能合约
│   │   │   ├── PledgedLottery.sol    # 主彩票合约
│   │   │   └── LotteryToken.sol      # NFT彩票合约
│   │   ├── script/           # 部署脚本
│   │   ├── test/             # 合约测试
│   │   └── deployments/      # 部署配置
│   └── nextjs/               # 前端应用
│       ├── app/              # Next.js页面
│       ├── components/       # React组件
│       │   └── pledged-lottery/  # 彩票相关组件
│       ├── hooks/            # 自定义hooks
│       └── utils/            # 工具函数
├── README.md
└── package.json
```

## 💡 如何使用

### 对于用户

1. **连接钱包**: 在网页上连接你的以太坊钱包
2. **购买彩票**: 支付0.01 ETH购买NFT彩票
3. **刮开彩票**: 点击"刮开"按钮查看中奖结果
4. **领取奖金**: 如果中奖，点击"领取奖金"获得ETH奖励

### 对于管理员

1. **结束周期**: 7天周期结束后，手动触发新周期开始
2. **暂停系统**: 紧急情况下可暂停合约
3. **监控数据**: 查看系统统计和周期信息

## 🔐 安全特性

- **重入攻击保护**: 使用OpenZeppelin的ReentrancyGuard
- **权限控制**: 关键功能仅限管理员操作
- **暂停机制**: 紧急情况下可暂停系统
- **随机性**: 基于区块链数据生成随机种子
- **资金安全**: 智能合约自动管理奖金分发

## 🧪 测试

运行完整测试套件：

```bash
# 运行所有测试
yarn test

# 运行智能合约测试
yarn foundry:test

# 代码格式化
yarn format

# 代码检查
yarn lint
```

## 📊 合约地址

部署后的合约地址会显示在部署输出中，同时保存在 `packages/foundry/deployments/` 目录。

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 📄 许可证

本项目基于MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## ⚠️ 免责声明

本项目仅用于教育和演示目的。请在使用前充分理解智能合约的风险，并遵守当地法律法规。作者不对任何资金损失负责。

## 📞 联系我们

如有问题或建议，请通过以下方式联系：

- 创建 [Issue](https://github.com/your-repo/issues)
- 发起 [Discussion](https://github.com/your-repo/discussions)

---

🎲 **Pledged Lottery** - 让彩票游戏更公平、更透明、更有趣！