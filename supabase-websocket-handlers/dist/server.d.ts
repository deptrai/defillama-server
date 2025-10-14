/**
 * DeFiLlama WebSocket Server for Self-hosted Supabase
 * 100% FREE solution with unlimited connections
 *
 * This server acts as a bridge between DeFiLlama services and Supabase Realtime
 * Handles 10,000+ concurrent connections with <100ms latency
 */
import { Server as SocketIOServer } from 'socket.io';
import { DeFiLlamaWebSocketManager } from './defillama-realtime';
declare const app: import("express-serve-static-core").Express;
declare const server: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
declare const io: SocketIOServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
declare const wsManager: DeFiLlamaWebSocketManager;
export { app, server, io, wsManager };
//# sourceMappingURL=server.d.ts.map