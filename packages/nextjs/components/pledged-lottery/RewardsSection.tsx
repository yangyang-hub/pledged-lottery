"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { GiftIcon, CurrencyDollarIcon, TrophyIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

interface TicketWithInfo {
  tokenId: bigint;
  cycle: bigint;
  owner: string;
  isRedeemed: boolean;
  prizeType: bigint;
  prizeAmount: bigint;
}

export const RewardsSection = () => {
  const { address } = useAccount();
  const [selectedCycle, setSelectedCycle] = useState<number>(1);

  // Read contract data
  const { data: currentCycle } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "currentCycle",
  });

  const { data: userTickets } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "getUserTickets",
    args: [address],
  });

  const { data: stakingReward } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "getStakingReward",
    args: [address, BigInt(selectedCycle)],
  });

  // Write functions
  const { writeContractAsync: claimPrize } = useScaffoldWriteContract("PledgedLottery");
  const { writeContractAsync: claimStakingReward } = useScaffoldWriteContract("PledgedLottery");

  // Get ticket details for each ticket
  const getTicketInfo = (tokenId: bigint) => {
    const { data: ticketInfo } = useScaffoldReadContract({
      contractName: "PledgedLottery",
      functionName: "getTicketInfo",
      args: [tokenId],
    });
    return ticketInfo;
  };

  const handleClaimPrize = async (tokenId: bigint) => {
    try {
      await claimPrize({
        functionName: "claimPrize",
        args: [tokenId],
      });
      notification.success("奖金领取成功!");
    } catch (error) {
      console.error("领取奖金失败:", error);
      notification.error("领取奖金失败");
    }
  };

  const handleClaimStakingReward = async () => {
    try {
      await claimStakingReward({
        functionName: "claimStakingReward",
        args: [BigInt(selectedCycle)],
      });
      notification.success("质押收益领取成功!");
    } catch (error) {
      console.error("领取质押收益失败:", error);
      notification.error("领取质押收益失败");
    }
  };

  const getPrizeTypeLabel = (prizeType: bigint) => {
    switch (Number(prizeType)) {
      case 1: return { label: "小奖", color: "text-success", icon: GiftIcon };
      case 2: return { label: "中奖", color: "text-warning", icon: CurrencyDollarIcon };
      case 3: return { label: "大奖", color: "text-error", icon: TrophyIcon };
      default: return { label: "未中奖", color: "text-gray-500", icon: GiftIcon };
    }
  };

  const winningTickets = userTickets?.filter(tokenId => {
    const ticketInfo = getTicketInfo(tokenId);
    return ticketInfo && Number(ticketInfo[3]) > 0; // prizeType > 0
  }) || [];

  const unclaimedTickets = userTickets?.filter(tokenId => {
    const ticketInfo = getTicketInfo(tokenId);
    return ticketInfo && Number(ticketInfo[3]) > 0 && !ticketInfo[2]; // has prize but not redeemed
  }) || [];

  return (
    <div className="space-y-6">
      {/* Staking Rewards */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <CurrencyDollarIcon className="h-5 w-5" />
          质押收益
        </h3>

        <div className="flex gap-2">
          <select
            className="select select-bordered select-sm flex-1"
            value={selectedCycle}
            onChange={(e) => setSelectedCycle(Number(e.target.value))}
          >
            {Array.from({ length: Number(currentCycle || 1) }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                第 {i + 1} 轮
              </option>
            ))}
          </select>
        </div>

        <div className="bg-base-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">可领取收益</span>
            <span className="text-lg font-mono text-primary">
              {stakingReward ? formatEther(stakingReward) : "0"} ETH
            </span>
          </div>
          {stakingReward && stakingReward > 0n && (
            <button
              className="btn btn-primary btn-sm w-full mt-3"
              onClick={handleClaimStakingReward}
            >
              领取质押收益
            </button>
          )}
        </div>
      </div>

      {/* Prize Tickets */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <TrophyIcon className="h-5 w-5" />
          彩票奖金
        </h3>

        {unclaimedTickets.length > 0 && (
          <div className="alert alert-success">
            <TrophyIcon className="h-5 w-5" />
            <span>恭喜! 您有 {unclaimedTickets.length} 张中奖彩票待领取!</span>
          </div>
        )}

        <div className="space-y-3 max-h-64 overflow-y-auto">
          {userTickets && userTickets.length > 0 ? (
            userTickets.map((tokenId) => {
              const ticketInfo = getTicketInfo(tokenId);
              if (!ticketInfo) return null;

              const [cycle, owner, isRedeemed, prizeType, prizeAmount] = ticketInfo;
              const prizeInfo = getPrizeTypeLabel(prizeType);
              const IconComponent = prizeInfo.icon;

              return (
                <div
                  key={tokenId.toString()}
                  className={`card bg-base-200 ${Number(prizeType) > 0 ? 'border border-success' : ''}`}
                >
                  <div className="card-body p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconComponent className={`h-5 w-5 ${prizeInfo.color}`} />
                        <div>
                          <p className="font-mono text-sm">#{tokenId.toString()}</p>
                          <p className="text-xs text-gray-500">第 {cycle.toString()} 轮</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className={`text-sm font-medium ${prizeInfo.color}`}>
                          {prizeInfo.label}
                        </p>
                        {Number(prizeType) > 0 && (
                          <p className="text-xs font-mono">
                            {formatEther(prizeAmount)} ETH
                          </p>
                        )}
                      </div>
                    </div>

                    {Number(prizeType) > 0 && !isRedeemed && (
                      <button
                        className="btn btn-success btn-sm mt-2"
                        onClick={() => handleClaimPrize(tokenId)}
                      >
                        领取奖金
                      </button>
                    )}

                    {isRedeemed && (
                      <div className="badge badge-success badge-sm mt-2">
                        已领取
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              <GiftIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>暂无彩票</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-gradient-to-r from-accent/10 to-primary/10 rounded-lg p-4">
        <h4 className="font-semibold mb-3 text-accent">我的统计</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">总彩票数</p>
            <p className="text-xl font-mono">{userTickets?.length || 0}</p>
          </div>
          <div>
            <p className="text-gray-500">中奖彩票</p>
            <p className="text-xl font-mono text-success">{winningTickets.length}</p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="alert alert-info">
        <div className="text-sm">
          <p className="font-medium">领取说明:</p>
          <ul className="mt-2 space-y-1 text-xs">
            <li>• 彩票奖金需要周期结束后才能领取</li>
            <li>• 质押收益按周期分配，可随时领取</li>
            <li>• 已领取的奖励不会重复显示</li>
          </ul>
        </div>
      </div>
    </div>
  );
};