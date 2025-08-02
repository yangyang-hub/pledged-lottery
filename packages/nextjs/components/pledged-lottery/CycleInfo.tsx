"use client";

import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { ClockIcon, ChartBarIcon, UsersIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

export const CycleInfo = () => {
  // const { address } = useAccount();

  // Read contract data
  const { data: currentRound } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "currentRound",
  });

  const { data: roundStartTime } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "roundStartTime",
  });

  const { data: roundTimeLeft } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "getCurrentRoundTimeLeft",
  });

  const { data: roundInfo } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "getRoundInfo",
    args: [currentRound],
  });

  const formatTimeLeft = (seconds: bigint) => {
    const totalSeconds = Number(seconds);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (totalSeconds <= 0) return "已结束";
    if (days > 0) return `${days}天 ${hours}小时 ${minutes}分钟`;
    if (hours > 0) return `${hours}小时 ${minutes}分钟`;
    return `${minutes}分钟`;
  };

  const formatDateTime = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getProgressPercentage = () => {
    if (!roundTimeLeft) return 0;
    const ROUND_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds
    const elapsed = ROUND_DURATION - Number(roundTimeLeft);
    return Math.max(0, Math.min(100, (elapsed / ROUND_DURATION) * 100));
  };

  const isActive = roundTimeLeft && roundTimeLeft > 0n;

  return (
    <div className="card bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20 shadow-lg mb-8">
      <div className="card-body">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="avatar placeholder">
              <div
                className="bg-primary text-primary-content rounded-full w-12 h-12"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <span style={{ textAlign: "center" }} className="text-xl font-bold">
                  #{currentRound?.toString() || "1"}
                </span>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold">当前周期</h2>
              <p className="text-sm opacity-70">
                开始时间: {roundStartTime ? formatDateTime(roundStartTime) : "计算中..."}
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className={`badge badge-lg ${isActive ? "badge-success" : "badge-error"}`}>
              {isActive ? "进行中" : "已结束"}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium flex items-center gap-2">
              <ClockIcon className="h-4 w-4" />
              周期进度
            </span>
            <span className="text-sm">
              {roundTimeLeft ? formatTimeLeft(roundTimeLeft) : "计算中..."}
            </span>
          </div>
          <div className="w-full bg-base-300 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${isActive ? "bg-gradient-to-r from-primary to-secondary" : "bg-error"
                }`}
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Total Tickets */}
          <div className="stat bg-base-100 rounded-lg shadow">
            <div className="stat-figure text-secondary">
              <UsersIcon className="h-8 w-8" />
            </div>
            <div className="stat-title">已售彩票</div>
            <div className="stat-value text-secondary text-lg">
              {roundInfo?.[0]?.toString() || "0"}
            </div>
            <div className="stat-desc">张彩票</div>
          </div>

          {/* Total Sales */}
          <div className="stat bg-base-100 rounded-lg shadow">
            <div className="stat-figure text-accent">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="stat-title">销售额</div>
            <div className="stat-value text-accent text-lg">
              {roundInfo?.[1] ? formatEther(roundInfo[1]) : "0"}
            </div>
            <div className="stat-desc">MON</div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded-full"></div>
            <span>周期时长: 7天</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-secondary rounded-full"></div>
            <span>彩票价格: 0.01 MON</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-accent rounded-full"></div>
            <span>中奖率: 50%</span>
          </div>
        </div>

        {!isActive && (
          <div className="alert alert-warning mt-4">
            <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>当前周期已结束，等待管理员开奖并开始新周期</span>
          </div>
        )}
      </div>
    </div>
  );
};