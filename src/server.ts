import app from './app';
import { prisma } from './config/database';
import { env } from './config/env';

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL Database');
  } catch (err) {
    console.warn(
      '⚠️ PostgreSQL not yet reachable (run `docker compose up -d` and `npm run prisma:push`). Starting HTTP server anyway...'
    );
    if (env.NODE_ENV === 'production') {
      console.error(err);
      process.exit(1);
    }
  }

  app.listen(env.PORT, () => {
    console.log('======================================================================');
    console.log(`🚀 ${env.APP_NAME} Backend API is running on Port ${env.PORT}`);
    console.log(`🌐 Health Check : http://localhost:${env.PORT}/api/v1/health`);
    console.log(`🔐 Auth & 2FA   : http://localhost:${env.PORT}/api/v1/auth/login`);
    console.log(`👥 Users & RBAC : http://localhost:${env.PORT}/api/v1/users`);
    console.log(`🪪 Employees    : http://localhost:${env.PORT}/api/v1/employees`);
    console.log(`🏢 Organization : http://localhost:${env.PORT}/api/v1/organization/branches`);
    console.log(`🛡️ External API : http://localhost:${env.PORT}/api/v1/external/*`);
    console.log('======================================================================');
  });
};

startServer();
