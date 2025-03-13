"use client";

import { useState, useEffect } from "react";
import { Modal, Button, Input } from "antd";
import { useAccount } from "wagmi";
import { useScaffoldContractWrite, useScaffoldContractRead, useScaffoldEventHistory, useScaffoldEventSubscriber } from "~~/hooks/scaffold-eth";
import { ethers } from "ethers";
import { notification } from "~~/utils/scaffold-eth";
import { Collectible } from "~~/components/simpleNFT"; // 导入你的NFT类型

const MysteryBoxPage = () => {
    const { address: connectedAddress } = useAccount();
    const [mysteryBoxPrice, setMysteryBoxPrice1] = useState<string>("0.1"); // 默认盲盒价格
    const [userNFTs, setUserNFTs] = useState<Collectible[]>([]); // 用户铸造的NFT
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedNFTs, setSelectedNFTs] = useState<Collectible[]>([]); // 存储选中的NFT列表
    const [purchasedTokenId, setPurchasedTokenId] = useState<BigInt | null>(null);
    const [currentTime, setCurrentTime] = useState(Date.now() / 1000);
    const [BuyerAddress, setBuyerAddress] = useState("");
    //const [availableTokens, setAvailableTokens] = useState<BigInt[]>([]); // 用于存储盲盒剩余的NFT列表
    const [availableTokens, setAvailableTokens] = useState<BigInt[]>([]); // 用于存储盲盒剩余的NFT列表
    const [isAvailableTokensModalVisible, setIsAvailableTokensModalVisible] = useState(false); // 控制剩余NFT模态框显示

    // 读取盲盒价格
    const { data: currentMysteryBoxPrice } = useScaffoldContractRead({
        contractName: "YourCollectible",
        functionName: "mysteryBoxPrice",
    });

    // 购买盲盒合约方法
    const { writeAsync: buyMysteryBox } = useScaffoldContractWrite({
        contractName: "YourCollectible",
        functionName: "buyMysteryBox",
        args: [0n],
    });

    useScaffoldEventSubscriber({
        contractName: "YourCollectible",
        eventName: "MysteryBoxPurchased",
        listener: (logs) => {
            // 处理事件中的数据
            logs.forEach((log) => {
                const { tokenId, buyer } = log.args;
                console.log("监听事件获取到的tokeId", tokenId);
                console.log("监听事件获取到的buyer", buyer);
                // 更新状态
                //setPurchasedTokenId(BigInt(tokenId)); // 转为字符串，方便展示
                // 如果 tokenId 不是 undefined，转换为 BigInt 并设置状态
                if (tokenId !== undefined) {
                    setPurchasedTokenId(BigInt(tokenId.toString())); // 确保 tokenId 是 BigInt 类型           
                }

                if (buyer !== undefined) {
                    setBuyerAddress(buyer);
                }


            });
        },
    });



    // const { data:  buyMysteryBox} = useScaffoldContractRead({
    //     contractName: "YourCollectible",
    //     functionName: "buyMysteryBox",
    // });
    // const { data: tokenId } = useScaffoldContractRead({
    //     contractName: "YourCollectible",
    //     functionName: "buyMysteryBox",
    //     args: [], // 不需要参数
    //     value: ethers.parseUnits(mysteryBoxPrice, "ether"), // 传递价格
    // });

    // 设置盲盒价格合约方法
    const { writeAsync: setMysteryBoxPrice } = useScaffoldContractWrite({
        contractName: "YourCollectible",
        functionName: "setMysteryBoxPrice",
        args: [ethers.parseUnits(mysteryBoxPrice, "ether")],
    });

    // 添加可用的NFT合约方法
    const { writeAsync: addAvailableToken } = useScaffoldContractWrite({
        contractName: "YourCollectible",
        functionName: "addAvailableToken",
        args: [0n],
    });

    //获取盲盒NFT
    // const { data:  availableTokens} = useScaffoldContractRead({
    //     contractName: "YourCollectible",
    //     functionName: "availableTokens",
    //     args: [0n]
    // });
    //获取盲盒NFT
    const { data: getAvailableTokens } = useScaffoldContractRead({
        contractName: "YourCollectible",
        functionName: "getAvailableTokens",
    });

    // 获取当前时间戳（从智能合约中获取）
    const { data: currentTimestamp } = useScaffoldContractRead({
        contractName: "YourCollectible",
        functionName: "getCurrentTimestamp",
    });

    useEffect(() => {
        if (getAvailableTokens) {
            setAvailableTokens([...getAvailableTokens]);  // 使用展开运算符将其转换为可变数组
        }
    }, [getAvailableTokens]);
    
    

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

    useEffect(() => {
        if (currentMysteryBoxPrice) {
            setMysteryBoxPrice1(ethers.formatEther(currentMysteryBoxPrice));
        }
    }, [currentMysteryBoxPrice]);

    // 获取用户铸造的NFT
    const getUserNFTs = () => {
        if (typeof window !== "undefined") {
            const createdNFTs = JSON.parse(localStorage.getItem("createdNFTs") || "[]");
            return createdNFTs.filter((nft: Collectible) => nft.owner === connectedAddress);
        }
        return []; // 如果没有在浏览器环境中，返回一个空数组
    };

    useEffect(() => {
        const userNFTs = getUserNFTs();
        setUserNFTs(userNFTs);
    }, [connectedAddress]);

    // 使用 useEffect 来监听 purchasedTokenId 和 BuyerAddress 的更新
    useEffect(() => {
        if (purchasedTokenId !== null) {
            console.log("Number(purchasedTokenId)的值为：", Number(purchasedTokenId));
        }

        if (BuyerAddress) {
            console.log("BuyerAddress的值为: ", BuyerAddress);
        }
        // 在 createdNFTs 数组中找到对应的 NFT 并更新其 Owner
        const storedCreatedNFTs = localStorage.getItem("createdNFTs");
        const createdNFTs = storedCreatedNFTs ? JSON.parse(storedCreatedNFTs) : [];
        const updatedCreatedNFTs = createdNFTs.map((nft: Collectible) =>
            nft.id === Number(purchasedTokenId) ? { ...nft, owner: BuyerAddress } : nft
        );
        localStorage.setItem("createdNFTs", JSON.stringify(updatedCreatedNFTs));
        console.log("Number(purchasedTokenId)的值为：", Number(purchasedTokenId));
        console.log("BuyerAddress的值为: ", BuyerAddress);

    }, [purchasedTokenId, BuyerAddress]);

    // useEffect(() => {
    //     if (BuyerAddress) {
    //         console.log("BuyerAddress的值为: ", BuyerAddress);
    //     }
    // }, [BuyerAddress]);

    // 购买盲盒
    const handleBuyMysteryBox = async (nft: Collectible) => {

        const notificationId = notification.loading("购买盲盒中...");
        try {
            const priceInWei = ethers.parseUnits(mysteryBoxPrice, "ether");
            await buyMysteryBox({                //返回的是一个交易哈希
                args: [BigInt(currentTime)],
                value: priceInWei, // 传递盲盒价格
            });
            notification.success("购买成功,开始抽取NFT......");
            console.log("当前时间戳为：", currentTime);
            console.log("availableTokensNFT列表", getAvailableTokens);
            //setPurchasedTokenId(BigInt(1)); // 假设返回的tokenId为1，实际应从合约返回
            //console.log("成功购买盲盒后获取的NFT的tokenId:", boxTokenId);
            //console.log("成功购买盲盒后获取的NFT的BoxTokenId1:", BoxTokenId);
            //console.log("成功购买盲盒后获取的NFT的BoxTokenId2:", Number(BoxTokenId));          
            //console.log("成功购买盲盒后获取的NFT的tokenId:", BoxTokenId);



        } catch (error) {
            console.error(error);
            notification.error("购买盲盒失败，请重试！");
        } finally {
            notification.remove(notificationId);
        }
    };




    // 设置盲盒价格
    const handleSetMysteryBoxPrice = async () => {
        const notificationId = notification.loading("设置盲盒价格中...");
        try {
            await setMysteryBoxPrice();
            notification.success("盲盒价格设置成功！");
        } catch (error) {
            console.error(error);
            notification.error("设置盲盒价格失败，请重试！");
        } finally {
            notification.remove(notificationId);
        }
    };

    //添加可用的NFT
    const handleAddAvailableToken = async () => {
        if (selectedNFTs.length === 0) {
            notification.error("请先选择至少一个NFT！");
            return;
        }

        const notificationId = notification.loading("添加可用NFT中...");
        try {
            for (const nft of selectedNFTs) {
                await addAvailableToken({ args: [BigInt(nft.id)] });
                console.log("你添加的NFT为:", nft.id);
            }
            notification.success("可用NFT添加成功！");
        } catch (error) {
            console.error(error);
            notification.error("添加可用NFT失败，请重试！");
        } finally {
            notification.remove(notificationId);
        }
    };
    // const handleAddAvailableToken = async () => {
    //     if (selectedNFTs.length === 0) {
    //         notification.error("请先选择至少一个NFT！");
    //         return;
    //     }

    //     const notificationId = notification.loading("添加可用NFT中...");
    //     try {
    //         for (const nft of selectedNFTs) {
    //             await addAvailableToken({ args: [BigInt(nft.id)] });
    //             console.log("你添加的NFT为:", nft.id);
    //         }
    //         notification.success("可用NFT添加成功！");

    //         // 确保交易成功后再读取 availableTokens
    //         const newAvailableTokens = await availableTokens(); // 重新获取 availableTokens
    //         console.log("新的 availableTokensNFT列表", newAvailableTokens);

    //     } catch (error) {
    //         console.error(error);
    //         notification.error("添加可用NFT失败，请重试！");
    //     } finally {
    //         notification.remove(notificationId);
    //     }
    // };


    // 选择NFT并关闭弹窗
    const handleNFTSelection = (nft: Collectible) => {
        setSelectedNFTs((prevSelectedNFTs) => {
            if (prevSelectedNFTs.some((selectedNFT) => selectedNFT.id === nft.id)) {
                return prevSelectedNFTs.filter((selectedNFT) => selectedNFT.id !== nft.id); // 如果已经选中过，取消选中
            }
            return [...prevSelectedNFTs, nft]; // 否则添加到选中的NFT列表
        });
    };


    // 查看剩余NFT
    const handleViewAvailableTokens = () => {
        setIsAvailableTokensModalVisible(true); // 显示剩余NFT模态框
    };

    // 关闭查看剩余NFT的模态框
    const handleCloseAvailableTokensModal = () => {
        setIsAvailableTokensModalVisible(false);
    };

    


    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold mb-6">盲盒功能</h1>

            <div className="mb-4">
                <h2 className="text-2xl font-semibold mb-2">设置盲盒价格</h2>
                <Input
                    type="text"
                    placeholder="盲盒价格 (ETH)"
                    value={mysteryBoxPrice}
                    onChange={(e: any) => setMysteryBoxPrice(e.target.value)}
                    className="mb-2"
                />
                <Button type="primary" onClick={handleSetMysteryBoxPrice}>
                    设置价格
                </Button>
            </div>

            <div className="mb-4">
                <h2 className="text-2xl font-semibold mb-2">添加可用NFT</h2>
                <Button type="primary" onClick={() => setIsModalVisible(true)}>
                    选择NFT
                </Button>
                <Button
                    type="primary"
                    onClick={handleAddAvailableToken}
                    className="ml-4"
                >
                    添加NFT到盲盒
                </Button>
            </div>

            {/* 查看剩余NFT的按钮 */}
            <div className="mb-4">
                <Button type="primary" onClick={handleViewAvailableTokens}>
                    查看剩余NFT
                </Button>
            </div>

            
            {/* 选择NFT的模态框 */}
            <Modal
                title="选择NFT"
                visible={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
            >
                {userNFTs.map((nft: Collectible) => ( 
                    <div
                        key={nft.id}
                        className={`cursor-pointer mb-4 flex items-center ${selectedNFTs.some((selectedNFT) => selectedNFT.id === nft.id) ? 'bg-blue-100' : ''}`}
                        onClick={() => handleNFTSelection(nft)}
                    >
                        <img src={nft.image} alt={nft.name} width={50} height={50} />
                        <p className="ml-4">{nft.name}</p>
                    </div>
                ))}
            </Modal>

            {/* 查看剩余NFT的模态框 */}
            <Modal
                title="剩余NFT"
                visible={isAvailableTokensModalVisible}
                onCancel={handleCloseAvailableTokensModal}
                footer={null}
            >
                {availableTokens.length === 0 ? (
                    <p>当前没有剩余NFT</p>
                ) : (
                    availableTokens.map((tokenId, index) => (
                        <div key={index} className="mb-4">
                            <p>Token ID: {tokenId.toString()}</p>
                            {/* <img
                                src={`https://example.com/nft-image/${tokenId.toString()}`} // 替换为NFT的图片URL
                                alt={`NFT ${tokenId}`}
                                width={50}
                                height={50}
                            /> */}
                        </div>
                    ))
                )}
            </Modal>

            <div className="mb-4">
                <h2 className="text-2xl font-semibold mb-2">购买盲盒</h2>
                <p>盲盒价格: {mysteryBoxPrice} ETH</p>
                <Button type="primary" onClick={handleBuyMysteryBox}>
                    购买盲盒
                </Button>
            </div>

            {/* 购买成功后显示的模态框 */}
            <Modal
                title="盲盒购买成功"
                visible={!!purchasedTokenId}
                onCancel={() => setPurchasedTokenId(null)}
                footer={[
                    <Button key="ok" onClick={() => setPurchasedTokenId(null)}>
                        确定
                    </Button>,
                ]}
            >

                <p>您已成功购买盲盒，获得的NFT ID: {purchasedTokenId?.toString()}</p>

            </Modal>
        </div>
    );
};

export default MysteryBoxPage;
