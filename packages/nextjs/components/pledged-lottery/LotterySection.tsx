"use client";

import { useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { ExclamationTriangleIcon, SparklesIcon, TicketIcon } from "@heroicons/react/24/outline";
import { EnhancedErrorDisplay, useEnhancedError } from "~~/components/EnhancedErrorHandler";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useEnhancedRefresh } from "~~/hooks/useEnhancedRefresh";
import { customFoundry, monadTestnet } from "~~/scaffold.config";
import { notification } from "~~/utils/scaffold-eth";

export const LotterySection = () => {
  const { address, chain } = useAccount();
  const [ticketCount, setTicketCount] = useState(1);
  const { error, handleError, clearError } = useEnhancedError();
  const { refreshAfterTransaction } = useEnhancedRefresh();

  // Constants
  const TICKET_PRICE = "0.01";

  // Network validation
  const isValidNetwork = chain && (chain.id === customFoundry.id || chain.id === monadTestnet.id);

  // Read contract data
  const { data: userTickets } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "getUserTickets",
    args: [address],
  });

  const { data: contractStats } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "getContractStats",
  });

  // Write function
  const { writeContractAsync: buyTicket, isMining } = useScaffoldWriteContract("PledgedLottery");

  const handleBuyTickets = async () => {
    if (!isValidNetwork) {
      handleError(new Error("请连接到支持的网络"), "购买彩票");
      return;
    }

    if (ticketCount <= 0) {
      handleError(new Error("请输入有效的彩票数量"), "购买彩票");
      return;
    }

    if (!address) {
      handleError(new Error("请先连接钱包"), "购买彩票");
      return;
    }

    try {
      clearError();
      const singlePrice = parseEther("0.01");
      const totalPrice = singlePrice * BigInt(ticketCount);

      const result = await buyTicket({
        functionName: "buyTicket",
        value: totalPrice,
      });

      notification.success(`成功购买 ${ticketCount} 张彩票!`);
      setTicketCount(1);

      // 等待交易确认后刷新数据
      if (result) {
        // 使用智能刷新，基于交易结果
        refreshAfterTransaction(result, 2000);
      }
    } catch (error) {
      handleError(error, "购买彩票");
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Network Warning */}
      {chain && !isValidNetwork && (
        <div className="alert alert-warning">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <div>
            <p className="font-medium">网络不匹配</p>
            <p className="text-sm">当前连接到 {chain.name}，请切换到本地网络或Monad测试网</p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && <EnhancedErrorDisplay error={error} title="购买彩票失败" onRetry={handleBuyTickets} showRetry={true} />}

      {/* System Stats */}
      {contractStats && (
        <div className="bg-gradient-to-r from-secondary/10 to-accent/10 rounded-lg p-3">
          <h4 className="font-semibold mb-2 text-secondary text-sm">系统统计</h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-gray-500">总收入</p>
              <p className="text-lg font-mono">
                {contractStats[0] ? formatEther(contractStats[0]) : "0"} {chain?.nativeCurrency.symbol || "ETH"}
              </p>
            </div>
            <div>
              <p className="text-gray-500">已发放奖金</p>
              <p className="text-lg font-mono">
                {contractStats[1] ? formatEther(contractStats[1]) : "0"} {chain?.nativeCurrency.symbol || "ETH"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* My Tickets */}
      <div className="bg-base-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">我的彩票</span>
          <span className="text-lg font-mono text-primary">{(userTickets as any)?.length || 0} 张</span>
        </div>
      </div>

      {/* Buy Tickets */}
      <div className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <TicketIcon className="h-5 w-5" />
          购买彩票
        </h3>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">数量:</label>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-sm btn-outline btn-circle"
                onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                disabled={isMining}
              >
                -
              </button>
              <span className="font-mono text-lg w-12 text-center">{ticketCount}</span>
              <button
                className="btn btn-sm btn-outline btn-circle"
                onClick={() => setTicketCount(ticketCount + 1)}
                disabled={isMining}
              >
                +
              </button>
            </div>
          </div>

          <div className="bg-base-200 rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span>单价:</span>
              <span className="font-mono">
                {TICKET_PRICE} {chain?.nativeCurrency.symbol || "ETH"}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span>总计:</span>
              <span className="font-mono text-primary">
                {(parseFloat(TICKET_PRICE) * ticketCount).toFixed(3)} {chain?.nativeCurrency.symbol || "ETH"}
              </span>
            </div>
          </div>

          <button
            className="btn btn-secondary w-full"
            onClick={handleBuyTickets}
            disabled={!address || !isValidNetwork || isMining}
          >
            {!isMining && <SparklesIcon className="h-5 w-5" />}
            {isMining ? "购买中..." : `购买 ${ticketCount} 张彩票`}
          </button>

          {!address && <p className="text-center text-sm text-warning">请先连接钱包</p>}
        </div>
      </div>

      {/* 自动填充剩余空间的信息区域 */}
      <div className="flex-1 flex flex-col space-y-3 justify-end">
        {/* Prize Info - 压缩版本 */}
        <div className="alert alert-info py-2">
          <div className="text-xs">
            <p className="font-medium mb-1">中奖说明:</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span>• 特等奖: 0.25% (40%)</span>
              <span>• 大奖: 2.5% (30%)</span>
              <span>• 中奖: 7.5% (20%)</span>
              <span>• 小奖: 15% (10%)</span>
            </div>
            <p className="mt-1 font-medium">综合中奖率: 25%</p>
          </div>
        </div>

        {/* How it Works - 压缩版本 */}
        <div className="bg-base-200 rounded-lg p-3">
          <h4 className="font-semibold mb-2 text-secondary text-sm">游戏流程</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-start gap-2">
              <span className="badge badge-secondary badge-xs">1</span>
              <p>购买彩票后，您会收到NFT彩票</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="badge badge-secondary badge-xs">2</span>
              <p>前往"彩票管理"刮开彩票查看结果</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="badge badge-secondary badge-xs">3</span>
              <p>如果中奖，可立即领取奖金</p>
            </div>
          </div>
        </div>

        {/* Tips - 压缩版本 */}
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-3">
          <h4 className="font-semibold mb-2 text-primary text-sm">温馨提示</h4>
          <div className="space-y-1 text-xs">
            <p>• 奖金池随销售额动态增长，越晚购买奖金越高</p>
            <p>• 每张彩票都是独特的NFT，可以收藏或转赠</p>
            <p>• 刮开彩票后才能知道中奖结果，增加游戏乐趣</p>
            <p>• 支持批量购买，节省gas费用</p>
          </div>
        </div>
      </div>
    </div>
  );
};
