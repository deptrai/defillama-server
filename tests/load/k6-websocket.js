/**
 * k6 Load Testing Script - WebSocket
 * 
 * Description: Load test for DeFiLlama WebSocket connections
 * Author: Augment Agent (Claude Sonnet 4)
 * Version: 1.0
 * Date: 2025-10-14
 * 
 * Target: 10,000 concurrent connections, <100ms latency
 * 
 * Usage: k6 run tests/load/k6-websocket.js
 */

import ws from 'k6/ws';
import { check } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const wsConnections = new Counter('ws_connections');
const wsMessages = new Counter('ws_messages');
const wsLatency = new Trend('ws_latency');
const wsErrors = new Rate('ws_errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 },    // Ramp up to 100 connections
    { duration: '5m', target: 1000 },   // Ramp up to 1,000 connections
    { duration: '10m', target: 5000 },  // Ramp up to 5,000 connections
    { duration: '5m', target: 10000 },  // Ramp up to 10,000 connections
    { duration: '10m', target: 10000 }, // Stay at 10,000 connections
    { duration: '5m', target: 0 },      // Ramp down to 0 connections
  ],
  thresholds: {
    ws_latency: ['p(95)<100'],          // 95% of messages < 100ms
    ws_errors: ['rate<0.01'],           // Error rate < 1%
  },
};

// Base URL
const WS_URL = __ENV.WS_URL || 'ws://localhost:3000/ws';

export default function () {
  const startTime = Date.now();
  
  const res = ws.connect(WS_URL, {}, function (socket) {
    wsConnections.add(1);
    
    socket.on('open', function () {
      console.log('WebSocket connection established');
      
      // Subscribe to TVL updates
      socket.send(JSON.stringify({
        type: 'subscribe',
        channel: 'tvl'
      }));
      
      // Send ping every 10 seconds
      socket.setInterval(function () {
        const pingStart = Date.now();
        socket.send(JSON.stringify({ type: 'ping' }));
        
        socket.on('message', function (data) {
          const latency = Date.now() - pingStart;
          wsLatency.add(latency);
          wsMessages.add(1);
        });
      }, 10000);
    });
    
    socket.on('message', function (data) {
      try {
        const message = JSON.parse(data);
        
        check(message, {
          'message has type': (m) => m.type !== undefined,
          'message is valid JSON': () => true,
        });
        
        wsMessages.add(1);
      } catch (e) {
        wsErrors.add(1);
      }
    });
    
    socket.on('error', function (e) {
      console.log('WebSocket error:', e);
      wsErrors.add(1);
    });
    
    socket.on('close', function () {
      console.log('WebSocket connection closed');
    });
    
    // Keep connection open for 30 seconds
    socket.setTimeout(function () {
      socket.close();
    }, 30000);
  });
  
  check(res, {
    'WebSocket connection successful': (r) => r && r.status === 101,
  });
}

