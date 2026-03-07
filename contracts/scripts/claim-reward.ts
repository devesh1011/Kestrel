import { ethers } from "ethers";

async function main() {
  // Connect to cc3 testnet
  const provider = new ethers.JsonRpcProvider(process.env.CC3_HTTPS_RPC);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);

  console.log("Connected wallet:", wallet.address);

  // SpaceRewardEmitter contract on cc3
  const emitterAddress = "0x372bd93f70dfd866e17a17aba51e47eebeb4859e";
  const emitterAbi = [
    "function claimReward(uint256 amount) external",
    "event RewardClaimed(address indexed nodeWallet, uint256 amount, uint256 timestamp)",
  ];
  const emitter = new ethers.Contract(emitterAddress, emitterAbi, wallet);

  // Claim 50 CTC reward
  const rewardAmount = ethers.parseEther("50");
  console.log(`Claiming ${ethers.formatEther(rewardAmount)} CTC reward...`);

  const tx = await emitter.claimReward(rewardAmount);
  console.log("Transaction sent:", tx.hash);

  await tx.wait();
  console.log("Reward claimed successfully!");

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`Wallet CTC balance on cc3: ${ethers.formatEther(balance)} CTC`);
}

main().catch(console.error);
