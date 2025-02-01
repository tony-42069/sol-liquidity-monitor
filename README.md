# Solana Liquidity Monitor

A monitoring tool for RKIT/SOL liquidity pool on Raydium. Automatically executes a trade when specified price and liquidity conditions are met.

## Features

- Real-time monitoring of RKIT/SOL pool on Raydium
- Price monitoring within specified range ($4.00-$5.00)
- Liquidity monitoring (minimum $300,000)
- Automatic trade execution when conditions are met
- Direct Solana program interaction for reliable execution

## Prerequisites

- Node.js (Latest LTS version)
- NPM or Yarn
- Solana wallet with seed phrase

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd sol-liquidity-monitor
```

2. Install dependencies:
```bash
npm install
```

3. Create a .env file with your wallet's seed phrase:
```bash
WALLET_SEED_PHRASE="your twelve word seed phrase here"
```

## Configuration

The main configuration is in `src/config.ts`. The default settings are:

- Price Range: $4.00-$5.00
- Minimum Liquidity: $300,000
- Amount to Sell: 24,084.46 RKIT
- Check Interval: 5 seconds

## Usage

1. Start the monitor:
```bash
npm run monitor
```

2. The monitor will:
   - Connect to Solana mainnet
   - Find the RKIT/SOL pool
   - Monitor price and liquidity conditions
   - Execute trade automatically when conditions are met

## Development

- `npm run dev` - Run with hot reloading
- `npm run build` - Build the project
- `npm run clean` - Clean build artifacts

## Security

- Keep your seed phrase secure
- Never share your .env file
- The monitor will only execute one trade and then exit

## Error Handling

The monitor includes:
- Automatic retries for failed transactions
- Error logging
- Graceful shutdown on Ctrl+C

## License

ISC
