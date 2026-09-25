import { deepRequest, recordTestResult } from './helpers.js';

export async function runExpenseDeepTests(managerCookies, seedEvent) {
  console.log('\n--- EXPENSE DEEP TESTS ---');

  // 1. Create valid expense
  const t1Start = Date.now();
  try {
    const res = await deepRequest(`/events/${seedEvent.id}/expenses`, {
      method: 'POST',
      cookies: managerCookies,
      body: {
        title: 'Lunch catering for event team',
        amount: 145.5,
        currency: 'GBP',
      },
    });

    if (res.status === 201 && Number(res.data.data.amount) === 145.5) {
      recordTestResult({
        name: 'Create Event Expense - API creation',
        category: 'EXPENSES',
        status: 'PASS',
        endpoint: 'POST /api/events/:id/expenses',
        expected: '201 Created',
        actual: `201 ${JSON.stringify(res.data.data)}`,
        durationMs: Date.now() - t1Start,
        sourceFile: 'controllers/expense.controller.js',
      });
    } else {
      recordTestResult({
        name: 'Create Event Expense - API creation',
        category: 'EXPENSES',
        status: 'FAIL',
        endpoint: 'POST /api/events/:id/expenses',
        expected: '201 Created',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        error: 'Expense creation failed',
        durationMs: Date.now() - t1Start,
        sourceFile: 'controllers/expense.controller.js',
      });
    }
  } catch (err) {
    recordTestResult({
      name: 'Create Event Expense - API creation',
      category: 'EXPENSES',
      status: 'FAIL',
      endpoint: 'POST /api/events/:id/expenses',
      error: err.message,
      durationMs: Date.now() - t1Start,
      sourceFile: 'controllers/expense.controller.js',
    });
  }

  // 2. Negative amount returns 400
  const t2Start = Date.now();
  try {
    const res = await deepRequest(`/events/${seedEvent.id}/expenses`, {
      method: 'POST',
      cookies: managerCookies,
      body: {
        title: 'Negative expense',
        amount: -50,
        currency: 'GBP',
      },
    });

    if (res.status === 400 && res.data.error === 'Amount must be greater than or equal to 0') {
      recordTestResult({
        name: 'Create Event Expense - Negative amount returns 400',
        category: 'EXPENSES',
        status: 'PASS',
        endpoint: 'POST /api/events/:id/expenses',
        expected: '400 { error: "Amount must be greater than or equal to 0" }',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        durationMs: Date.now() - t2Start,
        sourceFile: 'validators/expense.validator.js',
      });
    } else {
      recordTestResult({
        name: 'Create Event Expense - Negative amount returns 400',
        category: 'EXPENSES',
        status: 'FAIL',
        endpoint: 'POST /api/events/:id/expenses',
        expected: '400 { error: "Amount must be greater than or equal to 0" }',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        error: 'Negative amount validation failed',
        durationMs: Date.now() - t2Start,
        sourceFile: 'validators/expense.validator.js',
      });
    }
  } catch (err) {
    recordTestResult({
      name: 'Create Event Expense - Negative amount returns 400',
      category: 'EXPENSES',
      status: 'FAIL',
      endpoint: 'POST /api/events/:id/expenses',
      error: err.message,
      durationMs: Date.now() - t2Start,
      sourceFile: 'validators/expense.validator.js',
    });
  }
}
