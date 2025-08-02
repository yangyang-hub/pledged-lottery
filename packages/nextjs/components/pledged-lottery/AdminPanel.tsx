"use client";

import { useAccount } from "wagmi";
import { CogIcon, PlayIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export const AdminPanel = () => {
  const { address } = useAccount();

  // Read contract data
  const { data: owner } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "owner",
  });

  const { data: currentCycle } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "currentCycle",
  });

  const { data: cycleTimeLeft } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "getCurrentCycleTimeLeft",
  });

  const { data: cycleInfo } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "getCycleInfo",
    args: [currentCycle],
  });

  // Write function
  const { writeContractAsync: finalizeCycle } = useScaffoldWriteContract("PledgedLottery");

  const handleFinalizeCycle = async () => {
    try {
      await finalizeCycle({
        functionName: "finalizeCycle",
      });
      notification.success("周期结束成功，开奖完成!");
    } catch (error) {
      console.error("结束周期失败:", error);
      notification.error("结束周期失败");
    }
  };

  // Check if current user is admin
  const isAdmin = address && owner && address.toLowerCase() === owner.toLowerCase();
  const canFinalize = cycleTimeLeft && cycleTimeLeft === 0n;

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="card bg-gradient-to-r from-warning/10 to-error/10 border border-warning/30 shadow-lg mt-8">
      <div className="card-body">
        <div className="flex items-center gap-3 mb-4">
          <CogIcon className="h-6 w-6 text-warning" />
          <h2 className="card-title text-warning">管理员控制面板</h2>
          <div className="badge badge-warning badge-sm">ADMIN</div>
        </div>

        {/* Current Cycle Overview */}
        <div className="bg-base-100 rounded-lg p-4 mb-4">
          <h3 className="font-semibold mb-2">当前周期概况</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">周期编号</p>
              <p className="font-mono text-lg">#{currentCycle?.toString() || "1"}</p>
            </div>
            <div>
              <p className="text-gray-500">已售彩票</p>
              <p className="font-mono text-lg">{cycleInfo?.[1]?.toString() || "0"}</p>
            </div>
            <div>
              <p className="text-gray-500">销售额</p>
              <p className="font-mono text-lg">{cycleInfo?.[2] ? (Number(cycleInfo[2]) / 1e18).toFixed(3) : "0"} ETH</p>
            </div>
            <div>
              <p className="text-gray-500">状态</p>
              <p className={`font-medium ${canFinalize ? "text-error" : "text-success"}`}>
                {canFinalize ? "待开奖" : "进行中"}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            className={`btn ${canFinalize ? "btn-error" : "btn-disabled"} flex-1`}
            onClick={handleFinalizeCycle}
            disabled={!canFinalize}
          >
            <PlayIcon className="h-5 w-5" />
            {canFinalize ? "结束周期并开奖" : "周期进行中"}
          </button>
        </div>

        {/* Info */}
        <div className="alert alert-warning mt-4">
          <div className="text-sm">
            <p className="font-medium">管理员操作说明:</p>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• 只有在7天周期结束后才能执行开奖</li>
              <li>• 开奖将自动分配奖金并开始新周期</li>
              <li>• 确保在合适的时机执行开奖操作</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};