import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import { defineConfig } from "hardhat/config";
import * as dotenv from "dotenv";

dotenv.config();

const deployerKey = process.env.DEPLOYER_PRIVATE_KEY
  ? (`0x${process.env.DEPLOYER_PRIVATE_KEY.replace(
      /^0x/,
      "",
    )}` as `0x${string}`)
  : undefined;

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers, hardhatViem],

  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      production: {
        version: "0.8.28",
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },

  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
      chainId: 31337,
    },

    // Creditcoin Testnet cc3
    ctc_testnet: {
      type: "http",
      chainType: "l1",
      url: "https://rpc.cc3-testnet.creditcoin.network",
      chainId: 102031,
      accounts: deployerKey ? [deployerKey] : [],
    },

    ctc_usc_testnet: {
      type: "http",
      chainType: "l1",
      url: "https://rpc.usc-testnet2.creditcoin.network",
      chainId: 102036,
      accounts: deployerKey ? [deployerKey] : [],
    },

    sepolia: {
      type: "http",
      chainType: "l1",
      url: "https://ethereum-sepolia.publicnode.com",
      chainId: 11155111,
      accounts: deployerKey ? [deployerKey] : [],
    },
  },
});
