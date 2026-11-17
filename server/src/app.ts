import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { globalErrorHandler, notFoundHandler } from './middlewares/error.middleware';
import apiRoutes from './routes';

const app = express();

// Trust proxy cho Cloudflare Tunnel / WARP / Reverse Proxy nội bộ
app.set('trust proxy', 1);

// HTTP Security Headers
app.use(helmet());

// CORS cho mạng LAN nội bộ (crm.noibo.local, 10.10.20.100, localhost)
const allowedOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by KTS Internal CORS policy`));
      }
    },
    credentials: true,
  })
);

app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// Mount API v1
app.use('/api/v1', apiRoutes);

// Error Handling
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
