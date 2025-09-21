"use client";

import { formatEther } from "viem";
import { ChartBarIcon, UsersIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

export const CycleInfo = () => {
  // Read contract data
  const { data: contractStats } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "getContractStats",
  });

  const { data: ticketPrice } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "getTicketPrice",
  });

  // Calculate total tickets from total revenue and ticket price
  const totalTickets = contractStats && ticketPrice ? Number(contractStats[0]) / Number(ticketPrice) : 0;

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
                <ChartBarIcon className="h-6 w-6" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold">系统总览</h2>
              <p className="text-sm opacity-70">实时彩票系统统计数据</p>
            </div>
          </div>

          <div className="text-right">
            <div className="badge badge-lg badge-success">运行中</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Tickets */}
          <div className="stat bg-base-100 rounded-lg shadow">
            <div className="stat-figure text-secondary">
              <UsersIcon className="h-8 w-8" />
            </div>
            <div className="stat-title">总彩票数</div>
            <div className="stat-value text-secondary text-lg">{Math.floor(totalTickets).toString()}</div>
            <div className="stat-desc">张彩票</div>
          </div>

          {/* Total Revenue */}
          <div className="stat bg-base-100 rounded-lg shadow">
            <div className="stat-figure text-accent">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                />
              </svg>
            </div>
            <div className="stat-title">总收入</div>
            <div className="stat-value text-accent text-lg">
              {contractStats?.[0] ? formatEther(contractStats[0]) : "0"}
            </div>
            <div className="stat-desc">MON</div>
          </div>

          {/* Total Prizes Paid */}
          <div className="stat bg-base-100 rounded-lg shadow">
            <div className="stat-figure text-success">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="stat-title">已发奖金</div>
            <div className="stat-value text-success text-lg">
              {contractStats?.[1] ? formatEther(contractStats[1]) : "0"}
            </div>
            <div className="stat-desc">MON</div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded-full"></div>
            <span>彩票价格: 0.01 MON</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-secondary rounded-full"></div>
            <span>中奖率: 25%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-accent rounded-full"></div>
            <span>零手续费</span>
          </div>
        </div>
      </div>
    </div>
  );
};
