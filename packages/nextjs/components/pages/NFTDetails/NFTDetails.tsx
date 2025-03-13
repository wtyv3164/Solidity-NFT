"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";

interface NFTDetailsProps {
  id: string;
  class: string;
  CID: string;
  image: string;
  name: string;
  attributes: { trait_type: string; value: string }[];
  owner: string;
  price: string;
  description: string;
}

interface TransferEvent {
  from_address: string;
  to_address: string;
  token_id: string;
  block_number: number;
  transaction_hash: string;
  gas: string;
  created_at: string;
}

export const NFTDetails = () => {
  const { id } = useParams(); // 从 URL 获取 NFT ID
  const [nftDetails, setNftDetails] = useState<NFTDetailsProps | null>(null);
  const [transferEvents, setTransferEvents] = useState<TransferEvent[]>([]);
  const [isLoadingTransfers, setIsLoadingTransfers] = useState(true);

  // 获取 NFT 数据
  useEffect(() => {
    const storedNFTs = JSON.parse(localStorage.getItem("createdNFTs") || "[]");
    //console.log("NFT详情页获取的NFT数据", storedNFTs);
    const nft = storedNFTs.find((nft: { id: number }) => nft.id.toString() === id);

    if (nft) {
      setNftDetails(nft);
    }
  }, [id]);

  // 获取 NFT 转移记录
  useEffect(() => {
    const fetchTransferEvents = async () => {
      setIsLoadingTransfers(true);
      try {
        const response = await axios.get(`http://localhost:3001/nftTransfers/${id}`); // 根据后端 API 修改 URL
        //console.log("id=========", id);
        //console.log("获取的转移事件: ", response.data); // 添加日志
        setTransferEvents(response.data);
      } catch (error) {
        //console.error("获取转移事件失败: ", error);
        console.log("获取转移事件失败", error);
      } finally {
        setIsLoadingTransfers(false);
      }
    };

    fetchTransferEvents();
  }, [id]);

  // 格式化日期函数
  const formatDate = (dateString: string) => {
    const formattedDate = new Date(dateString);
    return `${formattedDate.getFullYear()}-${(formattedDate.getMonth() + 1).toString().padStart(2, '0')}-${formattedDate.getDate().toString().padStart(2, '0')} ${formattedDate.getHours().toString().padStart(2, '0')}:${formattedDate.getMinutes().toString().padStart(2, '0')}:${formattedDate.getSeconds().toString().padStart(2, '0')}`;
  };


  if (!nftDetails) {
    return (
      <div className="flex justify-center items-center mt-10">
        <h2 className="text-xl">NFT Not Found</h2>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row items-start gap-8">
        {/* 图片区域 */}
        <div className="flex-shrink-0">
          <img
            src={nftDetails.image.startsWith("http") ? nftDetails.image : `https://ipfs.io/ipfs/${nftDetails.image}`}
            alt={nftDetails.name}
            className="rounded-lg w-full max-w-md mb-6 md:mb-0"
          />
        </div>

        {/* 详细信息区域 */}
        <div className="flex-grow">
          <h1 className="text-3xl font-bold mb-4">NFT 名称：{nftDetails.name}</h1>
          <p className="mb-4 text-lg">
            <span className="font-semibold">Token ID：</span> {nftDetails.id}
          </p>
          <p className="mb-4 text-lg">
            <span className="font-semibold">NFT分类：</span> {nftDetails.class}
          </p>
          <p className="mb-4 text-lg">
            <span className="font-semibold">CID：</span> {nftDetails.CID}
          </p>
          <p className="mb-4 text-lg">
            <span className="font-semibold">NFT 介绍：</span> {nftDetails.description}
          </p>
          <p className="mb-4 text-lg font-semibold">
            NFT 推荐价格：<span className="text-green-500">{nftDetails.price} ETH</span>
          </p>
          <p className="mb-4 text-lg">
            <span className="font-semibold">NFT 所有者：</span> {nftDetails.owner}
          </p>
          <div className="flex flex-wrap gap-2">
            <h2 className="font-semibold mb-2">属性：</h2>
            {nftDetails.attributes.map((attr, index) => (
              <span
                key={index}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full shadow-sm border border-gray-200"
              >
                {attr.trait_type}: {attr.value}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 历史记录区域 */}
      <div className="mt-10">
        <h2 className="text-2xl font-semibold mb-4">历史交易记录</h2>
        {isLoadingTransfers ? (
          <div className="flex justify-center items-center">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : transferEvents.length === 0 ? (
          <p className="text-lg text-gray-500">没有找到该 NFT 的交易记录</p>
        ) : (
          <div className="overflow-x-auto shadow-lg">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th className="bg-primary">Block Number</th>
                  <th className="bg-primary">From</th>
                  <th className="bg-primary">To</th>
                  <th className="bg-primary">Transaction Hash</th>
                  <th className="bg-primary">Gas</th>
                  <th className="bg-primary">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {transferEvents.map((event, index) => (
                  <tr key={index}>
                    <td className="text-center">{event.block_number}</td>
                    <td>{event.from_address}</td>
                    <td>{event.to_address}</td>
                    <td>{event.transaction_hash}</td>
                    <td>{event.gas}</td>
                    {/* <td>{event.created_at}</td> */}
                    <td>{formatDate(event.created_at)}</td> {/* 格式化并显示时间 */}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default NFTDetails;
