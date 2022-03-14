require("@nomiclabs/hardhat-waffle");
require("@limechain/hardhat-hethers");
require('dotenv').config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("get-signers", "Test hethers", async (taskArgs, hre) => {
  const signers = await hre.hethers.getSigners();
  console.log(signers);
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.4",
  defaultNetwork: "testnet",
  hedera: {
    gasLimit: 300000,
    networks: {
      testnet: {
        accounts: [
          {
            "account": process.env.TESTNET_ACCOUNT_ID_1,
            "privateKey": process.env.TESTNET_PRIVATEKEY_1
          },
          {
            "account": process.env.TESTNET_ACCOUNT_ID_2,
            "privateKey": process.env.TESTNET_PRIVATEKEY_2
          }
        ]
      },
      customHederaNetwork: {
        consensusNodes: [
          {
            url: '0.testnet.hedera.com:50211',
            nodeId: '0.0.3'
          },
          {
            url: '4.testnet.hedera.com:50211',
            nodeId: '0.0.7'
          },
          {
            url: '3.testnet.hedera.com:50211',
            nodeId: '0.0.6'
          }
        ],
        mirrorNodeUrl: 'hcs.testnet.mirrornode.hedera.com:5600',
        chainId: 297,

        accounts: [
          {
            "account": process.env.TESTNET_ACCOUNT_ID_1,
            "privateKey": process.env.TESTNET_PRIVATEKEY_1
          },
          {
            "account": process.env.TESTNET_ACCOUNT_ID_2,
            "privateKey": process.env.TESTNET_PRIVATEKEY_2
          }
        ]
      }
    }
  },
  networks: {},
};
