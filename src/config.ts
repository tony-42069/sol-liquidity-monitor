import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@project-serum/anchor';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import dotenv from 'dotenv';

dotenv.config();

// Constants
export const RAYDIUM_PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
export const WSOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
export const POOL_ADDRESS = new PublicKey('6GHh9d5bZPcDELedq3ZuB1xTJsGHnKqFL142chpNQCox');

export const CONFIG = {
  // Network
  RPC_ENDPOINT: 'https://api.mainnet-beta.solana.com',
  
  // Token Details
  WALLET_ADDRESS: new PublicKey('5pewVcDGLkqzUmrzjhVBgjd1M2s4sFWpefheWsp5szxb'),
  TOKEN_MINT: new PublicKey('7N17vqQVJKK2TY5gcdLXwgnsRx4X3c3vczau578Rpump'),
  AMOUNT_TO_SELL: 24084.46,

  // Trading Parameters
  PRICE_RANGE: {
    MIN: 4.0,
    MAX: 5.0
  },
  MIN_LIQUIDITY_USD: 300000,
  SLIPPAGE_BPS: 100, // 1% slippage tolerance

  // Monitoring
  CHECK_INTERVAL: 5000, // 5 seconds
  
  // Security
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
};

// Validate required environment variables
if (!process.env.WALLET_SEED_PHRASE) {
  throw new Error('WALLET_SEED_PHRASE environment variable is required');
}

export const getKeypairFromSeed = (): Keypair => {
  const seed = process.env.WALLET_SEED_PHRASE!;
  
  // Remove quotes and trim whitespace
  const cleanSeed = seed.replace(/["']/g, '').trim();
  
  // Validate mnemonic
  if (!bip39.validateMnemonic(cleanSeed)) {
    throw new Error(`Invalid seed phrase. Please ensure it's a valid 12-word BIP39 mnemonic phrase. Received: ${cleanSeed}`);
  }
  
  // Generate seed buffer
  const seedBuffer = bip39.mnemonicToSeedSync(cleanSeed);
  
  // Derive path for Solana
  const path = "m/44'/501'/0'/0'";
  
  try {
    const { key } = derivePath(path, seedBuffer.toString('hex'));
    return Keypair.fromSeed(Uint8Array.from(key));
  } catch (error) {
    throw new Error(`Failed to derive keypair: ${error}`);
  }
};

export const getConnection = (): Connection => {
  return new Connection(CONFIG.RPC_ENDPOINT, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000
  });
};

// Pool state layout for Raydium AMM
export const POOL_STATE_LAYOUT = {
  baseDecimals: 9,
  quoteDecimals: 9,
  lpDecimals: 9,
  version: 4,
  programId: RAYDIUM_PROGRAM_ID,
  baseTokenIndex: 0,
  quoteTokenIndex: 1
};

// Helper function to calculate price from pool reserves
export const calculatePrice = (baseReserve: number, quoteReserve: number): number => {
  if (baseReserve === 0) return 0;
  return quoteReserve / baseReserve;
};

// Helper function to calculate liquidity in USD
export const calculateLiquidityUSD = (
  baseReserve: number,
  quoteReserve: number,
  solPrice: number
): number => {
  return (baseReserve * solPrice) + quoteReserve;
};
