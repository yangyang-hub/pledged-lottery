"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { GiftIcon, PresentationChartLineIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { CycleInfo } from "~~/components/pledged-lottery/CycleInfo";
import { LotterySection } from "~~/components/pledged-lottery/LotterySection";
import { RewardsSection } from "~~/components/pledged-lottery/RewardsSection";
import { AdminPanel } from "~~/components/pledged-lottery/AdminPanel";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();

  return (
    <>
      <div className="flex items-center flex-col grow pt-10">
        <div className="px-5 max-w-6xl w-full">
          <h1 className="text-center mb-8">
            <span className="block text-2xl mb-2">欢迎来到</span>
            <span className="block text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              质押彩票系统
            </span>
          </h1>
          
          <div className="flex justify-center items-center space-x-2 flex-col mb-8">
            <p className="my-2 font-medium">连接地址:</p>
            <Address address={connectedAddress} />
          </div>

          {/* Cycle Information */}
          <CycleInfo />

          {/* Admin Panel - Only visible to admin */}
          <AdminPanel />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            {/* Lottery Section */}
            <div className="lg:col-span-1">
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <div className="flex items-center gap-2 mb-4">
                    <GiftIcon className="h-6 w-6 text-secondary" />
                    <h2 className="card-title text-secondary">彩票购买</h2>
                  </div>
                  <LotterySection />
                </div>
              </div>
            </div>

            {/* Rewards Section */}
            <div className="lg:col-span-1">
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <div className="flex items-center gap-2 mb-4">
                    <PresentationChartLineIcon className="h-6 w-6 text-accent" />
                    <h2 className="card-title text-accent">彩票管理</h2>
                  </div>
                  <RewardsSection />
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
                <p className="text-sm opacity-80">
                  购买NFT彩票，刮刮乐开奖，50%综合中奖率，四级奖励等你来
                </p>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-accent/10 to-accent/20 border border-accent/20">
              <div className="card-body text-center">
                <PresentationChartLineIcon className="h-12 w-12 text-accent mx-auto mb-4" />
                <h3 className="text-lg font-bold text-accent">7天周期</h3>
                <p className="text-sm opacity-80">
                  每个彩票周期7天，自动开奖，无平台手续费，100%销售额用作奖金池
                </p>
              </div>
            </div>
          </div>

          {/* Debug Link */}
          <div className="flex justify-center mt-12">
            <div className="card bg-base-200/50 border border-base-300">
              <div className="card-body py-4 px-6">
                <p className="text-center text-sm">
                  开发者工具:{" "}
                  <Link href="/debug" className="link link-primary">
                    调试合约
                  </Link>{" "}
                  |{" "}
                  <Link href="/blockexplorer" className="link link-primary">
                    区块浏览器
                  </Link>
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
