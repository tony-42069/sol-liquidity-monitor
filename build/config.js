"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateLiquidityUSD = exports.calculatePrice = exports.POOL_STATE_LAYOUT = exports.getConnection = exports.getKeypairFromSeed = exports.CONFIG = exports.POOL_ADDRESS = exports.WSOL_MINT = exports.RAYDIUM_PROGRAM_ID = void 0;
const web3_js_1 = require("@solana/web3.js");
const bip39 = __importStar(require("bip39"));
const ed25519_hd_key_1 = require("ed25519-hd-key");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Constants
exports.RAYDIUM_PROGRAM_ID = new web3_js_1.PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
exports.WSOL_MINT = new web3_js_1.PublicKey('So11111111111111111111111111111111111111112');
exports.POOL_ADDRESS = new web3_js_1.PublicKey('6GHh9d5bZPcDELedq3ZuB1xTJsGHnKqFL142chpNQCox');
exports.CONFIG = {
    // Network
    RPC_ENDPOINT: 'https://api.mainnet-beta.solana.com',
    // Token Details
    WALLET_ADDRESS: new web3_js_1.PublicKey('5pewVcDGLkqzUmrzjhVBgjd1M2s4sFWpefheWsp5szxb'),
    TOKEN_MINT: new web3_js_1.PublicKey('7N17vqQVJKK2TY5gcdLXwgnsRx4X3c3vczau578Rpump'),
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
const getKeypairFromSeed = () => {
    const seed = process.env.WALLET_SEED_PHRASE;
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
        const { key } = (0, ed25519_hd_key_1.derivePath)(path, seedBuffer.toString('hex'));
        return web3_js_1.Keypair.fromSeed(Uint8Array.from(key));
    }
    catch (error) {
        throw new Error(`Failed to derive keypair: ${error}`);
    }
};
exports.getKeypairFromSeed = getKeypairFromSeed;
const getConnection = () => {
    return new web3_js_1.Connection(exports.CONFIG.RPC_ENDPOINT, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000
    });
};
exports.getConnection = getConnection;
// Pool state layout for Raydium AMM
exports.POOL_STATE_LAYOUT = {
    baseDecimals: 9,
    quoteDecimals: 9,
    lpDecimals: 9,
    version: 4,
    programId: exports.RAYDIUM_PROGRAM_ID,
    baseTokenIndex: 0,
    quoteTokenIndex: 1
};
// Helper function to calculate price from pool reserves
const calculatePrice = (baseReserve, quoteReserve) => {
    if (baseReserve === 0)
        return 0;
    return quoteReserve / baseReserve;
};
exports.calculatePrice = calculatePrice;
// Helper function to calculate liquidity in USD
const calculateLiquidityUSD = (baseReserve, quoteReserve, solPrice) => {
    return (baseReserve * solPrice) + quoteReserve;
};
exports.calculateLiquidityUSD = calculateLiquidityUSD;
