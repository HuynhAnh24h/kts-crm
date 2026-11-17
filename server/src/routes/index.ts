import { Router } from 'express';
import authRoutes from './auth.routes';
import employeeRoutes from './employee.routes';
import externalRoutes from './external.routes';
import organizationRoutes from './organization.routes';
import userRoutes from './user.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'KTS Internal Multi-Branch CRM/ERP API',
    architecture: 'MVC + Services Layer | Hub (HQ) & Spoke (Factory Branches)',
    security: 'JWT + Google Mail 2FA + Branch-Scoped RBAC + External HMAC-SHA256',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/employees', employeeRoutes);
router.use('/organization', organizationRoutes);
router.use('/external', externalRoutes);

export default router;
