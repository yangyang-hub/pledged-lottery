import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * 自定义hook，用于刷新合约数据
 * 在链上交易完成后调用，确保前端状态同步更新
 */
export const useRefreshData = () => {
  const queryClient = useQueryClient();

  const refreshContractData = useCallback(
    (delay: number = 1000) => {
      setTimeout(() => {
        // 刷新所有wagmi的readContract查询
        queryClient.invalidateQueries({
          predicate: (query) => {
            const queryKey = query.queryKey;
            // wagmi的查询键通常以"readContract"开头
            return Array.isArray(queryKey) && queryKey[0] === "readContract";
          },
        });

        // 刷新所有合约相关查询，包括blockNumber等
        queryClient.invalidateQueries({
          predicate: (query) => {
            const queryKey = query.queryKey;
            return Array.isArray(queryKey) && (
              queryKey[0] === "readContract" ||
              queryKey[0] === "blockNumber" ||
              queryKey[0] === "balance" ||
              (Array.isArray(queryKey) && queryKey.some(key =>
                typeof key === 'string' && key.includes('contract')
              ))
            );
          },
        });
      }, delay);
    },
    [queryClient]
  );

  const refreshImmediately = useCallback(() => {
    // 立即刷新所有wagmi的readContract查询
    queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = query.queryKey;
        return Array.isArray(queryKey) && queryKey[0] === "readContract";
      },
    });

    // 立即刷新所有合约相关查询
    queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = query.queryKey;
        return Array.isArray(queryKey) && (
          queryKey[0] === "readContract" ||
          queryKey[0] === "blockNumber" ||
          queryKey[0] === "balance"
        );
      },
    });
  }, [queryClient]);

  // 刷新特定合约的查询
  const refreshContractQueries = useCallback(
    (contractAddress?: string, delay: number = 1000) => {
      setTimeout(() => {
        if (contractAddress) {
          queryClient.invalidateQueries({
            predicate: (query) => {
              const queryKey = query.queryKey;
              return Array.isArray(queryKey) &&
                queryKey[0] === "readContract" &&
                queryKey.some(key =>
                  typeof key === 'object' &&
                  key !== null &&
                  'address' in key &&
                  key.address === contractAddress
                );
            },
          });
        } else {
          // 如果没有指定地址，刷新所有合约查询
          refreshContractData(0);
        }
      }, delay);
    },
    [queryClient, refreshContractData]
  );

  return {
    refreshContractData,
    refreshImmediately,
    refreshContractQueries,
  };
};