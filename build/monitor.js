"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitor = exports.LiquidityMonitor = void 0;
const borsh_1 = require("@project-serum/borsh");
const config_1 = require("./config");
// Raydium pool state layout
const POOL_STATE_LAYOUT = (0, borsh_1.struct)([
    (0, borsh_1.u64)('baseReserve'),
    (0, borsh_1.u64)('quoteReserve'),
    (0, borsh_1.u128)('lpSupply'),
    (0, borsh_1.u64)('lastSnapSlot'),
    (0, borsh_1.u64)('feeGrowthGlobalBase'),
    (0, borsh_1.u64)('feeGrowthGlobalQuote'),
    (0, borsh_1.u64)('feeProtocolBase'),
    (0, borsh_1.u64)('feeProtocolQuote')
]);
class LiquidityMonitor {
    constructor() {
        this.connection = (0, config_1.getConnection)();
        this.poolAddress = config_1.POOL_ADDRESS;
    }
    async initialize() {
        try {
            console.log('Initializing pool monitoring...');
            // Verify the pool exists
            const poolAccount = await this.connection.getAccountInfo(config_1.POOL_ADDRESS);
            if (!poolAccount) {
                throw new Error('Pool account not found. Please verify the pool address.');
            }
            console.log('Pool initialized:', this.poolAddress.toString());
        }
        catch (error) {
            console.error('Failed to initialize pool monitoring:', error);
            throw error;
        }
    }
    async getPoolState() {
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
        return {
            baseReserve,
            quoteReserve,
            price,
            liquidityUSD
        };
    }
    async checkConditions() {
        try {
            const { price, liquidityUSD } = await this.getPoolState();
            console.log(`Current price: $${price.toFixed(2)}`);
            console.log(`Current liquidity: $${liquidityUSD.toFixed(2)}`);
            // Check if conditions are met
            const isPriceInRange = price >= config_1.CONFIG.PRICE_RANGE.MIN && price <= config_1.CONFIG.PRICE_RANGE.MAX;
            const hasEnoughLiquidity = liquidityUSD >= config_1.CONFIG.MIN_LIQUIDITY_USD;
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
        }
        catch (error) {
            console.error('Error checking conditions:', error);
            return false;
        }
    }
    getPoolAddress() {
        return this.poolAddress;
    }
}
exports.LiquidityMonitor = LiquidityMonitor;
// Export a singleton instance
exports.monitor = new LiquidityMonitor();
