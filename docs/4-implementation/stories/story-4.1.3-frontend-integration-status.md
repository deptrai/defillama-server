# MEV Analytics Frontend Integration Status

**Story**: 4.1.3 - Advanced MEV Analytics  
**Date**: 2025-10-16  
**Status**: Backend Complete, Frontend Pending

---

## Current Status Summary

### ✅ Backend API (COMPLETE)

**All 8 MEV API endpoints implemented and operational**:

1. ✅ `GET /v1/analytics/mev/opportunities` - List MEV opportunities
2. ✅ `GET /v1/analytics/mev/opportunities/:id` - Get opportunity by ID
3. ✅ `GET /v1/analytics/mev/stats` - Get MEV statistics
4. ✅ `POST /v1/analytics/mev/detect` - Trigger MEV detection
5. ✅ `POST /v1/analytics/mev/protection/analyze` - Analyze protection (Story 4.1.2)
6. ✅ `GET /v1/analytics/mev/bots` - Bot analytics (Story 4.1.3)
7. ✅ `GET /v1/analytics/mev/protocols/:protocolId/leakage` - Protocol leakage (Story 4.1.3)
8. ✅ `GET /v1/analytics/mev/trends` - Market trends (Story 4.1.3)

**Additional Ingestion API endpoints**:
- ✅ `GET /ingestion/status` - Get ingestion service status
- ✅ `POST /ingestion/start` - Start ingestion service
- ✅ `POST /ingestion/stop` - Stop ingestion service
- ✅ `POST /ingestion/restart/:chain` - Restart specific chain

**Backend Features**:
- ✅ Real-time blockchain integration (5 chains)
- ✅ 5 MEV detectors (sandwich, frontrun, arbitrage, liquidation, backrun)
- ✅ Redis caching (5-10 minute TTL)
- ✅ PostgreSQL database with 42 migrations
- ✅ RPC failover system (38 endpoints)
- ✅ Comprehensive analytics engines
- ✅ Phase 1 detector optimizations (v2.0.0)

### ❌ Frontend Integration (PENDING)

**What's Missing**:
- ❌ No MEV pages in `defillama-app/src/pages/`
- ❌ No MEV components in `defillama-app/src/components/`
- ❌ No MEV routes in navigation
- ❌ No MEV API client code
- ❌ No MEV dashboard UI
- ❌ No MEV charts/visualizations

**What Exists**:
- ✅ `test-mev-frontend.html` - Basic HTML test page (not integrated)
- ✅ Backend API fully functional and tested

---

## Required Frontend Integration

### 1. Pages to Create

**Location**: `defillama-app/src/pages/mev/`

#### 1.1 MEV Dashboard (`/mev`)
```typescript
// defillama-app/src/pages/mev/index.tsx
- Overview of MEV activity
- Total opportunities detected
- Total profit extracted
- Top bots
- Recent opportunities
- Market trends chart
```

#### 1.2 MEV Opportunities List (`/mev/opportunities`)
```typescript
// defillama-app/src/pages/mev/opportunities/index.tsx
- Filterable list of MEV opportunities
- Filters: detector type, chain, profit range, date range
- Sortable columns
- Pagination
- Export to CSV
```

#### 1.3 MEV Opportunity Detail (`/mev/opportunities/[id]`)
```typescript
// defillama-app/src/pages/mev/opportunities/[id].tsx
- Detailed opportunity information
- Transaction details
- Profit breakdown
- Confidence factors
- Related transactions
- Bot information
```

#### 1.4 MEV Bots (`/mev/bots`)
```typescript
// defillama-app/src/pages/mev/bots/index.tsx
- List of MEV bots
- Performance metrics
- Strategy analysis
- Sophistication scores
- Historical performance charts
```

#### 1.5 MEV Protocol Leakage (`/mev/protocols`)
```typescript
// defillama-app/src/pages/mev/protocols/index.tsx
- Protocol leakage overview
- Leakage by protocol
- User impact analysis
- Breakdown by MEV type
- Historical trends
```

#### 1.6 MEV Market Trends (`/mev/trends`)
```typescript
// defillama-app/src/pages/mev/trends/index.tsx
- Market trends over time
- Opportunity distribution
- Bot competition analysis
- Gas price correlation
- Network congestion impact
```

