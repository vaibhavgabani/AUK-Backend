import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  serviceName: process.env.SERVICE_NAME || 'anshil-backend',
  appVersion: process.env.APP_VERSION || '1.0.0',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || 'http://localhost:3000')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),
  datadogEnabled: process.env.DATADOG_ENABLED === 'true' || process.env.DD_TRACE_ENABLED === 'true',
};
