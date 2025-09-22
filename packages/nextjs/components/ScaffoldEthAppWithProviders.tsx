"use client";

import { useEffect, useState } from "react";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { useTheme } from "next-themes";
import { Toaster } from "react-hot-toast";
import { WagmiProvider } from "wagmi";
import { Header } from "~~/components/Header";
import { BlockieAvatar } from "~~/components/scaffold-eth";
import { useInitializeNativeCurrencyPrice } from "~~/hooks/scaffold-eth";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  useInitializeNativeCurrencyPrice();

  return (
    <>
      <div className={`flex flex-col min-h-screen `}>
        <Header />
        <main className="relative flex flex-col flex-1">{children}</main>
        {/* <Footer /> */}
      </div>
      <Toaster />
    </>
  );
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false, // 禁用重连时自动刷新
      refetchOnMount: false, // 禁用组件挂载时自动刷新
      refetchInterval: false, // 禁用自动定时刷新
      networkMode: 'online', // 只在线上状态执行查询
      retry: (failureCount, error: any) => {
        // 对于超时错误，不重试
        if (error?.name === 'TimeoutError' || error?.message?.includes('timeout')) {
          return false;
        }
        // 对于429错误，只重试1次，但延迟较长
        if (error?.status === 429) {
          return failureCount < 1;
        }
        // 其他错误不重试
        return false;
      },
      retryDelay: (attemptIndex, error: any) => {
        // 429错误使用超长延迟
        if (error?.status === 429) {
          return 60000; // 60秒延迟
        }
        return 30000; // 其他错误30秒延迟
      },
      staleTime: 5 * 60 * 1000, // 减少到5分钟缓存，平衡性能和及时性
      gcTime: 30 * 60 * 1000, // 减少到30分钟垃圾回收
      // 限制并发查询数量
      meta: {
        concurrency: 2, // 同时允许2个查询，提高响应性
      },
    },
  },
  // 限制最大查询缓存数量
  queryCache: new (require('@tanstack/react-query').QueryCache)({
    onError: (error: any, query: any) => {
      // 记录查询错误但不自动重试
      if (error?.status !== 429) { // 不记录429错误，避免日志污染
        console.warn('Query failed:', query.queryKey, error?.message || error);
      }
    },
  }),
  // 限制变更缓存数量
  mutationCache: new (require('@tanstack/react-query').MutationCache)({
    onError: (error: any, variables: any, context: any, mutation: any) => {
      // 记录变更错误
      console.warn('Mutation failed:', mutation.mutationKey, error?.message || error);
    },
  }),
});

export const ScaffoldEthAppWithProviders = ({ children }: { children: React.ReactNode }) => {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          avatar={BlockieAvatar}
          theme={mounted ? (isDarkMode ? darkTheme() : lightTheme()) : lightTheme()}
        >
          <ProgressBar height="3px" color="#2299dd" />
          <ScaffoldEthApp>{children}</ScaffoldEthApp>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
