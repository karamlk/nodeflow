import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
const JWT_EXPIRES_IN = '30d';

export function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ code: 401, message: 'Unauthorized' });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ code: 401, message: 'Invalid or expired token' });
  }
  req.userId = payload.sub;
  next();
}
