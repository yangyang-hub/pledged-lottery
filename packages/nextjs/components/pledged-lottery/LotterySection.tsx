"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { parseEther, formatEther } from "viem";
import { TicketIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export const LotterySection = () => {
  const { address } = useAccount();
  const [ticketCount, setTicketCount] = useState(1);

  // Constants
  const TICKET_PRICE = "0.01";

  // Read contract data
  const { data: currentRound } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "currentRound",
  });

  const { data: roundTimeLeft } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "getCurrentRoundTimeLeft",
  });

  const { data: userTickets } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "getUserTickets",
    args: [address],
  });

  const { data: roundInfo } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "getRoundInfo",
    args: [currentRound],
  });

  // Write function
  const { writeContractAsync: buyTicket } = useScaffoldWriteContract("PledgedLottery");

  const handleBuyTickets = async () => {
    if (ticketCount <= 0) {
      notification.error("请输入有效的彩票数量");
      return;
    }

    try {
      for (let i = 0; i < ticketCount; i++) {
        await buyTicket({
          functionName: "buyTicket",
          value: parseEther(TICKET_PRICE),
        });
      }
      notification.success(`成功购买 ${ticketCount} 张彩票!`);
      setTicketCount(1);
    } catch (error) {
      console.error("购买彩票失败:", error);
      notification.error("购买彩票失败");
    }
  };

  const formatTimeLeft = (seconds: bigint) => {
    const totalSeconds = Number(seconds);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (days > 0) return `${days}天 ${hours}小时`;
    if (hours > 0) return `${hours}小时 ${minutes}分钟`;
    return `${minutes}分钟`;
  };

  const isActive = roundTimeLeft && roundTimeLeft > 0n;

  return (
    <div className="space-y-6">
      {/* Round Status */}
      <div className="bg-base-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">当前周期</span>
          <span className="text-lg font-mono">#{currentRound?.toString() || "1"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">剩余时间</span>
          <span className={`text-lg font-mono ${isActive ? "text-primary" : "text-error"}`}>
            {roundTimeLeft ? formatTimeLeft(roundTimeLeft) : "计算中..."}
          </span>
        </div>
      </div>

      {/* Current Round Stats */}
      {roundInfo && (
        <div className="bg-gradient-to-r from-secondary/10 to-accent/10 rounded-lg p-4">
          <h4 className="font-semibold mb-3 text-secondary">本轮统计</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">已售彩票</p>
              <p className="text-xl font-mono">{roundInfo[0]?.toString() || "0"}</p>
            </div>
            <div>
              <p className="text-gray-500">销售额</p>
              <p className="text-xl font-mono">
                {roundInfo[1] ? formatEther(roundInfo[1]) : "0"} MON
              </p>
            </div>
          </div>
        </div>
      )}

      {/* My Tickets */}
      <div className="bg-base-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">我的彩票</span>
          <span className="text-lg font-mono text-primary">
            {userTickets?.length || 0} 张
          </span>
        </div>
      </div>

      {/* Buy Tickets */}
      {isActive ? (
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
                >
                  -
                </button>
                <span className="font-mono text-lg w-12 text-center">{ticketCount}</span>
                <button
                  className="btn btn-sm btn-outline btn-circle"
                  onClick={() => setTicketCount(ticketCount + 1)}
                >
                  +
                </button>
              </div>
            </div>

            <div className="bg-base-200 rounded-lg p-3">
              <div className="flex justify-between text-sm">
                <span>单价:</span>
                <span className="font-mono">{TICKET_PRICE} MON</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>总计:</span>
                <span className="font-mono text-primary">
                  {(parseFloat(TICKET_PRICE) * ticketCount).toFixed(3)} MON
                </span>
              </div>
            </div>

            <button
              className="btn btn-secondary w-full"
              onClick={handleBuyTickets}
            >
              <SparklesIcon className="h-5 w-5" />
              购买 {ticketCount} 张彩票
            </button>
          </div>
        </div>
      ) : (
        <div className="alert alert-warning">
          <div>
            <h4 className="font-semibold">本轮已结束</h4>
            <p className="text-sm">等待管理员开奖并开始新一轮</p>
          </div>
        </div>
      )}

      {/* Prize Info */}
      <div className="alert alert-info">
        <div className="text-sm">
          <p className="font-medium">中奖说明:</p>
          <ul className="mt-2 space-y-1 text-xs">
            <li>• 特等奖概率: 0.25% (奖金池40%)</li>
            <li>• 大奖概率: 2.5% (奖金池30%)</li>
            <li>• 中奖概率: 7.5% (奖金池20%)</li>
            <li>• 小奖概率: 39.75% (奖金池10%)</li>
            <li>• 综合中奖率: 50%</li>
          </ul>
        </div>
      </div>
    </div>
  );
};