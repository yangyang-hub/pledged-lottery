import { wagmiConnectors } from "./wagmiConnectors";
import { Chain, createClient, fallback, http } from "viem";
import { hardhat, mainnet } from "viem/chains";
import { createConfig } from "wagmi";
import scaffoldConfig, { DEFAULT_ALCHEMY_API_KEY } from "~~/scaffold.config";
import { getAlchemyHttpUrl } from "~~/utils/scaffold-eth";

const { targetNetworks } = scaffoldConfig;

// We always want to have mainnet enabled (ENS resolution, ETH price, etc). But only once.
export const enabledChains = targetNetworks.find((network: Chain) => network.id === 1)
  ? targetNetworks
  : ([...targetNetworks, mainnet] as const);

export const wagmiConfig = createConfig({
  chains: enabledChains,
  connectors: wagmiConnectors,
  ssr: true,
  client: ({ chain }) => {
    let rpcFallbacks = [
      http(undefined, {
        timeout: 60000, // 增加到60秒超时
        retryCount: 2, // 减少每个端点重试次数
        retryDelay: 5000, // 重试间隔5秒
      })
    ];

    const alchemyHttpUrl = getAlchemyHttpUrl(chain.id);
    if (alchemyHttpUrl) {
      const isUsingDefaultKey = scaffoldConfig.alchemyApiKey === DEFAULT_ALCHEMY_API_KEY;
      rpcFallbacks = isUsingDefaultKey ? [
        http(undefined, {
          timeout: 60000,
          retryCount: 2,
          retryDelay: 5000,
        }),
        http(alchemyHttpUrl, {
          timeout: 60000,
          retryCount: 2,
          retryDelay: 5000,
        })
      ] : [
        http(alchemyHttpUrl, {
          timeout: 60000,
          retryCount: 2,
          retryDelay: 5000,
        }),
        http(undefined, {
          timeout: 60000,
          retryCount: 2,
          retryDelay: 5000,
        })
      ];
    }

    return createClient({
      chain,
      transport: fallback(rpcFallbacks, {
        rank: false, // 禁用排名以减少请求
        retryCount: 1, // 减少整体重试次数
        retryDelay: 10000, // 整体重试延迟10秒
      }),
      // 设置更长的轮询间隔以减少请求频率
      pollingInterval: chain.id !== (hardhat as Chain).id ? scaffoldConfig.pollingInterval : 10000,
      // 大幅减少批量请求避免429
      batch: {
        batchSize: 10, // 大幅减少批量大小
        wait: 1000, // 增加批量间隔到1秒
      },
      // 添加缓存配置
      cacheTime: 30 * 60 * 1000, // 30分钟缓存
    });
  },
});
