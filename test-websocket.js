const io = require('socket.io-client');

console.log('🔗 Connecting to DeFiLlama WebSocket Server...');

const socket = io('http://localhost:8082', {
  transports: ['websocket', 'polling'],
  timeout: 5000
});

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
  console.log('Socket ID:', socket.id);
  
  // Test authentication
  console.log('🔐 Testing authentication...');
  socket.emit('authenticate', {
    apiKey: 'defillama-dev-key-2024',
    userId: 'test-user-123'
  });
});

socket.on('authenticated', (data) => {
  console.log('✅ Authentication successful:', data);
  
  // Test subscription
  console.log('📡 Testing channel subscription...');
  socket.emit('subscribe', {
    channel: 'price_updates',
    filters: {
      tokenIds: ['ethereum', 'bitcoin'],
      minValue: 1000
    }
  });
});

socket.on('subscribed', (data) => {
  console.log('✅ Subscription successful:', data);
  
  // Test publishing a message
  console.log('📤 Testing message publishing...');
  socket.emit('publish', {
    channel: 'price_updates',
    message: {
      type: 'price_update',
      data: {
        tokenId: 'ethereum',
        price: 2500.50,
        change24h: 5.2,
        volume24h: 15000000000,
        marketCap: 300000000000
      }
    }
  });
});

socket.on('message', (data) => {
  console.log('📨 Received message:', JSON.stringify(data, null, 2));
});

socket.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});

// Test for 10 seconds then disconnect
setTimeout(() => {
  console.log('🏁 Test completed, disconnecting...');
  socket.disconnect();
  process.exit(0);
}, 10000);
