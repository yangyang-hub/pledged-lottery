import * as chains from "viem/chains";

export type BaseConfig = {
  targetNetworks: readonly chains.Chain[];
  pollingInterval: number;
  alchemyApiKey: string;
  walletConnectProjectId: string;
  onlyLocalBurnerWallet: boolean;
};

export type ScaffoldConfig = BaseConfig;

// 内置默认配置
const DEFAULT_ALCHEMY_API_KEY = "oKxs-03sij-U_N0iOlrSsZFr29-IqbuF";
const DEFAULT_WALLET_CONNECT_PROJECT_ID = "3a8170812b534d0ff9d794f19a901d64";
const DEFAULT_POLLING_INTERVAL = 300000; // 增加到300秒(5分钟)避免频繁RPC调用

// 导出默认值供其他模块使用
export { DEFAULT_ALCHEMY_API_KEY };

// 网络选择 - 只需要一个环境变量
const TARGET_NETWORK = process.env.NEXT_PUBLIC_TARGET_NETWORK || "local";

// 本地链配置
export const customFoundry = {
  ...chains.foundry,
  rpcUrls: {
    ...chains.foundry.rpcUrls,
    default: { http: ["http://127.0.0.1:8545"] },
    public: { http: ["http://127.0.0.1:8545"] },
  },
} as const;

// Monad测试网配置 - 移除有问题的RPC节点
export const monadTestnet = {
  id: 10143,
  name: "Monad Testnet",
  network: "monad-testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: "MON",
  },
  rpcUrls: {
    public: {
      http: [
        "https://testnet-rpc.monad.xyz", // 只保留官方备用端点
      ],
    },
    default: {
      http: [
        "https://testnet-rpc.monad.xyz", // 只保留官方备用端点
      ],
    },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://explorer-testnet.monad.xyz" },
  },
  testnet: true,
} as const;

// 根据环境变量选择目标网络
const getTargetNetwork = (): chains.Chain => {
  // 处理构建错误
  if (process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true") {
    return monadTestnet;
  }

  return TARGET_NETWORK === "monad" ? monadTestnet : customFoundry;
};

const scaffoldConfig = {
  // 单一目标网络
  targetNetworks: [getTargetNetwork()],

  // 内置默认轮询间隔
  pollingInterval: DEFAULT_POLLING_INTERVAL,

  // 内置默认API密钥
  alchemyApiKey: DEFAULT_ALCHEMY_API_KEY,

  // 内置默认WalletConnect项目ID
  walletConnectProjectId: DEFAULT_WALLET_CONNECT_PROJECT_ID,

  // 本地开发默认设置
  onlyLocalBurnerWallet: TARGET_NETWORK === "local",
} as const satisfies ScaffoldConfig;

export default scaffoldConfig;
