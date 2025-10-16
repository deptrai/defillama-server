/**
 * Suspicious Activities Routes
 * Story: 3.2.2 - Suspicious Activity Detection
 * Phase: 7 - API Development
 */

import { Router } from 'hyper-express';
import {
  listSuspiciousActivities,
  getSuspiciousActivity,
  updateSuspiciousActivityStatus,
  acknowledgeSuspiciousActivity,
  detectSuspiciousActivities,
} from './handlers';
import {
  getDashboardStats,
  getTrendData,
  getRecentActivities,
  getProtocolBreakdown,
  getSeverityDistribution,
} from './dashboard-handlers';

const router = new Router();

// List suspicious activities
router.get('/', listSuspiciousActivities);

// Get suspicious activity by ID
router.get('/:id', getSuspiciousActivity);

// Update suspicious activity status
router.put('/:id/status', updateSuspiciousActivityStatus);

// Acknowledge suspicious activity alert
router.post('/:id/acknowledge', acknowledgeSuspiciousActivity);

// Trigger detection for a specific protocol
router.post('/detect/:protocol_id', detectSuspiciousActivities);

// Dashboard routes
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/trends', getTrendData);
router.get('/dashboard/recent', getRecentActivities);
router.get('/dashboard/protocols', getProtocolBreakdown);
router.get('/dashboard/severity', getSeverityDistribution);

export default router;

