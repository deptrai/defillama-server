import { successResponse, wrap, IResponse } from "./utils/shared";
import fetch from 'node-fetch';

/**
 * Local Price Service Handler
 * Redirects price requests to local price service instead of AWS
 */
const handler = async (event: any): Promise<IResponse> => {
  try {
    const requestedCoins = (event.pathParameters?.coins ?? "").split(",");
    const localPriceServiceUrl = process.env.LOCAL_PRICE_SERVICE_URL || 'http://localhost:3008';
    
    console.log(`🔄 Redirecting price request to local service: ${localPriceServiceUrl}`);
    console.log(`📊 Requested coins: ${requestedCoins.join(', ')}`);
    
    // Call local price service
    const response = await fetch(`${localPriceServiceUrl}/prices/current/${requestedCoins.join(',')}`);
    
    if (!response.ok) {
      throw new Error(`Local price service error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Transform response to match DeFiLlama format
    const transformedResponse = {};
    
    if (data.coins) {
      Object.keys(data.coins).forEach(coinId => {
        const coin = data.coins[coinId];
        transformedResponse[coinId] = {
          decimals: coin.decimals || 18,
          price: coin.price,
          symbol: coin.symbol,
          timestamp: Math.floor(coin.timestamp / 1000), // Convert to seconds
          confidence: coin.confidence || 0.99
        };
      });
    }
    
    console.log(`✅ Successfully fetched ${Object.keys(transformedResponse).length} prices from local service`);
    
    return successResponse({
      coins: transformedResponse
    }, 10 * 60); // Cache for 10 minutes
    
  } catch (error) {
    console.error('❌ Local price service error:', error);
    
    // Fallback response with mock data
    const requestedCoins = (event.pathParameters?.coins ?? "").split(",");
    const fallbackResponse = {};
    
    requestedCoins.forEach(coinId => {
      fallbackResponse[coinId] = {
        decimals: 18,
        price: Math.random() * 1000, // Random price for demo
        symbol: coinId.split(':')[1]?.toUpperCase() || 'UNKNOWN',
        timestamp: Math.floor(Date.now() / 1000),
        confidence: 0.5
      };
    });
    
    return successResponse({
      coins: fallbackResponse,
      error: 'Using fallback data - local price service unavailable'
    }, 60); // Short cache for fallback
  }
};

export default wrap(handler);
