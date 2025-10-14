# Feature Development Template

*Template for planning new features in DeFiLlama Server*

## 📋 Feature Overview

**Feature Name:** [Feature Name]  
**Priority:** [High/Medium/Low]  
**Estimated Effort:** [Small/Medium/Large]  
**Target Service:** [defi/coins/common/new-service]  

## 🎯 Business Requirements

### Problem Statement
*What problem does this feature solve?*

### Success Criteria
*How will we measure success?*
- [ ] Metric 1
- [ ] Metric 2
- [ ] Metric 3

### User Stories
*Who will use this feature and how?*

**As a** [user type]  
**I want** [functionality]  
**So that** [benefit]  

## 🏗️ Technical Requirements

### Service Impact
- [ ] **DeFi Service** - Changes to main DeFi API
- [ ] **Coins Service** - Changes to price API
- [ ] **Common Library** - Shared utilities changes
- [ ] **New Service** - Requires new microservice
- [ ] **Infrastructure** - AWS/database changes

### API Changes
- [ ] New endpoints
- [ ] Modified existing endpoints
- [ ] Breaking changes (requires versioning)
- [ ] No API changes

### Database Changes
- [ ] New tables/collections
- [ ] Schema modifications
- [ ] Data migration required
- [ ] No database changes

### External Integrations
- [ ] New blockchain integrations
- [ ] New data sources
- [ ] Modified existing integrations
- [ ] No external changes

## 🔧 Implementation Plan

### Phase 1: Analysis & Design
- [ ] Research technical approach
- [ ] Design API contracts
- [ ] Plan database schema
- [ ] Identify dependencies

### Phase 2: Development
- [ ] Implement core functionality
- [ ] Add tests (unit + integration)
- [ ] Update documentation
- [ ] Performance optimization

### Phase 3: Deployment
- [ ] Deploy to development
- [ ] Integration testing
- [ ] Deploy to production
- [ ] Monitor metrics

## 📊 Performance Considerations

### Expected Load
- **Requests/second:** [estimate]
- **Data volume:** [estimate]
- **Response time target:** [<Xms]

### Scaling Strategy
- [ ] Horizontal scaling (Lambda)
- [ ] Database optimization
- [ ] Caching strategy
- [ ] CDN considerations

## 🔒 Security & Compliance

### Security Requirements
- [ ] Input validation
- [ ] Rate limiting
- [ ] Authentication/authorization
- [ ] Data encryption

### Compliance Considerations
- [ ] Data privacy (GDPR)
- [ ] Financial regulations
- [ ] API rate limits
- [ ] Audit logging

## 🧪 Testing Strategy

### Test Coverage
- [ ] Unit tests (>80% coverage)
- [ ] Integration tests
- [ ] API contract tests
- [ ] Performance tests
- [ ] Security tests

### Test Data
- [ ] Mock data for development
- [ ] Test fixtures
- [ ] Staging environment data

## 📈 Monitoring & Observability

### Metrics to Track
- [ ] Feature usage metrics
- [ ] Performance metrics
- [ ] Error rates
- [ ] Business KPIs

### Alerting
- [ ] Error rate alerts
- [ ] Performance degradation
- [ ] Business metric alerts

## 🚀 Rollout Plan

### Feature Flags
- [ ] Implement feature toggles
- [ ] Gradual rollout strategy
- [ ] Rollback plan

### Communication
- [ ] Internal team notification
- [ ] API documentation updates
- [ ] User communication (if needed)

## 📚 Documentation Updates

### Required Updates
- [ ] API documentation
- [ ] Architecture diagrams
- [ ] Component inventory
- [ ] Development guide
- [ ] Deployment procedures

## 🔄 Dependencies & Risks

### Dependencies
- [ ] External service dependencies
- [ ] Team dependencies
- [ ] Infrastructure dependencies

### Risks & Mitigation
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| [Risk 1] | [High/Med/Low] | [High/Med/Low] | [Mitigation strategy] |

## ✅ Definition of Done

### Development Complete
- [ ] Code implemented and reviewed
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Performance benchmarks met

### Deployment Complete
- [ ] Deployed to production
- [ ] Monitoring configured
- [ ] Metrics baseline established
- [ ] Team trained on new feature

### Business Complete
- [ ] Success criteria met
- [ ] User feedback collected
- [ ] Performance targets achieved
- [ ] Business stakeholders satisfied

---

## 📝 Notes

*Add any additional notes, considerations, or decisions here*

---

*Use this template with BMAD Method workflows: brainstorm-project → product-brief → solution-architecture → tech-spec*
