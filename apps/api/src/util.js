import crypto from 'crypto';

export function randomId() {
  return crypto.randomBytes(8).toString('hex');
}

export function nowIso() {
  return new Date().toISOString();
}

export function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name || '',
    created: user.created,
    updated: user.updated,
    collectionName: 'users',
  };
}

export function rowToWorkflow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    flowName: row.flowName,
    folderName: row.folderName,
    description: row.description || '',
    nodes: safeParse(row.nodes, []),
    connections: safeParse(row.connections, []),
    public: !!row.public,
    timestamp: row.timestamp,
    created: row.created,
    updated: row.updated,
    collectionName: 'workflows',
  };
}

function safeParse(s, fallback) {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}
