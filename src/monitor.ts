import { Connection, PublicKey } from '@solana/web3.js';
import { struct, u64, u128 } from '@project-serum/borsh';
import { 
  CONFIG, 
  RAYDIUM_PROGRAM_ID, 
  WSOL_MINT,
  POOL_ADDRESS,
  getConnection,
  calculatePrice,
  calculateLiquidityUSD 
} from './config';

// Raydium pool state layout
const POOL_STATE_LAYOUT = struct([
  u64('baseReserve'),
  u64('quoteReserve'),
  u128('lpSupply'),
  u64('lastSnapSlot'),
  u64('feeGrowthGlobalBase'),
  u64('feeGrowthGlobalQuote'),
  u64('feeProtocolBase'),
  u64('feeProtocolQuote')
]);

export class LiquidityMonitor {
  private connection: Connection;
  private poolAddress: PublicKey;

  constructor() {
    this.connection = getConnection();
    this.poolAddress = POOL_ADDRESS;
  }

  async initialize() {
    try {
      console.log('Initializing pool monitoring...');
      
      // Verify the pool exists
      const poolAccount = await this.connection.getAccountInfo(POOL_ADDRESS);
      if (!poolAccount) {
        throw new Error('Pool account not found. Please verify the pool address.');
      }
      
      console.log('Pool initialized:', this.poolAddress.toString());
      
    } catch (error) {
      console.error('Failed to initialize pool monitoring:', error);
      throw error;
    }
  }

  async checkConditions(): Promise<boolean> {
    try {
      if (!this.poolAddress) {
        throw new Error('Pool not initialized');
      }

      // Get pool state
      const poolAccount = await this.connection.getAccountInfo(this.poolAddress);
      
      if (!poolAccount) {
        throw new Error('Pool account not found');
      }

      // Decode pool state
      const poolState = POOL_STATE_LAYOUT.decode(poolAccount.data);
      
      // Calculate current price and liquidity
      const baseReserve = Number(poolState.baseReserve.toString()) / (10 ** 9); // Adjust for decimals
      const quoteReserve = Number(poolState.quoteReserve.toString()) / (10 ** 9); // Adjust for decimals
      
      // Assuming SOL price is $100 for now
      // In production, we would fetch the actual SOL price from an oracle
      const SOL_PRICE_USD = 100;
      
      // Calculate price (RKIT/SOL)
      const price = (quoteReserve / baseReserve) * SOL_PRICE_USD;
      
      // Calculate total liquidity in USD
      const liquidityUSD = (baseReserve * price) + (quoteReserve * SOL_PRICE_USD);
      
      console.log('Base Reserve (RKIT):', baseReserve);
      console.log('Quote Reserve (SOL):', quoteReserve);

      console.log(`Current price: $${price.toFixed(2)}`);
      console.log(`Current liquidity: $${liquidityUSD.toFixed(2)}`);

      // Check if conditions are met
      const isPriceInRange = price >= CONFIG.PRICE_RANGE.MIN && price <= CONFIG.PRICE_RANGE.MAX;
      const hasEnoughLiquidity = liquidityUSD >= CONFIG.MIN_LIQUIDITY_USD;

      if (isPriceInRange && hasEnoughLiquidity) {
        console.log('Trading conditions met!');
        return true;
      }

      if (!isPriceInRange) {
        console.log('Price not in target range');
      }
      if (!hasEnoughLiquidity) {
        console.log('Insufficient liquidity');
      }

      return false;
    } catch (error) {
      console.error('Error checking conditions:', error);
      return false;
    }
  }

  getPoolAddress(): PublicKey | null {
    return this.poolAddress;
  }
}

// Export a singleton instance
export const monitor = new LiquidityMonitor();
