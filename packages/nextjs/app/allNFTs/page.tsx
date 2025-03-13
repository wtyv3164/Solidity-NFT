"use client";

import { useState, useEffect } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { Modal, Button, notification, Pagination, Input } from "antd";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldContractWrite } from "~~/hooks/scaffold-eth";
import { ethers } from "ethers";
import { useRouter } from "next/navigation";

export interface Collectible {
  image: string;
  id: number;
  name: string;
  class: string;
  attributes: { trait_type: string; value: string }[];
  owner: string;
  description: string;
  CID: string;
}

interface ListedNftInfo {
  id: number;
  price: string;
}

const AllNFTs: NextPage = () => {
  const router = useRouter();
  const { address: connectedAddress } = useAccount();
  const [allNFTs, setAllNFTs] = useState<Collectible[]>([]);
  const [listedNFTs, setListedNFTs] = useState<ListedNftInfo[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNft, setSelectedNft] = useState<Collectible | null>(null);
  const [buyerAddresses, setBuyerAddresses] = useState<{ [key: number]: string }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [filteredNFTs, setFilteredNFTs] = useState<Collectible[]>([]);
  const itemsPerPage = 2;
  // 添加新功能
  const [filterClass, setFilterClass] = useState(""); // 筛选分类
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]); // 价格区间筛选
  const [favorites, setFavorites] = useState<number[]>([]); // 收藏NFT的ID列表
  const [reportReason, setReportReason] = useState(""); // 举报理由
  const [isReportModalOpen, setIsReportModalOpen] = useState(false); // 举报模态框
  const [reportingNft, setReportingNft] = useState<Collectible | null>(null);


  // const { writeAsync: purchase } = useScaffoldContractWrite({
  //   contractName: "YourCollectible",
  //   functionName: "purchase",
  //   args: [0n, '', '', 0n, 0n], // 初始默认参数
  // });

  const { writeAsync: buyNFT } = useScaffoldContractWrite({
    contractName: "YourCollectible",
    functionName: "buyNFT",
    args: [0n, 0n], // 初始默认参数
  });
  

  useEffect(() => {
    const storedAllNFTs = localStorage.getItem("allNFTs");
    const storedListedNFTs = localStorage.getItem("listedNFTs");
    if (storedAllNFTs) {
      const nfts = JSON.parse(storedAllNFTs);
      setAllNFTs(nfts);
      setFilteredNFTs(nfts);
    }
    if (storedListedNFTs) {
      const listed = JSON.parse(storedListedNFTs);
      setListedNFTs(listed);
    }
  }, []);

  // --------
  // useEffect(() => {
  //   const storedFavorites = localStorage.getItem("favorites");
  //   if (storedFavorites) {
  //     setFavorites(JSON.parse(storedFavorites));
  //   }
  // }, []);
  //收藏
  useEffect(() => {
    // 从 localStorage 获取当前用户的收藏NFT ID
    const storedFavorites = localStorage.getItem(`favorites-${connectedAddress}`);
    if (storedFavorites) {
      setFavorites(JSON.parse(storedFavorites));  // 这里更新了 favorites
    }
  }, [connectedAddress]);  // 当地址变化时重新加载收藏


  const handleSearch = (value: string) => {
    setSearchText(value);
    if (value.trim() === "") {
      setFilteredNFTs(allNFTs);
    } else {
      const filtered = allNFTs.filter((nft) =>
        nft.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredNFTs(filtered);
      setCurrentPage(1); // 重置到第一页
    }
  };

  useEffect(() => {
    const filtered = allNFTs.filter((nft) =>
      nft.name.toLowerCase().includes(searchText.toLowerCase())
    );
    setFilteredNFTs(filtered);
    setCurrentPage(1); // 重置到第一页
  }, [searchText, allNFTs]);

  const openModal = (nft: Collectible) => {
    setSelectedNft(nft);
    setIsModalOpen(true);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getPriceById = (id: number) => {
    const listedNft = listedNFTs.find(nft => nft.id === id);
    return listedNft ? listedNft.price : "N/A";
  };

  const handlePurchase = async () => {
    if (!selectedNft || !buyerAddresses[selectedNft.id]) return;

    try {
      const price = getPriceById(selectedNft.id);
      const value = ethers.parseUnits(price, "ether"); // 价格转换为wei
      // await purchase({
      //   args: [BigInt(selectedNft.id), selectedNft.owner, buyerAddresses[selectedNft.id], value, BigInt(1)],
      //   value, // 直接传递value参数
      // });
      await buyNFT({
        args: [BigInt(selectedNft.id), value],
         value, // 直接传递value参数
      });
      notification.success({ message: "购买成功" });

      // 删除 allNFTs 中的对应 NFT 信息
      const updatedAllNFTs = allNFTs.filter((nft) => nft.id !== selectedNft.id);
      setAllNFTs(updatedAllNFTs);
      localStorage.setItem("allNFTs", JSON.stringify(updatedAllNFTs));

      // 删除 listedNFTs 中的对应 NFT 信息
      const updatedListedNFTs = listedNFTs.filter((nft) => nft.id !== selectedNft.id);
      setListedNFTs(updatedListedNFTs);
      localStorage.setItem("listedNFTs", JSON.stringify(updatedListedNFTs));

      // 在 createdNFTs 数组中找到对应的 NFT 并更新其 Owner
      const storedCreatedNFTs = localStorage.getItem("createdNFTs");
      const createdNFTs = storedCreatedNFTs ? JSON.parse(storedCreatedNFTs) : [];
      const updatedCreatedNFTs = createdNFTs.map((nft: Collectible) =>
        nft.id === selectedNft.id ? { ...nft, owner: buyerAddresses[selectedNft.id] } : nft
      );
      localStorage.setItem("createdNFTs", JSON.stringify(updatedCreatedNFTs));

      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      notification.error({ message: "购买失败" });
    }
  };

  const handleBuyerAddressChange = (id: number, address: string) => {
    setBuyerAddresses(prevAddresses => ({
      ...prevAddresses,
      [id]: address,
    }));
  };


  //添加新功能------------------------------------------------------------
  // 更新筛选结果
  const handleFilter = () => {
    let filtered = allNFTs.filter((nft) => {
      const withinClass = !filterClass || nft.class === filterClass;
      const withinPrice =
        parseFloat(getPriceById(nft.id)) >= priceRange[0] &&
        parseFloat(getPriceById(nft.id)) <= priceRange[1];
      return withinClass && withinPrice;
    });
    setFilteredNFTs(filtered);
  };

  // 收藏NFT
  const handleFavorite = (id: number) => {
    setFavorites((prev) => {
      const updatedFavorites = prev.includes(id)
        ? prev.filter((favId) => favId !== id)  // 移除
        : [...prev, id];  // 添加
      
      // 将收藏ID与账户地址绑定存储
      localStorage.setItem(`favorites-${connectedAddress}`, JSON.stringify(updatedFavorites));
      return updatedFavorites;
    });
  };
  
  // const handleFavorite = (id: number) => {
  //   if (!connectedAddress) return;  // 确保只有在账户已连接时才执行
  
  //   setFavorites((prev) => {
  //     const updatedFavorites = prev.includes(id)
  //       ? prev.filter((favId) => favId !== id)  // 移除
  //       : [...prev, id];  // 添加
      
  //     // 将收藏ID与账户地址绑定存储
  //     localStorage.setItem(`favorites-${connectedAddress}`, JSON.stringify(updatedFavorites));
  //     return updatedFavorites;
  //   });
  // };
  

  // 举报NFT
  const openReportModal = (nft: Collectible) => {
    setReportingNft(nft);
    setReportReason("");
    setIsReportModalOpen(true);
  };

  const submitReport = () => {
    if (!reportingNft || !reportReason.trim()) return;
    notification.success({ message: "举报成功", description: "感谢您的反馈，我们将尽快处理！" });
    setIsReportModalOpen(false);
  };

  // 分页后的数据----------------------------------------
  const paginatedNFTs = filteredNFTs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      <div className="flex items-center flex-col pt-10">
        <div className="px-5">
          <h1 className="text-center mb-8">
            <span className="block text-4xl font-bold">NFT市场</span>
          </h1>
          <div className="flex justify-center mb-8">
            <Input.Search
              placeholder="输入NFT名称"
              value={searchText}
              onChange={(e: any) => setSearchText(e.target.value)}
              onSearch={handleSearch}
              enterButton
              style={{ width: 400 }}
            />
          </div>
          {/* 新功能 */}
          <div className="flex justify-center mb-8 space-x-4">
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="select select-bordered"
            >
              <option value="">所有分类</option>
              <option value="漫彩">漫彩</option>
              <option value="animal">动物</option>
              <option value="Music">音乐</option>
            </select>
            <div className="flex items-center space-x-2">
              <span>价格区间：</span>
              <Input
                type="number"
                value={priceRange[0]}
                onChange={(e: any) => setPriceRange([+e.target.value, priceRange[1]])}
                placeholder="最低价"
                className="input input-bordered w-24"
              />
              <span>-</span>
              <Input
                type="number"
                value={priceRange[1]}
                onChange={(e: any) => setPriceRange([priceRange[0], +e.target.value])}
                placeholder="最高价"
                className="input input-bordered w-24"
              />
            </div>
            <Button type="primary" onClick={handleFilter}>
              筛选
            </Button>
          </div>

        </div>
      </div>

      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-center">
          {paginatedNFTs.length === 0 ? (
            <div className="text-2xl text-primary-content">暂无在售NFT</div>
          ) : (
            paginatedNFTs.map((nft) => (
              <div
                key={nft.id}
                className="card card-compact bg-base-100 shadow-lg sm:min-w-[300px] shadow-secondary"
                style={{ margin: "1rem" }}
              >
                {/* <figure className="relative">
                  <img
                    src={nft.image}
                    alt="NFT Image"
                    className="h-80 min-w-full"
                  />
                  <figcaption className="glass absolute bottom-4 left-4 p-4 w-25 rounded-xl">
                    <span className="text-white"># {nft.id}</span>
                  </figcaption>
                </figure> */}
                <figure className="relative" onClick={() => router.push(`/NFTDetails/${nft.id}`)}>
                  <img src={nft.image} alt="NFT Image" className="h-80 min-w-full" />
                  <figcaption className="glass absolute bottom-4 left-4 p-4 w-25 rounded-xl">
                    <span className="text-white"># {nft.id}</span>
                  </figcaption>
                </figure>

                <div className="card-body space-y-3">
                  <div className="flex items-center justify-center">
                    <p className="text-xl p-0 m-0 font-semibold">NFT名称：{nft.name}</p>
                    <div className="flex flex-wrap space-x-2 mt-1">
                      {nft.attributes.map((attr, index) => (
                        <span key={index} className="badge badge-primary py-3">
                          {attr.trait_type}: {attr.value}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col justify-center mt-1">
                    <p className="my-0 text-lg">描述：{nft.description}</p>
                  </div>
                  <div className="flex flex-col justify-center mt-1">
                    <p className="my-0 text-lg">分类：{nft.class}</p>
                  </div>
                  <div className="flex space-x-3 mt-1 items-center">
                    <span className="text-lg font-semibold">发布者 : </span>
                    <Address address={nft.owner} />
                  </div>
                  {nft.CID && (
                    <div className="flex space-x-3 mt-1 items-center">
                      <span className="text-lg font-semibold">CID : </span>
                      <span>{nft.CID}</span>
                    </div>
                  )}
                  <div className="flex flex-col my-2 space-y-1">
                    <span className="text-lg font-semibold mb-1">购买账户地址: </span>
                    <Input
                      type="text"
                      placeholder="请填写您的账户地址"
                      className="input input-bordered w-full"
                      value={buyerAddresses[nft.id] || ""}
                      onChange={(e: any) => handleBuyerAddressChange(nft.id, e.target.value)}
                    />
                  </div>
                  <div className="flex space-x-3 mt-1 items-center">
                    <span className="text-lg font-semibold">价格：{getPriceById(nft.id)} ETH </span>
                  </div>
                  <div className="card-actions justify-end">
                    <Button
                      type="primary"
                      className="btn btn-secondary btn-md px-8 tracking-wide"
                      onClick={() => openModal(nft)}
                      style={{ margin: "0px auto" }}
                    >
                      购买
                    </Button>
                    {/* 添加功能按钮 */}
                    <div className="card-actions justify-between">
                      <Button
                        type="default"
                        onClick={() => handleFavorite(nft.id)}
                        className="btn"
                      >
                        {favorites.includes(nft.id) ? "取消收藏" : "收藏"}
                      </Button>
                      <Button
                        danger
                        onClick={() => openReportModal(nft)}
                        className="btn"
                      >
                        举报
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <Pagination
          current={currentPage}
          pageSize={itemsPerPage}
          total={filteredNFTs.length}
          onChange={handlePageChange}
          style={{ marginTop: "2rem", textAlign: "center" }}
        />
      </div>

      <Modal
        title="确认购买"
        visible={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsModalOpen(false)}>
            取消
          </Button>,
          <Button
            key="confirm"
            type="primary"
            onClick={handlePurchase}
          >
            确认购买
          </Button>,
        ]}
      >
        {selectedNft && (
          <div>
            <p>您将购买以下NFT：</p>
            <p>名称: {selectedNft.name}</p>
            <p>价格: {getPriceById(selectedNft.id)} ETH</p>
          </div>
        )}
      </Modal>

      {/* 添加------------------------------------------------------------------ */}
      {/* 举报模态框。 */}
      <Modal
        title="举报NFT"
        visible={isReportModalOpen}
        onCancel={() => setIsReportModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsReportModalOpen(false)}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={submitReport}>
            提交举报
          </Button>,
        ]}
      >
        {reportingNft && (
          <>
            <p>您正在举报的NFT: {reportingNft.name}</p>
            <Input.TextArea
              rows={4}
              placeholder="请填写举报原因"
              value={reportReason}
              onChange={(e: any) => setReportReason(e.target.value)}
            />
          </>
        )}
      </Modal>

    </>
  );
};

export default AllNFTs;
