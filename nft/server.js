const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3001;

// 中间件
app.use(cors());
app.use(bodyParser.json());

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'NFT'
});

//测试数据库是否连接成功
// 测试数据库连接
pool.getConnection((err, connection) => {
    if (err) {
        console.error('数据库连接失败:', err);
    } else {
        console.log('成功连接到数据库');
        connection.release(); // 释放连接
    }
});


//保存NFT
app.post('/saveNFT', (req, res) => {
    const { tokenId, category, address, cid } = req.body;
    const status = '未上架';
    const leaseStatus = '未租赁';
    const price = 0;

    const query = `INSERT INTO nfts (tokenId, category, address, cid, status, leaseStatus, price)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    pool.execute(query, [tokenId, category, address, cid, status, leaseStatus, price], (err, result) => {
        if (err) {
            console.error('NFT保存失败: ', err);
            res.status(500).json({ status: 500, message: 'NFT保存失败' });
            return;
        }
        res.status(200).json({ status: 200, message: 'NFT保存成功' });
    });
});


//添加NFT
app.post("/nft", (req, res) => {
    const { tokenId, image, name, attributes, owner, price, description, cid } = req.body;

    const query = `INSERT INTO nft (tokenId, image, name, attributes, owner, price, description, cid) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    pool.execute(
        query,
        [tokenId, image, name, attributes, owner, price, description, cid],
        (err, result) => {
            if (err) {
                console.error("添加 NFT 失败: ", err);
                res.status(500).json({ message: "添加 NFT 失败" });
                return;
            }
            res.status(201).json({ message: "NFT 添加成功", id: result.insertId });
        }
    );
});

//查询所有NFT
app.get("/nft", (req, res) => {
    const query = "SELECT * FROM nft";

    pool.query(query, (err, results) => {
        if (err) {
            console.error("获取 NFT 失败: ", err);
            res.status(500).json({ message: "获取 NFT 失败" });
            return;
        }
        res.status(200).json(results);
    });
});

//查询单个NFT
app.get("/nfts/:id", (req, res) => {
    const { id } = req.params;

    const query = "SELECT * FROM nfts WHERE tokenId = ?";

    pool.query(query, [id], (err, results) => {
        if (err) {
            console.error("获取 NFT 失败: ", err);
            res.status(500).json({ message: "获取 NFT 失败" });
            return;
        }
        if (results.length === 0) {
            res.status(404).json({ message: "NFT 不存在" });
            return;
        }
        res.status(200).json(results[0]);
    });
});

// //更新NFT
// app.put("/nfts/:id", (req, res) => {
//     const { id } = req.params;
//     const { image, name, attributes, owner, price, description, cid } = req.body;

//     const query = `
//         UPDATE nfts 
//         SET image = ?, name = ?, attributes = ?, owner = ?, price = ?, description = ?, cid = ? 
//         WHERE id = ?`;

//     pool.execute(
//         query,
//         [image, name, JSON.stringify(attributes), owner, price, description, cid, id],
//         (err, result) => {
//             if (err) {
//                 console.error("更新 NFT 失败: ", err);
//                 res.status(500).json({ message: "更新 NFT 失败" });
//                 return;
//             }
//             if (result.affectedRows === 0) {
//                 res.status(404).json({ message: "NFT 不存在" });
//                 return;
//             }
//             res.status(200).json({ message: "NFT 更新成功" });
//         }
//     );
// });

// //删除NFT
// app.delete("/nfts/:id", (req, res) => {
//     const { id } = req.params;

//     const query = "DELETE FROM nfts WHERE id = ?";

//     pool.execute(query, [id], (err, result) => {
//         if (err) {
//             console.error("删除 NFT 失败: ", err);
//             res.status(500).json({ message: "删除 NFT 失败" });
//             return;
//         }
//         if (result.affectedRows === 0) {
//             res.status(404).json({ message: "NFT 不存在" });
//             return;
//         }
//         res.status(200).json({ message: "NFT 删除成功" });
//     });
// });


// app.get("/nftTransfers/:tokenId", async (req, res) => {
//     const { tokenId } = req.params;
  
//     try {
//       // 查询链上的事件（通过你的区块链 SDK 或工具）
//       const events = await contract.queryFilter(
//         contract.filters.Transfer(null, null, tokenId),
//         0
//       );

//       console.log("查询到的交易事件: ", events); // 添加日志
  
//       const formattedEvents = events.map((event) => ({
//         from: event.args.from,
//         to: event.args.to,
//         tokenId: event.args.tokenId.toString(),
//         blockNumber: event.blockNumber,
//         transactionHash: event.transactionHash,
//       }));
  
