"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { GiftIcon, CurrencyDollarIcon, TrophyIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export const RewardsSection = () => {
  const { address } = useAccount();

  // Read contract data
  const { data: currentRound } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "currentRound",
  });

  const { data: userTickets } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "getUserTickets",
    args: [address],
  });

  const { data: userWinningTickets } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "getUserWinningTickets",
    args: [address],
  });

  // Write functions
  const { writeContractAsync: claimPrize } = useScaffoldWriteContract("PledgedLottery");
  const { writeContractAsync: claimPrizes } = useScaffoldWriteContract("PledgedLottery");
  const { writeContractAsync: scratchTicket } = useScaffoldWriteContract("PledgedLottery");

  const handleScratchTicket = async (tokenId: bigint) => {
    try {
      await scratchTicket({
        functionName: "scratchTicket",
        args: [tokenId],
      });
      notification.success("彩票已刮开!");
    } catch (error) {
      console.error("刮开彩票失败:", error);
      notification.error("刮开彩票失败");
    }
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

  const handleClaimAllPrizes = async () => {
    if (!userWinningTickets?.[0] || userWinningTickets[0].length === 0) {
      notification.error("没有可领取的奖金");
      return;
    }

    try {
      await claimPrizes({
        functionName: "claimPrizes",
        args: [userWinningTickets[0]],
      });
      notification.success("批量领取成功!");
    } catch (error) {
      console.error("批量领取失败:", error);
      notification.error("批量领取失败");
    }
  };

  const getPrizeTypeLabel = (prizeType: number) => {
    switch (prizeType) {
      case 1: return { label: "小奖", color: "text-success", icon: GiftIcon };
      case 2: return { label: "中奖", color: "text-warning", icon: CurrencyDollarIcon };
      case 3: return { label: "大奖", color: "text-error", icon: TrophyIcon };
      case 4: return { label: "特等奖", color: "text-purple-500", icon: SparklesIcon };
      default: return { label: "未中奖", color: "text-gray-500", icon: GiftIcon };
    }
  };

  // Get ticket details for each ticket
  const useTicketInfo = (tokenId: bigint) => {
    return useScaffoldReadContract({
      contractName: "PledgedLottery",
      functionName: "getTicketInfo",
      args: [tokenId],
    });
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      {userWinningTickets?.[0] && userWinningTickets[0].length > 0 && (
        <div className="alert alert-success">
          <TrophyIcon className="h-5 w-5" />
          <div>
            <span>恭喜! 您有 {userWinningTickets[0].length} 张中奖彩票</span>
            <button
              className="btn btn-primary btn-sm ml-4"
              onClick={handleClaimAllPrizes}
            >
              批量领取奖金
            </button>
          </div>
        </div>
      )}

      {/* My Tickets List */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <TrophyIcon className="h-5 w-5" />
          我的彩票
        </h3>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {userTickets && userTickets.length > 0 ? (
            userTickets.map((tokenId) => <TicketCard key={tokenId.toString()} tokenId={tokenId} />)
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
            <p className="text-xl font-mono text-success">{userWinningTickets?.[0]?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="alert alert-info">
        <div className="text-sm">
          <p className="font-medium">操作说明:</p>
          <ul className="mt-2 space-y-1 text-xs">
            <li>• 购买彩票后需要先刮开才能查看中奖结果</li>
            <li>• 中奖彩票可以单独领取或批量领取奖金</li>
            <li>• 奖金金额根据周期销售额动态计算</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Ticket Card Component
const TicketCard = ({ tokenId }: { tokenId: bigint }) => {
  const { data: ticketInfo } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "getTicketInfo",
    args: [tokenId],
  });

  const { writeContractAsync: scratchTicket } = useScaffoldWriteContract("PledgedLottery");
  const { writeContractAsync: claimPrize } = useScaffoldWriteContract("PledgedLottery");

  if (!ticketInfo) return null;

  const [round, isScratched, prizeType, prizeAmount, isPrizeClaimed] = ticketInfo;
  const getPrizeTypeLabel = (prizeType: number) => {
    switch (prizeType) {
      case 1: return { label: "小奖", color: "text-success", icon: GiftIcon };
      case 2: return { label: "中奖", color: "text-warning", icon: CurrencyDollarIcon };
      case 3: return { label: "大奖", color: "text-error", icon: TrophyIcon };
      case 4: return { label: "特等奖", color: "text-purple-500", icon: SparklesIcon };
      default: return { label: "未中奖", color: "text-gray-500", icon: GiftIcon };
    }
  };
  const prizeInfo = getPrizeTypeLabel(Number(prizeType));
  const IconComponent = prizeInfo.icon;

  const handleScratch = async () => {
    try {
      await scratchTicket({
        functionName: "scratchTicket",
        args: [tokenId],
      });
      notification.success("彩票已刮开!");
    } catch (error) {
      console.error("刮开彩票失败:", error);
      notification.error("刮开彩票失败");
    }
  };

  const handleClaim = async () => {
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



  return (
    <div className={`card bg-base-200 ${Number(prizeType) > 0 ? 'border border-success' : ''}`}>
      <div className="card-body p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconComponent className={`h-5 w-5 ${prizeInfo.color}`} />
            <div>
              <p className="font-mono text-sm">#{tokenId.toString()}</p>
              <p className="text-xs text-gray-500">第 {round.toString()} 轮</p>
            </div>
          </div>

          <div className="text-right">
            {isScratched ? (
              <>
                <p className={`text-sm font-medium ${prizeInfo.color}`}>
                  {prizeInfo.label}
                </p>
                {Number(prizeType) > 0 && (
                  <p className="text-xs font-mono">
                    {formatEther(prizeAmount)} MON
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">未刮开</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          {!isScratched && (
            <button
              className="btn btn-secondary btn-sm flex-1"
              onClick={handleScratch}
            >
              刮开彩票
            </button>
          )}

          {isScratched && Number(prizeType) > 0 && !isPrizeClaimed && (
            <button
              className="btn btn-success btn-sm flex-1"
              onClick={handleClaim}
            >
              领取奖金
            </button>
          )}

          {isPrizeClaimed && (
            <div className="badge badge-success badge-sm">
              已领取
            </div>
          )}
        </div>
      </div>
    </div>
  );
};