import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../auth.js';
import { randomId, nowIso, rowToWorkflow } from '../util.js';

const router = Router();

router.use(authMiddleware);

router.get('/records', (req, res) => {
  const { sort = '-timestamp' } = req.query;

  let orderBy = 'timestamp DESC';
  if (typeof sort === 'string' && sort.length) {
    const dir = sort.startsWith('-') ? 'DESC' : 'ASC';
    const field = sort.replace(/^[-+]/, '');
    const allowed = ['timestamp', 'created', 'updated', 'name', 'flowName'];
    if (allowed.includes(field)) {
      orderBy = `${field} ${dir}`;
    }
  }

  const rows = db
    .prepare(`SELECT * FROM workflows WHERE userId = ? ORDER BY ${orderBy}`)
    .all(req.userId);

  const items = rows.map(rowToWorkflow);

  res.json({
    page: 1,
    perPage: items.length,
    totalItems: items.length,
    totalPages: 1,
    items,
  });
});

router.get('/records/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM workflows WHERE id = ?').get(req.params.id);
  if (!row || row.userId !== req.userId) {
    return res.status(404).json({ code: 404, message: 'Workflow not found' });
  }
  res.json(rowToWorkflow(row));
});

router.post('/records', (req, res) => {
  const body = req.body || {};
  const id = randomId();
  const now = nowIso();
  const timestamp = body.timestamp || now;

  db.prepare(
    `INSERT INTO workflows
      (id, userId, name, flowName, folderName, description, nodes, connections, public, timestamp, created, updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    req.userId,
    body.name || '',
    body.flowName || body.name || '',
    body.folderName || '',
    body.description || '',
    JSON.stringify(body.nodes || []),
    JSON.stringify(body.connections || []),
    body.public ? 1 : 0,
    timestamp,
    now,
    now
  );

  const row = db.prepare('SELECT * FROM workflows WHERE id = ?').get(id);
  res.status(200).json(rowToWorkflow(row));
});

router.patch('/records/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM workflows WHERE id = ?').get(req.params.id);
  if (!row || row.userId !== req.userId) {
    return res.status(404).json({ code: 404, message: 'Workflow not found' });
  }

  const body = req.body || {};
  const now = nowIso();
  const updated = {
    name: body.name ?? row.name,
    flowName: body.flowName ?? row.flowName,
    folderName: body.folderName ?? row.folderName,
    description: body.description ?? row.description,
    nodes: body.nodes !== undefined ? JSON.stringify(body.nodes) : row.nodes,
    connections: body.connections !== undefined ? JSON.stringify(body.connections) : row.connections,
    public: body.public !== undefined ? (body.public ? 1 : 0) : row.public,
    timestamp: body.timestamp ?? row.timestamp,
  };

  db.prepare(
    `UPDATE workflows SET
      name = ?, flowName = ?, folderName = ?, description = ?,
      nodes = ?, connections = ?, public = ?, timestamp = ?, updated = ?
     WHERE id = ?`
  ).run(
    updated.name,
    updated.flowName,
    updated.folderName,
    updated.description,
    updated.nodes,
    updated.connections,
    updated.public,
    updated.timestamp,
    now,
    req.params.id
  );

  const newRow = db.prepare('SELECT * FROM workflows WHERE id = ?').get(req.params.id);
  res.json(rowToWorkflow(newRow));
});

router.delete('/records/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM workflows WHERE id = ?').get(req.params.id);
  if (!row || row.userId !== req.userId) {
    return res.status(404).json({ code: 404, message: 'Workflow not found' });
  }
  db.prepare('DELETE FROM workflows WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