//       res.status(200).json(formattedEvents);
//     } catch (err) {
//       console.error("获取 NFT 转移记录失败: ", err);
//       res.status(500).json({ message: "获取 NFT 转移记录失败" });
//     }
//   });

// app.get("/nftTransfers/:tokenId", async (req, res) => {
//     const { tokenId } = req.params;
//     console.log("接收到的 tokenId: ", tokenId);

  
//     try {
//       // 查询链上的事件（通过区块链 SDK 或工具）
//       const events = await contract.queryFilter(
//         contract.filters.Transfer(null, null, BigInt(tokenId)),
//         0
//       );
  
//       console.log("查询到的交易事件: ", events); // 添加日志
  
//       if (!events || events.length === 0) {
//         return res.status(404).json({ message: "没有找到交易记录" });
//       }
  
//       const formattedEvents = events.map((event) => ({
//         from: event.args.from,
//         to: event.args.to,
//         tokenId: event.args.tokenId.toString(),
//         blockNumber: event.blockNumber,
//         transactionHash: event.transactionHash,
//       }));
  
//       res.status(200).json(formattedEvents);
//     } catch (err) {
//       console.error("获取 NFT 转移记录失败: ", err);
//       res.status(500).json({ message: "获取 NFT 转移记录失败" });
//     }
//   });
  

// API：接收交易记录并保存到数据库
app.post("/saveNftTransfers", async (req, res) => {
    const { tokenId, from, to, blockNumber, transactionHash, gas, timestamp } = req.body;
    //console.log("saveNftTransfers数据库中api获得的数据", req.body);
  
    if (!tokenId || !from || !to || !blockNumber || !transactionHash || !gas || !timestamp) {
      return res.status(400).json({ message: "缺少必需的字段" });
    }
  
    const query = `
      INSERT INTO nft_transfers (token_id, from_address, to_address, block_number, transaction_hash, gas, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
  
    pool.execute(query, [tokenId, from, to, blockNumber, transactionHash, gas, timestamp ], (err, results) => {
      if (err) {
        //console.error("保存失败:", err);
        return res.status(500).json({ message: "保存失败" });
      }
      res.status(200).json({ message: "保存成功", data: results });
    });
  });
  
  // API：根据 tokenId 获取转移记录
  app.get("/nftTransfers/:tokenId", (req, res) => {
    const { tokenId } = req.params;
  
    const query = `SELECT * FROM nft_transfers WHERE token_id = ?`;
  
    pool.execute(query, [tokenId], (err, results) => {
      if (err) {
        console.error("查询失败:", err);
        return res.status(500).json({ message: "查询失败" });
      }
  
      if (results.length === 0) {
        return res.status(404).json({ message: "未找到相关交易记录" });
      }
  
      res.status(200).json(results);
    });
  });

// // 保存转移记录
// app.post("/saveNftTransfers", (req, res) => {
//     const { tokenId, from, to, blockNumber, transactionHash } = req.body;
  
//     if (!tokenId || !from || !to || !blockNumber || !transactionHash) {
//       return res.status(400).json({ message: "缺少必需的字段" });
//     }
  
//     // 检查是否存在重复记录
//     const checkQuery = `SELECT * FROM nft_transfers WHERE transaction_hash = ?`;
//     pool.execute(checkQuery, [transactionHash], (err, results) => {
//       if (err) {
//         console.error("查询失败:", err);
//         return res.status(500).json({ message: "查询失败" });
//       }
  
//       if (results.length > 0) {
//         // 如果已经存在，直接返回
//         return res.status(409).json({ message: "记录已存在" });
//       }
  
//       // 如果不存在，插入新记录
//       const insertQuery = `
//         INSERT INTO nft_transfers (token_id, from_address, to_address, block_number, transaction_hash)
//         VALUES (?, ?, ?, ?, ?)
//       `;
//       pool.execute(
//         insertQuery,
//         [tokenId, from, to, blockNumber, transactionHash],
//         (err, results) => {
//           if (err) {
//             console.error("保存失败:", err);
//             return res.status(500).json({ message: "保存失败" });
//           }
//           res.status(200).json({ message: "保存成功", data: results });
//         }
//       );
//     });
//   });
  
//   // 查询转移记录（通过 tokenId）
//   app.get("/nftTransfers/:tokenId", (req, res) => {
//     const { tokenId } = req.params;
  
//     const query = `SELECT * FROM nft_transfers WHERE token_id = ?`;
//     pool.execute(query, [tokenId], (err, results) => {
//       if (err) {
//         console.error("查询失败:", err);
//         return res.status(500).json({ message: "查询失败" });
//       }
//       res.status(200).json(results);
//     });
//   });




app.listen(port, () => {
    console.log(`服务器运行在端口 ${port}`);
});