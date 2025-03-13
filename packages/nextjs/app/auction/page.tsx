"use client";

import { useState, useEffect } from "react";
import { Modal, Button, Input } from "antd";
import { useAccount } from "wagmi";
import { useScaffoldContractWrite } from "~~/hooks/scaffold-eth";
import { Address } from "~~/components/scaffold-eth";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";
import { notification } from "~~/utils/scaffold-eth";
import { Collectible } from "~~/components/simpleNFT";  // 导入你的NFT展示组件
import { useScaffoldContractRead } from "~~/hooks/scaffold-eth";

interface Auction {
    tokenId: number;
    seller: string;
    minBid: string;
    highestBid: string;
    highestBidder: string;
    endTime: number;
    isActive: boolean;
    image: string;  // 增加图片字段
}

const AuctionPage = () => {
    const router = useRouter();
    const { address: connectedAddress } = useAccount();
    const [auctions, setAuctions] = useState<Auction[]>([]);
    const [selectedNFT, setSelectedNFT] = useState<Collectible | null>(null);  // 存储选中的NFT
    const [isModalVisible, setIsModalVisible] = useState(false);  // 控制弹窗显示
    const [newAuction, setNewAuction] = useState({
        tokenId: 0,
        minBid: "",
        duration: "",
    });
    const [bidAmount, setBidAmount] = useState<string>("");
    const [currentTime, setCurrentTime] = useState(Date.now() / 1000);

    // 创建拍卖合约方法
    const { writeAsync: startAuction } = useScaffoldContractWrite({
        contractName: "YourCollectible",
        functionName: "startAuction",
        args: [0n, 0n, 0n, 0n],
    });

    // 出价合约方法
    const { writeAsync: placeBid } = useScaffoldContractWrite({
        contractName: "YourCollectible",
        functionName: "placeBid",
        args: [0n, "", 0n],
    });

    // 结束拍卖合约方法
    const { writeAsync: endAuction } = useScaffoldContractWrite({
        contractName: "YourCollectible",
        functionName: "endAuction",
        args: [0n, 0n],
    });

     // 获取当前时间戳（从智能合约中获取）
     const { data: currentTimestamp } = useScaffoldContractRead({
        contractName: "YourCollectible",
        functionName: "getCurrentTimestamp",
    });
    
    //const currentBlockTime = Number(currentTimestamp);  // 如果从合约获取的时间戳为空，则使用当前时间



    // // 定时刷新当前时间
    // useEffect(() => {
    //     const timer = setInterval(() => setCurrentTime(Math.floor(Date.now() / 1000)), 1000);
    //     return () => clearInterval(timer);
    // }, []);

     // 将合约返回的时间戳设置为当前时间


    // 每秒刷新当前时间
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(Math.floor(Date.now() / 1000)); // 刷新当前时间戳
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // 使用智能合约时间戳初始化 currentTime
    useEffect(() => {
        if (currentTimestamp) {
            setCurrentTime(Number(currentTimestamp)); // 使用合约的时间戳替换当前时间
        }
    }, [currentTimestamp]);

    // 获取当前用户铸造的NFT
    //   const getUserNFTs = () => {
    //     const createdNFTs = JSON.parse(localStorage.getItem("createdNFTs") || "[]");
    //     return createdNFTs.filter((nft: Collectible) => nft.owner === connectedAddress);
    //   };
    const getUserNFTs = () => {
        if (typeof window !== "undefined") {
            const createdNFTs = JSON.parse(localStorage.getItem("createdNFTs") || "[]");
            return createdNFTs.filter((nft: Collectible) => nft.owner === connectedAddress);
        }
        return []; // 如果没有在浏览器环境中，返回一个空数组
    };

    // 读取拍卖数据（模拟数据，从 localStorage 获取）
    useEffect(() => {
        const storedAuctions = localStorage.getItem("auctions");
        if (storedAuctions) {
            setAuctions(JSON.parse(storedAuctions));
        }
    }, []);

    // 保存拍卖数据到 localStorage
    const saveAuctions = (updatedAuctions: Auction[]) => {
        localStorage.setItem("auctions", JSON.stringify(updatedAuctions));
        setAuctions(updatedAuctions);
    };

    // 启动拍卖
    const handleStartAuction = async () => {
        const { tokenId, minBid, duration } = newAuction;

        // 打印检查
        console.log("Selected NFT:", selectedNFT);
        console.log("New Auction:", newAuction);

        if (!tokenId || !minBid || !duration) {
            notification.error("请填写完整的拍卖信息！");
            return;
        }

        const notificationId = notification.loading("启动拍卖中...");
        try {
            await startAuction({
                args: [
                    BigInt(tokenId),
                    BigInt(ethers.parseUnits(Number(minBid).toString(), "ether")),  // 确保 minBid 转换为正确的以太坊单位
                    BigInt(currentTime),
                    BigInt(duration),
                ],
            });
            notification.success("拍卖启动成功！");

            const newAuctionData: Auction = {
                tokenId: tokenId,
                seller: connectedAddress || "",
                minBid: minBid || "",
                highestBid: "0", // 确保初始化时有默认值
                highestBidder: "",
                endTime: Math.floor(currentTime) + Number(duration),  // 使用合约获取的时间戳
                //endTime: Math.floor(currentTime) + Number(duration),  // 以秒为单位存储
                isActive: true,
                image: selectedNFT?.image || "",  // 保存图片信息
            };
            console.log("启动拍卖时的数据,New Auction Data:", newAuctionData); // 打印新拍卖数据
            saveAuctions([...auctions, newAuctionData]);

        } catch (error) {
            console.error(error);
            notification.error("启动拍卖失败，请重试！");
        } finally {
            notification.remove(notificationId);
        }
    };



    // 出价
    const handlePlaceBid = async (auction: Auction) => {
        // 如果 highestBid 是空字符串，则设置为 "0"
        const highestBid = auction.highestBid || "0";  // 默认值 "0" 替换空字符串

        console.log("当前最低出价: ", auction.minBid);
        console.log("当前最高出价: ", highestBid);
        console.log("出价金额为：", bidAmount);

        // 确保出价转换为 wei 单位
        const bidAmountInWei = ethers.parseUnits(bidAmount, "ether");  // 转换为 Wei 单位
        const minBidInWei = ethers.parseUnits(auction.minBid, "ether");
        const highestBidInWei = ethers.parseUnits(highestBid, "ether");

        console.log("出价金额（Wei）: ", bidAmountInWei);
        console.log("最低出价（Wei）: ", minBidInWei);
        console.log("当前最高出价（Wei）: ", highestBidInWei);

        // 比较出价是否高于最低出价和当前最高出价
        if (bidAmountInWei <= minBidInWei) {
            notification.error("出价必须高于最低出价！");
            return;
        }

        if (bidAmountInWei <= highestBidInWei) {
            notification.error("出价必须高于当前最高出价！");
            return;
        }

        const notificationId = notification.loading("出价中...");
        try {
            // 调用 placeBid 函数，传递 tokenId 和 buyer 地址
            await placeBid({
                args: [BigInt(auction.tokenId), connectedAddress, BigInt(currentTime)],
                value: bidAmountInWei,  // 传递出价金额（以 Wei 为单位）
            });

            notification.success("出价成功！");

            // 更新拍卖信息
            const updatedAuctions = auctions.map((a) =>
                a.tokenId === auction.tokenId
                    ? { ...a, highestBid: bidAmount.toString(), highestBidder: connectedAddress || "" }  // 确保 highestBid 是字符串
                    : a
            );

            saveAuctions(updatedAuctions);
        } catch (error) {
            console.error(error);
            notification.error("出价失败，请重试！");
        } finally {
            notification.remove(notificationId);
        }
    };




    // 结束拍卖
    const handleEndAuction = async (auction: Auction) => {

        console.log("当前时间:", currentTime);
        //console.log("调用区块链方法获取到的当前时间戳", currentBlockTime);
        console.log("拍卖结束时间:", auction.endTime);
        
        

        // const blockTimestamp = (await provider.getBlock("latest")).timestamp;  // 获取当前区块时间戳
        // console.log("Current block timestamp:", blockTimestamp);


        if (currentTime < auction.endTime) {
            notification.error("拍卖尚未结束！");
            console.log("当前时间小于结束时间，无法结束拍卖");
            console.log("当前时间:", currentTime);
            console.log("拍卖结束时间:", auction.endTime);
            return;
        }

        const notificationId = notification.loading("结束拍卖中...");
        try {
            await endAuction({
                args: [BigInt(auction.tokenId), BigInt(currentTime)],
            });
            notification.success("拍卖已成功结束！");

            // 更新拍卖状态
            const updatedAuctions = auctions.map((a) =>
                a.tokenId === auction.tokenId ? { ...a, isActive: false } : a
            );
            saveAuctions(updatedAuctions);

            //   // 更新本地存储中的NFT数据，将NFT的所有者更新为最高出价者
            // const updatedNFTs = getUserNFTs().map((nft: Collectible) => {
            //     if (nft.id === auction.tokenId) {
            //       return {
            //         ...nft,
            //         owner: auction.highestBidder || "",  // 将NFT的所有者设置为出价最高者
            //       };
            //     }
            //     return nft;
            //   });

            //   // 保存更新后的NFT数据
            //   if (typeof window !== "undefined") {
            //     localStorage.setItem("createdNFTs", JSON.stringify(updatedNFTs));
            //   }
            //获取用户当前拥有的所有NFT
            // const userNFTs = getUserNFTs();

            // // 结束拍卖时，更新NFT的拥有者并确保不覆盖原数据
            // const updatedNFTs = userNFTs.map((nft: Collectible) => {
            //     if (nft.id === auction.tokenId) {
            //         return {
            //             ...nft,
            //             owner: auction.highestBidder || "",  // 设置NFT所有者为最高出价者
            //         };
            //     }
            //     return nft;
            // });

            // // 确保更新后的NFT数据被正确存储到 localStorage 中
            // if (typeof window !== "undefined") {
            //     localStorage.setItem("createdNFTs", JSON.stringify(updatedNFTs));
            // }

            // console.log("当前NFT列表:", userNFTs);  // 查看当前拥有的NFT
            // console.log("更新后的NFT列表:", updatedNFTs);  // 查看更新后的NFT列表
            // 在 createdNFTs 数组中找到对应的 NFT 并更新其 Owner
            //   const storedCreatedNFTs = localStorage.getItem("createdNFTs");
            //   const createdNFTs = storedCreatedNFTs ? JSON.parse(storedCreatedNFTs) : [];
            //   const updatedCreatedNFTs = createdNFTs.map((nft: Collectible) =>
            //     nft.id === selectedNFT?.id ? { ...nft, owner: auction.highestBidder } : nft
            //   );
            //   localStorage.setItem("createdNFTs", JSON.stringify(updatedCreatedNFTs));

            // 在 createdNFTs 数组中找到对应的 NFT 并更新其 Owner
            const storedCreatedNFTs = localStorage.getItem("createdNFTs");
            const createdNFTs = storedCreatedNFTs ? JSON.parse(storedCreatedNFTs) : [];
            const updatedCreatedNFTs = createdNFTs.map((nft: Collectible) =>
                nft.id === auction.tokenId ? { ...nft, owner: auction.highestBidder } : nft
            );
            localStorage.setItem("createdNFTs", JSON.stringify(updatedCreatedNFTs));



        } catch (error) {
            console.error(error);
            notification.error("结束拍卖失败，请重试！");
        } finally {
            notification.remove(notificationId);
        }
    };


    const handleNFTSelection = (nft: Collectible) => {
        setSelectedNFT(nft);
        setNewAuction({ ...newAuction, tokenId: nft.id });
        setIsModalVisible(false);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold mb-6">限时拍卖</h1>

            {/* 选择铸造的NFT */}
            <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">选择你铸造的NFT</h2>
                <Button onClick={() => setIsModalVisible(true)}>选择NFT</Button>
            </div>

            {/* 显示NFT选择弹窗 */}
            <Modal
                title="选择NFT"
                visible={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
            >
                {getUserNFTs().map((nft: Collectible) => (
                    <div key={nft.id} className="mb-4 cursor-pointer" onClick={() => handleNFTSelection(nft)}>
                        <img src={nft.image} alt={nft.name} width={100} height={100} />
                        <p>{nft.name}</p>
                    </div>
                ))}
            </Modal>

            {/* 创建拍卖 */}
            {selectedNFT && (
                <div className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">创建拍卖</h2>
                    <Input
                        type="number"
                        value={selectedNFT.id}
                        disabled
                        className="mb-4"
                    />
                    <Input
                        type="text"
                        placeholder="最低出价 (ETH)"
                        value={newAuction.minBid}
                        onChange={(e: any) => setNewAuction({ ...newAuction, minBid: e.target.value })}
                        className="mb-4"
                    />
                    <Input
                        type="number"
                        placeholder="拍卖持续时间 (秒)"
                        value={newAuction.duration}
                        onChange={(e: any) => setNewAuction({ ...newAuction, duration: e.target.value })}
                        className="mb-4"
                    />
                    <Button onClick={handleStartAuction}>启动拍卖</Button>
                </div>
            )}

            {/* 当前拍卖 */}
            <div>
                <h2 className="text-2xl font-semibold mb-4">当前拍卖</h2>
                {auctions.length === 0 ? (
                    <p>暂无拍卖</p>
                ) : (
                    auctions.map((auction) => (
                        //<div key={auction.tokenId} className="border p-4 mb-4">
                        <div key={`${auction.tokenId}-${auction.seller}`} className="border p-4 mb-4">
                            <img src={auction.image} alt={`NFT #${auction.tokenId}`} width={100} height={100} onClick={() => router.push(`/NFTDetails/${auction.tokenId}`)}/>
                            <p>Token ID: {auction.tokenId}</p>
                            <p>最低出价: {auction.minBid} ETH</p>
                            <p>最高出价: {auction.highestBid} ETH</p>
                            <p>最高出价者: {auction.highestBidder || "暂无"}</p>
                            <p>剩余时间: {Math.max(0, Number(auction.endTime) - currentTime)} 秒</p>
                            <Input
                                type="text"
                                placeholder="出价金额 (ETH)"
                                value={bidAmount}
                                onChange={(e: any) => setBidAmount(e.target.value)}
                                className="mb-2"
                            />
                            <Button type="primary" onClick={() => handlePlaceBid(auction)} className="mr-2">
                                出价
                            </Button>
                            {auction.seller === connectedAddress && auction.isActive && (
                                <Button type="danger" onClick={() => handleEndAuction(auction)}>
                                    结束拍卖
                                </Button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AuctionPage;
