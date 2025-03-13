"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { useScaffoldContractWrite, useScaffoldContractRead } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { addToIPFS } from "~~/utils/simpleNFT/ipfs-fetch";
import { uploadToPinata } from "~~/components/simpleNFT/pinata";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useRouter } from "next/navigation";
import axios from 'axios';

interface NftInfo {
  image: string;
  id: number;
  name: string;
  class: string;
  attributes: { trait_type: string; value: string }[];
  owner: string;
  price: string;
  description: string;
  CID?: string;
}

const CreateNFTsPage: NextPage = () => {
  const router = useRouter();
  const { address: connectedAddress, isConnected, isConnecting } = useAccount();
  const [nftInfo, setNftInfo] = useState<NftInfo>({
    image: "",
    id: Date.now(),
    name: "",
    class: "",
    attributes: [],
    owner: connectedAddress || "",
    price: "",
    description: "",
  });
  const [images, setImages] = useState<File[]>([]);  // 支持多个文件
  const [uploadedIpfsPaths, setUploadedIpfsPaths] = useState<string[]>([]);  // 保存多个图片的IPFS路径
  const [loading, setLoading] = useState(false);
  const [batchCount, setBatchCount] = useState(1);  // 用于输入批量数量
  const [uris, setUris] = useState<string[]>([]); // 用于保存多个 URI

  const { writeAsync: mintBatch } = useScaffoldContractWrite({
    contractName: "YourCollectible",
    functionName: "mintBatch",
    args: [connectedAddress, []],  // 这里暂时为空，稍后填入uris
  });

  const { data: tokenIdCounter } = useScaffoldContractRead({
    contractName: "YourCollectible",
    functionName: "tokenIdCounter",
    watch: true,
    cacheOnBlock: true,
  });

  const handleNftInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNftInfo({
      ...nftInfo,
      [name]: name === "attributes" ? value.split(",").map((attr) => ({ trait_type: name, value: attr })) : value,
    });
  };

  const handleBatchCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = parseInt(e.target.value);
    setBatchCount(count);
    setUris(Array(count).fill(""));  // 更新uris数组，长度为输入的批量数量
    setUploadedIpfsPaths(Array(count).fill(""));  // 初始化uploadedIpfsPaths
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImages(Array.from(e.target.files));  // 保存多个图片文件
      setUploadedIpfsPaths(Array(e.target.files.length).fill(""));  // 初始化IPFS路径数组
    }
  };

  const handleIpfsUpload = async () => {
    if (images.length === 0) {
      notification.error("请选择要上传的图片");
      return;
    }

    setLoading(true);
    const notificationId = notification.loading("上传至IPFS中...");
    try {
      const uploadedItems = await Promise.all(
        images.map((image) => uploadToPinata(image))  // 批量上传图片
      );
      notification.remove(notificationId);
      notification.success("已上传到IPFS");

      const ipfsUrls = uploadedItems.map(item => `https://ipfs.io/ipfs/${item.IpfsHash}`);
      setUploadedIpfsPaths(ipfsUrls);  // 更新IPFS路径
      setUris(ipfsUrls);  // 根据上传的图片更新uris
    } catch (error) {
      notification.remove(notificationId);
      notification.error("上传IPFS出错");
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMintBatch = async () => {
    if (uris.some(uri => uri === "" || !uri.startsWith("https://ipfs.io/ipfs/"))) {
      notification.error("请提供有效的图片链接");
      return;
    }

    const notificationId = notification.loading("铸造NFT...");
    try {
      const uploadedItems = await Promise.all(
        uris.map(uri => addToIPFS({ ...nftInfo, image: uri }))
      );
      notification.remove(notificationId);
      notification.success("批量铸造NFT成功!");

      if (tokenIdCounter !== undefined) {
        await mintBatch({ args: [connectedAddress, uris] });

        // 保存每个NFT到本地存储
        const newNfts = uploadedItems.map((item, index) => {
          const newNftInfo = {
            ...nftInfo,
            id: Number(tokenIdCounter) + index + 1,
            owner: connectedAddress || "",
            CID: item.CID,
            image: uris[index],  // 每个NFT对应不同的图片
          };
          return newNftInfo;
        });

        const existingNFTs = JSON.parse(localStorage.getItem("createdNFTs") || "[]");
        localStorage.setItem("createdNFTs", JSON.stringify([...existingNFTs, ...newNfts]));
        console.log("批量铸造的NFT:", existingNFTs);

        // 循环保存多个NFT信息到数据库
        for (let i = 0; i < uploadedItems.length; i++) {
          const newNftInfo = {
            ...nftInfo,
            id: Number(tokenIdCounter) + i + 1,
            owner: connectedAddress || "",
            CID: uploadedItems[i].CID,
            image: uris[i],  // 每个NFT对应不同的图片
          };

          await axios.post('http://localhost:3001/nft', {
            tokenId: newNftInfo.id,
            image: newNftInfo.image,
            name: newNftInfo.name,
            attributes: newNftInfo.class,
            owner: newNftInfo.owner,
            price: newNftInfo.price,
            description: newNftInfo.description,
            cid: newNftInfo.CID,
          });

          console.log("创建的NFT数据:", newNftInfo);
        }

        notification.success("NFT信息已保存到数据库");
        router.push("/myNFT"); // 跳转到 myNFT 页面
      } else {
        notification.error("无法获取TokenIdCounter");
      }
    } catch (error) {
      notification.remove(notificationId);
      console.error("批量铸造失败", error);
      notification.error("批量铸造失败，请重试");
    }
  };

  return (
    <div className="flex justify-center mt-10">
      <div className="w-2/3 flex justify-between">
        <div className="w-1/2 pr-4">
          <h1 className="text-4xl font-bold mb-8">铸造NFT</h1>

          <div className="mb-4">
            <input
              type="text"
              name="name"
              placeholder="NFT 名称"
              className="border p-2 w-full mb-4"
              value={nftInfo.name}
              onChange={handleNftInfoChange}
            />
            <input
              type="text"
              name="class"
              placeholder="NFT 分类"
              className="border p-2 w-full mb-4"
              value={nftInfo.class}
              onChange={handleNftInfoChange}
            />
            <input
              type="text"
              name="attributes"
              placeholder="NFT 属性（用逗号分隔）"
              className="border p-2 w-full mb-4"
              value={nftInfo.attributes.map((attr) => attr.value).join(",")}
              onChange={handleNftInfoChange}
            />
            <input
              type="text"
              name="price"
              placeholder="NFT 价格"
              className="border p-2 w-full mb-4"
              value={nftInfo.price}
              onChange={handleNftInfoChange}
            />
            <input
              type="text"
              name="description"
              placeholder="NFT 描述"
              className="border p-2 w-full mb-4"
              value={nftInfo.description}
              onChange={handleNftInfoChange}
            />
          </div>

          <div className="flex justify-between">
            {!isConnected || isConnecting ? (
              <RainbowKitCustomConnectButton />
            ) : (
              <div>
                <input
                  type="number"
                  min={1}
                  value={batchCount}
                  onChange={handleBatchCountChange}
                  className="border p-2 w-24 mb-4"
                />
                <button
                  className="btn btn-primary"
                  onClick={handleMintBatch}
                >
                  批量铸造 NFT
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="w-1/2 pl-4">
          <h2 className="text-2xl font-semibold mb-4">上传图片到IPFS</h2>

          {images.length > 0 && uploadedIpfsPaths.every(path => path !== "") ? (
            images.map((image, index) => (
              <div key={index}>
                <img src={URL.createObjectURL(image)} alt={`Preview ${index}`} className="mb-4" />
                {uploadedIpfsPaths[index] && (
                  <img src={`https://ipfs.io/ipfs/${uploadedIpfsPaths[index]}`} alt={`Uploaded ${index}`} className="mb-4" />
                )}
              </div>
            ))
          ) : (
            <input type="file" multiple onChange={handleImageChange} className="mb-4" />
          )}

          <button
            onClick={handleIpfsUpload}
            disabled={loading}
            className="btn btn-primary"
          >
            上传至IPFS
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateNFTsPage;
