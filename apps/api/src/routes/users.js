import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { signToken, authMiddleware } from '../auth.js';
import { randomId, sanitizeUser, nowIso } from '../util.js';

const router = Router();

router.post('/records', (req, res) => {
  const { email, password, passwordConfirm, name } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ code: 400, message: 'Email and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ code: 400, message: 'Password must be at least 8 characters' });
  }
  if (passwordConfirm !== undefined && passwordConfirm !== password) {
    return res.status(400).json({ code: 400, message: 'Passwords do not match' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ code: 400, message: 'Email already registered' });
  }

  const id = randomId();
  const now = nowIso();
  const hash = bcrypt.hashSync(password, 10);

  db.prepare(
    `INSERT INTO users (id, email, password, name, created, updated)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, email, hash, name || null, now, now);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  res.status(200).json(sanitizeUser(user));
});

router.post('/auth-with-password', (req, res) => {
  const { identity, email, password } = req.body || {};
  const loginEmail = identity || email;

  if (!loginEmail || !password) {
    return res.status(400).json({ code: 400, message: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(loginEmail);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(400).json({ code: 400, message: 'Invalid email or password' });
  }

  const token = signToken(user.id);
  res.json({ token, record: sanitizeUser(user) });
});

router.get('/auth-refresh', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) {
    return res.status(401).json({ code: 401, message: 'User not found' });
  }
  const token = signToken(user.id);
  res.json({ token, record: sanitizeUser(user) });
});

export default router;
