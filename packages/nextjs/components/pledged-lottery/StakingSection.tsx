"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { parseEther, formatEther } from "viem";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { EtherInput } from "~~/components/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export const StakingSection = () => {
  const { address } = useAccount();
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");

  // Read contract data
  const { data: currentCycle } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "currentCycle",
  });

  const { data: stakedAmount } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "getStakedAmount",
    args: [address, currentCycle],
  });

  const { data: stakingTokenAddress } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "stakingToken",
  });

  const { data: tokenBalance } = useScaffoldReadContract({
    contractName: "MockStakingToken",
    functionName: "balanceOf",
    args: [address],
  });

  const { data: allowance } = useScaffoldReadContract({
    contractName: "MockStakingToken",
    functionName: "allowance",
    args: [address, stakingTokenAddress],
  });

  // Write functions
  const { writeContractAsync: approveToken } = useScaffoldWriteContract("MockStakingToken");
  const { writeContractAsync: stakeTokens } = useScaffoldWriteContract("PledgedLottery");
  const { writeContractAsync: unstakeTokens } = useScaffoldWriteContract("PledgedLottery");

  const handleApprove = async () => {
    if (!stakeAmount) {
      notification.error("请输入质押金额");
      return;
    }

    try {
      const amount = parseEther(stakeAmount);
      await approveToken({
        functionName: "approve",
        args: [stakingTokenAddress, amount],
      });
      notification.success("代币授权成功");
    } catch (error) {
      console.error("授权失败:", error);
      notification.error("授权失败");
    }
  };

  const handleStake = async () => {
    if (!stakeAmount) {
      notification.error("请输入质押金额");
      return;
    }

    try {
      const amount = parseEther(stakeAmount);
      await stakeTokens({
        functionName: "stakeTokens",
        args: [amount],
      });
      notification.success("质押成功");
      setStakeAmount("");
    } catch (error) {
      console.error("质押失败:", error);
      notification.error("质押失败");
    }
  };

  const handleUnstake = async () => {
    if (!unstakeAmount) {
      notification.error("请输入取消质押金额");
      return;
    }

    try {
      const amount = parseEther(unstakeAmount);
      await unstakeTokens({
        functionName: "unstakeTokens",
        args: [amount],
      });
      notification.success("取消质押成功");
      setUnstakeAmount("");
    } catch (error) {
      console.error("取消质押失败:", error);
      notification.error("取消质押失败");
    }
  };

  const needsApproval = stakeAmount && allowance !== undefined && 
    parseEther(stakeAmount) > (allowance || 0n);

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="bg-base-200 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">代币余额</p>
            <p className="font-mono text-lg">
              {tokenBalance ? formatEther(tokenBalance) : "0"} MON
            </p>
          </div>
          <div>
            <p className="text-gray-500">已质押</p>
            <p className="font-mono text-lg text-primary">
              {stakedAmount ? formatEther(stakedAmount) : "0"} MON
            </p>
          </div>
        </div>
      </div>

      {/* Stake Section */}
      <div className="space-y-4">
        <h3 className="font-semibold">质押代币</h3>
        <div className="space-y-3">
          <EtherInput
            value={stakeAmount}
            onChange={setStakeAmount}
            placeholder="输入质押金额"
            name="stakeAmount"
          />
          <div className="flex gap-2">
            {needsApproval && (
              <button
                className="btn btn-outline btn-primary btn-sm flex-1"
                onClick={handleApprove}
              >
                授权代币
              </button>
            )}
            <button
              className="btn btn-primary btn-sm flex-1"
              onClick={handleStake}
              disabled={needsApproval || !stakeAmount}
            >
              质押
            </button>
          </div>
        </div>
      </div>

      {/* Unstake Section */}
      {stakedAmount && stakedAmount > 0n && (
        <div className="space-y-4">
          <h3 className="font-semibold">取消质押</h3>
          <div className="space-y-3">
            <EtherInput
              value={unstakeAmount}
              onChange={setUnstakeAmount}
              placeholder="输入取消质押金额"
              name="unstakeAmount"
            />
            <button
              className="btn btn-outline btn-error btn-sm w-full"
              onClick={handleUnstake}
              disabled={!unstakeAmount}
            >
              取消质押
            </button>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="alert alert-info">
        <div className="text-sm">
          <p className="font-medium">质押说明:</p>
          <ul className="mt-2 space-y-1 text-xs">
            <li>• 最小质押金额: 1000 MON</li>
            <li>• 质押者按比例分享彩票销售收益</li>
            <li>• 可随时取消质押（当前周期内）</li>
          </ul>
        </div>
      </div>
    </div>
  );
};