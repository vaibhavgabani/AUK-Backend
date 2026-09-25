import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import routes from './routes/index.js';
import requestLogger from './middlewares/requestLogger.middleware.js';
import { notFoundHandler } from './middlewares/notFound.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

const rawOrigins = [
  process.env.CLIENT_URL,
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
  config.clientUrl,
  ...(config.allowedOrigins || []),
]
  .filter(Boolean)
  .map((url) => url.trim());

export const allowedOrigins = Array.from(new Set(rawOrigins));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, server-to-server, or same-origin)
      if (!origin) return callback(null, true);

      // Check if configured origins permit wildcard or specific origin match
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, origin);
      }

      // Development environment fallback
      if (config.nodeEnv === 'development') {
        return callback(null, origin);
      }

      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Request-ID'],
    exposedHeaders: ['Set-Cookie', 'X-Request-ID'],
  })
);

// Inject Request ID & HTTP Access Logger Middleware
app.use(requestLogger);

app.use(express.json());
app.use(cookieParser());

// Root route
app.get('/', (req, res) => {
  res.send('<h1>Hello</h1>');
});

// Central API route mounting
app.use('/api', routes);

// 404 and Global Error Middleware handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