#### 1.7 MEV Protection (`/mev/protection`)
```typescript
// defillama-app/src/pages/mev/protection/index.tsx
- Transaction protection analyzer
- Vulnerability assessment
- Protection recommendations
- Simulation results
- Risk scoring
```

---

### 2. Components to Create

**Location**: `defillama-app/src/components/MEV/`

#### 2.1 Core Components

```typescript
// MEVOpportunityCard.tsx
- Display single MEV opportunity
- Profit, confidence, detector type
- Quick actions (view details, share)

// MEVOpportunitiesList.tsx
- List of opportunities with filters
- Pagination
- Sorting

// MEVStatsCard.tsx
- Display MEV statistics
- Total opportunities, profit, etc.

// MEVBotCard.tsx
- Display bot information
- Performance metrics
- Strategy indicators

// MEVProtocolCard.tsx
- Display protocol leakage
- User impact
- Breakdown chart

// MEVTrendChart.tsx
- Time series chart for trends
- Multiple series support
- Interactive tooltips

// MEVProtectionAnalyzer.tsx
- Transaction input form
- Vulnerability analysis display
- Protection recommendations
```

#### 2.2 Chart Components

```typescript
// MEVProfitChart.tsx
- Profit over time chart
- By detector type
- By chain

// MEVOpportunityDistributionChart.tsx
- Pie/donut chart
- Distribution by type/chain

// MEVBotPerformanceChart.tsx
- Bot performance over time
- Success rate, profit

// MEVProtocolLeakageChart.tsx
- Protocol leakage over time
- Stacked area chart

// MEVGasCorrelationChart.tsx
- Gas price vs MEV activity
- Scatter plot
```

---

### 3. API Client to Create

**Location**: `defillama-app/src/api/categories/mev/`

```typescript
// defillama-app/src/api/categories/mev/client.ts
import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '~/utils/async'

const MEV_API_BASE = 'http://localhost:6060/v1/analytics/mev'

// List opportunities
export const useFetchMEVOpportunities = (params: {
  chain_id?: string
  detector_type?: string
  min_profit?: number
  limit?: number
  offset?: number
}) => {
  const queryString = new URLSearchParams(params as any).toString()
  const url = `${MEV_API_BASE}/opportunities?${queryString}`
  
  return useQuery({
    queryKey: ['mev-opportunities', params],
    queryFn: () => fetchApi(url),
    staleTime: 60 * 1000, // 1 minute
    retry: 2
  })
}

// Get opportunity by ID
export const useFetchMEVOpportunity = (id: string) => {
  return useQuery({
    queryKey: ['mev-opportunity', id],
    queryFn: () => fetchApi(`${MEV_API_BASE}/opportunities/${id}`),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!id
  })
}

// Get MEV stats
export const useFetchMEVStats = (params: {
  chain_id: string
  start_date: string
  end_date: string
}) => {
  const queryString = new URLSearchParams(params).toString()
  const url = `${MEV_API_BASE}/stats?${queryString}`
  
  return useQuery({
    queryKey: ['mev-stats', params],
    queryFn: () => fetchApi(url),
    staleTime: 5 * 60 * 1000 // 5 minutes
  })
}

// Get bot analytics
export const useFetchMEVBots = (params: {
  chain_id?: string
  limit?: number
  offset?: number
}) => {
  const queryString = new URLSearchParams(params as any).toString()
  const url = `${MEV_API_BASE}/bots?${queryString}`
  
  return useQuery({
    queryKey: ['mev-bots', params],
    queryFn: () => fetchApi(url),
    staleTime: 5 * 60 * 1000 // 5 minutes
  })
}

// Get protocol leakage
export const useFetchProtocolLeakage = (
  protocolId: string,
  params: {
    chain_id: string
    date: string
  }
) => {
  const queryString = new URLSearchParams(params).toString()
  const url = `${MEV_API_BASE}/protocols/${protocolId}/leakage?${queryString}`
  
  return useQuery({
    queryKey: ['mev-protocol-leakage', protocolId, params],
    queryFn: () => fetchApi(url),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!protocolId
  })
}

// Get market trends
export const useFetchMEVTrends = (params: {
  chain_id: string
  date: string
}) => {
  const queryString = new URLSearchParams(params).toString()
  const url = `${MEV_API_BASE}/trends?${queryString}`
  
  return useQuery({
    queryKey: ['mev-trends', params],
    queryFn: () => fetchApi(url),
    staleTime: 10 * 60 * 1000 // 10 minutes
  })
}

// Analyze protection
export const useAnalyzeMEVProtection = () => {
  return useMutation({
    mutationFn: (data: {
      transaction: {
        from: string
        to: string
        value: string
        data: string
        gas_price: string
      }
      chain_id: string
    }) => fetchApi(`${MEV_API_BASE}/protection/analyze`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  })
}
```

