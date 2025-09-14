import { Router } from 'express';
import * as tenantController from '../controllers/tenantController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All tenant routes require authentication
router.use(authenticateToken);

// Tenant management
router.post('/', tenantController.createTenant);
router.get('/', tenantController.getTenants);
router.get('/:tenantId', tenantController.getTenant);
router.put('/:tenantId', tenantController.updateTenant);
router.delete('/:tenantId', tenantController.deleteTenant);

// API key management
router.get('/:tenantId/api-keys', tenantController.getTenantApiKeys);
router.post('/:tenantId/api-keys', tenantController.createApiKey);
router.delete('/:tenantId/api-keys/:keyId', tenantController.deleteApiKey);

export default router;
