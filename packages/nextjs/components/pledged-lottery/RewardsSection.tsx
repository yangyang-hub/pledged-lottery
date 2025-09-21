"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import {
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  GiftIcon,
  SparklesIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";
import { EnhancedErrorDisplay, useEnhancedError } from "~~/components/EnhancedErrorHandler";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { customFoundry, monadTestnet } from "~~/scaffold.config";
import { notification } from "~~/utils/scaffold-eth";

export const RewardsSection = () => {
  const { address, chain } = useAccount();

  // Network validation
  const isValidNetwork = chain && (chain.id === customFoundry.id || chain.id === monadTestnet.id);

  // Read contract data
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

  // 获取每张彩票的详细信息来检查是否已领取
  const winningTicketIds = (userWinningTickets?.[0] as any) || [];

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

      {/* Quick Actions */}
      <WinningTicketsAlert winningTicketIds={winningTicketIds} />

      {/* My Tickets List */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <TrophyIcon className="h-5 w-5" />
          我的彩票
        </h3>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {userTickets && (userTickets as any).length > 0 ? (
            (userTickets as any).map((tokenId: bigint) => <TicketCard key={tokenId.toString()} tokenId={tokenId} />)
          ) : (
            <div className="text-center py-8 text-gray-500">
              <GiftIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>暂无彩票</p>
              {!address && <p className="text-sm mt-2">请先连接钱包</p>}
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
            <p className="text-xl font-mono">{(userTickets as any)?.length || 0}</p>
          </div>
          <div>
            <p className="text-gray-500">中奖彩票</p>
            <p className="text-xl font-mono text-success">{(userWinningTickets?.[0] as any)?.length || 0}</p>
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
            <li>• 奖金金额根据系统总销售额动态计算</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Ticket Card Component
const TicketCard = ({ tokenId }: { tokenId: bigint }) => {
  const { chain } = useAccount();
  const { error, handleError, clearError } = useEnhancedError();

  // Network validation
  const isValidNetwork = chain && (chain.id === customFoundry.id || chain.id === monadTestnet.id);

  const { data: ticketInfo } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "getTicketInfo",
    args: [tokenId],
  });

  const { writeContractAsync: scratchTicket, isMining: isScratching } = useScaffoldWriteContract("PledgedLottery");
  const { writeContractAsync: claimPrize, isMining: isClaiming } = useScaffoldWriteContract("PledgedLottery");

  if (!ticketInfo) return null;

  const getPrizeTypeLabel = (prizeType: number) => {
    switch (prizeType) {
      case 1:
        return { label: "小奖", color: "text-success", icon: GiftIcon };
      case 2:
        return { label: "中奖", color: "text-warning", icon: CurrencyDollarIcon };
      case 3:
        return { label: "大奖", color: "text-error", icon: TrophyIcon };
      case 4:
        return { label: "特等奖", color: "text-purple-500", icon: SparklesIcon };
      default:
        return { label: "未中奖", color: "text-gray-500", icon: GiftIcon };
    }
  };

  const [isScratched, prizeType, prizeAmount, isPrizeClaimed] = (ticketInfo as any) || [];

  const prizeInfo = getPrizeTypeLabel(Number(prizeType));
  const IconComponent = prizeInfo.icon;

  const handleScratch = async () => {
    if (!isValidNetwork) {
      handleError(new Error("请连接到支持的网络"), "刮开彩票");
      return;
    }

    try {
      clearError();
      await scratchTicket({
        functionName: "scratchTicket",
        args: [tokenId],
      });
      notification.success("彩票已刮开!");
    } catch (error) {
      handleError(error, "刮开彩票");
    }
  };

  const handleClaim = async () => {
    if (!isValidNetwork) {
      handleError(new Error("请连接到支持的网络"), "领取奖金");
      return;
    }

    try {
      clearError();
      await claimPrize({
        functionName: "claimPrize",
        args: [tokenId],
      });
      notification.success("奖金领取成功!");
    } catch (error) {
      handleError(error, "领取奖金");
    }
  };

  return (
    <div className={`card bg-base-200 ${Number(prizeType) > 0 ? "border border-success" : ""}`}>
      <div className="card-body p-4">
        {/* Error Display for this ticket */}
        {error && (
          <div className="mb-2">
            <EnhancedErrorDisplay
              error={error}
              title="操作失败"
              onRetry={error.message?.includes("刮开") ? handleScratch : handleClaim}
              showRetry={true}
              className="alert-error text-xs"
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconComponent className={`h-5 w-5 ${prizeInfo.color}`} />
            <div>
              <p className="font-mono text-sm">#{tokenId.toString()}</p>
              <p className="text-xs text-gray-500">彩票编号</p>
            </div>
          </div>

          <div className="text-right">
            {isScratched ? (
              <>
                <p className={`text-sm font-medium ${prizeInfo.color}`}>{prizeInfo.label}</p>
                {Number(prizeType) > 0 && (
                  <p className="text-xs font-mono">
                    {formatEther(prizeAmount)} {chain?.nativeCurrency.symbol || "ETH"}
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
              className={`btn btn-secondary btn-sm flex-1 ${isScratching ? "loading" : ""}`}
              onClick={handleScratch}
              disabled={!isValidNetwork || isScratching}
            >
              {isScratching ? "刮开中..." : "刮开彩票"}
            </button>
          )}

          {isScratched && Number(prizeType) > 0 && !isPrizeClaimed && (
            <button
              className={`btn btn-success btn-sm flex-1 ${isClaiming ? "loading" : ""}`}
              onClick={handleClaim}
              disabled={!isValidNetwork || isClaiming}
            >
              {isClaiming ? "领取中..." : "领取奖金"}
            </button>
          )}

          {isPrizeClaimed && <div className="badge badge-success badge-sm">已领取</div>}

          {!isValidNetwork && <div className="badge badge-warning badge-sm">网络错误</div>}
        </div>
      </div>
    </div>
  );
};

// 用于检查单个彩票状态的子组件
const TicketClaimChecker = ({
  tokenId,
  onStatusUpdate,
}: {
  tokenId: bigint;
  onStatusUpdate: (tokenId: bigint, isClaimed: boolean) => void;
}) => {
  const { data: ticketInfo } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "getTicketInfo",
    args: [tokenId],
  });

  useEffect(() => {
    if (ticketInfo) {
      const [, , , isPrizeClaimed] = ticketInfo as any;
      onStatusUpdate(tokenId, isPrizeClaimed);
    }
  }, [ticketInfo, tokenId, onStatusUpdate]);

  return null;
};

// 简化的中奖彩票提醒组件
const WinningTicketsAlert = ({ winningTicketIds }: { winningTicketIds: bigint[] }) => {
  const [ticketClaimStatus, setTicketClaimStatus] = useState<Map<string, boolean>>(new Map());
  const { error, handleError, clearError } = useEnhancedError();
  const { chain } = useAccount();

  // Network validation
  const isValidNetwork = chain && (chain.id === customFoundry.id || chain.id === monadTestnet.id);

  // Write functions
  const { writeContractAsync: claimPrizes, isMining: isClaimingPrizes } = useScaffoldWriteContract("PledgedLottery");

  // 处理彩票状态更新的回调
  const handleTicketStatusUpdate = useCallback((tokenId: bigint, isClaimed: boolean) => {
    setTicketClaimStatus(prev => {
      const newMap = new Map(prev);
      newMap.set(tokenId.toString(), isClaimed);
      return newMap;
    });
  }, []);

  // 计算未领取的彩票
  const unclaimedTickets = useMemo(() => {
    return winningTicketIds.filter(tokenId => {
      const isClaimed = ticketClaimStatus.get(tokenId.toString());
      return isClaimed === false; // 只返回明确标记为未领取的彩票
    });
  }, [winningTicketIds, ticketClaimStatus]);

  const handleClaimAllPrizes = async () => {
    if (!isValidNetwork) {
      handleError(new Error("请连接到支持的网络"), "批量领取奖金");
      return;
    }

    if (unclaimedTickets.length === 0) {
      handleError(new Error("没有可领取的奖金"), "批量领取奖金");
      return;
    }

    try {
      clearError();
      await claimPrizes({
        functionName: "claimPrizes",
        args: [unclaimedTickets],
      });
      notification.success("批量领取奖金成功!");
      // 成功后清理状态，让组件重新检查票据状态
      setTicketClaimStatus(new Map());
    } catch (error: any) {
      handleError(error, "批量领取奖金失败");
    }
  };

  if (
    unclaimedTickets.length === 0 &&
    winningTicketIds.length > 0 &&
    ticketClaimStatus.size === winningTicketIds.length
  ) {
    // 如果所有票据状态都已检查且没有未领取的票据，则不显示
    return null;
  }

  if (winningTicketIds.length === 0) {
    return null;
  }

  return (
    <>
      {/* 隐藏的状态检查器组件 */}
      {winningTicketIds.map(tokenId => (
        <TicketClaimChecker key={tokenId.toString()} tokenId={tokenId} onStatusUpdate={handleTicketStatusUpdate} />
      ))}

      {/* 显示错误信息 */}
      {error && (
        <EnhancedErrorDisplay error={error} title="批量领取奖金失败" onRetry={handleClaimAllPrizes} showRetry={true} />
      )}

      {/* 只在有未领取彩票时显示 */}
      {unclaimedTickets.length > 0 && (
        <div className="alert alert-success">
          <TrophyIcon className="h-5 w-5" />
          <div>
            <span>恭喜! 您有 {unclaimedTickets.length} 张中奖彩票</span>
            <button
              className={`btn btn-primary btn-sm ml-4 ${isClaimingPrizes ? "loading" : ""}`}
              onClick={handleClaimAllPrizes}
              disabled={!isValidNetwork || isClaimingPrizes}
            >
              {isClaimingPrizes ? "领取中..." : "批量领取奖金"}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
