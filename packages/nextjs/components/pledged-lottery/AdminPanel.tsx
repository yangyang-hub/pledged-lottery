"use client";

import { useAccount } from "wagmi";
import { CogIcon, PlayIcon, PauseIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export const AdminPanel = () => {
  const { address } = useAccount();

  // Read contract data
  const { data: owner } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "owner",
  });

  const { data: currentRound } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "currentRound",
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

  const { data: isPaused } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "paused",
  });

  const { data: contractStats } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "getContractStats",
  });

  // Write functions
  const { writeContractAsync: finalizeRound } = useScaffoldWriteContract("PledgedLottery");
  const { writeContractAsync: pause } = useScaffoldWriteContract("PledgedLottery");
  const { writeContractAsync: unpause } = useScaffoldWriteContract("PledgedLottery");
  const { writeContractAsync: emergencyWithdraw } = useScaffoldWriteContract("PledgedLottery");

  const handleFinalizeRound = async () => {
    try {
      await finalizeRound({
        functionName: "finalizeRound",
      });
      notification.success("周期结束成功，开奖完成!");
    } catch (error) {
      console.error("结束周期失败:", error);
      notification.error("结束周期失败");
    }
  };

  const handlePause = async () => {
    try {
      await pause({
        functionName: "pause",
      });
      notification.success("合约已暂停!");
    } catch (error) {
      console.error("暂停失败:", error);
      notification.error("暂停失败");
    }
  };

  const handleUnpause = async () => {
    try {
      await unpause({
        functionName: "unpause",
      });
      notification.success("合约已恢复!");
    } catch (error) {
      console.error("恢复失败:", error);
      notification.error("恢复失败");
    }
  };

  const handleEmergencyWithdraw = async () => {
    if (!confirm("确定要执行紧急提取吗？这将提取合约中的所有资金。")) {
      return;
    }

    try {
      await emergencyWithdraw({
        functionName: "emergencyWithdraw",
      });
      notification.success("紧急提取成功!");
    } catch (error) {
      console.error("紧急提取失败:", error);
      notification.error("紧急提取失败");
    }
  };

  // Check if current user is admin
  const isAdmin = address && owner && address.toLowerCase() === owner.toLowerCase();
  const canFinalize = roundTimeLeft && roundTimeLeft === 0n;

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
          {isPaused && <div className="badge badge-error badge-sm">已暂停</div>}
        </div>

        {/* Contract Stats */}
        {contractStats && (
          <div className="bg-base-100 rounded-lg p-4 mb-4">
            <h3 className="font-semibold mb-2">合约统计</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">当前周期</p>
                <p className="font-mono text-lg">#{contractStats[0]?.toString()}</p>
              </div>
              <div>
                <p className="text-gray-500">总收入</p>
                <p className="font-mono text-lg">{contractStats[1] ? (Number(contractStats[1]) / 1e18).toFixed(3) : "0"} ETH</p>
              </div>
              <div>
                <p className="text-gray-500">已发奖金</p>
                <p className="font-mono text-lg">{contractStats[2] ? (Number(contractStats[2]) / 1e18).toFixed(3) : "0"} ETH</p>
              </div>
              <div>
                <p className="text-gray-500">系统余额</p>
                <p className="font-mono text-lg">{contractStats[3] ? (Number(contractStats[3]) / 1e18).toFixed(3) : "0"} ETH</p>
              </div>
            </div>
          </div>
        )}

        {/* Current Round Overview */}
        <div className="bg-base-100 rounded-lg p-4 mb-4">
          <h3 className="font-semibold mb-2">当前周期概况</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">周期编号</p>
              <p className="font-mono text-lg">#{currentRound?.toString() || "1"}</p>
            </div>
            <div>
              <p className="text-gray-500">已售彩票</p>
              <p className="font-mono text-lg">{roundInfo?.[0]?.toString() || "0"}</p>
            </div>
            <div>
              <p className="text-gray-500">销售额</p>
              <p className="font-mono text-lg">{roundInfo?.[1] ? (Number(roundInfo[1]) / 1e18).toFixed(3) : "0"} ETH</p>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-gray-500 text-sm">状态</p>
            <p className={`font-medium ${canFinalize ? "text-error" : "text-success"}`}>
              {canFinalize ? "待开奖" : "进行中"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            className={`btn ${canFinalize ? "btn-error" : "btn-disabled"}`}
            onClick={handleFinalizeRound}
            disabled={!canFinalize}
          >
            <PlayIcon className="h-5 w-5" />
            {canFinalize ? "结束周期并开奖" : "周期进行中"}
          </button>

          <button
            className={`btn ${isPaused ? "btn-success" : "btn-warning"}`}
            onClick={isPaused ? handleUnpause : handlePause}
          >
            <PauseIcon className="h-5 w-5" />
            {isPaused ? "恢复合约" : "暂停合约"}
          </button>

          <button
            className="btn btn-error"
            onClick={handleEmergencyWithdraw}
            disabled={!isPaused}
          >
            紧急提取
          </button>
        </div>

        {/* Info */}
        <div className="alert alert-warning mt-4">
          <div className="text-sm">
            <p className="font-medium">管理员操作说明:</p>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• 只有在7天周期结束后才能执行开奖</li>
              <li>• 开奖将自动分配奖金并开始新周期</li>
              <li>• 暂停功能用于紧急情况下停止合约运行</li>
              <li>• 紧急提取只能在合约暂停状态下执行</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};