---

### 4. Navigation Integration

**Location**: `defillama-app/public/pages.json`

```json
{
  "Metrics": [
    {
      "name": "MEV Analytics",
      "route": "/mev",
      "category": "DeFi Metrics",
      "description": "MEV opportunities, bot analytics, protocol leakage, and market trends",
      "tab": "MEV",
      "totalTrackedKey": "mev.opportunities"
    },
    {
      "name": "MEV Opportunities",
      "route": "/mev/opportunities",
      "category": "DeFi Metrics",
      "description": "Browse and analyze MEV opportunities across chains",
      "tab": "MEV"
    },
    {
      "name": "MEV Bots",
      "route": "/mev/bots",
      "category": "DeFi Metrics",
      "description": "MEV bot performance, strategies, and sophistication analysis",
      "tab": "MEV"
    },
    {
      "name": "MEV Protocol Leakage",
      "route": "/mev/protocols",
      "category": "DeFi Metrics",
      "description": "Protocol-level MEV leakage and user impact analysis",
      "tab": "MEV"
    },
    {
      "name": "MEV Market Trends",
      "route": "/mev/trends",
      "category": "DeFi Metrics",
      "description": "MEV market trends, opportunity distribution, and bot competition",
      "tab": "MEV"
    },
    {
      "name": "MEV Protection",
      "route": "/mev/protection",
      "category": "DeFi Metrics",
      "description": "Analyze transactions for MEV vulnerabilities and get protection recommendations",
      "tab": "MEV"
    }
  ]
}
```

---

## Implementation Priority

### Phase 1: Core Pages (High Priority)
1. ✅ MEV Dashboard (`/mev`)
2. ✅ MEV Opportunities List (`/mev/opportunities`)
3. ✅ MEV Opportunity Detail (`/mev/opportunities/[id]`)

### Phase 2: Analytics Pages (Medium Priority)
4. ✅ MEV Bots (`/mev/bots`)
5. ✅ MEV Protocol Leakage (`/mev/protocols`)
6. ✅ MEV Market Trends (`/mev/trends`)

### Phase 3: Advanced Features (Low Priority)
7. ✅ MEV Protection (`/mev/protection`)
8. ✅ Real-time WebSocket integration
9. ✅ Advanced filtering and search
10. ✅ Export functionality

---

## Estimated Effort

**Total Estimated Time**: 40-60 hours

- API Client: 4-6 hours
- Core Components: 8-12 hours
- Chart Components: 6-8 hours
- Pages: 16-24 hours
- Navigation Integration: 2-3 hours
- Testing & Polish: 4-7 hours

---

## Next Steps

1. **Create API Client** (`defillama-app/src/api/categories/mev/client.ts`)
2. **Create Core Components** (`defillama-app/src/components/MEV/`)
3. **Create Pages** (`defillama-app/src/pages/mev/`)
4. **Add Navigation** (Update `pages.json`)
5. **Test Integration** (End-to-end testing)
6. **Deploy** (Production deployment)

---

## Testing Strategy

### Unit Tests
- API client hooks
- Component rendering
- Data transformations

### Integration Tests
- API endpoint connectivity
- Data flow from API to UI
- User interactions

### E2E Tests
- Full user journeys
- Cross-page navigation
- Real-time updates

---

**Status**: Backend Complete, Frontend Pending  
**Last Updated**: 2025-10-16  
**Next Action**: Create API client and core components

