/**
 * Enhanced Error Handler - Provides better error messaging and recovery options
 */
import { useCallback, useState } from "react";
import {
  ArrowPathIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { useCopyToClipboard } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export interface ErrorInfo {
  code?: string | number;
  message: string;
  cause?: string;
  solution?: string;
  action?: () => void;
  actionLabel?: string;
}

interface EnhancedErrorProps {
  error: any;
  title?: string;
  showRetry?: boolean;
  onRetry?: () => void;
  showDetails?: boolean;
  className?: string;
}

// Common error mappings
const ERROR_MAPPINGS: Record<string, Partial<ErrorInfo>> = {
  // User rejection errors
  "user rejected": {
    message: "用户取消了交易",
    solution: "请重新尝试交易并在钱包中确认",
  },
  "user denied": {
    message: "用户拒绝了交易",
    solution: "请重新尝试交易并在钱包中确认",
  },

  // Network errors
  "network changed": {
    message: "网络已切换",
    solution: "请确认您连接到正确的网络",
  },
  "unsupported chain": {
    message: "不支持的网络",
    solution: "请切换到支持的网络 (本地网络或Monad测试网)",
  },

  // Balance and gas errors
  "insufficient funds": {
    message: "余额不足",
    solution: "请确保账户有足够的余额支付交易费用",
  },
  "gas estimation failed": {
    message: "Gas估算失败",
    solution: "请检查交易参数或稍后重试",
  },
  "intrinsic gas too low": {
    message: "Gas限制过低",
    solution: "请增加Gas限制后重试",
  },

  // Contract specific errors
  "execution reverted": {
    message: "合约执行失败",
    solution: "请检查交易参数是否正确",
  },
  revert: {
    message: "交易被回滚",
    solution: "请检查合约状态和交易参数",
  },

  // RPC errors
  "internal json-rpc error": {
    message: "RPC连接错误",
    solution: "网络连接不稳定，请检查网络设置或稍后重试",
  },
  timeout: {
    message: "请求超时",
    solution: "网络响应超时，请稍后重试",
  },
  "rate limit": {
    message: "请求过于频繁",
    solution: "请等待一段时间后重试",
  },

  // Common blockchain errors
  "nonce too low": {
    message: "Nonce值过低",
    solution: "请重新发送交易或重置账户",
  },
  "replacement transaction underpriced": {
    message: "替换交易Gas价格过低",
    solution: "请提高Gas价格后重试",
  },
};

export const parseError = (error: any): ErrorInfo => {
  let message = "未知错误";
  let code: string | number | undefined;
  let cause: string | undefined;
  let solution: string | undefined;

  if (typeof error === "string") {
    message = error;
  } else if (error?.message) {
    message = error.message;
  } else if (error?.reason) {
    message = error.reason;
  }

  // Extract error code
  if (error?.code) {
    code = error.code;
  }

  // Extract cause
  if (error?.cause?.message) {
    cause = error.cause.message;
  } else if (error?.data?.message) {
    cause = error.data.message;
  }

  // Find matching error mapping
  const errorKey = Object.keys(ERROR_MAPPINGS).find(key => message.toLowerCase().includes(key.toLowerCase()));

  if (errorKey) {
    const mapping = ERROR_MAPPINGS[errorKey];
    message = mapping.message || message;
    solution = mapping.solution;
  }

  // Extract revert reason from contract errors
  if (message.includes("execution reverted:")) {
    const revertReason = message.match(/execution reverted: (.+)/)?.[1];
    if (revertReason) {
      message = `合约错误: ${revertReason}`;
    }
  }

  return { code, message, cause, solution };
};

export const EnhancedErrorDisplay: React.FC<EnhancedErrorProps> = ({
  error,
  title = "操作失败",
  showRetry = true,
  onRetry,
  showDetails = false,
  className = "",
}) => {
  const [showFullDetails, setShowFullDetails] = useState(showDetails);
  const { copyToClipboard } = useCopyToClipboard();

  const errorInfo = parseError(error);

  const handleCopyError = useCallback(() => {
    const errorText = JSON.stringify(
      {
        message: errorInfo.message,
        code: errorInfo.code,
        cause: errorInfo.cause,
        originalError: error,
      },
      null,
      2,
    );

    copyToClipboard(errorText);
    notification.success("错误信息已复制到剪贴板");
  }, [error, errorInfo, copyToClipboard]);

  return (
    <div className={`alert alert-error ${className}`}>
      <div className="flex-1">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />

          <div className="flex-1 space-y-2">
            <div>
              <h4 className="font-medium">{title}</h4>
              <p className="text-sm mt-1">{errorInfo.message}</p>
            </div>

            {errorInfo.solution && (
              <div className="bg-info/10 border border-info/20 rounded p-2">
                <div className="flex items-start gap-2">
                  <InformationCircleIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-info" />
                  <p className="text-sm text-info-content">{errorInfo.solution}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {showRetry && onRetry && (
                <button className="btn btn-sm btn-outline btn-error" onClick={onRetry}>
                  <ArrowPathIcon className="h-4 w-4 mr-1" />
                  重试
                </button>
              )}

              <button className="btn btn-sm btn-outline" onClick={handleCopyError}>
                <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                复制错误信息
              </button>

              {(errorInfo.code || errorInfo.cause) && (
                <button className="btn btn-sm btn-ghost" onClick={() => setShowFullDetails(!showFullDetails)}>
                  {showFullDetails ? "隐藏" : "显示"}详情
                </button>
              )}
            </div>

            {/* Detailed Error Info */}
            {showFullDetails && (
              <div className="bg-base-300 rounded p-3 text-sm space-y-2">
                {errorInfo.code && (
                  <div>
                    <span className="font-medium">错误代码:</span> {errorInfo.code}
                  </div>
                )}
                {errorInfo.cause && (
                  <div>
                    <span className="font-medium">错误原因:</span> {errorInfo.cause}
                  </div>
                )}
                <div>
                  <span className="font-medium">原始错误:</span>
                  <pre className="text-xs mt-1 bg-base-100 p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(error, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook for enhanced error handling
export const useEnhancedError = () => {
  const [error, setError] = useState<any>(null);

  const handleError = useCallback((err: any, context?: string) => {
    console.error(`Error${context ? ` in ${context}` : ""}:`, err);

    const errorInfo = parseError(err);

    // Show notification
    notification.error(errorInfo.message);

    // Store error for detailed display
    setError(err);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError,
    parseError,
  };
};
