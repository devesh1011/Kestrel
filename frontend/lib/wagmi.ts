"use client";

import { createConfig, http } from "wagmi";
import { metaMask } from "wagmi/connectors";
import { creditcoinTestnet, creditcoinUSC } from "./chains";

export const wagmiConfig = createConfig({
  chains: [creditcoinUSC, creditcoinTestnet],
  connectors: [metaMask()],
  transports: {
    [creditcoinUSC.id]: http(
      process.env.NEXT_PUBLIC_CTC_USC_RPC ??
        "https://rpc.usc-testnet2.creditcoin.network",
    ),
    [creditcoinTestnet.id]: http("https://rpc.cc3-testnet.creditcoin.network"),
  },
});
