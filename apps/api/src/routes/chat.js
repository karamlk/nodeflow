import { Router } from 'express';
import { callAI } from '../chat/aiHandler.js';
import { parseMessage } from '../chat/parser.js';

const router = Router();

// In-memory conversation history per session (keyed by sessionId)
// Each entry: [ { role: 'user'|'assistant', content: string }, ... ]
const sessions = new Map();
const MAX_HISTORY = 20;

function getHistory(sessionId) {
  return sessions.get(sessionId) || [];
}

function pushHistory(sessionId, role, content) {
  const hist = sessions.get(sessionId) || [];
  hist.push({ role, content });
  if (hist.length > MAX_HISTORY) hist.splice(0, hist.length - MAX_HISTORY);
  sessions.set(sessionId, hist);
}

// Prune sessions older than 2 hours
setInterval(() => {
  const limit = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, meta] of sessions.entries()) {
    if (meta._ts && meta._ts < limit) sessions.delete(id);
  }
}, 30 * 60 * 1000);

router.post('/', async (req, res) => {
  const { message, workflow, sessionId } = req.body || {};
  if (typeof message !== 'string') {
    return res.status(400).json({ code: 400, message: 'message is required' });
  }

  const safeWorkflow = {
    nodes: Array.isArray(workflow?.nodes) ? workflow.nodes : [],
    connections: Array.isArray(workflow?.connections) ? workflow.connections : [],
  };

  const sid = typeof sessionId === 'string' && sessionId.length > 0 ? sessionId : null;
  const history = sid ? getHistory(sid) : [];

  // Try AI first; fall back to pattern parser if AI is unavailable
  const useAI = !!(process.env.GROQ_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY);

  let result;
  if (useAI) {
    try {
      result = await callAI(message, safeWorkflow, history);
    } catch (err) {
      console.error('[chat] AI error, falling back to parser:', err.message);
      try {
        result = parseMessage(message, safeWorkflow);
      } catch (pErr) {
        return res.status(500).json({ code: 500, message: 'Failed to handle message' });
      }
    }
  } else {
    try {
      result = parseMessage(message, safeWorkflow);
    } catch (err) {
      console.error('[chat] parser error', err);
      return res.status(500).json({ code: 500, message: 'Failed to handle message' });
    }
  }

  // Update conversation history
  if (sid) {
    pushHistory(sid, 'user', message);
    pushHistory(sid, 'assistant', result.reply || '');
  }

  res.json(result);
});

export default router;
