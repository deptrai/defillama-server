# Implementation Plan: E2E Notification Tests

**Document Version**: 1.0  
**Date**: 2025-10-18  
**Status**: Ready for Implementation  
**Story ID**: 1.1.4  
**Story Points**: 8

---

## 📊 Current Status

**Test Pass Rate**: 89/101 (88%)

**Breakdown**:
- ✅ Unit Tests: 60/60 (100%)
- ✅ Controller Tests: 20/20 (100%)
- ✅ Service Tests: 20/20 (100%)
- ⚠️ Integration Tests: 1/2 (50%)
- ✅ E2E Telegram: 11/11 (100%) ← **PERFECT!**
- ❌ E2E Email: 0/12 (0%)
- ❌ E2E Discord: 0/12 (0%)
- ❌ E2E Webhook: 0/14 (0%)
- ❌ E2E Multi-channel: 0/12 (0%)

**Target**: 101/101 (100%)

---

## 🎯 Objectives

1. Fix all failing E2E notification tests (50 tests)
2. Achieve 100% E2E test pass rate
3. Verify notification delivery across all channels
4. Ensure consistency with Epic-1, Tech Spec, Story 1.1.4

---

## 🔍 Root Cause Analysis

### Why Telegram Tests Pass but Others Fail?

**Telegram Tests (11/11 passing)**:
- ✅ Proper async/await patterns
- ✅ HTTP API integration working
- ✅ Mock server responding correctly
- ✅ Message formatting correct
- ✅ Channel filtering working
- ✅ Timing optimized (1000ms wait)

**Email/Discord/Webhook Tests (0/50 passing)**:
- ❌ Likely same issues as Telegram had before fixes
- ❌ Missing await keywords
- ❌ Incorrect mock server integration
- ❌ Message formatting issues
- ❌ Channel filtering issues
- ❌ Timing issues

**Hypothesis**: Apply same fixes that worked for Telegram to other channels!

---

## 📋 Implementation Plan

### Phase 1: Email E2E Tests (0/12 → 12/12)

**Estimated Time**: 2-3 hours

**Tasks**:
1. ✅ Review email-notifications.e2e.test.ts
2. ✅ Add await to all mock server calls
3. ✅ Fix message formatting expectations
4. ✅ Fix channel filtering (use notification_channels)
5. ✅ Increase wait times (500ms → 1000ms)
6. ✅ Run tests and verify 12/12 passing

**Expected Fixes**:
- Add `await` to `mailhog.getMessages()`
- Update `createTestWhaleAlert()` to use `notification_channels`
- Update `createTestPriceAlert()` to use `notification_channels`
- Increase wait times for async operations
- Fix email content expectations (subject, body)

### Phase 2: Discord E2E Tests (0/12 → 12/12)

**Estimated Time**: 2-3 hours

**Tasks**:
1. ✅ Review discord-notifications.e2e.test.ts
2. ✅ Add await to all mock server calls
3. ✅ Fix webhook URL configuration
4. ✅ Fix embed formatting expectations
5. ✅ Fix channel filtering
6. ✅ Run tests and verify 12/12 passing

**Expected Fixes**:
- Add `await` to `discordMock.getWebhooks()`
- Fix Discord webhook URL in test data
- Update embed content expectations
- Fix channel filtering logic

### Phase 3: Webhook E2E Tests (0/14 → 14/14)

**Estimated Time**: 2-3 hours

**Tasks**:
1. ✅ Review webhook-notifications.e2e.test.ts
2. ✅ Add await to all mock server calls
3. ✅ Fix webhook URL configuration
4. ✅ Fix payload format expectations
5. ✅ Fix retry logic tests
6. ✅ Run tests and verify 14/14 passing

**Expected Fixes**:
- Add `await` to `webhookMock.getRequests()`
- Fix webhook URL in test data
- Update payload format expectations
- Fix retry logic tests

### Phase 4: Multi-channel E2E Tests (0/12 → 12/12)

**Estimated Time**: 2-3 hours

