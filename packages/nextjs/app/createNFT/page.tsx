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

const CreateNFTPage: NextPage = () => {
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
  const [image, setImage] = useState<File | null>(null);
  const [uploadedIpfsPath, setUploadedIpfsPath] = useState("");
  const [loading, setLoading] = useState(false);

  const { writeAsync: mintItem } = useScaffoldContractWrite({
    contractName: "YourCollectible",
    functionName: "mintItem",
    args: [connectedAddress, ""],
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

  // const handleNftInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const { name, value } = e.target;
  //   setNftInfo({
  //     ...nftInfo,
  //     [name]: name === "attributes" ? value.split(",").map((attr) => ({ trait_type: name, value: attr })) : value,
  //   });
  // };
  

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImage(e.target.files[0]);
    }
  };

  const handleIpfsUpload = async () => {
    if (!image) {
      notification.error("请选择要上传的图片");
      return;
    }

    setLoading(true);
    const notificationId = notification.loading("上传至IPFS中...");
    try {
      const imageUploadedItem = await uploadToPinata(image);
      notification.remove(notificationId);
      notification.success("已上传到IPFS");

       // 设置完整的 IPFS URL，而不是 CID
    const ipfsUrl = `https://ipfs.io/ipfs/${imageUploadedItem.IpfsHash}`;
    setUploadedIpfsPath(imageUploadedItem.IpfsHash); // CID 备用存储
    setNftInfo({ ...nftInfo, image: ipfsUrl }); // 设置完整 URL

      // setUploadedIpfsPath(imageUploadedItem.IpfsHash);
      // setNftInfo({ ...nftInfo, image: imageUploadedItem.IpfsHash });
    } catch (error) {
      notification.remove(notificationId);
      notification.error("上传IPFS出错");
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMintItem = async () => {
    const { image, id, name, attributes, owner, price, description } = nftInfo;
    // if (image === "") {
    //   notification.error("请提供图片链接");
    //   return;
    // }
    if (image === "" || !image.startsWith("https://ipfs.io/ipfs/")) {
      notification.error("请提供有效的图片链接");
      return;
    }

    const notificationId = notification.loading("上传至IPFS中...");
    try {
      const uploadedItem = await addToIPFS({ image, id, name, attributes, owner, price, description }); 
      notification.remove(notificationId);
      notification.success("数据已上传到IPFS中");

      if (tokenIdCounter !== undefined) {
        //调用铸造NFT方法
        await mintItem({
          args: [connectedAddress, uploadedItem.path],
        });
        //这是tokenId
        const newId = Number(tokenIdCounter) + 1;
        const newNftInfo: NftInfo = {
          ...nftInfo,
          id: newId,
          owner: connectedAddress || "",
          CID: uploadedItem.CID,
        };

        //将信息传入数据库中
        await axios.post('http://localhost:3001/saveNFT', {
          tokenId: newId,
          category: 'monkey',
          address: connectedAddress,
          cid: uploadedItem.CID,
          status: '未上架',
          leaseStatus: '未租赁',
          price: 0,     
        });

        // 调用后端 API，将 NFT 数据存入数据库
      await axios.post('http://localhost:3001/nft', {
        tokenId: newNftInfo.id,
        image: newNftInfo.image,
        name: newNftInfo.name,
        attributes: newNftInfo.class,
        owner: newNftInfo.owner,
        price: newNftInfo.price,
        description: newNftInfo.description,
        cid: newNftInfo.CID, // 传 IPFS CID
      });
 
      console.log("createNFT中newNFTInfo数据:", newNftInfo);


        // 更新 localStorage 中的 NFTs
        const storedNFTs = localStorage.getItem("createdNFTs");
        const existingNFTs = storedNFTs ? JSON.parse(storedNFTs) : [];
        const updatedNFTs = [...existingNFTs, newNftInfo];
        localStorage.setItem("createdNFTs", JSON.stringify(updatedNFTs));

        console.log("Updated NFTs in localStorage:", JSON.parse(localStorage.getItem("createdNFTs") || "[]"));

        notification.success("NFT铸造成功!");
        router.push("/myNFT"); // 铸造成功后跳转到 myNFT 页面
      } else {
        notification.error("无法获取TokenIdCounter");
      }
    } catch (error) {
      notification.remove(notificationId);
      console.error("上传IPFS出错: ", error);
    }
  };

  // const handleMint = async () => {
  //   try {
  //     await mintItem();
  //     const newTokenId = tokenIdCounter?.toString();
  //     if (newTokenId) {
  //       const nftDetails = { cid: '', category: '', address: connectedAddress, tokenId: newTokenId };
  //       setMintedNFTDetails(nftDetails);
  //       message.success('NFT铸造成功!');
  //       await axios.post('http://localhost:3001/saveNFT', {
  //         tokenId: Number(newTokenId) + 1,
  //         category: nftDetails.category,
  //         address: nftDetails.address,
  //         cid: nftDetails.cid,
  //         status: '未上架',
  //         leaseStatus: '未租赁',
  //         price: 0,     
  //       });

  //       message.success('NFT信息已保存到数据库中');
  //       setCurrentTokenId(newTokenId);
  //       setShowListNFT(true);
  //       window.location.reload();
  //     }else {
  //       message.error('无法获取新的 tokenId');
  //     }
  //   } catch (error) {
  //     console.error('铸造失败', error);
  //     message.error("铸造失败，请重试");
  //   }
  // }

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
              <button
                className="btn btn-primary"
                onClick={handleMintItem}
              >
                铸造 NFT
              </button>
            )}
          </div>
        </div>

        <div className="w-1/2 pl-4">
          <h2 className="text-2xl font-semibold mb-4">上传图片到IPFS</h2>

          {image && !loading && (
            <div className="mb-4">
              <h3 className="font-medium">图片预览</h3>
              <img
                src={URL.createObjectURL(image)}
                alt="NFT Preview"
                className="mt-2 w-full max-w-[300px] h-auto mx-auto"
              />
            </div>
          )}

          <input
            type="file"
            onChange={handleImageChange}
            className="border p-2 w-full"
            accept="image/*"
          />
          <button
            className={`btn btn-secondary mt-4 ${loading ? "loading" : ""}`}
            disabled={loading}
            onClick={handleIpfsUpload}
          >
            {loading ? "上传中..." : "上传到IPFS"}
          </button>

          {uploadedIpfsPath && (
            <div className="mt-4">
              <a
                href={`https://ipfs.io/ipfs/${uploadedIpfsPath}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600"
              >
                查看上传的图片
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateNFTPage;