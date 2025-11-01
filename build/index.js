"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const monitor_1 = require("./monitor");
const execute_1 = require("./execute");
const config_1 = require("./config");
const websocket_server_1 = require("./websocket-server");
async function main() {
    try {
        console.log('\n=== RKIT/SOL Liquidity Monitor ===');
        console.log(`Monitoring price range: $${config_1.CONFIG.PRICE_RANGE.MIN} - $${config_1.CONFIG.PRICE_RANGE.MAX}`);
        console.log(`Required liquidity: $${config_1.CONFIG.MIN_LIQUIDITY_USD}`);
        console.log(`Amount to sell: ${config_1.CONFIG.AMOUNT_TO_SELL} RKIT`);
        console.log('================================\n');
        // Initialize pool monitoring and WebSocket server
        console.log('Initializing...');
        await monitor_1.monitor.initialize();
        await websocket_server_1.wsServer.start();
        console.log('Initialization complete\n');
        // Start monitoring loop
        console.log('Starting monitoring loop...');
        console.log('Press Ctrl+C to exit\n');
        while (true) {
            try {
                // Check conditions
                const conditionsMet = await monitor_1.monitor.checkConditions();
                if (conditionsMet) {
                    console.log('\nTrading conditions met! Executing sale...\n');
                    // Execute the sale
                    const txId = await execute_1.executor.executeSale();
                    console.log('\nSale executed successfully!');
                    console.log('Transaction ID:', txId);
                    console.log('\nMonitoring complete. Exiting...');
                    // Exit after successful execution
                    process.exit(0);
                }
                // Wait before next check
                await new Promise(resolve => setTimeout(resolve, config_1.CONFIG.CHECK_INTERVAL));
            }
            catch (error) {
                console.error('Error in monitoring loop:', error);
                // Continue monitoring even if there's an error
                await new Promise(resolve => setTimeout(resolve, config_1.CONFIG.CHECK_INTERVAL));
            }
        }
    }
    catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}
// Handle cleanup on exit
process.on('SIGINT', () => {
    console.log('\nGracefully shutting down...');
    websocket_server_1.wsServer.stop();
    process.exit(0);
});
// Start the application
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
