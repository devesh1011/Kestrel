import { ethers } from "ethers";

async function main() {
  // Connect to USC Testnet v2
  const provider = new ethers.JsonRpcProvider(process.env.CTC_USC_RPC_URL);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);

  console.log("Connected wallet:", wallet.address);

  // WCTC contract address
  const WCTC_ADDRESS = "0x978524ae39575aaf308330466d29419a2affeef6";

  // Get WCTC contract
  const wctcAbi = [
    "function deposit() payable",
    "function balanceOf(address) view returns (uint256)",
    "function totalSupply() view returns (uint256)",
  ];
  const wctc = new ethers.Contract(WCTC_ADDRESS, wctcAbi, wallet);

  // Wrap 500 CTC to WCTC
  const wrapAmount = ethers.parseEther("150");
  console.log(`Wrapping ${ethers.formatEther(wrapAmount)} CTC to WCTC...`);

  const tx = await wctc.deposit({ value: wrapAmount });
  await tx.wait();

  console.log("Wrap transaction confirmed:", tx.hash);

  // Check balance
  const balance = await wctc.balanceOf(wallet.address);
  console.log(`WCTC balance: ${ethers.formatEther(balance)} WCTC`);

  // Check total supply
  const totalSupply = await wctc.totalSupply();
  console.log(`WCTC total supply: ${ethers.formatEther(totalSupply)} WCTC`);
}

main().catch(console.error);
