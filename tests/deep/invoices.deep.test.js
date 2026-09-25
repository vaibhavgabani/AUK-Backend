import { deepRequest, recordTestResult } from './helpers.js';

export async function runInvoiceDeepTests(managerCookies, seedEvent) {
  console.log('\n--- INVOICE DEEP TESTS ---');

  const t1Start = Date.now();
  try {
    const res = await deepRequest(`/events/${seedEvent.id}/invoice`, {
      cookies: managerCookies,
    });

    if (res.status === 200 && res.data.data.event && res.data.data.manager && Array.isArray(res.data.data.expenses)) {
      const invoice = res.data.data;
      const hasCorrectCurrencyTotals = invoice.expenseTotals && typeof invoice.expenseTotals === 'object';

      if (hasCorrectCurrencyTotals) {
        recordTestResult({
          name: 'GET Invoice Data - Dynamic invoice assembly with currency totals',
          category: 'INVOICES',
          status: 'PASS',
          endpoint: 'GET /api/events/:id/invoice',
          expected: '200 Complete invoice object with expenseTotals',
          actual: `200 ${JSON.stringify(invoice.expenseTotals)}`,
          durationMs: Date.now() - t1Start,
          sourceFile: 'controllers/invoice.controller.js',
        });
      } else {
        recordTestResult({
          name: 'GET Invoice Data - Dynamic invoice assembly with currency totals',
          category: 'INVOICES',
          status: 'FAIL',
          endpoint: 'GET /api/events/:id/invoice',
          expected: '200 Complete invoice object with expenseTotals',
          actual: `${res.status} ${JSON.stringify(invoice)}`,
          error: 'Invoice missing expenseTotals structure',
          durationMs: Date.now() - t1Start,
          sourceFile: 'controllers/invoice.controller.js',
        });
      }
    } else {
      recordTestResult({
        name: 'GET Invoice Data - Dynamic invoice assembly with currency totals',
        category: 'INVOICES',
        status: 'FAIL',
        endpoint: 'GET /api/events/:id/invoice',
        expected: '200 Invoice object',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        error: 'Invoice fetching failed',
        durationMs: Date.now() - t1Start,
        sourceFile: 'controllers/invoice.controller.js',
      });
    }
  } catch (err) {
    recordTestResult({
      name: 'GET Invoice Data - Dynamic invoice assembly with currency totals',
      category: 'INVOICES',
      status: 'FAIL',
      endpoint: 'GET /api/events/:id/invoice',
      error: err.message,
      durationMs: Date.now() - t1Start,
      sourceFile: 'controllers/invoice.controller.js',
    });
  }
}
