# DeFiLlama Premium Features v2.0

**Serverless Lambda functions for premium features**: Alerts, Tax, Portfolio, Gas, Security, Analytics

**Based on**: Existing DeFiLlama infrastructure (defi/serverless.yml, coins/serverless.yml)

---

## 📋 **Architecture Overview**

### **Infrastructure Reuse** (95%)
- ✅ **Redis ElastiCache**: Shared cluster (cache.r7g.large), use DB 1-5 for premium
- ✅ **VPC & Security Groups**: Reuse existing VPC from DeFi service
- ✅ **SQS Queues**: Reuse existing alert queue, event queue
- ✅ **API Gateway**: Extend existing API Gateway v2 with `/v2/premium/*` paths
- ✅ **CloudWatch & X-Ray**: Reuse existing monitoring setup
- 🔨 **PostgreSQL RDS**: NEW separate instance for premium (isolation)
- 🔨 **S3 Bucket**: NEW bucket for tax reports, portfolio exports

### **Technology Stack**
- **Runtime**: Node.js 20.x (same as DeFi/Coins services)
- **Framework**: Serverless Framework (same deployment tool)
- **Database**: PostgreSQL 16+ with `postgres` library (NOT `pg`)
- **Cache**: Redis 7.x ElastiCache (shared cluster, DB 1-5)
- **Deployment**: `serverless deploy` (same as existing services)

---

## 🚀 **Quick Start**

### **1. Prerequisites**
```bash
# Install dependencies
npm install

# Copy environment variables
cp env.example.js env.js

# Edit env.js with your values
vim env.js
```

### **2. Local Development**
```bash
# Start serverless offline
npm run dev

# Test locally
curl -X POST http://localhost:3000/v2/premium/alerts \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Alert","alert_type":"whale_movement","channels":["email"]}'
```

### **3. Deploy to AWS**
```bash
# Deploy to dev
npm run deploy:dev

# Deploy to prod
npm run deploy:prod

# Deploy single function
serverless deploy function -f createAlert --stage prod
```

---

## 📁 **Project Structure**

```
premium/
├── serverless.yml              # Serverless Framework config
├── env.example.js              # Environment variables template
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
├── resources/                  # CloudFormation resources
│   ├── premium-db.yml          # PostgreSQL RDS instance
│   ├── premium-s3.yml          # S3 bucket for reports
│   └── premium-dynamodb.yml    # DynamoDB audit table
├── src/
│   ├── alerts/                 # EPIC-1: Smart Alerts
│   │   ├── create.ts           # Create alert Lambda
│   │   ├── list.ts             # List alerts Lambda
│   │   ├── update.ts           # Update alert Lambda
│   │   ├── delete.ts           # Delete alert Lambda
│   │   └── processor.ts        # Alert processing (SQS consumer)
│   ├── tax/                    # EPIC-2: Tax Reporting
│   │   ├── generate.ts         # Generate tax report Lambda
│   │   └── list.ts             # List tax reports Lambda
│   ├── portfolio/              # EPIC-3: Portfolio Management
│   ├── gas/                    # EPIC-4: Gas & Trading Optimization
│   ├── security/               # EPIC-5: Security & Risk Management
│   ├── analytics/              # EPIC-6: Advanced Analytics
│   └── shared/                 # Shared utilities
│       ├── db.ts               # Database connection
│       ├── redis.ts            # Redis connection
│       └── auth.ts             # Authentication middleware
└── migrations/                 # Database migrations
    ├── 001-create-alert-rules.sql
    ├── 002-create-tax-tables.sql
    └── ...
```

---

## 🗄️ **Database Setup**

### **1. Create RDS Instance**
```bash
# Deploy infrastructure (creates RDS, S3, DynamoDB)
serverless deploy --stage dev

# Get RDS endpoint
aws rds describe-db-instances \
  --db-instance-identifier defillama-premium-dev \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

### **2. Run Migrations**
```bash
# Connect to RDS
psql postgresql://defillama:YOUR_PASSWORD@RDS_ENDPOINT:5432/defillama_premium

