import { cn } from "@/lib/utils";
import {
  IconAdjustmentsBolt,
  IconCloud,
  IconCurrencyDollar,
  IconEaseInOut,
  IconHeart,
  IconHelp,
  IconRouteAltLeft,
  IconTerminal2,
} from "@tabler/icons-react";

export function FeaturesSectionWithHoverEffects() {
  const features = [
    {
      title: "DePIN-Native Lending",
      description:
        "Built specifically for hardware node operators to access liquidity against their verifiable reward history.",
      icon: <IconTerminal2 />,
    },
    {
      title: "Verifiable On-Chain Rewards",
      description:
        "Every reward claim is cryptographically verified using Creditcoin's Universal Smart Contract layer.",
      icon: <IconCloud />,
    },
    {
      title: "Instant Liquidity Access",
      description:
        "Node operators can borrow CTC immediately against future rewards without selling their hardware.",
      icon: <IconEaseInOut />,
    },
    {
      title: "Yield for Lenders",
      description:
        "Deposit CTC into our ERC-4626 vault and earn competitive yields from loan interest payments.",
      icon: <IconCurrencyDollar />,
    },
    {
      title: "Cross-Chain Security",
      description:
        "Secure cross-chain verification without bridging assets - rewards from cc3 proven on USC Testnet.",
      icon: <IconRouteAltLeft />,
    },
    {
      title: "ERC-4626 Standard Vault",
      description:
        "Industry-standard vault interface ensuring compatibility with DeFi tools and maximum liquidity.",
      icon: <IconAdjustmentsBolt />,
    },
    {
      title: "Time-Locked Escrow",
      description:
        "Future rewards are automatically redirected to repay loans, ensuring borrower commitment.",
      icon: <IconHelp />,
    },
    {
      title: "Creditcoin Ecosystem",
      description:
        "Fully integrated with Creditcoin's DePIN infrastructure, from SPACE rewards to CTC lending.",
      icon: <IconHeart />,
    },
  ];
  return (
    <div>
      <h2 className="text-center font-light text-foreground/70 mt-24 mb-20 text-4xl md:text-6xl lg:text-7xl tracking-tight">
        Why Kestrel?
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4  relative z-10 py-10 max-w-7xl mx-auto">
        {features.map((feature, index) => (
          <Feature key={feature.title} {...feature} index={index} />
        ))}
      </div>
    </div>
  );
}

const Feature = ({
  title,
  description,
  icon,
  index,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col lg:border-r  py-10 relative group/feature dark:border-neutral-800",
        (index === 0 || index === 4) && "lg:border-l dark:border-neutral-800",
        index < 4 && "lg:border-b dark:border-neutral-800",
      )}
    >
      {index < 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-neutral-100 dark:from-neutral-800 to-transparent pointer-events-none" />
      )}
      {index >= 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-neutral-100 dark:from-neutral-800 to-transparent pointer-events-none" />
      )}
      <div className="mb-4 relative z-10 px-10 text-neutral-600 dark:text-neutral-400">
        {icon}
      </div>
      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-neutral-300 dark:bg-neutral-700 group-hover/feature:bg-blue-500 transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-neutral-800 dark:text-neutral-100">
          {title}
        </span>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-xs relative z-10 px-10">
        {description}
      </p>
    </div>
  );
};
