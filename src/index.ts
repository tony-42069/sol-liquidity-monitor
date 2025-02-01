import { monitor } from './monitor';
import { executor } from './execute';
import { CONFIG } from './config';

async function main() {
  try {
    console.log('\n=== RKIT/SOL Liquidity Monitor ===');
    console.log(`Monitoring price range: $${CONFIG.PRICE_RANGE.MIN} - $${CONFIG.PRICE_RANGE.MAX}`);
    console.log(`Required liquidity: $${CONFIG.MIN_LIQUIDITY_USD}`);
    console.log(`Amount to sell: ${CONFIG.AMOUNT_TO_SELL} RKIT`);
    console.log('================================\n');

    // Initialize pool monitoring
    console.log('Initializing...');
    await monitor.initialize();
    console.log('Initialization complete\n');

    // Start monitoring loop
    console.log('Starting monitoring loop...');
    console.log('Press Ctrl+C to exit\n');

    while (true) {
      try {
        // Check conditions
        const conditionsMet = await monitor.checkConditions();
        
        if (conditionsMet) {
          console.log('\nTrading conditions met! Executing sale...\n');
          
          // Execute the sale
          const txId = await executor.executeSale();
          
          console.log('\nSale executed successfully!');
          console.log('Transaction ID:', txId);
          console.log('\nMonitoring complete. Exiting...');
          
          // Exit after successful execution
          process.exit(0);
        }
        
        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, CONFIG.CHECK_INTERVAL));
        
      } catch (error) {
        console.error('Error in monitoring loop:', error);
        // Continue monitoring even if there's an error
        await new Promise(resolve => setTimeout(resolve, CONFIG.CHECK_INTERVAL));
      }
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\nGracefully shutting down...');
  process.exit(0);
});

// Start the application
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