**Tasks**:
1. ✅ Review multi-channel.e2e.test.ts
2. ✅ Add await to all mock server calls
3. ✅ Fix multi-channel delivery logic
4. ✅ Fix partial failure handling
5. ✅ Run tests and verify 12/12 passing

**Expected Fixes**:
- Add `await` to all mock server calls
- Fix multi-channel delivery expectations
- Fix partial failure handling

### Phase 5: Final Verification

**Estimated Time**: 1 hour

**Tasks**:
1. ✅ Run full test suite
2. ✅ Verify 101/101 (100%) pass rate
3. ✅ Check test coverage
4. ✅ Review test logs
5. ✅ Commit and push code

---

## 🔧 Technical Approach

### Pattern to Apply (Learned from Telegram Fixes)

**1. Async/Await Pattern**:
```typescript
// ❌ WRONG (missing await)
const messages = mockServers.telegram.getMessages();

// ✅ CORRECT (with await)
const messages = await mockServers.telegram.getMessages();
```

**2. Channel Filtering Pattern**:
```typescript
// ❌ WRONG (hardcoded channels)
actions: {
  channels: ['email', 'telegram'],
  ...
}

// ✅ CORRECT (use notification_channels)
actions: {
  channels: overrides.notification_channels || ['email', 'telegram'],
  ...
}
```

**3. Timing Pattern**:
```typescript
// ❌ WRONG (too short)
await waitForNotification(500);

// ✅ CORRECT (longer wait)
await waitForNotification(1000);
```

**4. Message Formatting Pattern**:
```typescript
// ❌ WRONG (plain text)
expect(message.text).toContain('From: 0xaaa...');

// ✅ CORRECT (with backticks)
expect(message.text).toContain('From: `0xaaa...`');
```

---

## 📁 Files to Modify

### Test Files
1. `premium/src/alerts/__tests__/e2e/notifications/email-notifications.e2e.test.ts`
2. `premium/src/alerts/__tests__/e2e/notifications/discord-notifications.e2e.test.ts`
3. `premium/src/alerts/__tests__/e2e/notifications/webhook-notifications.e2e.test.ts`
4. `premium/src/alerts/__tests__/e2e/notifications/multi-channel.e2e.test.ts`

### Setup Files (Already Fixed)
- ✅ `premium/src/alerts/__tests__/e2e/notifications/setup.ts` (already updated)

---

## ✅ Success Criteria

1. **All E2E tests passing**: 101/101 (100%)
2. **Email tests**: 12/12 (100%)
3. **Discord tests**: 12/12 (100%)
4. **Webhook tests**: 14/14 (100%)
5. **Multi-channel tests**: 12/12 (100%)
6. **No regressions**: Telegram tests still 11/11 (100%)
7. **Code committed**: Conventional commit message
8. **Code pushed**: To remote repository

---

## 🚀 Execution Timeline

**Total Estimated Time**: 8-10 hours (matches Story 1.1.4: 8 points)

| Phase | Tasks | Time | Status |
|-------|-------|------|--------|
| Phase 1 | Email E2E Tests | 2-3h | Not Started |
| Phase 2 | Discord E2E Tests | 2-3h | Not Started |
| Phase 3 | Webhook E2E Tests | 2-3h | Not Started |
| Phase 4 | Multi-channel E2E Tests | 2-3h | Not Started |
| Phase 5 | Final Verification | 1h | Not Started |

**Start Date**: 2025-10-18  
**Target Completion**: 2025-10-18 (same day)

---

## 📊 Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Same pattern doesn't work for other channels | LOW | MEDIUM | Debug individually, check mock servers |
| Mock servers not responding | LOW | HIGH | Verify Docker containers running |
| Timing issues persist | MEDIUM | MEDIUM | Increase wait times further |
| Message format mismatches | MEDIUM | LOW | Update test expectations |

---

## 🎯 Next Steps

1. ✅ Review this implementation plan
2. ✅ Start Phase 1: Email E2E Tests
3. ✅ Apply Telegram fixes pattern
4. ✅ Run tests and verify
5. ✅ Move to next phase
6. ✅ Repeat until 100% pass rate
7. ✅ Commit and push code

---

**END OF DOCUMENT**

