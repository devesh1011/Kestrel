import { ethers } from "ethers";

async function main() {
  // Connect to cc3 testnet
  const provider = new ethers.JsonRpcProvider(
    "https://rpc.cc3-testnet.creditcoin.network",
  );

  // Borrower address
  const borrowerAddress = "0x60A6224F438F66Bf19FeB6BED91cE2f4C2418A56";

  console.log("Checking borrower wallet:", borrowerAddress);

  // Check CTC balance
  const balance = await provider.getBalance(borrowerAddress);
  console.log(`CTC balance on cc3: ${ethers.formatEther(balance)} CTC`);

  if (balance < ethers.parseEther("0.01")) {
    console.log("❌ Borrower needs CTC on cc3 for gas!");
    console.log("Transfer at least 0.1 CTC to:", borrowerAddress);
    console.log("From your main wallet on cc3 testnet");
  } else {
    console.log("✅ Borrower has sufficient CTC for claiming rewards");
  }
}

main().catch(console.error);
