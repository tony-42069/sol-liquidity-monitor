"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executor = exports.TradeExecutor = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const borsh_1 = require("@project-serum/borsh");
const bn_js_1 = __importDefault(require("bn.js"));
const config_1 = require("./config");
const monitor_1 = require("./monitor");
// Raydium swap instruction layout
const SWAP_INSTRUCTION_LAYOUT = (0, borsh_1.struct)([
    (0, borsh_1.u8)('instruction'),
    (0, borsh_1.u64)('amountIn'),
    (0, borsh_1.u64)('minAmountOut')
]);
class TradeExecutor {
    constructor() {
        this.connection = (0, config_1.getConnection)();
        this.wallet = (0, config_1.getKeypairFromSeed)();
    }
    async executeSale() {
        try {
            console.log('Preparing to execute sale...');
            console.log(`Amount to sell: ${config_1.CONFIG.AMOUNT_TO_SELL} RKIT`);
            // Get pool address
            const poolAddress = monitor_1.monitor.getPoolAddress();
            if (!poolAddress) {
                throw new Error('Pool address not found');
            }
            // Get token accounts
            const sourceTokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(config_1.CONFIG.TOKEN_MINT, this.wallet.publicKey);
            // Create temporary WSOL account for receiving swap output
            const wsolAccount = web3_js_1.Keypair.generate();
            // Calculate amounts
            const amountIn = Math.floor(config_1.CONFIG.AMOUNT_TO_SELL * (10 ** 9)); // Convert to raw amount
            const minAmountOut = 0; // We'll accept any amount of SOL (dangerous in production!)
            // Create swap instruction
            const swapIx = await this.createSwapInstruction(poolAddress, sourceTokenAccount, wsolAccount.publicKey, amountIn, minAmountOut);
            // Create WSOL account
            const rentExempt = await this.connection.getMinimumBalanceForRentExemption(165);
            const createWsolAccountIx = web3_js_1.SystemProgram.createAccount({
                fromPubkey: this.wallet.publicKey,
                newAccountPubkey: wsolAccount.publicKey,
                lamports: rentExempt,
                space: 165,
                programId: spl_token_1.TOKEN_PROGRAM_ID
            });
            // Close WSOL account to reclaim SOL
            const closeWsolAccountIx = (0, spl_token_1.createCloseAccountInstruction)(wsolAccount.publicKey, this.wallet.publicKey, this.wallet.publicKey);
            // Create and sign transaction
            const transaction = new web3_js_1.Transaction();
            transaction.add(createWsolAccountIx);
            transaction.add(swapIx);
            transaction.add(closeWsolAccountIx);
            transaction.feePayer = this.wallet.publicKey;
            transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
            // Sign transaction
            transaction.sign(this.wallet, wsolAccount);
            // Send transaction
            const signature = await this.connection.sendRawTransaction(transaction.serialize(), { skipPreflight: false, maxRetries: 3 });
            // Wait for confirmation
            await this.waitForTransaction(signature);
            console.log('Trade executed successfully!');
            console.log('Transaction signature:', signature);
            return signature;
        }
        catch (error) {
            console.error('Failed to execute trade:', error);
            throw error;
        }
    }
    async createSwapInstruction(poolAddress, sourceTokenAccount, destinationTokenAccount, amountIn, minAmountOut) {
        // Get pool token accounts
        const [authority] = await web3_js_1.PublicKey.findProgramAddress([poolAddress.toBuffer()], config_1.RAYDIUM_PROGRAM_ID);
        const [poolSourceToken] = await web3_js_1.PublicKey.findProgramAddress([poolAddress.toBuffer(), Buffer.from('source')], config_1.RAYDIUM_PROGRAM_ID);
        const [poolDestinationToken] = await web3_js_1.PublicKey.findProgramAddress([poolAddress.toBuffer(), Buffer.from('destination')], config_1.RAYDIUM_PROGRAM_ID);
        // Create instruction data
        const data = Buffer.alloc(SWAP_INSTRUCTION_LAYOUT.span);
        SWAP_INSTRUCTION_LAYOUT.encode({
            instruction: 1, // swap instruction
            amountIn: new bn_js_1.default(amountIn.toString()),
            minAmountOut: new bn_js_1.default(minAmountOut.toString())
        }, data);
        // Create instruction
        return new web3_js_1.TransactionInstruction({
            programId: config_1.RAYDIUM_PROGRAM_ID,
            keys: [
                { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
                { pubkey: poolAddress, isSigner: false, isWritable: true },
                { pubkey: authority, isSigner: false, isWritable: false },
                { pubkey: sourceTokenAccount, isSigner: false, isWritable: true },
                { pubkey: destinationTokenAccount, isSigner: false, isWritable: true },
                { pubkey: poolSourceToken, isSigner: false, isWritable: true },
                { pubkey: poolDestinationToken, isSigner: false, isWritable: true },
                { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: web3_js_1.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
            ],
            data
        });
    }
    async waitForTransaction(signature) {
        try {
            console.log('Waiting for transaction confirmation...');
            const result = await this.connection.confirmTransaction(signature, 'confirmed');
            if (result.value.err) {
                throw new Error(`Transaction failed: ${result.value.err.toString()}`);
            }
            console.log('Transaction confirmed!');
        }
        catch (error) {
            console.error('Failed to confirm transaction:', error);
            throw error;
        }
    }
}
exports.TradeExecutor = TradeExecutor;
// Export a singleton instance
exports.executor = new TradeExecutor();
