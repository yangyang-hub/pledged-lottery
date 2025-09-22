import { useEffect, useState } from "react";

/**
 * 延迟加载Hook，用于分批加载组件避免RPC调用冲突
 */
export const useDelayedLoad = (delay: number = 0) => {
  const [isReady, setIsReady] = useState(delay === 0);

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => {
        setIsReady(true);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [delay]);

  return isReady;
};

/**
 * 分批加载Hook，用于错开多个组件的加载时间
 */
export const useBatchLoad = (batchIndex: number, batchDelay: number = 1000) => {
  return useDelayedLoad(batchIndex * batchDelay);
};