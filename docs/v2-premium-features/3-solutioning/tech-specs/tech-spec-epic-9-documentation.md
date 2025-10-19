# Technical Specification: EPIC-9 Documentation

**Document Version**: 1.0  
**Date**: 2025-10-19  
**Author**: Technical Team  
**Status**: Draft for Development  
**EPIC ID**: EPIC-9

---

## Table of Contents

1. [Overview](#1-overview)
2. [Documentation Architecture](#2-documentation-architecture)
3. [API Documentation](#3-api-documentation)
4. [User Documentation](#4-user-documentation)
5. [Developer Documentation](#5-developer-documentation)
6. [Documentation Tools](#6-documentation-tools)
7. [Deployment](#7-deployment)

---

## 1. Overview

### 1.1 Purpose

EPIC-9 provides comprehensive documentation for all features, APIs, and developer resources. This EPIC ensures that users and developers can easily understand and use the platform.

### 1.2 Scope

**Features**:
- F-035: API Documentation (10 points)
- F-036: User Documentation (10 points)
- F-037: Developer Documentation (5 points)

**Total**: 3 features, 25 story points

### 1.3 Business Value

- **User Onboarding**: Reduce time to first value (TTFV) by 50%
- **Developer Adoption**: Increase API adoption by 3x
- **Support Reduction**: Reduce support tickets by 40%
- **Self-Service**: 80%+ users can self-serve without support

### 1.4 Success Metrics

- 100% API coverage (all endpoints documented)
- 90%+ developer satisfaction (NPS >50)
- 80%+ user self-service rate
- <5 support tickets/week related to documentation

---

## 2. Documentation Architecture

### 2.1 Documentation Structure

```
docs.defillama.com/
├── api/                    # API Documentation (F-035)
│   ├── reference/          # OpenAPI specs
│   ├── guides/             # Integration guides
│   ├── examples/           # Code samples
│   └── changelog/          # API changelog
├── user/                   # User Documentation (F-036)
│   ├── getting-started/    # Onboarding guides
│   ├── features/           # Feature tutorials
│   ├── faq/                # FAQs
│   └── troubleshooting/    # Troubleshooting guides
└── developer/              # Developer Documentation (F-037)
    ├── architecture/       # System architecture
    ├── deployment/         # Deployment guides
    ├── runbooks/           # Incident runbooks
    └── contributing/       # Contributing guides
```

### 2.2 Technology Stack

- **Documentation Platform**: Docusaurus 3.0 (React-based)
- **API Documentation**: OpenAPI 3.0 + Swagger UI
- **Search**: Algolia DocSearch
- **Hosting**: Vercel (CDN, auto-deploy)
- **Version Control**: Git (same repo as code)
- **Analytics**: Google Analytics 4

---

## 3. API Documentation (F-035)

### 3.1 OpenAPI Specification

**Coverage**: 100% of API endpoints

**Specification Files**:
- `openapi-spec-v2.0.yaml` - Main API spec (all endpoints)
- `openapi-portfolio-api.yaml` - Portfolio API spec
- `openapi-tax-api.yaml` - Tax API spec

**Example Endpoint Documentation**:
```yaml
/v2/alerts/whale-movements:
  post:
    summary: Create whale movement alert
    description: Create a real-time alert for large wallet movements
    operationId: createWhaleAlert
    tags:
      - Alerts
    security:
      - ApiKeyAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/WhaleAlertRequest'
          examples:
            basic:
              summary: Basic whale alert
              value:
                walletAddress: "0x1234..."
                threshold: 100000
                chains: ["ethereum", "arbitrum"]
    responses:
      '201':
        description: Alert created successfully
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/WhaleAlertResponse'
      '400':
        description: Invalid request
      '401':
        description: Unauthorized
      '429':
        description: Rate limit exceeded
```

### 3.2 Interactive API Explorer

**Tool**: Swagger UI (embedded in docs site)

**Features**:
- Try API calls directly from browser
- Authentication (API key, OAuth 2.0)
- Request/response examples
- Error code documentation

**URL**: `https://docs.defillama.com/api/reference`

### 3.3 Code Samples

**Languages**: JavaScript, Python, cURL

**Example**:
```javascript
// JavaScript (Node.js)
const axios = require('axios');

const createWhaleAlert = async () => {
  const response = await axios.post(
    'https://api.defillama.com/v2/alerts/whale-movements',
    {
      walletAddress: '0x1234...',
      threshold: 100000,
      chains: ['ethereum', 'arbitrum']
    },
    {
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
};
```

```python
# Python
import requests

def create_whale_alert():
    response = requests.post(
        'https://api.defillama.com/v2/alerts/whale-movements',
        json={
            'walletAddress': '0x1234...',
            'threshold': 100000,
            'chains': ['ethereum', 'arbitrum']
        },
        headers={
            'Authorization': 'Bearer YOUR_API_KEY',
            'Content-Type': 'application/json'
        }
    )
    return response.json()
```

```bash
# cURL
curl -X POST https://api.defillama.com/v2/alerts/whale-movements \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x1234...",
    "threshold": 100000,
    "chains": ["ethereum", "arbitrum"]
  }'
```

### 3.4 Authentication Guides

**Topics**:
- API Key authentication (Standard/Pro/Premium tiers)
- OAuth 2.0 authentication (Enterprise tier)
- Rate limiting (tier-based limits)
- Error handling (common errors, retry logic)

---

## 4. User Documentation (F-036)

### 4.1 Getting Started Guides

**Topics**:
1. **Quick Start** (5 min)
   - Sign up for account
   - Choose pricing tier
   - Connect first wallet
   - Set up first alert

2. **Onboarding Tutorial** (15 min)
   - Connect multiple wallets
   - Set up whale alerts
   - Track portfolio
   - Generate tax report

3. **Video Tutorials** (YouTube)
   - Platform overview (3 min)
   - Setting up alerts (5 min)
   - Portfolio tracking (7 min)
   - Tax reporting (10 min)

### 4.2 Feature Tutorials

**Coverage**: All 25 user-facing features

**Example Tutorial Structure**:
```markdown
# Whale Movement Alerts

## Overview
Track large wallet movements across 100+ chains in real-time.

## Use Cases
- Follow whale wallets
- Detect market-moving events
- Copy whale strategies

## Step-by-Step Guide
1. Navigate to Alerts → Whale Movements
2. Click "Create Alert"
3. Enter wallet address or select from top whales
4. Set threshold ($100K, $1M, $10M)
5. Select chains to monitor
6. Choose notification channels (email, SMS, push, webhook)
7. Click "Create Alert"

## Tips & Best Practices
- Start with $1M threshold to reduce noise
- Monitor 5-10 whale wallets max
- Use webhook for automated trading

## Troubleshooting
- Alert not triggering? Check wallet address and threshold
- Too many alerts? Increase threshold or reduce wallets
```

### 4.3 FAQs

**Categories**:
- Account & Billing (20 questions)
- Alerts & Notifications (30 questions)
- Portfolio Tracking (25 questions)
- Tax Reporting (35 questions)
- Gas & Trading (20 questions)
- Security & Risk (15 questions)
- Technical Issues (25 questions)

**Total**: 170 FAQs

### 4.4 Troubleshooting Guides

**Common Issues**:
- Wallet not syncing
- Alerts not triggering
- Tax report errors
- Portfolio value incorrect
- API errors

---

## 5. Developer Documentation (F-037)

### 5.1 Architecture Documentation

**Topics**:
- System architecture overview
- Microservices architecture
- Data flow diagrams
- Database schema
- API architecture
- Event-driven architecture (EventBridge)

**Example**:
```markdown
# System Architecture

## Overview
DeFiLlama Premium Features v2.0 uses a microservices architecture with event-driven integration.

## Architecture Diagram
[Insert architecture diagram]

## Services
- **Alert Service**: Real-time alert processing
- **Portfolio Service**: Portfolio tracking and analytics
- **Tax Service**: Tax reporting and calculations
- **Trading Service**: Gas optimization and trading
- **Security Service**: Security scanning and risk scoring
- **Analytics Service**: Advanced analytics and AI

## Data Flow
1. User creates alert via API
2. Alert Service stores alert in PostgreSQL
3. Alert Service subscribes to EventBridge events
4. Blockchain data ingested via Kafka
5. Alert Service evaluates rules
6. Alert triggered → Notification Service
7. Notification sent via SendGrid/Twilio/FCM
```

### 5.2 Deployment Guides

**Topics**:
- Local development setup
- CI/CD pipeline (GitHub Actions)
- Infrastructure as Code (AWS CDK)
- Multi-region deployment
- Blue-green deployment
- Rollback procedures

### 5.3 Runbooks

**Coverage**: All critical incidents

**Example Runbook**:
```markdown
# Runbook: Alert Service Down

## Symptoms
- Alerts not triggering
- Alert API returning 503 errors
- CloudWatch alarms firing

## Diagnosis
1. Check ECS service health: `aws ecs describe-services --cluster premium-prod --services alert-service`
2. Check CloudWatch logs: `aws logs tail /aws/ecs/alert-service --follow`
3. Check database connection: `psql -h db.prod.defillama.com -U admin -d premium`

## Resolution
1. **If ECS tasks failing**: Restart service
   ```bash
   aws ecs update-service --cluster premium-prod --service alert-service --force-new-deployment
   ```

2. **If database connection issues**: Check RDS status
   ```bash
   aws rds describe-db-instances --db-instance-identifier premium-prod
   ```

3. **If EventBridge issues**: Check event bus
   ```bash
   aws events describe-event-bus --name premium-events
   ```

## Escalation
- If issue persists >15 min, escalate to on-call engineer
- If data loss suspected, escalate to CTO immediately

## Post-Incident
- Create incident report
- Update runbook with lessons learned
```

---

## 6. Documentation Tools

### 6.1 Docusaurus Configuration

**Features**:
- Versioned docs (v1, v2)
- Dark mode support
- Mobile-responsive
- Search (Algolia)
- Analytics (Google Analytics 4)

**Configuration**:
```javascript
// docusaurus.config.js
module.exports = {
  title: 'DeFiLlama Premium Docs',
  tagline: 'Comprehensive DeFi analytics and management',
  url: 'https://docs.defillama.com',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'DefiLlama',
  projectName: 'defillama-premium-docs',
  themeConfig: {
    navbar: {
      title: 'DeFiLlama Premium',
      logo: {
        alt: 'DeFiLlama Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'doc',
          docId: 'intro',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/api',
          label: 'API',
          position: 'left',
        },
        {
          href: 'https://github.com/DefiLlama/defillama-server',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    algolia: {
      appId: 'YOUR_APP_ID',
      apiKey: 'YOUR_SEARCH_API_KEY',
      indexName: 'defillama-premium',
    },
  },
};
```

---

## 7. Deployment

### 7.1 Deployment Strategy

**Platform**: Vercel (auto-deploy on Git push)

**Workflow**:
1. Developer updates docs (Markdown files)
2. Push to Git (main branch)
3. Vercel auto-deploys to production
4. Algolia re-indexes docs (webhook)
5. CloudFlare CDN cache invalidated

**URL**: `https://docs.defillama.com`

### 7.2 Versioning

**Strategy**: Semantic versioning (v1, v2, v3)

**URL Structure**:
- Latest: `https://docs.defillama.com/`
- v2: `https://docs.defillama.com/v2/`
- v1: `https://docs.defillama.com/v1/`

---

**END OF DOCUMENT**

