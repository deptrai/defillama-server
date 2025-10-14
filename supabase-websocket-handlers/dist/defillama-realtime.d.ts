/**
 * DeFiLlama Custom WebSocket Handlers for Self-hosted Supabase
 * 100% FREE solution with unlimited connections
 *
 * This file extends Supabase Realtime with DeFiLlama-specific functionality:
 * - Price updates broadcasting
 * - TVL change notifications
 * - Protocol-specific channels
 * - Custom authentication
 * - Performance optimizations for 10,000+ connections
 */
import { RealtimeChannel } from '@supabase/realtime-js';
export interface DeFiLlamaMessage {
    type: 'price_update' | 'tvl_update' | 'protocol_update' | 'alert' | 'liquidation' | 'governance' | 'emission';
    channel: string;
    data: any;
    timestamp: number;
    protocolId?: string;
    tokenId?: string;
    chain?: string;
    userId?: string;
}
export interface ConnectionFilters {
    protocolIds?: string[];
    tokenIds?: string[];
    chains?: string[];
    userId?: string;
    minValue?: number;
    maxValue?: number;
}
export declare class DeFiLlamaWebSocketManager {
    private supabase;
    private realtime;
    private channels;
    private connections;
    private messageQueue;
    constructor(supabaseUrl?: string, supabaseKey?: string, options?: {
        maxConnections?: number;
        messageRateLimit?: number;
        heartbeatInterval?: number;
    });
    private setupEventHandlers;
    connect(): Promise<void>;
    getChannel(channelName: string): RealtimeChannel;
    private setupChannelHandlers;
    private handleBroadcastMessage;
    private processMessage;
    private handlePriceUpdate;
    private handleTvlUpdate;
    private handleProtocolUpdate;
    private handleAlert;
    private handleLiquidation;
    private handleGovernance;
    private handleEmission;
    broadcastToChannel(channelName: string, message: DeFiLlamaMessage): Promise<void>;
    subscribeToChannel(channelName: string, filters?: ConnectionFilters, callback?: (message: DeFiLlamaMessage) => void): Promise<RealtimeChannel>;
    private messageMatchesFilters;
    private storePriceUpdate;
    private storeTvlUpdate;
    private storeProtocolUpdate;
    private storeAlert;
    private storeLiquidation;
    private storeGovernance;
    private storeEmission;
    getConnectionStats(): Promise<{
        totalConnections: number;
        activeChannels: number;
        messagesPerSecond: number;
    }>;
    disconnect(): Promise<void>;
}
export declare const defillama: DeFiLlamaWebSocketManager;
//# sourceMappingURL=defillama-realtime.d.ts.map