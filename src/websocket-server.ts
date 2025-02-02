import WebSocket, { WebSocketServer } from 'ws';
import { LiquidityMonitor } from './monitor';
import { EventEmitter } from 'events';

interface WebSocketMessage {
  type: 'price' | 'liquidity' | 'status' | 'error';
  data: any;
}

export class MonitorWebSocketServer extends EventEmitter {
  private wss: WebSocketServer;
  private monitor: LiquidityMonitor;
  private updateInterval: NodeJS.Timeout | null = null;
  private clients: Set<WebSocket> = new Set();

  constructor(private port: number = 3001) {
    super();
    this.wss = new WebSocketServer({ port });
    this.monitor = new LiquidityMonitor();
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('Client connected');
      this.clients.add(ws);

      // Send initial status
      this.sendToClient(ws, {
        type: 'status',
        data: { connected: true }
      });

      ws.on('close', () => {
        console.log('Client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.sendToClient(ws, {
          type: 'error',
          data: { message: 'WebSocket error occurred' }
        });
      });
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
      this.emit('error', error);
    });
  }

  private broadcast(message: WebSocketMessage) {
    const messageStr = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  private sendToClient(client: WebSocket, message: WebSocketMessage) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  async start() {
    try {
      await this.monitor.initialize();
      console.log(`WebSocket server started on port ${this.port}`);

      // Start periodic updates
      this.updateInterval = setInterval(async () => {
        try {
          const poolAccount = await this.monitor.getPoolState();
          if (poolAccount) {
            const { price, liquidityUSD } = poolAccount;
            
            this.broadcast({
              type: 'price',
              data: {
                price,
                liquidity: liquidityUSD,
                timestamp: Date.now()
              }
            });

            // Check trading conditions
            const conditionsMet = await this.monitor.checkConditions();
            if (conditionsMet) {
              this.broadcast({
                type: 'status',
                data: {
                  conditionsMet: true,
                  message: 'Trading conditions met!'
                }
              });
            }
          }
        } catch (error) {
          console.error('Error updating price/liquidity:', error);
          this.broadcast({
            type: 'error',
            data: {
              message: 'Failed to update price/liquidity data',
              timestamp: Date.now()
            }
          });
        }
      }, 5000); // Update every 5 seconds

    } catch (error) {
      console.error('Failed to start WebSocket server:', error);
      throw error;
    }
  }

  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.clients.forEach(client => {
      client.close();
    });
    this.clients.clear();

    this.wss.close(() => {
      console.log('WebSocket server stopped');
    });
  }
}

// Export singleton instance
export const wsServer = new MonitorWebSocketServer();
export default wsServer;
