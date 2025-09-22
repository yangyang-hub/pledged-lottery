"use client";

import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { GiftIcon, PresentationChartLineIcon } from "@heroicons/react/24/outline";
import { CycleInfo } from "~~/components/pledged-lottery/CycleInfo";
import { LotterySection } from "~~/components/pledged-lottery/LotterySection";
import { RewardsSection } from "~~/components/pledged-lottery/RewardsSection";
import { Address } from "~~/components/scaffold-eth";
import { useBatchLoad } from "~~/hooks/useDelayedLoad";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();

  // 分批加载策略，避免同时发起大量RPC调用
  const cycleInfoReady = useBatchLoad(0, 500);     // 立即加载基础信息
  const lotteryReady = useBatchLoad(1, 500);       // 500ms后加载彩票功能
  const rewardsReady = useBatchLoad(2, 500);       // 1000ms后加载奖励功能

  return (
    <>
      <div className="flex items-center flex-col grow pt-10">
        <div className="px-5 max-w-6xl w-full">
          <h1 className="text-center mb-8">
            <span className="block text-2xl mb-2">欢迎来到</span>
            <span className="block text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Monad刮刮乐
            </span>
          </h1>

          <div className="flex justify-center items-center space-x-2 flex-col mb-8">
            <p className="my-2 font-medium">连接地址:</p>
            <Address address={connectedAddress} />
          </div>

          {/* Cycle Information - 立即加载 */}
          {cycleInfoReady && <CycleInfo />}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 lg:items-stretch">
            {/* Lottery Section - 延迟加载 */}
            <div className="lg:col-span-1">
              <div className="card bg-base-100 shadow-xl h-full">
                <div className="card-body h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <GiftIcon className="h-6 w-6 text-secondary" />
                    <h2 className="card-title text-secondary">彩票购买</h2>
                  </div>
                  {lotteryReady ? (
                    <LotterySection />
                  ) : (
                    <div className="flex justify-center items-center h-32">
                      <span className="loading loading-spinner loading-md"></span>
                      <span className="ml-2">加载中...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Rewards Section - 更长延迟加载 */}
            <div className="lg:col-span-1">
              <div className="card bg-base-100 shadow-xl h-full">
                <div className="card-body h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <PresentationChartLineIcon className="h-6 w-6 text-accent" />
                    <h2 className="card-title text-accent">彩票管理</h2>
                  </div>
                  {rewardsReady ? (
                    <RewardsSection />
                  ) : (
                    <div className="flex justify-center items-center h-32">
                      <span className="loading loading-spinner loading-md"></span>
                      <span className="ml-2">加载中...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            <div className="card bg-gradient-to-br from-secondary/10 to-secondary/20 border border-secondary/20">
              <div className="card-body text-center">
                <GiftIcon className="h-12 w-12 text-secondary mx-auto mb-4" />
                <h3 className="text-lg font-bold text-secondary">NFT彩票系统</h3>
                <p className="text-sm opacity-80">购买NFT彩票，刮刮乐开奖，25%综合中奖率，四级奖励等你来</p>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-accent/10 to-accent/20 border border-accent/20">
              <div className="card-body text-center">
                <PresentationChartLineIcon className="h-12 w-12 text-accent mx-auto mb-4" />
                <h3 className="text-lg font-bold text-accent">实时彩票</h3>
                <p className="text-sm opacity-80">
                  持续运行的彩票系统，随时购买随时开奖，无平台手续费，100%销售额用作奖金池
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
