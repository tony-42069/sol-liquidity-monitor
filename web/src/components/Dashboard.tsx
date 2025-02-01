import React, { useState, useEffect, useCallback } from 'react';
import websocket from '../services/websocket';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PriceData {
  price: number;
  liquidity: number;
  timestamp: number;
}

const Dashboard: React.FC = () => {
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [currentLiquidity, setCurrentLiquidity] = useState<number>(0);
  const [priceHistory, setPriceHistory] = useState<PriceData[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const handlePriceUpdate = useCallback((data: { price: number, liquidity: number }) => {
    const timestamp = Date.now();
    setCurrentPrice(data.price);
    setCurrentLiquidity(data.liquidity);
    setPriceHistory(prev => [...prev, { ...data, timestamp }].slice(-50)); // Keep last 50 points
  }, []);

  const handleStatusUpdate = useCallback((data: { connected: boolean }) => {
    setIsConnected(data.connected);
  }, []);

  useEffect(() => {
    // Set up WebSocket listeners
    websocket.on('price', handlePriceUpdate);
    websocket.on('status', handleStatusUpdate);

    // Connect to WebSocket
    websocket.connect();

    // Cleanup on unmount
    return () => {
      websocket.off('price', handlePriceUpdate);
      websocket.off('status', handleStatusUpdate);
      websocket.disconnect();
    };
  }, [handlePriceUpdate, handleStatusUpdate]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'RKIT/SOL Price',
        color: 'white',
      },
    },
    scales: {
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'white',
        },
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'white',
        },
      },
    },
  };

  const chartData = {
    labels: priceHistory.map(data => 
      new Date(data.timestamp).toLocaleTimeString()
    ),
    datasets: [
      {
        label: 'Price (USD)',
        data: priceHistory.map(data => data.price),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Card */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Status</h2>
          <div className="flex items-center space-x-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400">Current Price</p>
              <p className="text-2xl font-bold">${currentPrice.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-400">Liquidity</p>
              <p className="text-2xl font-bold">${currentLiquidity.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Target Range Card */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Target Range</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400">Min Price</p>
              <p className="text-2xl font-bold">$4.00</p>
            </div>
            <div>
              <p className="text-gray-400">Max Price</p>
              <p className="text-2xl font-bold">$5.00</p>
            </div>
            <div>
              <p className="text-gray-400">Min Liquidity</p>
              <p className="text-2xl font-bold">$300,000</p>
            </div>
            <div>
              <p className="text-gray-400">Amount to Sell</p>
              <p className="text-2xl font-bold">24,084.46 RKIT</p>
            </div>
          </div>
        </div>

        {/* Price Chart */}
        <div className="card col-span-1 md:col-span-2">
          <h2 className="text-xl font-bold mb-4">Price History</h2>
          <div className="h-[400px]">
            <Line options={chartOptions} data={chartData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
