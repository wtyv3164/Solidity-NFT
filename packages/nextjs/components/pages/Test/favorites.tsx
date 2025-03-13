"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Button, Pagination } from "antd";
import { useAccount } from "wagmi";
//import { Collectible } from "../allNFTs/page"; // 假设 AllNFTs.tsx 中也导出了 Collectible 类型
 interface Collectible {
    image: string;
    id: number;
    name: string;
    class: string;
    attributes: { trait_type: string; value: string }[];
    owner: string;
    price: string;
    description: string;
    CID: string;
  }

const Favorites: React.FC = () => {
  const { address: connectedAddress } = useAccount();
  const [favorites, setFavorites] = useState<number[]>([]);
  const [allNFTs, setAllNFTs] = useState<Collectible[]>([]);
  const [filteredNFTs, setFilteredNFTs] = useState<Collectible[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 2;

//   useEffect(() => {
//     // 从 localStorage 获取收藏的NFT ID
//     const storedFavorites = localStorage.getItem("favorites");
//     if (storedFavorites) {
//       setFavorites(JSON.parse(storedFavorites));
//     }

//     // 从 localStorage 获取所有NFT数据
//     const storedAllNFTs = localStorage.getItem("allNFTs");
//     if (storedAllNFTs) {
//       const nfts = JSON.parse(storedAllNFTs);
//       setAllNFTs(nfts);
//       setFilteredNFTs(nfts.filter((nft: Collectible) => favorites.includes(nft.id))); // 只展示收藏的NFT
//     }
//   }, [favorites]);
useEffect(() => {
  // 获取当前连接的用户地址
  const storedFavorites = localStorage.getItem(`favorites-${connectedAddress}`);
  
  if (storedFavorites) {
    setFavorites(JSON.parse(storedFavorites));  // 这里更新了 favorites
  } else {
    setFavorites([]);  // 如果没有找到当前账户的收藏数据，清空 favorites
  }

  // 从 localStorage 获取所有NFT数据
  const storedAllNFTs = localStorage.getItem("allNFTs");
  if (storedAllNFTs) {
    const nfts = JSON.parse(storedAllNFTs);
    setAllNFTs(nfts);
  }
}, [connectedAddress]);  // 添加依赖项，确保每次切换账户时更新

useEffect(() => {
  // 当 favorites 或 allNFTs 变化时，更新 filteredNFTs
  setFilteredNFTs(allNFTs.filter((nft: Collectible) => favorites.includes(nft.id)));
}, [favorites, allNFTs]);  // 确保当 favorites 或 allNFTs 变化时执行

  

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 取消收藏的处理函数
const handleRemoveFavorite = (id: number) => {
  setFavorites((prev) => {
    const updatedFavorites = prev.filter((favId) => favId !== id);  // 移除该NFT
    localStorage.setItem(`favorites-${connectedAddress}`, JSON.stringify(updatedFavorites));  // 更新localStorage
    return updatedFavorites;
  });
};


  // 分页后的数据
  const paginatedNFTs = filteredNFTs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl mb-4">我的收藏</h1>
      <div className="flex flex-wrap justify-center">
        {paginatedNFTs.length === 0 ? (
          <div className="text-2xl text-primary-content">您没有收藏任何NFT</div>
        ) : (
          paginatedNFTs.map((nft) => (
            <div key={nft.id} className="card card-compact bg-base-100 shadow-lg sm:min-w-[300px] shadow-secondary">
              <figure>
                <img src={nft.image} alt="NFT Image" className="h-80 min-w-full" />
              </figure>
              <div className="card-body">
                <h2 className="card-title">{nft.name}</h2>
                <p>{nft.description}</p>
                <div className="flex justify-between items-center">
                  <span>价格：{nft.price} ETH</span>
                  <Button type="default" onClick={() => handleRemoveFavorite(nft.id)}>
                    取消收藏
                  </Button>
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
  );
};

export default Favorites;