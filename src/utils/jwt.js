import jwt from 'jsonwebtoken';

export const COOKIE_NAME = 'auth_token';
export const TOKEN_EXPIRATION = '24h';

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is missing.');
  }
  return secret;
}

export function signToken(payload) {
  const secret = getJwtSecret();
  return jwt.sign(payload, secret, { expiresIn: TOKEN_EXPIRATION });
}

export function verifyToken(token) {
  const secret = getJwtSecret();
  return jwt.verify(token, secret);
}

export function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  };
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, getCookieOptions());
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    ...getCookieOptions(),
    maxAge: 0,
  });
}
