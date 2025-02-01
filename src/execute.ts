import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction,
  SystemProgram,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createCloseAccountInstruction
} from '@solana/spl-token';
import { struct, u8, u64 } from '@project-serum/borsh';
import BN from 'bn.js';
import { 
  CONFIG, 
  RAYDIUM_PROGRAM_ID,
  WSOL_MINT,
  getConnection,
  getKeypairFromSeed
} from './config';
import { monitor } from './monitor';

// Raydium swap instruction layout
const SWAP_INSTRUCTION_LAYOUT = struct([
  u8('instruction'),
  u64('amountIn'),
  u64('minAmountOut')
]);

export class TradeExecutor {
  private connection: Connection;
  private wallet: Keypair;

  constructor() {
    this.connection = getConnection();
    this.wallet = getKeypairFromSeed();
  }

  async executeSale(): Promise<string> {
    try {
      console.log('Preparing to execute sale...');
      console.log(`Amount to sell: ${CONFIG.AMOUNT_TO_SELL} RKIT`);

      // Get pool address
      const poolAddress = monitor.getPoolAddress();
      if (!poolAddress) {
        throw new Error('Pool address not found');
      }

      // Get token accounts
      const sourceTokenAccount = await getAssociatedTokenAddress(
        CONFIG.TOKEN_MINT,
        this.wallet.publicKey
      );

      // Create temporary WSOL account for receiving swap output
      const wsolAccount = Keypair.generate();
      
      // Calculate amounts
      const amountIn = Math.floor(CONFIG.AMOUNT_TO_SELL * (10 ** 9)); // Convert to raw amount
      const minAmountOut = 0; // We'll accept any amount of SOL (dangerous in production!)

      // Create swap instruction
      const swapIx = await this.createSwapInstruction(
        poolAddress,
        sourceTokenAccount,
        wsolAccount.publicKey,
        amountIn,
        minAmountOut
      );

      // Create WSOL account
      const rentExempt = await this.connection.getMinimumBalanceForRentExemption(165);
      const createWsolAccountIx = SystemProgram.createAccount({
        fromPubkey: this.wallet.publicKey,
        newAccountPubkey: wsolAccount.publicKey,
        lamports: rentExempt,
        space: 165,
        programId: TOKEN_PROGRAM_ID
      });

      // Close WSOL account to reclaim SOL
      const closeWsolAccountIx = createCloseAccountInstruction(
        wsolAccount.publicKey,
        this.wallet.publicKey,
        this.wallet.publicKey
      );

      // Create and sign transaction
      const transaction = new Transaction();
      transaction.add(createWsolAccountIx);
      transaction.add(swapIx);
      transaction.add(closeWsolAccountIx);
      
      transaction.feePayer = this.wallet.publicKey;
      transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

      // Sign transaction
      transaction.sign(this.wallet, wsolAccount);

      // Send transaction
      const signature = await this.connection.sendRawTransaction(
        transaction.serialize(),
        { skipPreflight: false, maxRetries: 3 }
      );

      // Wait for confirmation
      await this.waitForTransaction(signature);
      
      console.log('Trade executed successfully!');
      console.log('Transaction signature:', signature);
      
      return signature;

    } catch (error) {
      console.error('Failed to execute trade:', error);
      throw error;
    }
  }

  private async createSwapInstruction(
    poolAddress: PublicKey,
    sourceTokenAccount: PublicKey,
    destinationTokenAccount: PublicKey,
    amountIn: number,
    minAmountOut: number
  ): Promise<TransactionInstruction> {
    // Get pool token accounts
    const [authority] = await PublicKey.findProgramAddress(
      [poolAddress.toBuffer()],
      RAYDIUM_PROGRAM_ID
    );

    const [poolSourceToken] = await PublicKey.findProgramAddress(
      [poolAddress.toBuffer(), Buffer.from('source')],
      RAYDIUM_PROGRAM_ID
    );

    const [poolDestinationToken] = await PublicKey.findProgramAddress(
      [poolAddress.toBuffer(), Buffer.from('destination')],
      RAYDIUM_PROGRAM_ID
    );

    // Create instruction data
    const data = Buffer.alloc(SWAP_INSTRUCTION_LAYOUT.span);
    SWAP_INSTRUCTION_LAYOUT.encode(
      {
        instruction: 1, // swap instruction
        amountIn: new BN(amountIn.toString()),
        minAmountOut: new BN(minAmountOut.toString())
      },
      data
    );

    // Create instruction
    return new TransactionInstruction({
      programId: RAYDIUM_PROGRAM_ID,
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
        { pubkey: poolAddress, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: false, isWritable: false },
        { pubkey: sourceTokenAccount, isSigner: false, isWritable: true },
        { pubkey: destinationTokenAccount, isSigner: false, isWritable: true },
        { pubkey: poolSourceToken, isSigner: false, isWritable: true },
        { pubkey: poolDestinationToken, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
      ],
      data
    });
  }

  private async waitForTransaction(signature: string): Promise<void> {
    try {
      console.log('Waiting for transaction confirmation...');
      
      const result = await this.connection.confirmTransaction(signature, 'confirmed');
      
      if (result.value.err) {
        throw new Error(`Transaction failed: ${result.value.err.toString()}`);
      }

      console.log('Transaction confirmed!');
    } catch (error) {
      console.error('Failed to confirm transaction:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const executor = new TradeExecutor();
