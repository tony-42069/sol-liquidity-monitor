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
Object.defineProperty(exports, "__esModule", { value: true });
exports.wsServer = exports.MonitorWebSocketServer = void 0;
const ws_1 = __importStar(require("ws"));
const monitor_1 = require("./monitor");
const events_1 = require("events");
class MonitorWebSocketServer extends events_1.EventEmitter {
    constructor(port = 3001) {
        super();
        this.port = port;
        this.updateInterval = null;
        this.clients = new Set();
        this.wss = new ws_1.WebSocketServer({ port });
        this.monitor = new monitor_1.LiquidityMonitor();
        this.setupWebSocketServer();
    }
    setupWebSocketServer() {
        this.wss.on('connection', (ws) => {
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
    broadcast(message) {
        const messageStr = JSON.stringify(message);
        this.clients.forEach(client => {
            if (client.readyState === ws_1.default.OPEN) {
                client.send(messageStr);
            }
        });
    }
    sendToClient(client, message) {
        if (client.readyState === ws_1.default.OPEN) {
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
                }
                catch (error) {
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
        }
        catch (error) {
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
exports.MonitorWebSocketServer = MonitorWebSocketServer;
// Export singleton instance
exports.wsServer = new MonitorWebSocketServer();
exports.default = exports.wsServer;
