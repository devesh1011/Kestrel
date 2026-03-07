import { ethers } from "ethers";

async function main() {
  // Connect to USC Testnet v2
  const provider = new ethers.JsonRpcProvider(
    "https://rpc.usc-testnet2.creditcoin.network",
    {
      chainId: 102036,
      name: "ctc-usc-testnet",
    },
  );

  // HardwareYieldCore contract address
  const coreAddress = "0xe355455aa417541931b982089e5e0601fad5b8a3";

  // ABI for the view functions
  const coreAbi = [
    "function getRewardCount(address wallet) external view returns (uint256)",
    "function getTotalRewards(address wallet) external view returns (uint256)",
  ];

  const core = new ethers.Contract(coreAddress, coreAbi, provider);

  console.log("Checking rewards in HardwareYieldCore:", coreAddress);

  // Check a specific borrower's rewards
  const borrowerAddress = "0x60A6224F438F66Bf19FeB6BED91cE2f4C2418A56";

  try {
    const rewardCount = await core.getRewardCount(borrowerAddress);
    console.log(`Borrower ${borrowerAddress} has ${rewardCount} reward events`);

    const totalRewards = await core.getTotalRewards(borrowerAddress);
    console.log(`Total rewards: ${ethers.formatEther(totalRewards)} WCTC`);
  } catch (error) {
    console.log("❌ Error checking rewards:", error.message);
  }
}

main().catch(console.error);
