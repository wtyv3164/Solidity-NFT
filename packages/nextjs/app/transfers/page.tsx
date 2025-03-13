"use client";

import type { NextPage } from "next";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import axios from "axios";
import { useEffect, useState } from "react";

const Transfers: NextPage = () => {
  const { data: transferEvents, isLoading } = useScaffoldEventHistory({
    contractName: "YourCollectible",
    eventName: "Transfer",
    fromBlock: 0n,
  });

  // 使用 state 保存已经保存过的 transactionHash
  const [processedTransactions, setProcessedTransactions] = useState<Set<string>>(new Set());

  // 保存转移记录到数据库
  const saveTransferToDb = async (event: any) => {
    //console.log("尝试保存事件：", event);
    try {
      await axios.post("http://localhost:3001/saveNftTransfers", {
        tokenId: event.args.tokenId?.toString(), // Token ID  
        from: event.args.from || "", // 来源地址
        to: event.args.to || "", // 目标地址
        blockNumber: event.block.number.toString() || "", // 区块号
        //transactionHash: event.block.hash || "0xabcdefabcdefabcdefabcdefabcdefabcdefabcde1", // 交易哈希
        transactionHash: event.block.transactions[0] || "0xabcdefabcdefabcdefabcdefabcdefabcdefabcde1", // 交易哈希
        //gas: event.block.gasUsed.toString() || "",
        gas: event.block.baseFeePerGas.toString() || "",
        timestamp: event.block.timestamp.toString() || "",
      });
      console.log("转移记录已保存");
    } catch (error) {
      console.error("保存转移记录失败: ", error);
    }
  };

  // 监听 transferEvents，过滤未处理的事件
  useEffect(() => {
    if (transferEvents) {
      transferEvents.forEach((event) => {
        if (!processedTransactions.has(event.log.blockHash)) {    //event.log.blockHash
          // 如果事件未处理，保存记录并更新已处理列表
          saveTransferToDb(event);
          setProcessedTransactions((prev) => new Set(prev).add(event.log.blockHash));
        }
      });
    }
  }, [transferEvents, processedTransactions]);

  if (isLoading)
    return (
      <div className="flex justify-center items-center mt-10">
        <span className="loading loading-spinner loading-xl"></span>
      </div>
    );

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <h1 className="text-center mb-8">
            <span className="block text-4xl font-bold">所有转移事件</span>
          </h1>
        </div>
        <div className="overflow-x-auto shadow-lg">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th className="bg-primary"> Id</th>
                <th className="bg-primary">From</th>
                <th className="bg-primary">To</th>
              </tr>
            </thead>
            <tbody>
              {!transferEvents || transferEvents.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center">
                    没有发现事件
                  </td>
                </tr>
              ) : (
                transferEvents?.map((event, index) => {
                  return (
                    <tr key={index}>
                      <th className="text-center">{event.args.tokenId?.toString()}</th>
                      <td>
                        <Address address={event.args.from} />
                      </td>
                      <td>
                        <Address address={event.args.to} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default Transfers;
