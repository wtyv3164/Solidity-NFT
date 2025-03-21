"use client";

import { useState } from "react";
import { Address } from "viem";
import { useAccountBalance } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";

type BalanceProps = {
  address?: Address;
  className?: string;
  usdMode?: boolean;
};

/**
 * Display (ETH & USD) balance of an ETH address.
 */
export const Balance = ({ address, className = "", usdMode }: BalanceProps) => {
  const { targetNetwork } = useTargetNetwork();
  const { balance, price, isError, isLoading } = useAccountBalance(address);
  const [displayUsdMode, setDisplayUsdMode] = useState(price > 0 ? Boolean(usdMode) : false);

  const toggleBalanceMode = () => {
    if (price > 0) {
      setDisplayUsdMode(prevMode => !prevMode);
    }
  };

  if (!address || isLoading || balance === null) {
    return (
      <div className="animate-pulse flex space-x-4">
        <div className="rounded-md bg-slate-300 h-6 w-6"></div>
        <div className="flex items-center space-y-6">
          <div className="h-2 w-28 bg-slate-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`border-2 border-gray-400 rounded-md px-2 flex flex-col items-center max-w-fit cursor-pointer`}>
        <div className="text-warning">错误咯</div>
      </div>
    );
  }

  return (
    <button
      className={`btn btn-sm btn-ghost flex flex-col font-normal items-center hover:bg-transparent ${className}`}
      onClick={toggleBalanceMode}
    >
      <div className="w-full flex items-center justify-center">
        {displayUsdMode ? (
          <>
            <span className="text-[0.8em] font-bold mr-1">￥</span>
            <span>{(balance * price).toFixed(2)}</span>
          </>
        ) : (
          <>
            <span>{balance?.toFixed(4)}</span>
            {/* <span className="text-[0.8em] font-bold ml-1">{targetNetwork.nativeCurrency.symbol}</span> */}
            <span className="text-[0.8em] font-bold ml-1">星</span>
          </>
        )}
      </div>
    </button>
  );
};
