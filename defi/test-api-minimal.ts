/**
 * Minimal API Server Test
 * Test HyperExpress server without any routes
 */

import HyperExpress from 'hyper-express';

const PORT = 5010;

async function startMinimalServer() {
  console.log('🚀 Starting Minimal API Server Test...\n');
  
  try {
    // Create minimal server
    const server = new HyperExpress.Server();
    
    // Health check endpoint
    server.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'Minimal API server is running'
      });
    });
    
    // Start server
    await server.listen(PORT);
    
    console.log('✅ Server started successfully!');
    console.log(`📡 Listening on: http://localhost:${PORT}`);
    console.log(`🔍 Test with: curl http://localhost:${PORT}/health`);
    console.log('\nPress Ctrl+C to stop server\n');
    
  } catch (error) {
    console.error('❌ Server failed to start:', error);
    process.exit(1);
  }
}

startMinimalServer();

