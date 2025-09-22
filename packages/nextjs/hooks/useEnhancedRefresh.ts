import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";

/**
 * 增强版数据刷新Hook，平衡RPC调用频率和数据及时性
 */
export const useEnhancedRefresh = () => {
  const queryClient = useQueryClient();
  const lastRefreshRef = useRef<number>(0);

  // 基础刷新功能 - 支持强制刷新
  const refreshContractData = useCallback(
    (delay: number = 1000, force: boolean = false) => {
      const now = Date.now();

      // 如果不是强制刷新，防止过于频繁的刷新
      if (!force && now - lastRefreshRef.current < 2000) {
        return;
      }

      lastRefreshRef.current = now;

      setTimeout(() => {
        queryClient.invalidateQueries({
          predicate: (query) => {
            const queryKey = query.queryKey;
            return Array.isArray(queryKey) && (
              queryKey[0] === "readContract"
            );
          },
          // 如果是强制刷新，不检查stale状态
          ...(force ? {} : { stale: true }),
        });
      }, delay);
    },
    [queryClient]
  );

  // 基于交易哈希的智能刷新 - 交易后强制刷新
  const refreshAfterTransaction = useCallback(
    async (txHash?: string, targetDelay: number = 3000) => {
      if (txHash) {
        // 交易成功后强制刷新数据，无视缓存时间
        setTimeout(() => {
          refreshContractData(0, true); // 强制刷新
        }, targetDelay);
      } else {
        // 如果没有交易哈希，使用强制刷新
        refreshContractData(targetDelay, true);
      }
    },
    [refreshContractData]
  );

  // 立即刷新 - 支持强制模式
  const refreshImmediately = useCallback((force: boolean = false) => {
    const now = Date.now();
    if (!force && now - lastRefreshRef.current < 2000) {
      return; // 2秒内不允许重复立即刷新（除非强制）
    }
    refreshContractData(0, force);
  }, [refreshContractData]);

  // 刷新特定合约数据 - 支持强制刷新
  const refreshContractByAddress = useCallback(
    (contractAddress: string, delay: number = 1000, force: boolean = false) => {
      setTimeout(() => {
        queryClient.invalidateQueries({
          predicate: (query) => {
            const queryKey = query.queryKey;
            if (!Array.isArray(queryKey) || queryKey[0] !== "readContract") {
              return false;
            }

            // 检查查询参数中是否包含指定的合约地址
            return queryKey.some(key =>
              typeof key === 'object' &&
              key !== null &&
              'address' in key &&
              key.address?.toLowerCase() === contractAddress.toLowerCase()
            );
          },
          // 如果是强制刷新，不检查stale状态
          ...(force ? {} : { stale: true }),
        });
      }, delay);
    },
    [queryClient]
  );

  // 强制刷新特定查询 - 新增方法
  const forceRefreshQuery = useCallback(
    (queryKeyPattern: any[]) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          if (!Array.isArray(queryKey)) return false;

          // 检查查询键是否匹配模式
          return queryKeyPattern.every((pattern, index) => {
            if (index >= queryKey.length) return false;
            if (typeof pattern === 'string') {
              return queryKey[index] === pattern;
            }
            if (typeof pattern === 'function') {
              return pattern(queryKey[index]);
            }
            return JSON.stringify(queryKey[index]) === JSON.stringify(pattern);
          });
        },
        // 强制刷新，无视stale状态
      });
    },
    [queryClient]
  );

  return {
    refreshContractData,
    refreshAfterTransaction,
    refreshImmediately,
    refreshContractByAddress,
    forceRefreshQuery,
  };
};