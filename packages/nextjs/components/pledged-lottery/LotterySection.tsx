"use client";

import { useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { ExclamationTriangleIcon, SparklesIcon, TicketIcon } from "@heroicons/react/24/outline";
import { EnhancedErrorDisplay, useEnhancedError } from "~~/components/EnhancedErrorHandler";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { customFoundry, monadTestnet } from "~~/scaffold.config";
import { notification } from "~~/utils/scaffold-eth";

export const LotterySection = () => {
  const { address, chain } = useAccount();
  const [ticketCount, setTicketCount] = useState(1);
  const { error, handleError, clearError } = useEnhancedError();

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

      await buyTicket({
        functionName: "buyTicket",
        value: totalPrice,
      });

      notification.success(`成功购买 ${ticketCount} 张彩票!`);
      setTicketCount(1);
    } catch (error) {
      handleError(error, "购买彩票");
    }
  };

  return (
    <div className="space-y-6">
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
        <div className="bg-gradient-to-r from-secondary/10 to-accent/10 rounded-lg p-4">
          <h4 className="font-semibold mb-3 text-secondary">系统统计</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">总收入</p>
              <p className="text-xl font-mono">
                {contractStats[0] ? formatEther(contractStats[0]) : "0"} {chain?.nativeCurrency.symbol || "ETH"}
              </p>
            </div>
            <div>
              <p className="text-gray-500">已发放奖金</p>
              <p className="text-xl font-mono">
                {contractStats[1] ? formatEther(contractStats[1]) : "0"} {chain?.nativeCurrency.symbol || "ETH"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* My Tickets */}
      <div className="bg-base-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">我的彩票</span>
          <span className="text-lg font-mono text-primary">{(userTickets as any)?.length || 0} 张</span>
        </div>
      </div>

      {/* Buy Tickets */}
      <div className="space-y-4">
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
            className={`btn btn-secondary w-full ${isMining ? "loading" : ""}`}
            onClick={handleBuyTickets}
            disabled={!address || !isValidNetwork || isMining}
          >
            {!isMining && <SparklesIcon className="h-5 w-5" />}
            {isMining ? "购买中..." : `购买 ${ticketCount} 张彩票`}
          </button>

          {!address && <p className="text-center text-sm text-warning">请先连接钱包</p>}
        </div>
      </div>

      {/* Prize Info */}
      <div className="alert alert-info">
        <div className="text-sm">
          <p className="font-medium">中奖说明:</p>
          <ul className="mt-2 space-y-1 text-xs">
            <li>• 特等奖概率: 0.25% (奖金池40%)</li>
            <li>• 大奖概率: 2.5% (奖金池30%)</li>
            <li>• 中奖概率: 7.5% (奖金池20%)</li>
            <li>• 小奖概率: 15% (奖金池10%)</li>
            <li>• 综合中奖率: 25%</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
