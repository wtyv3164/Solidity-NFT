// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol"; // 导入 ERC721 标准合约
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol"; // 导入 ERC721 可枚举扩展
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol"; // 导入 ERC721 URI 存储扩展
import "@openzeppelin/contracts/access/Ownable.sol"; // 导入 Ownable 合约，用于所有权控制
import "@openzeppelin/contracts/utils/Counters.sol"; // 导入 Counters 库，用于计数操作

contract YourCollectible is
	ERC721,
	ERC721Enumerable,
	ERC721URIStorage,
	Ownable
{
	using Counters for Counters.Counter; // 使用 Counters 库进行计数操作

	Counters.Counter public tokenIdCounter; // 用于跟踪令牌 ID 的计数器
	mapping(uint256 => uint256) public tokenPrices; // 用于存储令牌价格的映射
	//版税机制
	mapping(uint256 => address) private _creators; // 存储每个tokenId的创作者地址
	uint256 public royaltyPercentage = 5; // 版税百分比，默认设置为5%

    //盲盒功能
    uint256 public mysteryBoxPrice = 0.1 ether; // 盲盒价格
    uint256[] public availableTokens; // 可供选择的NFT tokenId列表
    

	//拍卖相关结构体
	struct Auction {
		address seller;
		uint256 minBid;
		uint256 highestBid;
		address highestBidder;
		uint256 endTime;
		bool isActive;
	}

	mapping(uint256 => Auction) public auctions; // tokenId 对应的拍卖信息

	// 拍卖事件
	event AuctionStarted(
		uint256 indexed tokenId,
		uint256 minBid,
		uint256 auctionDuration
	);
	event NewBidPlaced(
		uint256 indexed tokenId,
		address indexed bidder,
		uint256 amount
	);
	event AuctionEnded(
		uint256 indexed tokenId,
		address indexed winner,
		uint256 amount
	);

    //盲盒触发事件
    event MysteryBoxPurchased(uint256 tokenId, address buyer);

	// 构造函数，初始化合约并设置合约名称和代币符号
	constructor() ERC721("YourCollectible", "ETH") {}

	// 覆盖 _baseURI 函数，返回一个空字符串
	function _baseURI() internal pure override returns (string memory) {
		return "";
	}

	// 铸造NFT
	function mintItem(address to, string memory uri) public returns (uint256) {
		tokenIdCounter.increment(); // 增加NFT ID
		uint256 tokenId = tokenIdCounter.current(); // 获取当前的NFT ID
		_safeMint(to, tokenId); // 安全地铸造NFT
		_setTokenURI(tokenId, uri); // 设置NFT URI
		_creators[tokenId] = msg.sender; // 保存创作者地址
		return tokenId; // 返回NFT ID
	}

	// **批量铸造NFT**
	function mintBatch(
		address to,
		string[] memory uris
	) public returns (uint256[] memory) {
		uint256[] memory tokenIds = new uint256[](uris.length); // 定义返回的 tokenIds 数组

		for (uint256 i = 0; i < uris.length; i++) {
			tokenIdCounter.increment(); // 增加NFT ID
			uint256 tokenId = tokenIdCounter.current(); // 获取当前的NFT ID
			_safeMint(to, tokenId); // 安全地铸造NFT
			_setTokenURI(tokenId, uris[i]); // 设置NFT URI
			_creators[tokenId] = msg.sender; // 保存创作者地址
			tokenIds[i] = tokenId; // 存储 tokenId 到数组中
		}

		return tokenIds; // 返回批量铸造的 tokenIds
	}

	// Solidity要求的覆盖函数
	function _beforeTokenTransfer(
		address from,
		address to,
		uint256 tokenId,
		uint256 batchSize
	) internal override(ERC721, ERC721Enumerable) {
		super._beforeTokenTransfer(from, to, tokenId, batchSize); // 调用父类的 _beforeTokenTransfer
	}

	// 覆盖 _burn 函数
	function _burn(
		uint256 tokenId
	) internal override(ERC721URIStorage, ERC721) {
		super._burn(tokenId); // 调用父类的 _burn
	}

	// 覆盖 tokenURI 函数
	function tokenURI(
		uint256 tokenId
	) public view override(ERC721URIStorage, ERC721) returns (string memory) {
		return super.tokenURI(tokenId); // 调用父类的 tokenURI
	}

	// 覆盖 supportsInterface 函数
	function supportsInterface(
		bytes4 interfaceId
	)
		public
		view
		override(ERC721, ERC721Enumerable, ERC721URIStorage)
		returns (bool)
	{
		return super.supportsInterface(interfaceId); // 调用父类的 supportsInterface
	}

	// 购买方法
	function purchase(
		uint256 tokenId,
		address from,
		address to,
		uint256 price,
		uint256 batchSize
	) public payable {
		require(_exists(tokenId), "Token does not exist"); // 确保令牌存在
		require(from == ownerOf(tokenId), "From address is not the owner"); // 确保 from 地址是令牌的所有者
		require(msg.value == price, "Incorrect price"); // 确保发送的以太币数量与价格相符

		// 将价格转移给卖家
		payable(from).transfer(price);
		// 调用 _beforeTokenTransfer 方法
		_beforeTokenTransfer(from, to, tokenId, batchSize);
		// 转移令牌
		_transfer(from, to, tokenId);
	}

	// 开始拍卖
	function startAuction(
		uint256 tokenId,
		uint256 minBid,
		uint256 startTime,
		uint256 auctionDuration
	) public {
		require(
			ownerOf(tokenId) == msg.sender,
			unicode"只有NFT所有者可以启动拍卖"
		);
		require(!auctions[tokenId].isActive, unicode"该NFT拍卖已激活");
		//uint256 startTime = getCurrentTimestamp(); //开始时间
		auctions[tokenId] = Auction({
			seller: msg.sender,
			minBid: minBid,
			highestBid: 0,
			highestBidder: address(0),
			endTime: startTime + auctionDuration,
			isActive: true
		});

		emit AuctionStarted(tokenId, minBid, auctionDuration); // 触发拍卖开始事件
	}

	// 出价
	function placeBid(uint256 tokenId, address buyer, uint256 currentTimestamp) public payable {
		Auction storage auction = auctions[tokenId];
		require(auction.isActive, unicode"该拍卖未激活");
		require(currentTimestamp < auction.endTime, unicode"拍卖已经结束");
		require(buyer != ownerOf(tokenId), unicode"不允许卖家参与出价");
		require(msg.value > auction.minBid, unicode"出价必须高于最低出价");
		require(
			msg.value > auction.highestBid,
			unicode"出价必须高于当前最高出价"
		);

		// 先更新状态，再执行退款
		address previousHighestBidder = auction.highestBidder;
		uint256 previousHighestBid = auction.highestBid;

		auction.highestBid = msg.value;
		auction.highestBidder = msg.sender;

		if (previousHighestBidder != address(0)) {
			// 退还之前的最高出价者
			(bool success, ) = payable(previousHighestBidder).call{
				value: previousHighestBid
			}("");
			require(success, "Refund failed");
		}

		emit NewBidPlaced(tokenId, msg.sender, msg.value); // 触发出价事件
	}

	// 结束拍卖并转移NFT
	function endAuction(uint256 tokenId, uint256 currentTimestamp) public {
		Auction storage auction = auctions[tokenId];
		require(auction.isActive, unicode"该拍卖未激活");
		require(currentTimestamp >= auction.endTime, unicode"拍卖尚未结束");

		auction.isActive = false;

		if (auction.highestBidder != address(0)) {
			// 将NFT转移给最高出价者
			_transfer(auction.seller, auction.highestBidder, tokenId);

			// 将拍卖款项转移给卖家
			payable(auction.seller).transfer(auction.highestBid);

			emit AuctionEnded(
				tokenId,
				auction.highestBidder,
				auction.highestBid
			); // 触发拍卖结束事件
		} else {
			emit AuctionEnded(tokenId, address(0), 0); // 触发拍卖结束事件，标记拍卖失败
		}

		// 清理拍卖信息
		delete auctions[tokenId];
	}

	// 获取当前时间戳
	function getCurrentTimestamp() public view returns (uint256) {
		return block.timestamp;
	}

    // 覆盖 buyNFT 函数，增加版税支付逻辑
    function buyNFT(uint256 tokenId, uint256 price) public payable {
        //uint256 price = tokenPrices[tokenId];
        require(price > 0, unicode"该版权还未出售");
        require(msg.value == price, unicode"发送了错误的价格");

        address seller = ownerOf(tokenId);
        address creator = _creators[tokenId];
        uint256 royaltyAmount = (msg.value * royaltyPercentage) / 100; // 计算版税金额
        uint256 sellerAmount = msg.value - royaltyAmount;

        _transfer(seller, msg.sender, tokenId);

        // 支付给创作者版税
        payable(creator).transfer(royaltyAmount);
        // 剩余金额支付给卖家
        payable(seller).transfer(sellerAmount);

        tokenPrices[tokenId] = 0; // 重置令牌价格
    }

    // 修改版税百分比
    function setRoyaltyPercentage(uint256 percentage) public  {
        royaltyPercentage = percentage;
    }


    // 添加盲盒NFT
    function addAvailableToken(uint256 tokenId) public  {
        availableTokens.push(tokenId);
    }

    // 设置盲盒价格
    function setMysteryBoxPrice(uint256 price) public {
        mysteryBoxPrice = price;
    }

    // 购买盲盒
    function buyMysteryBox(uint256 currentTimestamp) public payable returns (uint256) {
        require(msg.value == mysteryBoxPrice, "Incorrect price");
        require(availableTokens.length > 0, "No available NFTs");

        uint256 randomIndex = uint256(keccak256(abi.encodePacked(currentTimestamp, msg.sender))) % availableTokens.length;
        uint256 tokenId = availableTokens[randomIndex];

        // 将选中的tokenId从可用列表中移除
        availableTokens[randomIndex] = availableTokens[availableTokens.length - 1];
        availableTokens.pop();

        // 转移NFT给购买者
        _transfer(ownerOf(tokenId), msg.sender, tokenId);

        emit MysteryBoxPurchased(tokenId, msg.sender);

        return tokenId;
    }

	// 获取整个 availableTokens 数组
   function getAvailableTokens() public view returns (uint256[] memory) {
    return availableTokens;
}


}
