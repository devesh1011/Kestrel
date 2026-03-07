import { ethers } from "ethers";

async function main() {
  // Connect to USC Testnet v2
  const provider = new ethers.JsonRpcProvider(process.env.CTC_USC_RPC_URL);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);

  console.log("Wallet address:", wallet.address);

  // Check CTC balance
  const balance = await provider.getBalance(wallet.address);
  console.log(
    `CTC balance on USC Testnet v2: ${ethers.formatEther(balance)} CTC`,
  );

  // Check if enough for 500 CTC
  const required = ethers.parseEther("500");
  if (balance < required) {
    console.log(
      `Insufficient balance. Need ${ethers.formatEther(
        required,
      )} CTC, have ${ethers.formatEther(balance)} CTC`,
    );
    console.log("Please fund the wallet with CTC on USC Testnet v2");
    console.log(
      "You can use the Creditcoin faucet: https://faucet.creditcoin.org/",
    );
    console.log("Or transfer from cc3 testnet if there's a bridge");
  } else {
    console.log("Sufficient balance for wrapping");
  }
}

main().catch(console.error);
