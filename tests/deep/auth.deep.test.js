import { deepRequest, recordTestResult } from './helpers.js';
import { DEEP_CONFIG } from './config.js';

export async function runAuthDeepTests(managerUser) {
  console.log('\n--- AUTHENTICATION DEEP TESTS ---');

  // 1. Admin login valid
  const t1Start = Date.now();
  try {
    const res = await deepRequest('/auth/admin/login', {
      method: 'POST',
      body: { email: DEEP_CONFIG.adminEmail, password: DEEP_CONFIG.adminPassword },
    });

    if (res.status === 200 && res.setCookie && res.setCookie.includes('auth_token') && res.setCookie.includes('HttpOnly')) {
      recordTestResult({
        name: 'Admin Login - Valid credentials set httpOnly cookie',
        category: 'AUTHENTICATION',
        status: 'PASS',
        endpoint: 'POST /api/auth/admin/login',
        expected: '200 with httpOnly auth_token cookie',
        actual: `200 with ${res.setCookie}`,
        durationMs: Date.now() - t1Start,
        sourceFile: 'controllers/auth.controller.js',
      });
    } else {
      recordTestResult({
        name: 'Admin Login - Valid credentials set httpOnly cookie',
        category: 'AUTHENTICATION',
        status: 'FAIL',
        endpoint: 'POST /api/auth/admin/login',
        expected: '200 with httpOnly auth_token cookie',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        error: 'Admin login failed or cookie missing',
        durationMs: Date.now() - t1Start,
        sourceFile: 'controllers/auth.controller.js',
      });
    }
  } catch (err) {
    recordTestResult({
      name: 'Admin Login - Valid credentials set httpOnly cookie',
      category: 'AUTHENTICATION',
      status: 'FAIL',
      endpoint: 'POST /api/auth/admin/login',
      error: err.message,
      durationMs: Date.now() - t1Start,
      sourceFile: 'controllers/auth.controller.js',
    });
  }

  // 2. Admin login wrong password
  const t2Start = Date.now();
  try {
    const res = await deepRequest('/auth/admin/login', {
      method: 'POST',
      body: { email: DEEP_CONFIG.adminEmail, password: 'WrongPassword999!' },
    });

    if (res.status === 401 && res.data.error === 'Invalid email or password') {
      recordTestResult({
        name: 'Admin Login - Wrong password returns 401',
        category: 'AUTHENTICATION',
        status: 'PASS',
        endpoint: 'POST /api/auth/admin/login',
        expected: '401 { error: "Invalid email or password" }',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        durationMs: Date.now() - t2Start,
        sourceFile: 'controllers/auth.controller.js',
      });
    } else {
      recordTestResult({
        name: 'Admin Login - Wrong password returns 401',
        category: 'AUTHENTICATION',
        status: 'FAIL',
        endpoint: 'POST /api/auth/admin/login',
        expected: '401 { error: "Invalid email or password" }',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        error: 'Incorrect status or message for invalid password',
        durationMs: Date.now() - t2Start,
        sourceFile: 'controllers/auth.controller.js',
      });
    }
  } catch (err) {
    recordTestResult({
      name: 'Admin Login - Wrong password returns 401',
      category: 'AUTHENTICATION',
      status: 'FAIL',
      endpoint: 'POST /api/auth/admin/login',
      error: err.message,
      durationMs: Date.now() - t2Start,
      sourceFile: 'controllers/auth.controller.js',
    });
  }

  // 3. Manager login valid
  const t3Start = Date.now();
  try {
    const res = await deepRequest('/auth/manager/login', {
      method: 'POST',
      body: { email: managerUser.email, password: 'ManagerPassword123!' },
    });

    if (res.status === 200 && (res.data?.user?.role === 'manager' || res.data?.data?.user?.role === 'manager')) {
      recordTestResult({
        name: 'Manager Login - Valid credentials succeed',
        category: 'AUTHENTICATION',
        status: 'PASS',
        endpoint: 'POST /api/auth/manager/login',
        expected: '200 with manager user object',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        durationMs: Date.now() - t3Start,
        sourceFile: 'controllers/auth.controller.js',
      });
    } else {
      recordTestResult({
        name: 'Manager Login - Valid credentials succeed',
        category: 'AUTHENTICATION',
        status: 'FAIL',
        endpoint: 'POST /api/auth/manager/login',
        expected: '200 with manager role',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        error: 'Manager login failed',
        durationMs: Date.now() - t3Start,
        sourceFile: 'controllers/auth.controller.js',
      });
    }
  } catch (err) {
    recordTestResult({
      name: 'Manager Login - Valid credentials succeed',
      category: 'AUTHENTICATION',
      status: 'FAIL',
      endpoint: 'POST /api/auth/manager/login',
      error: err.message,
      durationMs: Date.now() - t3Start,
      sourceFile: 'controllers/auth.controller.js',
    });
  }

  // 4. Logout invalidates cookie
  const t4Start = Date.now();
  try {
    const res = await deepRequest('/auth/logout', { method: 'POST' });
    if (res.status === 200 && res.setCookie && res.setCookie.includes('auth_token=;')) {
      recordTestResult({
        name: 'Logout - Clears auth_token cookie',
        category: 'AUTHENTICATION',
        status: 'PASS',
        endpoint: 'POST /api/auth/logout',
        expected: '200 with cleared cookie header',
        actual: `${res.status} ${res.setCookie}`,
        durationMs: Date.now() - t4Start,
        sourceFile: 'controllers/auth.controller.js',
      });
    } else {
      recordTestResult({
        name: 'Logout - Clears auth_token cookie',
        category: 'AUTHENTICATION',
        status: 'FAIL',
        endpoint: 'POST /api/auth/logout',
        expected: '200 with cleared cookie header',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        error: 'Logout failed to clear cookie',
        durationMs: Date.now() - t4Start,
        sourceFile: 'controllers/auth.controller.js',
      });
    }
  } catch (err) {
    recordTestResult({
      name: 'Logout - Clears auth_token cookie',
      category: 'AUTHENTICATION',
      status: 'FAIL',
      endpoint: 'POST /api/auth/logout',
      error: err.message,
      durationMs: Date.now() - t4Start,
      sourceFile: 'controllers/auth.controller.js',
    });
  }

  // 5. Password Reset - End-to-end OTP flow
  const t5Start = Date.now();
  try {
    let capturedOtp = null;
    const { setTestTransporterMock } = await import('../../services/email.service.js');
    setTestTransporterMock({
      sendMail: async (mailOptions) => {
        const match = mailOptions.text.match(/(\d{6})/);
        if (match) capturedOtp = match[1];
        return { messageId: 'deep_test_mail' };
      },
    });

    const forgotRes = await deepRequest('/auth/forgot-password', {
      method: 'POST',
      body: { email: managerUser.email },
    });

    if (forgotRes.status === 200 && capturedOtp) {
      const newPass = 'UpdatedDeepPass123!';

      const resetRes = await deepRequest('/auth/reset-password', {
        method: 'POST',
        body: { email: managerUser.email, otp: capturedOtp, newPassword: newPass },
      });

      if (resetRes.status === 200) {
        // Restore manager password
        let restoreOtp = null;
        setTestTransporterMock({
          sendMail: async (mailOptions) => {
            const match = mailOptions.text.match(/(\d{6})/);
            if (match) restoreOtp = match[1];
            return { messageId: 'deep_restore_mail' };
          },
        });

        await deepRequest('/auth/forgot-password', {
          method: 'POST',
          body: { email: managerUser.email },
        });

        if (restoreOtp) {
          await deepRequest('/auth/reset-password', {
            method: 'POST',
            body: { email: managerUser.email, otp: restoreOtp, newPassword: 'ManagerPassword123!' },
          });
        }

        recordTestResult({
          name: 'Password Reset - End-to-end OTP generation & password update',
          category: 'AUTHENTICATION',
          status: 'PASS',
          endpoint: 'POST /api/auth/forgot-password & reset-password',
          expected: '200 generic response and successful OTP password update',
          actual: '200 Password reset successful',
          durationMs: Date.now() - t5Start,
          sourceFile: 'controllers/auth.controller.js',
        });
      } else {
        recordTestResult({
          name: 'Password Reset - End-to-end OTP generation & password update',
          category: 'AUTHENTICATION',
          status: 'FAIL',
          endpoint: 'POST /api/auth/reset-password',
          expected: '200 success',
          actual: `${resetRes.status} ${JSON.stringify(resetRes.data)}`,
          error: 'Reset password failed',
          durationMs: Date.now() - t5Start,
          sourceFile: 'controllers/auth.controller.js',
        });
      }
    } else {
      recordTestResult({
        name: 'Password Reset - End-to-end OTP generation & password update',
        category: 'AUTHENTICATION',
        status: 'FAIL',
        endpoint: 'POST /api/auth/forgot-password',
        expected: '200 with OTP dispatched via Nodemailer',
        actual: `${forgotRes.status} ${JSON.stringify(forgotRes.data)}`,
        error: 'Forgot password OTP request failed',
        durationMs: Date.now() - t5Start,
        sourceFile: 'controllers/auth.controller.js',
      });
    }
  } catch (err) {
    recordTestResult({
      name: 'Password Reset - End-to-end OTP generation & password update',
      category: 'AUTHENTICATION',
      status: 'FAIL',
      endpoint: 'POST /api/auth/forgot-password',
      error: err.message,
      durationMs: Date.now() - t5Start,
      sourceFile: 'controllers/auth.controller.js',
    });
  }
}
