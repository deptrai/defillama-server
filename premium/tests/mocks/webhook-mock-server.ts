import express, { Express, Request, Response } from 'express';
import { Server } from 'http';

/**
 * Webhook Mock Server
 * 
 * Simulates a generic webhook endpoint for testing notification delivery.
 * Port: 3102 (as per PORT-ALLOCATION.md)
 */

interface WebhookRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  timestamp: string;
}

export class WebhookMockServer {
  private app: Express;
  private server: Server | null = null;
  private requests: WebhookRequest[] = [];
  private requestIdCounter = 1;
  private port: number;

  constructor(port: number = 3102) {
    this.port = port;
    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Generic webhook endpoint (POST)
    this.app.post('/webhook/:id', (req: Request, res: Response) => {
      const webhookId = req.params.id;
      const request: WebhookRequest = {
        id: `req_${this.requestIdCounter++}`,
        url: `/webhook/${webhookId}`,
        method: 'POST',
        headers: req.headers as Record<string, string>,
        body: req.body,
        timestamp: new Date().toISOString(),
      };

      this.requests.push(request);

      res.status(200).json({
        success: true,
        message: 'Webhook received',
        requestId: request.id,
      });
    });

    // Generic webhook endpoint (GET)
    this.app.get('/webhook/:id', (req: Request, res: Response) => {
      const webhookId = req.params.id;
      const request: WebhookRequest = {
        id: `req_${this.requestIdCounter++}`,
        url: `/webhook/${webhookId}`,
        method: 'GET',
        headers: req.headers as Record<string, string>,
        body: req.query,
        timestamp: new Date().toISOString(),
      };

      this.requests.push(request);

      res.status(200).json({
        success: true,
        message: 'Webhook received',
        requestId: request.id,
      });
    });

    // Get all webhook requests
    this.app.get('/requests', (req: Request, res: Response) => {
      res.json({
        total: this.requests.length,
        requests: this.requests,
      });
    });

    // Get webhook requests by ID
    this.app.get('/requests/:webhookId', (req: Request, res: Response) => {
      const webhookId = req.params.webhookId;
      const filtered = this.requests.filter(r => r.url.includes(webhookId));
      
      res.json({
        total: filtered.length,
        requests: filtered,
      });
    });

    // Clear all webhook requests
    this.app.delete('/requests', (req: Request, res: Response) => {
      const count = this.requests.length;
      this.requests = [];
      this.requestIdCounter = 1;
      
      res.json({
        success: true,
        message: `Cleared ${count} webhook requests`,
      });
    });

    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        service: 'webhook-mock-server',
        port: this.port,
        totalRequests: this.requests.length,
        uptime: process.uptime(),
      });
    });
  }

  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`Webhook Mock Server listening on port ${this.port}`);
        console.log(`Webhook endpoint: http://localhost:${this.port}/webhook/:id`);
        console.log(`Requests endpoint: http://localhost:${this.port}/requests`);
        console.log(`Health check: http://localhost:${this.port}/health`);
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close((err) => {
          if (err) {
            // Ignore "Server is not running" error
            if (err.message && err.message.includes('Server is not running')) {
              console.log('Webhook Mock Server already stopped');
            } else {
              console.warn('Error stopping Webhook Mock Server:', err.message);
            }
          } else {
            console.log('Webhook Mock Server stopped');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  public getRequests(): WebhookRequest[] {
    return this.requests;
  }

  public getRequestsByWebhookId(webhookId: string): WebhookRequest[] {
    return this.requests.filter(r => r.url.includes(webhookId));
  }

  public clearRequests(): void {
    this.requests = [];
    this.requestIdCounter = 1;
  }

  public getPort(): number {
    return this.port;
  }
}

// Export singleton instance for testing
let webhookMockServerInstance: WebhookMockServer | null = null;

export function getWebhookMockServer(port: number = 3102): WebhookMockServer {
  if (!webhookMockServerInstance) {
    webhookMockServerInstance = new WebhookMockServer(port);
  }
  return webhookMockServerInstance;
}

export function resetWebhookMockServer(): void {
  webhookMockServerInstance = null;
}

// CLI usage
if (require.main === module) {
  const port = parseInt(process.env.PORT || '3102');
  const server = new WebhookMockServer(port);
  
  server.start().then(() => {
    console.log('\n=== Webhook Mock Server Started ===');
    console.log(`Port: ${port}`);
    console.log('\nEndpoints:');
    console.log(`  POST http://localhost:${port}/webhook/:id`);
    console.log(`  GET  http://localhost:${port}/webhook/:id`);
    console.log(`  GET  http://localhost:${port}/requests`);
    console.log(`  GET  http://localhost:${port}/requests/:webhookId`);
    console.log(`  DELETE http://localhost:${port}/requests`);
    console.log(`  GET  http://localhost:${port}/health`);
    console.log('\nExample:');
    console.log(`  curl -X POST http://localhost:${port}/webhook/test -H "Content-Type: application/json" -d '{"message":"Hello"}'`);
    console.log(`  curl http://localhost:${port}/requests`);
    console.log('\nPress Ctrl+C to stop\n');
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  });
}

