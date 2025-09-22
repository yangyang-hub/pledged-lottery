# 环境配置说明

## 📋 配置概览

项目环境配置已精简到最少必要配置，分为前端和智能合约两个部分：

### 前端配置 (`packages/nextjs/.env.local`)
- **主要功能**: 网络切换和构建配置
- **配置文件**: 1个核心变量 + 1个可选变量

### 智能合约配置 (`packages/foundry/.env`)
- **主要功能**: 合约部署和验证
- **配置文件**: 3个必要变量

## 🖥️ 前端环境配置

### `.env.local` 配置

```bash
# 网络选择: "local" 使用本地链，"monad" 使用Monad测试网
NEXT_PUBLIC_TARGET_NETWORK=monad

# 忽略构建错误（用于开发）
NEXT_PUBLIC_IGNORE_BUILD_ERROR=true
```

### 网络切换

1. **使用本地链（开发）**:
   ```bash
   NEXT_PUBLIC_TARGET_NETWORK=local
   ```
   - 自动连接到 `http://127.0.0.1:8545`
   - 启用水龙头按钮
   - 使用burner钱包

2. **使用Monad测试网（生产）**:
   ```bash
   NEXT_PUBLIC_TARGET_NETWORK=monad
   ```
   - 自动连接到 `https://testnet-rpc.monad.xyz`
   - 禁用水龙头按钮
   - 需要外部钱包连接

### 内置默认配置

以下配置已内置默认值，无需额外环境变量：

- **API密钥**: 使用内置的Alchemy API密钥
- **WalletConnect**: 使用内置的项目ID
- **轮询间隔**: 30秒
- **RPC端点**: 使用链的默认RPC
- **区块浏览器**: 自动配置

### 高级配置（可选）

如需提高稳定性，可在 `.env.local` 中添加：

```bash
# 自定义 Alchemy API 密钥
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key

# 自定义 WalletConnect 项目ID
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
```

## ⚙️ 智能合约环境配置

### `packages/foundry/.env` 配置

```bash
# 部署者私钥（由 yarn generate 自动生成）
# DEPLOYER_PRIVATE_KEY=

# 本地账户选择
LOCALHOST_KEYSTORE_ACCOUNT=scaffold-eth-default

# Alchemy API 密钥（用于部署到测试网/主网）
ALCHEMY_API_KEY=oKxs-03sij-U_N0iOlrSsZFr29-IqbuF

# Etherscan API 密钥（用于合约验证）
ETHERSCAN_API_KEY=DNXJA8RX2Q3VZ4URQIWP7Z68CJXQZSC6AW
```

### 密钥生成

```bash
# 生成部署者账户（自动填充 DEPLOYER_PRIVATE_KEY）
yarn generate
```

### 合约部署

```bash
# 部署到本地链
yarn deploy

# 部署到测试网（需要先配置对应网络的私钥和API密钥）
yarn deploy --network monad
```

## 🚀 快速开始

### 1. 复制环境配置模板

```bash
# 前端配置
cp packages/nextjs/.env.example packages/nextjs/.env.local

# 智能合约配置
cp packages/foundry/.env.example packages/foundry/.env
```

### 2. 选择目标网络

```bash
# 本地开发
echo "NEXT_PUBLIC_TARGET_NETWORK=local" > packages/nextjs/.env.local

# 或使用Monad测试网
echo "NEXT_PUBLIC_TARGET_NETWORK=monad" > packages/nextjs/.env.local
```

### 3. 启动开发环境

```bash
# 启动本地区块链（如果使用本地网络）
yarn chain

# 生成账户
yarn generate

# 部署合约
yarn deploy

# 启动前端
yarn start
```

## 🔄 环境切换

### 开发 → 生产

```bash
# 1. 修改网络配置
sed -i 's/NEXT_PUBLIC_TARGET_NETWORK=local/NEXT_PUBLIC_TARGET_NETWORK=monad/' packages/nextjs/.env.local

# 2. 禁用构建错误忽略
sed -i 's/NEXT_PUBLIC_IGNORE_BUILD_ERROR=true/NEXT_PUBLIC_IGNORE_BUILD_ERROR=false/' packages/nextjs/.env.local

# 3. 重新构建
yarn next:build
```

### 生产 → 开发

```bash
# 1. 修改网络配置
sed -i 's/NEXT_PUBLIC_TARGET_NETWORK=monad/NEXT_PUBLIC_TARGET_NETWORK=local/' packages/nextjs/.env.local

# 2. 启用构建错误忽略
sed -i 's/NEXT_PUBLIC_IGNORE_BUILD_ERROR=false/NEXT_PUBLIC_IGNORE_BUILD_ERROR=true/' packages/nextjs/.env.local

# 3. 启动本地链
yarn chain
```

## 📦 部署配置

### Vercel 部署

在 Vercel 控制台中设置环境变量：

```bash
NEXT_PUBLIC_TARGET_NETWORK=monad
NEXT_PUBLIC_IGNORE_BUILD_ERROR=false
# 可选：自定义API密钥
NEXT_PUBLIC_ALCHEMY_API_KEY=your_key
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_id
```

### 其他平台部署

确保设置以下环境变量：

- `NEXT_PUBLIC_TARGET_NETWORK`: 目标网络
- `NEXT_PUBLIC_IGNORE_BUILD_ERROR`: 构建错误处理

## ⚠️ 注意事项

1. **安全性**:
   - 请勿将包含私钥的 `.env` 文件提交到版本控制
   - 生产环境建议使用自己的API密钥

2. **性能**:
   - 内置API密钥有速率限制
   - 生产环境建议获取专用API密钥

3. **网络**:
   - 修改网络配置后需要重启开发服务器
   - 确保钱包连接到正确的网络

4. **构建**:
   - 开发环境可以忽略类型错误
   - 生产环境建议启用严格检查