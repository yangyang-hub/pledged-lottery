# 环境配置说明

## 简化配置

现在项目只需要一个环境变量即可切换网络：

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

### 构建部署

```bash
# 开发构建
yarn next:build

# 启动开发服务器
yarn next:dev

# 启动生产服务器
yarn next:start
```

### 注意事项

- 修改网络配置后需要重启开发服务器
- 生产环境建议获取自己的API密钥以提高稳定性
- `NEXT_PUBLIC_IGNORE_BUILD_ERROR=true` 仅用于开发，生产环境建议移除