# Run migrations
\i migrations/001-create-alert-rules.sql
\i migrations/002-create-tax-tables.sql
```

### **3. Test Connection**
```bash
# Test database connection
npm run test:db
```

---

## 🔧 **Environment Variables**

### **Required Variables** (env.js)
```javascript
module.exports = {
  // Premium Database (NEW)
  PREMIUM_DB: 'postgresql://defillama:PASSWORD@RDS_ENDPOINT:5432/defillama_premium',
  
  // Redis (Shared cluster)
  REDIS_HOST: 'redis-cluster.cache.amazonaws.com',
  REDIS_PORT: '6379',
  REDIS_PASSWORD: 'YOUR_REDIS_PASSWORD',
  REDIS_DB: '1', // DB 1 for premium alerts
  
  // Stripe (Subscriptions)
  STRIPE_SECRET_KEY: 'sk_live_YOUR_KEY',
  
  // SendGrid (Email)
  SENDGRID_API_KEY: 'SG.YOUR_KEY',
  
  // Blockchain RPCs (Reuse existing)
  ETHEREUM_RPC: 'https://eth.llamarpc.com',
  // ... (see env.example.js for full list)
};
```

---

## 📊 **API Endpoints**

### **EPIC-1: Smart Alerts**
```bash
# Create alert
POST /v2/premium/alerts
{
  "name": "Whale Alert",
  "alert_type": "whale_movement",
  "channels": ["email", "telegram"],
  "condition": { "threshold": 1000000 }
}

# List alerts
GET /v2/premium/alerts

# Update alert
PUT /v2/premium/alerts/{id}

# Delete alert
DELETE /v2/premium/alerts/{id}
```

### **EPIC-2: Tax Reporting**
```bash
# Generate tax report
POST /v2/premium/tax/reports
{
  "year": 2024,
  "jurisdiction": "US",
  "format": "pdf"
}

# List tax reports
GET /v2/premium/tax/reports
```

---

## 🧪 **Testing**

### **Unit Tests**
```bash
npm run test
```

### **Integration Tests**
```bash
npm run test:integration
```

### **Load Tests**
```bash
npm run test:load
```

---

## 📈 **Monitoring**

### **CloudWatch Dashboards**
- **Premium Alerts Dashboard**: `/aws/lambda/defillama-premium-dev-createAlert`
- **Premium Tax Dashboard**: `/aws/lambda/defillama-premium-dev-generateTaxReport`

### **X-Ray Tracing**
- Enabled for all Lambda functions
- View traces: AWS Console → X-Ray → Traces

### **Logs**
```bash
# View logs
serverless logs -f createAlert --stage dev --tail

# View all logs
aws logs tail /aws/lambda/defillama-premium-dev-createAlert --follow
```

---

## 🔐 **Security**

### **Encryption**
- **At Rest**: KMS encryption for RDS, S3, DynamoDB
- **In Transit**: TLS 1.3 for all connections

### **Authentication**
- JWT tokens (reuse existing DeFiLlama auth)
- API keys for programmatic access

### **Network**
- VPC-enabled Lambda functions
- Private subnets (no public internet access)
- Security groups (least privilege)

---

## 💰 **Cost Estimates**

### **Infrastructure Costs** (Monthly)
| Resource | Dev | Prod | Notes |
|----------|-----|------|-------|
| **RDS PostgreSQL** | $50 | $300 | db.t4g.medium (dev), db.r6g.large (prod) |
| **S3 Bucket** | $5 | $20 | Tax reports, portfolio exports |
| **Lambda** | $10 | $100 | Auto-scales with traffic |
| **Redis** | $0 | $0 | Shared cluster (existing) |
| **API Gateway** | $5 | $50 | Pay-per-request |
| **CloudWatch** | $5 | $20 | Logs, metrics, dashboards |
| **Total** | **$75** | **$490** | |

**Production Cost**: $490-750/month (0.06-0.09% of $25M ARR target)

---

## 📚 **References**

### **Critical Documentation**
1. ✅ **INFRASTRUCTURE-ALIGNMENT-V2.md** - Prevents 95% of mistakes
2. ✅ **defi/src/alerts/db.ts** - Database connection pattern
3. ✅ **defi/serverless.yml** - Serverless Framework config
4. ✅ **defi/resources/redis-cluster.yml** - Redis configuration

### **Existing Migrations**
1. ✅ **sql/migrations/002-alert-rules.sql** - Alert system schema
2. ✅ **defi/src/query/db/schema.sql** - Query processor schema

---

## 🤝 **Contributing**

### **Development Workflow**
1. Create feature branch: `git checkout -b feature/epic-1-alerts`
2. Implement feature following existing patterns
3. Write tests (unit + integration)
4. Deploy to dev: `npm run deploy:dev`
5. Test in dev environment
6. Create PR for review
7. Deploy to prod after approval

### **Code Standards**
- Follow existing DeFiLlama patterns (see `defi/src/alerts/db.ts`)
- Use `postgres` library (NOT `pg` or Sequelize)
- Use lowercase_underscore for table names
- Add TypeScript types for all functions
- Write tests for all new features

---

## 📞 **Support**

- **Documentation**: `docs/3-solutioning/INFRASTRUCTURE-ALIGNMENT-V2.md`
- **Issues**: GitHub Issues
- **Slack**: #premium-features channel

---

**Last Updated**: October 18, 2025  
**Version**: 2.0  
**Status**: ✅ Ready for Development

