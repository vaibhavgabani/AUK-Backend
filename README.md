# Event Staffing & Timesheet System — Express Backend API (`anshil-backend`)

Production-ready Node.js + Express REST API backend for the UK-based Event Staffing & Timesheet System (Anshil).

## Architecture & Features

- **Runtime & Framework**: Node.js, Express.js (ES Modules, `"type": "module"`)
- **Database & ORM**: PostgreSQL (`pg` driver + `drizzle-orm`)
- **Structured Logging**: Pino structured JSON logger outputting to `stdout`/`stderr`
- **Request Tracing**: `X-Request-ID` generation and header tracing
- **Observability Readiness**: Datadog APM tracing integration (`dd-trace`) enabled conditionally via `DATADOG_ENABLED=true`
- **Validation**: Zod (Enforcing HTTP standard `{ "error": "message" }`)
- **Security & Auth**: `bcrypt` (cost factor 12) + signed JWT (`jsonwebtoken`) in `httpOnly` cookies with CORS protection
- **Exports**: In-memory ExcelJS report generation

## Environment Configuration

Copy `.env.example` to `.env` and supply environment variables:

| Variable | Description | Required | Default |
| -------- | ----------- | -------- | ------- |
| `PORT` | HTTP Server Port | No | `5000` |
| `NODE_ENV` | Environment (`development` / `production`) | No | `development` |
| `LOG_LEVEL` | Pino log level (`trace`, `debug`, `info`, `warn`, `error`) | No | `info` (prod) / `debug` (dev) |
| `SERVICE_NAME` | Service identifier for log telemetry | No | `anshil-backend` |
| `APP_VERSION` | Application release version | No | `1.0.0` |
| `DATABASE_URL` | PostgreSQL connection string | **Yes** | `postgresql://...` |
| `JWT_SECRET` | Secret key for signing JWT cookies | **Yes** | N/A |
| `CLIENT_URL` | Primary frontend web URL | No | `http://localhost:3000` |
| `ALLOWED_ORIGINS` | CSV list of permitted CORS origins | No | Same as `CLIENT_URL` |
| `SMTP_HOST` | Outbound SMTP server hostname | No | `localhost` |
| `SMTP_PORT` | Outbound SMTP port | No | `587` |
| `SMTP_USER` | SMTP username | No | N/A |
| `SMTP_PASSWORD` | SMTP password | No | N/A |
| `SMTP_SECURE` | Enable TLS (`true`/`false`) | No | `false` |
| `SMTP_FROM` | Sender email address | No | `no-reply@eventroster.co.uk` |
| `DATADOG_ENABLED` | Enable Datadog APM tracer (`true`/`false`) | No | `false` |

## Health & Readiness Probes

- **`GET /api/health`**: Liveness probe. Returns `200 OK` `{ status: "ok", uptime: 123.4, timestamp: "..." }`. Does not query the database.
- **`GET /api/ready`**: Readiness probe. Verifies PostgreSQL connection. Returns `200 OK` when connected or `503 Service Unavailable` when disconnected.

## Local Operations & Commands

```bash
# Install dependencies
npm install

# Apply database migrations
npm run db:migrate

# Seed database with initial roles and admin
npm run db:seed

# Development server (watch mode)
npm run dev

# Production server
npm start
```
