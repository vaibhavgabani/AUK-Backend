/**
 * Datadog APM Tracer initialization.
 * Safe environment-driven activation: only initializes if DATADOG_ENABLED=true or DD_TRACE_ENABLED=true.
 * Uses top-level dynamic import to gracefully fall back if dd-trace is missing or disabled.
 */
let tracer = null;

const isDatadogEnabled =
  process.env.DATADOG_ENABLED === 'true' || process.env.DD_TRACE_ENABLED === 'true';

if (isDatadogEnabled) {
  try {
    const ddTraceModule = await import('dd-trace');
    tracer = ddTraceModule.default || ddTraceModule;
    if (tracer && typeof tracer.init === 'function') {
      tracer.init({
        service: process.env.SERVICE_NAME || process.env.DD_SERVICE || 'anshil-backend',
        env: process.env.NODE_ENV || process.env.DD_ENV || 'development',
        version: process.env.APP_VERSION || process.env.DD_VERSION || '1.0.0',
        logInjection: true,
      });
    }
  } catch (err) {
    // dd-trace not installed or failed to initialize — application continues normally
  }
}

export default tracer;
