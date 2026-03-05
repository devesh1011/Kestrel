import { hardwareYieldCoreAbi } from "./abis/hardwareYieldCore";
import { lenderVaultAbi } from "./abis/lenderVault";
import { wctcAbi, spaceRewardEmitterAbi } from "./abis/index";

export const HARDWARE_YIELD_CORE_ADDRESS = process.env
  .NEXT_PUBLIC_HARDWARE_YIELD_CORE as `0x${string}`;
export const LENDER_VAULT_ADDRESS = process.env
  .NEXT_PUBLIC_LENDER_VAULT as `0x${string}`;
export const WCTC_ADDRESS = process.env.NEXT_PUBLIC_WCTC as `0x${string}`;
export const SPACE_REWARD_EMITTER_ADDRESS = process.env
  .NEXT_PUBLIC_SPACE_REWARD_EMITTER as `0x${string}`;

export const hardwareYieldCoreContract = {
  address: HARDWARE_YIELD_CORE_ADDRESS,
  abi: hardwareYieldCoreAbi,
} as const;

export const lenderVaultContract = {
  address: LENDER_VAULT_ADDRESS,
  abi: lenderVaultAbi,
} as const;

export const wctcContract = {
  address: WCTC_ADDRESS,
  abi: wctcAbi,
} as const;

export const spaceRewardEmitterContract = {
  address: SPACE_REWARD_EMITTER_ADDRESS,
  abi: spaceRewardEmitterAbi,
} as const;

export { hardwareYieldCoreAbi, lenderVaultAbi, wctcAbi, spaceRewardEmitterAbi };
