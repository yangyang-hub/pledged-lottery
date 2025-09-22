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
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { EnhancedErrorDisplay, useEnhancedError } from "~~/components/EnhancedErrorHandler";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useEnhancedRefresh } from "~~/hooks/useEnhancedRefresh";
import { useDelayedLoad } from "~~/hooks/useDelayedLoad";
import { customFoundry, monadTestnet } from "~~/scaffold.config";
import { notification } from "~~/utils/scaffold-eth";

export const RewardsSection = () => {
  const { address, chain } = useAccount();

  // Network validation
  const isValidNetwork = chain && (chain.id === customFoundry.id || chain.id === monadTestnet.id);

  // 延迟加载用户彩票数据，避免同时发起太多请求
  const userDataReady = useDelayedLoad(500);

  // 状态筛选管理
  const [activeTab, setActiveTab] = useState<'all' | 'unscratched' | 'non-winning' | 'unclaimed' | 'claimed'>('all');

  // Read contract data - 使用批量函数获取所有彩票状态
  const { data: userTicketData } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "getUserTicketsWithStates",
    args: [address],
    query: {
      enabled: userDataReady && !!address,
    },
  });

  const { data: userWinningTickets } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "getUserWinningTickets",
    args: [address],
    query: {
      enabled: userDataReady && !!address,
    },
  });

  // 获取每张彩票的详细信息来检查是否已领取
  const winningTicketIds = (userWinningTickets?.[0] as any) || [];

  // 解析批量数据
  const allTickets = (userTicketData as any)?.[0] || [];
  const ticketStates = (userTicketData as any)?.[1] || [];  // 0=未刮开, 1=未中奖, 2=待领奖, 3=已领奖
  const prizeAmounts = (userTicketData as any)?.[2] || [];

  // 创建票据状态分类
  const categorizedTickets = useMemo(() => {
    if (!allTickets.length) {
      return {
        all: [],
        unscratched: [],
        'non-winning': [],
        unclaimed: [],
        claimed: [],
      };
    }

    const categories = {
      all: allTickets,
      unscratched: [] as bigint[],
      'non-winning': [] as bigint[],
      unclaimed: [] as bigint[],
      claimed: [] as bigint[],
    };

    allTickets.forEach((tokenId: bigint, index: number) => {
      const state = ticketStates[index];
      switch (state) {
        case 0:
          categories.unscratched.push(tokenId);
          break;
        case 1:
          categories['non-winning'].push(tokenId);
          break;
        case 2:
          categories.unclaimed.push(tokenId);
          break;
        case 3:
          categories.claimed.push(tokenId);
          break;
      }
    });

    return categories;
  }, [allTickets, ticketStates]);

  // 标签配置
  const tabConfig = [
    { key: 'all', label: '全部', icon: TrophyIcon, count: categorizedTickets.all.length },
    { key: 'unscratched', label: '未刮开', icon: EyeIcon, count: categorizedTickets.unscratched.length },
    { key: 'non-winning', label: '未中奖', icon: XMarkIcon, count: categorizedTickets['non-winning'].length },
    { key: 'unclaimed', label: '待领奖', icon: ClockIcon, count: categorizedTickets.unclaimed.length },
    { key: 'claimed', label: '已领奖', icon: CheckCircleIcon, count: categorizedTickets.claimed.length },
  ] as const;

  const currentTickets = categorizedTickets[activeTab];

  return (
    <div className="space-y-4">
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
      {userDataReady && <WinningTicketsAlert winningTicketIds={winningTicketIds} />}

      {/* My Tickets List with Fixed Filter - 固定高度区域 */}
      <div className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <TrophyIcon className="h-5 w-5" />
          我的彩票
        </h3>

        {/* 固定状态筛选标签 */}
        <div className="flex flex-wrap gap-2 pb-2 border-b border-base-300">
          {tabConfig.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as typeof activeTab)}
              className={`btn btn-sm ${
                activeTab === key ? 'btn-primary' : 'btn-ghost'
              } flex items-center gap-1`}
            >
              <Icon className="h-4 w-4" />
              {label}
              <span className="badge badge-sm">{count}</span>
            </button>
          ))}
        </div>

        {/* 彩票列表滚动区域 - 调整合适高度 */}
        <div className="h-120 overflow-y-auto border border-base-300 rounded-lg p-3 bg-base-50/30 min-h-0">
          {!userDataReady ? (
            <div className="text-center py-8">
              <span className="loading loading-spinner loading-md"></span>
              <p className="mt-2 text-gray-500">加载彩票数据中...</p>
            </div>
          ) : allTickets && allTickets.length > 0 ? (
            <TicketCardList
              tickets={currentTickets}
              ticketStates={ticketStates}
              prizeAmounts={prizeAmounts}
              allTickets={allTickets}
              activeTabLabel={tabConfig.find(t => t.key === activeTab)?.label || ''}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              <GiftIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>暂无彩票</p>
              {!address && <p className="text-sm mt-2">请先连接钱包</p>}
            </div>
          )}
        </div>
      </div>

      {/* Bottom compact stats and info */}
      <div className="space-y-3">
        {/* Compact Summary Stats */}
        <div className="bg-gradient-to-r from-accent/10 to-primary/10 rounded-lg p-3">
          <h4 className="font-semibold mb-2 text-accent text-sm">我的统计</h4>
          <div className="grid grid-cols-4 gap-3 text-xs">
            <div className="text-center">
              <p className="text-gray-500">总数</p>
              <p className="text-lg font-mono">{allTickets?.length || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">中奖</p>
              <p className="text-lg font-mono text-success">{(userWinningTickets?.[0] as any)?.length || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">未刮开</p>
              <p className="text-lg font-mono text-info">{categorizedTickets.unscratched.length}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">待领奖</p>
              <p className="text-lg font-mono text-warning">{categorizedTickets.unclaimed.length}</p>
            </div>
          </div>
        </div>

        {/* Compact Info */}
        <div className="alert alert-info py-2">
          <div className="text-xs">
            <p className="font-medium mb-1">操作说明:</p>
            <p>• 购买彩票后需要先刮开才能查看中奖结果 • 中奖彩票可以单独或批量领取奖金</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// 简化的彩票卡片列表组件
const TicketCardList = ({
  tickets,
  ticketStates,
  prizeAmounts,
  allTickets,
  activeTabLabel
}: {
  tickets: bigint[];
  ticketStates: number[];
  prizeAmounts: bigint[];
  allTickets: bigint[];
  activeTabLabel: string;
}) => {
  return (
    <div className="space-y-3">
      {tickets.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <GiftIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>暂无{activeTabLabel}彩票</p>
        </div>
      ) : (
        <>
          {tickets.map((tokenId: bigint, index: number) => {
            const tokenIndex = allTickets.findIndex(id => id === tokenId);
            return (
              <OptimizedTicketCard
                key={tokenId.toString()}
                tokenId={tokenId}
                loadDelay={index * 20}
                ticketState={tokenIndex >= 0 ? ticketStates[tokenIndex] : 0}
                prizeAmount={tokenIndex >= 0 ? prizeAmounts[tokenIndex] : BigInt(0)}
              />
            );
          })}

          {tickets.length > 0 && (
            <div className="text-center py-2 text-xs text-gray-500">
              显示全部 {tickets.length} 张{activeTabLabel}彩票
            </div>
          )}
        </>
      )}
    </div>
  );
};

// 优化版票据卡片组件 - 使用预获取的状态信息
const OptimizedTicketCard = ({
  tokenId,
  loadDelay = 0,
  ticketState,
  prizeAmount
}: {
  tokenId: bigint;
  loadDelay?: number;
  ticketState: number; // 0=未刮开, 1=未中奖, 2=待领奖, 3=已领奖
  prizeAmount: bigint;
}) => {
  const { chain } = useAccount();
  const { error, handleError, clearError } = useEnhancedError();
  const { refreshAfterTransaction } = useEnhancedRefresh();
  const isReady = useDelayedLoad(loadDelay);

  // Network validation
  const isValidNetwork = chain && (chain.id === customFoundry.id || chain.id === monadTestnet.id);

  const { writeContractAsync: scratchTicket, isMining: isScratching } = useScaffoldWriteContract("PledgedLottery");
  const { writeContractAsync: claimPrize, isMining: isClaiming } = useScaffoldWriteContract("PledgedLottery");

  if (!isReady) {
    return (
      <div className="card bg-base-200 animate-pulse">
        <div className="card-body p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gray-300 rounded"></div>
              <div className="w-20 h-4 bg-gray-300 rounded"></div>
            </div>
            <div className="w-16 h-4 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const getPrizeTypeLabel = (state: number) => {
    switch (state) {
      case 0:
        return { label: "未刮开", color: "text-gray-500", icon: EyeIcon };
      case 1:
        return { label: "未中奖", color: "text-gray-500", icon: XMarkIcon };
      case 2:
        return { label: "待领奖", color: "text-success", icon: CurrencyDollarIcon };
      case 3:
        return { label: "已领奖", color: "text-success", icon: CheckCircleIcon };
      default:
        return { label: "未知", color: "text-gray-500", icon: GiftIcon };
    }
  };

  // 根据奖项类型获取具体奖项标签
  const getActualPrizeLabel = (prizeType: number) => {
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
        return { label: "未中奖", color: "text-gray-500", icon: XMarkIcon };
    }
  };

  const getStatusBadge = (state: number) => {
    switch (state) {
      case 0:
        return { label: "未刮开", color: "badge-info", icon: EyeIcon };
      case 1:
        return { label: "未中奖", color: "badge-neutral", icon: XMarkIcon };
      case 2:
        return { label: "待领奖", color: "badge-warning", icon: ClockIcon };
      case 3:
        return { label: "已领奖", color: "badge-success", icon: CheckCircleIcon };
      default:
        return { label: "加载中", color: "badge-ghost", icon: ClockIcon };
    }
  };

  const prizeInfo = getPrizeTypeLabel(ticketState);
  const statusInfo = getStatusBadge(ticketState);

  // 判断实际奖项类型（用于动态显示奖项信息）
  const getPrizeTypeFromAmount = (amount: bigint): number => {
    if (amount === BigInt(0)) return 0;
    // 根据奖金金额判断奖项类型（这里简化处理）
    const ethAmount = Number(formatEther(amount));
    if (ethAmount >= 1) return 4; // 特等奖
    if (ethAmount >= 0.1) return 3; // 大奖
    if (ethAmount >= 0.01) return 2; // 中奖
    return 1; // 小奖
  };

  const actualPrizeType = ticketState >= 2 ? getPrizeTypeFromAmount(prizeAmount) : 0;

  // 根据票据状态选择显示的奖项信息
  const displayPrizeInfo = ticketState >= 2 && actualPrizeType > 0
    ? getActualPrizeLabel(actualPrizeType)
    : prizeInfo;

  const IconComponent = displayPrizeInfo.icon;
  const StatusIcon = statusInfo.icon;

  const handleScratch = async () => {
    if (!isValidNetwork) {
      handleError(new Error("请连接到支持的网络"), "刮开彩票");
      return;
    }

    try {
      clearError();
      const result = await scratchTicket({
        functionName: "scratchTicket",
        args: [tokenId],
      });
      notification.success("彩票已刮开!");

      if (result) {
        refreshAfterTransaction(result, 1000);
      }
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
      const result = await claimPrize({
        functionName: "claimPrize",
        args: [tokenId],
      });
      notification.success("奖金领取成功!");

      if (result) {
        refreshAfterTransaction(result, 1000);
      }
    } catch (error) {
      handleError(error, "领取奖金");
    }
  };

  return (
    <div className={`card bg-base-200 ${ticketState >= 2 ? "border border-success" : ""}`}>
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
            <IconComponent className={`h-5 w-5 ${displayPrizeInfo.color}`} />
            <div>
              <p className="font-mono text-sm">#{tokenId.toString()}</p>
              <p className="text-xs text-gray-500">彩票编号</p>
            </div>
          </div>

          <div className="text-right flex flex-col items-end gap-1">
            {/* 状态标签 */}
            <div className={`badge badge-sm ${statusInfo.color} flex items-center gap-1`}>
              <StatusIcon className="h-3 w-3" />
              {statusInfo.label}
            </div>

            {/* 奖项信息 */}
            {ticketState >= 1 ? (
              <>
                <p className={`text-sm font-medium ${displayPrizeInfo.color}`}>{displayPrizeInfo.label}</p>
                {ticketState >= 2 && prizeAmount > 0 && (
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
          {ticketState === 0 && (
            <button
              className="btn btn-secondary btn-sm flex-1"
              onClick={handleScratch}
              disabled={!isValidNetwork || isScratching}
            >
              {isScratching ? "刮开中..." : "刮开彩票"}
            </button>
          )}

          {ticketState === 2 && (
            <button
              className="btn btn-success btn-sm flex-1"
              onClick={handleClaim}
              disabled={!isValidNetwork || isClaiming}
            >
              {isClaiming ? "领取中..." : "领取奖金"}
            </button>
          )}

          {ticketState === 3 && <div className="badge badge-success badge-sm">已领取</div>}

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
  const isReady = useDelayedLoad(1000); // 延迟1秒加载

  const { data: ticketInfo } = useScaffoldReadContract({
    contractName: "PledgedLottery",
    functionName: "getTicketInfo",
    args: [tokenId],
    query: {
      enabled: isReady,
    },
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
  const { refreshAfterTransaction, refreshImmediately } = useEnhancedRefresh();

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
      const result = await claimPrizes({
        functionName: "claimPrizes",
        args: [unclaimedTickets],
      });
      notification.success("批量领取奖金成功!");

      // 成功后清理状态，让组件重新检查票据状态
      setTicketClaimStatus(new Map());

      // 等待交易确认后刷新数据
      if (result) {
        // 优化后的单次刷新，减少延迟
        refreshAfterTransaction(result, 1000);
      }
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
      {/* 隐藏的状态检查器组件 - 分批加载 */}
      {winningTicketIds.slice(0, 5).map((tokenId, index) => (
        <TicketClaimChecker
          key={tokenId.toString()}
          tokenId={tokenId}
          onStatusUpdate={handleTicketStatusUpdate}
        />
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
              className="btn btn-primary btn-sm ml-4"
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
